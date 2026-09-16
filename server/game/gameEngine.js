import { rollServerDice } from './dice.js';
import { canTokenMove, evaluateMove, hasPlayerFinishedAllTokens, getGlobalPosition } from './rules.js';
import { getBoardConfig } from './board.js';
import { getBotMove } from './bot.js';
import { query } from '../config/db.js';

/**
 * Server-authoritative Game State Manager
 */
class GameManager {
  constructor() {
    this.games = new Map(); // roomId/gameId -> GameInstance
  }

  createGame(roomId, players, maxPlayers = 4) {
    const config = getBoardConfig(players.length);
    const gamePlayers = players.map((p, idx) => ({
      userId: p.userId,
      username: p.username,
      avatarUrl: p.avatarUrl || '/avatars/default.png',
      playerIndex: idx,
      color: config.colors[idx],
      tokens: [-1, -1, -1, -1], // -1 = HOME, 0..totalSteps = track/finish
      isBot: Boolean(p.isBot),
      botDifficulty: p.botDifficulty || 'medium',
      finishedRank: null,
      capturesCount: 0
    }));

    const game = {
      id: roomId,
      roomId,
      config,
      players: gamePlayers,
      currentTurnIndex: 0,
      diceValue: null,
      consecutiveSixes: 0,
      phase: 'WAITING_ROLL', // 'WAITING_ROLL', 'WAITING_MOVE', 'GAME_OVER'
      validMoves: [],
      winner: null,
      rankingsList: [],
      turnTimer: null,
      turnTimeoutMs: 25000, // 25s auto-turn timer
      moveHistory: [],
      createdAt: new Date()
    };

    this.games.set(roomId, game);
    return game;
  }

  getGame(roomId) {
    return this.games.get(roomId);
  }

  deleteGame(roomId) {
    const game = this.games.get(roomId);
    if (game && game.turnTimer) {
      clearTimeout(game.turnTimer);
    }
    this.games.delete(roomId);
  }

  /**
   * Rolls the dice on server and returns the outcome
   */
  rollDice(roomId, userId) {
    const game = this.games.get(roomId);
    if (!game) throw new Error('Game not found');

    const currentPlayer = game.players[game.currentTurnIndex];
    if (currentPlayer.userId !== userId && !currentPlayer.isBot) {
      throw new Error('Not your turn');
    }

    if (game.phase !== 'WAITING_ROLL') {
      throw new Error('Cannot roll now');
    }

    const diceValue = rollServerDice();
    game.diceValue = diceValue;

    if (diceValue === 6) {
      game.consecutiveSixes += 1;
    } else {
      game.consecutiveSixes = 0;
    }

    // 3 consecutive 6s penalty
    if (game.consecutiveSixes === 3) {
      game.consecutiveSixes = 0;
      game.phase = 'WAITING_ROLL';
      game.diceValue = null;
      this.nextTurn(game);
      return {
        diceValue,
        consecutiveSixesSkipped: true,
        nextTurnIndex: game.currentTurnIndex,
        gameState: this.serializeGame(game)
      };
    }

    // Determine valid movable tokens
    const validTokens = [];
    currentPlayer.tokens.forEach((step, tokId) => {
      if (canTokenMove(step, diceValue, game.config)) {
        validTokens.push(tokId);
      }
    });

    game.validMoves = validTokens;

    if (validTokens.length === 0) {
      // No valid moves - pass turn
      game.phase = 'WAITING_ROLL';
      this.nextTurn(game);
      return {
        diceValue,
        validTokens: [],
        autoPass: true,
        nextTurnIndex: game.currentTurnIndex,
        gameState: this.serializeGame(game)
      };
    }

    game.phase = 'WAITING_MOVE';

    return {
      diceValue,
      validTokens,
      autoPass: false,
      nextTurnIndex: game.currentTurnIndex,
      gameState: this.serializeGame(game)
    };
  }

  /**
   * Executes a validated token move
   */
  async moveToken(roomId, userId, tokenId) {
    const game = this.games.get(roomId);
    if (!game) throw new Error('Game not found');

    const currentPlayer = game.players[game.currentTurnIndex];
    if (currentPlayer.userId !== userId && !currentPlayer.isBot) {
      throw new Error('Not your turn');
    }

    if (game.phase !== 'WAITING_MOVE') {
      throw new Error('Not in moving phase');
    }

    if (!game.validMoves.includes(tokenId)) {
      throw new Error('Invalid token selection');
    }

    const dice = game.diceValue;
    const oldStep = currentPlayer.tokens[tokenId];
    const outcome = evaluateMove(game, game.currentTurnIndex, tokenId, dice);

    if (!outcome.valid) {
      throw new Error(outcome.reason || 'Invalid move');
    }

    // Apply token step update
    currentPlayer.tokens[tokenId] = outcome.newStep;

    // Apply captures
    if (outcome.captures.length > 0) {
      currentPlayer.capturesCount += outcome.captures.length;
      outcome.captures.forEach(cap => {
        game.players[cap.playerIndex].tokens[cap.tokenId] = -1; // Reset to HOME
      });
    }

    // Record move
    game.moveHistory.push({
      playerIndex: game.currentTurnIndex,
      userId: currentPlayer.userId,
      tokenId,
      fromStep: oldStep,
      toStep: outcome.newStep,
      dice,
      captures: outcome.captures,
      timestamp: Date.now()
    });

    // Check if player finished all 4 tokens
    if (hasPlayerFinishedAllTokens(currentPlayer.tokens, game.config)) {
      if (!currentPlayer.finishedRank) {
        game.rankingsList.push({
          userId: currentPlayer.userId,
          username: currentPlayer.username,
          rank: game.rankingsList.length + 1
        });
        currentPlayer.finishedRank = game.rankingsList.length;
      }
    }

    // Check if game is over (all players except 1 have finished)
    const unfinishedPlayers = game.players.filter(p => !p.finishedRank);
    if (unfinishedPlayers.length <= 1) {
      game.phase = 'GAME_OVER';
      if (unfinishedPlayers.length === 1) {
        const lastPlayer = unfinishedPlayers[0];
        game.rankingsList.push({
          userId: lastPlayer.userId,
          username: lastPlayer.username,
          rank: game.rankingsList.length + 1
        });
        lastPlayer.finishedRank = game.rankingsList.length;
      }
      game.winner = game.rankingsList[0];
      await this.persistGameResults(game);
      return {
        gameOver: true,
        winner: game.winner,
        rankings: game.rankingsList,
        outcome,
        gameState: this.serializeGame(game)
      };
    }

    // Next turn logic: bonus turn vs switch turn
    if (outcome.bonusTurn && !hasPlayerFinishedAllTokens(currentPlayer.tokens, game.config)) {
      game.phase = 'WAITING_ROLL';
      game.diceValue = null;
      game.validMoves = [];
    } else {
      game.phase = 'WAITING_ROLL';
      game.diceValue = null;
      game.validMoves = [];
      this.nextTurn(game);
    }

    return {
      gameOver: false,
      outcome,
      nextTurnIndex: game.currentTurnIndex,
      gameState: this.serializeGame(game)
    };
  }

  nextTurn(game) {
    let nextIdx = (game.currentTurnIndex + 1) % game.players.length;
    // Skip players who have already finished all tokens
    let attempts = 0;
    while (game.players[nextIdx].finishedRank && attempts < game.players.length) {
      nextIdx = (nextIdx + 1) % game.players.length;
      attempts++;
    }
    game.currentTurnIndex = nextIdx;
    game.phase = 'WAITING_ROLL';
    game.diceValue = null;
    game.validMoves = [];
  }

  async persistGameResults(game) {
    try {
      // Update rankings & game history in database
      for (const rankItem of game.rankingsList) {
        const isWinner = rankItem.rank === 1;
        const ptsChange = isWinner ? 100 : (rankItem.rank === 2 ? 40 : -20);
        
        await query(
          `UPDATE users SET ranking_points = ranking_points + $1 WHERE id = $2`,
          [ptsChange, rankItem.userId]
        );

        await query(
          `INSERT INTO game_history (game_id, user_id, result, points_change, finish_position)
           VALUES ($1, $2, $3, $4, $5)`,
          [1, rankItem.userId, isWinner ? 'WIN' : `${rankItem.rank}th Place`, ptsChange, rankItem.rank]
        );
      }
    } catch (err) {
      console.error('Error saving game results:', err.message);
    }
  }

  serializeGame(game) {
    return {
      id: game.id,
      roomId: game.roomId,
      config: {
        maxPlayers: game.config.maxPlayers,
        trackLength: game.config.trackLength,
        totalStepsToFinish: game.config.totalStepsToFinish,
        safeTrackIndices: game.config.safeTrackIndices,
        colors: game.config.colors
      },
      players: game.players.map(p => ({
        userId: p.userId,
        username: p.username,
        avatarUrl: p.avatarUrl,
        playerIndex: p.playerIndex,
        color: p.color,
        tokens: p.tokens,
        isBot: p.isBot,
        finishedRank: p.finishedRank,
        capturesCount: p.capturesCount
      })),
      currentTurnIndex: game.currentTurnIndex,
      diceValue: game.diceValue,
      phase: game.phase,
      validMoves: game.validMoves,
      winner: game.winner,
      rankingsList: game.rankingsList
    };
  }
}

export const gameManager = new GameManager();

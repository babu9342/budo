import { rollServerDice } from './dice.js';
import { canTokenMove, evaluateMove, hasPlayerFinishedAllTokens, getGlobalPosition } from './rules.js';
import { getBoardConfig } from './board.js';
import { getBotMove } from './bot.js';
import { query } from '../config/db.js';

/**
 * Server-authoritative Game State Manager
 * Implements 30-minute session lifecycle, multi-key room lookup, and reconnect/rejoin persistence.
 */
class GameManager {
  constructor() {
    this.games = new Map(); // roomId (string) -> GameInstance
    this.codeToGame = new Map(); // roomCode (string) -> GameInstance
    this.finishedGames = new Map(); // roomIdOrCode -> { game, finishedAt, reason }
    this.GAME_TTL_MS = 30 * 60 * 1000; // 30 minutes session duration
  }

  createGame(roomId, players, maxPlayers = 4, roomCode = null) {
    const primaryKey = String(roomId);
    const codeKey = roomCode ? String(roomCode) : (typeof roomId === 'string' && roomId.length >= 6 ? String(roomId) : null);

    // If an ongoing active game already exists for this room and hasn't expired, return it
    const existing = this.getGame(primaryKey) || (codeKey ? this.getGame(codeKey) : null);
    if (existing && !this.isGameExpired(existing) && existing.phase !== 'GAME_OVER') {
      return existing;
    }

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
      capturesCount: 0,
      socketId: p.socketId || null,
      isOnline: true
    }));

    const startedAt = Date.now();
    const expiresAt = startedAt + this.GAME_TTL_MS;

    const game = {
      id: primaryKey,
      roomId: primaryKey,
      roomCode: codeKey || primaryKey,
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
      turnTimeoutMs: 60000, // 1 minute auto-turn timer
      turnStartTime: Date.now(),
      moveHistory: [],
      createdAt: new Date(),
      startedAt,
      expiresAt,
      isExpired: false
    };

    // Auto-expire session after 30 minutes
    game.expiryTimer = setTimeout(() => {
      this.expireGame(game.id);
    }, this.GAME_TTL_MS);

    this.games.set(primaryKey, game);
    if (game.roomCode) {
      this.codeToGame.set(String(game.roomCode), game);
    }

    // Persist status in database
    query(
      `UPDATE rooms SET status = 'PLAYING', updated_at = CURRENT_TIMESTAMP WHERE id = $1 OR code = $1`,
      [primaryKey]
    ).catch(err => console.error('DB update room status error:', err.message));

    return game;
  }

  getGame(roomIdentifier) {
    if (!roomIdentifier) return null;
    const strId = String(roomIdentifier);

    let game = this.games.get(strId) || this.codeToGame.get(strId);

    // Deep search across active games by roomId or roomCode if not found directly
    if (!game) {
      for (const g of this.games.values()) {
        if (String(g.roomId) === strId || String(g.roomCode) === strId || String(g.id) === strId) {
          game = g;
          break;
        }
      }
    }

    if (game && this.isGameExpired(game)) {
      this.expireGame(game.id);
      return null;
    }

    return game;
  }

  isGameExpired(game) {
    if (!game) return true;
    if (game.isExpired) return true;
    if (game.expiresAt && Date.now() > game.expiresAt) {
      return true;
    }
    return false;
  }

  isGameEndedOrExpired(roomIdentifier) {
    if (!roomIdentifier) return false;
    const strId = String(roomIdentifier);

    if (this.finishedGames.has(strId)) return true;

    const game = this.games.get(strId) || this.codeToGame.get(strId);
    if (game && (game.phase === 'GAME_OVER' || this.isGameExpired(game))) {
      return true;
    }
    return false;
  }

  expireGame(roomId) {
    const game = this.getGame(roomId) || this.games.get(String(roomId));
    if (!game) return;

    if (game.expiryTimer) clearTimeout(game.expiryTimer);
    if (game.turnTimer) clearTimeout(game.turnTimer);

    game.phase = 'GAME_OVER';
    game.isExpired = true;

    const finishedEntry = { game: this.serializeGame(game), finishedAt: Date.now(), reason: 'EXPIRED' };
    this.finishedGames.set(String(game.roomId), finishedEntry);
    if (game.roomCode) {
      this.finishedGames.set(String(game.roomCode), finishedEntry);
    }

    // Keep in finished cache for 15 minutes before cleanup
    setTimeout(() => {
      this.finishedGames.delete(String(game.roomId));
      if (game.roomCode) this.finishedGames.delete(String(game.roomCode));
    }, 15 * 60 * 1000);

    this.games.delete(String(game.roomId));
    if (game.roomCode) {
      this.codeToGame.delete(String(game.roomCode));
    }

    query(
      `UPDATE rooms SET status = 'FINISHED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 OR code = $1`,
      [game.roomId]
    ).catch(console.error);
  }

  /**
   * Reconnects an existing player to their seat in an ongoing match
   */
  rejoinGame(roomIdentifier, user, socketId) {
    const strId = String(roomIdentifier);
    const game = this.getGame(roomIdentifier);

    if (!game) {
      if (this.isGameEndedOrExpired(roomIdentifier)) {
        return {
          status: 'ENDED',
          message: 'This game has ended. The 30-minute session expired or the match has completed.'
        };
      }
      return {
        status: 'NOT_FOUND',
        message: 'Game match session not found'
      };
    }

    if (this.isGameExpired(game) || game.phase === 'GAME_OVER') {
      return {
        status: 'ENDED',
        message: 'This game has ended'
      };
    }

    // Identify player in existing player list
    const player = game.players.find(p => 
      (user && user.id && p.userId === user.id) ||
      (user && user.username && p.username?.toLowerCase() === user.username?.toLowerCase())
    );

    if (!player) {
      return {
        status: 'REJECTED',
        message: 'You are not a registered player in this active match'
      };
    }

    // Update socket session mapping
    player.socketId = socketId;
    player.isOnline = true;

    return {
      status: 'SUCCESS',
      game: this.serializeGame(game),
      playerIndex: player.playerIndex
    };
  }

  deleteGame(roomId) {
    const game = this.games.get(String(roomId));
    if (game) {
      if (game.expiryTimer) clearTimeout(game.expiryTimer);
      if (game.turnTimer) clearTimeout(game.turnTimer);
      if (game.roomCode) this.codeToGame.delete(String(game.roomCode));
    }
    this.games.delete(String(roomId));
  }

  /**
   * Rolls the dice on server and returns the outcome
   */
  rollDice(roomId, userId) {
    const game = this.getGame(roomId);
    if (!game) throw new Error('Game not found');

    if (this.isGameExpired(game) || game.phase === 'GAME_OVER') {
      throw new Error('This game has ended');
    }

    const currentPlayer = game.players[game.currentTurnIndex];
    console.log(`[Server rollDice] Room: ${roomId} -> Current Turn: ${currentPlayer?.username} (index: ${game.currentTurnIndex}, userId: ${currentPlayer?.userId})`);
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
      return {
        diceValue,
        consecutiveSixesSkipped: true,
        autoPass: true,
        requiresTurnSwitch: true,
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
      return {
        diceValue,
        validTokens: [],
        autoPass: true,
        requiresTurnSwitch: true,
        nextTurnIndex: game.currentTurnIndex,
        gameState: this.serializeGame(game)
      };
    }

    game.phase = 'WAITING_MOVE';

    return {
      diceValue,
      validTokens,
      autoPass: false,
      requiresTurnSwitch: false,
      nextTurnIndex: game.currentTurnIndex,
      gameState: this.serializeGame(game)
    };
  }

  /**
   * Executes a validated token move
   */
  async moveToken(roomId, userId, tokenId) {
    const game = this.getGame(roomId);
    if (!game) throw new Error('Game not found');

    if (this.isGameExpired(game) || game.phase === 'GAME_OVER') {
      throw new Error('This game has ended');
    }

    const currentPlayer = game.players[game.currentTurnIndex];
    console.log(`[Server moveToken] Applying coin move to currentPlayer: ${currentPlayer?.username} (index: ${game.currentTurnIndex}, userId: ${currentPlayer?.userId}) -> tokenId: ${tokenId}`);
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
      if (game.expiryTimer) clearTimeout(game.expiryTimer);

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

      // Cache as finished
      const finishedEntry = { game: this.serializeGame(game), finishedAt: Date.now(), reason: 'FINISHED' };
      this.finishedGames.set(String(game.roomId), finishedEntry);
      if (game.roomCode) {
        this.finishedGames.set(String(game.roomCode), finishedEntry);
      }

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
      return {
        gameOver: false,
        outcome,
        bonusTurn: true,
        requiresTurnSwitch: false,
        nextTurnIndex: game.currentTurnIndex,
        gameState: this.serializeGame(game)
      };
    } else {
      game.phase = 'WAITING_ROLL';
      game.diceValue = null;
      game.validMoves = [];
      return {
        gameOver: false,
        outcome,
        bonusTurn: false,
        requiresTurnSwitch: true,
        nextTurnIndex: game.currentTurnIndex,
        gameState: this.serializeGame(game)
      };
    }
  }

  advanceTurn(roomId) {
    const game = this.getGame(roomId);
    if (!game || game.phase === 'GAME_OVER') return null;
    this.nextTurn(game);
    return this.serializeGame(game);
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
    game.turnStartTime = Date.now();
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

      await query(
        `UPDATE rooms SET status = 'FINISHED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 OR code = $1`,
        [game.roomId]
      );
    } catch (err) {
      console.error('Error saving game results:', err.message);
    }
  }

  serializeGame(game) {
    const now = Date.now();
    const expiresAt = game.expiresAt || (now + this.GAME_TTL_MS);

    return {
      id: game.id,
      roomId: game.roomId,
      roomCode: game.roomCode,
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
        capturesCount: p.capturesCount,
        isOnline: p.isOnline !== false
      })),
      currentTurnIndex: game.currentTurnIndex,
      diceValue: game.diceValue,
      phase: game.phase,
      validMoves: game.validMoves || [],
      winner: game.winner,
      rankingsList: game.rankingsList || [],
      turnTimeoutMs: game.turnTimeoutMs || 60000,
      turnStartTime: game.turnStartTime || now,
      startedAt: game.startedAt || now,
      expiresAt,
      timeRemainingMs: Math.max(0, expiresAt - now)
    };
  }
}

export const gameManager = new GameManager();


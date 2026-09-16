import { getBoardConfig } from './board';
import { canTokenMove, evaluateMove, hasPlayerFinishedAllTokens } from './rules';
import { getBotMove } from './bot';

export class OfflineLudoEngine {
  constructor(playerConfigs = []) {
    this.config = getBoardConfig(playerConfigs.length);
    this.players = playerConfigs.map((p, idx) => ({
      userId: p.userId || -(idx + 1),
      username: p.username || `Player ${idx + 1}`,
      avatarUrl: p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=p${idx}`,
      playerIndex: idx,
      color: this.config.colors[idx],
      tokens: [-1, -1, -1, -1],
      isBot: Boolean(p.isBot),
      botDifficulty: p.botDifficulty || 'medium',
      finishedRank: null,
      capturesCount: 0
    }));

    this.currentTurnIndex = 0;
    this.diceValue = null;
    this.consecutiveSixes = 0;
    this.phase = 'WAITING_ROLL';
    this.validMoves = [];
    this.winner = null;
    this.rankingsList = [];
    this.moveHistory = [];
  }

  rollDice() {
    if (this.phase !== 'WAITING_ROLL') return null;

    const diceValue = Math.floor(Math.random() * 6) + 1;
    this.diceValue = diceValue;

    if (diceValue === 6) {
      this.consecutiveSixes += 1;
    } else {
      this.consecutiveSixes = 0;
    }

    if (this.consecutiveSixes === 3) {
      this.consecutiveSixes = 0;
      this.diceValue = null;
      this.nextTurn();
      return {
        diceValue,
        consecutiveSixesSkipped: true,
        gameState: this.getState()
      };
    }

    const currentPlayer = this.players[this.currentTurnIndex];
    const validTokens = [];
    currentPlayer.tokens.forEach((step, tokId) => {
      if (canTokenMove(step, diceValue, this.config)) {
        validTokens.push(tokId);
      }
    });

    this.validMoves = validTokens;

    if (validTokens.length === 0) {
      this.phase = 'WAITING_ROLL';
      this.nextTurn();
      return {
        diceValue,
        validTokens: [],
        autoPass: true,
        gameState: this.getState()
      };
    }

    this.phase = 'WAITING_MOVE';
    return {
      diceValue,
      validTokens,
      autoPass: false,
      gameState: this.getState()
    };
  }

  moveToken(tokenId) {
    if (this.phase !== 'WAITING_MOVE') return null;
    if (!this.validMoves.includes(tokenId)) return null;

    const currentPlayer = this.players[this.currentTurnIndex];
    const dice = this.diceValue;
    const oldStep = currentPlayer.tokens[tokenId];
    const outcome = evaluateMove(this, this.currentTurnIndex, tokenId, dice);

    if (!outcome.valid) return null;

    currentPlayer.tokens[tokenId] = outcome.newStep;

    if (outcome.captures.length > 0) {
      currentPlayer.capturesCount += outcome.captures.length;
      outcome.captures.forEach(cap => {
        this.players[cap.playerIndex].tokens[cap.tokenId] = -1;
      });
    }

    if (hasPlayerFinishedAllTokens(currentPlayer.tokens, this.config)) {
      if (!currentPlayer.finishedRank) {
        this.rankingsList.push({
          userId: currentPlayer.userId,
          username: currentPlayer.username,
          rank: this.rankingsList.length + 1
        });
        currentPlayer.finishedRank = this.rankingsList.length;
      }
    }

    const unfinishedPlayers = this.players.filter(p => !p.finishedRank);
    if (unfinishedPlayers.length <= 1) {
      this.phase = 'GAME_OVER';
      if (unfinishedPlayers.length === 1) {
        const lastPlayer = unfinishedPlayers[0];
        this.rankingsList.push({
          userId: lastPlayer.userId,
          username: lastPlayer.username,
          rank: this.rankingsList.length + 1
        });
        lastPlayer.finishedRank = this.rankingsList.length;
      }
      this.winner = this.rankingsList[0];
      return {
        gameOver: true,
        winner: this.winner,
        rankings: this.rankingsList,
        outcome,
        gameState: this.getState()
      };
    }

    if (outcome.bonusTurn && !hasPlayerFinishedAllTokens(currentPlayer.tokens, this.config)) {
      this.phase = 'WAITING_ROLL';
      this.diceValue = null;
      this.validMoves = [];
    } else {
      this.phase = 'WAITING_ROLL';
      this.diceValue = null;
      this.validMoves = [];
      this.nextTurn();
    }

    return {
      gameOver: false,
      outcome,
      gameState: this.getState()
    };
  }

  nextTurn() {
    let nextIdx = (this.currentTurnIndex + 1) % this.players.length;
    let attempts = 0;
    while (this.players[nextIdx].finishedRank && attempts < this.players.length) {
      nextIdx = (nextIdx + 1) % this.players.length;
      attempts++;
    }
    this.currentTurnIndex = nextIdx;
    this.phase = 'WAITING_ROLL';
    this.diceValue = null;
    this.validMoves = [];
  }

  getState() {
    return {
      id: 'offline_game',
      config: this.config,
      players: this.players.map(p => ({
        userId: p.userId,
        username: p.username,
        avatarUrl: p.avatarUrl,
        playerIndex: p.playerIndex,
        color: p.color,
        tokens: [...p.tokens],
        isBot: p.isBot,
        finishedRank: p.finishedRank,
        capturesCount: p.capturesCount
      })),
      currentTurnIndex: this.currentTurnIndex,
      diceValue: this.diceValue,
      phase: this.phase,
      validMoves: this.validMoves,
      winner: this.winner,
      rankingsList: this.rankingsList
    };
  }
}

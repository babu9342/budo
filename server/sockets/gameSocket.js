import { gameManager } from '../game/gameEngine.js';
import { getBotMove } from '../game/bot.js';

export function setupGameSocket(io, socket) {
  // Reconnect / Request Game State
  socket.on('game:getState', ({ roomId }) => {
    const game = gameManager.getGame(roomId);
    if (game) {
      socket.emit('game:state', { game: gameManager.serializeGame(game) });
    }
  });

  // Roll Dice
  socket.on('dice:roll', async ({ roomId }) => {
    try {
      const userId = socket.data.userId;
      const rollResult = gameManager.rollDice(roomId, userId);

      // Broadcast dice roll animation and result
      io.to(`room:${roomId}`).emit('dice:result', {
        playerIndex: rollResult.gameState.currentTurnIndex,
        diceValue: rollResult.diceValue,
        validTokens: rollResult.validTokens,
        autoPass: rollResult.autoPass,
        consecutiveSixesSkipped: rollResult.consecutiveSixesSkipped,
        gameState: rollResult.gameState
      });

      // Handle Bot's move if next turn is a Bot
      checkAndTriggerBotTurn(io, roomId);
    } catch (err) {
      socket.emit('game:error', { message: err.message });
    }
  });

  // Move Token
  socket.on('token:move', async ({ roomId, tokenId }) => {
    try {
      const userId = socket.data.userId;
      const moveResult = await gameManager.moveToken(roomId, userId, tokenId);

      // Broadcast token movement animation and game update
      io.to(`room:${roomId}`).emit('token:update', {
        tokenId,
        outcome: moveResult.outcome,
        gameOver: moveResult.gameOver,
        winner: moveResult.winner,
        rankings: moveResult.rankings,
        gameState: moveResult.gameState
      });

      if (moveResult.gameOver) {
        io.to(`room:${roomId}`).emit('game:finish', {
          winner: moveResult.winner,
          rankings: moveResult.rankings,
          gameState: moveResult.gameState
        });
      } else {
        // Trigger bot if it's next or bot has a bonus roll
        checkAndTriggerBotTurn(io, roomId);
      }
    } catch (err) {
      socket.emit('game:error', { message: err.message });
    }
  });
}

/**
 * Automatically orchestrates Bot turns with realistic human-like pacing
 */
function checkAndTriggerBotTurn(io, roomId) {
  const game = gameManager.getGame(roomId);
  if (!game || game.phase === 'GAME_OVER') return;

  const currentPlayer = game.players[game.currentTurnIndex];
  if (!currentPlayer || !currentPlayer.isBot) return;

  // Bot rolls after 900ms delay
  setTimeout(() => {
    const currentGame = gameManager.getGame(roomId);
    if (!currentGame || currentGame.currentTurnIndex !== currentPlayer.playerIndex) return;

    if (currentGame.phase === 'WAITING_ROLL') {
      try {
        const rollResult = gameManager.rollDice(roomId, currentPlayer.userId);
        io.to(`room:${roomId}`).emit('dice:result', {
          playerIndex: currentPlayer.playerIndex,
          diceValue: rollResult.diceValue,
          validTokens: rollResult.validTokens,
          autoPass: rollResult.autoPass,
          consecutiveSixesSkipped: rollResult.consecutiveSixesSkipped,
          gameState: rollResult.gameState
        });

        if (rollResult.validTokens && rollResult.validTokens.length > 0) {
          // Bot selects best token after 800ms
          setTimeout(async () => {
            const activeGame = gameManager.getGame(roomId);
            if (!activeGame || activeGame.phase !== 'WAITING_MOVE') return;

            const chosenTokenId = getBotMove(
              activeGame,
              currentPlayer.playerIndex,
              activeGame.diceValue,
              currentPlayer.botDifficulty || 'medium'
            );

            if (chosenTokenId !== null) {
              const moveResult = await gameManager.moveToken(roomId, currentPlayer.userId, chosenTokenId);
              io.to(`room:${roomId}`).emit('token:update', {
                tokenId: chosenTokenId,
                outcome: moveResult.outcome,
                gameOver: moveResult.gameOver,
                winner: moveResult.winner,
                rankings: moveResult.rankings,
                gameState: moveResult.gameState
              });

              if (moveResult.gameOver) {
                io.to(`room:${roomId}`).emit('game:finish', {
                  winner: moveResult.winner,
                  rankings: moveResult.rankings,
                  gameState: moveResult.gameState
                });
              } else {
                checkAndTriggerBotTurn(io, roomId);
              }
            }
          }, 800);
        } else {
          // Next turn is triggered automatically if autoPass
          checkAndTriggerBotTurn(io, roomId);
        }
      } catch (e) {
        console.error('Bot turn execution error:', e.message);
      }
    }
  }, 900);
}

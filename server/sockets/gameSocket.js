import { gameManager } from '../game/gameEngine.js';
import { getBotMove } from '../game/bot.js';

export function setupGameSocket(io, socket) {
  // Rejoin ongoing game session (handles browser refresh, app restart, connection drop)
  socket.on('game:rejoin', ({ roomId, roomCode, user }) => {
    const roomIdentifier = roomId || roomCode;
    const result = gameManager.rejoinGame(roomIdentifier, user, socket.id);

    if (result.status === 'SUCCESS') {
      const game = result.game;
      socket.data.userId = user?.id;
      socket.data.username = user?.username;
      socket.data.roomId = game.roomId;
      socket.data.roomCode = game.roomCode;

      // Join socket to both roomId and roomCode broadcast rooms
      socket.join(`room:${game.roomId}`);
      if (game.roomCode) {
        socket.join(`room:${game.roomCode}`);
      }

      // Notify other room participants of reconnected player
      socket.to(`room:${game.roomId}`).emit('player:reconnected', {
        userId: user?.id,
        username: user?.username,
        playerIndex: result.playerIndex
      });

      socket.emit('game:state', { game, isRejoin: true });
    } else if (result.status === 'ENDED' || result.status === 'EXPIRED') {
      socket.emit('game:ended', {
        code: 'GAME_ENDED',
        message: result.message || 'This game has ended'
      });
    } else {
      socket.emit('game:error', {
        code: result.status,
        message: result.message || 'Unable to join game session'
      });
    }
  });

  // Reconnect / Request Game State
  socket.on('game:getState', ({ roomId, roomCode, user }) => {
    const roomIdentifier = roomId || roomCode;
    const game = gameManager.getGame(roomIdentifier);

    if (game) {
      if (gameManager.isGameExpired(game) || game.phase === 'GAME_OVER') {
        socket.emit('game:ended', {
          code: 'GAME_ENDED',
          message: 'This game has ended'
        });
        return;
      }

      if (user && user.id) {
        socket.data.userId = user.id;
        socket.data.username = user.username;
      }
      socket.data.roomId = game.roomId;
      socket.data.roomCode = game.roomCode;

      socket.join(`room:${game.roomId}`);
      if (game.roomCode) {
        socket.join(`room:${game.roomCode}`);
      }

      socket.emit('game:state', { game: gameManager.serializeGame(game) });
    } else {
      if (gameManager.isGameEndedOrExpired(roomIdentifier)) {
        socket.emit('game:ended', {
          code: 'GAME_ENDED',
          message: 'This game has ended'
        });
      } else {
        socket.emit('game:error', {
          code: 'GAME_NOT_FOUND',
          message: 'Game session not found or has expired'
        });
      }
    }
  });

  // Roll Dice
  socket.on('dice:roll', async ({ roomId, user }) => {
    try {
      const userId = socket.data.userId || user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const rollResult = gameManager.rollDice(roomId, userId);
      const targetRoom = rollResult.gameState.roomCode || rollResult.gameState.roomId || roomId;

      // Broadcast dice roll animation and result
      io.to(`room:${targetRoom}`).emit('dice:result', {
        playerIndex: rollResult.gameState.currentTurnIndex,
        diceValue: rollResult.diceValue,
        validTokens: rollResult.validTokens,
        autoPass: rollResult.autoPass,
        consecutiveSixesSkipped: rollResult.consecutiveSixesSkipped,
        gameState: rollResult.gameState
      });

      // Also emit to numeric room id if different
      if (rollResult.gameState.roomId && rollResult.gameState.roomId !== targetRoom) {
        io.to(`room:${rollResult.gameState.roomId}`).emit('dice:result', {
          playerIndex: rollResult.gameState.currentTurnIndex,
          diceValue: rollResult.diceValue,
          validTokens: rollResult.validTokens,
          autoPass: rollResult.autoPass,
          consecutiveSixesSkipped: rollResult.consecutiveSixesSkipped,
          gameState: rollResult.gameState
        });
      }

      // Handle Bot's move if next turn is a Bot
      checkAndTriggerBotTurn(io, targetRoom);
    } catch (err) {
      socket.emit('game:error', { message: err.message });
    }
  });

  // Move Token
  socket.on('token:move', async ({ roomId, tokenId, user }) => {
    try {
      const userId = socket.data.userId || user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const moveResult = await gameManager.moveToken(roomId, userId, tokenId);
      const targetRoom = moveResult.gameState.roomCode || moveResult.gameState.roomId || roomId;

      // Broadcast token movement animation and game update
      io.to(`room:${targetRoom}`).emit('token:update', {
        tokenId,
        outcome: moveResult.outcome,
        gameOver: moveResult.gameOver,
        winner: moveResult.winner,
        rankings: moveResult.rankings,
        gameState: moveResult.gameState
      });

      if (moveResult.gameState.roomId && moveResult.gameState.roomId !== targetRoom) {
        io.to(`room:${moveResult.gameState.roomId}`).emit('token:update', {
          tokenId,
          outcome: moveResult.outcome,
          gameOver: moveResult.gameOver,
          winner: moveResult.winner,
          rankings: moveResult.rankings,
          gameState: moveResult.gameState
        });
      }

      if (moveResult.gameOver) {
        io.to(`room:${targetRoom}`).emit('game:finish', {
          winner: moveResult.winner,
          rankings: moveResult.rankings,
          gameState: moveResult.gameState
        });
      } else {
        // Trigger bot if it's next or bot has a bonus roll
        checkAndTriggerBotTurn(io, targetRoom);
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

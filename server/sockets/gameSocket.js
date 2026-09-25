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
      const altRoom = rollResult.gameState.roomId && rollResult.gameState.roomId !== targetRoom ? rollResult.gameState.roomId : null;

      // Broadcast dice roll animation and result
      const eventData = {
        playerIndex: rollResult.gameState.currentTurnIndex,
        diceValue: rollResult.diceValue,
        validTokens: rollResult.validTokens,
        autoPass: rollResult.autoPass,
        consecutiveSixesSkipped: rollResult.consecutiveSixesSkipped,
        gameState: rollResult.gameState
      };

      io.to(`room:${targetRoom}`).emit('dice:result', eventData);
      if (altRoom) {
        io.to(`room:${altRoom}`).emit('dice:result', eventData);
      }

      if (rollResult.autoPass || rollResult.consecutiveSixesSkipped) {
        // Roll animation takes ~1.6s + 2-second delay for players to see the rolled value (3.6s total)
        setTimeout(() => {
          const updatedState = gameManager.advanceTurn(roomId);
          if (updatedState) {
            io.to(`room:${targetRoom}`).emit('game:state', { game: updatedState });
            if (altRoom) io.to(`room:${altRoom}`).emit('game:state', { game: updatedState });
            checkAndTriggerBotTurn(io, targetRoom);
          }
        }, 3600);
      } else {
        // Has valid moves - handle Bot's move if current turn is Bot
        checkAndTriggerBotTurn(io, targetRoom);
      }
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
      const altRoom = moveResult.gameState.roomId && moveResult.gameState.roomId !== targetRoom ? moveResult.gameState.roomId : null;

      // Broadcast token movement animation and game update
      const updateData = {
        tokenId,
        outcome: moveResult.outcome,
        gameOver: moveResult.gameOver,
        winner: moveResult.winner,
        rankings: moveResult.rankings,
        gameState: moveResult.gameState
      };

      io.to(`room:${targetRoom}`).emit('token:update', updateData);
      if (altRoom) {
        io.to(`room:${altRoom}`).emit('token:update', updateData);
      }

      if (moveResult.gameOver) {
        io.to(`room:${targetRoom}`).emit('game:finish', {
          winner: moveResult.winner,
          rankings: moveResult.rankings,
          gameState: moveResult.gameState
        });
        if (altRoom) {
          io.to(`room:${altRoom}`).emit('game:finish', {
            winner: moveResult.winner,
            rankings: moveResult.rankings,
            gameState: moveResult.gameState
          });
        }
      } else if (moveResult.bonusTurn) {
        // Bonus roll for same player: brief pause for coin hop settle
        setTimeout(() => {
          checkAndTriggerBotTurn(io, targetRoom);
        }, 1200);
      } else if (moveResult.requiresTurnSwitch) {
        // 2-second delay after coin move animation completes before switching to next player's turn
        // Coin move animation takes ~600ms + 2000ms delay = 2600ms total
        setTimeout(() => {
          const updatedState = gameManager.advanceTurn(roomId);
          if (updatedState) {
            io.to(`room:${targetRoom}`).emit('game:state', { game: updatedState });
            if (altRoom) io.to(`room:${altRoom}`).emit('game:state', { game: updatedState });
            checkAndTriggerBotTurn(io, targetRoom);
          }
        }, 2600);
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

  const targetRoom = game.roomCode || game.roomId || roomId;
  const altRoom = game.roomId && game.roomId !== targetRoom ? game.roomId : null;

  // Bot rolls after 800ms delay
  setTimeout(() => {
    const currentGame = gameManager.getGame(roomId);
    if (!currentGame || currentGame.currentTurnIndex !== currentPlayer.playerIndex) return;

    if (currentGame.phase === 'WAITING_ROLL') {
      try {
        const rollResult = gameManager.rollDice(roomId, currentPlayer.userId);
        const eventData = {
          playerIndex: currentPlayer.playerIndex,
          diceValue: rollResult.diceValue,
          validTokens: rollResult.validTokens,
          autoPass: rollResult.autoPass,
          consecutiveSixesSkipped: rollResult.consecutiveSixesSkipped,
          gameState: rollResult.gameState
        };

        io.to(`room:${targetRoom}`).emit('dice:result', eventData);
        if (altRoom) io.to(`room:${altRoom}`).emit('dice:result', eventData);

        if (rollResult.autoPass || rollResult.consecutiveSixesSkipped) {
          // 1.6s dice roll animation + 2s delay
          setTimeout(() => {
            const updatedState = gameManager.advanceTurn(roomId);
            if (updatedState) {
              io.to(`room:${targetRoom}`).emit('game:state', { game: updatedState });
              if (altRoom) io.to(`room:${altRoom}`).emit('game:state', { game: updatedState });
              checkAndTriggerBotTurn(io, roomId);
            }
          }, 3600);
        } else if (rollResult.validTokens && rollResult.validTokens.length > 0) {
          // Bot waits for 1.6s dice roll to settle + 600ms contemplation before moving
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
              const moveEventData = {
                tokenId: chosenTokenId,
                outcome: moveResult.outcome,
                gameOver: moveResult.gameOver,
                winner: moveResult.winner,
                rankings: moveResult.rankings,
                gameState: moveResult.gameState
              };

              io.to(`room:${targetRoom}`).emit('token:update', moveEventData);
              if (altRoom) io.to(`room:${altRoom}`).emit('token:update', moveEventData);

              if (moveResult.gameOver) {
                io.to(`room:${targetRoom}`).emit('game:finish', {
                  winner: moveResult.winner,
                  rankings: moveResult.rankings,
                  gameState: moveResult.gameState
                });
                if (altRoom) {
                  io.to(`room:${altRoom}`).emit('game:finish', {
                    winner: moveResult.winner,
                    rankings: moveResult.rankings,
                    gameState: moveResult.gameState
                  });
                }
              } else if (moveResult.bonusTurn) {
                // Bonus roll for bot
                setTimeout(() => {
                  checkAndTriggerBotTurn(io, roomId);
                }, 1200);
              } else if (moveResult.requiresTurnSwitch) {
                // 2-second delay after coin move animation before switching turn
                setTimeout(() => {
                  const updated = gameManager.advanceTurn(roomId);
                  if (updated) {
                    io.to(`room:${targetRoom}`).emit('game:state', { game: updated });
                    if (altRoom) io.to(`room:${altRoom}`).emit('game:state', { game: updated });
                    checkAndTriggerBotTurn(io, roomId);
                  }
                }, 2600);
              }
            }
          }, 2200);
        }
      } catch (e) {
        console.error('Bot turn execution error:', e.message);
      }
    }
  }, 800);
}

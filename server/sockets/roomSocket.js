import { query } from '../config/db.js';
import { gameManager } from '../game/gameEngine.js';

// In-memory lobby player tracking
const roomLobbies = new Map(); // roomId -> { code, hostId, maxPlayers, players: [] }

export function setupRoomSocket(io, socket) {
  // Join Room Lobby
  socket.on('room:join', async ({ roomId, roomCode, user }) => {
    try {
      socket.join(`room:${roomId}`);
      socket.data.userId = user.id;
      socket.data.roomId = roomId;
      socket.data.username = user.username;

      let lobby = roomLobbies.get(roomId);
      if (!lobby) {
        lobby = {
          roomId,
          roomCode,
          hostId: user.id,
          players: []
        };
        roomLobbies.set(roomId, lobby);
      }

      const existingPlayerIdx = lobby.players.findIndex(p => p.userId === user.id);
      if (existingPlayerIdx >= 0) {
        lobby.players[existingPlayerIdx].socketId = socket.id;
        lobby.players[existingPlayerIdx].isOnline = true;
      } else {
        lobby.players.push({
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatar_url,
          rankingPoints: user.ranking_points || 1000,
          isReady: lobby.players.length === 0, // Host is ready by default
          socketId: socket.id,
          isOnline: true,
          playerIndex: lobby.players.length
        });
      }

      io.to(`room:${roomId}`).emit('room:update', {
        lobby: {
          roomId: lobby.roomId,
          roomCode: lobby.roomCode,
          hostId: lobby.hostId,
          players: lobby.players
        }
      });
    } catch (err) {
      console.error('Socket room:join Error:', err);
    }
  });

  // Ready status toggle
  socket.on('room:ready', ({ roomId, userId, isReady }) => {
    const lobby = roomLobbies.get(roomId);
    if (!lobby) return;

    const player = lobby.players.find(p => p.userId === userId);
    if (player) {
      player.isReady = isReady;
      io.to(`room:${roomId}`).emit('room:update', { lobby });
    }
  });

  // Add Bot Player into Room Lobby
  socket.on('room:addBot', ({ roomId, difficulty = 'medium' }) => {
    const lobby = roomLobbies.get(roomId);
    if (!lobby || lobby.players.length >= 8) return;

    const botIndex = lobby.players.length + 1;
    const botUser = {
      userId: -1000 - botIndex,
      username: `Bot ${['Alpha', 'Shadow', 'Turbo', 'Ninja', 'Blaze', 'Cosmo', 'Titan'][botIndex - 1] || botIndex}`,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=bot_${botIndex}`,
      rankingPoints: 1000 + (botIndex * 50),
      isReady: true,
      isBot: true,
      botDifficulty: difficulty,
      socketId: `bot_${Date.now()}_${botIndex}`,
      isOnline: true,
      playerIndex: lobby.players.length
    };

    lobby.players.push(botUser);
    io.to(`room:${roomId}`).emit('room:update', { lobby });
  });

  // Host starts the game
  socket.on('room:start', async ({ roomId }) => {
    const lobby = roomLobbies.get(roomId);
    if (!lobby) return;

    // Verify host
    if (socket.data.userId !== lobby.hostId) {
      socket.emit('error', { message: 'Only room host can start the match' });
      return;
    }

    if (lobby.players.length < 2) {
      socket.emit('error', { message: 'At least 2 players are required to start' });
      return;
    }

    // Initialize Game Engine State
    const game = gameManager.createGame(roomId, lobby.players, lobby.players.length);

    io.to(`room:${roomId}`).emit('game:start', {
      game: gameManager.serializeGame(game)
    });
  });

  // Leave room
  socket.on('room:leave', ({ roomId, userId }) => {
    const lobby = roomLobbies.get(roomId);
    if (lobby) {
      lobby.players = lobby.players.filter(p => p.userId !== userId);
      io.to(`room:${roomId}`).emit('room:update', { lobby });
    }
    socket.leave(`room:${roomId}`);
  });
}

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
        let maxPlayers = 4;
        try {
          const roomRes = await query('SELECT max_players FROM rooms WHERE id = $1 OR code = $1', [roomId]);
          if (roomRes.rows.length > 0) {
            maxPlayers = Number(roomRes.rows[0].max_players) || 4;
          }
        } catch (e) {
          console.error('Failed to query room max_players:', e);
        }

        lobby = {
          roomId,
          roomCode,
          hostId: user.id,
          maxPlayers,
          players: []
        };
        roomLobbies.set(roomId, lobby);
      }

      const existingPlayerIdx = lobby.players.findIndex(p => p.userId === user.id);
      if (existingPlayerIdx >= 0) {
        lobby.players[existingPlayerIdx].socketId = socket.id;
        lobby.players[existingPlayerIdx].isOnline = true;
      } else {
        // Strict capacity enforcement
        if (lobby.players.length >= (lobby.maxPlayers || 4)) {
          socket.emit('room:full', { message: 'Room is full' });
          socket.emit('error', { message: 'Room is full' });
          return;
        }

        lobby.players.push({
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatar_url,
          rankingPoints: user.ranking_points || 1000,
          socketId: socket.id,
          isOnline: true,
          playerIndex: lobby.players.length
        });
      }

      // If an active game already exists for this room, notify joining player
      const activeGame = gameManager.getGame(roomId || roomCode);
      if (activeGame && activeGame.phase !== 'GAME_OVER' && !gameManager.isGameExpired(activeGame)) {
        socket.emit('game:alreadyStarted', {
          roomId: activeGame.roomId,
          roomCode: activeGame.roomCode,
          game: gameManager.serializeGame(activeGame)
        });
      }

      io.to(`room:${roomId}`).emit('room:update', {
        lobby: {
          roomId: lobby.roomId,
          roomCode: lobby.roomCode,
          hostId: lobby.hostId,
          maxPlayers: lobby.maxPlayers,
          players: lobby.players
        }
      });
      if (lobby.roomCode && lobby.roomCode !== roomId) {
        io.to(`room:${lobby.roomCode}`).emit('room:update', {
          lobby: {
            roomId: lobby.roomId,
            roomCode: lobby.roomCode,
            hostId: lobby.hostId,
            maxPlayers: lobby.maxPlayers,
            players: lobby.players
          }
        });
      }
    } catch (err) {
      console.error('Socket room:join Error:', err);
    }
  });

  // Kick / Remove Player from Room (Host Only)
  socket.on('room:kickPlayer', ({ roomId, userId }) => {
    const lobby = roomLobbies.get(roomId);
    if (!lobby) return;

    if (socket.data.userId !== lobby.hostId) {
      socket.emit('error', { message: 'Only room host can remove players' });
      return;
    }

    if (userId === lobby.hostId) return; // Cannot kick host

    const kickedPlayer = lobby.players.find(p => p.userId === userId);
    lobby.players = lobby.players.filter(p => p.userId !== userId);
    lobby.players.forEach((p, idx) => { p.playerIndex = idx; });

    if (kickedPlayer && kickedPlayer.socketId) {
      io.to(kickedPlayer.socketId).emit('room:kicked', {
        message: 'You were removed from the room by the host.'
      });
    }

    io.to(`room:${roomId}`).emit('room:update', {
      lobby: {
        roomId: lobby.roomId,
        roomCode: lobby.roomCode,
        hostId: lobby.hostId,
        maxPlayers: lobby.maxPlayers,
        players: lobby.players
      }
    });
    if (lobby.roomCode && lobby.roomCode !== roomId) {
      io.to(`room:${lobby.roomCode}`).emit('room:update', {
        lobby: {
          roomId: lobby.roomId,
          roomCode: lobby.roomCode,
          hostId: lobby.hostId,
          maxPlayers: lobby.maxPlayers,
          players: lobby.players
        }
      });
    }
  });

  // Add Bot Player into Room Lobby
  socket.on('room:addBot', ({ roomId, difficulty = 'medium' }) => {
    const lobby = roomLobbies.get(roomId);
    if (!lobby || lobby.players.length >= (lobby.maxPlayers || 4)) return;

    const botIndex = lobby.players.length + 1;
    const botUser = {
      userId: -1000 - botIndex,
      username: `Bot ${['Alpha', 'Shadow', 'Turbo', 'Ninja', 'Blaze', 'Cosmo', 'Titan'][botIndex - 1] || botIndex}`,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=bot_${botIndex}`,
      rankingPoints: 1000 + (botIndex * 50),
      isBot: true,
      botDifficulty: difficulty,
      socketId: `bot_${Date.now()}_${botIndex}`,
      isOnline: true,
      playerIndex: lobby.players.length
    };

    lobby.players.push(botUser);
    io.to(`room:${roomId}`).emit('room:update', {
      lobby: {
        roomId: lobby.roomId,
        roomCode: lobby.roomCode,
        hostId: lobby.hostId,
        maxPlayers: lobby.maxPlayers,
        players: lobby.players
      }
    });
    if (lobby.roomCode && lobby.roomCode !== roomId) {
      io.to(`room:${lobby.roomCode}`).emit('room:update', {
        lobby: {
          roomId: lobby.roomId,
          roomCode: lobby.roomCode,
          hostId: lobby.hostId,
          maxPlayers: lobby.maxPlayers,
          players: lobby.players
        }
      });
    }
  });

  // Host starts the game - strictly requires exact player count
  socket.on('room:start', async ({ roomId }) => {
    const lobby = roomLobbies.get(roomId);
    if (!lobby) return;

    // Verify host
    if (socket.data.userId !== lobby.hostId) {
      socket.emit('error', { message: 'Only room host can start the match' });
      return;
    }

    const requiredPlayers = lobby.maxPlayers || 4;
    if (lobby.players.length !== requiredPlayers) {
      socket.emit('error', { message: `This room requires exactly ${requiredPlayers} players to start (${lobby.players.length}/${requiredPlayers} joined)` });
      return;
    }

    // Initialize Game Engine State with 30-min TTL lifecycle
    const game = gameManager.createGame(roomId, lobby.players, lobby.players.length, lobby.roomCode);
    const serialized = gameManager.serializeGame(game);

    io.to(`room:${roomId}`).emit('game:start', {
      game: serialized
    });
    if (lobby.roomCode && lobby.roomCode !== roomId) {
      io.to(`room:${lobby.roomCode}`).emit('game:start', {
        game: serialized
      });
    }
  });

  // Leave room
  socket.on('room:leave', ({ roomId, userId }) => {
    const lobby = roomLobbies.get(roomId);
    if (lobby) {
      lobby.players = lobby.players.filter(p => p.userId !== userId);
      lobby.players.forEach((p, idx) => { p.playerIndex = idx; });
      io.to(`room:${roomId}`).emit('room:update', {
        lobby: {
          roomId: lobby.roomId,
          roomCode: lobby.roomCode,
          hostId: lobby.hostId,
          maxPlayers: lobby.maxPlayers,
          players: lobby.players
        }
      });
      if (lobby.roomCode && lobby.roomCode !== roomId) {
        io.to(`room:${lobby.roomCode}`).emit('room:update', {
          lobby: {
            roomId: lobby.roomId,
            roomCode: lobby.roomCode,
            hostId: lobby.hostId,
            maxPlayers: lobby.maxPlayers,
            players: lobby.players
          }
        });
      }
    }
    socket.leave(`room:${roomId}`);
  });
}

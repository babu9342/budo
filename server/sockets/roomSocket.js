import { query } from '../config/db.js';
import { gameManager } from '../game/gameEngine.js';

// In-memory lobby player tracking
// Indexed by both String(roomId) and String(roomCode)
const roomLobbies = new Map();

function findLobby(identifier) {
  if (!identifier) return null;
  return roomLobbies.get(String(identifier)) || null;
}

function saveLobby(lobby) {
  if (!lobby) return;
  if (lobby.roomId) {
    roomLobbies.set(String(lobby.roomId), lobby);
  }
  if (lobby.roomCode) {
    roomLobbies.set(String(lobby.roomCode), lobby);
  }
}

export function setupRoomSocket(io, socket) {
  // Join Room Lobby
  socket.on('room:join', async ({ roomId, roomCode, maxPlayers: clientMaxPlayers, user }) => {
    try {
      const primaryKey = String(roomId || roomCode);
      socket.join(`room:${primaryKey}`);
      if (roomCode && String(roomCode) !== primaryKey) {
        socket.join(`room:${String(roomCode)}`);
      }
      if (roomId && String(roomId) !== primaryKey) {
        socket.join(`room:${String(roomId)}`);
      }

      socket.data.userId = user?.id;
      socket.data.roomId = roomId;
      socket.data.roomCode = roomCode;
      socket.data.username = user?.username;

      let lobby = findLobby(roomId) || findLobby(roomCode);
      if (!lobby) {
        let maxPlayers = Number(clientMaxPlayers) || 4;
        try {
          const roomRes = await query('SELECT max_players, code, host_id FROM rooms WHERE id = $1 OR code = $1', [primaryKey]);
          if (roomRes.rows.length > 0) {
            maxPlayers = Number(roomRes.rows[0].max_players) || maxPlayers;
            if (!roomCode && roomRes.rows[0].code) {
              roomCode = roomRes.rows[0].code;
            }
          }
        } catch (e) {
          console.error('Failed to query room max_players:', e);
        }

        lobby = {
          roomId: String(roomId || primaryKey),
          roomCode: String(roomCode || primaryKey),
          hostId: user?.id,
          maxPlayers: Number(maxPlayers) || 4,
          players: []
        };
        saveLobby(lobby);
      } else if (clientMaxPlayers && (!lobby.maxPlayers || lobby.maxPlayers === 4)) {
        lobby.maxPlayers = Number(clientMaxPlayers);
      }

      if (user && user.id) {
        const existingPlayerIdx = lobby.players.findIndex(p => String(p.userId) === String(user.id));
        if (existingPlayerIdx >= 0) {
          lobby.players[existingPlayerIdx].socketId = socket.id;
          lobby.players[existingPlayerIdx].isOnline = true;
          lobby.players[existingPlayerIdx].username = user.username || lobby.players[existingPlayerIdx].username;
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
      }

      saveLobby(lobby);
      console.log(`[Lobby Initialized] Room: ${lobby.roomCode || lobby.roomId} | Mode/maxPlayers: ${lobby.maxPlayers} | Players (${lobby.players.length}/${lobby.maxPlayers}):`, lobby.players.map(p => ({ id: p.userId, username: p.username, isBot: !!p.isBot })));

      // If an active game already exists for this room, notify joining player
      const activeGame = gameManager.getGame(roomId || roomCode);
      if (activeGame && activeGame.phase !== 'GAME_OVER' && !gameManager.isGameExpired(activeGame)) {
        socket.emit('game:alreadyStarted', {
          roomId: activeGame.roomId,
          roomCode: activeGame.roomCode,
          game: gameManager.serializeGame(activeGame)
        });
      }

      const updatePayload = {
        lobby: {
          roomId: lobby.roomId,
          roomCode: lobby.roomCode,
          hostId: lobby.hostId,
          maxPlayers: lobby.maxPlayers,
          players: lobby.players
        }
      };

      io.to(`room:${lobby.roomId}`).emit('room:update', updatePayload);
      if (lobby.roomCode && lobby.roomCode !== lobby.roomId) {
        io.to(`room:${lobby.roomCode}`).emit('room:update', updatePayload);
      }
    } catch (err) {
      console.error('Socket room:join Error:', err);
    }
  });

  // Kick / Remove Player from Room (Host Only)
  socket.on('room:kickPlayer', ({ roomId, roomCode, userId }) => {
    const lobby = findLobby(roomId) || findLobby(roomCode);
    if (!lobby) return;

    const currentUserId = socket.data?.userId;
    const isHost = String(currentUserId) === String(lobby.hostId) ||
                   String(currentUserId) === String(lobby.players[0]?.userId);

    if (!isHost) {
      socket.emit('error', { message: 'Only room host can remove players' });
      return;
    }

    if (String(userId) === String(lobby.hostId)) return; // Cannot kick host

    const kickedPlayer = lobby.players.find(p => String(p.userId) === String(userId));
    lobby.players = lobby.players.filter(p => String(p.userId) !== String(userId));
    lobby.players.forEach((p, idx) => { p.playerIndex = idx; });

    if (kickedPlayer && kickedPlayer.socketId) {
      io.to(kickedPlayer.socketId).emit('room:kicked', {
        message: 'You were removed from the room by the host.'
      });
    }

    saveLobby(lobby);

    const updatePayload = {
      lobby: {
        roomId: lobby.roomId,
        roomCode: lobby.roomCode,
        hostId: lobby.hostId,
        maxPlayers: lobby.maxPlayers,
        players: lobby.players
      }
    };

    io.to(`room:${lobby.roomId}`).emit('room:update', updatePayload);
    if (lobby.roomCode && lobby.roomCode !== lobby.roomId) {
      io.to(`room:${lobby.roomCode}`).emit('room:update', updatePayload);
    }
  });

  // Add Bot Player into Room Lobby
  socket.on('room:addBot', ({ roomId, roomCode, difficulty = 'medium' }) => {
    const lobby = findLobby(roomId) || findLobby(roomCode);
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
    saveLobby(lobby);

    const updatePayload = {
      lobby: {
        roomId: lobby.roomId,
        roomCode: lobby.roomCode,
        hostId: lobby.hostId,
        maxPlayers: lobby.maxPlayers,
        players: lobby.players
      }
    };

    io.to(`room:${lobby.roomId}`).emit('room:update', updatePayload);
    if (lobby.roomCode && lobby.roomCode !== lobby.roomId) {
      io.to(`room:${lobby.roomCode}`).emit('room:update', updatePayload);
    }
  });

  // Host starts the game
  socket.on('room:start', async ({ roomId, roomCode }) => {
    try {
      let lobby = findLobby(roomId) || findLobby(roomCode);

      if (!lobby) {
        // Fallback: If lobby was not created yet, construct from DB or socket data
        let maxPlayers = 4;
        const lookupKey = roomId || roomCode;
        try {
          const roomRes = await query('SELECT id, code, max_players, host_id FROM rooms WHERE id = $1 OR code = $1', [lookupKey]);
          if (roomRes.rows.length > 0) {
            maxPlayers = Number(roomRes.rows[0].max_players) || 4;
            roomId = roomRes.rows[0].id;
            roomCode = roomRes.rows[0].code;
          }
        } catch (e) {
          console.error('Fallback query error in room:start:', e);
        }

        lobby = {
          roomId: String(roomId || lookupKey),
          roomCode: String(roomCode || lookupKey),
          hostId: socket.data?.userId,
          maxPlayers,
          players: [
            {
              userId: socket.data?.userId || -1,
              username: socket.data?.username || 'Host',
              avatarUrl: '/avatars/default.png',
              rankingPoints: 1000,
              socketId: socket.id,
              isOnline: true,
              playerIndex: 0
            }
          ]
        };
        saveLobby(lobby);
      }

      // Verify host
      const currentUserId = socket.data?.userId;
      const isHost = !lobby.hostId ||
                     String(currentUserId) === String(lobby.hostId) ||
                     String(currentUserId) === String(lobby.players[0]?.userId) ||
                     lobby.players[0]?.socketId === socket.id;

      if (!isHost) {
        socket.emit('error', { message: 'Only room host can start the match' });
        return;
      }

      // If solo player starts alone without opponents, add 1 bot to enable playing
      if (lobby.players.length === 1 && (lobby.maxPlayers || 4) >= 2) {
        const botIndex = lobby.players.length + 1;
        lobby.players.push({
          userId: -1000 - botIndex,
          username: `Bot ${['Alpha', 'Shadow', 'Turbo', 'Ninja', 'Blaze', 'Cosmo', 'Titan'][botIndex - 1] || botIndex}`,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=bot_${botIndex}`,
          rankingPoints: 1000 + (botIndex * 50),
          isBot: true,
          botDifficulty: 'medium',
          socketId: `bot_${Date.now()}_${botIndex}`,
          isOnline: true,
          playerIndex: lobby.players.length
        });
      }

      saveLobby(lobby);
      console.log(`[Lobby Game Start] Room: ${lobby.roomCode || lobby.roomId} | Mode/maxPlayers: ${lobby.maxPlayers} | Final Players (${lobby.players.length}):`, lobby.players.map(p => ({ id: p.userId, name: p.username, isBot: !!p.isBot, index: p.playerIndex })));

      // Initialize Game Engine State with 30-min TTL lifecycle
      const primaryGameId = lobby.roomId || lobby.roomCode || String(roomId);
      const codeKey = lobby.roomCode || String(roomCode || roomId);
      const game = gameManager.createGame(primaryGameId, lobby.players, lobby.maxPlayers || lobby.players.length, codeKey);
      const serialized = gameManager.serializeGame(game);

      const startPayload = {
        roomId: game.roomId,
        roomCode: game.roomCode,
        game: serialized
      };

      // Broadcast game:start to all participants
      io.to(`room:${lobby.roomId}`).emit('game:start', startPayload);
      if (lobby.roomCode && lobby.roomCode !== lobby.roomId) {
        io.to(`room:${lobby.roomCode}`).emit('game:start', startPayload);
      }
      if (roomId && String(roomId) !== lobby.roomId && String(roomId) !== lobby.roomCode) {
        io.to(`room:${String(roomId)}`).emit('game:start', startPayload);
      }
    } catch (err) {
      console.error('Socket room:start Error:', err);
      socket.emit('error', { message: 'Failed to start match: ' + (err.message || 'Unknown error') });
    }
  });

  // Leave room
  socket.on('room:leave', ({ roomId, roomCode, userId }) => {
    const lobby = findLobby(roomId) || findLobby(roomCode);
    if (lobby) {
      lobby.players = lobby.players.filter(p => String(p.userId) !== String(userId));
      lobby.players.forEach((p, idx) => { p.playerIndex = idx; });
      saveLobby(lobby);

      const updatePayload = {
        lobby: {
          roomId: lobby.roomId,
          roomCode: lobby.roomCode,
          hostId: lobby.hostId,
          maxPlayers: lobby.maxPlayers,
          players: lobby.players
        }
      };

      io.to(`room:${lobby.roomId}`).emit('room:update', updatePayload);
      if (lobby.roomCode && lobby.roomCode !== lobby.roomId) {
        io.to(`room:${lobby.roomCode}`).emit('room:update', updatePayload);
      }
    }
    if (roomId) socket.leave(`room:${roomId}`);
    if (roomCode) socket.leave(`room:${roomCode}`);
  });
}


import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// PostgreSQL Connection configuration
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/budo';
const isProduction = process.env.NODE_ENV === 'production';

export let pool = null;
export let isConnectedToPg = false;

// In-Memory SQLite-style DB fallback store when PostgreSQL server is not locally running
const memoryStore = {
  users: [],
  rooms: [],
  room_players: [],
  games: [],
  game_players: [],
  game_moves: [],
  rankings: [],
  chat_messages: [],
  audio_messages: [],
  game_history: [],
  _autoInc: {
    users: 1,
    rooms: 1,
    room_players: 1,
    games: 1,
    game_players: 1,
    game_moves: 1,
    rankings: 1,
    chat_messages: 1,
    audio_messages: 1,
    game_history: 1
  }
};

try {
  pool = new Pool({
    connectionString,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30000,
    max: 20
  });

  // Test connection
  const client = await pool.connect();
  isConnectedToPg = true;
  client.release();
  console.log('✅ Connected to PostgreSQL Database successfully.');

  // Auto initialize schema if needed
  const schemaSqlPath = path.join(__dirname, '../sql/schema.sql');
  if (fs.existsSync(schemaSqlPath)) {
    const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
    await pool.query(schemaSql);
    console.log('✅ Database schema verified/initialized.');
  }
} catch (err) {
  console.warn('⚠️  PostgreSQL connection not detected at', connectionString);
  console.warn('⚡ Using high-performance in-memory SQL fallback engine for rapid local development.');
  isConnectedToPg = false;
}

/**
 * Universal Native SQL Query Runner
 * Uses pure PostgreSQL connection when available, with memory fallback.
 */
export async function query(text, params = []) {
  if (isConnectedToPg && pool) {
    try {
      const start = Date.now();
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      return res;
    } catch (err) {
      console.error('Database Query Error:', err.message, text);
      throw err;
    }
  }

  // Fallback SQL Query Interpreter for in-memory development
  return executeInMemorySql(text, params);
}

/**
 * High-performance fallback SQL executor to simulate raw SQL queries
 */
function executeInMemorySql(text, params = []) {
  const cleanSql = text.trim();
  const lowerSql = cleanSql.toLowerCase();

  // Normalize parameters
  let pIdx = 0;
  
  // 1. SELECT queries
  if (lowerSql.startsWith('select')) {
    if (lowerSql.includes('from users')) {
      if (lowerSql.includes('where id = $1') || lowerSql.includes('where u.id = $1')) {
        const id = Number(params[0]);
        const user = memoryStore.users.find(u => u.id === id);
        return { rows: user ? [ { ...user } ] : [], rowCount: user ? 1 : 0 };
      }
      if (lowerSql.includes('where email = $1') || lowerSql.includes('where username = $1') || lowerSql.includes('where email = $1 or username = $2')) {
        const val1 = params[0]?.toLowerCase();
        const val2 = params[1]?.toLowerCase() || val1;
        const user = memoryStore.users.find(u => u.email?.toLowerCase() === val1 || u.username?.toLowerCase() === val2);
        return { rows: user ? [ { ...user } ] : [], rowCount: user ? 1 : 0 };
      }
      return { rows: [...memoryStore.users], rowCount: memoryStore.users.length };
    }

    if (lowerSql.includes('from rooms')) {
      if (lowerSql.includes('where code = $1')) {
        const code = params[0];
        const room = memoryStore.rooms.find(r => r.code === code);
        return { rows: room ? [ { ...room } ] : [], rowCount: room ? 1 : 0 };
      }
      if (lowerSql.includes('where id = $1')) {
        const id = Number(params[0]);
        const room = memoryStore.rooms.find(r => r.id === id);
        return { rows: room ? [ { ...room } ] : [], rowCount: room ? 1 : 0 };
      }
    }

    if (lowerSql.includes('from room_players')) {
      if (lowerSql.includes('where room_id = $1')) {
        const roomId = Number(params[0]);
        const players = memoryStore.room_players
          .filter(rp => rp.room_id === roomId)
          .map(rp => {
            const user = memoryStore.users.find(u => u.id === rp.user_id) || {};
            return {
              ...rp,
              username: user.username,
              avatar_url: user.avatar_url,
              ranking_points: user.ranking_points
            };
          });
        return { rows: players, rowCount: players.length };
      }
    }

    if (lowerSql.includes('from rankings') || lowerSql.includes('from users u left join rankings')) {
      const sortedUsers = [...memoryStore.users]
        .sort((a, b) => (b.ranking_points || 0) - (a.ranking_points || 0))
        .map((u, idx) => ({
          rank: idx + 1,
          id: u.id,
          username: u.username,
          avatar_url: u.avatar_url,
          points: u.ranking_points || 1000,
          wins: u.wins || 0,
          games: u.games_played || 0,
          losses: u.losses || 0,
          captures: u.captures || 0,
          win_rate: u.games_played > 0 ? ((u.wins / u.games_played) * 100).toFixed(1) : '0.0'
        }));
      return { rows: sortedUsers.slice(0, 50), rowCount: sortedUsers.length };
    }

    if (lowerSql.includes('from game_history')) {
      const userId = Number(params[0]);
      const history = memoryStore.game_history
        .filter(h => h.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return { rows: history, rowCount: history.length };
    }
  }

  // 2. INSERT queries
  if (lowerSql.startsWith('insert into users')) {
    const id = memoryStore._autoInc.users++;
    const [username, email, password_hash, avatar_url] = params;
    const newUser = {
      id,
      username,
      email,
      password_hash,
      avatar_url: avatar_url || '/avatars/default.png',
      ranking_points: 1000,
      games_played: 0,
      wins: 0,
      losses: 0,
      captures: 0,
      created_at: new Date()
    };
    memoryStore.users.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }

  if (lowerSql.startsWith('insert into rooms')) {
    const id = memoryStore._autoInc.rooms++;
    const [code, host_id, max_players, is_private] = params;
    const newRoom = {
      id,
      code,
      host_id: Number(host_id),
      max_players: Number(max_players || 4),
      status: 'WAITING',
      is_private: is_private !== false,
      created_at: new Date()
    };
    memoryStore.rooms.push(newRoom);
    return { rows: [newRoom], rowCount: 1 };
  }

  if (lowerSql.startsWith('insert into room_players')) {
    const id = memoryStore._autoInc.room_players++;
    const [room_id, user_id, is_ready, player_index] = params;
    const existingIdx = memoryStore.room_players.findIndex(rp => rp.room_id === Number(room_id) && rp.user_id === Number(user_id));
    const newPlayer = {
      id,
      room_id: Number(room_id),
      user_id: Number(user_id),
      is_ready: Boolean(is_ready),
      player_index: Number(player_index || 0),
      joined_at: new Date()
    };
    if (existingIdx >= 0) {
      memoryStore.room_players[existingIdx] = newPlayer;
    } else {
      memoryStore.room_players.push(newPlayer);
    }
    return { rows: [newPlayer], rowCount: 1 };
  }

  if (lowerSql.startsWith('insert into game_history')) {
    const id = memoryStore._autoInc.game_history++;
    const [game_id, user_id, result, points_change, captures, tokens_finished, finish_position] = params;
    const hist = {
      id,
      game_id: Number(game_id),
      user_id: Number(user_id),
      result,
      points_change: Number(points_change || 0),
      captures: Number(captures || 0),
      tokens_finished: Number(tokens_finished || 0),
      finish_position: finish_position || null,
      created_at: new Date()
    };
    memoryStore.game_history.push(hist);
    return { rows: [hist], rowCount: 1 };
  }

  // 3. UPDATE queries
  if (lowerSql.startsWith('update users')) {
    const user = memoryStore.users.find(u => u.id === Number(params[params.length - 1]));
    if (user) {
      if (lowerSql.includes('avatar_url = $1')) {
        user.avatar_url = params[0];
      }
      if (lowerSql.includes('ranking_points = ranking_points + $1')) {
        user.ranking_points = (user.ranking_points || 1000) + Number(params[0]);
        user.games_played = (user.games_played || 0) + 1;
        if (params[1] === true || params[1] === 1) user.wins = (user.wins || 0) + 1;
        else user.losses = (user.losses || 0) + 1;
      }
      return { rows: [user], rowCount: 1 };
    }
  }

  if (lowerSql.startsWith('update room_players')) {
    const roomId = Number(params[2] || params[1]);
    const userId = Number(params[1] || params[0]);
    const player = memoryStore.room_players.find(rp => rp.room_id === roomId && rp.user_id === userId);
    if (player) {
      if (lowerSql.includes('is_ready = $1')) player.is_ready = Boolean(params[0]);
      return { rows: [player], rowCount: 1 };
    }
  }

  if (lowerSql.startsWith('delete from room_players')) {
    const roomId = Number(params[0]);
    const userId = Number(params[1]);
    memoryStore.room_players = memoryStore.room_players.filter(rp => !(rp.room_id === roomId && rp.user_id === userId));
    return { rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
}

import { query } from '../config/db.js';

// Generates an 8-digit numeric room code like '03514568'
function generateRoomCode() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

export async function createRoom(req, res) {
  try {
    const { maxPlayers = 4, isPrivate = true } = req.body;
    const hostId = req.user.id;
    const code = generateRoomCode();

    const result = await query(
      `INSERT INTO rooms (code, host_id, max_players, is_private)
       VALUES ($1, $2, $3, $4)
       RETURNING id, code, host_id, max_players, status, is_private, created_at`,
      [code, hostId, Number(maxPlayers), isPrivate]
    );

    const room = result.rows[0];

    // Add host as player
    await query(
      `INSERT INTO room_players (room_id, user_id, is_ready, player_index)
       VALUES ($1, $2, $3, $4)`,
      [room.id, hostId, true, 0]
    );

    return res.status(201).json({
      success: true,
      room,
      shareUrl: `${process.env.CLIENT_URL || 'https://budo-game.com'}/join/${code}`
    });
  } catch (err) {
    console.error('Create Room Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create room' });
  }
}

export async function getRoomByCode(req, res) {
  try {
    const { code } = req.params;

    const roomResult = await query(
      `SELECT * FROM rooms WHERE code = $1`,
      [code]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const room = roomResult.rows[0];

    // Get room players
    const playersResult = await query(
      `SELECT rp.id, rp.room_id, rp.user_id, rp.is_ready, rp.player_index,
              u.username, u.avatar_url, u.ranking_points
       FROM room_players rp
       JOIN users u ON rp.user_id = u.id
       WHERE rp.room_id = $1
       ORDER BY rp.player_index ASC`,
      [room.id]
    );

    return res.json({
      success: true,
      room,
      players: playersResult.rows
    });
  } catch (err) {
    console.error('Get Room Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve room' });
  }
}

export async function joinRoom(req, res) {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    const roomResult = await query(`SELECT * FROM rooms WHERE code = $1`, [code]);
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const room = roomResult.rows[0];

    if (room.status !== 'WAITING') {
      return res.status(400).json({ success: false, message: 'Game has already started or ended in this room' });
    }

    const currentPlayers = await query(`SELECT * FROM room_players WHERE room_id = $1`, [room.id]);
    const alreadyJoined = currentPlayers.rows.some(p => p.user_id === userId);

    if (!alreadyJoined) {
      if (currentPlayers.rows.length >= room.max_players) {
        return res.status(400).json({ success: false, message: 'Room is full' });
      }

      await query(
        `INSERT INTO room_players (room_id, user_id, is_ready, player_index)
         VALUES ($1, $2, $3, $4)`,
        [room.id, userId, false, currentPlayers.rows.length]
      );
    }

    return res.json({
      success: true,
      message: 'Joined room successfully',
      room
    });
  } catch (err) {
    console.error('Join Room Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to join room' });
  }
}

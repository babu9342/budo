import { query } from '../config/db.js';

export async function getRankings(req, res) {
  try {
    const result = await query(
      `SELECT id, username, avatar_url, ranking_points AS points, wins, games_played AS games, losses, captures
       FROM users
       ORDER BY ranking_points DESC
       LIMIT 50`
    );

    const rankings = result.rows.map((user, idx) => ({
      rank: idx + 1,
      ...user,
      win_rate: user.games > 0 ? ((user.wins / user.games) * 100).toFixed(1) : '0.0'
    }));

    return res.json({ success: true, rankings });
  } catch (err) {
    console.error('Rankings Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch rankings' });
  }
}

export async function getGameHistory(req, res) {
  try {
    const userId = req.params.userId || req.user.id;

    const result = await query(
      `SELECT gh.id, gh.game_id, gh.result, gh.points_change, gh.captures,
              gh.finish_position, gh.created_at
       FROM game_history gh
       WHERE gh.user_id = $1
       ORDER BY gh.created_at DESC
       LIMIT 20`,
      [userId]
    );

    return res.json({ success: true, history: result.rows });
  } catch (err) {
    console.error('History Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch game history' });
  }
}

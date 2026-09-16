import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { generateToken } from '../middleware/authMiddleware.js';

export async function register(req, res) {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    // Check existing
    const existing = await query(
      `SELECT * FROM users WHERE email = $1 OR username = $2`,
      [email.toLowerCase(), username]
    );

    if (existing.rows.length > 0) {
      const match = existing.rows[0];
      if (match.email.toLowerCase() === email.toLowerCase()) {
        return res.status(409).json({ success: false, message: 'Email is already registered' });
      }
      return res.status(409).json({ success: false, message: 'Username is already taken' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;

    const result = await query(
      `INSERT INTO users (username, email, password_hash, avatar_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, avatar_url, ranking_points, games_played, wins, losses, captures, created_at`,
      [username, email.toLowerCase(), passwordHash, defaultAvatar]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user
    });
  } catch (err) {
    console.error('Registration Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const result = await query(
      `SELECT * FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user);
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
      ranking_points: user.ranking_points || 1000,
      games_played: user.games_played || 0,
      wins: user.wins || 0,
      losses: user.losses || 0,
      captures: user.captures || 0
    };

    return res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getMe(req, res) {
  try {
    const result = await query(
      `SELECT id, username, email, avatar_url, ranking_points, games_played, wins, losses, captures, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('GetMe Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function forgotPassword(req, res) {
  const { email } = req.body;
  // Friendly mock response for forgot-password
  return res.json({
    success: true,
    message: 'If an account exists with this email, a password reset link has been dispatched.'
  });
}

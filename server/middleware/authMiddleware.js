import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'budo_super_secret_jwt_key_2026';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  const guestNameHeader = req.headers['x-guest-name'];
  const guestUsername = guestNameHeader ? decodeURIComponent(guestNameHeader) : 'Player_' + Math.floor(1000 + Math.random() * 9000);

  if (!token || token === 'null' || token === 'undefined') {
    req.user = {
      id: 'guest_' + Math.random().toString(36).substring(2, 9),
      username: guestUsername,
      isGuest: true
    };
    return next();
  }

  if (token.startsWith('guest_') || token.length < 32) {
    req.user = {
      id: token,
      username: guestUsername,
      isGuest: true
    };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = {
        id: token.startsWith('guest_') ? token : 'guest_' + Math.random().toString(36).substring(2, 9),
        username: guestUsername,
        isGuest: true
      };
      return next();
    }
    req.user = user;
    next();
  });
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

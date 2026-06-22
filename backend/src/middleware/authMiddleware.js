import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Named middleware: authenticate any logged-in user
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token, authorization denied.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('[auth middleware error]', err.message);
    res.status(401).json({ msg: 'Token is not valid or has expired.' });
  }
}

// Named middleware: restrict to admin role only
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ msg: 'Not authenticated.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied: Admins only.' });
  }
  next();
}

// Default export for backward compatibility
export default requireAuth;

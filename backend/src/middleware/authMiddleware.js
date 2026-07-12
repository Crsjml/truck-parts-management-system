import { supabase } from '../config/supabase.js';

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];
  
  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ msg: 'No token provided' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Supabase token verification error:', error);
      return res.status(401).json({ msg: 'Invalid or expired token' });
    }
    
    req.auth = { userId: user.id, email: user.email, ...user };
    next();
  } catch (error) {
    console.error('Unexpected token verification error:', error);
    return res.status(401).json({ msg: 'Invalid or expired token' });
  }
};

export const requireAdmin = async (req, res, next) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ msg: 'Not authenticated.' });
  }
  // Note: Admin claims will be checked against the StaffRole Prisma table in a later step
  next();
};

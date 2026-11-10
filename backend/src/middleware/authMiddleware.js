import { supabase } from '../config/supabase.js';
import { prisma } from '../config/prisma.js';
import { ROLE_PERMISSIONS, hasPermission } from '../config/permissions.js';

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
      if (error && error.name !== 'AuthSessionMissingError') {
         console.warn(`[Auth] Token rejected: ${error.message}`);
      }
      return res.status(401).json({ msg: 'Invalid or expired token' });
    }
    
    req.auth = { userId: user.id, email: user.email, ...user };
    next();
  } catch (error) {
    console.error('Unexpected token verification error:', error);
    return res.status(401).json({ msg: 'Invalid or expired token' });
  }
};

const ROLE_RANK = Object.freeze(
  Object.assign(Object.create(null), {
    ADMIN: 1,
    SUPERADMIN: 2
  })
);

const authorizeStaff = (allows) => {
  return async (req, res, next) => {
    if (!req.auth || !req.auth.email) {
      return res.status(401).json({ msg: 'Not authenticated.' });
    }

    try {
      const staff = await prisma.staffRole.findUnique({
        where: { email: req.auth.email.toLowerCase() }
      });

      if (!staff || !allows(staff.role)) {
        return res.status(403).json({ msg: 'Insufficient privileges.' });
      }

      req.staff = staff;
      next();
    } catch (err) {
      console.error('[requireRole]', err);
      return res.status(500).json({ msg: 'Authorization check failed.' });
    }
  };
};

export const requireRole = (minimum) => {
  const requiredRank = ROLE_RANK[minimum];
  if (!requiredRank) throw new Error(`[requireRole] Invalid minimum role specified: "${minimum}"`);
  return authorizeStaff(role => (ROLE_RANK[role] ?? 0) >= requiredRank);
};

export const requirePermission = (permission) => {
  if (!ROLE_PERMISSIONS.SUPERADMIN.includes(permission)) {
    throw new Error(`Invalid permission: ${permission}`);
  }
  return authorizeStaff(role => hasPermission(role, permission));
};


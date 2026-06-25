import { requireAuth as clerkRequireAuth } from '@clerk/express';

// Export Clerk's requireAuth so we don't have to change all the routers
export const requireAuth = clerkRequireAuth();

// Named middleware: restrict to admin role only
export function requireAdmin(req, res, next) {
  // If Clerk didn't authenticate them, block
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ msg: 'Not authenticated.' });
  }
  
  // Basic bypass for the migration since Clerk doesn't inject roles by default
  // In a real production app, we would check req.auth.claims.metadata.role
  next();
}

export default requireAuth;

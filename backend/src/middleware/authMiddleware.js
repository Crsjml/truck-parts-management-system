import admin from 'firebase-admin';

// Initialize Firebase Admin (Only project ID needed for token verification)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'ttp-mgmt-sys',
  });
}

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.auth = { userId: decodedToken.uid, ...decodedToken };
    next();
  } catch (error) {
    console.error('Firebase token verification error:', error);
    return res.status(401).json({ msg: 'Invalid or expired token' });
  }
};

export function requireAdmin(req, res, next) {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ msg: 'Not authenticated.' });
  }
  // In a real app, verify admin claims here
  next();
}

export default requireAuth;

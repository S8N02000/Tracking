import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

export function safeCompare(providedToken, secretToken) {
  if (typeof providedToken !== 'string' || typeof secretToken !== 'string') {
    return false;
  }
  const hashProvided = crypto.createHash('sha256').update(providedToken).digest();
  const hashSecret = crypto.createHash('sha256').update(secretToken).digest();
  return crypto.timingSafeEqual(hashProvided, hashSecret);
}

export function authMiddleware(req, res, next) {
  // Public read access for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const adminSecret = process.env.ADMIN_SECRET || 'secret_admin_token_123456';

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: true,
      message: 'Accès non autorisé : jeton administrateur invalide ou manquant.',
      code: 'UNAUTHORIZED'
    });
  }

  const token = authHeader.substring(7).trim();

  if (!safeCompare(token, adminSecret)) {
    return res.status(401).json({
      error: true,
      message: 'Accès non autorisé : jeton administrateur invalide ou manquant.',
      code: 'UNAUTHORIZED'
    });
  }

  next();
}

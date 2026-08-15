import { Router } from 'express';

const router = Router();

router.post('/auth/verify', (req, res) => {
  // If request reached this endpoint, authMiddleware already verified the Bearer token
  res.json({ valid: true });
});

export default router;

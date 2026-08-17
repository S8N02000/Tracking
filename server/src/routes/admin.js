import { Router } from 'express';
import { getDatabase, closeDatabase } from '../database/db.js';

const router = Router();

// POST /api/admin/reload-db
// Force-close and reopen the SQLite connection to pick up external changes
router.post('/admin/reload-db', (req, res) => {
  try {
    console.log('[admin] Reloading database connection...');
    closeDatabase();           // close singleton
    getDatabase();             // reopen — triggers fresh WAL read
    console.log('[admin] Database connection reloaded successfully.');
    res.json({ success: true, message: 'Connexion DB rechargée.' });
  } catch (err) {
    console.error('[admin] Failed to reload DB:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

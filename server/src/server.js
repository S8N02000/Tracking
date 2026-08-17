import app from './app.js';
import { closeDatabase, getDatabase } from './database/db.js';

const PORT = process.env.PORT || 3001;

// ── Daily DB refresh at 3:00 AM ──────────────────────────────────────────────
// better-sqlite3 holds a WAL snapshot; external writers (Hermes/Python)
// may add rows after our connection opens. This ensures we pick up
// any changes made while the server was running.
// ─────────────────────────────────────────────────────────────────────────────
function scheduleNextReload() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(3, 0, 0, 0);          // today's 3:00 AM
  if (next <= now) next.setDate(next.getDate() + 1); // if past, tomorrow
  const delayMs = next.getTime() - now.getTime();
  console.log(`[db-refresh] Next scheduled reload at ${next.toISOString()} (in ${Math.round(delayMs / 60000)} min)`);
  return setTimeout(() => {
    console.log('[db-refresh] Running scheduled DB reload...');
    try {
      closeDatabase();
      getDatabase();
      console.log('[db-refresh] Done.');
    } catch (err) {
      console.error('[db-refresh] Error:', err);
    }
    scheduleNextReload(); // reschedule for tomorrow
  }, delayMs);
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  // Start daily DB refresh scheduler
  scheduleNextReload();
});

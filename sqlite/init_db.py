#!/usr/bin/env python3
"""
init_db.py
==========
Crée la base SQLite, applique le schema.sql complet,
et peuple les tables de référence (lookup tables).

Usage:
    python init_db.py          # crée nutrition.db dans sqlite/
    python init_db.py --force   # recrée from scratch (DANGER: perte données)
"""

import sqlite3
import sys
from pathlib import Path

BASE = Path(__file__).parent
DB_PATH = BASE / "nutrition.db"
SCHEMA_PATH = BASE / "schema.sql"


def init_db(force: bool = False, db_path: Path = None) -> None:
    _db_path = db_path or DB_PATH
    if _db_path.exists():
        if force:
            _db_path.unlink()
            print(f"⚠️  Base supprimée: {_db_path}")
        else:
            print(f"✅ Base existe déjà: {_db_path}")
            print("   Lance avec --force pour recréer from scratch.")
            return

    # Lecture schema
    schema_sql = SCHEMA_PATH.read_text()

    conn = sqlite3.connect(_db_path)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        conn.executescript(schema_sql)
        conn.commit()
    except sqlite3.Error as e:
        print(f"❌ Erreur création base: {e}")
        conn.close()
        sys.exit(1)

    # Vérification
    cur = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    )
    tables = [r[0] for r in cur.fetchall()]
    print(f"✅ Base créée: {_db_path}")
    print(f"   Tables: {', '.join(sorted(tables))}")

    cur = conn.execute("SELECT COUNT(*) FROM ref_meal_periods")
    print(f"   Périodes: {cur.fetchone()[0]}")
    cur = conn.execute("SELECT COUNT(*) FROM ref_sport_types")
    print(f"   Sports:   {cur.fetchone()[0]}")
    cur = conn.execute("SELECT COUNT(*) FROM ref_food_categories")
    print(f"   Catégories: {cur.fetchone()[0]}")

    conn.close()


if __name__ == "__main__":
    force = "--force" in sys.argv
    init_db(force=force)

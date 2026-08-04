#!/usr/bin/env python3
"""
log_sport.py
============
Enregistre une séance sportive.

Usage:
    python log_sport.py --date 2026-08-03 --type tapis_roulant \\
        --duration 34 --kcal 448 --distance 5.5 --pas 7444
"""

import json
import sqlite3
import sys
import argparse
from pathlib import Path
from datetime import datetime

BASE = Path(__file__).parent
DB_PATH = BASE / "nutrition.db"

sys.path.insert(0, str(BASE))
from utils import validate_date, validate_sport_type


def log_sport(
    conn: sqlite3.Connection,
    date_str: str,
    sport_type: str,
    duration_min: int,
    kcal_burned: int = None,
    distance_km: float = None,
    pace_kmh: float = None,
    avg_hr_bpm: int = None,
    elevation_m: int = None,
    pas: int = None,
    km_iphone: float = None,
    weight_kg: float = None,
    met: float = None,
    notes: str = "",
    dry_run: bool = False,
) -> int:
    """Insert une ligne dans sport_log. Returns sport_log.id."""
    date_norm   = validate_date(date_str)
    type_norm  = validate_sport_type(sport_type)

    if duration_min <= 0:
        raise ValueError("duration_min doit être > 0")

    if dry_run:
        print(f"[DRY RUN] INSERT sport_log: date={date_norm}, type={type_norm}, "
              f"duration={duration_min}min, kcal={kcal_burned}")
        return -1

    cursor = conn.execute(
        """
        INSERT INTO sport_log
            (date_, sport_type, duration_min, kcal_burned,
             distance_km, pace_kmh, avg_hr_bpm, elevation_m,
             pas, km_iphone, weight_kg, met, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (date_norm, type_norm, duration_min, kcal_burned,
         distance_km, pace_kmh, avg_hr_bpm, elevation_m,
         pas, km_iphone, weight_kg, met, notes or "")
    )
    conn.commit()
    return cursor.lastrowid


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Log une séance sportive")
    p.add_argument("--date",   required=True, help="YYYY-MM-DD")
    p.add_argument("--type",   required=True, help="tapis_roulant|velo|pied|natation|musculation|jardin|autre")
    p.add_argument("--duration", "--duree", dest="duration", required=True, type=int, help="Minutes")
    p.add_argument("--kcal",   type=int, default=None)
    p.add_argument("--distance", type=float, default=None)
    p.add_argument("--pace",   type=float, default=None, dest="pace_kmh")
    p.add_argument("--hr",     type=int, default=None, dest="avg_hr_bpm", help="FC moyenne (bpm)")
    p.add_argument("--elevation", type=int, default=None)
    p.add_argument("--pas",    type=int, default=None)
    p.add_argument("--km-iphone", type=float, default=None)
    p.add_argument("--weight", type=float, default=None)
    p.add_argument("--met",    type=float, default=None)
    p.add_argument("--notes",  type=str, default="")
    p.add_argument("--dry-run", action="store_true")
    return p


def main():
    args = build_parser().parse_args()

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")

    try:
        sid = log_sport(
            conn,
            date_str=args.date,
            sport_type=args.type,
            duration_min=args.duration,
            kcal_burned=args.kcal,
            distance_km=args.distance,
            pace_kmh=args.pace_kmh,
            avg_hr_bpm=args.avg_hr_bpm,
            elevation_m=args.elevation,
            pas=args.pas,
            km_iphone=args.km_iphone,
            weight_kg=args.weight,
            met=args.met,
            notes=args.notes,
            dry_run=args.dry_run,
        )
        if not args.dry_run:
            print(f"✅ Séance logguée: id={sid}, {args.type}, {args.duration}min")
        conn.close()
        sys.exit(0)
    except Exception as e:
        print(f"❌ {e}")
        conn.close()
        sys.exit(1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
log_meal.py
===========
Enregistre un repas dans le journal.

Usage:
    python log_meal.py --date 2026-08-03 --period diner \\
        --food "banane" --qty 1 --unit unit

    python log_meal.py --date 2026-08-03 --period diner \\
        --recipe "poulet curry crème amande" --qty 1 --unit portion

    python log_meal.py --json '[{"date":"2026-08-03","period":"diner","food":"banane","qty":1,"unit":"unit"}]'

Transactions: chaque entrée est insertée dans sa propre transaction —
échec sur une entrée n'affecte pas les autres.
"""

import json
import sqlite3
import sys
import argparse
from pathlib import Path
from datetime import datetime

BASE = Path(__file__).parent
DB_PATH = BASE / "nutrition.db"

# Importer utils pour conversion
sys.path.insert(0, str(BASE))
from utils import (
    unit_to_grams, validate_period, validate_date,
    get_food_by_name, get_recipe_by_name,
    row_to_dict,
)


def log_entry(
    conn: sqlite3.Connection,
    date_str: str,
    period: str,
    food_name: str = None,
    recipe_name: str = None,
    quantity: float = 1.0,
    unit: str = "g",
    notes: str = "",
) -> int:
    """
    Insert une entrée dans meal_log.

    Returns: meal_log.id
    """
    period_norm  = validate_period(period)
    date_norm    = validate_date(date_str)
    original_qty = float(quantity)
    original_unit = unit

    if bool(food_name) == bool(recipe_name):
        raise ValueError("Donne soit --food soit --recipe, pas les deux.")

    if food_name:
        food_row = get_food_by_name(conn, food_name)
        if not food_row:
            raise ValueError(f"Aliment '{food_name}' non trouvé en base.")
        food_id    = food_row["id"]
        recipe_id  = None
        food_dict  = row_to_dict(food_row)
        weight_per_unit = food_dict.get("weight_per_unit_g", 0.0)
        slug = food_dict.get("name", "").replace(" ", "_")

        quantity_g = unit_to_grams(
            quantity=original_qty,
            unit=original_unit,
            food_id=food_id,
            slug=slug,
            weight_per_unit_g=weight_per_unit,
            conn=conn,
        )
    else:
        recipe_row = get_recipe_by_name(conn, recipe_name)
        if not recipe_row:
            raise ValueError(f"Recette '{recipe_name}' non trouvée en base.")
        recipe_dict = row_to_dict(recipe_row)
        food_id   = None
        recipe_id = recipe_dict["id"]

        # Pour une portion de recette: unit=portion → quantity_g = qty * weight_per_portion
        if original_unit.lower() in ("portion", "portion(s)"):
            portions      = float(recipe_dict.get("portions", 1) or 1)
            total_weight = float(recipe_dict.get("total_weight_g", 0) or 1)
            weight_per_port = total_weight / portions
            quantity_g = original_qty * weight_per_port
        else:
            quantity_g = unit_to_grams(original_qty, original_unit)

    if quantity_g <= 0:
        raise ValueError(f"Quantité final doit être > 0 (reuq={quantity_g})")

    cursor = conn.execute(
        """
        INSERT INTO meal_log
            (date_, period, food_id, recipe_id, quantity_g,
             original_unit, original_qty, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (date_norm, period_norm, food_id, recipe_id,
         round(quantity_g, 1), original_unit, original_qty, notes or "")
    )
    return cursor.lastrowid


def log_entries_batch(
    conn: sqlite3.Connection,
    entries: list[dict],
) -> list[tuple[bool, str]]:
    """
    Insert plusieurs entrées, une par une.
    Returns: list[(success: bool, message: str)]
    """
    results = []
    for entry in entries:
        try:
            conn.execute("BEGIN")
            eid = log_entry(conn, **entry)
            conn.commit()
            results.append((True, f"id={eid}"))
        except Exception as ex:
            conn.rollback()
            results.append((False, str(ex)))
    return results


# ─── CLI ───────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Log un repas")
    p.add_argument("--json", type=str, help="JSON list d'entrées")
    p.add_argument("--date",  type=str, default=None, help="Date (YYYY-MM-DD)")
    p.add_argument("--period", type=str, default=None, help="Période")
    p.add_argument("--food",   type=str, default=None, help="Nom aliment")
    p.add_argument("--recipe", type=str, default=None, help="Nom recette")
    p.add_argument("--qty",    type=float, default=1.0, help="Quantité")
    p.add_argument("--unit",   type=str, default="g",   help="Unité")
    p.add_argument("--notes",  type=str, default="",    help="Notes")
    p.add_argument("--dry-run", action="store_true")
    return p


def main():
    parser = build_parser()
    args = parser.parse_args()

    if args.json:
        entries = json.loads(args.json)
    else:
        if not args.date or not args.period:
            print("❌ --date et --period sont requis sans --json")
            sys.exit(1)
        if not args.food and not args.recipe:
            print("❌ --food ou --recipe requis")
            sys.exit(1)
        entries = [{
            "date_str":  args.date,
            "period":    args.period,
            "food_name": args.food,
            "recipe_name": args.recipe,
            "quantity":  args.qty,
            "unit":      args.unit,
            "notes":     args.notes,
        }]

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row

    if args.dry_run:
        print("[DRY RUN] Aucune donnée insérée")
        for e in entries:
            print(f"  {e}")
        conn.close()
        sys.exit(0)

    results = log_entries_batch(conn, entries)
    conn.close()

    ok = sum(1 for r in results if r[0])
    ko = len(results) - ok
    print(f"✅ {ok} entrées loggées, {ko} échecs")
    for success, msg in results:
        if not success:
            print(f"  ❌ {msg}")

    sys.exit(0 if ko == 0 else 1)


if __name__ == "__main__":
    main()

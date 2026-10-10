#!/usr/bin/env python3
"""
Sweep défensif sur meal_log.portions_count.

Garantit que portions_count est toujours un nombre réel (ou NULL) en base.
Bug historique (2026-10-10) : une chaîne 'idem 6 oct' avait été insérée via
INSERT direct Node, ce qui faisait dériver la requête SQL du dashboard
(`COALESCE(ml.portions_count, ...)` retourne la string, qui se propageait
dans tous les SUM -> kcal_in délirant).

Règle de conversion :
  - REAL/INTEGER : noop
  - Chaîne convertible ("1.0", "0.5", "2") : float()
  - Chaîne non-numérique ("idem 6 oct", "même chose", etc.) : NULL
    (le fallback `quantity_g / weight_per_portion` prend le relais dans la SQL)

Usage :
  python3 sweep_portions_count.py          # dry-run, affiche seulement
  python3 sweep_portions_count.py --apply  # applique les fixes
"""
import argparse
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent / "nutrition.db"


def sweep(conn: sqlite3.Connection) -> tuple[int, int, list[tuple]]:
    """Returns (nb_fixed, nb_already_clean, fixes_list)."""
    cur = conn.cursor()
    cur.execute(
        "SELECT id, portions_count, typeof(portions_count) FROM meal_log"
    )
    fixed, already_clean = 0, 0
    fixes: list[tuple] = []
    for mid, val, t in cur.fetchall():
        if val is None or t in ("real", "integer"):
            already_clean += 1
            continue
        try:
            new_val = float(val)
            fixes.append((new_val, mid))
        except (ValueError, TypeError):
            fixes.append((None, mid))
        fixed += 1
    return fixed, already_clean, fixes


def apply_fixes(conn: sqlite3.Connection, fixes: list[tuple]) -> None:
    cur = conn.cursor()
    for new_val, mid in fixes:
        if new_val is None:
            cur.execute(
                "UPDATE meal_log SET portions_count = NULL WHERE id = ?", (mid,)
            )
        else:
            cur.execute(
                "UPDATE meal_log SET portions_count = ? WHERE id = ?", (new_val, mid)
            )
    conn.commit()


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("--apply", action="store_true", help="Applique les fixes en base")
    args = p.parse_args()

    conn = sqlite3.connect(DB_PATH)
    try:
        fixed, clean, fixes = sweep(conn)  # type: ignore[misc]
    finally:
        conn.close()

    print(f"Déjà propres : {clean}")
    print(f"À corriger   : {fixed}")
    if fixes:
        for new_val, mid in fixes:
            label = "NULL" if new_val is None else str(new_val)
            print(f"  id={mid} -> {label}")
    if fixed and not args.apply:
        print("\nMode dry-run. Relance avec --apply pour écrire.")
    elif fixed and args.apply:
        conn = sqlite3.connect(DB_PATH)
        try:
            apply_fixes(conn, fixes)
        finally:
            conn.close()
        print(f"\n{fixed} ligne(s) corrigée(s) en base.")


if __name__ == "__main__":
    main()

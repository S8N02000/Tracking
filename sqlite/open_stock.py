#!/usr/bin/env python3
"""Ouvre un nouveau stock pour un aliment (food_id)."""
import sqlite3
import sys
from datetime import date

DB_PATH = "/data/nutrition/sqlite/nutrition.db"

if len(sys.argv) < 3:
    print("Usage: python3 open_stock.py <food_id> <quantite_g> [notes]")
    sys.exit(1)

food_id = int(sys.argv[1])
qty = float(sys.argv[2])
notes = sys.argv[3] if len(sys.argv) > 3 else ""
today = date.today().isoformat()

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

food = conn.execute("SELECT name FROM foods WHERE id=?", (food_id,)).fetchone()
if not food:
    print(f"food_id={food_id} non trouvé")
    sys.exit(1)

# Vérifier qu'aucun stock ouvert n'existe déjà
existing = conn.execute(
    "SELECT id FROM stocks WHERE food_id=? AND closed_at IS NULL", (food_id,)
).fetchone()
if existing:
    print(f"ATTENTION: un stock ouvert existe déjà pour {food['name']} (id={existing[0]})")
    print("Clôture-le d'abord avec: python3 close_stock.py", food_id)
    sys.exit(1)

conn.execute(
    "INSERT INTO stocks (food_id, opened_at, initial_quantity_g, notes) VALUES (?, ?, ?, ?)",
    (food_id, today, qty, notes)
)
conn.commit()

stock = conn.execute("SELECT * FROM stocks WHERE food_id=? AND closed_at IS NULL", (food_id,)).fetchone()
print(f"✅ Stock ouvert: {food['name']} — {qty:.0f}g — {today}")
print(f"   stock_id={stock['id']}")
print()
print("Pour voir l'état : python3 get_stock.py", food_id)
print("Pour clôturer   : python3 close_stock.py", food_id)

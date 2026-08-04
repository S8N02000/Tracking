#!/usr/bin/env python3
"""Clôt un stock ouvert (food_id donné). Calcule la consommation réelle et vérifie."""
import sqlite3
import sys
from datetime import date

DB_PATH = "/data/nutrition/sqlite/nutrition.db"

if len(sys.argv) < 2:
    print("Usage: python3 close_stock.py <food_id>")
    sys.exit(1)

food_id = int(sys.argv[1])
today = date.today().isoformat()

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

stock = conn.execute(
    "SELECT * FROM stocks WHERE food_id=? AND closed_at IS NULL", (food_id,)
).fetchone()

if not stock:
    print(f"Aucun stock ouvert pour food_id={food_id}")
    sys.exit(1)

food = conn.execute("SELECT name FROM foods WHERE id=?", (food_id,)).fetchone()
print(f"Clôture: {food['name']} (food_id={food_id})")
print(f"  Ouvert le : {stock['opened_at']}")
print(f"  Quantité initiale : {stock['initial_quantity_g']:.0f}g")

consumed = conn.execute("""
    SELECT COALESCE(SUM(ml.quantity_g), 0)
    FROM meal_log ml
    WHERE ml.food_id = ? AND ml.date_ >= ?
""", (food_id, stock["opened_at"])).fetchone()[0]

print(f"  Total consommé : {consumed:.0f}g")
print(f"  Jours ouverts  : {(date.today() - date.fromisoformat(stock['opened_at'])).days + 1}")
if consumed > 0:
    days = (date.today() - date.fromisoformat(stock['opened_at'])).days + 1
    print(f"  Moyenne/jour  : {consumed / days:.0f}g")

# Clôturer
conn.execute("UPDATE stocks SET closed_at=? WHERE id=?", (today, stock["id"]))
conn.commit()
print(f"  → Clôturé au {today}")

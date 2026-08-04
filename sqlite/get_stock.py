#!/usr/bin/env python3
"""Affiche l'état des stocks ouverts."""
import sqlite3
import sys
from datetime import date

DB_PATH = "/data/nutrition/sqlite/nutrition.db"

def get_stocks(food_id=None, open_only=True):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    q = "SELECT s.*, f.name FROM stocks s JOIN foods f ON f.id=s.food_id"
    wheres = []
    if food_id:
        wheres.append(f"s.food_id={food_id}")
    if open_only:
        wheres.append("s.closed_at IS NULL")
    if wheres:
        q += " WHERE " + " AND ".join(wheres)
    return conn.execute(q).fetchall()

def stock_status(stock):
    opened = date.fromisoformat(stock["opened_at"])
    days_open = (date.today() - opened).days + 1
    food_id = stock["food_id"]
    food_name = stock["name"]
    initial = stock["initial_quantity_g"]

    # Consommation depuis ouverture (via meal_log)
    conn = sqlite3.connect(DB_PATH)
    consumed = conn.execute("""
        SELECT COALESCE(SUM(ml.quantity_g), 0)
        FROM meal_log ml
        WHERE ml.food_id = ?
          AND ml.date_ >= ?
    """, (food_id, stock["opened_at"])).fetchone()[0]

    remaining = initial - consumed

    print(f"  {food_name}")
    print(f"    Ouvert le    : {opened} (jour {days_open})")
    print(f"    Quantité ini : {initial:.0f}g")
    print(f"    Consommé     : {consumed:.0f}g")
    print(f"    Restant est. : {max(remaining, 0):.0f}g")
    if remaining > 0 and days_open > 0:
        avg_per_day = consumed / days_open
        print(f"    Moyenne/jour : {avg_per_day:.0f}g ({days_open} jours écoulés)")
        days_left = remaining / avg_per_day if avg_per_day > 0 else float('inf')
        print(f"    Jours restants estimés : {days_left:.0f}")
    return remaining

if __name__ == "__main__":
    food_id = int(sys.argv[1]) if len(sys.argv) > 1 else None
    stocks = get_stocks(food_id=food_id, open_only=True)
    if not stocks:
        print("Aucun stock ouvert.")
    else:
        for s in stocks:
            stock_status(s)

import sqlite3
from datetime import datetime

conn = sqlite3.connect('nutrition.db')
conn.row_factory = None

# Traybake id=5, 6 portions, total 3500g → 1 portion = 583.33g
portion_g = 3500.0 / 6  # = 583.33g

conn.execute("""
INSERT INTO meal_log (date_, period, food_id, recipe_id, quantity_g, original_unit, original_qty, logged_at)
VALUES (?, ?, NULL, ?, ?, ?, ?, ?)
""", ('2026-08-17', 'diner', 5, portion_g, 'portion', 1, datetime.now()))

conn.commit()
print('Traybake logged:', portion_g, 'g')

# Skyr 4 cas = 4 * 50g = 200g
conn.execute("""
INSERT INTO meal_log (date_, period, food_id, recipe_id, quantity_g, original_unit, original_qty, logged_at)
VALUES (?, ?, ?, NULL, ?, ?, ?, ?)
""", ('2026-08-17', 'diner', 24, 200.0, 'g', 4, datetime.now()))

conn.commit()
print('Skyr logged: 200g')

# Banane
conn.execute("""
INSERT INTO meal_log (date_, period, food_id, recipe_id, quantity_g, original_unit, original_qty, logged_at)
VALUES (?, ?, ?, NULL, ?, ?, ?, ?)
""", ('2026-08-17', 'diner', 2, 120.0, 'g', 1, datetime.now()))

conn.commit()
print('Banane logged: 120g')

# Verify
rows = conn.execute("SELECT period, f.name, ml.quantity_g, ml.original_unit FROM meal_log ml JOIN foods f ON f.id = ml.food_id WHERE ml.date_ = '2026-08-17' ORDER BY ml.id").fetchall()
print('\nRepas 17/08:')
for r in rows: print(' ', r)

conn.close()

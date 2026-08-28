import sqlite3
conn = sqlite3.connect('nutrition.db')
conn.row_factory = None
rows = conn.execute("SELECT ml.period, f.name, ml.quantity_g, ml.original_unit FROM meal_log ml JOIN foods f ON f.id = ml.food_id WHERE ml.date_ = '2026-08-17' ORDER BY ml.id").fetchall()
for r in rows: print(r)
conn.close()

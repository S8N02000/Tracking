import sqlite3
conn = sqlite3.connect('nutrition.db')
conn.row_factory = None
rows = conn.execute("SELECT id, date_, period, food_id, recipe_id, quantity_g, original_unit FROM meal_log WHERE date_ = '2026-08-17' ORDER BY id").fetchall()
print('All entries 17/08:')
for r in rows: print(' ', r)
conn.close()

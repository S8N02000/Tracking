import sqlite3
conn = sqlite3.connect('nutrition.db')
conn.row_factory = None
r = conn.execute("SELECT id, name, energy_kcal_100g, category FROM foods WHERE LOWER(name) LIKE '%salade%' AND LOWER(name) LIKE '%saumon%'").fetchall()
print(r)
conn.close()

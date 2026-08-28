import sqlite3
from datetime import datetime

conn = sqlite3.connect('nutrition.db')
conn.row_factory = None

# 48 columns: id, name, brand, category, weight_per_unit_g, default_unit, density_g_ml,
# energy_kcal_100g, proteins_g_100g, carbohydrates_g_100g, sugars_g_100g,
# fiber_g_100g, fat_g_100g, saturated_fat_g_100g, trans_fat_g_100g,
# omega3_g_100g, omega6_g_100g, omega9_g_100g, salt_g_100g, sodium_mg_100g,
# cholesterol_mg_100g, calcium_mg_100g, iron_mg_100g, magnesium_mg_100g,
# potassium_mg_100g, zinc_mg_100g, phosphorus_mg_100g, manganese_mg_100g,
# copper_mg_100g, selenium_mg_100g, iodine_mg_100g,
# vit_a_mcg_100g, vit_b1_mg_100g, vit_b2_mg_100g, vit_b3_mg_100g, vit_b5_mg_100g,
# vit_b6_mg_100g, vit_b9_mcg_100g, vit_b12_mcg_100g, vit_c_mg_100g,
# vit_d_mcg_100g, vit_e_mg_100g, vit_k_mcg_100g,
# source, notes, is_active, created_at, updated_at
#
# Values: name, brand, category, weight, unit, density,
# energy, proteins, carbs, sugars, fiber, fat, sat, trans,
# omega3, omega6, omega9, salt, sodium, cholesterol,
# Ca, Fe, Mg, K, Zn, P, Mn, Cu, Se, I,
# vitA, vitB1, vitB2, vitB3, vitB5, vitB6, vitB9, vitB12, vitC, vitD, vitE, vitK,
# source, notes, is_active, created_at, updated_at

conn.execute("""
INSERT INTO foods (name, brand, category, weight_per_unit_g, default_unit, density_g_ml,
    energy_kcal_100g, proteins_g_100g, carbohydrates_g_100g, sugars_g_100g,
    fiber_g_100g, fat_g_100g, saturated_fat_g_100g, trans_fat_g_100g,
    omega3_g_100g, omega6_g_100g, omega9_g_100g, salt_g_100g, sodium_mg_100g,
    cholesterol_mg_100g, calcium_mg_100g, iron_mg_100g, magnesium_mg_100g,
    potassium_mg_100g, zinc_mg_100g, phosphorus_mg_100g, manganese_mg_100g,
    copper_mg_100g, selenium_mg_100g, iodine_mg_100g,
    vit_a_mcg_100g, vit_b1_mg_100g, vit_b2_mg_100g, vit_b3_mg_100g, vit_b5_mg_100g,
    vit_b6_mg_100g, vit_b9_mcg_100g, vit_b12_mcg_100g, vit_c_mg_100g,
    vit_d_mcg_100g, vit_e_mg_100g, vit_k_mcg_100g,
    source, notes, is_active, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (
    'Yanga Sports Water Fruits Rouges', 'Yanga', 'boisson', 500, 'ml', 1.0,
    0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0.12, 0, 1.8, 0.68, 0.16, 0, 0, 0, 0, 0, 0,
    'label', '500ml: 3kcal, B1=0.6mg, B3=9mg, B5=3.4mg, B6=0.8mg, cafeine=106mg',
    1, datetime.now(), datetime.now()
))

conn.commit()

r = conn.execute("SELECT id, name, energy_kcal_100g FROM foods WHERE name LIKE '%Yanga%'").fetchall()
print('Yanga ajoute:', r)
conn.close()

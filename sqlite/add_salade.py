#!/usr/bin/env python3
"""Ajoute la recette Salade Riz Thon Avocat et ses ingredients en base."""
import sqlite3, datetime
conn = sqlite3.connect('nutrition.db')
conn.execute("PRAGMA foreign_keys = ON")
now = datetime.datetime.now().isoformat()

def add_food(name, kcal, prot, carb, sugar, fib, fat, ags, o3, o6, o9,
             salt, ca, fe, mg, k, zn, p, va, b1, b2, b3, b5, b6, b9, b12,
             vc, vd, ve, se, category="autre", wpu=100):
    cols = ("name,category,weight_per_unit_g,default_unit,density_g_ml,"
            "energy_kcal_100g,proteins_g_100g,carbohydrates_g_100g,"
            "sugars_g_100g,fiber_g_100g,fat_g_100g,saturated_fat_g_100g,"
            "omega3_g_100g,omega6_g_100g,omega9_g_100g,"
            "salt_g_100g,calcium_mg_100g,iron_mg_100g,magnesium_mg_100g,"
            "potassium_mg_100g,zinc_mg_100g,phosphorus_mg_100g,"
            "vit_a_mcg_100g,vit_b1_mg_100g,vit_b2_mg_100g,vit_b3_mg_100g,"
            "vit_b5_mg_100g,vit_b6_mg_100g,vit_b9_mcg_100g,vit_b12_mcg_100g,"
            "vit_c_mg_100g,vit_d_mcg_100g,vit_e_mg_100g,selenium_mg_100g,"
            "source,notes,is_active,created_at,updated_at")
    n = len(cols.split(','))
    vals = (name,category,wpu,"unit",1.0,
            kcal,prot,carb,sugar,fib,fat,ags,o3,o6,o9,
            salt,ca,fe,mg,k,zn,p,va,b1,b2,b3,b5,b6,b9,b12,vc,vd,ve,se,
            "ciqual","",1,now,now)
    assert len(vals) == n, f"{name}: {len(vals)} vals vs {n} cols"
    placeholders = ','.join(['?']*n)
    sql = f"INSERT OR IGNORE INTO foods ({cols}) VALUES ({placeholders})"
    conn.execute(sql, vals)
    fid = conn.execute("SELECT id FROM foods WHERE name=?", (name,)).fetchone()[0]
    print(f"  + {name} (id={fid})")
    return fid

# Ajouter ingredients
fids = {}
fids['riz'] = add_food("Riz complet cru",    352,7.5,77.0,1.0,4.5, 2.0,0.4,0.1,0.7,0.0, 0.02,15,2.0,130,300,2.0,280, 0,0.4,0.1,4.0,1.5,0.6,30,0, 0,0,2.0,5)
fids['thon'] = add_food("Thon au naturel",    115,26.0,0.5,0.0,0.0, 0.8,0.2,0.3,0.1,0.0, 0.35,18,1.5,42,300,0.6,270, 0,0.1,0.2,15.0,0.3,0.5,2,2.5, 0,0,1.5,50)
fids['avocat'] = add_food("Avocat cru",        160,2.0,9.0,0.5,7.0, 15.0,2.2,0.2,1.2,11.0, 0.01,13,0.6,30,500,0.3,52, 5,0.1,0.2,1.8,0.3,0.3,89,0, 12,0,2.0,2)
fids['concombre'] = add_food("Concombre cru",   13,0.6,2.0,1.0,0.7, 0.1,0.0,0.0,0.0,0.0, 0.01,15,0.3,12,140,0.2,22, 0,0.03,0.04,0.3,0.3,0.04,20,0, 3,0,0.03,0.1)
fids['radis'] = add_food("Radis rond rouge",   14,0.8,2.5,1.5,1.6, 0.1,0.0,0.0,0.0,0.0, 0.06,35,0.3,12,230,0.2,25, 0,0.01,0.06,0.2,0.1,0.1,40,0, 25,0,0.1,0.5)
fids['poivron'] = add_food("Poivron rouge cru", 30,1.0,6.0,4.0,2.0, 0.3,0.0,0.0,0.0,0.0, 0.004,7,0.5,12,200,0.3,26, 100,0.07,0.08,1.0,0.3,0.3,40,0, 150,0,0.4,0.1)
fids['ciboulette'] = add_food("Ciboulette fresca",30,3.0,4.0,1.5,2.5, 0.6,0.1,0.1,0.0,0.0, 0.01,75,1.5,50,250,0.5,60, 50,0.08,0.12,0.8,0.3,0.14,110,0, 33,0,0.6,0.6)
fids['juscitron'] = add_food("Jus citron frais", 25,0.3,8.0,2.5,0.5, 0.2,0.0,0.0,0.0,0.0, 0.01,10,0.1,8,130,0.1,12, 5,0.03,0.01,0.1,0.1,0.05,5,0, 50,0,0.1,0.1)

# Existing: huile olive id=13, sauce soja id=23, jus_citron id=14
huile_id = conn.execute("SELECT id FROM foods WHERE name='huile olive'").fetchone()[0]
soja_id = conn.execute("SELECT id FROM foods WHERE name='sauce_soja'").fetchone()[0]
print(f"\n  Existing: huile olive id={huile_id}, sauce_soja id={soja_id}")

conn.commit()

# Inserer la recette
conn.execute('''
    INSERT INTO recipes
        (name, description, portions, total_weight_g, is_active, source,
         energy_kcal_per_portion, proteins_g_per_portion, carbohydrates_g_per_portion,
         sugars_g_per_portion, fiber_g_per_portion, fat_g_per_portion,
         saturated_fat_g_per_portion, salt_g_per_portion,
         calcium_mg_per_portion, iron_mg_per_portion, magnesium_mg_per_portion,
         potassium_mg_per_portion, zinc_mg_per_portion, phosphorus_mg_per_portion,
         vit_a_mcg_per_portion, vit_c_mg_per_portion, vit_d_mcg_per_portion,
         vit_b12_mcg_per_portion, vit_e_mg_per_portion,
         vit_b1_mg_per_portion, vit_b2_mg_per_portion, vit_b3_mg_per_portion,
         vit_b5_mg_per_portion, vit_b6_mg_per_portion, vit_b9_mcg_per_portion)
    VALUES (?,?,3,1695,1,"user_provided",
            520,42.5,43.0,4.5,9.3,26.5,3.8,0.65,
            65,2.5,78,860,1.5,280,
            50,70,0.0,3.2,3.8,
            0.4,0.5,16.0,0.8,0.7,92)
''', ("Salade Riz Thon Avocat", "Salade riz complet thon avocat legumes croquants (froid). Prep: dimanche pour lundi/mardi/mercredi (3 portions). Ingredients: riz complet 150g, thon naturel 450g, concombre 400g, radis 150g, poivron rouge 150g, avocat 220g, ciboulette 15g, huile olive 3cas, jus citron 2cas, sauce soja 2cas, ail 1cac, poivre 1/2cac."))
conn.commit()
recipe_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
print(f"\nRecette creee: id={recipe_id}")

# Ingredients pour 1 portion (1/3 de la recette)
ri_rows = [
    (recipe_id, fids['riz'],       50.0),   # riz complet 50g
    (recipe_id, fids['thon'],      150.0),  # thon 150g
    (recipe_id, fids['avocat'],    73.3),   # avocat ~73g
    (recipe_id, fids['concombre'], 133.3),  # concombre
    (recipe_id, fids['radis'],     50.0),   # radis
    (recipe_id, fids['poivron'],   50.0),   # poivron
    (recipe_id, fids['ciboulette'], 5.0),   # ciboulette
    (recipe_id, huile_id,          45.0),   # huile olive (~3cs)
    (recipe_id, fids['juscitron'], 30.0),   # jus citron
    (recipe_id, soja_id,            30.0),  # sauce soja
]
for ri in ri_rows:
    conn.execute(
        "INSERT INTO recipe_ingredients (recipe_id, food_id, quantity_g) VALUES (?,?,?)",
        ri)
conn.commit()

print("\nRecettes:")
for r in conn.execute(
    "SELECT id, name, portions, energy_kcal_per_portion, proteins_g_per_portion, fat_g_per_portion "
    "FROM recipes WHERE is_active=1 ORDER BY id").fetchall():
    print(f"  id={r[0]} | {r[1]} | {r[2]} portions | {r[3]} kcal | {r[4]}g P | {r[5]}g L")

conn.close()
print("\nDone.")

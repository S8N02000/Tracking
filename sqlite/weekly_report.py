import sqlite3

days = ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09"]
n = 7

def get_macros(date):
    conn2 = sqlite3.connect('nutrition.db')
    conn2.row_factory = sqlite3.Row
    r = conn2.execute('''
      SELECT 
        COALESCE(SUM(CASE WHEN ml.food_id IS NOT NULL THEN ml.quantity_g/100.0*f.energy_kcal_100g
                          WHEN ml.recipe_id IS NOT NULL THEN ml.original_qty*rec.energy_kcal_per_portion END), 0) as kcal,
        COALESCE(SUM(CASE WHEN ml.food_id IS NOT NULL THEN ml.quantity_g/100.0*f.proteins_g_100g
                          WHEN ml.recipe_id IS NOT NULL THEN ml.original_qty*rec.proteins_g_per_portion END), 0) as P,
        COALESCE(SUM(CASE WHEN ml.food_id IS NOT NULL THEN ml.quantity_g/100.0*f.carbohydrates_g_100g
                          WHEN ml.recipe_id IS NOT NULL THEN ml.original_qty*rec.carbohydrates_g_per_portion END), 0) as G,
        COALESCE(SUM(CASE WHEN ml.food_id IS NOT NULL THEN ml.quantity_g/100.0*f.fat_g_100g
                          WHEN ml.recipe_id IS NOT NULL THEN ml.original_qty*rec.fat_g_per_portion END), 0) as L,
        COALESCE(SUM(CASE WHEN ml.food_id IS NOT NULL THEN ml.quantity_g/100.0*f.fiber_g_100g
                          WHEN ml.recipe_id IS NOT NULL THEN ml.original_qty*rec.fiber_g_per_portion END), 0) as fib
      FROM meal_log ml
      LEFT JOIN foods f ON f.id = ml.food_id
      LEFT JOIN recipes rec ON rec.id = ml.recipe_id
      WHERE ml.date_ = ?
    ''', (date,)).fetchone()
    sport = conn2.execute("SELECT COALESCE(SUM(kcal_burned),0) FROM sport_log WHERE date_=?", (date,)).fetchone()[0]
    conn2.close()
    return {k: r[k] for k in ['kcal','P','G','L','fib']}, sport

def get_nutrients(date):
    conn2 = sqlite3.connect('nutrition.db')
    conn2.row_factory = sqlite3.Row

    # Foods only
    food_row = conn2.execute('''
      SELECT
        COALESCE(SUM(ml.quantity_g/100.0*fd.calcium_mg_100g),0) as Ca,
        COALESCE(SUM(ml.quantity_g/100.0*fd.iron_mg_100g),0) as Fe,
        COALESCE(SUM(ml.quantity_g/100.0*fd.magnesium_mg_100g),0) as Mg,
        COALESCE(SUM(ml.quantity_g/100.0*fd.potassium_mg_100g),0) as K,
        COALESCE(SUM(ml.quantity_g/100.0*fd.zinc_mg_100g),0) as Zn,
        COALESCE(SUM(ml.quantity_g/100.0*fd.phosphorus_mg_100g),0) as P_,
        COALESCE(SUM(ml.quantity_g/100.0*fd.vit_a_mcg_100g),0) as A,
        COALESCE(SUM(ml.quantity_g/100.0*fd.vit_b1_mg_100g),0) as B1,
        COALESCE(SUM(ml.quantity_g/100.0*fd.vit_b2_mg_100g),0) as B2,
        COALESCE(SUM(ml.quantity_g/100.0*fd.vit_b3_mg_100g),0) as B3,
        COALESCE(SUM(ml.quantity_g/100.0*fd.vit_b5_mg_100g),0) as B5,
        COALESCE(SUM(ml.quantity_g/100.0*fd.vit_b6_mg_100g),0) as B6,
        COALESCE(SUM(ml.quantity_g/100.0*fd.vit_b9_mcg_100g),0) as B9,
        COALESCE(SUM(ml.quantity_g/100.0*fd.vit_b12_mcg_100g),0) as B12,
        COALESCE(SUM(ml.quantity_g/100.0*fd.vit_c_mg_100g),0) as C,
        COALESCE(SUM(ml.quantity_g/100.0*fd.vit_d_mcg_100g),0) as D,
        COALESCE(SUM(ml.quantity_g/100.0*fd.vit_e_mg_100g),0) as E
      FROM meal_log ml JOIN foods fd ON fd.id = ml.food_id
      WHERE ml.date_=? AND ml.recipe_id IS NULL
    ''', (date,)).fetchone()

    # Recipes
    rec_row = conn2.execute('''
      SELECT
        COALESCE(SUM(ml.original_qty*rec.calcium_mg_per_portion),0) as Ca,
        COALESCE(SUM(ml.original_qty*rec.iron_mg_per_portion),0) as Fe,
        COALESCE(SUM(ml.original_qty*rec.magnesium_mg_per_portion),0) as Mg,
        COALESCE(SUM(ml.original_qty*rec.potassium_mg_per_portion),0) as K,
        COALESCE(SUM(ml.original_qty*rec.zinc_mg_per_portion),0) as Zn,
        COALESCE(SUM(ml.original_qty*rec.phosphorus_mg_per_portion),0) as P_
      FROM meal_log ml JOIN recipes rec ON rec.id=ml.recipe_id
      WHERE ml.date_=?
    ''', (date,)).fetchone()

    conn2.close()

    fdict = dict(food_row) if food_row else {}
    rdict = dict(rec_row) if rec_row else {}
    result = {}
    for k in ['Ca','Fe','Mg','K','Zn','P_','A','B1','B2','B3','B5','B6','B9','B12','C','D','E']:
        result[k] = (fdict.get(k, 0) or 0) + (rdict.get(k, 0) or 0)
    return result

VNR = [('Ca','Calcium','mg',800),('Fe','Fer','mg',14),('Mg','Magnesium','mg',375),
       ('K','Potassium','mg',2000),('Zn','Zinc','mg',10),('P_','Phosphore','mg',700),
       ('A','Vit A','ug',800),('B1','Vit B1','mg',1.1),('B2','Vit B2','mg',1.4),
       ('B3','Vit B3','mg',16),('B5','Vit B5','mg',6),('B6','Vit B6','mg',1.4),
       ('B9','Vit B9','ug',200),('B12','Vit B12','ug',2.5),('C','Vit C','mg',80),
       ('D','Vit D','ug',5),('E','Vit E','mg',12)]

totals = {'kcal':0,'P':0,'G':0,'L':0,'fib':0,'sport_kcal':0}
wk_nutri = {k: 0 for k in ['Ca','Fe','Mg','K','Zn','P_','A','B1','B2','B3','B5','B6','B9','B12','C','D','E']}

print("=" * 60)
print(" RAPPORT HEBDOMADAIRE — 03 au 09 AOÛT 2026 (7 jours)")
print("=" * 60)
print(f"\n{'Jour':<10} {'kcal':>7}  {'Adj':>7}  {'Sport':>7}  {'P':>6}  {'G':>6}  {'L':>6}")
print("-" * 60)
for d in days:
    t, sport = get_macros(d)
    for k in ['kcal','P','G','L','fib']: totals[k] += t[k]
    totals['sport_kcal'] += sport
    adj = t['kcal'] * 1.1
    sport_str = f"{-sport:>6.0f}" if sport else "     0"
    print(f"  {d[5:]:<10} {t['kcal']:>6.0f}  {adj:>6.0f}  {sport_str}  {t['P']:>5.0f}g  {t['G']:>5.0f}g  {t['L']:>5.0f}g")
    if sport:
        sconn = sqlite3.connect('nutrition.db')
        sconn.row_factory = sqlite3.Row
        s = sconn.execute("SELECT sport_type, duration_min FROM sport_log WHERE date_=?", (d,)).fetchone()
        sconn.close()
        print(f"    -> {s['sport_type']} {s['duration_min']}min, {sport}kcal")
    for k in wk_nutri: wk_nutri[k] += get_nutrients(d)[k]

wk = totals
print(f"\n{'-'*60}")
print(f"  {'SEMAINE':<10} {wk['kcal']:>6.0f}  {wk['kcal']*1.1:>6.0f}  {-wk['sport_kcal']:>6.0f}  {wk['P']:>5.0f}g  {wk['G']:>5.0f}g  {wk['L']:>5.0f}g")
print(f"  {'Moy/jour':<10} {wk['kcal']/n:>6.0f}  {wk['kcal']*1.1/n:>6.0f}  {-wk['sport_kcal']/n:>6.0f}  {wk['P']/n:>5.0f}g  {wk['G']/n:>5.0f}g  {wk['L']/n:>5.0f}g")
print(f"  {'Cibles':<10} {2000*n:>6}  {'--':>6}  {'--':>6}  {150*n:>5}g  {200*n:>5}g  {70*n:>5}g")

# TDEE
tdee = 1925 * 1.5  # ~2888
total_tdee = tdee * n
pess = wk['kcal']*1.1 - total_tdee + wk['sport_kcal']*0.9
fat_g = pess / 7700 * 1000

print(f"\n{'='*60}")
print(" ESTIMATION COMPOSITION CORPORELLE")
print(f"{'-'*60}")
print(f"  TDEE: ~{tdee:.0f} kcal/jour (BMR*1.5)")
print(f"  TDEE 7j: ~{total_tdee:.0f} kcal")
print(f"  Apport reel total: {wk['kcal']:.0f} kcal")
print(f"  Sport total: {wk['sport_kcal']:.0f} kcal")
print(f"\n  BILAN (mode pessimiste):")
print(f"    Apport x1.10: {wk['kcal']*1.1:.0f}")
print(f"    Sport x0.90: {wk['sport_kcal']*0.9:.0f}")
print(f"    Depense: {total_tdee:.0f}")
print(f"    BILAN: {pess:+.0f} kcal")
print(f"    -> Gras: {fat_g:+.0f}g ({fat_g/1000:+.3f} kg)")

print(f"\n{'='*60}")
print(" NUTRIMENTS SEMAINE (cumul vs besoinsx7j)")
print(f"{'-'*60}")
for k, label, unit, vnr in VNR:
    v = wk_nutri[k]
    pct = v / (vnr * n) * 100
    ok = 'OK' if pct >= 80 else ('!!' if pct >= 60 else 'XX')
    print(f"  {label:<12} {v:>7.0f}{unit}  VNRx7:{vnr*n:<5.0f}  {pct:>5.0f}%  {ok}")

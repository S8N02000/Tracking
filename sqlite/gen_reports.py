#!/usr/bin/env python3
"""Génère les rapports markdown pour les jours 03, 04, 05 août 2026."""
import sqlite3, os

conn = sqlite3.connect('nutrition.db')
OUT = '/data/nutrition/backup_reports'

def get_meals(date):
    return conn.execute('''
        SELECT ml.id, ml.period,
               COALESCE(f.name, r.name) as food_name,
               ml.quantity_g, ml.original_unit, ml.original_qty,
               ml.food_id, ml.recipe_id,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.energy_kcal_per_portion ELSE COALESCE(f.energy_kcal_100g,0) END as kcal100,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.proteins_g_per_portion ELSE COALESCE(f.proteins_g_100g,0) END as p100,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.carbohydrates_g_per_portion ELSE COALESCE(f.carbohydrates_g_100g,0) END as c100,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.fat_g_per_portion ELSE COALESCE(f.fat_g_100g,0) END as l100,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.fiber_g_per_portion ELSE COALESCE(f.fiber_g_100g,0) END as f100,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.sugars_g_per_portion ELSE COALESCE(f.sugars_g_100g,0) END as s100,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.saturated_fat_g_per_portion ELSE COALESCE(f.saturated_fat_g_100g,0) END as ags100,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.salt_g_per_portion ELSE COALESCE(f.salt_g_100g,0) END as salt100,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_a_mcg_per_portion ELSE COALESCE(f.vit_a_mcg_100g,0) END as va,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_c_mg_per_portion ELSE COALESCE(f.vit_c_mg_100g,0) END as vc,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_d_mcg_per_portion ELSE COALESCE(f.vit_d_mcg_100g,0) END as vd,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_b12_mcg_per_portion ELSE COALESCE(f.vit_b12_mcg_100g,0) END as vb12,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_e_mg_per_portion ELSE COALESCE(f.vit_e_mg_100g,0) END as ve,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_b1_mg_per_portion ELSE COALESCE(f.vit_b1_mg_100g,0) END as vb1,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_b2_mg_per_portion ELSE COALESCE(f.vit_b2_mg_100g,0) END as vb2,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_b3_mg_per_portion ELSE COALESCE(f.vit_b3_mg_100g,0) END as vb3,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_b5_mg_per_portion ELSE COALESCE(f.vit_b5_mg_100g,0) END as vb5,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_b6_mg_per_portion ELSE COALESCE(f.vit_b6_mg_100g,0) END as vb6,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_b9_mcg_per_portion ELSE COALESCE(f.vit_b9_mcg_100g,0) END as vb9,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.calcium_mg_per_portion ELSE COALESCE(f.calcium_mg_100g,0) END as ca,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.iron_mg_per_portion ELSE COALESCE(f.iron_mg_100g,0) END as fe,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.magnesium_mg_per_portion ELSE COALESCE(f.magnesium_mg_100g,0) END as mg,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.potassium_mg_per_portion ELSE COALESCE(f.potassium_mg_100g,0) END as k,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.zinc_mg_per_portion ELSE COALESCE(f.zinc_mg_100g,0) END as zn,
               CASE WHEN ml.recipe_id IS NOT NULL THEN r.phosphorus_mg_per_portion ELSE COALESCE(f.phosphorus_mg_100g,0) END as p,
               CASE WHEN ml.recipe_id IS NOT NULL THEN 0 ELSE COALESCE(f.selenium_mg_100g,0) END as se
        FROM meal_log ml
        LEFT JOIN foods f ON ml.food_id = f.id
        LEFT JOIN recipes r ON ml.recipe_id = r.id
        WHERE ml.date_ = ?
        ORDER BY ml.logged_at
    ''', (date,)).fetchall()

def calc(qty, unit, orig, per100):
    if unit == 'portion':
        return orig * (per100 or 0)
    return qty / 100.0 * (per100 or 0)

def meal_name(name, qty, unit, orig):
    if unit == 'portion':
        return f"{name} ×{orig:.0f}"
    return f"{name} ({qty:.0f}{unit})"

PERIOD_NAMES = {
    'petit_dejeuner': '☀️ PETIT DÉJEUNER',
    'dejeuner': '🌤️ DÉJEUNER',
    'diner': '🌙 DÎNER',
    'collation': '🪵 COLLATION',
}

def compute_day(date):
    rows = get_meals(date)
    totals = {'kcal':0,'prot':0,'carb':0,'fat':0,'fib':0,'sugar':0,'ags':0,'salt':0,
              'va':0,'vc':0,'vd':0,'vb12':0,'ve':0,'vb1':0,'vb2':0,'vb3':0,
              'vb5':0,'vb6':0,'vb9':0,'ca':0,'fe':0,'mg':0,'k':0,'zn':0,'p':0,'se':0}
    periods = {}
    for r in rows:
        _, period, food_name, qty, unit, orig, fid, rid = r[:8]
        kcal100, p100, c100, l100, f100, s100, ags100, salt100 = r[8:16]
        va,vc,vd,vb12,ve,vb1,vb2,vb3,vb5,vb6,vb9,ca,fe,mg,k_mg,zn,p_mg,se = r[16:]
        kcal = calc(qty, unit, orig, kcal100)
        prot = calc(qty, unit, orig, p100)
        carb = calc(qty, unit, orig, c100)
        fat  = calc(qty, unit, orig, l100)
        fib  = calc(qty, unit, orig, f100)
        sugar= calc(qty, unit, orig, s100)
        ags_v= calc(qty, unit, orig, ags100)
        salt_v=calc(qty, unit, orig, salt100)
        va_v = calc(qty, unit, orig, va)
        vc_v = calc(qty, unit, orig, vc)
        vd_v = calc(qty, unit, orig, vd)
        vb12_v=calc(qty, unit, orig, vb12)
        ve_v = calc(qty, unit, orig, ve)
        vb1_v = calc(qty, unit, orig, vb1)
        vb2_v = calc(qty, unit, orig, vb2)
        vb3_v = calc(qty, unit, orig, vb3)
        vb5_v = calc(qty, unit, orig, vb5)
        vb6_v = calc(qty, unit, orig, vb6)
        vb9_v = calc(qty, unit, orig, vb9)
        ca_v  = calc(qty, unit, orig, ca)
        fe_v  = calc(qty, unit, orig, fe)
        mg_v  = calc(qty, unit, orig, mg)
        k_v   = calc(qty, unit, orig, k_mg)
        zn_v  = calc(qty, unit, orig, zn)
        p_v   = calc(qty, unit, orig, p_mg)
        se_v  = calc(qty, unit, orig, se)
        if period not in periods:
            periods[period] = []
        periods[period].append({
            'name': food_name, 'qty': qty, 'unit': unit, 'orig': orig,
            'kcal': kcal, 'prot': prot, 'carb': carb, 'fat': fat, 'fib': fib,
            'sugar': sugar, 'ags': ags_v, 'salt': salt_v,
            'va':va_v,'vc':vc_v,'vd':vd_v,'vb12':vb12_v,'ve':ve_v,
            'vb1':vb1_v,'vb2':vb2_v,'vb3':vb3_v,'vb5':vb5_v,'vb6':vb6_v,'vb9':vb9_v,
            'ca':ca_v,'fe':fe_v,'mg':mg_v,'k':k_v,'zn':zn_v,'p':p_v,'se':se_v,
        })
        for key, val in zip(['kcal','prot','carb','fat','fib','sugar','ags','salt',
                              'va','vc','vd','vb12','ve','vb1','vb2','vb3','vb5','vb6','vb9',
                              'ca','fe','mg','k','zn','p','se'],
                             [kcal,prot,carb,fat,fib,sugar,ags_v,salt_v,
                              va_v,vc_v,vd_v,vb12_v,ve_v,vb1_v,vb2_v,vb3_v,vb5_v,vb6_v,vb9_v,
                              ca_v,fe_v,mg_v,k_v,zn_v,p_v,se_v]):
            totals[key] += val
    return periods, totals

def fmt_period(period_key):
    return PERIOD_NAMES.get(period_key, period_key.upper())

for date in ['2026-08-03', '2026-08-04', '2026-08-05']:
    periods, t = compute_day(date)
    day_str = date[5:].replace('-','/')  # 08/03
    report = f"""# 📊 Rapport nutrition — {day_str}/2026

---

## 🍽️ REPAS DE LA JOURNÉE
"""
    for period_key in ['petit_dejeuner', 'dejeuner', 'diner', 'collation']:
        if period_key not in periods:
            continue
        meals = periods[period_key]
        report += f"\n### {fmt_period(period_key)}\n\n"
        report += "| Aliment | Qté | kcal | P | G | L | Fibres |\n"
        report += "|---|---|---|---|---|---|---|\n"
        sub_kcal = sub_prot = sub_carb = sub_fat = sub_fib = 0
        for m in meals:
            qty_d = f"{m['qty']:.0f}{m['unit']}" if m['unit'] != 'portion' else f"{m['orig']:.0f} portion{'s' if m['orig']>1 else ''}"
            report += f"| {m['name']} | {qty_d} | {m['kcal']:.0f} | {m['prot']:.1f}g | {m['carb']:.1f}g | {m['fat']:.1f}g | {m['fib']:.1f}g |\n"
            sub_kcal += m['kcal']; sub_prot += m['prot']; sub_carb += m['carb']; sub_fat += m['fat']; sub_fib += m['fib']
        report += f"| **Sous-total** | | **{sub_kcal:.0f}** | **{sub_prot:.1f}g** | **{sub_carb:.1f}g** | **{sub_fat:.1f}g** | **{sub_fib:.1f}g** |\n"

    # Calories summary
    target_kcal = 2000
    deficit_kcal = target_kcal - t['kcal']
    surplus_kcal = t['kcal'] - target_kcal
    kcal_status = f"{deficit_kcal:.0f} sous" if deficit_kcal > 0 else f"{surplus_kcal:.0f} au-dessus"
    kcal_arrow = "↓" if deficit_kcal > 0 else "↑"

    report += f"""
---

## 📈 BILAN MACROS — {day_str}/2026

| Nutriment | Cible | Total | Écart |
|---|---:|---:|---:|
| **Énergie** | 2 000 kcal | **{t['kcal']:.0f} kcal** | {kcal_arrow} {abs(deficit_kcal):.0f} kcal |
| **Protéines** | 150g | **{t['prot']:.1f}g** | {'+' if t['prot']>150 else ''}{t['prot']-150:.1f}g |
| **Glucides** | 200g | **{t['carb']:.1f}g** | {'+' if t['carb']>200 else ''}{t['carb']-200:.1f}g |
| **Lipides** | 70g | **{t['fat']:.1f}g** | {'+' if t['fat']>70 else ''}{t['fat']-70:.1f}g |
| Fibres | — | {t['fib']:.1f}g | — |
| Sucres | — | {t['sugar']:.1f}g | — |
| AGS | — | {t['ags']:.1f}g | — |
| Sel | — | {t['salt']:.2f}g | — |

---

## 💊 VITAMINES

| Vitamine | VNR | Apport | % |
|---|---:|---:|---:|
| **A** (rétinol) | 800 µg | {t['va']:.0f} µg | {t['va']/8:.0f}% |
| **C** | 80 mg | {t['vc']:.0f} mg | {t['vc']/0.8:.0f}% |
| **D** | 5 µg | {t['vd']:.1f} µg | {t['vd']/0.05*100:.0f}% |
| **E** | 12 mg | {t['ve']:.1f} mg | {t['ve']/0.12*100:.0f}% |
| **B1** (thiamine) | 1.1 mg | {t['vb1']:.2f} mg | {t['vb1']/0.011*100:.0f}% |
| **B2** (riboflavine) | 1.4 mg | {t['vb2']:.2f} mg | {t['vb2']/0.014*100:.0f}% |
| **B3** (niacine) | 16 mg | {t['vb3']:.1f} mg | {t['vb3']/0.16*100:.0f}% |
| **B5** | 6 mg | {t['vb5']:.1f} mg | {t['vb5']/0.06*100:.0f}% |
| **B6** | 1.4 mg | {t['vb6']:.2f} mg | {t['vb6']/0.014*100:.0f}% |
| **B9** (folates) | 200 µg | {t['vb9']:.0f} µg | {t['vb9']/2:.0f}% |
| **B12** | 2.5 µg | {t['vb12']:.1f} µg | {t['vb12']/0.025*100:.0f}% |

---

## 🪨 MINÉRAUX

| Minéral | VNR | Apport | % |
|---|---:|---:|---:|
| **Calcium** | 800 mg | {t['ca']:.0f} mg | {t['ca']/8:.0f}% |
| **Fer** | 14 mg | {t['fe']:.1f} mg | {t['fe']/0.14*100:.0f}% |
| **Magnésium** | 375 mg | {t['mg']:.0f} mg | {t['mg']/3.75:.0f}% |
| **Potassium** | 2 000 mg | {t['k']:.0f} mg | {t['k']/20:.0f}% |
| **Zinc** | 10 mg | {t['zn']:.1f} mg | {t['zn']/0.1*100:.0f}% |
| **Phosphore** | 700 mg | {t['p']:.0f} mg | {t['p']/7:.0f}% |
| **Sélénium** | 55 µg | {t['se']:.0f} µg | {t['se']/0.55*100:.0f}% |

---

## 🏃 DÉPENSES ÉNERGÉTIQUES — {day_str}/2026

| Activité | Détail | Dépense |
|---|---|---:|
| Pas de données détaillées | — | — |
| **Total dépenses** | | **—** |

> _Note : dépenses non enregistrées pour cette date._

---

*Rapport généré le {date}*
"""
    path = f"{OUT}/{date}_rapport.md"
    with open(path, 'w') as f:
        f.write(report)
    print(f"  → {path}  ({t['kcal']:.0f} kcal ingérées)")

conn.close()
print("\nDone.")

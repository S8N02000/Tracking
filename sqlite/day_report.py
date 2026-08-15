#!/usr/bin/env python3
"""
Rapport nutrition complet sur une plage de dates.
Usage:
  python3 day_report.py 2026-08-03 2026-08-06
  python3 day_report.py --html 2026-08-03 2026-08-06
  python3 day_report.py 2026-08-03 2026-08-06 --output rapport.md
"""
import sqlite3
import argparse
import sys
from datetime import datetime, timedelta

DB = '/data/nutrition/sqlite/nutrition.db'
VNR = {
    'energy_kcal': 2000,
    'proteins_g': 150,
    'carbohydrates_g': 200,
    'fat_g': 70,
    'fiber_g': 30,
    'vit_a_mcg': 800,
    'vit_c_mg': 80,
    'vit_d_mcg': 5,
    'vit_e_mg': 12,
    'vit_b1_mg': 1.1,
    'vit_b2_mg': 1.4,
    'vit_b3_mg': 16,
    'vit_b5_mg': 6,
    'vit_b6_mg': 1.4,
    'vit_b9_mcg': 200,
    'vit_b12_mcg': 2.5,
    'calcium_mg': 800,
    'iron_mg': 14,
    'magnesium_mg': 375,
    'potassium_mg': 2000,
    'zinc_mg': 10,
    'phosphorus_mg': 700,
    'selenium_mcg': 55,
}

FOOD_KEYS = [
    'energy_kcal', 'proteins_g', 'carbohydrates_g', 'fat_g', 'fiber_g',
    'sugars_g', 'saturated_fat_g', 'salt_g',
    'vit_a_mcg', 'vit_c_mg', 'vit_d_mcg', 'vit_b12_mcg', 'vit_e_mg',
    'vit_b1_mg', 'vit_b2_mg', 'vit_b3_mg', 'vit_b5_mg', 'vit_b6_mg', 'vit_b9_mcg',
    'calcium_mg', 'iron_mg', 'magnesium_mg', 'potassium_mg', 'zinc_mg',
    'phosphorus_mg', 'selenium_mcg',
]

PERIOD_ORDER = ['petit_dejeuner', 'dejeuner', 'diner', 'collation']
PERIOD_NAMES = {
    'petit_dejeuner': '☀️ PETIT DÉJEUNER',
    'dejeuner': '🌤️ DÉJEUNER',
    'diner': '🌙 DÎNER',
    'collation': '🪵 COLLATION',
}


def get_db():
    return sqlite3.connect(DB)


def calc_nutrient(qty, unit, orig_qty, per100):
    """Calcule la valeur nutrient pour un entry meal.
    Toujours traiter la valeur comme etant par 100g (per100),
    puisque quantity_g represente toujours les grammes reels.
    """
    if per100 is None:
        per100 = 0
    # quantity_g = grammes reels manges (toujours en grammes)
    return qty / 100.0 * per100


def zero_nutrients():
    return {k: 0.0 for k in FOOD_KEYS}


def get_meals_for_date(conn, date):
    """Retourne la liste des repas pour une date avec nutrients calcules."""
    rows = conn.execute(f'''
        SELECT
            ml.id,
            ml.period,
            COALESCE(f.name, r.name) as food_name,
            ml.quantity_g,
            ml.original_unit,
            ml.original_qty,
            ml.recipe_id,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.energy_kcal_per_portion ELSE COALESCE(f.energy_kcal_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.proteins_g_per_portion ELSE COALESCE(f.proteins_g_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.carbohydrates_g_per_portion ELSE COALESCE(f.carbohydrates_g_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.fat_g_per_portion ELSE COALESCE(f.fat_g_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.fiber_g_per_portion ELSE COALESCE(f.fiber_g_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.sugars_g_per_portion ELSE COALESCE(f.sugars_g_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.saturated_fat_g_per_portion ELSE COALESCE(f.saturated_fat_g_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.salt_g_per_portion ELSE COALESCE(f.salt_g_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_a_mcg_per_portion ELSE COALESCE(f.vit_a_mcg_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_c_mg_per_portion ELSE COALESCE(f.vit_c_mg_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_d_mcg_per_portion ELSE COALESCE(f.vit_d_mcg_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_b12_mcg_per_portion ELSE COALESCE(f.vit_b12_mcg_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_e_mg_per_portion ELSE COALESCE(f.vit_e_mg_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_b1_mg_per_portion ELSE COALESCE(f.vit_b1_mg_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_b2_mg_per_portion ELSE COALESCE(f.vit_b2_mg_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_b3_mg_per_portion ELSE COALESCE(f.vit_b3_mg_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_b5_mg_per_portion ELSE COALESCE(f.vit_b5_mg_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_b6_mg_per_portion ELSE COALESCE(f.vit_b6_mg_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.vit_b9_mcg_per_portion ELSE COALESCE(f.vit_b9_mcg_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.calcium_mg_per_portion ELSE COALESCE(f.calcium_mg_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.iron_mg_per_portion ELSE COALESCE(f.iron_mg_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.magnesium_mg_per_portion ELSE COALESCE(f.magnesium_mg_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.potassium_mg_per_portion ELSE COALESCE(f.potassium_mg_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.zinc_mg_per_portion ELSE COALESCE(f.zinc_mg_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN r.phosphorus_mg_per_portion ELSE COALESCE(f.phosphorus_mg_100g,0) END,
            CASE WHEN ml.recipe_id IS NOT NULL THEN 0 ELSE COALESCE(f.selenium_mg_100g,0) END
        FROM meal_log ml
        LEFT JOIN foods f ON ml.food_id = f.id
        LEFT JOIN recipes r ON ml.recipe_id = r.id
        WHERE ml.date_ = ?
        ORDER BY ml.logged_at
    ''', (date,)).fetchall()

    meals = []
    for r in rows:
        _, period, food_name, qty, unit, orig, rid = r[0], r[1], r[2], r[3], r[4], r[5], r[6]
        vals = r[7:]
        n = zero_nutrients()
        n['energy_kcal'] = calc_nutrient(qty, unit, orig, vals[0])
        n['proteins_g'] = calc_nutrient(qty, unit, orig, vals[1])
        n['carbohydrates_g'] = calc_nutrient(qty, unit, orig, vals[2])
        n['fat_g'] = calc_nutrient(qty, unit, orig, vals[3])
        n['fiber_g'] = calc_nutrient(qty, unit, orig, vals[4])
        n['sugars_g'] = calc_nutrient(qty, unit, orig, vals[5])
        n['saturated_fat_g'] = calc_nutrient(qty, unit, orig, vals[6])
        n['salt_g'] = calc_nutrient(qty, unit, orig, vals[7])
        n['vit_a_mcg'] = calc_nutrient(qty, unit, orig, vals[8])
        n['vit_c_mg'] = calc_nutrient(qty, unit, orig, vals[9])
        n['vit_d_mcg'] = calc_nutrient(qty, unit, orig, vals[10])
        n['vit_b12_mcg'] = calc_nutrient(qty, unit, orig, vals[11])
        n['vit_e_mg'] = calc_nutrient(qty, unit, orig, vals[12])
        n['vit_b1_mg'] = calc_nutrient(qty, unit, orig, vals[13])
        n['vit_b2_mg'] = calc_nutrient(qty, unit, orig, vals[14])
        n['vit_b3_mg'] = calc_nutrient(qty, unit, orig, vals[15])
        n['vit_b5_mg'] = calc_nutrient(qty, unit, orig, vals[16])
        n['vit_b6_mg'] = calc_nutrient(qty, unit, orig, vals[17])
        n['vit_b9_mcg'] = calc_nutrient(qty, unit, orig, vals[18])
        n['calcium_mg'] = calc_nutrient(qty, unit, orig, vals[19])
        n['iron_mg'] = calc_nutrient(qty, unit, orig, vals[20])
        n['magnesium_mg'] = calc_nutrient(qty, unit, orig, vals[21])
        n['potassium_mg'] = calc_nutrient(qty, unit, orig, vals[22])
        n['zinc_mg'] = calc_nutrient(qty, unit, orig, vals[23])
        n['phosphorus_mg'] = calc_nutrient(qty, unit, orig, vals[24])
        n['selenium_mcg'] = calc_nutrient(qty, unit, orig, vals[25])

        if unit == 'portion':
            # Montre: "350g (1 portion)" ou "700g (2 portions)" si orig > 1
            qty_str = f"{qty:.0f}g ({orig:.0f} portion{'s' if orig > 1 else ''})"
        else:
            qty_str = f"{qty:.0f}{unit}"

        meals.append({
            'period': period,
            'name': food_name,
            'qty_str': qty_str,
            'qty_g': qty,
            'nutrients': n,
        })
    return meals


def get_sport_for_date(conn, date):
    row = conn.execute('SELECT * FROM sport_log WHERE date_ = ?', (date,)).fetchone()
    if not row:
        return None
    cols = [c[1] for c in conn.execute('PRAGMA table_info(sport_log)').fetchall()]
    return dict(zip(cols, row))


def date_range(start, end):
    """Genere toutes les dates de start a end inclus."""
    d = datetime.strptime(start, '%Y-%m-%d')
    end_d = datetime.strptime(end, '%Y-%m-%d')
    dates = []
    while d <= end_d:
        dates.append(d.strftime('%Y-%m-%d'))
        d += timedelta(days=1)
    return dates


def fmt_kcal_n(v):
    return f"{v:.0f}"


def pct(v, vnr):
    if not vnr or vnr == 0:
        return '—'
    return f"{v/vnr*100:.0f}%"


def fmt_écart(v, vnr):
    if not vnr or vnr == 0:
        return f"{v:+.1f}"
    return f"{v/vnr*100:+.0f}%"


def generate_report(start_date, end_date, conn):
    """Genere le rapport markdown complet."""
    dates = date_range(start_date, end_date)
    day_count = len(dates)

    lines = []
    lines.append(f"# 📊 Rapport nutrition — {start_date[5:].replace('-','/')} au {end_date[5:].replace('-','/')}/2026\n")

    # ─── Résumé par jour ───
    lines.append("## 📅 RÉSUMÉ PAR JOUR\n")
    lines.append("| Date | Ingestées | Sport | Net | Solde vs 2000 |")
    lines.append("|---|---|---|---|---|")

    totals_summary = zero_nutrients()
    totals_summary['sport_kcal'] = 0

    for date in dates:
        meals = get_meals_for_date(conn, date)
        sport = get_sport_for_date(conn, date)

        day_kcal = sum(m['nutrients']['energy_kcal'] for m in meals)
        sport_kcal = sport['kcal_burned'] if sport else 0
        net = day_kcal - sport_kcal
        balance = net - 2000

        sport_str = f"−{sport_kcal}" if sport_kcal else "—"
        date_disp = date[5:].replace('-','/')
        lines.append(f"| **{date_disp}** | {day_kcal:.0f} | {sport_str} | **{net:.0f}** | {balance:+.0f} |")

        for k in FOOD_KEYS:
            totals_summary[k] += sum(m['nutrients'][k] for m in meals)
        totals_summary['sport_kcal'] += sport_kcal

    total_ing = totals_summary['energy_kcal']
    total_sport = totals_summary['sport_kcal']
    total_net = total_ing - total_sport
    avg_kcal = total_ing / day_count if day_count else 0

    lines.append(f"| **TOTAL / Moyenne** | **{total_ing:.0f}** | **−{total_sport}** | **{total_net:.0f}** | **{(total_net/day_count-2000):+.0f}/jour** |")
    lines.append("")

    # ─── Details par jour ───
    for date in dates:
        meals = get_meals_for_date(conn, date)
        sport = get_sport_for_date(conn, date)

        if not meals and not sport:
            continue

        day_str = date[5:].replace('-','/')
        day_kcal = sum(m['nutrients']['energy_kcal'] for m in meals)
        sport_kcal = sport['kcal_burned'] if sport else 0
        net = day_kcal - sport_kcal

        lines.append(f"---\n\n## 📆 {day_str}/2026\n")

        # Depenses
        if sport:
            km = f"{sport['km']} km" if sport.get('km') else ""
            pas = f"{sport['pas']:,} pas" if sport.get('pas') else ""
            km_iphone = f" (iPhone {sport['km_iphone']} km)" if sport.get('km_iphone') else ""
            lines.append(f"**🏃 Sport** : {sport['sport_type'].replace('_',' ').title()} — "
                         f"{sport['duration_min']} min {km} {pas}{km_iphone} → "
                         f"**{sport_kcal} kcal**\n\n")
        else:
            lines.append("**🏃 Sport** : —\n\n")

        # Repas par period
        for period in PERIOD_ORDER:
            period_meals = [m for m in meals if m['period'] == period]
            if not period_meals:
                continue
            lines.append(f"### {PERIOD_NAMES.get(period, period.upper())}\n\n")
            lines.append("| Aliment | Qté | kcal | P | G | L | Fibres | AGS | Sel |")
            lines.append("|---|---|---|---|---|---|---|---|---|")
            sub_k, sub_p, sub_c, sub_l, sub_f, sub_ags, sub_sel = 0,0,0,0,0,0,0
            for m in period_meals:
                n = m['nutrients']
                lines.append(f"| {m['name']} | {m['qty_str']} | "
                             f"{n['energy_kcal']:.0f} | {n['proteins_g']:.1f}g | "
                             f"{n['carbohydrates_g']:.1f}g | {n['fat_g']:.1f}g | "
                             f"{n['fiber_g']:.1f}g | {n['saturated_fat_g']:.1f}g | "
                             f"{n['salt_g']:.2f}g |")
                sub_k += n['energy_kcal']
                sub_p += n['proteins_g']
                sub_c += n['carbohydrates_g']
                sub_l += n['fat_g']
                sub_f += n['fiber_g']
                sub_ags += n['saturated_fat_g']
                sub_sel += n['salt_g']
            lines.append(f"| **Sous-total** | | **{sub_k:.0f}** | **{sub_p:.1f}g** | "
                         f"**{sub_c:.1f}g** | **{sub_l:.1f}g** | **{sub_f:.1f}g** | "
                         f"**{sub_ags:.1f}g** | **{sub_sel:.2f}g** |\n")

        # Bilan calorie jour
        balance = net - 2000
        lines.append(f"**📈 Bilan** : {day_kcal:.0f} kcal ingérées − {sport_kcal} sport = "
                     f"**{net:.0f} kcal net** | {balance:+.0f} vs 2000\n")

    # ─── BILAN GLOBAL SUR LA PÉRIODE ───
    lines.append("\n---\n\n## 📊 BILAN GLOBAL — TOUTE LA PÉRIODE\n")

    # Calories summary
    lines.append("### 🔢 Calories\n")
    lines.append(f"| | kcal |")
    lines.append("|---|---:|")
    lines.append(f"| **Total ingérées** | **{total_ing:.0f}** |")
    lines.append(f"| **Total sport** | **−{total_sport}** |")
    lines.append(f"| **Total net** | **{total_net:.0f}** |")
    lines.append(f"| **Moyenne / jour** | **{avg_kcal:.0f}** |")
    lines.append(f"| **Cible 2000 × {day_count}j** | **{2000*day_count}** |")
    lines.append(f"| **Solde total** | **{total_net - 2000*day_count:+.0f}** |\n")

    # Macros
    macro_keys = ['energy_kcal', 'proteins_g', 'carbohydrates_g', 'fat_g', 'fiber_g', 'sugars_g', 'saturated_fat_g', 'salt_g']
    macro_names = {'energy_kcal':'Énergie','proteins_g':'Protéines','carbohydrates_g':'Glucides',
                   'fat_g':'Lipides','fiber_g':'Fibres','sugars_g':'Sucres','saturated_fat_g':'AGS','salt_g':'Sel'}
    macro_unit = {'energy_kcal':'kcal','proteins_g':'g','carbohydrates_g':'g','fat_g':'g',
                   'fiber_g':'g','sugars_g':'g','saturated_fat_g':'g','salt_g':'g'}
    macro_vnr = VNR

    lines.append("### 🍽️ Macronutriments (total période)\n")
    lines.append("| Nutriment | Cible totale | Total | Écart |")
    lines.append("|---|---|---|---|")
    for k in macro_keys:
        v = totals_summary[k]
        vnr = macro_vnr.get(k, 0) * day_count
        unit = macro_unit[k]
        if k == 'energy_kcal':
            lines.append(f"| **{macro_names[k]}** | {vnr:.0f} kcal | **{v:.0f} kcal** | {v-vnr:+.0f} |")
        else:
            lines.append(f"| **{macro_names[k]}** | {vnr:.0f}{unit} | **{v:.1f}{unit}** | {v-vnr:+.1f}{unit} |")
    lines.append("")

    # Vitamines
    vit_keys = ['vit_a_mcg','vit_c_mg','vit_d_mcg','vit_e_mg',
                'vit_b1_mg','vit_b2_mg','vit_b3_mg','vit_b5_mg','vit_b6_mg','vit_b9_mcg','vit_b12_mcg']
    vit_names = {'vit_a_mcg':'A (rétinol)','vit_c_mg':'C','vit_d_mcg':'D','vit_e_mg':'E',
                 'vit_b1_mg':'B1 (thiamine)','vit_b2_mg':'B2 (riboflavine)','vit_b3_mg':'B3 (niacine)',
                 'vit_b5_mg':'B5','vit_b6_mg':'B6','vit_b9_mcg':'B9 (folates)','vit_b12_mcg':'B12'}
    vit_unit = {k:'µg' if 'mcg' in k else 'mg' for k in vit_keys}

    lines.append("### 💊 Vitamines (total période)\n")
    lines.append("| Vitamine | VNR total | Apport | % VNR |")
    lines.append("|---|---|---|---|")
    for k in vit_keys:
        v = totals_summary[k]
        vnr = VNR.get(k, 0) * day_count
        u = vit_unit[k]
        lines.append(f"| **{vit_names[k]}** | {vnr:.0f}{u} | {v:.1f}{u} | {pct(v, vnr)} |")
    lines.append("")

    # Mineraux
    min_keys = ['calcium_mg','iron_mg','magnesium_mg','potassium_mg','zinc_mg','phosphorus_mg','selenium_mcg']
    min_names = {'calcium_mg':'Calcium','iron_mg':'Fer','magnesium_mg':'Magnésium',
                  'potassium_mg':'Potassium','zinc_mg':'Zinc','phosphorus_mg':'Phosphore','selenium_mcg':'Sélénium'}
    min_unit = {'calcium_mg':'mg','iron_mg':'mg','magnesium_mg':'mg',
                 'potassium_mg':'mg','zinc_mg':'mg','phosphorus_mg':'mg','selenium_mcg':'µg'}

    lines.append("### 🪨 Minéraux (total période)\n")
    lines.append("| Minéral | VNR total | Apport | % VNR |")
    lines.append("|---|---|---|---|")
    for k in min_keys:
        v = totals_summary[k]
        vnr = VNR.get(k, 0) * day_count
        u = min_unit[k]
        flag = " ⚠️" if pct(v, vnr) != '—' and v/vnr*100 < 60 else (" ✅" if pct(v, vnr) != '—' and v/vnr*100 >= 100 else "")
        lines.append(f"| **{min_names[k]}** | {vnr:.0f}{u} | {v:.1f}{u} | {pct(v, vnr)}{flag} |")
    lines.append("")

    lines.append(f"\n*Rapport généré le {datetime.now().strftime('%Y-%m-%d')} — {day_count} jour(s)*\n")
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description='Génère un rapport nutrition complet sur une plage de dates.')
    parser.add_argument('start', help='Date de début (YYYY-MM-DD)')
    parser.add_argument('end', help='Date de fin (YYYY-MM-DD)')
    parser.add_argument('--output', '-o', help='Fichier de sortie (.md)')
    parser.add_argument('--html', action='store_true', help='Sortie HTML')
    args = parser.parse_args()

    conn = get_db()
    report = generate_report(args.start, args.end, conn)
    conn.close()

    if args.output:
        with open(args.output, 'w') as f:
            f.write(report)
        print(f"Rapport écrit → {args.output}")
    else:
        print(report)


if __name__ == '__main__':
    main()

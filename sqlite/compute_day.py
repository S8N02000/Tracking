#!/usr/bin/env python3
"""
compute_day.py
==============
Affiche le bilan nutritionnel complet d'une journée depuis SQLite.

Usage:
    python compute_day.py --date 2026-08-03
    python compute_day.py --date 2026-08-03 --verbose

Requête les vues SQLite v_day_meals et v_day_totals
et affiche un rapport détaillé macros + micronutriments.
"""

import sqlite3
import sys
import argparse
from pathlib import Path
from typing import Optional

BASE = Path(__file__).parent
DB_PATH = BASE / "nutrition.db"

sys.path.insert(0, str(BASE))
from utils import validate_date, row_to_dict

# Cibles par défaut
DEFAULT_TARGETS = dict(
    kcal=2000, proteins_g=150, carbs_g=200, fat_g=70,
    fiber_g=30,
    calcium_mg=1000, iron_mg=11, magnesium_mg=400,
    potassium_mg=4700, zinc_mg=11, phosphorus_mg=700,
    vit_a_mcg=700, vit_b1_mg=1.1, vit_b2_mg=1.3,
    vit_b3_mg=15, vit_b6_mg=1.5, vit_b9_mcg=330,
    vit_b12_mcg=2.4, vit_c_mg=80, vit_d_mcg=15, vit_e_mg=12,
)


def get_day_targets(conn: sqlite3.Connection, date_str: str) -> dict:
    """Récupère les cibles daily_targets ou renvoie les défaut."""
    saved_factory = conn.row_factory
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            "SELECT * FROM daily_targets WHERE date_ = ?", (date_str,)
        ).fetchone()
        if not row:
            return DEFAULT_TARGETS.copy()
        r = row_to_dict(row)
        return {k: r.get(k, v) for k, v in DEFAULT_TARGETS.items()}
    finally:
        conn.row_factory = saved_factory


def get_day_meals(conn: sqlite3.Connection, date_str: str) -> list[dict]:
    """Retourne la liste des repas détaillés."""
    # forcer row_factory pour que row_to_dict fonctionne
    saved_factory = conn.row_factory
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.execute(
            """
            SELECT
                ml.id, ml.date_, ml.period, ml.quantity_g,
                ml.original_unit, ml.original_qty, ml.notes,
                -- Convert quantity to grams: units → weight_per_unit_g, portions → weight_per_portion
                -- quantity_g est déjà en grammes (rebuild fait unit→g via weight_per_unit_g)
                ml.quantity_g AS quantity_g_actual,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN f.name
                    ELSE r.name || ' (portion)'
                END AS food_name,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN f.category
                    ELSE 'plat_prepare'
                END AS category,
                -- Nutrition computed from actual gram quantity
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        f.energy_kcal_100g * ml.quantity_g / 100.0
                    ELSE r.energy_kcal_per_portion * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS kcal,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        f.proteins_g_100g * ml.quantity_g / 100.0
                    ELSE r.proteins_g_per_portion * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS proteins_g,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        f.carbohydrates_g_100g * ml.quantity_g / 100.0
                    ELSE r.carbohydrates_g_per_portion * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS carbohydrates_g,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        f.fat_g_100g * ml.quantity_g / 100.0
                    ELSE r.fat_g_per_portion * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS fat_g,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        f.saturated_fat_g_100g * ml.quantity_g / 100.0
                    ELSE r.saturated_fat_g_per_portion * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS saturated_fat_g,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        f.fiber_g_100g * ml.quantity_g / 100.0
                    ELSE r.fiber_g_per_portion * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS fiber_g,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        f.sugars_g_100g * ml.quantity_g / 100.0
                    ELSE r.sugars_g_per_portion * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS sugars_g,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        f.salt_g_100g * ml.quantity_g / 100.0
                    ELSE r.salt_g_per_portion * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS salt_g,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.omega3_g_100g, 0) * ml.quantity_g / 100.0
                    ELSE 0
                END AS omega3_g,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.omega6_g_100g, 0) * ml.quantity_g / 100.0
                    ELSE 0
                END AS omega6_g,
                -- Minéraux
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.calcium_mg_100g,0) * ml.quantity_g / 100.0
                    ELSE COALESCE(r.calcium_mg_per_portion,0) * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS calcium_mg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.iron_mg_100g,0) * ml.quantity_g / 100.0
                    ELSE COALESCE(r.iron_mg_per_portion,0) * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS iron_mg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.magnesium_mg_100g,0) * ml.quantity_g / 100.0
                    ELSE COALESCE(r.magnesium_mg_per_portion,0) * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS magnesium_mg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.potassium_mg_100g,0) * ml.quantity_g / 100.0
                    ELSE COALESCE(r.potassium_mg_per_portion,0) * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS potassium_mg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.zinc_mg_100g,0) * ml.quantity_g / 100.0
                    ELSE COALESCE(r.zinc_mg_per_portion,0) * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS zinc_mg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.phosphorus_mg_100g,0) * ml.quantity_g / 100.0
                    ELSE COALESCE(r.phosphorus_mg_per_portion,0) * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS phosphorus_mg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.sodium_mg_100g,0) * ml.quantity_g / 100.0
                    ELSE 0
                END AS sodium_mg,
                -- Vitamines
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.vit_a_mcg_100g,0) * ml.quantity_g / 100.0
                    ELSE COALESCE(r.vit_a_mcg_per_portion,0) * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS vit_a_mcg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.vit_b1_mg_100g,0) * ml.quantity_g / 100.0
                    ELSE COALESCE(r.vit_b1_mg_per_portion,0) * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS vit_b1_mg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.vit_b2_mg_100g,0) * ml.quantity_g / 100.0
                    ELSE COALESCE(r.vit_b2_mg_per_portion,0) * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS vit_b2_mg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.vit_b3_mg_100g,0) * ml.quantity_g / 100.0
                    ELSE COALESCE(r.vit_b3_mg_per_portion,0) * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS vit_b3_mg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.vit_b5_mg_100g,0) * ml.quantity_g / 100.0
                    ELSE COALESCE(r.vit_b5_mg_per_portion,0) * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS vit_b5_mg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.vit_b6_mg_100g,0) * ml.quantity_g / 100.0
                    ELSE COALESCE(r.vit_b6_mg_per_portion,0) * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS vit_b6_mg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.vit_b9_mcg_100g,0) * ml.quantity_g / 100.0
                    ELSE COALESCE(r.vit_b9_mcg_per_portion,0) * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS vit_b9_mcg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.vit_b12_mcg_100g,0) * ml.quantity_g / 100.0
                    ELSE COALESCE(r.vit_b12_mcg_per_portion,0) * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS vit_b12_mcg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.vit_c_mg_100g,0) * ml.quantity_g / 100.0
                    ELSE COALESCE(r.vit_c_mg_per_portion,0) * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS vit_c_mg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.vit_d_mcg_100g,0) * ml.quantity_g / 100.0
                    ELSE COALESCE(r.vit_d_mcg_per_portion,0) * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS vit_d_mcg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.vit_e_mg_100g,0) * ml.quantity_g / 100.0
                    ELSE COALESCE(r.vit_e_mg_per_portion,0) * ml.quantity_g /
                         (r.total_weight_g / r.portions)
                END AS vit_e_mg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.selenium_mg_100g,0) * ml.quantity_g / 100.0
                    ELSE 0
                END AS selenium_mcg,
                CASE
                    WHEN ml.food_id IS NOT NULL THEN
                        COALESCE(f.omega9_g_100g,0) * ml.quantity_g / 100.0
                    ELSE 0
                END AS omega9_g
            FROM meal_log ml
            LEFT JOIN foods f ON ml.food_id = f.id
            LEFT JOIN recipes r ON ml.recipe_id = r.id
            WHERE ml.date_ = ?
            ORDER BY ml.logged_at
            """,
            (date_str,),
        )
        return [row_to_dict(r) for r in cur.fetchall()]
    finally:
        conn.row_factory = saved_factory


def get_sport(conn: sqlite3.Connection, date_str: str) -> list[dict]:
    """Retourne la liste des séances sportives pour ce jour (peut être vide)."""
    saved_factory = conn.row_factory
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            "SELECT * FROM sport_log WHERE date_ = ? ORDER BY id", (date_str,)
        ).fetchall()
        return [row_to_dict(row) for row in rows]
    finally:
        conn.row_factory = saved_factory


def compute_totals(meals: list[dict]) -> dict:
    """Fait la somme de tous les nutriments d'une liste de repas.
    Retourne toujours au moins les clés kcal / proteins / ... (0 si aucun repas).
    """
    total = {k: 0.0 for k in (
        "kcal", "proteins_g", "carbohydrates_g", "sugars_g", "fiber_g",
        "fat_g", "saturated_fat_g", "salt_g", "omega3_g", "omega6_g",
        "calcium_mg", "iron_mg", "magnesium_mg", "potassium_mg",
        "zinc_mg", "phosphorus_mg", "sodium_mg",
        "vit_a_mcg", "vit_b1_mg", "vit_b2_mg", "vit_b3_mg", "vit_b5_mg",
        "vit_b6_mg", "vit_b9_mcg", "vit_b12_mcg", "vit_c_mg", "vit_d_mcg",
        "vit_e_mg", "selenium_mcg",
    )}
    for m in meals:
        for k, v in m.items():
            if k in total and v is not None:
                total[k] += v
    return {k: round(v, 2) for k, v in total.items()}


def compute_totals_with_sport(conn: sqlite3.Connection, date_str: str) -> dict:
    """Compute day totals (meals + sport) for the given date."""
    meals = get_day_meals(conn, date_str)
    totals = compute_totals(meals)
    sport_list = get_sport(conn, date_str)
    total_sport_kcal = sum(s.get("kcal_burned") or 0 for s in sport_list)
    if total_sport_kcal > 0:
        totals["sport_kcal"] = total_sport_kcal
    return totals


def compute_totals_by_period(conn: sqlite3.Connection, date_str: str) -> dict:
    """Retourne un dict {period: totals} pour la date donnée."""
    meals = get_day_meals(conn, date_str)
    by_period: dict = {}
    for m in meals:
        p = m.get("period", "unknown")
        if p not in by_period:
            by_period[p] = {}
        for k, v in m.items():
            if k.startswith(("kcal","proteins","carbs","carbohydrates","sugars","fiber","fat",
                              "saturated","salt","omega","calcium","iron",
                              "magnesium","potassium","zinc","phosphorus",
                              "sodium","vit_","selenium")):
                by_period[p][k] = by_period[p].get(k, 0) + (v or 0)
    # Arrondir
    return {p: {k: round(v, 2) for k, v in t.items()} for p, t in by_period.items()}


def format_pct(val, target, unit):
    if not target or target == 0:
        return "N/A"
    pct = val / target * 100
    symbol = "✅" if pct >= 90 else "⚠️" if pct >= 60 else "❌"
    return f"{symbol} {pct:.0f}%"


def build_report(date_str: str, targets: dict, verbose: bool = False) -> str:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row

    meals = get_day_meals(conn, date_str)
    sport_list = get_sport(conn, date_str)
    totals = compute_totals(meals)
    conn.close()

    if not meals:
        return f"📭 Aucun repas loggé pour {date_str}"

    # ── MACROS (pessimiste: kcal_mangees ×1.10, sport ×0.90) ─────────────────
    t = targets
    raw_kcal = totals.get("kcal", 0)
    raw_sport = sum(s.get("kcal_burned") or 0 for s in sport_list)
    adj_eat = round(raw_kcal * 1.10)
    adj_sport = round(raw_sport * 0.90)
    kcal_net = raw_kcal - raw_sport
    adj_deficit = adj_eat - adj_sport
    deficit = t["kcal"] - kcal_net  # déficit vs cible réelle
    adj_deficit_vs_target = t["kcal"] - adj_deficit  # déficit adjusted vs cible

    lines = []
    lines.append(f"📊 Bilan {date_str}")
    carbs_total = totals.get('carbohydrates_g', 0)
    lines.append(f"   Cibles: {t['kcal']} kcal | {t['proteins_g']}P | {t.get('carbs_g', t.get('carbohydrates_g', 0))}G | {t['fat_g']}L")
    lines.append(
        f"   Total : {raw_kcal:.0f} kcal (réel) | {totals.get('proteins_g', 0):.0f}P | "
        f"{carbs_total:.0f}G | {totals.get('fat_g', 0):.0f}L"
    )
    lines.append(f"   Ajusté: {adj_eat:.0f} kcal | sport: -{adj_sport:.0f} kcal")
    deficit_label = f"   Déficit net (ajusté): {adj_deficit_vs_target:.0f} kcal"
    lines.append(deficit_label)
    lines.append(
        f"   Détail glucides: {totals.get('sugars_g', 0):.0f}g sucre | "
        f"{totals.get('fiber_g', 0):.0f}g fibres | "
        f"{carbs_total - totals.get('sugars_g', 0) - totals.get('fiber_g', 0):.0f}g amidon"
    )
    lines.append(
        f"   Gras: {totals.get('saturated_fat_g', 0):.0f}g AGS | "
        f"{totals.get('omega3_g', 0):.1f}g ω3 | "
        f"{totals.get('omega6_g', 0):.1f}g ω6 | "
        f"{totals.get('omega9_g', 0):.1f}g ω9"
    )

    if sport_list:
        for s in sport_list:
            hr_str = f", {s['avg_hr_bpm']}bpm" if s.get("avg_hr_bpm") else ""
            lines.append(
                f"   Sport: -{s['kcal_burned']} kcal ({s['sport_type']}, "
                f"{s['duration_min']}min{hr_str})"
            )
    lines.append("   ---")

    # ── REPAS PAR PERIODE ──────────────────────────────────────────────────
    periods_order = ["petit_dejeuner", "dejeuner", "diner", "collation"]
    period_names  = {
        "petit_dejeuner": "Matin",
        "dejeuner":       "Midi",
        "diner":          "Soir",
        "collation":      "Collation",
    }
    for period in periods_order:
        period_meals = [m for m in meals if m["period"] == period]
        if not period_meals:
            continue
        p_kcal = sum(m.get("kcal", 0) for m in period_meals)
        p_p    = sum(m.get("proteins_g", 0) for m in period_meals)
        p_g    = sum(m.get("carbohydrates_g", 0) for m in period_meals)
        p_l    = sum(m.get("fat_g", 0) for m in period_meals)
        lines.append(
            f"   {period_names.get(period, period):12s}: "
            f"{p_kcal:.0f} kcal | {p_p:.0f}P | {p_g:.0f}G | {p_l:.0f}L"
        )
        if verbose:
            for m in period_meals:
                unit_display = f"({m['original_qty']:.0f}{m['original_unit']})" if m.get('original_unit') else ""
                lines.append(
                    f"     • {m['food_name']} {unit_display}: "
                    f"{m['kcal']:.0f} kcal"
                )

    lines.append("   ---")

    # ── MINÉRAUX ───────────────────────────────────────────────────────────
    minerals = [
        ("Calcium",  totals.get("calcium_mg", 0),   t["calcium_mg"],    "mg"),
        ("Fer",       totals.get("iron_mg", 0),       t["iron_mg"],       "mg"),
        ("Magnesium", totals.get("magnesium_mg", 0),  t["magnesium_mg"],  "mg"),
        ("Potassium", totals.get("potassium_mg", 0),  t["potassium_mg"],  "mg"),
        ("Zinc",      totals.get("zinc_mg", 0),        t["zinc_mg"],       "mg"),
        ("Phosphore", totals.get("phosphorus_mg", 0), t["phosphorus_mg"], "mg"),
    ]
    lines.append("   Minéraux:")
    for name, val, target, unit in minerals:
        pct_str = format_pct(val, target, unit)
        lines.append(f"     {name:12s}: {val:6.0f}{unit}  {pct_str}  (cible {target}{unit})")

    # ── VITAMINES ─────────────────────────────────────────────────────────
    lines.append("   Vitamines:")
    vitamins = [
        ("A", totals.get("vit_a_mcg", 0),    t["vit_a_mcg"],    "μg"),
        ("B1",  totals.get("vit_b1_mg", 0),   t["vit_b1_mg"],    "mg"),
        ("B2",  totals.get("vit_b2_mg", 0),   t["vit_b2_mg"],    "mg"),
        ("B3",  totals.get("vit_b3_mg", 0),   t["vit_b3_mg"],    "mg"),
        ("B6",  totals.get("vit_b6_mg", 0),   t["vit_b6_mg"],    "mg"),
        ("B9",  totals.get("vit_b9_mcg", 0),  t["vit_b9_mcg"],   "μg"),
        ("B12", totals.get("vit_b12_mcg", 0), t["vit_b12_mcg"],  "μg"),
        ("C",   totals.get("vit_c_mg", 0),    t["vit_c_mg"],     "mg"),
        ("D",   totals.get("vit_d_mcg", 0),   t["vit_d_mcg"],    "μg"),
        ("E",   totals.get("vit_e_mg", 0),    t["vit_e_mg"],     "mg"),
    ]
    for name, val, target, unit in vitamins:
        pct_str = format_pct(val, target, unit)
        lines.append(f"     {name:12s}: {val:6.0f}{unit}  {pct_str}  (cible {target}{unit})")

    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Bilan nutritionnel d'une journée")
    p.add_argument("--date", default=None, help="YYYY-MM-DD (défaut: aujourd'hui)")
    p.add_argument("--verbose", "-v", action="store_true")
    return p


def main():
    from datetime import date
    parser = build_parser()
    args = parser.parse_args()

    date_str = args.date or date.today().isoformat()
    try:
        validate_date(date_str)
    except ValueError as e:
        print(f"❌ {e}")
        sys.exit(1)

    targets = DEFAULT_TARGETS.copy()  # TODO: load from DB per-user

    report = build_report(date_str, targets, verbose=args.verbose)
    print(report)


if __name__ == "__main__":
    main()

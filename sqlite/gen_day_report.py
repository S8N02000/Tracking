#!/usr/bin/env python3
"""Rapport VNR complet d'une journée — source : SQLite.

Usage:
  python3 gen_day_report.py --date 2026-10-28
  python3 gen_day_report.py --date 2026-10-28 --no-pral

Écrit /data/nutrition/backup_reports/<date>_rapport.md et affiche le rapport.
Les macros/minéraux/vitamines sont calculés par compute_day.py (source unique
de vérité) — ce script ne recalcule rien, il met en forme + ajoute le PRAL.
"""
import argparse
import json
import os
import sqlite3
import sys
import urllib.request
from datetime import date
from pathlib import Path

BASE = Path(__file__).parent
sys.path.insert(0, str(BASE))

from compute_day import (  # noqa: E402
    DB_PATH,
    DEFAULT_TARGETS,
    compute_totals,
    get_day_meals,
    get_sport,
)


def get_admin_secret() -> str:
    """Secret admin lu de l'environnement — jamais codé en dur dans le dépôt.

    Ordre : variable d'env NUTRITION_ADMIN_SECRET, puis fichier .env.prod du
    projet (clé ADMIN_SECRET). Erreur explicite si absent.
    """
    secret = os.environ.get("NUTRITION_ADMIN_SECRET")
    if secret:
        return secret.strip()
    env_file = Path("/data/nutrition/.env.prod")
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("ADMIN_SECRET="):
                return line.split("=", 1)[1].strip().strip("'\"")
    raise RuntimeError(
        "Secret admin introuvable. Définir NUTRITION_ADMIN_SECRET "
        "ou ADMIN_SECRET dans /data/nutrition/.env.prod"
    )


ADMIN_SECRET = get_admin_secret()
API = "http://localhost:3001"
OUT_DIR = Path("/data/nutrition/backup_reports")

PERIODS = [
    ("petit_dejeuner", "☀️ PETIT DÉJEUNER"),
    ("dejeuner", "🌤️ DÉJEUNER"),
    ("diner", "🌙 DÎNER"),
    ("collation", "🪵 COLLATION"),
]

VITAMINS = [
    ("A (rétinol)", "vit_a_mcg", "µg"),
    ("C", "vit_c_mg", "mg"),
    ("D", "vit_d_mcg", "µg"),
    ("E", "vit_e_mg", "mg"),
    ("B1 (thiamine)", "vit_b1_mg", "mg"),
    ("B2 (riboflavine)", "vit_b2_mg", "mg"),
    ("B3 (niacine)", "vit_b3_mg", "mg"),
    ("B5", "vit_b5_mg", "mg"),
    ("B6", "vit_b6_mg", "mg"),
    ("B9 (folates)", "vit_b9_mcg", "µg"),
    ("B12", "vit_b12_mcg", "µg"),
    ("K", "vit_k_mcg", "µg"),
]

MINERALS = [
    ("Calcium", "calcium_mg", "mg"),
    ("Fer", "iron_mg", "mg"),
    ("Magnésium", "magnesium_mg", "mg"),
    ("Potassium", "potassium_mg", "mg"),
    ("Zinc", "zinc_mg", "mg"),
    ("Phosphore", "phosphorus_mg", "mg"),
    ("Sélénium", "selenium_mcg", "µg"),
    ("Iode", "iodine_mcg", "µg"),
    ("Cuivre", "copper_mg", "mg"),
    ("Manganèse", "manganese_mg", "mg"),
]


def fetch_pral(date_str: str):
    """Récupère le PRAL du jour via l'API. Retourne None si l'API est absente."""
    url = f"{API}/api/analytics/pral?start={date_str}&end={date_str}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {ADMIN_SECRET}"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
    except Exception:
        return None
    days = data.get("days") or []
    day = next((d for d in days if d.get("date") == date_str), None)
    return {"day": day, "clinical": data.get("clinical"), "ratio": data.get("ratio")}


def fmt_qty(meal: dict) -> str:
    unit = meal.get("original_unit")
    qty = meal.get("original_qty")
    grams = meal.get("quantity_g") or 0
    if unit == "portion" and qty:
        return f"{grams:.0f} g ({qty:g} portion{'s' if qty > 1 else ''})"
    if unit and unit != "g" and qty:
        return f"{grams:.0f} g ({qty:g} {unit})"
    return f"{grams:.0f} g"


def build(date_str: str, with_pral: bool = True) -> str:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    meals = get_day_meals(conn, date_str)
    sport = get_sport(conn, date_str)
    conn.close()

    t = dict(DEFAULT_TARGETS)
    # Cibles absentes de compute_day.DEFAULT_TARGETS (VNR adultes, cf. skill)
    t.setdefault("vit_b5_mg", 6)
    t.setdefault("selenium_mcg", 55)
    t.setdefault("vit_k_mcg", 70)
    t.setdefault("iodine_mcg", 150)
    t.setdefault("copper_mg", 1.0)
    t.setdefault("manganese_mg", 1.4)
    totals = compute_totals(meals)
    raw_kcal = totals.get("kcal", 0.0)
    raw_sport = sum(s.get("kcal_burned") or 0 for s in sport)
    adj_eat = round(raw_kcal * 1.10)
    adj_sport = round(raw_sport * 0.90)
    net = raw_kcal - raw_sport

    L = []
    L.append(f"# 📊 Rapport nutrition — {date_str[8:10]}/{date_str[5:7]}/{date_str[:4]}")
    L.append("")
    L.append(f"**Total ingéré : {raw_kcal:.0f} kcal (food-only)** · "
             f"{totals.get('proteins_g', 0):.0f} P · {totals.get('carbohydrates_g', 0):.0f} G · "
             f"{totals.get('fat_g', 0):.0f} L · {totals.get('fiber_g', 0):.0f} fibres")
    L.append(f"**Sport : {raw_sport:.0f} kcal** → **net après sport : {net:.0f} kcal**")
    L.append(f"*Ajusté pessimiste (apports ×1,10 · sport ×0,90) : {adj_eat:.0f} kcal mangées, "
             f"{adj_sport:.0f} kcal sport → déficit net ajusté vs cible {t['kcal']} kcal : "
             f"{t['kcal'] - (adj_eat - adj_sport):+.0f} kcal*")
    L.append("")

    L.append("## 🍽️ Repas de la journée")
    L.append("")
    for period, label in PERIODS:
        rows = [m for m in meals if m.get("period") == period]
        if not rows:
            continue
        p_kcal = sum(m.get("kcal") or 0 for m in rows)
        p_p = sum(m.get("proteins_g") or 0 for m in rows)
        p_g = sum(m.get("carbohydrates_g") or 0 for m in rows)
        p_l = sum(m.get("fat_g") or 0 for m in rows)
        L.append(f"### {label} — {p_kcal:.0f} kcal | {p_p:.0f}P | {p_g:.0f}G | {p_l:.0f}L")
        L.append("")
        L.append("| Aliment | Qté | kcal | P | G | L | Fibres |")
        L.append("|---|---|---:|---:|---:|---:|---:|")
        for m in rows:
            L.append(
                f"| {m.get('food_name')} | {fmt_qty(m)} | {m.get('kcal') or 0:.0f} | "
                f"{m.get('proteins_g') or 0:.1f} | {m.get('carbohydrates_g') or 0:.1f} | "
                f"{m.get('fat_g') or 0:.1f} | {m.get('fiber_g') or 0:.1f} |"
            )
        L.append("")

    L.append("## 📈 Macros vs cibles")
    L.append("")
    L.append("| Nutriment | Cible | Total | Écart |")
    L.append("|---|---:|---:|---:|")
    macro_rows = [
        ("Énergie", "kcal", t["kcal"], "kcal"),
        ("Protéines", "proteins_g", t["proteins_g"], "g"),
        ("Glucides", "carbohydrates_g", t["carbs_g"], "g"),
        ("Lipides", "fat_g", t["fat_g"], "g"),
        ("Fibres", "fiber_g", t["fiber_g"], "g"),
        ("Sucres", "sugars_g", None, "g"),
        ("AGS", "saturated_fat_g", None, "g"),
        ("Sel", "salt_g", None, "g"),
        ("ω3", "omega3_g", None, "g"),
        ("ω6", "omega6_g", None, "g"),
        ("ω9", "omega9_g", None, "g"),
    ]
    for label, key, target, unit in macro_rows:
        val = totals.get(key, 0.0)
        tgt = f"{target}{unit}" if target else "—"
        ecart = f"{val - target:+.1f}{unit}" if target else "—"
        L.append(f"| **{label}** | {tgt} | {val:.1f}{unit} | {ecart} |")
    L.append("")

    L.append("## 💊 Vitamines")
    L.append("")
    L.append("| Vitamine | Cible | Apport | % VNR |")
    L.append("|---|---:|---:|---:|")
    vit_pct = {}
    for label, key, unit in VITAMINS:
        val = totals.get(key, 0.0)
        target = t.get(key)
        pct = val / target * 100 if target else None
        vit_pct[label] = pct
        flag = "" if pct is None else (" ✅" if pct >= 100 else " ⚠️" if pct >= 60 else " ❌")
        L.append(f"| {label} | {target}{unit} | {val:.1f}{unit} | "
                 f"{'—' if pct is None else f'{pct:.0f}%'}{flag} |")
    L.append("")

    L.append("## 🪨 Minéraux")
    L.append("")
    L.append("| Minéral | Cible | Apport | % VNR |")
    L.append("|---|---:|---:|---:|")
    min_pct = {}
    for label, key, unit in MINERALS:
        val = totals.get(key, 0.0)
        target = t.get(key)
        pct = val / target * 100 if target else None
        min_pct[label] = pct
        flag = "" if pct is None else (" ✅" if pct >= 100 else " ⚠️" if pct >= 60 else " ❌")
        L.append(f"| {label} | {target}{unit} | {val:.1f}{unit} | "
                 f"{'—' if pct is None else f'{pct:.0f}%'}{flag} |")
    L.append("")

    L.append("## 🏃 Dépenses énergétiques")
    L.append("")
    if sport:
        L.append("| Activité | Durée | Dépense | HR | Distance |")
        L.append("|---|---:|---:|---:|---:|")
        for s in sport:
            hr = f"{s['avg_hr_bpm']} bpm" if s.get("avg_hr_bpm") else "—"
            dist = f"{s['distance_km']} km" if s.get("distance_km") else "—"
            L.append(f"| {s.get('sport_type')} | {s.get('duration_min')} min | "
                     f"{s.get('kcal_burned')} kcal | {hr} | {dist} |")
        L.append(f"| **Total sport** | | **{raw_sport} kcal** | | |")
    else:
        L.append("Aucune séance enregistrée pour cette date.")
    L.append("")

    if with_pral:
        pral = fetch_pral(date_str)
        L.append("## ⚖️ Charge acide-alcaline (PRAL)")
        L.append("")
        if not pral or not pral.get("day"):
            L.append("_PRAL indisponible (API injoignable)._")
        else:
            d = pral["day"]
            clin = pral.get("clinical") or {}
            L.append(f"**{d.get('score', 0):+.1f} mEq/jour** — {clin.get('label', '')} "
                     f"(`{clin.get('bandId', '')}`)")
            L.append("")
            L.append("| Terme | Nutriments résolus | Coefficient | Contribution |")
            L.append("|---|---:|---:|---:|")
            for name, term in (d.get("terms") or {}).items():
                L.append(f"| {name} | {term.get('resolved', 0):.1f} {term.get('unit', '')} | "
                         f"{term.get('coefficient', 0)} | "
                         f"{term.get('contribution', 0):+.1f} |")
            L.append("")
            L.append(f"*Couverture {d.get('coverage', 0) * 100:.0f} % · "
                     f"{d.get('resolvedLines', 0)} lignes résolues · "
                     f"journée {'incluse' if d.get('included') else 'exclue : ' + str(d.get('reason'))}*")
        L.append("")

    L.append("## ⚠️ Points d'attention")
    L.append("")
    alerts = []
    for label, pct in list(vit_pct.items()) + list(min_pct.items()):
        if pct is not None and pct < 60:
            alerts.append(f"- **{label}** : {pct:.0f} % de la VNR")
    if alerts:
        L.extend(sorted(alerts))
    else:
        L.append("- Aucun nutriment sous 60 % de la VNR.")
    if not any(m.get("period") == "diner" for m in meals):
        L.append("- **Dîner non loggé** : journée incomplète (les totaux sont un plancher, pas un bilan final).")
    L.append("")
    L.append(f"*Rapport généré le {date.today().isoformat()} — script gen_day_report.py*")
    return "\n".join(L)


def main():
    p = argparse.ArgumentParser(description="Rapport VNR complet d'une journée")
    p.add_argument("--date", default=None, help="YYYY-MM-DD (défaut: aujourd'hui)")
    p.add_argument("--no-pral", action="store_true", help="Ne pas interroger l'API PRAL")
    p.add_argument("--out", default=None, help="Chemin du fichier .md")
    args = p.parse_args()

    date_str = args.date or date.today().isoformat()
    report = build(date_str, with_pral=not args.no_pral)

    out = Path(args.out) if args.out else OUT_DIR / f"{date_str}_rapport.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(report, encoding="utf-8")
    print(report)
    print(f"\n→ {out}")


if __name__ == "__main__":
    main()

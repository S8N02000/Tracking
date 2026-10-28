#!/usr/bin/env python3
"""Rapport Hebdo VNR — agrégation de compute_day.py sur une plage de dates.

Usage:
  python3 gen_week_report.py --start 2026-10-22 --end 2026-10-28
  python3 gen_week_report.py --start 2026-10-22 --end 2026-10-28 --no-pral

Écrit /data/nutrition/backup_reports/<start>_<end>_semaine.md
"""
import argparse
import json
import os
import sqlite3
import sys
import urllib.request
from datetime import date, timedelta
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

VITAMINS = [
    ("A (rétinol)", "vit_a_mcg", "µg"),
    ("C", "vit_c_mg", "mg"),
    ("D", "vit_d_mcg", "µg"),
    ("E", "vit_e_mg", "mg"),
    ("B1", "vit_b1_mg", "mg"),
    ("B2", "vit_b2_mg", "mg"),
    ("B3", "vit_b3_mg", "mg"),
    ("B5", "vit_b5_mg", "mg"),
    ("B6", "vit_b6_mg", "mg"),
    ("B9 (folates)", "vit_b9_mcg", "µg"),
    ("B12", "vit_b12_mcg", "µg"),
]
MINERALS = [
    ("Calcium", "calcium_mg", "mg"),
    ("Fer", "iron_mg", "mg"),
    ("Magnésium", "magnesium_mg", "mg"),
    ("Potassium", "potassium_mg", "mg"),
    ("Zinc", "zinc_mg", "mg"),
    ("Phosphore", "phosphorus_mg", "mg"),
    ("Sélénium", "selenium_mcg", "µg"),
]


def date_range(start, end):
    d = datetime_start = date.fromisoformat(start)
    e = date.fromisoformat(end)
    out = []
    while d <= e:
        out.append(d.isoformat())
        d += timedelta(days=1)
    return out


def fetch_pral(start, end):
    url = f"{API}/api/analytics/pral?start={start}&end={end}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {ADMIN_SECRET}"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read())
    except Exception:
        return None


def build(start, end, with_pral=True):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    days = date_range(start, end)
    per_day = []
    agg = {}
    sport_total = 0.0
    for d in days:
        meals = get_day_meals(conn, d)
        sport = get_sport(conn, d)
        tot = compute_totals(meals)
        sp = sum(s.get("kcal_burned") or 0 for s in sport)
        sport_total += sp
        for k, v in tot.items():
            agg[k] = agg.get(k, 0.0) + (v or 0)
        per_day.append({"date": d, "totals": tot, "sport": sp, "n_meals": len(meals),
                        "sport_sessions": sport})
    conn.close()

    t = dict(DEFAULT_TARGETS)
    t.setdefault("vit_b5_mg", 6)
    t.setdefault("selenium_mcg", 55)

    n = len(days)
    total_kcal = agg.get("kcal", 0.0)
    adj_eat = round(total_kcal * 1.10)
    adj_sport = round(sport_total * 0.90)
    net = total_kcal - sport_total

    L = []
    L.append(f"# 📊 Rapport hebdomadaire — {start[8:10]}/{start[5:7]} → {end[8:10]}/{end[5:7]}/{end[:4]} ({n} j)")
    L.append("")
    L.append(f"**Total ingéré : {total_kcal:.0f} kcal** ({total_kcal / n:.0f} kcal/jour) · "
             f"{agg.get('proteins_g', 0):.0f} P · {agg.get('carbohydrates_g', 0):.0f} G · "
             f"{agg.get('fat_g', 0):.0f} L · {agg.get('fiber_g', 0):.0f} fibres")
    L.append(f"**Sport : {sport_total:.0f} kcal** ({sport_total / n:.0f} kcal/jour) → "
             f"**net après sport : {net:.0f} kcal** ({net / n:.0f} kcal/jour)")
    L.append(f"*Ajusté pessimiste (apports ×1,10 · sport ×0,90) : {adj_eat} kcal mangées, "
             f"{adj_sport} kcal sport → déficit net ajusté vs cible {t['kcal']} kcal/j : "
             f"{n * t['kcal'] - (adj_eat - adj_sport):+.0f} kcal sur la semaine "
             f"({(n * t['kcal'] - (adj_eat - adj_sport)) / n:+.0f} kcal/j)*")
    L.append("")
    L.append(f"**Estimation gras** : {(n * t['kcal'] - (adj_eat - adj_sport)) / 7700:+.2f} kg "
             f"(1 kg gras ≈ 7 700 kcal)")
    L.append("")

    L.append("## 📅 Jour par jour")
    L.append("")
    L.append("| Date | Repas | kcal | P | G | L | Fibres | Sport | Net |")
    L.append("|---|---:|---:|---:|---:|---:|---:|---:|---:|")
    for d in per_day:
        tt = d["totals"]
        L.append(f"| {d['date'][8:10]}/{d['date'][5:7]} | {d['n_meals']} | "
                 f"{tt.get('kcal', 0):.0f} | {tt.get('proteins_g', 0):.0f} | "
                 f"{tt.get('carbohydrates_g', 0):.0f} | {tt.get('fat_g', 0):.0f} | "
                 f"{tt.get('fiber_g', 0):.0f} | {d['sport']:.0f} | "
                 f"{tt.get('kcal', 0) - d['sport']:.0f} |")
    L.append("")
    L.append("| **Total** | | **{:.0f}** | **{:.0f}** | **{:.0f}** | **{:.0f}** | **{:.0f}** | **{:.0f}** | **{:.0f}** |".format(
        total_kcal, agg.get('proteins_g', 0), agg.get('carbohydrates_g', 0), agg.get('fat_g', 0),
        agg.get('fiber_g', 0), sport_total, net))
    L.append("")

    L.append("## 📈 Macros vs cibles (moyenne journalière)")
    L.append("")
    L.append("| Nutriment | Cible/j | Moy/j | Écart/j |")
    L.append("|---|---:|---:|---:|")
    for label, key, target, unit in [
        ("Énergie", "kcal", t["kcal"], "kcal"),
        ("Protéines", "proteins_g", t["proteins_g"], "g"),
        ("Glucides", "carbohydrates_g", t["carbs_g"], "g"),
        ("Lipides", "fat_g", t["fat_g"], "g"),
        ("Fibres", "fiber_g", t["fiber_g"], "g"),
    ]:
        avg = agg.get(key, 0.0) / n
        L.append(f"| **{label}** | {target}{unit} | {avg:.1f}{unit} | {avg - target:+.1f}{unit} |")
    L.append("")

    L.append("## 💊 Vitamines (moyenne journalière)")
    L.append("")
    L.append("| Vitamine | Cible/j | Apport/j | % VNR |")
    L.append("|---|---:|---:|---:|")
    for label, key, unit in VITAMINS:
        avg = agg.get(key, 0.0) / n
        target = t.get(key)
        pct = avg / target * 100 if target else None
        flag = "" if pct is None else (" ✅" if pct >= 100 else " ⚠️" if pct >= 60 else " ❌")
        L.append(f"| {label} | {target}{unit} | {avg:.1f}{unit} | "
                 f"{'—' if pct is None else f'{pct:.0f}%'}{flag} |")
    L.append("")

    L.append("## 🪨 Minéraux (moyenne journalière)")
    L.append("")
    L.append("| Minéral | Cible/j | Apport/j | % VNR |")
    L.append("|---|---:|---:|---:|")
    for label, key, unit in MINERALS:
        avg = agg.get(key, 0.0) / n
        target = t.get(key)
        pct = avg / target * 100 if target else None
        flag = "" if pct is None else (" ✅" if pct >= 100 else " ⚠️" if pct >= 60 else " ❌")
        L.append(f"| {label} | {target}{unit} | {avg:.1f}{unit} | "
                 f"{'—' if pct is None else f'{pct:.0f}%'}{flag} |")
    L.append("")

    L.append("## 🏃 Séances sportives")
    L.append("")
    sessions = [(d["date"], s) for d in per_day for s in d["sport_sessions"]]
    if sessions:
        L.append("| Date | Type | Durée | kcal | HR | Distance |")
        L.append("|---|---|---:|---:|---:|---:|")
        for dd, s in sessions:
            hr = f"{s['avg_hr_bpm']}" if s.get("avg_hr_bpm") else "—"
            dist = f"{s['distance_km']} km" if s.get("distance_km") else "—"
            L.append(f"| {dd[8:10]}/{dd[5:7]} | {s.get('sport_type')} | {s.get('duration_min')} min | "
                     f"{s.get('kcal_burned')} | {hr} | {dist} |")
    else:
        L.append("Aucune séance enregistrée sur la période.")
    L.append("")

    if with_pral:
        pral = fetch_pral(start, end)
        L.append("## ⚖️ Charge acide-alcaline (PRAL)")
        L.append("")
        if not pral:
            L.append("_PRAL indisponible (API injoignable)._")
        else:
            per = pral.get("period") or {}
            clin = pral.get("clinical") or {}
            L.append(f"**Période : {per.get('score', 0):+.1f} mEq/jour** — {clin.get('label', '')} "
                     f"(`{clin.get('bandId', '')}`) · {per.get('validDays', 0)} journées valides, "
                     f"{per.get('excludedDays', 0)} exclue(s)")
            L.append("")
            L.append("| Date | kcal | Couverture | Score mEq/j | Inclus |")
            L.append("|---|---:|---:|---:|---|")
            for d in (pral.get("days") or []):
                L.append(f"| {d.get('date')[8:10]}/{d.get('date')[5:7]} | {d.get('kcal', 0):.0f} | "
                         f"{d.get('coverage', 0) * 100:.0f} % | {d.get('score', 0):+.1f} | "
                         f"{'oui' if d.get('included') else 'non'} |")
            excl = pral.get("exclusions") or {}
            if excl:
                L.append("")
                L.append("Journées exclues : " + ", ".join(
                    f"{k} ({v.get('reason') if isinstance(v, dict) else v})" for k, v in excl.items()))
        L.append("")

    L.append("## ⚠️ Points d'attention")
    L.append("")
    alerts = []
    for label, key, unit in VITAMINS + MINERALS:
        target = t.get(key)
        if not target:
            continue
        avg = agg.get(key, 0.0) / n
        pct = avg / target * 100
        if pct < 60:
            alerts.append(f"- **{label}** : {pct:.0f} % de la VNR en moyenne")
    if alerts:
        L.extend(sorted(alerts))
    else:
        L.append("- Aucun nutriment sous 60 % de la VNR en moyenne.")
    L.append("")
    L.append(f"*Rapport généré le {date.today().isoformat()} — script gen_week_report.py*")
    return "\n".join(L)


def main():
    p = argparse.ArgumentParser(description="Rapport hebdomadaire VNR")
    p.add_argument("--start", required=True, help="YYYY-MM-DD")
    p.add_argument("--end", required=True, help="YYYY-MM-DD")
    p.add_argument("--no-pral", action="store_true")
    p.add_argument("--out", default=None)
    args = p.parse_args()

    report = build(args.start, args.end, with_pral=not args.no_pral)
    out = Path(args.out) if args.out else OUT_DIR / f"{args.start}_{args.end}_semaine.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(report, encoding="utf-8")
    print(report)
    print(f"\n→ {out}")


if __name__ == "__main__":
    main()

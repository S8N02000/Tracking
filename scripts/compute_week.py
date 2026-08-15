#!/usr/bin/env python3
"""Bilan hebdomadaire agrégé"""
import csv, os, yaml
from datetime import datetime, timedelta

BASE = os.path.dirname(os.path.abspath(__file__)) + "/.."
LOG = BASE + "/log"
NUTRI_FIELDS = ['kcal_par_100g', 'proteines_par_100g', 'glucides_par_100g', 'sucres_par_100g', 'fibres_par_100g', 'amidon_par_100g', 'lipides_par_100g', 'ags_par_100g', 'agi_par_100g', 'omega3_par_100g', 'omega6_par_100g', 'omega9_par_100g', 'trans_par_100g', 'sel_par_100g', 'sodium_par_100g', 'cholesterol_par_100g', 'vitamine_a_par_100g', 'vitamine_b1_par_100g', 'vitamine_b2_par_100g', 'vitamine_b3_par_100g', 'vitamine_b5_par_100g', 'vitamine_b6_par_100g', 'vitamine_b9_par_100g', 'vitamine_b12_par_100g', 'vitamine_c_par_100g', 'vitamine_d_par_100g', 'vitamine_e_par_100g', 'vitamine_k_par_100g', 'calcium_par_100g', 'fer_par_100g', 'magnesium_par_100g', 'potassium_par_100g', 'zinc_par_100g', 'phosphore_par_100g', 'manganese_par_100g', 'cuivre_par_100g', 'selenium_par_100g', 'iode_par_100g']

def load_targets():
    path = BASE + "/targets.yaml"
    if os.path.exists(path):
        with open(path) as f:
            return yaml.safe_load(f)
    return {"kcal": 2000, "proteines": 150, "glucides": 200, "lipides": 70}

def compute_week(date_str):
    targets = load_targets()
    ref = datetime.strptime(date_str, "%Y-%m-%d")
    monday = ref - timedelta(days=ref.weekday())
    days = [monday + timedelta(days=i) for i in range(7)]
    totals = {}
    count = 0
    for d in days:
        ds = d.strftime("%Y-%m-%d")
        year, month = ds[:4], ds[5:7]
        fpath = f"{LOG}/{year}/{month}/{ds}.csv"
        if not os.path.exists(fpath):
            continue
        with open(fpath) as f:
            for row in csv.DictReader(f):
                for field in NUTRI_FIELDS:
                    key = field.replace("_par_100g", "")
                    val = float(row.get(key, 0) or 0)
                    totals[key] = totals.get(key, 0) + val
                count += 1
    if count == 0:
        print(f"Pas de données pour la semaine du {days[0].strftime('%Y-%m-%d')}")
        return
    avg = {k: round(v/count, 1) for k, v in totals.items()}
    kcal_avg = avg.get("kcal", 0)
    deficit = targets["kcal"] - kcal_avg
    print(f"\n📅 Semaine du {days[0].strftime('%Y-%m-%d')} au {days[-1].strftime('%Y-%m-%d')}")
    print(f"   Jours loggés : {count}/7")
    print(f"   Moyenne/jour : {kcal_avg} kcal | {avg.get('proteines',0)}P | {avg.get('glucides',0)}G | {avg.get('lipides',0)}L")
    print(f"   Cibles/jour  : {targets['kcal']} kcal | {targets['proteines']}P | {targets['glucides']}G | {targets['lipides']}L")
    print(f"   Déficit moyen: {round(deficit)} kcal/jour")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    args = parser.parse_args()
    d = args.date or datetime.now().strftime("%Y-%m-%d")
    compute_week(d)

#!/usr/bin/env python3
"""Bilan d'une journée"""
import csv, os, yaml
from datetime import datetime

BASE = os.path.dirname(os.path.abspath(__file__)) + "/.."
LOG = BASE + "/log"
NUTRI_FIELDS = ['kcal_par_100g', 'proteines_par_100g', 'glucides_par_100g', 'sucres_par_100g', 'fibres_par_100g', 'amidon_par_100g', 'lipides_par_100g', 'ags_par_100g', 'agi_par_100g', 'omega3_par_100g', 'omega6_par_100g', 'omega9_par_100g', 'trans_par_100g', 'sel_par_100g', 'sodium_par_100g', 'cholesterol_par_100g', 'vitamine_a_par_100g', 'vitamine_b1_par_100g', 'vitamine_b2_par_100g', 'vitamine_b3_par_100g', 'vitamine_b5_par_100g', 'vitamine_b6_par_100g', 'vitamine_b9_par_100g', 'vitamine_b12_par_100g', 'vitamine_c_par_100g', 'vitamine_d_par_100g', 'vitamine_e_par_100g', 'vitamine_k_par_100g', 'calcium_par_100g', 'fer_par_100g', 'magnesium_par_100g', 'potassium_par_100g', 'zinc_par_100g', 'phosphore_par_100g', 'manganese_par_100g', 'cuivre_par_100g', 'selenium_par_100g', 'iode_par_100g']

def load_targets():
    path = BASE + "/targets.yaml"
    if os.path.exists(path):
        with open(path) as f:
            return yaml.safe_load(f)
    return {"kcal": 2000, "proteines": 150, "glucides": 200, "lipides": 70}

def compute_day(date_str):
    targets = load_targets()
    year, month = date_str[:4], date_str[5:7]
    fpath = f"{LOG}/{year}/{month}/{date_str}.csv"
    if not os.path.exists(fpath):
        print(f"Pas de log pour {date_str}")
        return
    totals = {}
    by_per = {}
    with open(fpath) as f:
        reader = csv.DictReader(f)
        for row in reader:
            for field in NUTRI_FIELDS:
                key = field.replace("_par_100g", "")
                val = float(row.get(key, 0) or 0)
                totals[key] = totals.get(key, 0) + val
                p = row["periode"]
                if p not in by_per:
                    by_per[p] = {}
                by_per[p][key] = by_per[p].get(key, 0) + val
    kcal = round(totals.get("kcal", 0))
    deficit = targets["kcal"] - kcal
    print(f"\n📊 Bilan {date_str}")
    print(f"   Cibles: {targets['kcal']} kcal | {targets['proteines']}P | {targets['glucides']}G | {targets['lipides']}L")
    print(f"   Total : {kcal} kcal | {round(totals.get('proteines',0))}P | {round(totals.get('glucides',0))}G | {round(totals.get('lipides',0))}L | -{round(deficit)} kcal déficit")
    print(f"   Détail glucides: {round(totals.get('sucres',0))}g sucre | {round(totals.get('fibres',0))}g fibres | {round(totals.get('amidon',0))}g amidon")
    print(f"   Gras: {round(totals.get('ags',0))}gAGS | {round(totals.get('agi',0))}gAGI | {round(totals.get('omega3',0))}gω3 | {round(totals.get('omega6',0))}gω6 | {round(totals.get('omega9',0))}gω9")
    print("   ---")
    for p in ["matin", "midi", "soir", "collation"]:
        if p in by_per:
            pp = by_per[p]
            print(f"   {p:12}: {round(pp.get('kcal',0))} kcal | {round(pp.get('proteines',0))}P | {round(pp.get('glucides',0))}G | {round(pp.get('lipides',0))}L")
    print(f"   ▸ Mini detail — Selenium {round(totals.get('selenium',0),1)}μg | Fer {round(totals.get('fer',0),1)}mg | VitD {round(totals.get('vitamine_d',0),1)}μg | B12 {round(totals.get('vitamine_b12',0),1)}μg")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    args = parser.parse_args()
    d = args.date or datetime.now().strftime("%Y-%m-%d")
    compute_day(d)

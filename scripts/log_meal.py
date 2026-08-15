#!/usr/bin/env python3
"""Ajoute une ligne au log journalier"""
import csv, sys, os
from datetime import datetime

BASE = os.path.dirname(os.path.abspath(__file__)) + "/.."
LOG = BASE + "/log"
FOODS = BASE + "/foods"
NUTRI_FIELDS = ['kcal_par_100g', 'proteines_par_100g', 'glucides_par_100g', 'sucres_par_100g', 'fibres_par_100g', 'amidon_par_100g', 'lipides_par_100g', 'ags_par_100g', 'agi_par_100g', 'omega3_par_100g', 'omega6_par_100g', 'omega9_par_100g', 'trans_par_100g', 'sel_par_100g', 'sodium_par_100g', 'cholesterol_par_100g', 'vitamine_a_par_100g', 'vitamine_b1_par_100g', 'vitamine_b2_par_100g', 'vitamine_b3_par_100g', 'vitamine_b5_par_100g', 'vitamine_b6_par_100g', 'vitamine_b9_par_100g', 'vitamine_b12_par_100g', 'vitamine_c_par_100g', 'vitamine_d_par_100g', 'vitamine_e_par_100g', 'vitamine_k_par_100g', 'calcium_par_100g', 'fer_par_100g', 'magnesium_par_100g', 'potassium_par_100g', 'zinc_par_100g', 'phosphore_par_100g', 'manganese_par_100g', 'cuivre_par_100g', 'selenium_par_100g', 'iode_par_100g']

def get_food(slug_name):
    path = f"{FOODS}/{slug_name}.csv"
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return list(csv.DictReader(f))[-1]

def calc_macros(slug_name, quantite, unite):
    food = get_food(slug_name)
    if food is None:
        return None
    poids_g = quantite if unite == "g" else float(food["poids_unite_g"]) * quantite
    factor = poids_g / 100
    result = {}
    for field in NUTRI_FIELDS:
        val = food.get(field, "0") or "0"
        result[field.replace("_par_100g", "")] = round(float(val) * factor, 1)
    return result

def log_entry(date_str, periode, aliment, quantite, unite="g"):
    slug_name = aliment
    m = calc_macros(slug_name, quantite, unite)
    if m is None:
        print(f"ERREUR: aliment {aliment} non trouvé dans foods/")
        sys.exit(1)
    year, month = date_str[:4], date_str[5:7]
    dir_path = f"{LOG}/{year}/{month}"
    os.makedirs(dir_path, exist_ok=True)
    fpath = f"{dir_path}/{date_str}.csv"
    file_exists = os.path.exists(fpath) and os.path.getsize(fpath) > 0
    nut_keys = list(m.keys())
    header = ["horodatage","periode","aliment","quantite","unite"] + nut_keys
    with open(fpath, "a", newline="") as f:
        w = csv.writer(f)
        if not file_exists:
            w.writerow(header)
        time = datetime.now().strftime("%H:%M")
        row = [time, periode, aliment, quantite, unite] + [m[k] for k in nut_keys]
        w.writerow(row)
    kcal = m.get("kcal", 0)
    print(f"✓ {date_str} {periode}: {quantite}{unite} {aliment} → {kcal} kcal")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--periode")
    parser.add_argument("--aliment")
    parser.add_argument("--quantite", type=float)
    parser.add_argument("--unite", default="g")
    args = parser.parse_args()
    d = args.date or datetime.now().strftime("%Y-%m-%d")
    log_entry(d, args.periode, args.aliment, args.quantite, args.unite)

#!/usr/bin/env python3
"""Log une portion de recette dans le journal du jour.
Les macros sont lues depuis recipes/<slug>.csv (valeurs PAR PORTION).
"""
import csv, sys, os
from datetime import datetime

BASE = os.path.dirname(os.path.abspath(__file__)) + "/.."
LOG = BASE + "/log"
RECIPES = BASE + "/recipes"

def log_recipe(recipe_slug, portions, date_str):
    # Load recipe
    rpath = f"{RECIPES}/{recipe_slug}.csv"
    if not os.path.exists(rpath):
        print(f"ERREUR: recette {recipe_slug} non trouvée")
        sys.exit(1)
    with open(rpath) as f:
        r = list(csv.DictReader(f))[-1]
    
    portions = float(portions)
    kcal = round(float(r["kcal_par_portion"]) * portions, 1)
    p = round(float(r["proteines_par_portion"]) * portions, 1)
    g = round(float(r["glucides_par_portion"]) * portions, 1)
    l = round(float(r["lipides_par_portion"]) * portions, 1)
    fibres = round(float(r.get("fibres_par_portion", 0) or 0) * portions, 1)
    sel = round(float(r.get("sel_par_portion", 0) or 0) * portions, 1)
    
    nom_recette = r["nom"]
    poids_portion = float(r["poids_total_g"]) / float(r["portions"])
    poids_total = round(poids_portion * portions, 0)
    
    year, month = date_str[:4], date_str[5:7]
    dir_path = f"{LOG}/{year}/{month}"
    os.makedirs(dir_path, exist_ok=True)
    fpath = f"{dir_path}/{date_str}.csv"
    file_exists = os.path.exists(fpath) and os.path.getsize(fpath) > 0
    
    # Build nutrient row (38 fields = per 100g of the portion weight)
    # We need to convert PAR PORTION values back to per-100g for the log format
    factor = poids_total / 100 if poids_total > 0 else 1
    nut_row = []
    # The recipe only stores: kcal, proteines, glucides, lipides, fibres, sel
    # Map to the 38-field log format
    recipe_nut_map = {
        "kcal": "kcal_par_100g",
        "proteines": "proteines_par_100g",
        "glucides": "glucides_par_100g",
        "lipides": "lipides_par_100g",
        "fibres": "fibres_par_100g",
        "sel": "sel_par_100g",
    }
    
    nut_keys = [
        "kcal","proteines","glucides","sucres","fibres","amidon",
        "lipides","ags","agi","omega3","omega6","omega9","trans",
        "sel","sodium","cholesterol",
        "vitamine_a","vitamine_b1","vitamine_b2","vitamine_b3","vitamine_b5",
        "vitamine_b6","vitamine_b9","vitamine_b12","vitamine_c","vitamine_d",
        "vitamine_e","vitamine_k",
        "calcium","fer","magnesium","potassium","zinc","phosphore",
        "manganese","cuivre","selenium","iode"
    ]
    
    header = ["horodatage","periode","aliment","quantite","unite"] + nut_keys
    with open(fpath, "a", newline="") as f:
        w = csv.writer(f)
        if not file_exists:
            w.writerow(header)
        time = datetime.now().strftime("%H:%M")
        # Build the row: for recipe we store PAR PORTION values (scaled by portions)
        # For log format we need per-100g values, but we store scaled values
        # The compute_day script reads by key name so we store the scaled portion values
        # with keys matching the log format
        base_row = {
            "kcal": kcal, "proteines": p, "glucides": g, "lipides": l,
            "fibres": fibres, "sel": sel,
            "sucres": "", "amidon": "", "ags": "", "agi": "",
            "omega3": "", "omega6": "", "omega9": "", "trans": "",
            "sodium": "", "cholesterol": "",
            "vitamine_a": "", "vitamine_b1": "", "vitamine_b2": "", "vitamine_b3": "",
            "vitamine_b5": "", "vitamine_b6": "", "vitamine_b9": "", "vitamine_b12": "",
            "vitamine_c": "", "vitamine_d": "", "vitamine_e": "", "vitamine_k": "",
            "calcium": "", "fer": "", "magnesium": "", "potassium": "",
            "zinc": "", "phosphore": "", "manganese": "", "cuivre": "",
            "selenium": "", "iode": "",
        }
        row_vals = [time, "soir", recipe_slug, portions, "portion"] + [base_row.get(k, "") for k in nut_keys]
        w.writerow(row_vals)
    
    print(f"✓ {date_str} soir: {portions}x {nom_recette} → {kcal} kcal | {p}P | {g}G | {l}L")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--recipe")
    parser.add_argument("--portions", type=float, default=1)
    parser.add_argument("--date")
    args = parser.parse_args()
    d = args.date or datetime.now().strftime("%Y-%m-%d")
    log_recipe(args.recipe, args.portions, d)

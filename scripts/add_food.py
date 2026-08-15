#!/usr/bin/env python3
"""Enregistre un nouvel aliment dans foods/ — colonnes standardisées."""
import csv, sys, os

BASE = os.path.dirname(os.path.abspath(__file__)) + "/.."
FOODS = BASE + "/foods"
os.makedirs(FOODS, exist_ok=True)

ALL_FIELDS = ['nom', 'poids_unite_g', 'kcal_par_100g', 'proteines_par_100g', 'glucides_par_100g', 'sucres_par_100g', 'fibres_par_100g', 'amidon_par_100g', 'lipides_par_100g', 'ags_par_100g', 'agi_par_100g', 'omega3_par_100g', 'omega6_par_100g', 'omega9_par_100g', 'trans_par_100g', 'sel_par_100g', 'sodium_par_100g', 'cholesterol_par_100g', 'vitamine_a_par_100g', 'vitamine_b1_par_100g', 'vitamine_b2_par_100g', 'vitamine_b3_par_100g', 'vitamine_b5_par_100g', 'vitamine_b6_par_100g', 'vitamine_b9_par_100g', 'vitamine_b12_par_100g', 'vitamine_c_par_100g', 'vitamine_d_par_100g', 'vitamine_e_par_100g', 'vitamine_k_par_100g', 'calcium_par_100g', 'fer_par_100g', 'magnesium_par_100g', 'potassium_par_100g', 'zinc_par_100g', 'phosphore_par_100g', 'manganese_par_100g', 'cuivre_par_100g', 'selenium_par_100g', 'iode_par_100g']

def slug(name):
    s = name.lower().replace(" ", "_").replace("'", "")
    for c in ["é","è","ê","ë","ô","ö","ù","û","ü","ç","ä","å","æ","œ"]:
        s = s.replace(c, "")
    return s

def read_index():
    idx = {}
    path = f"{FOODS}/index.csv"
    if os.path.exists(path):
        with open(path) as f:
            for row in csv.DictReader(f):
                idx[row["nom"]] = row["fichier"]
    return idx

def write_index(idx):
    with open(f"{FOODS}/index.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["nom", "fichier"])
        for nom, fichier in sorted(idx.items()):
            w.writerow([nom, fichier])

def add_food(nom, poids_unite_g=100, **kwargs):
    s = slug(nom)
    fname = f"{FOODS}/{s}.csv"
    if os.path.exists(fname):
        print(f"ERREUR: {s}.csv existe déjà")
        sys.exit(1)
    with open(fname, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(ALL_FIELDS)
        row = [nom, poids_unite_g]
        for field in ALL_FIELDS[2:]:
            row.append(kwargs.get(field, ""))
        w.writerow(row)
    idx = read_index()
    idx[nom] = f"{s}.csv"
    write_index(idx)
    print(f"✓ {nom} enregistré dans {s}.csv")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--nom")
    parser.add_argument("--poids-unite-g", "--poids_unite_g", dest="poids_unite_g", type=float, default=100)
    for field in ALL_FIELDS[2:]:
        dash = field.replace("_", "-")
        parser.add_argument(f"--{dash}", dest=field, type=float, default=None)
    args = parser.parse_args()
    kwargs = {k: v for k, v in vars(args).items() if v is not None and k in ALL_FIELDS[2:]}
    add_food(args.nom, args.poids_unite_g or 100, **kwargs)

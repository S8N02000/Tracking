#!/usr/bin/env python3
"""Enregistre une recette dans recipes/ avec macros par portion."""
import csv, sys, os

BASE = os.path.dirname(os.path.abspath(__file__)) + "/.."
RECIPES = BASE + "/recipes"
os.makedirs(RECIPES, exist_ok=True)

def slug(name):
    s = name.lower().replace(" ", "_").replace("'", "").replace("-", "_")
    for c in ["é","è","ê","ë","ô","ö","ù","û","ü","ç","ä","å","æ","œ"]:
        s = s.replace(c, "")
    return s

def read_index():
    idx = {}
    path = f"{RECIPES}/index.csv"
    if os.path.exists(path) and os.path.getsize(path) > 0:
        with open(path) as f:
            for row in csv.DictReader(f):
                idx[row["nom"]] = row["fichier"]
    return idx

def write_index(idx):
    with open(f"{RECIPES}/index.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["nom", "fichier"])
        for nom, fichier in sorted(idx.items()):
            w.writerow([nom, fichier])

def add_recipe(nom, ingredients_dict, portions=1, **macros):
    """Enregistre une recette.
    ingredients_dict: {aliment_slug: quantite_g}
    macros: kcal, proteines, glucides, lipides, fibres, sel par PORTION
    """
    s = slug(nom)
    fname = f"{RECIPES}/{s}.csv"
    if os.path.exists(fname):
        print(f"ERREUR: {s}.csv existe déjà")
        sys.exit(1)
    # Calculate total weight from ingredients
    total_weight = sum(ingredients_dict.values())
    with open(fname, "w", newline="") as f:
        w = csv.writer(f)
        # Header
        w.writerow(["nom", "portions", "poids_total_g",
                    "kcal_par_portion", "proteines_par_portion",
                    "glucides_par_portion", "lipides_par_portion",
                    "fibres_par_portion", "sel_par_portion",
                    "ingredients"])
        # Ingredients string
        ing_str = ";".join(f"{k}:{v}" for k, v in ingredients_dict.items())
        w.writerow([
            nom, portions, int(total_weight),
            macros.get("kcal", ""),
            macros.get("proteines", ""),
            macros.get("glucides", ""),
            macros.get("lipides", ""),
            macros.get("fibres", ""),
            macros.get("sel", ""),
            ing_str
        ])
    idx = read_index()
    idx[nom] = f"{s}.csv"
    write_index(idx)
    print(f"✓ {nom} enregistré dans {s}.csv ({portions} portions)")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--nom")
    parser.add_argument("--portions", type=int, default=1)
    parser.add_argument("--ingredients")
    parser.add_argument("--kcal", type=float)
    parser.add_argument("--proteines", type=float)
    parser.add_argument("--glucides", type=float)
    parser.add_argument("--lipides", type=float)
    parser.add_argument("--fibres", type=float)
    parser.add_argument("--sel", type=float)
    args = parser.parse_args()
    ing = {}
    if args.ingredients:
        for part in args.ingredients.split(";"):
            k, v = part.split(":")
            ing[k.strip()] = float(v.strip())
    add_recipe(args.nom, ing, args.portions,
               kcal=args.kcal, proteines=args.proteines,
               glucides=args.glucides, lipides=args.lipides,
               fibres=args.fibres, sel=args.sel)

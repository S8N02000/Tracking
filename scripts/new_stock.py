#!/usr/bin/env python3
"""Ouvre un nouveau stock produit (produit entamé)"""
import csv, sys, os
from datetime import datetime, timedelta

BASE = os.path.dirname(os.path.abspath(__file__)) + "/.."
STOCK = BASE + "/stock"
os.makedirs(STOCK, exist_ok=True)

def slug(name):
    return name.lower().replace(" ", "_").replace("'", "")

def new_stock(nom, quantite_g, jours_estimes=15):
    s = slug(nom)
    fpath = f"{STOCK}/{s}.csv"
    # Check if already open
    if os.path.exists(fpath):
        with open(fpath) as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row["date_cloture"] == "":
                    print(f"ERREUR: stock {nom} déjà ouvert (depuis {row['date_ouverture']})")
                    sys.exit(1)
    date_ouv = datetime.now().strftime("%Y-%m-%d")
    date_fin = (datetime.now() + timedelta(days=jours_estimes)).strftime("%Y-%m-%d")
    with open(fpath, "a", newline="") as f:
        w = csv.writer(f)
        if os.stat(fpath).st_size == 0 if os.path.exists(fpath) else True:
            pass
        w.writerow(["date_ouverture", "quantite_g", "jours_estimes", "date_fin_estimee", "date_cloture", "consomme_reel_g"])
        w.writerow([date_ouv, quantite_g, jours_estimes, date_fin, "", ""])
    print(f"✓ Stock {nom} ouvert: {quantite_g}g, fin estimée {date_fin}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--nom")
    parser.add_argument("--quantite-g", type=int)
    parser.add_argument("--jours-estimes", type=int, default=15)
    args = parser.parse_args()
    new_stock(args.nom, args.quantite_g, args.jours_estimes)

#!/usr/bin/env python3
"""Cloture un stock produit"""
import csv, sys, os
from datetime import datetime

BASE = os.path.dirname(os.path.abspath(__file__)) + "/.."
STOCK = BASE + "/stock"

def slug(name):
    return name.lower().replace(" ", "_").replace("'", "")

def close_stock(nom, consomme_reel_g=None):
    s = slug(nom)
    fpath = f"{STOCK}/{s}.csv"
    if not os.path.exists(fpath):
        print(f"ERREUR: stock {nom} non trouvé")
        sys.exit(1)
    rows = []
    with open(fpath) as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        if row["date_cloture"] == "":
            date_ouv = datetime.strptime(row["date_ouverture"], "%Y-%m-%d")
            date_clot = datetime.now()
            jours_reels = (date_clot - date_ouv).days
            consigne = row["quantite_g"]
            if consomme_reel_g is None:
                consomme = int(consigne)
            else:
                consomme = consomme_reel_g
            row["date_cloture"] = date_clot.strftime("%Y-%m-%d")
            row["consomme_reel_g"] = consomme
            with open(fpath, "w", newline="") as f:
                w = csv.writer(f)
                w.writerow(["date_ouverture", "quantite_g", "jours_estimes", "date_fin_estimee", "date_cloture", "consomme_reel_g"])
                w.writerow([row["date_ouverture"], row["quantite_g"], row["jours_estimes"], row["date_fin_estimee"], row["date_cloture"], row["consomme_reel_g"]])
            avg = round(consomme / jours_reels, 1) if jours_reels > 0 else 0
            print(f"✓ Stock {nom} clos. Réel: {jours_reels}j, {consomme}g → ~{avg}g/jour")
            return
    print(f"ERREUR: aucun stock ouvert pour {nom}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--nom")
    parser.add_argument("--consomme-g", type=int)
    args = parser.parse_args()
    close_stock(args.nom, args.consomme_g)

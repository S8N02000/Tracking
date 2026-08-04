#!/usr/bin/env python3
"""
add_food.py
===========
Ajoute ou met à jour un aliment dans la base SQLite.

Usage:
    python add_food.py --name "banane" --category fruit \\
        --weight-per-unit 120 --kcal 90 --proteins 1.3 \\
        --carbohydrates 23 --sugars 12 --fiber 2.6 --fat 0.3

    # Avec JSON (plus lisible pour structures complexes)
    python add_food.py --json '{"name":"banane","category":"fruit",...}'

    # Mise à jour si existe (upsert)
    python add_food.py --name "banane" --kcal 95 --upsert

Sortie: ID de l'aliment inséré ou mis à jour.
"""

import json
import sqlite3
import sys
import argparse
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────
BASE = Path(__file__).parent
DB_PATH = BASE / "nutrition.db"

# ── Nutrients accepts par 100g ─────────────────────────────────────────────
NUTRIENTS_100G = [
    # Energie / macros
    "energy_kcal", "proteins", "carbohydrates", "sugars",
    "fiber", "starch", "fat", "saturated_fat", "trans_fat",
    "omega3", "omega6", "omega9",
    # Minéraux
    "salt", "sodium", "cholesterol",
    "calcium", "iron", "magnesium", "potassium",
    "zinc", "phosphorus", "manganese", "copper", "selenium", "iodine",
    # Vitamines
    "vit_a", "vit_b1", "vit_b2", "vit_b3", "vit_b5",
    "vit_b6", "vit_b9", "vit_b12", "vit_c", "vit_d", "vit_e", "vit_k",
]

# Mapping: argument CLI → nom colonne DB
ARG_TO_COL = {
    "name":                "name",
    "brand":               "brand",
    "category":            "category",
    "weight_per_unit":     "weight_per_unit_g",
    "density":             "density_g_ml",
    "default_unit":        "default_unit",
    # Energie / macros
    "energy_kcal":         "energy_kcal_100g",
    "proteins":            "proteins_g_100g",
    "carbohydrates":       "carbohydrates_g_100g",
    "sugars":              "sugars_g_100g",
    "fiber":               "fiber_g_100g",
    "starch":              "starch_g_100g",
    "fat":                 "fat_g_100g",
    "saturated_fat":       "saturated_fat_g_100g",
    "trans_fat":           "trans_fat_g_100g",
    "omega3":              "omega3_g_100g",
    "omega6":              "omega6_g_100g",
    "omega9":              "omega9_g_100g",
    # Minéraux
    "salt":                "salt_g_100g",
    "sodium":              "sodium_mg_100g",
    "cholesterol":         "cholesterol_mg_100g",
    "calcium":             "calcium_mg_100g",
    "iron":                "iron_mg_100g",
    "magnesium":           "magnesium_mg_100g",
    "potassium":           "potassium_mg_100g",
    "zinc":                "zinc_mg_100g",
    "phosphorus":          "phosphorus_mg_100g",
    "manganese":           "manganese_mg_100g",
    "copper":              "copper_mg_100g",
    "selenium":            "selenium_mg_100g",
    "iodine":              "iodine_mg_100g",
    # Vitamines
    "vit_a":               "vit_a_mcg_100g",
    "vit_b1":              "vit_b1_mg_100g",
    "vit_b2":              "vit_b2_mg_100g",
    "vit_b3":              "vit_b3_mg_100g",
    "vit_b5":              "vit_b5_mg_100g",
    "vit_b6":              "vit_b6_mg_100g",
    "vit_b9":              "vit_b9_mcg_100g",
    "vit_b12":             "vit_b12_mcg_100g",
    "vit_c":               "vit_c_mg_100g",
    "vit_d":               "vit_d_mcg_100g",
    "vit_e":               "vit_e_mg_100g",
    "vit_k":                "vit_k_mcg_100g",
    # Meta
    "source":              "source",
    "notes":               "notes",
}


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Ajoute un aliment à la base SQLite")
    p.add_argument("--json", type=str, help="Données JSON (alternative aux arguments)")
    p.add_argument("--upsert", action="store_true",
                   help="Met à jour si l'aliment existe déjà")
    p.add_argument("--dry-run", action="store_true",
                   help="Affiche la requête sans exécuter")

    # Arguments directs
    for arg in ARG_TO_COL:
        if arg in ("name", "category"):
            p.add_argument(f"--{arg}", required=True)
        else:
            p.add_argument(f"--{arg}", type=str, default=None)

    return p


def normalise_key(k: str) -> str:
    """Normalise une clé JSON pour correspondre aux arguments CLI."""
    return k.lower().replace("-", "_").replace(" ", "_")


def build_insert_data(args, json_data) -> dict:
    """
    Fusionne args + JSON → dict {colonne: valeur}.
    Valide les champs requis.
    """
    data = {}

    # 1. JSON brute
    if json_data:
        for k, v in json_data.items():
            nk = normalise_key(k)
            if nk in ARG_TO_COL:
                data[ARG_TO_COL[nk]] = v

    # 2. Arguments CLI (priorité sur JSON)
    for arg, col in ARG_TO_COL.items():
        val = getattr(args, arg, None)
        if val is not None and val != "":
            data[col] = val

    # 3. Validation champs requis
    if "name" not in data or not data["name"]:
        raise ValueError("Champ 'name' est requis")
    if "category" not in data or not data["category"]:
        raise ValueError("Champ 'category' est requis")

    # 4. Defaults
    data.setdefault("default_unit", "g")
    data.setdefault("density_g_ml", 1.0)
    data.setdefault("is_active", 1)
    data.setdefault("source", data.get("source", "user_input"))

    # 5. Conversion str → float pour les nutriments numériques
    #    (les arguments CLI arrivent en str via argparse)
    numeric_cols = [v for v in ARG_TO_COL.values()
                    if v not in ("name", "brand", "category", "default_unit",
                                 "source", "notes", "is_active")]
    for col in numeric_cols:
        if col in data and data[col] is not None:
            try:
                data[col] = float(data[col])
            except (ValueError, TypeError):
                data[col] = None

    return data


def upsert_food(data: dict, dry_run: bool = False) -> int:
    """
    INSERT ou UPDATE l'aliment.
    Returns food_id.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row

    try:
        # Vérifie si existe
        existing = conn.execute(
            "SELECT id, name FROM foods WHERE name = ?",
            (data["name"],)
        ).fetchone()

        if existing:
            if not data.get("_upsert"):
                conn.close()
                raise ValueError(
                    f"Aliment '{data['name']}' existe déjà (id={existing['id']}). "
                    "Utilise --upsert pour mettre à jour."
                )
            # UPDATE
            data.pop("_upsert", None)
            cols = [k for k in data if k != "name"]
            set_clause = ", ".join(f"{c} = ?" for c in cols)
            vals = [data[c] for c in cols]
            vals.append(data["name"])
            sql = f"UPDATE foods SET {set_clause}, updated_at = date('now') WHERE name = ?"
            if dry_run:
                conn.close()
                print(f"[DRY RUN] {sql}")
                print(f"  params: {vals}")
                return existing["id"]
            conn.execute(sql, vals)
            conn.commit()
            food_id = existing["id"]
            action = "updated"

        else:
            # INSERT
            cols = list(data.keys())
            placeholders = ", ".join(["?"] * len(cols))
            sql = f"INSERT INTO foods ({', '.join(cols)}) VALUES ({placeholders})"
            if dry_run:
                conn.close()
                print(f"[DRY RUN] {sql}")
                print(f"  params: {list(data.values())}")
                return -1
            cursor = conn.execute(sql, list(data.values()))
            conn.commit()
            food_id = cursor.lastrowid
            action = "inserted"

        print(f"✅ Aliment {action}: id={food_id}, name='{data['name']}'")

        # Affiche nutriments saisis
        nut_cols = [c for c in data if "100g" in c and data[c] is not None]
        if nut_cols:
            nut_summary = ", ".join(
                f"{c.replace('_100g','')}={data[c]}" for c in sorted(nut_cols)
            )
            print(f"   Nutrients: {nut_summary}")

        conn.close()
        return food_id

    except sqlite3.Error as e:
        conn.close()
        raise RuntimeError(f"Erreur SQLite: {e}")


def main():
    parser = build_parser()
    args = parser.parse_args()

    # Collecte JSON
    json_data = {}
    if args.json:
        try:
            json_data = json.loads(args.json)
        except json.JSONDecodeError as e:
            print(f"❌ JSON invalide: {e}")
            sys.exit(1)

    # Ajoute upsert flag dans les données
    data = build_insert_data(args, json_data)
    if args.upsert:
        data["_upsert"] = True

    if args.dry_run:
        upsert_food(data, dry_run=True)
    else:
        food_id = upsert_food(data)
        sys.exit(0 if food_id else 1)


if __name__ == "__main__":
    main()

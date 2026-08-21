#!/usr/bin/env python3
"""
add_recipe.py
=============
Ajoute une recette complète avec tous ses ingrédients dans SQLite.

Les nutriments PAR PORTION sont calculés automatiquement en sommant
les nutriments de chaque ingrédient, puis en divisant par le nombre
de portions.

Usage:
    python add_recipe.py --name "poulet curry crème amande" \
        --portions 3 --total-weight 1975 \
        --ingredients "hauts_cuisse_poulet:750g,quinoa:120g,carotte:250g" \
        --description "Faire revenir le poulet..."

    # JSON (recommandé pour recettes complexes)
    python add_recipe.py --json-file recipe.json
    python add_recipe.py --json '{
        "name": "poulet curry crème amande",
        "portions": 3,
        "total_weight_g": 1975,
        "ingredients": [
            {"slug": "hauts_cuisse_poulet", "qty": 250, "unit": "g"},
            {"slug": "quinoa", "qty": 40, "unit": "g"}
        ]
    }'

Transactions: TOUTE la recette est insérée en une seule transaction —
si un ingrédient échoue, RIEN n'est inséré.
"""

import json
import sqlite3
import sys
import argparse
from pathlib import Path
from typing import Optional

BASE = Path(__file__).parent
DB_PATH = BASE / "nutrition.db"

# Champs营养nels à sommer depuis les ingrédients (par 100g → par recette)
NUT_FIELDS = [
    # Energie / macros
    "energy_kcal_100g", "proteins_g_100g", "carbohydrates_g_100g",
    "sugars_g_100g", "fiber_g_100g", "starch_g_100g",
    "fat_g_100g", "saturated_fat_g_100g", "trans_fat_g_100g",
    "omega3_g_100g", "omega6_g_100g", "omega9_g_100g",
    # Minéraux
    "salt_g_100g", "sodium_mg_100g", "cholesterol_mg_100g",
    "calcium_mg_100g", "iron_mg_100g", "magnesium_mg_100g",
    "potassium_mg_100g", "zinc_mg_100g", "phosphorus_mg_100g",
    "manganese_mg_100g", "copper_mg_100g", "selenium_mg_100g",
    "iodine_mg_100g",
    # Vitamines
    "vit_a_mcg_100g", "vit_b1_mg_100g", "vit_b2_mg_100g",
    "vit_b3_mg_100g", "vit_b5_mg_100g", "vit_b6_mg_100g",
    "vit_b9_mcg_100g", "vit_b12_mcg_100g", "vit_c_mg_100g",
    "vit_d_mcg_100g", "vit_e_mg_100g", "vit_k_mcg_100g",
]

# Mapping: suffixe ingrédient → suffixe colonne per_portion
PER_PORTION_MAP = {
    "energy_kcal_100g":   "energy_kcal_per_portion",
    "proteins_g_100g":    "proteins_g_per_portion",
    "carbohydrates_g_100g": "carbohydrates_g_per_portion",
    "sugars_g_100g":     "sugars_g_per_portion",
    "fiber_g_100g":      "fiber_g_per_portion",
    "fat_g_100g":        "fat_g_per_portion",
    "saturated_fat_g_100g": "saturated_fat_g_per_portion",
    "salt_g_100g":       "salt_g_per_portion",
    "calcium_mg_100g":   "calcium_mg_per_portion",
    "iron_mg_100g":      "iron_mg_per_portion",
    "magnesium_mg_100g": "magnesium_mg_per_portion",
    "potassium_mg_100g": "potassium_mg_per_portion",
    "zinc_mg_100g":      "zinc_mg_per_portion",
    "phosphorus_mg_100g": "phosphorus_mg_per_portion",
    "vit_a_mcg_100g":    "vit_a_mcg_per_portion",
    "vit_c_mg_100g":     "vit_c_mg_per_portion",
    "vit_d_mcg_100g":    "vit_d_mcg_per_portion",
    "vit_b12_mcg_100g":  "vit_b12_mcg_per_portion",
    "vit_e_mg_100g":     "vit_e_mg_per_portion",
    "vit_b1_mg_100g":    "vit_b1_mg_per_portion",
    "vit_b2_mg_100g":    "vit_b2_mg_per_portion",
    "vit_b3_mg_100g":    "vit_b3_mg_per_portion",
    "vit_b5_mg_100g":    "vit_b5_mg_per_portion",
    "vit_b6_mg_100g":    "vit_b6_mg_per_portion",
    "vit_b9_mcg_100g":   "vit_b9_mcg_per_portion",
}


# ─── Densité g/ml pour add_recipe (import depuis utils) ─────────────────────
DENSITY_OVERRIDES: dict[str, float] = {
    "huile_olive": 0.915, "huile_coco": 0.925, "huile_tournesol": 0.920,
    "jus_citron":  1.030, "jus_orange":  1.040,
    "sauce_soja":  1.100, "moutarde_forte": 1.100,
    "concentre_tomate": 1.150, "miel": 1.420,
    "lait": 1.030, "creme_fraiche": 1.010,
}

VOLUME_CUISINE_ML: dict[str, float] = {
    "cs": 15.0, "soupe": 15.0, "cc": 5.0, "café": 5.0,
    "minicuillere": 2.5, "ml": 1.0, "l": 1000.0,
    "tranche": 0.0, "unit": 0.0, "portion": 0.0, "g": 1.0,
}


def unit_to_grams(
    quantity: float,
    unit: str,
    slug: str = "",
    weight_per_unit_g: float = 0.0,
    food_id: int = None,
    conn: "sqlite3.Connection" = None,
) -> float:
    """Convertit une quantité + unité en gramme."""
    if quantity <= 0:
        return 0.0
    unit_norm = unit.strip().lower()
    if unit_norm == "portion":
        return float(quantity)
    if unit_norm == "g":
        return float(quantity)
    if unit_norm in ("unit", "tranche", "piece", "p"):
        if weight_per_unit_g <= 0:
            raise ValueError(
                f"'{slug}': unité=unit mais weight_per_unit_g=0. "
                "Utilise 'g' comme unité."
            )
        return float(quantity) * weight_per_unit_g
    vol_ml = VOLUME_CUISINE_ML.get(unit_norm, 0.0)
    if vol_ml > 0:
        # Utilise _get_density pour priorite: DB > DENSITY_OVERRIDES > 1.0
        from utils import _get_density
        density = _get_density(food_id, slug, conn)
        return float(quantity) * vol_ml * density
    return float(quantity)  # fallback: déjà gramme


def slug_to_db_name(slug: str) -> str:
    """Convertit un slug 'hauts_cuisse_poulet' → nom en DB."""
    # On fait une lookup par nom brut dans foods
    return slug.replace("_", " ")


def find_food_by_slug(conn: sqlite3.Connection, slug: str) -> Optional[sqlite3.Row]:
    """Trouve un aliment par slug → name dans la DB. Recherche insensible à la casse.

    Logique de matching (dans l'ordre) :
      1. Nom exact en base (slugWith_underscores)        ← gère les noms en base avec underscore
      2. Slug avec espaces (slugWith_underscores → spaces)
      3. LIKE %slugAs-is%  (insensible à la casse)
      4. LIKE %slugWithSpaces% (underscore → espace)
    """
    saved_factory = conn.row_factory
    conn.row_factory = sqlite3.Row
    try:
        # 1. Cherche tel quel (crée les noms avec underscore en base)
        cur = conn.execute(
            "SELECT * FROM foods WHERE LOWER(name) = LOWER(?) AND is_active = 1",
            (slug,)
        )
        row = cur.fetchone()
        if row:
            return row

        # 2. Remplace _ par espace (slugWith_underscores → name with spaces)
        name_with_spaces = slug.replace("_", " ")
        cur = conn.execute(
            "SELECT * FROM foods WHERE LOWER(name) = LOWER(?) AND is_active = 1",
            (name_with_spaces,)
        )
        row = cur.fetchone()
        if row:
            return row

        # 3. LIKE %slugAs-is%
        cur = conn.execute(
            "SELECT * FROM foods WHERE LOWER(name) LIKE '%' || LOWER(?) || '%' AND is_active = 1 LIMIT 1",
            (slug,)
        )
        row = cur.fetchone()
        if row:
            return row

        # 4. LIKE %slugWithSpaces%
        cur = conn.execute(
            "SELECT * FROM foods WHERE LOWER(name) LIKE '%' || LOWER(?) || '%' AND is_active = 1 LIMIT 1",
            (name_with_spaces,)
        )
        return cur.fetchone()
    finally:
        conn.row_factory = saved_factory


def parse_ingredients_str(ingredients_str: str) -> list[dict]:
    """
    Parse un string 'slug:qty unit,slug:qty unit,...'
    en liste de dicts {slug, qty, unit}.
    """
    items = ingredients_str.split(",")
    result = []
    for item in items:
        item = item.strip()
        if not item:
            continue
        # Format: "slug:qty unit" ou "slug:qtyunit" ou "slug: qty unit"
        # Sépare slug et le reste
        if ":" not in item:
            # Assume tout est le nom, qty=1, unit=unit
            result.append({"slug": item.strip(), "qty": 1.0, "unit": "unit"})
            continue
        slug_part, rest = item.split(":", 1)
        slug = slug_part.strip()
        rest = rest.strip()
        # Try to extract number + unit from rest
        # rest could be: "250g", "250 g", "250", "2 cs", "2cs"
        import re
        m = re.match(r"^([\d.,]+)\s*([a-zA-Zμ]+.*)?$", rest)
        if m:
            qty_str = m.group(1).replace(",", ".")
            qty = float(qty_str)
            unit = m.group(2).strip() if m.group(2) else "g"
        else:
            qty = 1.0
            unit = rest if rest else "g"
        result.append({"slug": slug, "qty": qty, "unit": unit})
    return result


def build_recipe_insert(conn: sqlite3.Connection, data: dict) -> int:
    """
    Insère la recette + ingrédients en une transaction.
    Retourne le recipe_id.
    """
    name         = data["name"]
    portions     = int(data["portions"])
    total_weight = float(data["total_weight_g"])
    ingredients  = data["ingredients"]   # list[dict]
    description  = data.get("description", "")
    source       = data.get("source", "user_input")

    # ── 1. Calcul des nutriments totaux depuis ingrédients ──────────────────
    totals = {f: 0.0 for f in NUT_FIELDS}
    ingredient_details = []  # pour affichage

    for ing in ingredients:
        slug = ing["slug"]
        qty  = float(ing["qty"])
        unit = ing["unit"]
        original_qty = ing.get("original_qty", qty)
        original_unit_ing = ing.get("original_unit", unit)

        food_row = find_food_by_slug(conn, slug)
        if not food_row:
            raise ValueError(
                f"Ingredient non trouvé en base: '{slug}'. "
                "Ajoute-le d'abord avec add_food.py"
            )
        food_id = dict(food_row)["id"]
        weight_per_unit = dict(food_row).get("weight_per_unit_g", 0.0)

        qty_g = unit_to_grams(qty, unit, slug, weight_per_unit, food_id=food_id, conn=conn)
        factor = qty_g / 100.0

        ing_detail = {
            "food_id": food_id,
            "name": dict(food_row)["name"],
            "slug": slug,
            "quantity_g": qty_g,
            "original_qty": original_qty,
            "original_unit": original_unit_ing,
        }
        ingredient_details.append(ing_detail)

        # Accumule nutriments
        for f in NUT_FIELDS:
            v = dict(food_row).get(f)
            if v is not None:
                totals[f] += float(v) * factor

    # ── 2. Prépare les colonnes per_portion ───────────────────────────────
    per_portion = {}
    for from_col, to_col in PER_PORTION_MAP.items():
        per_portion[to_col] = round(totals[from_col] / portions, 3) if portions > 0 else 0.0

    # Champs additionnels (non dans PER_PORTION_MAP mais utiles)
    per_portion["omega3_g_per_portion"]     = round(totals.get("omega3_g_100g", 0) / portions, 3)
    per_portion["omega6_g_per_portion"]     = round(totals.get("omega6_g_100g", 0) / portions, 3)

    # Filtre les colonnes per_portion qui n'existent pas dans recipes (évite OperationalError)
    existing_recipe_cols = {r[1] for r in conn.execute("PRAGMA table_info(recipes)").fetchall()}
    per_portion_filtered = {k: v for k, v in per_portion.items() if k in existing_recipe_cols}
    missing = set(per_portion) - set(per_portion_filtered)
    if missing:
        print(f"   ⚠️  Colonnes non existantes dans recipes, ignorées: {missing}")

    # ── 3. Insert recipe ───────────────────────────────────────────────────
    recipe_cols = [
        "name", "description", "portions", "total_weight_g",
        "is_active", "source",
    ] + list(per_portion_filtered.keys())
    recipe_vals = [
        name, description, portions, total_weight,
        1, source,
    ] + list(per_portion_filtered.values())

    placeholders = ", ".join(["?"] * len(recipe_cols))
    sql = f"INSERT INTO recipes ({', '.join(recipe_cols)}) VALUES ({placeholders})"
    cursor = conn.execute(sql, recipe_vals)
    recipe_id = cursor.lastrowid

    # ── 4. Insert recipe_ingredients ───────────────────────────────────────
    for ing in ingredient_details:
        conn.execute(
            """
            INSERT INTO recipe_ingredients
                (recipe_id, food_id, quantity_g, original_unit, original_qty)
            VALUES (?, ?, ?, ?, ?)
            """,
            (recipe_id, ing["food_id"], ing["quantity_g"],
             ing["original_unit"], ing["original_qty"])
        )

    return recipe_id, ingredient_details, per_portion


def add_recipe(data: dict, dry_run: bool = False) -> int:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row

    try:
        # Check si recette existe déjà
        existing = conn.execute(
            "SELECT id FROM recipes WHERE name = ? AND is_active = 1",
            (data["name"],)
        ).fetchone()
        if existing:
            conn.close()
            raise ValueError(
                f"Recette '{data['name']}' existe déjà (id={existing['id']}). "
                "Supprime-la d'abord ou utilise un autre nom."
            )

        if dry_run:
            recipe_id, details, per_portion = build_recipe_insert(conn, data)
            conn.rollback()
            print(f"[DRY RUN] Recipe: {data['name']}")
            print(f"  portions={data['portions']}, total_weight={data['total_weight_g']}g")
            print(f"  Ingrédients ({len(details)}):")
            for d in details:
                print(f"    - {d['name']}: {d['quantity_g']:.1f}g")
            print(f"  Nutrients per portion: {per_portion}")
            conn.close()
            return -1

        conn.execute("BEGIN TRANSACTION")
        recipe_id, details, per_portion = build_recipe_insert(conn, data)
        conn.commit()

        print(f"✅ Recette créée: id={recipe_id}, name='{data['name']}'")
        print(f"   {len(details)} ingrédients | {data['portions']} portions")
        macros = ", ".join(
            f"{k.replace('_per_portion','')[:8]}={v}"
            for k, v in list(per_portion.items())[:5]
        )
        print(f"   Per portion: {macros}")

        conn.close()
        return recipe_id

    except sqlite3.Error as e:
        conn.rollback()
        conn.close()
        raise RuntimeError(f"Erreur SQLite: {e}")


# ─── CLI ───────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Ajoute une recette à la base SQLite")
    p.add_argument("--json", type=str, help="Recette au format JSON (string)")
    p.add_argument("--json-file", type=str, help="Fichier JSON de recette")
    p.add_argument("--dry-run", action="store_true", help="Affiche sans insérer")
    return p


def main():
    parser = build_parser()
    args = parser.parse_args()

    # Charge données
    if args.json_file:
        with open(args.json_file) as f:
            data = json.load(f)
    elif args.json:
        data = json.loads(args.json)
    else:
        print("❌ Fournis --json ou --json-file")
        sys.exit(1)

    # Validation minimale
    required = ["name", "portions", "total_weight_g", "ingredients"]
    for field in required:
        if field not in data:
            print(f"❌ Champ requis manquant: {field}")
            sys.exit(1)
    if not isinstance(data["ingredients"], list) or not data["ingredients"]:
        print("❌ 'ingredients' doit être une liste non vide")
        sys.exit(1)

    # Normalise ingrédients
    normalized_ings = []
    for ing in data["ingredients"]:
        if isinstance(ing, str):
            # "slug:qty unit" format
            parsed = parse_ingredients_str(ing)
            normalized_ings.extend(parsed)
        elif isinstance(ing, dict):
            normalized_ings.append({
                "slug":  ing.get("slug", ing.get("name", "")),
                "qty":   float(ing.get("qty", ing.get("quantity", 1))),
                "unit":  ing.get("unit", ing.get("unit", "g")),
                "original_qty":  float(ing.get("qty", ing.get("quantity", 1))),
                "original_unit": ing.get("unit", ing.get("unit", "g")),
            })
    data["ingredients"] = normalized_ings

    add_recipe(data, dry_run=args.dry_run)
    sys.exit(0)


if __name__ == "__main__":
    main()

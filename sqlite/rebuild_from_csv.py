#!/usr/bin/env python3
"""
rebuild_from_csv.py
====================
Migre COMPLETEMENT les données depuis les CSV legacy (foods/, recipes/)
vers la base SQLite. Utilisé une seule fois — après quoi TOUTES les
écritures passent par les scripts SQLite (add_food.py, log_meal.py…).

Les CSV RESTENT intacts — ce script ne fait que LIRE.

Usage:
    python rebuild_from_csv.py         # dry run (affiche ce qui serait fait)
    python rebuild_from_csv.py --write  # execute la migration
    python rebuild_from_csv.py --write --force  # écrase DB existante
"""

import argparse
import csv
import sqlite3
import sys
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from datetime import date

# ── Paths ──────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
BASE_DIR   = SCRIPT_DIR.parent
FOODS_DIR  = BASE_DIR / "foods"
RECIPES_DIR = BASE_DIR / "recipes"
LOG_DIR    = BASE_DIR / "log"
SPORT_DIR  = BASE_DIR / "sport"
DB_PATH    = SCRIPT_DIR / "nutrition.db"

# Mapping CSV columns → DB columns (foods)
CSV_FOOD_COLS = {
    # csv col → db col
    "nom":                    "name",
    "poids_unite_g":         "weight_per_unit_g",
    "kcal_par_100g":         "energy_kcal_100g",
    "proteines_par_100g":    "proteins_g_100g",
    "glucides_par_100g":    "carbohydrates_g_100g",
    "sucres_par_100g":      "sugars_g_100g",
    "fibres_par_100g":      "fiber_g_100g",
    "amidon_par_100g":       "starch_g_100g",
    "lipides_par_100g":     "fat_g_100g",
    "ags_par_100g":         "saturated_fat_g_100g",
    "agi_par_100g":          None,          # ignored (AGI = acide linoléique conjugate — rare)
    "omega3_par_100g":      "omega3_g_100g",
    "omega6_par_100g":      "omega6_g_100g",
    "omega9_par_100g":      "omega9_g_100g",
    "trans_par_100g":       "trans_fat_g_100g",
    "sel_par_100g":         "salt_g_100g",
    "sodium_par_100g":      "sodium_mg_100g",
    "cholesterol_par_100g":  "cholesterol_mg_100g",
    "vitamine_a_par_100g":  "vit_a_mcg_100g",
    "vitamine_b1_par_100g": "vit_b1_mg_100g",
    "vitamine_b2_par_100g": "vit_b2_mg_100g",
    "vitamine_b3_par_100g": "vit_b3_mg_100g",
    "vitamine_b5_par_100g": "vit_b5_mg_100g",
    "vitamine_b6_par_100g": "vit_b6_mg_100g",
    "vitamine_b9_par_100g": "vit_b9_mcg_100g",
    "vitamine_b12_par_100g":"vit_b12_mcg_100g",
    "vitamine_c_par_100g":  "vit_c_mg_100g",
    "vitamine_d_par_100g":  "vit_d_mcg_100g",
    "vitamine_e_par_100g":  "vit_e_mg_100g",
    "vitamine_k_par_100g":  "vit_k_mcg_100g",
    "calcium_par_100g":     "calcium_mg_100g",
    "fer_par_100g":         "iron_mg_100g",
    "magnesium_par_100g":   "magnesium_mg_100g",
    "potassium_par_100g":   "potassium_mg_100g",
    "zinc_par_100g":        "zinc_mg_100g",
    "phosphore_par_100g":   "phosphorus_mg_100g",
    "manganese_par_100g":   "manganese_mg_100g",
    "cuivre_par_100g":      "copper_mg_100g",
    "selenium_par_100g":    "selenium_mg_100g",
    "iode_par_100g":        "iodine_mg_100g",
}

# Catégorie devinette par nom (si non précisée dans le CSV)
CATEGORY_GUESS = {
    "banane":      "fruit",
    "oeuf":        "oeuf",
    "krisprolls":  "cereale",
    "primevre":    "matière_grasse",
    "sandwich":    "plat_prepare",
    "skyr":        "produit_laitier",
    "carotte":     "legume",
    "courgette":   "legume",
    "poivron":     "legume",
    "quinoa":      "cereale",
    "creme_amande":"matière_grasse",
    "huile_olive": "matière_grasse",
    "poulet":      "viande",
    "cratine":     "supplement",
    "haut_cuisse": "viande",
}

# Mapping CSV → DB pour recipe_ingredients
RECIPE_CSV_FIELDS = {
    "nom":                "name",
    "portions":           "portions",
    "poids_total_g":      "total_weight_g",
    "kcal_par_portion":   "energy_kcal_per_portion",
    "proteines_par_portion":"proteins_g_per_portion",
    "glucides_par_portion":"carbohydrates_g_per_portion",
    "lipides_par_portion": "fat_g_per_portion",
    "fibres_par_portion":  "fiber_g_per_portion",
    "sel_par_portion":     "salt_g_per_portion",
    "calcium_par_portion": "calcium_mg_per_portion",
    "fer_par_portion":     "iron_mg_per_portion",
    "magnesium_par_portion":"magnesium_mg_per_portion",
    "potassium_par_portion":"potassium_mg_per_portion",
    "zinc_par_portion":    "zinc_mg_per_portion",
    "phosphore_par_portion":"phosphorus_mg_per_portion",
    "selenium_par_portion":  "selenium_mg_per_portion",
    "vitamine_a_par_portion":"vit_a_mcg_per_portion",
    "vitamine_b1_par_portion":"vit_b1_mg_per_portion",
    "vitamine_b2_par_portion":"vit_b2_mg_per_portion",
    "vitamine_b3_par_portion":"vit_b3_mg_per_portion",
    "vitamine_b5_par_portion":"vit_b5_mg_per_portion",
    "vitamine_b6_par_portion":"vit_b6_mg_per_portion",
    "vitamine_b9_par_portion":"vit_b9_mcg_per_portion",
    "vitamine_b12_par_portion":"vit_b12_mcg_per_portion",
    "vitamine_c_par_portion":"vit_c_mg_per_portion",
    "vitamine_d_par_portion":"vit_d_mcg_per_portion",
    "vitamine_e_par_portion":"vit_e_mg_per_portion",
    "omega3_par_portion":  "omega3_g_per_portion",
    "omega6_par_portion":  "omega6_g_per_portion",
    "omega9_par_portion":  "omega9_g_per_portion",
    "ingredients":          "_ingredients_raw",
}


def to_float(val):
    """Convertit une valeur CSV en float, ou None."""
    if val is None:
        return None
    val = str(val).strip()
    if not val:
        return None
    try:
        return float(val.replace(",", "."))
    except ValueError:
        return None


def _strip_accents(s: str) -> str:
    """Remove diacritics: é→e, è→e, ç→c, etc."""
    if not s:
        return s
    n = unicodedata.normalize("NFD", s)
    return "".join(c for c in n if c.isascii() or c == " ").strip()


def slugify(name: str) -> str:
    """Slugify: minuscule, sans accents, underscores."""
    if not name:
        return ""
    n = _strip_accents(name.lower())
    n = re.sub(r"[^a-z0-9\s]", " ", n)
    n = re.sub(r"\s+", "_", n.strip())
    return n.strip("_")


def read_foods() -> list[dict]:
    """Lit tous les CSV foods et retourne une liste de dicts DB-ready."""
    foods = []
    for csv_file in sorted(FOODS_DIR.glob("*.csv")):
        if csv_file.name == "index.csv":
            continue
        with open(csv_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            if not rows:
                continue
            row = rows[0]

        # Construit dict DB-ready
        db_row = {}
        for csv_col, db_col in CSV_FOOD_COLS.items():
            if db_col is None:
                continue
            raw_val = row.get(csv_col, "")
            if db_col in ("name",):
                db_row[db_col] = raw_val.strip()
            elif db_col in ("weight_per_unit_g",):
                v = to_float(raw_val)
                if v is not None:
                    db_row[db_col] = v
            else:
                v = to_float(raw_val)
                if v is not None:
                    db_row[db_col] = v

        if "name" not in db_row or not db_row["name"]:
            db_row["name"] = csv_file.stem.replace("_", " ")

        # Store filename slug for fallback matching (log CSV uses file slugs)
        db_row["_file_slug"] = csv_file.stem

        # Catégorie
        if "category" not in db_row:
            name_lower = db_row.get("name", "").lower()
            guessed = None
            for key, cat in CATEGORY_GUESS.items():
                if key in name_lower:
                    guessed = cat
                    break
            db_row["category"] = guessed or "autre"

        # Defaults
        db_row.setdefault("default_unit", "g")
        db_row.setdefault("density_g_ml", 1.0)
        db_row.setdefault("is_active", 1)
        db_row.setdefault("source", "ciqual")

        foods.append(db_row)

    return foods


def parse_recipe_ingredients(raw: str, foods_by_name: dict) -> list[dict]:
    """
    Parse 'hauts_cuisse_poulet:750;quinoa:120;...'
    en liste de {food_id, quantity_g, original_unit, original_qty}.
    """
    ingredients = []
    if not raw:
        return ingredients
    for item in raw.split(";"):
        item = item.strip()
        if not item:
            continue
        if ":" not in item:
            continue
        slug_part, qty_str = item.split(":", 1)
        slug = slug_part.strip()

        # Try to match food by name or slug
        food_row = foods_by_name.get(slug)
        if not food_row:
            # Try with space
            food_row = foods_by_name.get(slug.replace("_", " "))
        if not food_row:
            # Try by slugified name
            for fname, frow in foods_by_name.items():
                if slugify(fname) == slug:
                    food_row = frow
                    break

        if not food_row:
            print(f"    ⚠️  Ingrédient inconnu dans recette: '{slug}' — ignoré")
            continue

        qty = to_float(qty_str) or 1.0
        ingredients.append({
            "food_id":       food_row["id"],
            "name":          food_row["name"],
            "quantity_g":    qty,  # on garde le raw qty en attendant unit_to_grams
            "original_qty":  qty,
            "original_unit": "g",
        })
    return ingredients


def read_recipes(foods_list: list[dict]) -> list[dict]:
    """
    Lit les CSV recipes.
    foods_list: liste de dicts food SANS id (depuis read_foods).
    Retourne les recettes avec les ingrédients en texte brut (slug:qty).
    L'id lookup se fait APRÈS l'insert des foods.
    """
    recipes = []
    for csv_file in sorted(RECIPES_DIR.glob("*.csv")):
        if csv_file.name == "index.csv":
            continue
        with open(csv_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            if not rows:
                continue
            row = rows[0]

        db_row = {}
        raw_ingredients = ""
        for csv_col, db_col in RECIPE_CSV_FIELDS.items():
            if db_col is None:
                continue
            if db_col == "_ingredients_raw":
                raw_ingredients = row.get(csv_col, "")
                continue
            v = to_float(row.get(csv_col, ""))
            db_row[db_col] = v

        # name vient du CSV 'nom' (si présent) sinon du nom de fichier
        # Stocké dans "_name" pour survivre au pop("name") dans migrate()
        csv_name = row.get("nom", "")
        name = csv_name.strip() if csv_name else csv_file.stem.replace("_", " ")
        db_row["_name"] = name

        db_row.setdefault("is_active", 1)
        db_row.setdefault("source", "ciqual")
        db_row.setdefault("description", "")

        # Parse les ingrédients en texte brut pour résolution plus tard
        # (slug:qty;slug2:qty2)
        recipes.append({**db_row, "_ingredients_raw": raw_ingredients})

    return recipes


def read_logs() -> list[dict]:
    """Lit tous les CSV de log par date."""
    entries = []
    for log_file in sorted(LOG_DIR.rglob("*.csv")):
        date_str = log_file.stem  # '2026-08-03'
        with open(log_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                entry = dict(row)
                entry["_date"] = date_str
                entries.append(entry)
    return entries


def read_sport() -> list[dict]:
    """Lit tous les CSV sport."""
    entries = []
    for sport_file in sorted(SPORT_DIR.glob("*.csv")):
        date_str = sport_file.stem
        with open(sport_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                entry = dict(row)
                entry["_date"] = date_str
                entries.append(entry)
    return entries


def migrate(write: bool = False, force: bool = False):
    """Effectue la migration CSV → SQLite."""

    # ── 1. Lecture des données CSV ─────────────────────────────────────────
    print("📖 Lecture des CSV...")
    foods_data = read_foods()
    print(f"   {len(foods_data)} aliments trouvés")

    recipes_data = read_recipes(foods_data)
    print(f"   {len(recipes_data)} recettes trouvées")

    logs_data  = read_logs()
    print(f"   {len(logs_data)} entrées de log trouvées")

    sport_data = read_sport()
    print(f"   {len(sport_data)} entrées sport trouvées")

    if not write:
        print("\n[DRY RUN] Lance avec --write pour exécuter la migration.")
        print("\n--- Aliments ---")
        for f in foods_data:
            print(f"  {f['name']} ({f.get('category','?')})")
        print("\n--- Recettes ---")
        for r in recipes_data:
            ings = r.get("_ingredients", [])
            print(f"  {r['name']} ({r.get('portions','?')}p, {len(ings)} ingrédients)")
            for i in ings:
                print(f"    - {i['name']}: {i['quantity_g']}g")
        print("\n--- Logs (extraits) ---")
        for l in logs_data[:3]:
            print(f"  {l.get('_date')} {l.get('aliment', l.get('period', '?'))}")
        if len(logs_data) > 3:
            print(f"  ... et {len(logs_data)-3} autres")
        return

    # ── 2. Connexion DB ───────────────────────────────────────────────────
    if force and DB_PATH.exists():
        DB_PATH.unlink()
        print(f"\n🗑  Ancienne DB supprimée ({DB_PATH})")

    if not DB_PATH.exists():
        # Lance init_db.py
        sys.path.insert(0, str(SCRIPT_DIR))
        import init_db
        init_db.init_db(force=False)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    conn.execute("BEGIN TRANSACTION")

    try:
        # ── 3. Insert foods ───────────────────────────────────────────────
        print("\n📦 Insertion des aliments...")
        food_ids = {}         # name (from DB) → id
        food_ids_lower = {}   # lower name → id  (for case-insensitive match)
        food_ids_slug = {}    # slugified(name) → id (for filename slug match)
        food_ids_by_file_slug = {}  # filename stem → id (for exact log slug match)
        for food in foods_data:
            name = food["name"]
            name_lower = name.lower()
            file_slug = food.get("_file_slug", "")
            cols = [k for k in food.keys() if k != "_file_slug"]
            placeholders = ", ".join(["?"] * len(cols))
            sql = f"INSERT OR IGNORE INTO foods ({', '.join(cols)}) VALUES ({placeholders})"
            cur = conn.execute(sql, [food[k] for k in cols])
            row = conn.execute(
                "SELECT id FROM foods WHERE name = ?", (name,)
            ).fetchone()
            fid = row["id"] if row else None
            food_ids[name] = fid
            food_ids_lower[name_lower] = fid
            food_ids_slug[slugify(name)] = fid
            if file_slug:
                food_ids_by_file_slug[file_slug] = fid

        inserted_foods = sum(1 for v in food_ids.values() if v is not None)
        print(f"   ✅ {inserted_foods}/{len(foods_data)} aliments insérés")

        # Construit foods_by_name avec ids pour les recettes
        foods_by_name = {}
        for name, fid in food_ids.items():
            if fid:
                foods_by_name[name] = {"id": fid, "name": name}

        # ── 4. Insert recipes + ingredients ───────────────────────────────
        print("📦 Insertion des recettes...")

        # Get actual DB column names for recipes
        db_cols = set(r[1] for r in conn.execute("PRAGMA table_info(recipes)").fetchall())

        # Recipe name from CSV: "poulet curry crème amande"
        # Recipe filename: "poulet_cuiree_curry_creme_amande.csv"
        # Map CSV name → recipe filename slug
        recipe_name_from_filename = {}
        for csv_file in sorted(RECIPES_DIR.glob("*.csv")):
            if csv_file.name == "index.csv":
                continue
            with open(csv_file, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                if rows:
                    csv_name = rows[0].get("nom", "")
                    recipe_name_from_filename[csv_name] = csv_file.stem

        recipe_ids = {}  # name → id
        for recipe in recipes_data:
            raw_ingredients = recipe.pop("_ingredients_raw")
            name = recipe.pop("_name", name)

            # Filter to only columns that exist in DB
            filtered = {k: v for k, v in recipe.items() if k in db_cols}

            # Restore name (stripped) after filtering
            filtered["name"] = name

            # Insert recipe — use explicit INSERT to surface real errors
            cols = list(filtered.keys())
            placeholders = ", ".join(["?"] * len(cols))
            sql = f"INSERT INTO recipes ({', '.join(cols)}) VALUES ({placeholders})"
            try:
                conn.execute(sql, list(filtered.values()))
                conn.commit()
            except sqlite3.IntegrityError as ex:
                print(f"   ⚠️  Contrainte recette '{name}': {ex}")
                conn.execute("ROLLBACK")
                continue
            except sqlite3.OperationalError as ex:
                print(f"   ⚠️  Erreur SQL recette '{name}': {ex}")
                conn.execute("ROLLBACK")
                continue

            row = conn.execute(
                "SELECT id, name FROM recipes WHERE name = ?", (name,)
            ).fetchone()
            if not row:
                print(f"   ⚠️  Recette non trouvée après insert: {name}")
                continue
            rid = row["id"]
            recipe_ids[name] = rid

            # Resolve + insert ingredients
            ingredients = parse_recipe_ingredients(raw_ingredients, foods_by_name)
            for ing in ingredients:
                food_id = ing["food_id"]
                if food_id is None:
                    continue
                try:
                    conn.execute(
                        """
                        INSERT OR IGNORE INTO recipe_ingredients
                            (recipe_id, food_id, quantity_g, original_unit, original_qty)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (rid, food_id, ing["quantity_g"],
                         ing["original_unit"], ing["original_qty"])
                    )
                except sqlite3.Error as ex:
                    print(f"   ⚠️  Ingrédient {ing['name']} dans {name}: {ex}")

        inserted_recipes = sum(1 for v in recipe_ids.values() if v is not None)
        print(f"   ✅ {inserted_recipes}/{len(recipes_data)} recettes insérées")

        # ── 5. Insert meal_log ───────────────────────────────────────────
        print("📦 Insertion des repas...")
        # Besoin de foods_by_name mis à jour avec IDs
        foods_by_id = {v: k for k, v in food_ids.items() if v}

        log_count = 0
        for log_entry in logs_data:
            date_str = log_entry.get("_date", "")
            # Aliment dans le CSV peut être:
            # - 'krisprolls_complets' (slug) → 'Krisprolls Complets' (DB name)
            # - 'oeuf' (plain) → 'oeuf' (DB name)
            # - 'poulet_cuiree_curry_creme_amande' (recipe slug)
            #   → 'poulet curry crème amande' (DB recipe name)
            # - 'skyr_dlisse_nature' (slug) → 'Skyr Délisse nature' (DB name)
            # Try exact name, then exact lower, then slug match
            aliment = log_entry.get("aliment", "")
            food_id  = food_ids.get(aliment)
            recipe_id_val = recipe_ids.get(aliment)

            if food_id is None and recipe_id_val is None:
                # Try case-insensitive
                food_id = food_ids_lower.get(aliment.lower())
            if food_id is None and recipe_id_val is None:
                # Try by food_ids_slug
                food_id = food_ids_slug.get(slugify(aliment))
            if food_id is None and recipe_id_val is None:
                # Try by exact filename slug (log uses food CSV filenames as slugs)
                food_id = food_ids_by_file_slug.get(aliment)
            if food_id is None and recipe_id_val is None:
                # Try by recipe name from CSV (already inserted)
                recipe_csv_name = next(
                    (rname for rname, rslug in recipe_name_from_filename.items()
                     if slugify(rname) == slugify(aliment) or slugify(rslug) == slugify(aliment)),
                    None
                )
                if recipe_csv_name:
                    recipe_id_val = recipe_ids.get(recipe_csv_name)

            if food_id is None and recipe_id_val is None:
                print(f"   ⚠️  Aliment/recette non résolu: '{aliment}' — ignoré")
                continue

            period = log_entry.get("periode", "collation")
            period_map = {
                "matin": "petit_dejeuner", "midi": "dejeuner",
                "soir": "diner", "collation": "collation"
            }
            period_norm = period_map.get(period.lower(), period)

            quantity_g_raw = to_float(log_entry.get("quantite", "1")) or 1.0
            original_unit = log_entry.get("unite", "unit")
            original_qty = quantity_g_raw

            # Convert quantity + unit → gramme
            quantity_g = quantity_g_raw
            if food_id and original_unit == "unit":
                row = conn.execute(
                    "SELECT weight_per_unit_g FROM foods WHERE id = ?",
                    (food_id,)
                ).fetchone()
                if row and row["weight_per_unit_g"]:
                    quantity_g = quantity_g_raw * row["weight_per_unit_g"]
            elif recipe_id_val and original_unit == "portion":
                # 1 portion = total_weight_g / portions
                row = conn.execute(
                    "SELECT total_weight_g, portions FROM recipes WHERE id = ?",
                    (recipe_id_val,)
                ).fetchone()
                if row and row["total_weight_g"] and row["portions"]:
                    quantity_g = quantity_g_raw * (row["total_weight_g"] / row["portions"])

            logged_at = log_entry.get("horodatage", "")
            if logged_at and date_str:
                logged_at = f"{date_str} {logged_at}:00"

            try:
                conn.execute(
                    """
                    INSERT INTO meal_log
                        (date_, period, food_id, recipe_id, quantity_g,
                         original_unit, original_qty, logged_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (date_str, period_norm, food_id, recipe_id_val,
                     quantity_g, original_unit, original_qty, logged_at or None)
                )
                log_count += 1
            except sqlite3.Error as ex:
                print(f"   ⚠️  Log {date_str} {aliment}: {ex}")

        print(f"   ✅ {log_count} repas insérés")

        # ── 6. Insert sport_log ───────────────────────────────────────────
        print("📦 Insertion du sport...")
        sport_count = 0
        for s in sport_data:
            date_str = s.get("_date", "")
            sport_type = s.get("sport", "autre")
            type_map = {
                "tapis_roulant": "tapis_roulant", "tapis": "tapis_roulant",
                "velo": "velo", "vélo": "velo", "pied": "pied",
                "natation": "natation", "musculation": "musculation",
                "jardin": "jardin",
            }
            sport_norm = type_map.get(sport_type.lower(), "autre")
            duration = int(to_float(s.get("duree_min", "0") or 0) or 0)
            kcal = int(to_float(s.get("kcal_brulees", "")) or None)
            distance = to_float(s.get("distance_km", ""))
            pas = int(to_float(s.get("pas", "")) or 0) or None
            km_iphone = to_float(s.get("km_iphone", ""))
            notes = s.get("notes", "")

            if duration <= 0:
                continue
            try:
                conn.execute(
                    """
                    INSERT INTO sport_log
                        (date_, sport_type, duration_min, kcal_burned,
                         distance_km, pas, km_iphone, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (date_str, sport_norm, duration, kcal,
                     distance, pas, km_iphone, notes or None)
                )
                sport_count += 1
            except sqlite3.Error as ex:
                print(f"   ⚠️  Sport {date_str}: {ex}")

        print(f"   ✅ {sport_count} entrées sport insérées")

        conn.commit()
        conn.close()

        # ── 7. Validation ─────────────────────────────────────────────────
        print("\n🔍 Validation...")
        conn2 = sqlite3.connect(DB_PATH)
        conn2.execute("PRAGMA foreign_keys = ON")
        conn2.row_factory = sqlite3.Row

        food_count = conn2.execute("SELECT COUNT(*) FROM foods").fetchone()[0]
        recipe_count = conn2.execute("SELECT COUNT(*) FROM recipes").fetchone()[0]
        ri_count = conn2.execute("SELECT COUNT(*) FROM recipe_ingredients").fetchone()[0]
        log_count_total = conn2.execute("SELECT COUNT(*) FROM meal_log").fetchone()[0]
        sport_count_total = conn2.execute("SELECT COUNT(*) FROM sport_log").fetchone()[0]

        print(f"   Foods:         {food_count}")
        print(f"   Recipes:       {recipe_count}")
        print(f"   Recipe ing:    {ri_count}")
        print(f"   Meal logs:     {log_count_total}")
        print(f"   Sport logs:    {sport_count_total}")

        # Test: bilan 2026-08-03
        cur = conn2.execute(
            "SELECT SUM(quantity_g) FROM meal_log WHERE date_ = '2026-08-03'"
        )
        total_q = cur.fetchone()[0]
        print(f"   Total qty 2026-08-03: {total_q}g")

        conn2.close()

    except Exception as ex:
        conn.rollback()
        conn.close()
        print(f"❌ Migration échouée: {ex}")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migre les CSV legacy → SQLite")
    parser.add_argument("--write", action="store_true", help="Exécute la migration")
    parser.add_argument("--force", action="store_true", help="Recrée la DB from scratch")
    args = parser.parse_args()

    if args.force and not args.write:
        print("❌ --force requiert --write")
        sys.exit(1)

    migrate(write=args.write, force=args.force)

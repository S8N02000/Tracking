"""
nutrition/sqlite/utils.py
========================
Helpers SQLite centralisés — connexion, helpers de conversion,
validation, helpers de query. Tous les autres scripts importent
depuis ce module.
"""

from __future__ import annotations

import math
import re
import sqlite3
import unicodedata
from datetime import date, datetime
from pathlib import Path
from typing import Optional, Any

# ─── Module aliases (to break circular imports) ────────────────────────────────
# Imported late inside functions to avoid circular dependencies.
# Aliases give modules stable short names.
_add_food_mod = None
_add_recipe_mod = None
_log_meal_mod = None
_log_sport_mod = None


def _get_add_food():
    global _add_food_mod
    if _add_food_mod is None:
        import add_food as m; _add_food_mod = m
    return _add_food_mod


def _get_add_recipe():
    global _add_recipe_mod
    if _add_recipe_mod is None:
        import add_recipe as m; _add_recipe_mod = m
    return _add_recipe_mod


def _get_log_meal():
    global _log_meal_mod
    if _log_meal_mod is None:
        import log_meal as m; _log_meal_mod = m
    return _log_meal_mod


def _get_log_sport():
    global _log_sport_mod
    if _log_sport_mod is None:
        import log_sport as m; _log_sport_mod = m
    return _log_sport_mod

# ─── Paths ──────────────────────────────────────────────────────────────────

DB_PATH   = Path(__file__).parent / "nutrition.db"
SCHEMA_PATH = Path(__file__).parent / "schema.sql"


# ─── Densité g/ml par aliment (liquides) ────────────────────────────────────
# Source: USDA / Ciqual approx.
# Usage: densité = DENSITIES.get(slug, {}).get('density', 1.0)
DENSITY_OVERRIDES: dict[str, float] = {
    # Huiles
    "huile_olive":              0.915,
    "huile_coco":               0.925,
    "huile_tournesol":          0.920,
    "huile_colza":              0.920,
    # Jus / citrons
    "jus_citron":               1.030,
    "jus_orange":               1.040,
    # Condiments liquides
    "sauce_soja":               1.100,
    "vinaigre":                 1.005,
    "moutarde_forte":           1.100,  # densité > 1 (epaisse)
    "concentre_tomate":         1.150,  # pâte tomate très épaisse
    # Sucres / sirops
    "miel":                     1.420,
    "sirop_erable":             1.370,
    "sirop_glucose":            1.400,
    # Boissons
    "lait":                     1.030,
    "creme_fraiche":            1.010,
    "eau":                      1.000,
}

# Cuillères standard (ml) — usuel en France
VOLUME_CUISINE_ML: dict[str, float] = {
    "cs":      15.0,   # cuillère à soupe
    "soupe":   15.0,
    "cc":       5.0,   # cuillère à café
    "café":     5.0,
    "minicuillere": 2.5,
    "ml":       1.0,
    "l":     1000.0,
    "tranche":  25.0,   # pain / charcuterie — approximation
    "unit":      0.0,   # quantité = 1 × weight_per_unit_g
    "portion":   0.0,   # quantity_g déjà en gramme
    "g":         1.0,
}


# ─── Connexion avec context manager ──────────────────────────────────────────

def get_conn() -> sqlite3.Connection:
    """Ouvre une connexion WAL, busy_timeout 5s, row_factory = Row."""
    if not DB_PATH.exists():
        raise FileNotFoundError(
            f"Base SQLite introuvable: {DB_PATH}\n"
            "Lance d'abord: python init_db.py"
        )
    conn = sqlite3.connect(DB_PATH, timeout=5.0)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 5000")
    return conn


def with_conn(func):
    """Décorateur: ouvre/ferme automatiquement la connexion."""
    def wrapper(*args, **kwargs):
        conn = get_conn()
        try:
            return func(conn, *args, **kwargs)
        finally:
            conn.close()
    return wrapper


# ─── Conversion unite → gramme ───────────────────────────────────────────────

def unit_to_grams(
    quantity: float,
    unit: str,
    food_id: Optional[int] = None,
    slug:    Optional[str] = None,
    weight_per_unit_g: Optional[float] = None,
    conn: "sqlite3.Connection" = None,
) -> float:
    """
    Convertit toute unité en gramme.

    Règles:
      - 'g' / 'ml'            → quantity × density
      - 'unit'                → quantity × weight_per_unit_g
      - 'cs', 'cc', 'soupe'  → quantity × VOLUME_CUISINE_ML[unit] × density
      - 'portion'             → quantity (déjà en gramme)
      - 'tranche'             → quantity × 25g × density
      - Inconnu               → quantity (g par défaut)

    Args:
        quantity:        valeur numérique donnée par l'utilisateur
        unit:            unité brute (insensible à la casse, stripspaces)
        food_id:         pour récupérer le weight_per_unit_g si besoin
        slug:            pour densité
        weight_per_unit_g: override
    Returns:
        float gramme
    """
    try:
        quantity_num = float(quantity)
    except (ValueError, TypeError) as e:
        import traceback
        traceback.print_exc()
        raise ValueError(f"quantity ne peut pas être converti en float: {quantity!r}") from e
    if quantity_num <= 0:
        return 0.0

    unit_norm = unit.strip().lower()

    # 'portion' ou 'g' numérique → déjà en gramme
    if unit_norm == "portion":
        return quantity_num
    if unit_norm == "g":
        return quantity_num

    # unit = 1 × weight_per_unit
    if unit_norm in ("unit", "tranche", "piece", "p"):
        try:
            wpu = float(weight_per_unit_g) if weight_per_unit_g is not None else None
        except (ValueError, TypeError):
            import traceback; traceback.print_exc()
            raise ValueError(f"weight_per_unit_g ne peut pas être converti en float: {weight_per_unit_g!r}")
        if wpu is None and food_id is not None and conn is not None:
            # Auto-fetch le weight_per_unit_g depuis la DB
            saved_factory = conn.row_factory
            conn.row_factory = sqlite3.Row
            try:
                row = conn.execute(
                    "SELECT weight_per_unit_g FROM foods WHERE id = ?", (food_id,)
                ).fetchone()
                wpu = float(row["weight_per_unit_g"]) if row else None
            finally:
                conn.row_factory = saved_factory
        if wpu is None:
            raise ValueError(
                f"Aliment (id={food_id}) n'a pas de poids_unite_g défini — "
                f"utilise 'g' comme unité"
            )
        if float(wpu) <= 0:
            raise ValueError(
                f"Aliment sans poids_unite_g défini — "
                f"utilise 'g' comme unité pour {slug or food_id}"
            )
        return quantity_num * wpu

    # Volumes: ml, cs, cc, soupe, café, l
    vol_ml = VOLUME_CUISINE_ML.get(unit_norm, 0.0)
    if vol_ml > 0:
        density = _get_density(food_id, slug, conn)
        return quantity_num * vol_ml * density

    # Fallback: on suppose que c'est déjà en gramme
    return quantity_num


def _get_density(
    food_id: Optional[int],
    slug: Optional[str],
    conn: "sqlite3.Connection",
) -> float:
    """
    Retourne la densité g/ml avec l'ordre de priorité suivant :
      1. density_g_ml de la base (foods.density_g_ml)
      2. DENSITY_OVERRIDES[slug]  (rétrocompatibilité)
      3. 1.0 (défaut)
    """
    # Priorité 1 : DB si food_id dispo
    if food_id is not None and conn is not None:
        saved_factory = conn.row_factory
        conn.row_factory = sqlite3.Row
        try:
            row = conn.execute(
                "SELECT density_g_ml FROM foods WHERE id = ?", (food_id,)
            ).fetchone()
            if row and row["density_g_ml"] is not None:
                return float(row["density_g_ml"])
        finally:
            conn.row_factory = saved_factory

    # Priorité 2 : DENSITY_OVERRIDES (clé = slug)
    if slug:
        override = DENSITY_OVERRIDES.get(slug, {})
        if isinstance(override, dict):
            return float(override.get("density", 1.0))
        return float(override)

    # Priorité 3 : défaut
    return 1.0


# ─── Helpers de query ─────────────────────────────────────────────────────────

def row_to_dict(row):
    """Clone sqlite3.Row → dict. No-op si déjà un dict."""
    if isinstance(row, dict):
        return row
    return dict(zip(row.keys(), row))


def get_food_by_name(conn: sqlite3.Connection, name: str) -> Optional[dict]:
    """Retourne la Row food par nom (actif seulement). Recherche insensible à la casse + substring."""
    saved_factory = conn.row_factory
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.execute(
            "SELECT * FROM foods WHERE is_active = 1 AND LOWER(name) LIKE '%' || LOWER(?) || '%' LIMIT 1",
            (name,)
        )
        row = cur.fetchone()
        return row_to_dict(row) if row else None
    finally:
        conn.row_factory = saved_factory


def get_food_by_id(conn: sqlite3.Connection, food_id: int) -> Optional[dict]:
    saved_factory = conn.row_factory
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.execute(
            "SELECT * FROM foods WHERE id = ? AND is_active = 1",
            (food_id,)
        )
        row = cur.fetchone()
        return row_to_dict(row) if row else None
    finally:
        conn.row_factory = saved_factory


def get_recipe_by_name(conn: sqlite3.Connection, name: str) -> Optional[dict]:
    saved_factory = conn.row_factory
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.execute(
            "SELECT * FROM recipes WHERE name = ? AND is_active = 1",
            (name,)
        )
        row = cur.fetchone()
        return row_to_dict(row) if row else None
    finally:
        conn.row_factory = saved_factory


def get_recipe_by_id(conn: sqlite3.Connection, recipe_id: int) -> Optional[dict]:
    saved_factory = conn.row_factory
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.execute(
            "SELECT * FROM recipes WHERE id = ? AND is_active = 1",
            (recipe_id,)
        )
        row = cur.fetchone()
        return row_to_dict(row) if row else None
    finally:
        conn.row_factory = saved_factory


def list_foods(
    conn: sqlite3.Connection,
    category: Optional[str] = None,
    search:  Optional[str] = None,
    active_only: bool = True,
) -> list[dict]:
    """
    Liste les aliments avec filtre optionnel.
    """
    q = "SELECT * FROM foods WHERE 1=1"
    params: list[Any] = []
    if active_only:
        q += " AND is_active = 1"
    if category:
        q += " AND category = ?"
        params.append(category)
    if search:
        q += " AND (name LIKE ? OR brand LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    q += " ORDER BY name"
    cur = conn.execute(q, params)
    return [row_to_dict(r) for r in cur.fetchall()]


def list_recipes(conn: sqlite3.Connection, active_only: bool = True) -> list[dict]:
    q = "SELECT * FROM recipes"
    if active_only:
        q += " WHERE is_active = 1"
    q += " ORDER BY name"
    cur = conn.execute(q)
    return [row_to_dict(r) for r in cur.fetchall()]


def list_recipe_ingredients(
    conn: sqlite3.Connection, recipe_id: int
) -> list[dict]:
    """Retourne les ingrédients avec nom de l'aliment."""
    cur = conn.execute(
        """
        SELECT ri.*, f.name AS food_name, f.category AS food_category,
               f.energy_kcal_100g, f.proteins_g_100g,
               f.carbohydrates_g_100g, f.fat_g_100g,
               f.saturated_fat_g_100g, f.fiber_g_100g,
               f.sugars_g_100g, f.salt_g_100g,
               f.calcium_mg_100g, f.iron_mg_100g,
               f.magnesium_mg_100g, f.potassium_mg_100g,
               f.zinc_mg_100g, f.vit_c_mg_100g,
               f.vit_d_mcg_100g, f.vit_b12_mcg_100g
        FROM recipe_ingredients ri
        JOIN foods f ON f.id = ri.food_id
        WHERE ri.recipe_id = ?
        ORDER BY ri.id
        """,
        (recipe_id,)
    )
    return [row_to_dict(r) for r in cur.fetchall()]


# ─── Calcul nutriments pour une quantite donnee ──────────────────────────────

def calc_nutrients_for_quantity(
    food_or_recipe: dict,
    quantity_g: float,
    is_recipe: bool = False,
) -> dict[str, float]:
    """
    Calcule les nutriments pour une quantite donnee.

    Args:
        food_or_recipe: dict issu de get_food_by_* / get_recipe_by_*
        quantity_g:     grammage à calculer
        is_recipe:      True → c'est une recette (utilise _per_portion)

    Returns:
        dict de tous les nutriments avec suffixe _gotten
    """
    q = float(quantity_g)
    if q <= 0:
        return {}

    if is_recipe:
        portions        = float(food_or_recipe.get("portions", 1) or 1)
        total_weight    = float(food_or_recipe.get("total_weight_g", 0) or 1)
        weight_per_port = total_weight / portions
        # quantité de portion = q / weight_per_port
        portions_consumed = q / weight_per_port if weight_per_port > 0 else 0.0
        factor = portions_consumed
        prefix = ""
    else:
        factor = q / 100.0
        prefix = ""

    def g(field: str) -> float:
        v = food_or_recipe.get(field, 0.0)
        return (float(v) * factor) if v is not None else 0.0

    result = {
        "quantity_g":             q,
        f"{prefix}kcal":          g("energy_kcal_100g") if not is_recipe
                                   else g("energy_kcal_per_portion"),
        f"{prefix}proteins_g":    g("proteins_g_100g") if not is_recipe
                                   else g("proteins_g_per_portion"),
        f"{prefix}carbs_g":      g("carbohydrates_g_100g") if not is_recipe
                                   else g("carbohydrates_g_per_portion"),
        f"{prefix}sugars_g":     g("sugars_g_100g") if not is_recipe
                                   else g("sugars_g_per_portion"),
        f"{prefix}fiber_g":      g("fiber_g_100g") if not is_recipe
                                   else g("fiber_g_per_portion"),
        f"{prefix}fat_g":        g("fat_g_100g") if not is_recipe
                                   else g("fat_g_per_portion"),
        f"{prefix}saturated_g":  g("saturated_fat_g_100g") if not is_recipe
                                   else g("saturated_fat_g_per_portion"),
        f"{prefix}salt_g":       g("salt_g_100g") if not is_recipe
                                   else g("salt_g_per_portion"),
        f"{prefix}calcium_mg":   g("calcium_mg_100g") if not is_recipe
                                   else g("calcium_mg_per_portion"),
        f"{prefix}iron_mg":     g("iron_mg_100g") if not is_recipe
                                   else g("iron_mg_per_portion"),
        f"{prefix}magnesium_mg": g("magnesium_mg_100g") if not is_recipe
                                   else g("magnesium_mg_per_portion"),
        f"{prefix}potassium_mg": g("potassium_mg_100g") if not is_recipe
                                   else g("potassium_mg_per_portion"),
        f"{prefix}zinc_mg":      g("zinc_mg_100g") if not is_recipe
                                   else g("zinc_mg_per_portion"),
        f"{prefix}vit_c_mg":    g("vit_c_mg_100g") if not is_recipe
                                   else g("vit_c_mg_per_portion"),
        f"{prefix}vit_d_mcg":   g("vit_d_mcg_100g") if not is_recipe
                                   else g("vit_d_mcg_per_portion"),
        f"{prefix}vit_b12_mcg": g("vit_b12_mcg_100g") if not is_recipe
                                   else g("vit_b12_mcg_per_portion"),
        f"{prefix}omega3_g":     g("omega3_g_100g") if not is_recipe
                                   else None,
        f"{prefix}omega6_g":    g("omega6_g_100g") if not is_recipe
                                   else None,
    }
    return {k: round(v, 2) for k, v in result.items() if v is not None}


# ─── Validation ──────────────────────────────────────────────────────────────

def validate_period(period: str) -> str:
    """Normalise + valide une période. Raises ValueError."""
    period_norm = period.strip().lower().replace(" ", "_")
    valid = {"petit_dejeuner", "dejeuner", "diner", "collation"}
    if period_norm not in valid:
        raise ValueError(
            f"Période '{period}' invalide. "
            f"Choix: {', '.join(sorted(valid))}"
        )
    return period_norm


def validate_sport_type(sport_type: str) -> str:
    """Normalise + valide un type de sport. Raises ValueError."""
    st_norm = sport_type.strip().lower().replace(" ", "_")
    valid = {
        "tapis_roulant", "velo", "pied", "natation",
        "musculation", "jardin", "autre"
    }
    if st_norm not in valid:
        raise ValueError(
            f"Type sport '{sport_type}' invalide. "
            f"Choix: {', '.join(sorted(valid))}"
        )
    return st_norm


def validate_date(date_str: str) -> str:
    """Valide format ISO YYYY-MM-DD. Raises ValueError."""
    try:
        date.fromisoformat(date_str)
    except (ValueError, TypeError):
        raise ValueError(
            f"Date '{date_str}' invalide. Format attendu: YYYY-MM-DD"
        )
    return date_str


def _normalize_sport_type(sport_type: str) -> str:
    """Return the normalised sport type string (lowercase, spaces→underscores).
    Raises ValueError if the type is not in the ref table."""
    import unicodedata
    s = sport_type.strip().lower()
    # Handle accents
    n = unicodedata.normalize("NFD", s)
    s = "".join(c for c in n if unicodedata.category(c) != "Mn")
    # Spaces → underscores
    s = re.sub(r"\s+", "_", s)
    return validate_sport_type(s)


def _strip_accents(s: str) -> str:
    """Remove diacritics: é→e, è→e, ç→c, â→a, etc."""
    if not s:
        return s
    n = unicodedata.normalize("NFD", s)
    return "".join(c for c in n if unicodedata.category(c) != "Mn")


def to_float(val, default: float = None) -> float | None:
    """Parse a string to float. Accepts ',' or '.' as decimal separator.
    Returns `default` (None) for empty/None values."""
    if val is None or str(val).strip() == "":
        return default
    s = str(val).strip().replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return default


def slugify(name: str) -> str:
    """Produce a readable slug from a name. Normalises accents: crème → creme."""
    if not name:
        return ""
    n = _strip_accents(name.lower())
    n = re.sub(r"[^a-z0-9]+", "_", n).strip("_")
    return n


# ─── Wrapper API (delegates to CLI modules for testability) ───────────────────
# These expose a clean programmatic API that the test suite uses.
# Implementation delegates to the CLI scripts which own the actual logic.

def add_food(conn: sqlite3.Connection, /,  # noqa: N805
             name: str, *,
             energy_kcal_100g: float = None,
             proteins_g_100g: float = None,
             carbohydrates_g_100g: float = None,
             sugars_g_100g: float = None,
             fat_g_100g: float = None,
             saturated_fat_g_100g: float = None,
             fiber_g_100g: float = None,
             salt_g_100g: float = None,
             sodium_mg_100g: float = None,
             calcium_mg_100g: float = None,
             iron_mg_100g: float = None,
             magnesium_mg_100g: float = None,
             potassium_mg_100g: float = None,
             zinc_mg_100g: float = None,
             phosphorus_mg_100g: float = None,
             manganese_mg_100g: float = None,
             copper_mg_100g: float = None,
             selenium_mg_100g: float = None,
             iodine_mg_100g: float = None,
             vit_a_mcg_100g: float = None,
             vit_b1_mg_100g: float = None,
             vit_b2_mg_100g: float = None,
             vit_b3_mg_100g: float = None,
             vit_b5_mg_100g: float = None,
             vit_b6_mg_100g: float = None,
             vit_b9_mcg_100g: float = None,
             vit_b12_mcg_100g: float = None,
             vit_c_mg_100g: float = None,
             vit_d_mcg_100g: float = None,
             vit_e_mg_100g: float = None,
             vit_k_mcg_100g: float = None,
             cholesterol_mg_100g: float = None,
             omega3_g_100g: float = None,
             omega6_g_100g: float = None,
             omega9_g_100g: float = None,
             trans_fat_g_100g: float = None,
             starch_g_100g: float = None,
             category: str = None,
             brand: str = None,
             weight_per_unit_g: float = None,
             default_unit: str = None,
             density_g_ml: float = None,
             is_active: bool = True) -> int:
    """Insert a food and return its id. Raises on constraint error."""
    data = {k: v for k, v in locals().items()
            if v is not None and k not in ("conn",)}
    data["name"] = name
    data.setdefault("category", "autre")
    data.setdefault("default_unit", "g")
    data.setdefault("density_g_ml", 1.0)
    data.setdefault("source", "manual")
    cols = list(data.keys())
    placeholders = ", ".join(["?"] * len(cols))
    sql = f"INSERT INTO foods ({', '.join(cols)}) VALUES ({placeholders})"
    cursor = conn.execute(sql, list(data.values()))
    return cursor.lastrowid


def update_food(conn: sqlite3.Connection, food_id: int, /, **kwargs) -> None:  # noqa: N805
    """Update columns of an existing food."""
    cols = {k: v for k, v in kwargs.items() if v is not None}
    if not cols:
        return
    sets = ", ".join(f"{k} = :{k}" for k in cols)
    cols["id"] = food_id
    conn.execute(f"UPDATE foods SET {sets} WHERE id = :id", cols)


def delete_food(conn: sqlite3.Connection, food_id: int, /) -> None:  # noqa: N805
    """Soft-delete a food (is_active = 0)."""
    conn.execute(
        "UPDATE foods SET is_active = 0, updated_at = CURRENT_TIMESTAMP "
        "WHERE id = ?",
        (food_id,)
    )


def search_foods(conn: sqlite3.Connection, query: str, /) -> list[dict]:  # noqa: N805
    """Search foods by name (insensitive, partial match)."""
    rows = conn.execute(
        "SELECT * FROM foods WHERE is_active = 1 AND name LIKE ? "
        "ORDER BY name LIMIT 20",
        (f"%{query}%",)
    ).fetchall()
    return [row_to_dict(r) for r in rows]


NUTRIENT_COLS = (
    "energy_kcal", "proteins_g", "carbohydrates_g", "sugars_g",
    "fiber_g", "fat_g", "saturated_fat_g", "salt_g",
    "calcium_mg", "iron_mg", "magnesium_mg", "potassium_mg",
    "zinc_mg", "phosphorus_mg", "sodium_mg",
    "vit_a_mcg", "vit_b1_mg", "vit_b2_mg", "vit_b3_mg", "vit_b5_mg",
    "vit_b6_mg", "vit_b9_mcg", "vit_b12_mcg", "vit_c_mg", "vit_d_mcg",
    "vit_e_mg", "selenium_mcg",
)


def add_recipe(conn: sqlite3.Connection, /,  # noqa: N805
               name: str, *,
               portions: float = 1.0,
               ingredients: list[dict] = None,
               total_weight_g: float = None,
               energy_kcal_per_portion: float = None,
               proteins_g_per_portion: float = None,
               carbohydrates_g_per_portion: float = None,
               sugars_g_per_portion: float = None,
               fat_g_per_portion: float = None,
               saturated_fat_g_per_portion: float = None,
               fiber_g_per_portion: float = None,
               salt_g_per_portion: float = None,
               omega3_g_per_portion: float = None,
               omega6_g_per_portion: float = None,
               omega9_g_per_portion: float = None,
               is_active: bool = True) -> int:
    """Insert a recipe and its ingredients, computing per-portion nutrients.
    Returns recipe id.
    """
    # Build data dict from explicit kwargs only (not None except name)
    data = {"name": name, "portions": portions, "is_active": is_active}

    # Compute total_weight_g and nutrients from ingredients
    ingredients = ingredients or []
    total_weight = total_weight_g
    if total_weight is None:
        total_weight = sum(ing.get("quantity_g", 0) for ing in ingredients)

    # Calculate nutrients from ingredients if none explicitly provided
    if energy_kcal_per_portion is None:
        totals = {col: 0.0 for col in NUTRIENT_COLS}
        for ing in ingredients:
            food_row = conn.execute(
                "SELECT * FROM foods WHERE id = ?", (ing["food_id"],)
            ).fetchone()
            if food_row:
                food = dict(food_row)
                q = ing.get("quantity_g", 0) / 100.0
                for col in NUTRIENT_COLS:
                    if col == "energy_kcal":
                        fd_key = "energy_kcal_100g"
                    else:
                        fd_key = col + "_100g"
                    val = food.get(fd_key)
                    if val is not None:
                        totals[col] += val * q
        # Divide by portions for per_portion values
        p = portions if portions else 1
        for col in NUTRIENT_COLS:
            data[col + "_per_portion"] = round(totals[col] / p, 2)
        data["total_weight_g"] = round(total_weight, 1)
    else:
        # Use explicitly provided values
        if total_weight is not None:
            data["total_weight_g"] = total_weight

    # Direct SQL insert for recipe + ingredients.
    # Only include columns that exist in the recipes table.
    RECIPE_COLS = [
        "name", "portions", "total_weight_g",
        "energy_kcal_per_portion", "proteins_g_per_portion",
        "carbohydrates_g_per_portion", "sugars_g_per_portion",
        "fat_g_per_portion", "saturated_fat_g_per_portion",
        "fiber_g_per_portion", "salt_g_per_portion",
        "is_active"
    ]
    cols = [c for c in RECIPE_COLS if c in data]
    vals = [data.get(c) for c in cols]
    cur = conn.execute(
        f"INSERT INTO recipes ({', '.join(cols)}) VALUES ({', '.join(['?']*len(cols))})",
        vals
    )
    recipe_id = cur.lastrowid
    for ing in ingredients:
        conn.execute(
            "INSERT INTO recipe_ingredients "
            "(recipe_id, food_id, quantity_g) VALUES (?, ?, ?)",
            (recipe_id, ing["food_id"], ing.get("quantity_g"))
        )
    return recipe_id


def update_recipe(conn: sqlite3.Connection, recipe_id: int, /, **kwargs) -> None:  # noqa: N805
    """Update columns of an existing recipe."""
    cols = {k: v for k, v in kwargs.items() if v is not None}
    if not cols:
        return
    sets = ", ".join(f"{k} = :{k}" for k in cols)
    cols["id"] = recipe_id
    conn.execute(f"UPDATE recipes SET {sets} WHERE id = :id", cols)


def delete_recipe(conn: sqlite3.Connection, recipe_id: int, /) -> None:  # noqa: N805
    """Soft-delete a recipe (is_active = 0)."""
    conn.execute(
        "UPDATE recipes SET is_active = 0 WHERE id = ?",
        (recipe_id,)
    )


def log_meal(conn: sqlite3.Connection, /,  # noqa: N805
             date_: str,
             period: str,
             *,
             food_id: int = None,
             recipe_id: int = None,
             quantity: float = 1.0,
             unit: str = "g",
             notes: str = "") -> int:
    """Insert a meal log entry. Returns the inserted row id.

    quantity_g est TOUJOURS stocké en grammes (unit_to_grams appliqué).
    quantity + unit sont préservés dans original_unit / original_qty.
    """
    if (food_id is None) == (recipe_id is None):
        raise ValueError("Provide exactly one of food_id or recipe_id, not both, not neither.")

    # Conversion unit → grammes
    original_unit = unit
    original_qty = float(quantity)
    if food_id is not None:
        quantity_g = unit_to_grams(
            quantity=original_qty,
            unit=unit,
            food_id=food_id,
            conn=conn,
        )
    else:
        # Recette: portion = total_weight_g / portions
        if unit.lower() in ("portion", "portion(s)"):
            row = conn.execute(
                "SELECT total_weight_g, portions FROM recipes WHERE id = ?",
                (recipe_id,)
            ).fetchone()
            if row and row["total_weight_g"] and row["portions"]:
                quantity_g = original_qty * (row["total_weight_g"] / row["portions"])
            else:
                quantity_g = original_qty
        else:
            quantity_g = unit_to_grams(quantity=original_qty, unit=unit)

    if quantity_g <= 0:
        raise ValueError(f"Quantité finale doit être > 0 (got {quantity_g})")

    cur = conn.execute(
        "INSERT INTO meal_log "
        "(date_, period, food_id, recipe_id, quantity_g, original_unit, original_qty, notes) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (str(date_), str(period), food_id, recipe_id,
         quantity_g, str(original_unit), original_qty, str(notes))
    )
    return cur.lastrowid


def delete_meal_log(conn: sqlite3.Connection, log_id: int, /) -> None:  # noqa: N805
    """Hard-delete a meal log entry."""
    conn.execute("DELETE FROM meal_log WHERE id = ?", (log_id,))


def get_meal_log(conn: sqlite3.Connection, date_: str = None) -> list[dict]:  # noqa: N805
    """Get all meal log entries for a given date."""
    if date_:
        rows = conn.execute(
            "SELECT * FROM meal_log WHERE date_ = ? ORDER BY id", (str(date_),)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM meal_log ORDER BY id").fetchall()
    return [row_to_dict(r) for r in rows]


def log_sport(conn: sqlite3.Connection, /,  # noqa: N805
              date_: str,
              sport_type: str, *,
              duration_min: int = None,
              kcal_burned: int = None,
              distance_km: float = None,
              pace_kmh: float = None,
              avg_hr_bpm: int = None,
              elevation_m: int = None,
              pas: int = None,
              km_iphone: float = None,
              weight_kg: float = None,
              met: float = None,
              notes: str = "",
              dry_run: bool = False) -> int:
    """Insert a sport log entry. Returns the inserted row id."""
    # Normalise sport type to ref
    type_norm = _normalize_sport_type(sport_type)
    cur = conn.execute(
        "INSERT INTO sport_log "
        "(date_, sport_type, duration_min, kcal_burned, distance_km, "
        "pace_kmh, avg_hr_bpm, elevation_m, pas, km_iphone, "
        "weight_kg, met, notes) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (str(date_), type_norm,
         int(duration_min) if duration_min else None,
         int(kcal_burned) if kcal_burned else None,
         float(distance_km) if distance_km else None,
         float(pace_kmh) if pace_kmh else None,
         int(avg_hr_bpm) if avg_hr_bpm else None,
         int(elevation_m) if elevation_m else None,
         int(pas) if pas else None,
         float(km_iphone) if km_iphone else None,
         float(weight_kg) if weight_kg else None,
         float(met) if met else None,
         str(notes))
    )
    return cur.lastrowid


def delete_sport_log(conn: sqlite3.Connection, sport_id: int, /) -> None:  # noqa: N805
    """Hard-delete a sport log entry."""
    conn.execute("DELETE FROM sport_log WHERE id = ?", (sport_id,))


def get_sport_log(conn: sqlite3.Connection, date_: str = None, /) -> list[dict]:  # noqa: N805
    """Get all sport log entries for a given date."""
    if date_:
        rows = conn.execute(
            "SELECT * FROM sport_log WHERE date_ = ? ORDER BY id", (str(date_),)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM sport_log ORDER BY id").fetchall()
    return [row_to_dict(r) for r in rows]

-- ═══════════════════════════════════════════════════════════════
-- Nutrition Tracker — SQLite Schema & Extensions v1.3
-- ═══════════════════════════════════════════════════════════════

-- 1. LOOKUP TABLES
CREATE TABLE IF NOT EXISTS ref_meal_periods (
    period  TEXT PRIMARY KEY,
    sort_order INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO ref_meal_periods (period, sort_order) VALUES
    ('petit_dejeuner', 1),
    ('dejeuner',      2),
    ('diner',        3),
    ('collation',    4);

CREATE TABLE IF NOT EXISTS ref_sport_types (
    sport_type TEXT PRIMARY KEY
);
INSERT OR IGNORE INTO ref_sport_types (sport_type) VALUES
    ('tapis_roulant'),
    ('velo'),
    ('pied'),
    ('natation'),
    ('musculation'),
    ('jardin'),
    ('autre');

CREATE TABLE IF NOT EXISTS ref_food_categories (
    category TEXT PRIMARY KEY
);
INSERT OR IGNORE INTO ref_food_categories (category) VALUES
    ('produit_laitier'),
    ('viande'),
    ('poisson'),
    ('oeuf'),
    ('legume'),
    ('fruit'),
    ('cereale'),
    ('legumineuse'),
    ('matière_grasse'),
    ('sucre'),
    ('epice'),
    ('condiment'),
    ('boisson'),
    ('supplement'),
    ('plat_prepare'),
    ('autre');

-- 2. FOODS (35 Nutrients)
CREATE TABLE IF NOT EXISTS foods (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL UNIQUE,
    brand           TEXT,
    category        TEXT    NOT NULL REFERENCES ref_food_categories(category),
    weight_per_unit_g REAL,
    default_unit      TEXT    NOT NULL DEFAULT 'g',
    density_g_ml      REAL    NOT NULL DEFAULT 1.0,
    energy_kcal_100g      REAL,
    proteins_g_100g       REAL,
    carbohydrates_g_100g  REAL,
    sugars_g_100g        REAL,
    fiber_g_100g         REAL,
    starch_g_100g         REAL,
    fat_g_100g           REAL,
    saturated_fat_g_100g REAL,
    monounsaturated_fat_g_100g REAL,
    polyunsaturated_fat_g_100g REAL,
    trans_fat_g_100g     REAL,
    omega3_g_100g        REAL,
    omega6_g_100g        REAL,
    omega9_g_100g        REAL,
    salt_g_100g         REAL,
    sodium_mg_100g      REAL,
    cholesterol_mg_100g REAL,
    calcium_mg_100g     REAL,
    iron_mg_100g        REAL,
    magnesium_mg_100g   REAL,
    potassium_mg_100g   REAL,
    zinc_mg_100g        REAL,
    phosphorus_mg_100g  REAL,
    manganese_mg_100g   REAL,
    copper_mg_100g      REAL,
    selenium_mg_100g    REAL,
    iodine_mg_100g      REAL,
    vit_a_mcg_100g   REAL,
    vit_b1_mg_100g   REAL,
    vit_b2_mg_100g   REAL,
    vit_b3_mg_100g   REAL,
    vit_b5_mg_100g   REAL,
    vit_b6_mg_100g   REAL,
    vit_b9_mcg_100g  REAL,
    vit_b12_mcg_100g REAL,
    vit_c_mg_100g    REAL,
    vit_d_mcg_100g   REAL,
    vit_e_mg_100g    REAL,
    vit_k_mcg_100g   REAL,
    source    TEXT    NOT NULL DEFAULT 'ciqual',
    notes     TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT   NOT NULL DEFAULT (date('now')),
    updated_at TEXT   NOT NULL DEFAULT (date('now'))
);

-- 3. RECIPES
CREATE TABLE IF NOT EXISTS recipes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL UNIQUE,
    description     TEXT,
    rating          REAL    CHECK (rating IS NULL OR (rating >= 0 AND rating <= 10)),
    portions        INTEGER NOT NULL CHECK (portions > 0),
    total_weight_g  REAL    NOT NULL CHECK (total_weight_g > 0),
    energy_kcal_per_portion      REAL,
    proteins_g_per_portion       REAL,
    carbohydrates_g_per_portion  REAL,
    sugars_g_per_portion         REAL,
    fiber_g_per_portion          REAL,
    fat_g_per_portion            REAL,
    saturated_fat_g_per_portion REAL,
    salt_g_per_portion          REAL,
    calcium_mg_per_portion      REAL,
    iron_mg_per_portion         REAL,
    magnesium_mg_per_portion    REAL,
    potassium_mg_per_portion    REAL,
    zinc_mg_per_portion         REAL,
    phosphorus_mg_per_portion   REAL,
    vit_a_mcg_per_portion       REAL,
    vit_c_mg_per_portion        REAL,
    vit_d_mcg_per_portion       REAL,
    vit_b12_mcg_per_portion     REAL,
    vit_e_mg_per_portion        REAL,
    vit_b1_mg_per_portion       REAL,
    vit_b2_mg_per_portion       REAL,
    vit_b3_mg_per_portion       REAL,
    vit_b5_mg_per_portion       REAL,
    vit_b6_mg_per_portion       REAL,
    vit_b9_mcg_per_portion      REAL,
    source    TEXT    NOT NULL DEFAULT 'user_input',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT   NOT NULL DEFAULT (date('now')),
    updated_at TEXT   NOT NULL DEFAULT (date('now'))
);

-- 4. RECIPE INGREDIENTS
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id      INTEGER NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
    food_id        INTEGER NOT NULL REFERENCES foods(id) ON DELETE RESTRICT,
    quantity_g     REAL    NOT NULL CHECK (quantity_g >= 0),
    original_unit TEXT,
    original_qty  REAL,
    UNIQUE(recipe_id, food_id)
);

-- 5. MEAL LOG
CREATE TABLE IF NOT EXISTS meal_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date_       TEXT    NOT NULL,
    period      TEXT    NOT NULL REFERENCES ref_meal_periods(period),
    food_id     INTEGER REFERENCES foods(id) ON DELETE RESTRICT,
    recipe_id   INTEGER REFERENCES recipes(id) ON DELETE RESTRICT,
    quantity_g  REAL    NOT NULL CHECK (quantity_g > 0),
    original_unit TEXT,
    original_qty  REAL,
    logged_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    notes       TEXT,
    CHECK (
        (food_id IS NOT NULL AND recipe_id IS NULL) OR
        (food_id IS NULL     AND recipe_id IS NOT NULL)
    )
);

-- 6. SPORT LOG
CREATE TABLE IF NOT EXISTS sport_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    date_           TEXT    NOT NULL,
    sport_type      TEXT    NOT NULL REFERENCES ref_sport_types(sport_type),
    duration_min    INTEGER NOT NULL CHECK (duration_min > 0),
    kcal_burned     INTEGER,
    distance_km     REAL,
    pace_kmh        REAL,
    avg_hr_bpm      INTEGER,
    elevation_m     INTEGER,
    pas             INTEGER,
    km_iphone       REAL,
    weight_kg       REAL,
    met             REAL,
    notes           TEXT,
    logged_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 7. DAILY TARGETS
CREATE TABLE IF NOT EXISTS daily_targets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date_       TEXT    NOT NULL UNIQUE,
    kcal        INTEGER NOT NULL DEFAULT 2000,
    proteins_g  INTEGER NOT NULL DEFAULT 150,
    carbs_g     INTEGER NOT NULL DEFAULT 200,
    fat_g       INTEGER NOT NULL DEFAULT 70,
    fiber_g     INTEGER NOT NULL DEFAULT 30,
    notes       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (date('now'))
);

-- 8. BODY SCANS (Boditrax)
CREATE TABLE IF NOT EXISTS body_scans (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_datetime       TEXT    NOT NULL UNIQUE,
    scan_date           TEXT    NOT NULL,
    weight_kg           REAL,
    fat_mass_kg         REAL,
    fat_free_mass_kg    REAL,
    muscle_mass_kg      REAL,
    bone_mass_kg        REAL,
    water_mass_kg       REAL,
    visceral_fat_rating REAL,
    bmr_kcal            INTEGER,
    metabolic_age       INTEGER,
    bmi                 REAL,
    raw_metrics_json    TEXT,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_meal_date       ON meal_log(date_);
CREATE INDEX IF NOT EXISTS idx_meal_period     ON meal_log(period);
CREATE INDEX IF NOT EXISTS idx_meal_food       ON meal_log(food_id);
CREATE INDEX IF NOT EXISTS idx_meal_recipe     ON meal_log(recipe_id);
CREATE INDEX IF NOT EXISTS idx_sport_date      ON sport_log(date_);
CREATE INDEX IF NOT EXISTS idx_sport_type      ON sport_log(sport_type);
CREATE INDEX IF NOT EXISTS idx_recipe_ing_rec  ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ing_food ON recipe_ingredients(food_id);
CREATE INDEX IF NOT EXISTS idx_foods_category  ON foods(category);
CREATE INDEX IF NOT EXISTS idx_foods_name      ON foods(name);
CREATE INDEX IF NOT EXISTS idx_foods_active    ON foods(is_active);
CREATE INDEX IF NOT EXISTS idx_body_scans_date ON body_scans(scan_date);
CREATE INDEX IF NOT EXISTS idx_body_scans_dt   ON body_scans(scan_datetime);

-- 9. EXPORTS METADATA (pour suivi delta Boditrax entre exports)
CREATE TABLE IF NOT EXISTS exports_metadata (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    export_type     TEXT    NOT NULL,
    last_boditrax_id INTEGER,
    last_export_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(export_type)
);

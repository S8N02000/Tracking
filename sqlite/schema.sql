-- ═══════════════════════════════════════════════════════════════
-- Nutrition Tracker — SQLite Schema v1.0
-- Base: SQLite 3.35+ (full foreign key support, CTE, window funcs)
-- ═══════════════════════════════════════════════════════════════

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;          -- write-ahead logging: crash-safe, concurrent reads
PRAGMA synchronous = NORMAL;       -- balanced durability / speed
PRAGMA busy_timeout = 5000;        -- wait up to 5s for locks
PRAGMA cache_size = -64000;        -- 64 MB page cache
PRAGMA temp_store = MEMORY;
PRAGMA case_sensitive_like = ON;


-- ═══════════════════════════════════════════════════════════════
-- 1. LOOKUP TABLES (reference data — never deleted)
-- ═══════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════
-- 2. FOODS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS foods (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,

    name            TEXT    NOT NULL UNIQUE,
    brand           TEXT,
    category        TEXT    NOT NULL
                    REFERENCES ref_food_categories(category),

    -- Unité de référence (poids d'une unité = 1 tranche, 1 fruit…)
    weight_per_unit_g REAL,
    default_unit      TEXT    NOT NULL DEFAULT 'g',

    -- Densité g/ml pour conversion volume → masse (liquides)
    -- Ex: huile olive 0.92, miel 1.42, eau 1.00
    density_g_ml  REAL    NOT NULL DEFAULT 1.0,

    -- Énergie / macros / 100g
    energy_kcal_100g      REAL,
    proteins_g_100g       REAL,
    carbohydrates_g_100g  REAL,
    sugars_g_100g        REAL,
    fiber_g_100g         REAL,
    starch_g_100g         REAL,
    fat_g_100g           REAL,
    saturated_fat_g_100g REAL,
    trans_fat_g_100g     REAL,
    omega3_g_100g        REAL,
    omega6_g_100g        REAL,
    omega9_g_100g        REAL,

    -- Minéraux / 100g
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

    -- Vitamines / 100g
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

    -- Meta
    source    TEXT    NOT NULL DEFAULT 'ciqual',
    notes     TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,  -- 1=actif, 0=inactif (jamais supprimé)
    created_at TEXT   NOT NULL DEFAULT (date('now')),
    updated_at TEXT   NOT NULL DEFAULT (date('now'))
);


-- ═══════════════════════════════════════════════════════════════
-- 3. RECIPES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recipes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL UNIQUE,
    description     TEXT,
    portions        INTEGER NOT NULL CHECK (portions IN (1,2,3,4,5,6,8)),
    total_weight_g  REAL    NOT NULL CHECK (total_weight_g > 0),

    -- Nutriments PAR PORTION (pré-calculés depuis ingrédients)
    energy_kcal_per_portion      REAL,
    proteins_g_per_portion       REAL,
    carbohydrates_g_per_portion  REAL,
    sugars_g_per_portion         REAL,
    fiber_g_per_portion          REAL,
    fat_g_per_portion            REAL,
    saturated_fat_g_per_portion REAL,
    salt_g_per_portion          REAL,

    -- Minéraux / vitamines par portion
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

    -- Meta
    source    TEXT    NOT NULL DEFAULT 'user_input',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT   NOT NULL DEFAULT (date('now')),
    updated_at TEXT   NOT NULL DEFAULT (date('now'))
);


-- ═══════════════════════════════════════════════════════════════
-- 4. RECIPE INGREDIENTS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id      INTEGER NOT NULL
                   REFERENCES recipes(id) ON DELETE RESTRICT,
    food_id        INTEGER NOT NULL
                   REFERENCES foods(id)  ON DELETE RESTRICT,
    quantity_g     REAL    NOT NULL CHECK (quantity_g >= 0),

    -- Trace de l'entrée originale (saisie utilisateur)
    original_unit TEXT,   -- 'g', 'ml', 'cs', 'cc', 'tranche', 'unit'…
    original_qty  REAL,   -- la valeur numérique telle que donnée

    UNIQUE(recipe_id, food_id)
);


-- ═══════════════════════════════════════════════════════════════
-- 5. MEAL LOG
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS meal_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,

    date_       TEXT    NOT NULL,  -- 'YYYY-MM-DD'
    period      TEXT    NOT NULL
                REFERENCES ref_meal_periods(period),

    -- EXCLUSIVEMENT l'un des deux
    food_id     INTEGER REFERENCES foods(id)   ON DELETE RESTRICT,
    recipe_id   INTEGER REFERENCES recipes(id) ON DELETE RESTRICT,

    -- Gramme consommé (standardisé)
    quantity_g  REAL    NOT NULL CHECK (quantity_g > 0),

    -- Trace de la saisie originale
    original_unit TEXT,
    original_qty  REAL,

    logged_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    notes       TEXT,

    CHECK (
        (food_id IS NOT NULL AND recipe_id IS NULL) OR
        (food_id IS NULL     AND recipe_id IS NOT NULL)
    )
);


-- ═══════════════════════════════════════════════════════════════
-- 6. SPORT LOG
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sport_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    date_           TEXT    NOT NULL,
    sport_type      TEXT    NOT NULL
                    REFERENCES ref_sport_types(sport_type),
    duration_min    INTEGER NOT NULL CHECK (duration_min > 0),
    kcal_burned     INTEGER,

    -- Données appareil
    distance_km     REAL,
    pace_kmh        REAL,
    avg_hr_bpm      INTEGER,
    elevation_m     INTEGER,
    pas             INTEGER,
    km_iphone       REAL,

    -- Contexte
    weight_kg       REAL,
    met             REAL,
    notes           TEXT,

    logged_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);


-- ═══════════════════════════════════════════════════════════════
-- 7. DAILY TARGETS (optionnel, valeurs par défaut)
-- ═══════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════
-- 8. INDEXES (après création des tables)
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_meal_date       ON meal_log(date_);
CREATE INDEX IF NOT EXISTS idx_meal_period     ON meal_log(period);
CREATE INDEX IF NOT EXISTS idx_meal_food       ON meal_log(food_id);
CREATE INDEX IF NOT EXISTS idx_meal_recipe     ON meal_log(recipe_id);
CREATE INDEX IF NOT EXISTS idx_sport_date       ON sport_log(date_);
CREATE INDEX IF NOT EXISTS idx_sport_type      ON sport_log(sport_type);
CREATE INDEX IF NOT EXISTS idx_recipe_ing_rec  ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ing_food ON recipe_ingredients(food_id);
CREATE INDEX IF NOT EXISTS idx_foods_category  ON foods(category);
CREATE INDEX IF NOT EXISTS idx_foods_name      ON foods(name);
CREATE INDEX IF NOT EXISTS idx_foods_active    ON foods(is_active);


-- ═══════════════════════════════════════════════════════════════
-- 9. VUES MATERIALISÉES (pour requêtes fréquentes)
-- ═══════════════════════════════════════════════════════════════

-- Vue: bilan macros par repas pour une journée donnée
-- Usage: SELECT * FROM v_day_meals WHERE date_ = '2026-08-03';
CREATE VIEW IF NOT EXISTS v_day_meals AS
WITH portionized AS (
    SELECT
        ml.date_,
        ml.period,
        ml.quantity_g,
        ml.original_unit,
        ml.original_qty,
        CASE
            WHEN ml.food_id IS NOT NULL THEN f.name
            ELSE r.name || ' (portion)'
        END AS food_name,
        CASE
            WHEN ml.food_id IS NOT NULL THEN
                f.energy_kcal_100g * ml.quantity_g / 100.0
            ELSE
                r.energy_kcal_per_portion * ml.quantity_g /
                    (r.total_weight_g / r.portions)
        END AS kcal,
        CASE
            WHEN ml.food_id IS NOT NULL THEN
                f.proteins_g_100g * ml.quantity_g / 100.0
            ELSE
                r.proteins_g_per_portion * ml.quantity_g /
                    (r.total_weight_g / r.portions)
        END AS proteins_g,
        CASE
            WHEN ml.food_id IS NOT NULL THEN
                f.carbohydrates_g_100g * ml.quantity_g / 100.0
            ELSE
                r.carbohydrates_g_per_portion * ml.quantity_g /
                    (r.total_weight_g / r.portions)
        END AS carbs_g,
        CASE
            WHEN ml.food_id IS NOT NULL THEN
                f.fat_g_100g * ml.quantity_g / 100.0
            ELSE
                r.fat_g_per_portion * ml.quantity_g /
                    (r.total_weight_g / r.portions)
        END AS fat_g
    FROM meal_log ml
    LEFT JOIN foods f    ON f.id = ml.food_id
    LEFT JOIN recipes r  ON r.id = ml.recipe_id
)
SELECT
    date_,
    period,
    food_name,
    original_unit,
    original_qty,
    ROUND(kcal, 1)       AS kcal,
    ROUND(proteins_g, 1) AS proteins_g,
    ROUND(carbs_g, 1)    AS carbs_g,
    ROUND(fat_g, 1)      AS fat_g
FROM portionized;


-- Vue: totals journaliers (repas + sport)
CREATE VIEW IF NOT EXISTS v_day_totals AS
WITH meals AS (
    SELECT
        ml.date_,
        SUM(ml.quantity_g) AS total_food_g,
        SUM(
            CASE
                WHEN ml.food_id IS NOT NULL THEN f.energy_kcal_100g * ml.quantity_g / 100.0
                ELSE r.energy_kcal_per_portion * ml.quantity_g / (r.total_weight_g / r.portions)
            END
        ) AS kcal_in,
        SUM(
            CASE
                WHEN ml.food_id IS NOT NULL THEN f.proteins_g_100g * ml.quantity_g / 100.0
                ELSE r.proteins_g_per_portion * ml.quantity_g / (r.total_weight_g / r.portions)
            END
        ) AS proteins_g,
        SUM(
            CASE
                WHEN ml.food_id IS NOT NULL THEN f.carbohydrates_g_100g * ml.quantity_g / 100.0
                ELSE r.carbohydrates_g_per_portion * ml.quantity_g / (r.total_weight_g / r.portions)
            END
        ) AS carbs_g,
        SUM(
            CASE
                WHEN ml.food_id IS NOT NULL THEN f.fat_g_100g * ml.quantity_g / 100.0
                ELSE r.fat_g_per_portion * ml.quantity_g / (r.total_weight_g / r.portions)
            END
        ) AS fat_g
    FROM meal_log ml
    LEFT JOIN foods f  ON f.id = ml.food_id
    LEFT JOIN recipes r ON r.id = ml.recipe_id
    GROUP BY ml.date_
),
sports AS (
    SELECT date_, SUM(kcal_burned) AS kcal_sport
    FROM sport_log
    GROUP BY date_
)
SELECT
    m.date_,
    ROUND(m.kcal_in, 0)     AS kcal_in,
    ROUND(m.proteins_g, 1)  AS proteins_g,
    ROUND(m.carbs_g, 1)     AS carbs_g,
    ROUND(m.fat_g, 1)       AS fat_g,
    ROUND(m.total_food_g,0) AS total_food_g,
    COALESCE(s.kcal_sport,0) AS kcal_sport,
    ROUND(m.kcal_in - COALESCE(s.kcal_sport,0), 0) AS kcal_net
FROM meals m
LEFT JOIN sports s ON s.date_ = m.date_
ORDER BY m.date_ DESC;

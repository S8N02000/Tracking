# Nutrition Tracker — Base de données & fonctionnement

> Dernière mise à jour : 2026-08-04

---

## 1. Vue d'ensemble

```
foods ← recipe_ingredients ← recipes
   ↑                            ↑
   └──────── meal_log ←─────────┘
              ↑
         sport_log
              ↑
         daily_targets
```

**Principe** : tout ce que tu manges est un `food` ou un `recipe`. Chaque repas est un `meal_log` qui référence un aliment ou une recette avec une quantité. Le sport est séparé dans `sport_log`.

---

## 2. Schéma complet

### 2.0 Tables de référence (lookup tables)

Ces tables contiennent des valeurs autorisées. Elles sont readonly pour l'application.

#### `ref_meal_periods`

| Colonne | Type | Description |
|---------|------|-------------|
| `period` | TEXT PK | Période de repas |
| `sort_order` | INTEGER | Ordre d'affichage |

```
petit_dejeuner (1), dejeuner (2), diner (3), collation (4)
```

#### `ref_sport_types`

| Colonne | Type | Description |
|---------|------|-------------|
| `sport_type` | TEXT PK | Type d'activité |

```
tapis_roulant, velo, pied, natation, musculation, jardin, autre
```

#### `ref_food_categories`

| Colonne | Type | Description |
|---------|------|-------------|
| `category` | TEXT PK | Catégorie alimentaire |

```
produit_laitier, viande, poisson, oeuf, legume, fruit,
cereale, legumineuse, matière_grasse, sucre, epice,
condiment, boisson, supplement, plat_prepare, autre, beurre
```

---

### 2.1 `foods` — Catalogue des aliments

Un aliment = un produit avec des nutriments **par 100g**. Tout est stocké en base 100g, la quantité mangée est appliquée au moment du log.

```sql
CREATE TABLE foods (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL UNIQUE,
    brand           TEXT,
    category        TEXT    NOT NULL REFERENCES ref_food_categories(category),

    -- Unité de référence (poids d'un paquet = 1 "unit")
    weight_per_unit_g REAL,      -- ex: 422g pour la barquette hareng
    default_unit      TEXT NOT NULL DEFAULT 'g',

    -- Densité g/ml (liquides) — sert pour ml → g
    -- Ex: huile olive 0.915, miel 1.420, eau 1.000
    -- ⚠️ Non utilisée par unit_to_grams (voir §4.1)
    density_g_ml  REAL NOT NULL DEFAULT 1.0,

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
    selenium_mg_100g    REAL,   -- ⚠️ stocke des mcg (÷1000 à l'affichage)
    iodine_mg_100g      REAL,   -- ⚠️ stocke des mcg (÷1000 à l'affichage)

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
    source    TEXT NOT NULL DEFAULT 'ciqual',
    notes     TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT   NOT NULL DEFAULT (date('now')),
    updated_at TEXT   NOT NULL DEFAULT (date('now'))
);

CREATE UNIQUE INDEX idx_foods_name     ON foods(name);
CREATE INDEX idx_foods_category        ON foods(category);
CREATE INDEX idx_foods_active         ON foods(is_active);
```

**Note selenium/iode** : la colonne dit `mg_100g` mais stocke des mcg. L'application divise par 1000 à l'affichage.

---

### 2.2 `recipes` — Recettes

Une recette = un plat composé de plusieurs aliments. Les nutriments sont pré-calculés **par portion** à la création. Ils ne sont jamais recalculés automatiquement.

```sql
CREATE TABLE recipes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL UNIQUE,
    description     TEXT,
    portions        INTEGER NOT NULL
                    CHECK (portions IN (1,2,3,4,5,6,8)),
    total_weight_g  REAL NOT NULL
                    CHECK (total_weight_g > 0),

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
    magnesium_mg_per_portion     REAL,
    potassium_mg_per_portion     REAL,
    zinc_mg_per_portion          REAL,
    phosphorus_mg_per_portion    REAL,
    vit_a_mcg_per_portion       REAL,
    vit_c_mg_per_portion        REAL,
    vit_d_mcg_per_portion       REAL,
    vit_b12_mcg_per_portion     REAL,
    vit_e_mg_per_portion        REAL,

    -- Meta
    source    TEXT NOT NULL DEFAULT 'user_input',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT   NOT NULL DEFAULT (date('now')),
    updated_at TEXT   NOT NULL DEFAULT (date('now'))
);
```

**Limitation** : les nutriments sont pré-calculés à la création. Il n'existe pas de script `update_recipe` — pour modifier une recette il faut la supprimer et la recréer. Les repas passés ne sont pas affectés (ils stockent `quantity_g`, pas les nutriments).

---

### 2.3 `recipe_ingredients` — Ingrédients d'une recette

```sql
CREATE TABLE recipe_ingredients (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id      INTEGER NOT NULL
                   REFERENCES recipes(id) ON DELETE RESTRICT,
    food_id        INTEGER NOT NULL
                   REFERENCES foods(id)  ON DELETE RESTRICT,
    quantity_g     REAL    NOT NULL
                   CHECK (quantity_g >= 0),

    -- Trace de l'entrée originale (saisie utilisateur)
    original_unit TEXT,   -- 'g', 'ml', 'cs', 'cc', 'tranche', 'unit'…
    original_qty  REAL,   -- valeur numérique telle que donnée

    UNIQUE(recipe_id, food_id)
);

CREATE INDEX idx_recipe_ing_rec  ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ing_food ON recipe_ingredients(food_id);
```

Cette table est utilisée **uniquement pour construire** la recette. Une fois insérée, modifier `recipe_ingredients` n'a aucun effet sur les `meal_log` existants.

---

### 2.4 `meal_log` — Repas journaliers

```sql
CREATE TABLE meal_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date_       TEXT NOT NULL,          -- 'YYYY-MM-DD'
    period      TEXT NOT NULL
                REFERENCES ref_meal_periods(period),

    -- EXCLUSIVEMENT l'un des deux (CHECK constraint)
    food_id     INTEGER REFERENCES foods(id)   ON DELETE RESTRICT,
    recipe_id   INTEGER REFERENCES recipes(id) ON DELETE RESTRICT,

    -- Gramme consommé (standardisé après conversion)
    quantity_g  REAL NOT NULL
                CHECK (quantity_g > 0),

    -- Trace de la saisie originale
    original_unit TEXT,
    original_qty  REAL,

    logged_at   TEXT NOT NULL DEFAULT (datetime('now')),
    notes       TEXT,

    -- Garantit food_id XOR recipe_id
    CHECK (
        (food_id IS NOT NULL AND recipe_id IS NULL) OR
        (food_id IS NULL     AND recipe_id IS NOT NULL)
    )
);

CREATE INDEX idx_meal_date    ON meal_log(date_);
CREATE INDEX idx_meal_period  ON meal_log(period);
CREATE INDEX idx_meal_food    ON meal_log(food_id);
CREATE INDEX idx_meal_recipe  ON meal_log(recipe_id);
```

---

### 2.5 `sport_log` — Séances sportives

```sql
CREATE TABLE sport_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    date_           TEXT NOT NULL,
    sport_type      TEXT NOT NULL
                    REFERENCES ref_sport_types(sport_type),
    duration_min    INTEGER NOT NULL
                    CHECK (duration_min > 0),
    kcal_burned     INTEGER,   -- estimées par l'appareil

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

    logged_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sport_date  ON sport_log(date_);
CREATE INDEX idx_sport_type  ON sport_log(sport_type);
```

---

### 2.6 `daily_targets` — Cibles journalières

```sql
CREATE TABLE daily_targets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date_       TEXT NOT NULL UNIQUE,
    kcal        INTEGER NOT NULL DEFAULT 2000,
    proteins_g  INTEGER NOT NULL DEFAULT 150,
    carbs_g     INTEGER NOT NULL DEFAULT 200,
    fat_g        INTEGER NOT NULL DEFAULT 70,
    fiber_g      INTEGER NOT NULL DEFAULT 30,
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (date('now'))
);
```

Si aucune cible n'existe pour une date, les valeurs par défaut s'appliquent (2000 kcal, 150P, 200G, 70L, 30 fibres).

---

### 2.7 `stocks` — Suivi d'ouverture des paquets

Permet de suivre quand un paquet a été ouvert et fermé (pour les produits périssables).

```sql
CREATE TABLE stocks (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    food_id             INTEGER NOT NULL REFERENCES foods(id),
    opened_at           TEXT,       -- date d'ouverture
    closed_at           TEXT,       -- date de fin (NULL = encore ouvert)
    initial_quantity_g  REAL,
    notes              TEXT
);
```

---

## 3. Vues materialisées

### 3.1 `v_day_meals` — Décomposition par repas

```sql
CREATE VIEW v_day_meals AS
WITH portionized AS (
    SELECT
        ml.date_, ml.period, ml.quantity_g,
        ml.original_unit, ml.original_qty,
        CASE WHEN ml.food_id IS NOT NULL THEN f.name
             ELSE r.name || ' (portion)' END AS food_name,
        -- kcal, proteins, carbs, fat (formules dans schema.sql)
        ...
    FROM meal_log ml
    LEFT JOIN foods f   ON f.id = ml.food_id
    LEFT JOIN recipes r ON r.id = ml.recipe_id
)
SELECT date_, period, food_name, original_unit, original_qty,
       ROUND(kcal,1) AS kcal, ROUND(proteins_g,1) AS proteins_g,
       ROUND(carbs_g,1) AS carbs_g, ROUND(fat_g,1) AS fat_g
FROM portionized;
```

### 3.2 `v_day_totals` — Totaux journaliers

```sql
CREATE VIEW v_day_totals AS
-- Regroupe tous les meals par date (kcal_in, proteins, carbs, fat)
-- Regroupe tous les sports par date (kcal_sport)
-- Retourne: kcal_in, kcal_sport, kcal_net, proteins, carbs, fat
```

---

## 4. Scripts & fonctionnement

### 4.1 `add_food.py`

```bash
python3 add_food.py \
  --name "Salade Hareng Fumé Pomme (Leclerc)" \
  --category autre \
  --weight_per_unit 422 \
  --default_unit g \
  --energy_kcal 103 \
  --proteins 4.4 \
  --carbohydrates 12 \
  --sugars 0.5 \
  --fat 4.2 \
  --saturated_fat 0.8 \
  --fiber 1.3 \
  --omega3 0.33 \
  --omega6 1.42 \
  --omega9 1.47 \
  --salt 0.9 \
  --sodium 355.45 \
  --potassium 284.36 \
  --phosphorus 75.83 \
  --selenium 0.00711 \
  --iodine 0.00829 \
  --vit_b1 0.19 \
  --vit_b2 0.19 \
  --vit_b3 1.18 \
  --vit_b6 0.19 \
  --vit_b9 11.14 \
  --vit_a 33.18 \
  --vit_b12 2.37 \
  --vit_c 6.52 \
  --vit_d 1.01 \
  --vit_e 0.95 \
  --source etiquette
```

`--dry-run` affiche la requête sans insérer.

### 4.2 `add_recipe.py`

```bash
python3 add_recipe.py \
  --name "Curry Poulet Pommes de Terre" \
  --portions 2 \
  --total_weight_g 600 \
  --ingredients "poulet:200g,curry:30g,pomme_de_terre:300g,huile:20g" \
  --source maison
```

**Workflow** :
1. Fuzzy match chaque ingrédient via `get_food_by_name`
2. `unit_to_grams` convertit en gramme
3. Somme les nutriments de tous les ingrédients
4. Divise par nombre de portions
5. Insert `recipes` + `recipe_ingredients`

`--dry-run` affiche les nutriments calculés.

### 4.3 `log_meal.py`

```bash
python3 log_meal.py \
  --date 2026-08-04 \
  --period dejeuner \
  --food "Salade Hareng" \
  --qty 380 \
  --unit g
```

**Workflow** :
1. `get_food_by_name` → fuzzy match
2. `unit_to_grams(slug=slug, weight_per_unit_g=...)` → conversion
3. Insert `meal_log` avec `quantity_g` standardisé

`--dry-run` affiche sans insérer.

### 4.4 `log_sport.py`

```bash
python3 log_sport.py \
  --date 2026-08-04 \
  --type tapis_roulant \
  --duration 42 \
  --kcal 600 \
  --hr 125 \
  --distance 3.8
```

### 4.5 `compute_day.py`

```bash
python3 compute_day.py --date 2026-08-04
```

**Workflow** :
1. `get_day_meals` → tous les `meal_log` du jour
2. Pour chaque repas :
   - `food_id` → `get_food_by_id` → `/100g × quantity_g / 100`
   - `recipe_id` → `get_recipe_by_id` → `_per_portion × quantity_g / portion_size`
3. `get_sport` → toutes les séances du jour (liste)
4. Somme nutriments + **ajustement pessimiste** (kcal × 1.10, sport × 0.90)
5. Compare vs `daily_targets` ou valeurs par défaut

**Règle `row_factory`** : chaque fonction qui accède aux colonnes par nom configure `conn.row_factory = sqlite3.Row` et restore après.

### 4.6 `open_stock.py` / `close_stock.py`

Log l'ouverture / fermeture d'un paquet.

### 4.7 `get_stock.py`

Affiche les stocks ouverts.

---

## 5. Règles de calcul

### 5.1 Conversion d'unité (`utils.unit_to_grams`)

```
'unit' / 'tranche' / 'piece' → quantity × weight_per_unit_g
'g'                          → quantity × 1
'ml' / 'cs' / 'cc' / 'l'    → quantity × VOLUME_ML[unit] × DENSITÉ
'portion'                     → quantity (déjà en gramme)
```

**Densité** : la priorité est la suivante :
1. `foods.density_g_ml` depuis la DB (si `food_id` disponible)
2. `DENSITY_OVERRIDES[slug]` (clé = slug de l'aliment)
3. `1.0` (défaut)

La colonne `density_g_ml` de `foods` est maintenant exploitée par `_get_density()` dans `utils.py`. Les aliments sans `density_g_ml` personnalisé utilisent `DENSITY_OVERRIDES` ou `1.0`.

Densités dans `DENSITY_OVERRIDES` (exemples) :
```
huile_olive: 0.915 | huile_tournesol: 0.920 | miel: 1.420
lait: 1.030 | creme_fraiche: 1.010 | eau: 1.000
```

### 5.2 Nutriments d'un aliment

```
nutriment = foods.{nutriment}_100g × quantity_g / 100
```

### 5.3 Nutriments d'une recette

```
portion_size_g = total_weight_g / portions
nutriment = recipes.{nutriment}_per_portion × quantity_g / portion_size_g
```

### 5.4 Déficit ajusté (pessimiste)

```
kcal_mangees_adj = ROUND(SUM(kcal) × 1.10)
kcal_sport_adj   = ROUND(SUM(sport_kcal) × 0.90)
deficit_adj      = CIBLE_KCAL - (kcal_mangees_adj - kcal_sport_adj)
```

But : surestimer ce qu'on mange (+10%), sous-estimer ce qu'on brûle (−10%) → le déficit affiché est toujours ≤ réalité → surprises agréables.

---

## 6. Cibles par défaut

```python
{
    "kcal": 2000,
    "proteins_g": 150,
    "carbohydrates_g": 200,  # glucides totaux
    "fat_g": 70,
    "fiber_g": 30,
}
```

---

## 7. Tests

```bash
cd /data/nutrition/sqlite
python3 -m pytest test_db.py -q
# → 70 tests, 0 failure
```

---

## 8. FAQ Design

**Q : Pourquoi les recettes stockent des nutriments pré-calculés ?**
R : Simplicité. Modifier une recette ne change pas les repas passés. Pour corriger une recette il faut la supprimer et la recréer (pas de `update_recipe.py` à ce jour).

**Q : Pourquoi selenium_mg_100g contient des mcg ?**
R : Erreur historique de nommage. L'application divise par 1000 à l'affichage (via `utils.MICRO_TO_MILLI`).

**Q : Pourquoi `density_g_ml` dans `foods` n'est pas utilisée par `unit_to_grams` ?**
R : Le système utilise `DENSITY_OVERRIDES` (dictionnaire slug → densité dans `utils.py`) car `unit_to_grams` n'a pas de `food_id` lors de l'appel depuis `log_meal.py`. Correction possible : passer `food_id` et faire un lookup DB.

**Q : Comment ajouter un nutriment special (omega3, vitamines) ?**
R : `add_food.py` suivi d'un UPDATE SQL direct pour les colonnes non supportées en CLI.

**Q : Comment modifier une recette ?**
R : Supprimer (`DELETE FROM recipes WHERE id = ?`) et recréer avec `add_recipe.py`. Les `meal_log` passés ne sont pas affectés.

**Q : Comment suivre l'évolution du poids corporel ?**
R : Il n'y a pas de table pour ça. Une entrée `sport_log` avec `weight_kg` au moment de la séance peut servir de proxy. Une table `body_weight` serait une amélioration future.

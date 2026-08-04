# Nutrition Tracker

Système de suivi calorique et macro-nutritionnel personnel. Tout ce que tu manges → ça s'enregistre → bilans journaliers avec vitamines, minéraux et ajustement pessimiste (kcal ×1.10, sport ×0.90).

---

## Démarrage

```bash
# 1. Cloner
git clone git@github.com:S8N02000/Tracking.git
cd Tracking/sqlite

# 2. Initialiser la base (créé nutrition.db avec schéma complet)
python3 init_db.py

# 3. Ajouter un aliment
python3 add_food.py --name "Salade Hareng Fumé Pomme" --category autre \
  --weight_per_unit 422 --energy_kcal 103 --proteins 4.4 \
  --carbohydrates 12 --fat 4.2 --saturated_fat 0.8 --fiber 1.3

# 4. Logger un repas
python3 log_meal.py --date 2026-08-04 --period dejeuner \
  --food "Salade Hareng" --qty 422 --unit g

# 5. Logger du sport
python3 log_sport.py --date 2026-08-04 --type tapis_roulant \
  --duration 42 --kcal 600 --hr 125

# 6. Bilan journalier
python3 compute_day.py --date 2026-08-04
```

---

## Structure

```
nutrition/
├── README.md
├── SCHEMA.md                  ← documentation complète du schéma
├── .gitignore
├── sqlite/                   ← source unique de vérité
│   ├── nutrition.db           ← base SQLite (à générer avec init_db.py)
│   ├── schema.sql             ← schéma complet (9 tables, vues, index)
│   ├── init_db.py             ← création / reset de la base
│   ├── utils.py               ← helpers (conversion unité, fuzzy match)
│   ├── add_food.py            ← ajouter un aliment
│   ├── add_recipe.py          ← ajouter une recette (calcule auto les macros)
│   ├── log_meal.py            ← logger un repas
│   ├── log_sport.py           ← logger une séance sportive
│   ├── compute_day.py         ← bilan journalier complet
│   ├── open_stock.py          ← suivre l'ouverture d'un paquet
│   ├── close_stock.py         ← fermer un paquet
│   ├── get_stock.py           ← voir les stocks ouverts
│   └── test_db.py             ← tests unitaires (70 tests)
└── foods/ recipes/ log/ sport/ stock/   ← archives legacy (inactives)
```

---

## Scripts du quotidien

```bash
cd sqlite

# Repas
python3 log_meal.py --date 2026-08-04 --period dejeuner \
  --food "Nom Aliment" --qty 200 --unit g

python3 log_meal.py --date 2026-08-04 --period diner \
  --recipe "Curry Poulet" --qty 1 --unit portion

# Sport
python3 log_sport.py --date 2026-08-04 --type tapis_roulant \
  --duration 42 --kcal 600 --hr 125 --distance 3.8

# Bilan
python3 compute_day.py --date 2026-08-04

# Ajouter un aliment (toutes les valeurs en /100g)
python3 add_food.py --name "Mon Aliment" --category autre \
  --weight_per_unit 200 --energy_kcal 150 --proteins 10 \
  --carbohydrates 20 --fat 5 --saturated_fat 1 \
  --source etiquette

# Tests
python3 -m pytest test_db.py -q
```

---

## Schéma — 9 tables

```
ref_meal_periods       → petit_dejeuner, dejeuner, diner, collation
ref_sport_types        → tapis_roulant, velo, natation, musculation, …
ref_food_categories    → legume, fruit, viande, poisson, cereale, …

foods                  → catalogue nutrient par 100g
recipes                → plats avec nutriments PAR PORTION (pré-calculés)
recipe_ingredients     → ingrédients → recipe
meal_log               → repas journaliers (food_id OU recipe_id + quantity_g)
sport_log              → séances sportives (kcal, durée, FC, distance)
daily_targets          → cibles kcal/P/G/L par jour
stocks                 → suivi ouverture paquets

v_day_meals           ← vue: décomposition par repas
v_day_totals          ← vue: totaux journaliers (repas + sport)
```

Schéma complet et contraintes dans `schema.sql` et `SCHEMA.md`.

---

## Règles critiques

### `meal_log.quantity_g` est TOUJOURS en grammes
La conversion `unit → g` se fait à l'INSERT. Voir `utils.unit_to_grams`.

### Conversion d'unités (liquides)
```
unit = 'g'          → quantity × 1
unit = 'ml' / 'cs' / 'cc' → quantity × vol_ml × densité
unit = 'unit'       → quantity × weight_per_unit_g
```
Priorité densité : `foods.density_g_ml` (DB) → `DENSITY_OVERRIDES` → 1.0

### Déficit ajusté (pessimiste)
```
kcal_mangees_adj = ROUND(kcal × 1.10)
kcal_sport_adj   = ROUND(sport_kcal × 0.90)
deficit          = CIBLE - (kcal_adj - sport_adj)
```
But : surestimer ce qu'on mange, sous-estimer ce qu'on brûle → surprises agréables.

---

## Tests

```bash
cd sqlite
python3 -m pytest test_db.py -q
# → 70 tests, 0 failure
```

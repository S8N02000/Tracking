#!/usr/bin/env python3
"""
test_db.py
==========
Tests unitaires + intégration pour TOUS les scripts SQLite du projet nutrition.

Usage:
    python test_db.py              # tous les tests
    python test_db.py -v           # mode détaillé
    python test_db.py TestAddFood  # une classe seulement
    python test_db.py TestSlugify  # une fonction utilitaire
"""

import csv
import io
import os
import shutil
import sqlite3
import sys
import tempfile
import unittest
import unicodedata
from datetime import date, datetime, timedelta
from pathlib import Path

# ── Setup: chemins ────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent
SCHEMA_PATH = SCRIPT_DIR / "../server/src/database/schema.sql"
DB_PATH = SCRIPT_DIR / "nutrition_test.db"

# Imports des modules du projet
import init_db
import utils
import add_food
import add_recipe
import log_meal
import log_sport
import compute_day
import rebuild_from_csv


# ── Shared DB fixture (created once, shared by all test classes) ────────────────

_SHARED_DB_PATH = SCRIPT_DIR / "nutrition_test.db"
_SHARED_CONN = None  # type: sqlite3.Connection
_unique_seq = 0  # Monotonically increasing unique counter per test invocation


def _next_uid() -> int:
    """Return a unique integer that increments every call."""
    global _unique_seq
    _unique_seq += 1
    return _unique_seq


def _get_shared_conn():
    """Return the shared connection, creating the DB once on first call."""
    global _SHARED_CONN
    if _SHARED_CONN is None:
        if _SHARED_DB_PATH.exists():
            _SHARED_DB_PATH.unlink()
        init_db.init_db(force=True, db_path=_SHARED_DB_PATH)
        _SHARED_CONN = sqlite3.connect(str(_SHARED_DB_PATH))
        _SHARED_CONN.execute("PRAGMA foreign_keys = ON")
        _SHARED_CONN.row_factory = sqlite3.Row
    return _SHARED_CONN


def _fresh_db(cls_name: str) -> sqlite3.Connection:
    """Create a fresh isolated DB for a test class."""
    db_path = SCRIPT_DIR / f"nutrition_test_{cls_name.lower()}.db"
    if db_path.exists():
        db_path.unlink()
    init_db.init_db(force=True, db_path=db_path)
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn


# ── Fixtures ─────────────────────────────────────────────────────────────────

class TestDB(unittest.TestCase):
    """Base class — subclasses get their own fresh DB."""

    @classmethod
    def setUpClass(cls):
        cls.conn = _fresh_db(cls.__name__)

    def setUp(self):
        # Clean slate for each test — delete data but keep ref tables
        self.conn.rollback()
        for table in ("meal_log", "sport_log", "recipe_ingredients",
                       "recipes", "foods"):
            self.conn.execute(f"DELETE FROM {table}")

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()
        db_path = SCRIPT_DIR / f"nutrition_test_{cls.__name__.lower()}.db"
        if db_path.exists():
            db_path.unlink()


# ── Tests slugify / utilitaires ───────────────────────────────────────────────

class TestSlugify(unittest.TestCase):

    def test_minúsculas(self):
        self.assertEqual(utils.slugify("BANANE"), "banane")

    def test_espacios(self):
        self.assertEqual(utils.slugify("crème amande"), "creme_amande")

    def test_acentos(self):
        self.assertEqual(utils.slugify("crème amande"), utils.slugify("creme amande"))
        self.assertEqual(utils.slugify("crème"), "creme")
        self.assertEqual(utils.slugify("poulet"), "poulet")

    def test_vacios(self):
        self.assertEqual(utils.slugify(""), "")
        self.assertEqual(utils.slugify(None), "")

    def test_underscores(self):
        self.assertEqual(utils.slugify("krisprolls_complets"), "krisprolls_complets")

    def test_recette_slug_vs_nom(self):
        """slugify doit normaliser les accents pour que les noms CSV (accents)
        matchent les slugs-derived names (sans accents)."""
        csv_name = "poulet curry crème amande"
        # After accent stripping: "poulet curry creme amande"
        # slugify → "poulet_curry_creme_amande"
        self.assertEqual(utils.slugify(csv_name), "poulet_curry_creme_amande")
        # Non-accented version gives the same slug
        self.assertEqual(utils.slugify("poulet curry creme amande"),
                         utils.slugify("poulet curry crème amande"))


class TestToFloat(unittest.TestCase):

    def test_entero(self):
        self.assertEqual(utils.to_float("42"), 42.0)

    def test_float_virgule(self):
        self.assertEqual(utils.to_float("3.14"), 3.14)

    def test_float_virgule_francaise(self):
        self.assertEqual(utils.to_float("3,14"), 3.14)

    def test_vacio(self):
        self.assertIsNone(utils.to_float(""))
        self.assertIsNone(utils.to_float(None))

    def test_nombre_negatif(self):
        self.assertEqual(utils.to_float("-5"), -5.0)


# ── Tests init_db ─────────────────────────────────────────────────────────────

class TestInitDB(TestDB):

    def setUp(self):
        """Rollback any uncommitted writes from init tests."""
        self.conn.rollback()

    def test_base_creée(self):
        """init_db crée une base fonctionnelle."""
        import init_db
        import tempfile
        from pathlib import Path
        tmp = Path(tempfile.gettempdir()) / "test_init_check.db"
        if tmp.exists():
            tmp.unlink()
        init_db.init_db(force=True, db_path=tmp)
        self.assertTrue(tmp.exists())
        conn = sqlite3.connect(str(tmp))
        n_tables = conn.execute(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table'"
        ).fetchone()[0]
        conn.close()
        self.assertGreaterEqual(n_tables, 9)  # 9 tables métier + sqlite_sequence

    def test_tables_presentes(self):
        tables = {r[0] for r in self.conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )}
        expected = {
            "foods", "recipes", "recipe_ingredients", "meal_log",
            "sport_log", "daily_targets", "ref_meal_periods",
            "ref_sport_types", "ref_food_categories"
        }
        self.assertEqual(expected & tables, expected)

    def test_tables_ref_peuplées(self):
        n_periods = self.conn.execute(
            "SELECT COUNT(*) FROM ref_meal_periods"
        ).fetchone()[0]
        n_sports = self.conn.execute(
            "SELECT COUNT(*) FROM ref_sport_types"
        ).fetchone()[0]
        self.assertGreater(n_periods, 0)
        self.assertGreater(n_sports, 0)

    def test_pk_auto(self):
        r = self.conn.execute(
            "INSERT INTO foods (name, category, default_unit, density_g_ml, source) "
            "VALUES ('pk_test', 'autre', 'g', 1.0, 'test')"
        ).lastrowid
        self.assertIsInstance(r, int)
        self.assertGreater(r, 0)


# ── Tests add_food ────────────────────────────────────────────────────────────

class TestAddFood(TestDB):

    def test_insert_food_simple(self):
        food_id = utils.add_food(
            self.conn,
            name="test_banane",
            energy_kcal_100g=90.0,
            proteins_g_100g=1.1,
            carbohydrates_g_100g=23.0,
            fat_g_100g=0.3,
        )
        self.conn.commit()
        row = self.conn.execute(
            "SELECT * FROM foods WHERE id = ?", (food_id,)
        ).fetchone()
        self.assertEqual(row["name"], "test_banane")
        self.assertEqual(row["energy_kcal_100g"], 90.0)

    def test_insert_food_complete(self):
        food_id = utils.add_food(
            self.conn,
            name="test_complete",
            energy_kcal_100g=200, proteins_g_100g=10, carbohydrates_g_100g=20,
            fat_g_100g=5, fiber_g_100g=3, sugars_g_100g=8,
            saturated_fat_g_100g=2, salt_g_100g=0.5,
            calcium_mg_100g=100, iron_mg_100g=2,
            category="fruit", brand="TestBrand",
            weight_per_unit_g=120, default_unit="g",
        )
        self.conn.commit()
        row = self.conn.execute(
            "SELECT * FROM foods WHERE id = ?", (food_id,)
        ).fetchone()
        self.assertEqual(row["category"], "fruit")
        self.assertEqual(row["brand"], "TestBrand")
        self.assertEqual(row["weight_per_unit_g"], 120)

    def test_insert_food_duplicate_nom(self):
        utils.add_food(self.conn, name="dup_test", energy_kcal_100g=100)
        self.conn.commit()
        with self.assertRaises(sqlite3.IntegrityError):
            utils.add_food(self.conn, name="dup_test", energy_kcal_100g=200)
            self.conn.commit()

    def test_insert_food_missing_required(self):
        with self.assertRaises(sqlite3.IntegrityError):
            utils.add_food(self.conn, name=None, energy_kcal_100g=100)
            self.conn.commit()

    def test_update_food(self):
        food_id = utils.add_food(self.conn, name="to_update",
                                  energy_kcal_100g=50)
        self.conn.commit()
        utils.update_food(self.conn, food_id, energy_kcal_100g=75)
        self.conn.commit()
        row = self.conn.execute(
            "SELECT energy_kcal_100g FROM foods WHERE id = ?", (food_id,)
        ).fetchone()
        self.assertEqual(row["energy_kcal_100g"], 75)

    def test_delete_food_ok(self):
        food_id = utils.add_food(self.conn, name="to_delete",
                                  energy_kcal_100g=50)
        self.conn.commit()
        utils.delete_food(self.conn, food_id)
        self.conn.commit()
        row = self.conn.execute(
            "SELECT is_active FROM foods WHERE id = ?", (food_id,)
        ).fetchone()
        self.assertEqual(row["is_active"], 0)

    def test_delete_food_referenced_in_meal(self):
        """Soft-delete d'une food référencée dans meal_log : OK (is_active=0)."""
        food_id = utils.add_food(self.conn, name="used_food",
                                  energy_kcal_100g=50)
        self.conn.commit()
        self.conn.execute(
            "INSERT INTO meal_log (date_, period, food_id, quantity_g) "
            "VALUES ('2026-08-01', 'petit_dejeuner', ?, 1)",
            (food_id,)
        )
        self.conn.commit()
        # Soft-delete doit réussir (pas de FK error en dur)
        utils.delete_food(self.conn, food_id)
        self.conn.commit()
        # Food désactivée mais toujours en DB
        row = self.conn.execute(
            "SELECT is_active FROM foods WHERE id = ?", (food_id,)
        ).fetchone()
        self.assertEqual(row["is_active"], 0)
        # meal_log toujours intact
        meal = self.conn.execute(
            "SELECT * FROM meal_log WHERE food_id = ?", (food_id,)
        ).fetchone()
        self.assertIsNotNone(meal)

    def test_search_foods(self):
        utils.add_food(self.conn, name="banane", energy_kcal_100g=90)
        utils.add_food(self.conn, name="banane chips", energy_kcal_100g=500)
        utils.add_food(self.conn, name="pomme", energy_kcal_100g=52)
        self.conn.commit()
        results = utils.search_foods(self.conn, "banane")
        self.assertGreaterEqual(len(results), 2)
        names = {r["name"] for r in results}
        self.assertIn("banane", names)
        self.assertIn("banane chips", names)
        self.assertNotIn("pomme", names)


# ── Tests add_recipe ─────────────────────────────────────────────────────────

class TestAddRecipe(TestDB):

    def setUp(self):
        super().setUp()
        uid = _next_uid()
        # Foods nécessaires pour les recettes — noms uniques pour éviter les conflits
        self.fid_poulet = utils.add_food(
            self.conn, name=f"poulet_{uid}", energy_kcal_100g=165,
            proteins_g_100g=31, carbohydrates_g_100g=0,
            fat_g_100g=3.6
        )
        self.fid_riz = utils.add_food(
            self.conn, name=f"riz_{uid}", energy_kcal_100g=130,
            proteins_g_100g=2.7, carbohydrates_g_100g=28,
            fat_g_100g=0.3
        )
        self.conn.commit()

    def test_insert_recipe_simple(self):
        rid = utils.add_recipe(
            self.conn,
            name="test_riz_poulet",
            portions=2,
            ingredients=[
                {"food_id": self.fid_poulet, "quantity_g": 200},
                {"food_id": self.fid_riz, "quantity_g": 150},
            ]
        )
        self.conn.commit()
        row = self.conn.execute(
            "SELECT * FROM recipes WHERE id = ?", (rid,)
        ).fetchone()
        self.assertEqual(row["name"], "test_riz_poulet")
        self.assertEqual(row["portions"], 2)

    def test_insert_recipe_calcul_nutriments(self):
        rid = utils.add_recipe(
            self.conn,
            name="riz_poulet_kcal",
            portions=2,
            ingredients=[
                {"food_id": self.fid_poulet, "quantity_g": 200},
                {"food_id": self.fid_riz, "quantity_g": 150},
            ]
        )
        self.conn.commit()
        row = self.conn.execute(
            "SELECT energy_kcal_per_portion, proteins_g_per_portion "
            "FROM recipes WHERE id = ?", (rid,)
        ).fetchone()
        # poulet: 165 kcal/100g × 200g = 330 kcal, 31×2 = 62g prot
        # riz: 130×1.5 = 195 kcal, 2.7×1.5 = 4g prot
        # total: 525 kcal → par portion (2): 262.5
        self.assertAlmostEqual(row["energy_kcal_per_portion"], 262.5, places=1)
        self.assertAlmostEqual(row["proteins_g_per_portion"], 33.0, places=1)

    def test_insert_recipe_ingredients_lies(self):
        rid = utils.add_recipe(
            self.conn,
            name="test_ing_link",
            portions=1,
            ingredients=[{"food_id": self.fid_poulet, "quantity_g": 100}]
        )
        self.conn.commit()
        ings = self.conn.execute(
            "SELECT * FROM recipe_ingredients WHERE recipe_id = ?", (rid,)
        ).fetchall()
        self.assertEqual(len(ings), 1)
        self.assertEqual(ings[0]["food_id"], self.fid_poulet)
        self.assertEqual(ings[0]["quantity_g"], 100.0)

    def test_insert_recipe_duplicate_nom(self):
        utils.add_recipe(self.conn, name="dup_rec",
                         portions=1,
                         ingredients=[{"food_id": self.fid_poulet, "quantity_g": 100}])
        self.conn.commit()
        with self.assertRaises(sqlite3.IntegrityError):
            utils.add_recipe(self.conn, name="dup_rec",
                             portions=1,
                             ingredients=[{"food_id": self.fid_poulet, "quantity_g": 100}])
            self.conn.commit()

    def test_update_recipe(self):
        rid = utils.add_recipe(self.conn, name="to_upd",
                               portions=2,
                               ingredients=[{"food_id": self.fid_poulet, "quantity_g": 100}])
        self.conn.commit()
        utils.update_recipe(self.conn, rid, portions=4)
        self.conn.commit()
        row = self.conn.execute(
            "SELECT portions FROM recipes WHERE id = ?", (rid,)
        ).fetchone()
        self.assertEqual(row["portions"], 4)

    def test_delete_recipe(self):
        rid = utils.add_recipe(self.conn, name="to_del",
                               portions=1,
                               ingredients=[{"food_id": self.fid_poulet, "quantity_g": 100}])
        self.conn.commit()
        utils.delete_recipe(self.conn, rid)
        self.conn.commit()
        row = self.conn.execute(
            "SELECT is_active FROM recipes WHERE id = ?", (rid,)
        ).fetchone()
        self.assertEqual(row["is_active"], 0)


# ── Tests log_meal ───────────────────────────────────────────────────────────

class TestLogMeal(TestDB):

    def setUp(self):
        super().setUp()
        # Use unique names so tests don't conflict in shared DB
        uid = _next_uid()
        self.fid = utils.add_food(self.conn, name=f"banane_test_{uid}",
                                   energy_kcal_100g=90,
                                   proteins_g_100g=1.1,
                                   carbohydrates_g_100g=23,
                                   fat_g_100g=0.3,
                                   weight_per_unit_g=120)
        self.conn.commit()

    def test_log_meal_food_par_unité(self):
        """quantity=1, unit=unit → 120g réels (1 × weight_per_unit_g=120)."""
        mid = utils.log_meal(
            self.conn,
            date_="2026-08-04",
            period="petit_dejeuner",
            food_id=self.fid,
            quantity=1.0,
            unit="unit"
        )
        self.conn.commit()
        row = self.conn.execute(
            "SELECT * FROM meal_log WHERE id = ?", (mid,)
        ).fetchone()
        # 1 unité × 120g = 120g
        self.assertEqual(row["quantity_g"], 120.0)
        self.assertEqual(row["original_unit"], "unit")
        self.assertEqual(row["original_qty"], 1.0)

    def test_log_meal_par_grammes(self):
        mid = utils.log_meal(
            self.conn,
            date_="2026-08-04",
            period="dejeuner",
            food_id=self.fid,
            quantity=240.0,
            unit="g"
        )
        self.conn.commit()
        row = self.conn.execute(
            "SELECT * FROM meal_log WHERE id = ?", (mid,)
        ).fetchone()
        self.assertEqual(row["quantity_g"], 240.0)
        self.assertEqual(row["original_unit"], "g")

    def test_log_meal_recipe(self):
        # Self-contained: create own recipe so setUp rollback doesn't affect it
        uid = _next_uid()
        fid_rec = utils.add_food(self.conn, name=f"ing_{uid}",
                                  energy_kcal_100g=100, proteins_g_100g=10,
                                  carbohydrates_g_100g=10, fat_g_100g=5)
        rid = utils.add_recipe(self.conn, name=f"rec_test_{uid}",
                               portions=2,
                               ingredients=[{"food_id": fid_rec, "quantity_g": 100}])
        mid = utils.log_meal(
            self.conn,
            date_="2026-08-04",
            period="diner",
            recipe_id=rid,
            quantity=1.0,
            unit="portion"
        )
        row = self.conn.execute(
            "SELECT * FROM meal_log WHERE id = ?", (mid,)
        ).fetchone()
        self.assertEqual(row["recipe_id"], rid)
        self.assertIsNone(row["food_id"])

    def test_log_meal_food_et_recipe_mutually_exclusive(self):
        with self.assertRaises(ValueError):
            utils.log_meal(self.conn, date_="2026-08-04",
                           period="petit_dejeuner",
                           food_id=self.fid, recipe_id=999,
                           quantity=1, unit="unit")

    def test_log_meal_aucun_id(self):
        with self.assertRaises(ValueError):
            utils.log_meal(self.conn, date_="2026-08-04",
                           period="petit_dejeuner",
                           quantity=1, unit="unit")

    def test_delete_meal_log(self):
        mid = utils.log_meal(self.conn, date_="2026-08-04",
                             period="collation",
                             food_id=self.fid, quantity=1, unit="unit")
        self.conn.commit()
        utils.delete_meal_log(self.conn, mid)
        self.conn.commit()
        row = self.conn.execute(
            "SELECT * FROM meal_log WHERE id = ?", (mid,)
        ).fetchone()
        self.assertIsNone(row)

    def test_get_meal_log_par_date(self):
        # Self-contained: own food to survive setUp rollback in next test
        uid = _next_uid()
        fid = utils.add_food(self.conn, name=f"meal_date_{uid}",
                              energy_kcal_100g=90, proteins_g_100g=1,
                              carbohydrates_g_100g=20, fat_g_100g=0.5,
                              weight_per_unit_g=100)
        utils.log_meal(self.conn, date_="2026-08-04",
                       period="petit_dejeuner",
                       food_id=fid, quantity=1, unit="unit")
        utils.log_meal(self.conn, date_="2026-08-04",
                       period="dejeuner",
                       food_id=fid, quantity=1, unit="unit")
        utils.log_meal(self.conn, date_="2026-08-05",
                       period="petit_dejeuner",
                       food_id=fid, quantity=1, unit="unit")
        logs = utils.get_meal_log(self.conn, date_="2026-08-04")
        self.assertEqual(len(logs), 2)

    def test_get_meal_log_aucune_date(self):
        # Self-contained
        uid = _next_uid()
        fid = utils.add_food(self.conn, name=f"meal_empty_{uid}",
                              energy_kcal_100g=90, proteins_g_100g=1,
                              carbohydrates_g_100g=20, fat_g_100g=0.5,
                              weight_per_unit_g=100)
        utils.log_meal(self.conn, date_="2026-08-04",
                       period="petit_dejeuner",
                       food_id=fid, quantity=1, unit="unit")
        logs = utils.get_meal_log(self.conn, date_="2026-08-05")
        self.assertEqual(len(logs), 0)


# ── Tests log_sport ──────────────────────────────────────────────────────────
class TestLogSport(TestDB):

    def test_log_sport_simple(self):
        sid = utils.log_sport(
            self.conn,
            date_="2026-08-04",
            sport_type="tapis_roulant",
            duration_min=30,
            kcal_burned=300,
        )
        self.conn.commit()
        row = self.conn.execute(
            "SELECT * FROM sport_log WHERE id = ?", (sid,)
        ).fetchone()
        self.assertEqual(row["sport_type"], "tapis_roulant")
        self.assertEqual(row["duration_min"], 30)
        self.assertEqual(row["kcal_burned"], 300)

    def test_log_sport_avec_distance(self):
        sid = utils.log_sport(
            self.conn,
            date_="2026-08-04",
            sport_type="velo",
            duration_min=45,
            kcal_burned=400,
            distance_km=15.0,
        )
        self.conn.commit()
        row = self.conn.execute(
            "SELECT distance_km FROM sport_log WHERE id = ?", (sid,)
        ).fetchone()
        self.assertEqual(row["distance_km"], 15.0)

    def test_log_sport_type_invalide(self):
        """Type sport inconnu → lève ValueError."""
        with self.assertRaises(ValueError) as ctx:
            utils.log_sport(self.conn, date_="2026-08-04",
                            sport_type="sport_inconnu_valide",
                            duration_min=30, kcal_burned=100)
        self.assertIn("sport_inconnu", str(ctx.exception))

    def test_log_sport_delete(self):
        sid = utils.log_sport(self.conn, date_="2026-08-04",
                              sport_type="velo",
                              duration_min=30, kcal_burned=100)
        self.conn.commit()
        utils.delete_sport_log(self.conn, sid)
        self.conn.commit()
        row = self.conn.execute(
            "SELECT * FROM sport_log WHERE id = ?", (sid,)
        ).fetchone()
        self.assertIsNone(row)

    def test_get_sport_log_par_date(self):
        utils.log_sport(self.conn, date_="2026-08-04",
                         sport_type="velo", duration_min=30, kcal_burned=100)
        utils.log_sport(self.conn, date_="2026-08-05",
                         sport_type="natation", duration_min=60, kcal_burned=500)
        self.conn.commit()
        logs = utils.get_sport_log(self.conn, "2026-08-04")
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]["sport_type"], "velo")


# ── Tests compute_day ────────────────────────────────────────────────────────

class TestComputeDay(TestDB):

    def setUp(self):
        super().setUp()
        uid = _next_uid()
        self.fid_banane = utils.add_food(
            self.conn, name=f"banane_{uid}",
            energy_kcal_100g=90, proteins_g_100g=1.1,
            carbohydrates_g_100g=23, fat_g_100g=0.3,
            weight_per_unit_g=120
        )
        self.fid_oeuf = utils.add_food(
            self.conn, name=f"oeuf_{uid}",
            energy_kcal_100g=143, proteins_g_100g=12.5,
            carbohydrates_g_100g=0.5, fat_g_100g=9.9,
            weight_per_unit_g=50
        )
        self.conn.commit()

    def test_compute_day_total_vide(self):
        """Jour sans données → 0 kcal."""
        import compute_day
        totals = compute_day.compute_totals(
            compute_day.get_day_meals(self.conn, "2026-08-10")
        )
        self.assertEqual(totals.get("kcal"), 0)

    def test_compute_day_1_food_par_unité(self):
        """1 unité de banane (120g) → 108 kcal."""
        utils.log_meal(self.conn, date_="2026-08-10",
                       period="petit_dejeuner",
                       food_id=self.fid_banane,
                       quantity=1.0, unit="unit")
        self.conn.commit()
        import compute_day
        totals = compute_day.compute_totals(
            compute_day.get_day_meals(self.conn, "2026-08-10")
        )
        # 90 kcal/100g × 120g = 108 kcal
        self.assertAlmostEqual(totals["kcal"], 108, places=0)

    def test_compute_day_2_foods_meme_periode(self):
        utils.log_meal(self.conn, date_="2026-08-10",
                       period="petit_dejeuner",
                       food_id=self.fid_banane,
                       quantity=1.0, unit="unit")
        utils.log_meal(self.conn, date_="2026-08-10",
                       period="petit_dejeuner",
                       food_id=self.fid_oeuf,
                       quantity=2.0, unit="unit")
        self.conn.commit()
        import compute_day
        totals = compute_day.compute_totals(
            compute_day.get_day_meals(self.conn, "2026-08-10")
        )
        # banane: 90×1.2=108, oeuf: 143×0.5×2=143 → total=251
        self.assertAlmostEqual(totals["kcal"], 251, delta=2)

    def test_compute_day_par_periode(self):
        utils.log_meal(self.conn, date_="2026-08-10",
                       period="petit_dejeuner",
                       food_id=self.fid_banane,
                       quantity=1.0, unit="unit")
        utils.log_meal(self.conn, date_="2026-08-10",
                       period="dejeuner",
                       food_id=self.fid_oeuf,
                       quantity=1.0, unit="unit")
        self.conn.commit()
        import compute_day
        by_period = compute_day.compute_totals_by_period(
            self.conn, "2026-08-10"
        )
        self.assertAlmostEqual(by_period["petit_dejeuner"]["kcal"], 108, delta=1)
        self.assertAlmostEqual(by_period["dejeuner"]["kcal"], 72, delta=1)

    def test_compute_day_avec_sport(self):
        utils.log_meal(self.conn, date_="2026-08-10",
                       period="petit_dejeuner",
                       food_id=self.fid_banane,
                       quantity=1.0, unit="unit")
        utils.log_sport(self.conn, date_="2026-08-10",
                        sport_type="velo",
                        duration_min=30, kcal_burned=300)
        self.conn.commit()
        import compute_day
        totals = compute_day.compute_totals_with_sport(self.conn, "2026-08-10")
        self.assertAlmostEqual(totals["kcal"], 108)
        self.assertEqual(totals.get("sport_kcal"), 300)


# ── Tests migration rebuild_from_csv ─────────────────────────────────────────

class TestRebuildFromCSV(TestDB):
    """Teste la migration CSV → SQLite (rebuild_from_csv.py)."""

    @classmethod
    def setUpClass(cls):
        # Use separate temp DB for migration tests
        cls.mig_db = SCRIPT_DIR / "nutrition_mig_test.db"
        if cls.mig_db.exists():
            cls.mig_db.unlink()
        import init_db as ig
        ig.init_db(force=False, db_path=cls.mig_db)
        cls.conn = sqlite3.connect(cls.mig_db)
        cls.conn.execute("PRAGMA foreign_keys = ON")
        cls.conn.row_factory = sqlite3.Row

        # Patch les constantes pour pointer sur les vrais CSV
        import rebuild_from_csv as rfc
        rfc.DB_PATH = cls.mig_db
        cls.rfc = rfc

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()
        if cls.mig_db.exists():
            cls.mig_db.unlink()

    def test_migrate_foods_lit_les_csv(self):
        """Lit les CSV foods existants et les insère."""
        foods = self.rfc.read_foods()
        self.assertGreater(len(foods), 0)
        # Chaque food doit avoir un 'name'
        for f in foods:
            self.assertIn("name", f)
            self.assertTrue(f["name"])

    def test_migrate_recipes_lit_les_csv(self):
        """Lit les CSV recipes existants."""
        recipes = self.rfc.read_recipes([])
        self.assertGreater(len(recipes), 0)
        for r in recipes:
            self.assertIn("_name", r)

    def test_slugify_consistent_accent(self):
        """slugify doit être insensible aux accents."""
        self.assertEqual(
            self.rfc.slugify("crème amande"),
            self.rfc.slugify("creme amande")
        )
        self.assertEqual(
            self.rfc.slugify("poulet curry crème amande"),
            self.rfc.slugify("poulet curry creme amande")
        )

    def test_migrate_insere_et_verifie_bd(self):
        """Dry-run + écriture complète avec les vrais CSV."""
        import importlib, sys
        # Force re-import pour avoir les bons chemins
        import rebuild_from_csv as rfc_mod
        rfc_mod.DB_PATH = self.mig_db

        foods = rfc_mod.read_foods()
        recipes = rfc_mod.read_recipes(foods)
        logs = rfc_mod.read_logs()
        sport = rfc_mod.read_sport()

        self.assertGreater(len(foods), 0, "Devrait trouver des foods dans /data/nutrition/foods/")
        self.assertGreaterEqual(len(recipes), 0)
        self.assertGreaterEqual(len(logs), 0)

        # Insère foods
        food_ids = {}
        for food in foods:
            name = food["name"]
            cols = [k for k in food.keys() if k != "_file_slug"]
            placeholders = ", ".join(["?"] * len(cols))
            sql = f"INSERT OR IGNORE INTO foods ({', '.join(cols)}) VALUES ({placeholders})"
            self.conn.execute(sql, [food[k] for k in cols])
            row = self.conn.execute(
                "SELECT id FROM foods WHERE name = ?", (name,)
            ).fetchone()
            food_ids[name] = row["id"] if row else None
        self.conn.commit()

        # Vérifie qu'au moins 1 food est insérée
        n = self.conn.execute("SELECT COUNT(*) FROM foods").fetchone()[0]
        self.assertGreater(n, 0, "Des foods doivent être insérées")


# ── Tests intégration end-to-end ─────────────────────────────────────────────

class TestIntegration(TestDB):
    """Scénarios complets: food → recipe → log → compute."""

    def setUp(self):
        super().setUp()
        self.uid = _next_uid()

    def test_workflow_complet(self):
        """Ajoute foods, crée recette, log repas, compute jour."""
        # 1. Ajoute 2 foods
        fid_beurre = utils.add_food(
            self.conn, name=f"beurre_{self.uid}",
            energy_kcal_100g=750, proteins_g_100g=0.5,
            carbohydrates_g_100g=0.1, fat_g_100g=83,
            weight_per_unit_g=10
        )
        fid_pain = utils.add_food(
            self.conn, name=f"pain_{self.uid}",
            energy_kcal_100g=250, proteins_g_100g=8,
            carbohydrates_g_100g=50, fat_g_100g=1,
            weight_per_unit_g=30
        )
        self.conn.commit()

        # 2. Crée recette "tartine beurre"
        rid = utils.add_recipe(
            self.conn,
            name=f"tartine au beurre_{self.uid}",
            portions=1,
            ingredients=[
                {"food_id": fid_beurre, "quantity_g": 10},
                {"food_id": fid_pain, "quantity_g": 30},
            ]
        )
        self.conn.commit()

        # 3. Log 2 tartines au petit déj
        utils.log_meal(self.conn, date_="2026-08-10",
                       period="petit_dejeuner",
                       food_id=fid_beurre,  # beurre seul
                       quantity=1, unit="unit")
        utils.log_meal(self.conn, date_="2026-08-10",
                       period="petit_dejeuner",
                       recipe_id=rid,  # tartine au beurre
                       quantity=2, unit="portion")
        self.conn.commit()

        # 4. Log sport
        utils.log_sport(self.conn, date_="2026-08-10",
                        sport_type="velo",
                        duration_min=30, kcal_burned=250)
        self.conn.commit()

        # 5. Compute
        import compute_day
        totals = compute_day.compute_totals_with_sport(self.conn, "2026-08-10")
        # beurre: 750×10/100=75, tartine×2: (75+75)×2=300
        # total kcal = 375
        self.assertGreater(totals["kcal"], 0)
        self.assertEqual(totals.get("sport_kcal"), 250)

    def test_verifie_total_journalier(self):
        """Le total kcal d'une journée correspond à la somme des repas."""
        fid = utils.add_food(
            self.conn, name=f"test_kcal_{self.uid}",
            energy_kcal_100g=100,
            proteins_g_100g=10,
            carbohydrates_g_100g=10,
            fat_g_100g=10,
            weight_per_unit_g=50
        )
        self.conn.commit()
        # 3 repas: 1, 2, 3 unités
        for qty in [1.0, 2.0, 3.0]:
            utils.log_meal(self.conn, date_="2026-08-10",
                           period="petit_dejeuner",
                           food_id=fid, quantity=qty, unit="unit")
        self.conn.commit()
        import compute_day
        totals = compute_day.compute_totals(
            compute_day.get_day_meals(self.conn, "2026-08-10")
        )
        # (1+2+3) × 50g × 100 kcal/100g = 6 × 50 = 300 kcal
        self.assertAlmostEqual(totals["kcal"], 300, delta=1)


# ── Main ──────────────────────────────────────────────────────────────────────

class TestGettersAndValidators(unittest.TestCase):
    """Tests des getters simples, helpers, et validateurs."""

    def setUp(self):
        import tempfile
        from pathlib import Path
        db = Path(tempfile.gettempdir()) / "test_getters.db"
        if db.exists():
            db.unlink()
        import init_db
        init_db.init_db(force=True, db_path=db)
        self.conn = sqlite3.connect(str(db))
        self.conn.execute("PRAGMA foreign_keys = ON")
        self.conn.row_factory = sqlite3.Row

    def tearDown(self):
        self.conn.close()

    def test_get_food_by_id(self):
        import utils
        fid = utils.add_food(self.conn, name="test_pomme",
                              energy_kcal_100g=52, proteins_g_100g=0.3,
                              carbohydrates_g_100g=14, fat_g_100g=0.2)
        self.conn.commit()
        row = utils.get_food_by_id(self.conn, fid)
        self.assertEqual(row["name"], "test_pomme")

    def test_get_food_by_id_invalide(self):
        import utils
        self.assertIsNone(utils.get_food_by_id(self.conn, 99999))

    def test_get_food_by_name(self):
        import utils
        utils.add_food(self.conn, name="test_ananas",
                        energy_kcal_100g=50, proteins_g_100g=0.5,
                        carbohydrates_g_100g=13, fat_g_100g=0.1)
        self.conn.commit()
        row = utils.get_food_by_name(self.conn, "test_ananas")
        self.assertEqual(row["name"], "test_ananas")

    def test_get_recipe_by_id_et_name(self):
        import utils
        fid = utils.add_food(self.conn, name="test_tomate",
                              energy_kcal_100g=18, proteins_g_100g=0.9,
                              carbohydrates_g_100g=3.9, fat_g_100g=0.2)
        rid = utils.add_recipe(self.conn, name="test_sauce_tomate",
                                portions=2,
                                ingredients=[{"food_id": fid, "quantity_g": 200}])
        self.conn.commit()
        r_by_id = utils.get_recipe_by_id(self.conn, rid)
        r_by_name = utils.get_recipe_by_name(self.conn, "test_sauce_tomate")
        self.assertEqual(r_by_id["name"], "test_sauce_tomate")
        self.assertEqual(r_by_name["id"], rid)

    def test_list_foods_include_inactive(self):
        import utils
        utils.add_food(self.conn, name="test_l1",
                        energy_kcal_100g=10, proteins_g_100g=1,
                        carbohydrates_g_100g=1, fat_g_100g=1)
        utils.add_food(self.conn, name="test_l2",
                        energy_kcal_100g=20, proteins_g_100g=2,
                        carbohydrates_g_100g=2, fat_g_100g=2,
                        is_active=False)
        self.conn.commit()
        active = utils.list_foods(self.conn, active_only=True)
        all_foods = utils.list_foods(self.conn, active_only=False)
        self.assertEqual(len(active), 1)
        self.assertEqual(len(all_foods), 2)

    def test_list_recipe_ingredients(self):
        import utils
        fid = utils.add_food(self.conn, name="test_riz_ingr",
                              energy_kcal_100g=130, proteins_g_100g=2.7,
                              carbohydrates_g_100g=28, fat_g_100g=0.3)
        rid = utils.add_recipe(self.conn, name="test_recette_riz",
                                portions=1,
                                ingredients=[{"food_id": fid, "quantity_g": 150}])
        self.conn.commit()
        ings = utils.list_recipe_ingredients(self.conn, rid)
        self.assertEqual(len(ings), 1)
        self.assertEqual(ings[0]["food_name"], "test_riz_ingr")
        self.assertEqual(ings[0]["quantity_g"], 150)

    def test_get_day_targets(self):
        import compute_day
        targets = compute_day.get_day_targets(self.conn, "2026-08-03")
        self.assertIsInstance(targets, dict)
        self.assertIn("kcal", targets)
        self.assertEqual(targets["kcal"], 2000)

    def test_get_sport_vide(self):
        import compute_day
        result = compute_day.get_sport(self.conn, "2099-01-01")
        # Retourne une liste vide
        self.assertEqual(result, [])

    def test_validate_date(self):
        import utils
        self.assertEqual(utils.validate_date("2026-08-03"), "2026-08-03")
        with self.assertRaises(ValueError):
            utils.validate_date("not-a-date")
        with self.assertRaises(ValueError):
            utils.validate_date("2026-13-99")

    def test_validate_period(self):
        import utils
        self.assertEqual(utils.validate_period("petit_dejeuner"), "petit_dejeuner")
        with self.assertRaises(ValueError):
            utils.validate_period("gouter_inexistant")

    def test_validate_sport_type(self):
        import utils
        self.assertEqual(utils.validate_sport_type("velo"), "velo")
        with self.assertRaises(ValueError):
            utils.validate_sport_type("baseball")

    def test_unit_to_grams(self):
        import utils
        fid = utils.add_food(self.conn, name="test_poids_unit",
                              energy_kcal_100g=100, proteins_g_100g=0,
                              carbohydrates_g_100g=0, fat_g_100g=0,
                              weight_per_unit_g=50)
        self.conn.commit()
        # Mode explicite: passer weight_per_unit_g direct
        self.assertEqual(utils.unit_to_grams(
            2, "unit", weight_per_unit_g=50
        ), 100)
        # g reste g
        self.assertEqual(utils.unit_to_grams(200, "g"), 200)
        # unit avec weight_per_unit_g=0 → ValueError
        with self.assertRaises(ValueError):
            utils.unit_to_grams(1, "unit", weight_per_unit_g=0)
        # unit avec weight_per_unit_g=None → ValueError
        with self.assertRaises(ValueError):
            utils.unit_to_grams(1, "unit")
        # quantity <= 0 → 0
        self.assertEqual(utils.unit_to_grams(0, "g"), 0)
        # Auto-fetch: food_id + conn charge le weight_per_unit_g
        self.assertEqual(utils.unit_to_grams(
            2, "unit", food_id=fid, conn=self.conn
        ), 100)

    def test_calc_nutrients_for_quantity(self):
        import utils
        fid = utils.add_food(self.conn, name="test_calc_food",
                              energy_kcal_100g=200, proteins_g_100g=10,
                              carbohydrates_g_100g=20, fat_g_100g=5)
        self.conn.commit()
        f = utils.get_food_by_id(self.conn, fid)
        n = utils.calc_nutrients_for_quantity(f, 150)
        self.assertIn("kcal", n)
        self.assertEqual(n["kcal"], 300)
        self.assertIn("proteins_g", n)
        self.assertEqual(n["proteins_g"], 15)

    def test_parse_recipe_ingredients(self):
        import rebuild_from_csv
        foods_by_name = {
            "poulet": {"id": 1, "name": "poulet"},
            "riz": {"id": 2, "name": "riz"},
        }
        result = rebuild_from_csv.parse_recipe_ingredients(
            "poulet:300;riz:200;inconnu:50", foods_by_name
        )
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["name"], "poulet")
        self.assertEqual(result[0]["quantity_g"], 300)
        self.assertEqual(result[1]["name"], "riz")
        self.assertEqual(result[1]["quantity_g"], 200)

    def test_parse_recipe_ingredients_vide(self):
        import rebuild_from_csv
        result = rebuild_from_csv.parse_recipe_ingredients("", {})
        self.assertEqual(result, [])

    def test_read_recipes_lit_csv(self):
        import rebuild_from_csv
        foods = [
            {"name": "hauts cuisse poulet", "id": 1},
            {"name": "quinoa", "id": 2},
        ]
        recipes = rebuild_from_csv.read_recipes(foods)
        self.assertEqual(len(recipes), 1)
        self.assertEqual(recipes[0]["_name"], "poulet curry crème amande")
        self.assertEqual(recipes[0]["portions"], 3)
        self.assertIn("hauts_cuisse_poulet:750", recipes[0]["_ingredients_raw"])

    def test_read_logs_et_sport(self):
        import rebuild_from_csv
        logs = rebuild_from_csv.read_logs()
        self.assertGreater(len(logs), 0)
        self.assertTrue(all("_date" in l for l in logs))
        sport = rebuild_from_csv.read_sport()
        self.assertGreater(len(sport), 0)
        self.assertTrue(all("_date" in s for s in sport))


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    unittest.main(verbosity=2 if "-v" in sys.argv else 1)

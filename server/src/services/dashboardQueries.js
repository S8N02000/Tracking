import { getDatabase } from '../database/db.js';

export function getDailyMealsAggregation(startDate, endDate, customDb = null) {
  const db = customDb || getDatabase();

  const stmt = db.prepare(`
    SELECT
      ml.date_,
      SUM(ml.quantity_g) AS total_food_g,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.energy_kcal_100g, 0) * ml.quantity_g / 100.0 ELSE COALESCE(r.energy_kcal_per_portion, 0) * ml.quantity_g / (r.total_weight_g / r.portions) END) AS energy_kcal,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.proteins_g_100g, 0) * ml.quantity_g / 100.0 ELSE COALESCE(r.proteins_g_per_portion, 0) * ml.quantity_g / (r.total_weight_g / r.portions) END) AS proteins_g,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.carbohydrates_g_100g, 0) * ml.quantity_g / 100.0 ELSE COALESCE(r.carbohydrates_g_per_portion, 0) * ml.quantity_g / (r.total_weight_g / r.portions) END) AS carbohydrates_g,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.sugars_g_100g, 0) * ml.quantity_g / 100.0 ELSE COALESCE(r.sugars_g_per_portion, 0) * ml.quantity_g / (r.total_weight_g / r.portions) END) AS sugars_g,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.fiber_g_100g, 0) * ml.quantity_g / 100.0 ELSE COALESCE(r.fiber_g_per_portion, 0) * ml.quantity_g / (r.total_weight_g / r.portions) END) AS fiber_g,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.fat_g_100g, 0) * ml.quantity_g / 100.0 ELSE COALESCE(r.fat_g_per_portion, 0) * ml.quantity_g / (r.total_weight_g / r.portions) END) AS fat_g,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.saturated_fat_g_100g, 0) * ml.quantity_g / 100.0 ELSE COALESCE(r.saturated_fat_g_per_portion, 0) * ml.quantity_g / (r.total_weight_g / r.portions) END) AS saturated_fat_g,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.omega9_g_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS monounsaturated_fat_g,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.omega3_g_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS omega_3_g,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.omega6_g_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS omega_6_g,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.trans_fat_g_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS trans_fat_g,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.cholesterol_mg_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS cholesterol_mg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.salt_g_100g, 0) * ml.quantity_g / 100.0 ELSE COALESCE(r.salt_g_per_portion, 0) * ml.quantity_g / (r.total_weight_g / r.portions) END) AS salt_g,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.sodium_mg_100g, 0) * ml.quantity_g / 100.0 ELSE (COALESCE(r.salt_g_per_portion, 0) / 2.54 * 1000) * ml.quantity_g / (r.total_weight_g / r.portions) END) AS sodium_mg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.calcium_mg_100g, 0) * ml.quantity_g / 100.0 ELSE COALESCE(r.calcium_mg_per_portion, 0) * ml.quantity_g / (r.total_weight_g / r.portions) END) AS calcium_mg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.iron_mg_100g, 0) * ml.quantity_g / 100.0 ELSE COALESCE(r.iron_mg_per_portion, 0) * ml.quantity_g / (r.total_weight_g / r.portions) END) AS iron_mg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.magnesium_mg_100g, 0) * ml.quantity_g / 100.0 ELSE COALESCE(r.magnesium_mg_per_portion, 0) * ml.quantity_g / (r.total_weight_g / r.portions) END) AS magnesium_mg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.phosphorus_mg_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS phosphorus_mg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.potassium_mg_100g, 0) * ml.quantity_g / 100.0 ELSE COALESCE(r.potassium_mg_per_portion, 0) * ml.quantity_g / (r.total_weight_g / r.portions) END) AS potassium_mg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.zinc_mg_100g, 0) * ml.quantity_g / 100.0 ELSE COALESCE(r.zinc_mg_per_portion, 0) * ml.quantity_g / (r.total_weight_g / r.portions) END) AS zinc_mg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.copper_mg_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS copper_mg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.manganese_mg_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS manganese_mg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.selenium_mg_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS selenium_mcg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.iodine_mg_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS iodine_mcg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.vit_a_mcg_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS vit_a_mcg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.vit_d_mcg_100g, 0) * ml.quantity_g / 100.0 ELSE COALESCE(r.vit_d_mcg_per_portion, 0) * ml.quantity_g / (r.total_weight_g / r.portions) END) AS vit_d_mcg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.vit_e_mg_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS vit_e_mg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.vit_k_mcg_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS vit_k_mcg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.vit_c_mg_100g, 0) * ml.quantity_g / 100.0 ELSE COALESCE(r.vit_c_mg_per_portion, 0) * ml.quantity_g / (r.total_weight_g / r.portions) END) AS vit_c_mg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.vit_b1_mg_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS vit_b1_mg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.vit_b2_mg_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS vit_b2_mg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.vit_b3_mg_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS vit_b3_mg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.vit_b5_mg_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS vit_b5_mg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.vit_b6_mg_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS vit_b6_mg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.vit_b9_mcg_100g, 0) * ml.quantity_g / 100.0 ELSE 0 END) AS vit_b9_mcg,
      SUM(CASE WHEN ml.food_id IS NOT NULL THEN COALESCE(f.vit_b12_mcg_100g, 0) * ml.quantity_g / 100.0 ELSE COALESCE(r.vit_b12_mcg_per_portion, 0) * ml.quantity_g / (r.total_weight_g / r.portions) END) AS vit_b12_mcg
    FROM meal_log ml
    LEFT JOIN foods f ON f.id = ml.food_id
    LEFT JOIN recipes r ON r.id = ml.recipe_id
    WHERE ml.date_ BETWEEN ? AND ?
    GROUP BY ml.date_
  `);

  return stmt.all(startDate, endDate);
}

export function getDailySportsAggregation(startDate, endDate, customDb = null) {
  const db = customDb || getDatabase();
  const stmt = db.prepare(`
    SELECT
      date_,
      SUM(COALESCE(duration_min, 0)) AS total_duration_min,
      SUM(COALESCE(kcal_burned, 0)) AS total_kcal_sport,
      SUM(COALESCE(pas, 0)) AS total_pas,
      SUM(COALESCE(distance_km, 0)) AS total_distance_km
    FROM sport_log
    WHERE date_ BETWEEN ? AND ?
    GROUP BY date_
  `);
  return stmt.all(startDate, endDate);
}

export function getDailyScansMap(startDate, endDate, customDb = null) {
  const db = customDb || getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM body_scans
    WHERE scan_date BETWEEN ? AND ?
    ORDER BY scan_datetime DESC
  `);
  return stmt.all(startDate, endDate);
}

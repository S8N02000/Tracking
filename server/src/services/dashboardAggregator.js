import { getDatabase } from '../database/db.js';
import {
  getDailyMealsAggregation,
  getDailySportsAggregation,
  getDailyScansMap
} from './dashboardQueries.js';

export function generateDateRange(startDateStr, endDateStr) {
  const dates = [];
  let curr = new Date(startDateStr);
  const end = new Date(endDateStr);

  while (curr <= end) {
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const dd = String(curr.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    curr.setDate(curr.getDate() + 1);
  }

  return dates;
}

export function getDailyDashboard(startDateStr, endDateStr, customDb = null) {
  const startTime = performance.now();
  const db = customDb || getDatabase();

  const dateList = generateDateRange(startDateStr, endDateStr);

  // Fetch meals, sports, scans, targets in parallel indexed queries
  const mealsList = getDailyMealsAggregation(startDateStr, endDateStr, db);
  const sportsList = getDailySportsAggregation(startDateStr, endDateStr, db);
  const scansList = getDailyScansMap(startDateStr, endDateStr, db);

  const targetsList = db
    .prepare('SELECT * FROM daily_targets WHERE date_ BETWEEN ? AND ?')
    .all(startDateStr, endDateStr);

  // Index by date string
  const mealsMap = new Map(mealsList.map((m) => [m.date_, m]));
  const sportsMap = new Map(sportsList.map((s) => [s.date_, s]));
  const scansMap = new Map();
  for (const s of scansList) {
    if (!scansMap.has(s.scan_date)) {
      scansMap.set(s.scan_date, s);
    }
  }
  const targetsMap = new Map(targetsList.map((t) => [t.date_, t]));

  // Find most recent fallback BMR prior to startDate if any
  const priorScan = db
    .prepare('SELECT bmr_kcal, weight_kg FROM body_scans WHERE scan_date < ? ORDER BY scan_datetime DESC LIMIT 1')
    .get(startDateStr);

  let runningBmr = priorScan?.bmr_kcal || 2000;
  let runningWeight = priorScan?.weight_kg || null;

  const rows = [];

  for (const dateStr of dateList) {
    const meal = mealsMap.get(dateStr);
    const sport = sportsMap.get(dateStr);
    const scan = scansMap.get(dateStr);
    const target = targetsMap.get(dateStr);

    if (scan && scan.bmr_kcal) {
      runningBmr = scan.bmr_kcal;
      runningWeight = scan.weight_kg;
    }

    const kcal_in = Math.round(meal?.energy_kcal || 0);
    const kcal_sport = Math.round(sport?.total_kcal_sport || 0);
    const bmr_kcal = runningBmr;
    const total_kcal_expended = bmr_kcal + kcal_sport;
    const net_balance = kcal_in - total_kcal_expended;

    // Targets
    const targetKcal = target?.kcal || 2000;
    const targetProteins = target?.proteins_g || 150;
    const targetCarbs = target?.carbs_g || 200;
    const targetFat = target?.fat_g || 70;
    const targetFiber = target?.fiber_g || 30;

    const proteins_g = Math.round((meal?.proteins_g || 0) * 10) / 10;
    const carbs_g = Math.round((meal?.carbohydrates_g || 0) * 10) / 10;
    const sugars_g = Math.round((meal?.sugars_g || 0) * 10) / 10;
    const fiber_g = Math.round((meal?.fiber_g || 0) * 10) / 10;
    const fat_g = Math.round((meal?.fat_g || 0) * 10) / 10;
    const saturated_fat_g = Math.round((meal?.saturated_fat_g || 0) * 10) / 10;
    const salt_g = Math.round((meal?.salt_g || 0) * 100) / 100;

    rows.push({
      date: dateStr,
      has_meal_logged: meal ? true : false,
      kcal_in,
      bmr_kcal,
      kcal_sport,
      total_kcal_expended,
      net_balance,

      // Macros
      proteins_g,
      carbs_g,
      sugars_g,
      fiber_g,
      fat_g,
      saturated_fat_g,
      monounsaturated_fat_g: Math.round((meal?.monounsaturated_fat_g || 0) * 10) / 10,
      polyunsaturated_fat_g: Math.round((meal?.polyunsaturated_fat_g || 0) * 10) / 10,
      omega_3_g: Math.round((meal?.omega_3_g || 0) * 100) / 100,
      omega_6_g: Math.round((meal?.omega_6_g || 0) * 100) / 100,
      trans_fat_g: Math.round((meal?.trans_fat_g || 0) * 100) / 100,
      cholesterol_mg: Math.round(meal?.cholesterol_mg || 0),
      salt_g,

      // Targets comparison
      targets: {
        kcal: targetKcal,
        proteins_g: targetProteins,
        carbs_g: targetCarbs,
        fat_g: targetFat,
        fiber_g: targetFiber,

        kcal_pct: Math.round((kcal_in / targetKcal) * 100),
        proteins_pct: Math.round((proteins_g / targetProteins) * 100),
        carbs_pct: Math.round((carbs_g / targetCarbs) * 100),
        fat_pct: Math.round((fat_g / targetFat) * 100),
        fiber_pct: Math.round((fiber_g / targetFiber) * 100)
      },

      // Complete 35-nutrient dictionary
      micros: {
        sodium_mg: Math.round(meal?.sodium_mg || 0),
        calcium_mg: Math.round(meal?.calcium_mg || 0),
        iron_mg: Math.round((meal?.iron_mg || 0) * 10) / 10,
        magnesium_mg: Math.round(meal?.magnesium_mg || 0),
        phosphorus_mg: Math.round(meal?.phosphorus_mg || 0),
        potassium_mg: Math.round(meal?.potassium_mg || 0),
        zinc_mg: Math.round((meal?.zinc_mg || 0) * 10) / 10,
        copper_mg: Math.round((meal?.copper_mg || 0) * 100) / 100,
        manganese_mg: Math.round((meal?.manganese_mg || 0) * 100) / 100,
        selenium_mcg: Math.round((meal?.selenium_mcg || 0) * 10) / 10,
        iodine_mcg: Math.round((meal?.iodine_mcg || 0) * 10) / 10,
        vit_a_mcg: Math.round(meal?.vit_a_mcg || 0),
        vit_d_mcg: Math.round((meal?.vit_d_mcg || 0) * 10) / 10,
        vit_e_mg: Math.round((meal?.vit_e_mg || 0) * 10) / 10,
        vit_k_mcg: Math.round((meal?.vit_k_mcg || 0) * 10) / 10,
        vit_c_mg: Math.round(meal?.vit_c_mg || 0),
        vit_b1_mg: Math.round((meal?.vit_b1_mg || 0) * 100) / 100,
        vit_b2_mg: Math.round((meal?.vit_b2_mg || 0) * 100) / 100,
        vit_b3_mg: Math.round((meal?.vit_b3_mg || 0) * 10) / 10,
        vit_b5_mg: Math.round((meal?.vit_b5_mg || 0) * 10) / 10,
        vit_b6_mg: Math.round((meal?.vit_b6_mg || 0) * 100) / 100,
        vit_b9_mcg: Math.round(meal?.vit_b9_mcg || 0),
        vit_b12_mcg: Math.round((meal?.vit_b12_mcg || 0) * 100) / 100,
        water_g: Math.round((meal?.water_g || 0) * 10) / 10,
        alcohol_g: Math.round((meal?.alcohol_g || 0) * 10) / 10,
        caffeine_mg: Math.round(meal?.caffeine_mg || 0)
      },

      // Biometrics scan if present
      scan: scan
        ? {
            has_scan: true,
            weight_kg: scan.weight_kg,
            fat_mass_kg: scan.fat_mass_kg,
            muscle_mass_kg: scan.muscle_mass_kg,
            visceral_fat_rating: scan.visceral_fat_rating,
            bmr_kcal: scan.bmr_kcal
          }
        : {
            has_scan: false,
            weight_kg: runningWeight,
            bmr_kcal: runningBmr,
            is_inherited: true
          },

      // Sport activity summary
      sport: {
        duration_min: sport?.total_duration_min || 0,
        kcal_burned: sport?.total_kcal_sport || 0,
        pas: sport?.total_pas || 0,
        distance_km: Math.round((sport?.total_distance_km || 0) * 10) / 10
      }
    });
  }

  const durationMs = performance.now() - startTime;
  return {
    query_info: {
      start_date: startDateStr,
      end_date: endDateStr,
      days_count: dateList.length,
      execution_time_ms: Math.round(durationMs * 100) / 100
    },
    rows
  };
}

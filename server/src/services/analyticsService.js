import { getDailyDashboard } from './dashboardAggregator.js';
import { getDatabase } from '../database/db.js';

export function getCorrelationSeries(startDateStr, endDateStr, customDb = null) {
  const dashboard = getDailyDashboard(startDateStr, endDateStr, customDb);
  let cumulativeCaloricBalance = 0;

  const labels = [];
  const weightData = [];
  const cumulativeBalanceData = [];
  const dailyBalanceData = [];

  for (const row of dashboard.rows) {
    cumulativeCaloricBalance += row.net_balance;

    labels.push(row.date);
    weightData.push(row.scan?.weight_kg ?? null);
    cumulativeBalanceData.push(cumulativeCaloricBalance);
    dailyBalanceData.push(row.net_balance);
  }

  return {
    labels,
    series: {
      weight_kg: weightData,
      cumulative_balance_kcal: cumulativeBalanceData,
      daily_balance_kcal: dailyBalanceData
    }
  };
}

export function getMicronutrientsRadar(startDateStr, endDateStr, customDb = null) {
  const dashboard = getDailyDashboard(startDateStr, endDateStr, customDb);
  const days = Math.max(dashboard.rows.length, 1);

  let totalSodium = 0;
  let totalCalcium = 0;
  let totalIron = 0;
  let totalMagnesium = 0;
  let totalPotassium = 0;
  let totalZinc = 0;
  let totalVitC = 0;
  let totalVitD = 0;
  let totalVitB12 = 0;

  for (const row of dashboard.rows) {
    const m = row.micros;
    totalSodium += m.sodium_mg;
    totalCalcium += m.calcium_mg;
    totalIron += m.iron_mg;
    totalMagnesium += m.magnesium_mg;
    totalPotassium += m.potassium_mg;
    totalZinc += m.zinc_mg;
    totalVitC += m.vit_c_mg;
    totalVitD += m.vit_d_mcg;
    totalVitB12 += m.vit_b12_mcg;
  }

  // Recommended Daily Allowances (RDA) reference values for adult male
  const rda = {
    calcium_mg: 1000,
    iron_mg: 11,
    magnesium_mg: 420,
    potassium_mg: 3500,
    zinc_mg: 11,
    vit_c_mg: 110,
    vit_d_mcg: 15,
    vit_b12_mcg: 4
  };

  const avgIntake = {
    calcium_mg: Math.round(totalCalcium / days),
    iron_mg: Math.round((totalIron / days) * 10) / 10,
    magnesium_mg: Math.round(totalMagnesium / days),
    potassium_mg: Math.round(totalPotassium / days),
    zinc_mg: Math.round((totalZinc / days) * 10) / 10,
    vit_c_mg: Math.round(totalVitC / days),
    vit_d_mcg: Math.round((totalVitD / days) * 10) / 10,
    vit_b12_mcg: Math.round((totalVitB12 / days) * 100) / 100
  };

  const percentageRda = {
    calcium: Math.round((avgIntake.calcium_mg / rda.calcium_mg) * 100),
    iron: Math.round((avgIntake.iron_mg / rda.iron_mg) * 100),
    magnesium: Math.round((avgIntake.magnesium_mg / rda.magnesium_mg) * 100),
    potassium: Math.round((avgIntake.potassium_mg / rda.potassium_mg) * 100),
    zinc: Math.round((avgIntake.zinc_mg / rda.zinc_mg) * 100),
    vit_c: Math.round((avgIntake.vit_c_mg / rda.vit_c_mg) * 100),
    vit_d: Math.round((avgIntake.vit_d_mcg / rda.vit_d_mcg) * 100),
    vit_b12: Math.round((avgIntake.vit_b12_mcg / rda.vit_b12_mcg) * 100)
  };

  return {
    period_days: days,
    avg_intake: avgIntake,
    rda_reference: rda,
    percentage_rda: percentageRda
  };
}

export function getMealDistribution(startDateStr, endDateStr, customDb = null) {
  const db = customDb || getDatabase();
  const stmt = db.prepare(`
    SELECT
      period,
      COUNT(*) AS total_items,
      SUM(
        CASE
          WHEN ml.food_id IS NOT NULL THEN COALESCE(f.energy_kcal_100g, 0) * ml.quantity_g / 100.0
          ELSE COALESCE(r.energy_kcal_per_portion, 0) * ml.quantity_g / (r.total_weight_g / r.portions)
        END
      ) AS total_kcal
    FROM meal_log ml
    LEFT JOIN foods f ON f.id = ml.food_id
    LEFT JOIN recipes r ON r.id = ml.recipe_id
    WHERE ml.date_ BETWEEN ? AND ?
    GROUP BY period
  `);

  const results = stmt.all(startDateStr, endDateStr);
  const periodsMap = {
    petit_dejeuner: 0,
    dejeuner: 0,
    diner: 0,
    collation: 0
  };

  let grandTotalKcal = 0;

  for (const r of results) {
    const kcal = Math.round(r.total_kcal || 0);
    periodsMap[r.period] = kcal;
    grandTotalKcal += kcal;
  }

  return {
    total_kcal: grandTotalKcal,
    distribution: periodsMap
  };
}

import { getDailyDashboard } from './dashboardAggregator.js';
import { getDatabase } from '../database/db.js';
import { getPralRatio } from './pralService.js';

/**
 * Formate un grammage pour l'affichage.
 * Les compléments pèsent souvent moins de 1 g par unité (goutte 0,03 g,
 * gélule 0,35 g) : un arrondi à l'entier affichait "0 g" et faisait croire à
 * une saisie perdue. On garde 2 décimales sous 10 g, entier au-delà.
 */
export function formatGrams(grams) {
  const g = Number(grams);
  if (!Number.isFinite(g)) return '0g';
  if (Math.abs(g) < 10) {
    const s = g.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return `${s}g`;
  }
  return `${Math.round(g)}g`;
}

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
          ELSE COALESCE(r.energy_kcal_per_portion, 0) * COALESCE(ml.portions_count, ml.quantity_g / (r.total_weight_g / r.portions))
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

export function getClinicalDiagnostics(startDateStr, endDateStr, customDb = null) {
  const db = customDb || getDatabase();
  const dashboard = getDailyDashboard(startDateStr, endDateStr, db);
  const days = Math.max(dashboard.rows.length, 1);

  // Sum aggregates
  let totalKcal = 0;
  let totalProteins = 0;
  let totalCarbs = 0;
  let totalSugars = 0;
  let totalFiber = 0;
  let totalFat = 0;
  let totalSatFat = 0;
  let totalMonoFat = 0;
  let totalPolyFat = 0;
  let totalOmega3 = 0;
  let totalOmega6 = 0;
  let totalTransFat = 0;
  let totalCholesterol = 0;
  let totalSalt = 0;

  let totalSodium = 0;
  let totalCalcium = 0;
  let totalIron = 0;
  let totalMagnesium = 0;
  let totalPhosphorus = 0;
  let totalPotassium = 0;
  let totalZinc = 0;
  let totalCopper = 0;
  let totalManganese = 0;
  let totalSelenium = 0;
  let totalIodine = 0;

  let totalVitA = 0;
  let totalVitD = 0;
  let totalVitE = 0;
  let totalVitK = 0;
  let totalVitC = 0;
  let totalVitB1 = 0;
  let totalVitB2 = 0;
  let totalVitB3 = 0;
  let totalVitB5 = 0;
  let totalVitB6 = 0;
  let totalVitB9 = 0;
  let totalVitB12 = 0;

  let totalWater = 0;
  let totalAlcohol = 0;
  let totalCaffeine = 0;

  for (const row of dashboard.rows) {
    totalKcal += row.kcal_in;
    totalProteins += row.proteins_g;
    totalCarbs += row.carbs_g;
    totalSugars += row.sugars_g;
    totalFiber += row.fiber_g;
    totalFat += row.fat_g;
    totalSatFat += row.saturated_fat_g;
    totalMonoFat += row.monounsaturated_fat_g || 0;
    totalPolyFat += row.polyunsaturated_fat_g || 0;
    totalOmega3 += row.omega_3_g || 0;
    totalOmega6 += row.omega_6_g || 0;
    totalTransFat += row.trans_fat_g || 0;
    totalCholesterol += row.cholesterol_mg || 0;
    totalSalt += row.salt_g;

    const m = row.micros || {};
    totalSodium += m.sodium_mg || 0;
    totalCalcium += m.calcium_mg || 0;
    totalIron += m.iron_mg || 0;
    totalMagnesium += m.magnesium_mg || 0;
    totalPhosphorus += m.phosphorus_mg || 0;
    totalPotassium += m.potassium_mg || 0;
    totalZinc += m.zinc_mg || 0;
    totalCopper += m.copper_mg || 0;
    totalManganese += m.manganese_mg || 0;
    totalSelenium += m.selenium_mcg || 0;
    totalIodine += m.iodine_mcg || 0;

    totalVitA += m.vit_a_mcg || 0;
    totalVitD += m.vit_d_mcg || 0;
    totalVitE += m.vit_e_mg || 0;
    totalVitK += m.vit_k_mcg || 0;
    totalVitC += m.vit_c_mg || 0;
    totalVitB1 += m.vit_b1_mg || 0;
    totalVitB2 += m.vit_b2_mg || 0;
    totalVitB3 += m.vit_b3_mg || 0;
    totalVitB5 += m.vit_b5_mg || 0;
    totalVitB6 += m.vit_b6_mg || 0;
    totalVitB9 += m.vit_b9_mcg || 0;
    totalVitB12 += m.vit_b12_mcg || 0;

    totalWater += m.water_g || 0;
    totalAlcohol += m.alcohol_g || 0;
    totalCaffeine += m.caffeine_mg || 0;
  }

  // Daily Averages
  const avgKcal = Math.round(totalKcal / days);
  const avgProteins = Math.round((totalProteins / days) * 10) / 10;
  const avgCarbs = Math.round((totalCarbs / days) * 10) / 10;
  const avgSugars = Math.round((totalSugars / days) * 10) / 10;
  const avgFiber = Math.round((totalFiber / days) * 10) / 10;
  const avgFat = Math.round((totalFat / days) * 10) / 10;
  const avgSatFat = Math.round((totalSatFat / days) * 10) / 10;
  const avgMonoFat = Math.round((totalMonoFat / days) * 10) / 10;
  const avgPolyFat = Math.round((totalPolyFat / days) * 10) / 10;
  const avgOmega3 = Math.round((totalOmega3 / days) * 100) / 100;
  const avgOmega6 = Math.round((totalOmega6 / days) * 100) / 100;
  const avgTransFat = Math.round((totalTransFat / days) * 100) / 100;
  const avgCholesterol = Math.round(totalCholesterol / days);
  const avgSalt = Math.round((totalSalt / days) * 100) / 100;

  const avgSodium = Math.round(totalSodium / days);
  const avgCalcium = Math.round(totalCalcium / days);
  const avgIron = Math.round((totalIron / days) * 10) / 10;
  const avgMagnesium = Math.round(totalMagnesium / days);
  const avgPhosphorus = Math.round(totalPhosphorus / days);
  const avgPotassium = Math.round(totalPotassium / days);
  const avgZinc = Math.round((totalZinc / days) * 10) / 10;
  const avgCopper = Math.round((totalCopper / days) * 100) / 100;
  const avgManganese = Math.round((totalManganese / days) * 100) / 100;
  const avgSelenium = Math.round((totalSelenium / days) * 10) / 10;
  const avgIodine = Math.round((totalIodine / days) * 10) / 10;

  const avgVitA = Math.round(totalVitA / days);
  const avgVitD = Math.round((totalVitD / days) * 10) / 10;
  const avgVitE = Math.round((totalVitE / days) * 10) / 10;
  const avgVitK = Math.round((totalVitK / days) * 10) / 10;
  const avgVitC = Math.round(totalVitC / days);
  const avgVitB1 = Math.round((totalVitB1 / days) * 100) / 100;
  const avgVitB2 = Math.round((totalVitB2 / days) * 100) / 100;
  const avgVitB3 = Math.round((totalVitB3 / days) * 10) / 10;
  const avgVitB5 = Math.round((totalVitB5 / days) * 10) / 10;
  const avgVitB6 = Math.round((totalVitB6 / days) * 100) / 100;
  const avgVitB9 = Math.round(totalVitB9 / days);
  const avgVitB12 = Math.round((totalVitB12 / days) * 100) / 100;

  const avgWater = Math.round((totalWater / days) * 10) / 10;
  const avgAlcohol = Math.round((totalAlcohol / days) * 10) / 10;
  const avgCaffeine = Math.round(totalCaffeine / days);

  // Definitions of nutrients with references and status computation
  const itemsList = [
    // --- MACRONUTRIENTS & FIBRES ---
    {
      id: 'kcal',
      name: 'Énergie (Calories)',
      category: 'Macronutriments',
      unit: 'kcal',
      avg_intake: avgKcal,
      total_intake: Math.round(totalKcal),
      target: 2000,
      min_target: 1800,
      max_target: 2500,
      sources_conseillees: 'Féculents complets, légumineuses, oléagineux, poissons et viandes maigres.'
    },
    {
      id: 'proteins',
      name: 'Protéines',
      category: 'Macronutriments',
      unit: 'g',
      avg_intake: avgProteins,
      total_intake: Math.round(totalProteins * 10) / 10,
      target: 70,
      min_target: 50,
      sources_conseillees: 'Œufs, volaille, poisson, tofu, tempeh, lentilles, pois chiches, skyr.'
    },
    {
      id: 'carbs',
      name: 'Glucides',
      category: 'Macronutriments',
      unit: 'g',
      avg_intake: avgCarbs,
      total_intake: Math.round(totalCarbs * 10) / 10,
      target: 250,
      min_target: 180,
      sources_conseillees: 'Flocons d’avoine, riz complet, patate douce, quinoa, sarrasin.'
    },
    {
      id: 'sugars',
      name: 'Sucres simples',
      category: 'Macronutriments',
      unit: 'g',
      avg_intake: avgSugars,
      total_intake: Math.round(totalSugars * 10) / 10,
      target: 50,
      max_limit: 50,
      is_upper_limit: true,
      sources_conseillees: 'Privilégier les fruits entiers riches en fibres et limiter les sucres ajoutés.'
    },
    {
      id: 'fiber',
      name: 'Fibres alimentaires',
      category: 'Macronutriments',
      unit: 'g',
      avg_intake: avgFiber,
      total_intake: Math.round(totalFiber * 10) / 10,
      target: 30,
      min_target: 25,
      sources_conseillees: 'Légumineuses (lentilles, pois chiches), son d’avoine, graines de chia, légumes verts, fruits frais avec peau.'
    },
    {
      id: 'fat',
      name: 'Lipides totaux',
      category: 'Macronutriments',
      unit: 'g',
      avg_intake: avgFat,
      total_intake: Math.round(totalFat * 10) / 10,
      target: 70,
      min_target: 50,
      max_target: 90,
      sources_conseillees: 'Huile d’olive, avocat, noix, amandes, graines de lin, poissons gras.'
    },
    {
      id: 'saturated_fat',
      name: 'Graisses saturées (Sat.)',
      category: 'Macronutriments',
      unit: 'g',
      avg_intake: avgSatFat,
      total_intake: Math.round(totalSatFat * 10) / 10,
      target: 20,
      max_limit: 22,
      is_upper_limit: true,
      sources_conseillees: 'Limiter les viandes grasses, la charcuterie, le beurre et l’huile de palme.'
    },
    {
      id: 'salt',
      name: 'Sel (NaCl)',
      category: 'Macronutriments',
      unit: 'g',
      avg_intake: avgSalt,
      total_intake: Math.round(totalSalt * 100) / 100,
      target: 5,
      max_limit: 5,
      is_upper_limit: true,
      sources_conseillees: 'Réduire le sel de table et éviter les plats préparés et la charcuterie ultra-transformée.'
    },
    {
      id: 'monounsaturated_fat',
      name: 'Acides gras mono-insaturés (Mono-insat.)',
      category: 'Macronutriments',
      unit: 'g',
      avg_intake: avgMonoFat,
      total_intake: Math.round(totalMonoFat * 10) / 10,
      target: 35,
      min_target: 25,
      sources_conseillees: 'Huile d’olive, avocat, noisettes, amandes, graines de colza.'
    },
    {
      id: 'polyunsaturated_fat',
      name: 'Acides gras poly-insaturés (Poly-insat.)',
      category: 'Macronutriments',
      unit: 'g',
      avg_intake: avgPolyFat,
      total_intake: Math.round(totalPolyFat * 10) / 10,
      target: 12,
      min_target: 8,
      sources_conseillees: 'Poissons gras, graines de lin et de chia, huile de noix, colza.'
    },
    {
      id: 'omega_3',
      name: 'Oméga-3 (Ω3)',
      category: 'Macronutriments',
      unit: 'g',
      avg_intake: avgOmega3,
      total_intake: Math.round(totalOmega3 * 100) / 100,
      target: 2.5,
      min_target: 1.8,
      sources_conseillees: 'Sardines, maquereaux, huile de lin, graines de chia, noix de Grenoble.'
    },
    {
      id: 'omega_6',
      name: 'Oméga-6 (Ω6)',
      category: 'Macronutriments',
      unit: 'g',
      avg_intake: avgOmega6,
      total_intake: Math.round(totalOmega6 * 100) / 100,
      target: 10,
      max_limit: 15,
      sources_conseillees: 'Graines de tournesol, noix, œufs, volaille.'
    },
    {
      id: 'trans_fat',
      name: 'Acides gras trans',
      category: 'Macronutriments',
      unit: 'g',
      avg_intake: avgTransFat,
      total_intake: Math.round(totalTransFat * 100) / 100,
      target: 2,
      max_limit: 2,
      is_upper_limit: true,
      sources_conseillees: 'Éviter les matières grasses partiellement hydrogénées et viennoiseries industrielles.'
    },
    {
      id: 'cholesterol',
      name: 'Cholestérol (Chol.)',
      category: 'Macronutriments',
      unit: 'mg',
      avg_intake: avgCholesterol,
      total_intake: Math.round(totalCholesterol),
      target: 300,
      max_limit: 300,
      is_upper_limit: true,
      sources_conseillees: 'Œufs, abats, crevettes, beurre (à modérer selon profil lipidique).'
    },

    // --- MINÉRAUX & OLIGO-ÉLÉMENTS ---
    {
      id: 'sodium',
      name: 'Sodium',
      category: 'Minéraux',
      unit: 'mg',
      avg_intake: avgSodium,
      total_intake: Math.round(totalSodium),
      target: 2000,
      max_limit: 2300,
      is_upper_limit: true,
      sources_conseillees: 'Préférer le potassium et limiter l’apport en sel ajouté.'
    },
    {
      id: 'calcium',
      name: 'Calcium (Ca)',
      category: 'Minéraux',
      unit: 'mg',
      avg_intake: avgCalcium,
      total_intake: Math.round(totalCalcium),
      target: 1000,
      min_target: 800,
      sources_conseillees: 'Produits laitiers, amandes, légumes vert foncé (chou frisé, brocoli), tofu, eaux minérales calciques.'
    },
    {
      id: 'iron',
      name: 'Fer (Fe)',
      category: 'Minéraux',
      unit: 'mg',
      avg_intake: avgIron,
      total_intake: Math.round(totalIron * 10) / 10,
      target: 11,
      min_target: 9,
      sources_conseillees: 'Boudin noir, viande rouge maigre, foie, lentilles, graines de sésame, spiruline.'
    },
    {
      id: 'magnesium',
      name: 'Magnésium (Mg)',
      category: 'Minéraux',
      unit: 'mg',
      avg_intake: avgMagnesium,
      total_intake: Math.round(totalMagnesium),
      target: 420,
      min_target: 350,
      sources_conseillees: 'Chocolat noir (>70%), amandes, graines de courge, céréales complètes, légumineuses.'
    },
    {
      id: 'phosphorus',
      name: 'Phosphore (P)',
      category: 'Minéraux',
      unit: 'mg',
      avg_intake: avgPhosphorus,
      total_intake: Math.round(totalPhosphorus),
      target: 700,
      min_target: 550,
      sources_conseillees: 'Poissons, volaille, œufs, graines de courge, fromage.'
    },
    {
      id: 'potassium',
      name: 'Potassium (K)',
      category: 'Minéraux',
      unit: 'mg',
      avg_intake: avgPotassium,
      total_intake: Math.round(totalPotassium),
      target: 3500,
      min_target: 3000,
      sources_conseillees: 'Bananes, patates douces, épinards, avocat, eau de coco, haricots blancs.'
    },
    {
      id: 'zinc',
      name: 'Zinc (Zn)',
      category: 'Minéraux',
      unit: 'mg',
      avg_intake: avgZinc,
      total_intake: Math.round(totalZinc * 10) / 10,
      target: 11,
      min_target: 9,
      sources_conseillees: 'Huîtres, fruits de mer, viandes de bœuf et de volaille, graines de courge, germe de blé.'
    },
    {
      id: 'copper',
      name: 'Cuivre',
      category: 'Minéraux',
      unit: 'mg',
      avg_intake: avgCopper,
      total_intake: Math.round(totalCopper * 100) / 100,
      target: 1.5,
      min_target: 1.2,
      sources_conseillees: 'Foie de veau, fruits de mer, chocolat noir, champignons, noix, légumineuses.'
    },
    {
      id: 'manganese',
      name: 'Manganèse (Mn)',
      category: 'Minéraux',
      unit: 'mg',
      avg_intake: avgManganese,
      total_intake: Math.round(totalManganese * 100) / 100,
      target: 2.5,
      min_target: 2.0,
      sources_conseillees: 'Thé noir/vert, noisettes, flocons d’avoine, ananas, moules.'
    },
    {
      id: 'selenium',
      name: 'Sélénium (Se)',
      category: 'Minéraux',
      unit: 'mcg',
      avg_intake: avgSelenium,
      total_intake: Math.round(totalSelenium * 10) / 10,
      target: 70,
      min_target: 55,
      sources_conseillees: 'Noix du Brésil (2 noix suffisent), thon, cabillaud, œufs, graines de tournesol.'
    },
    {
      id: 'iodine',
      name: 'Iode',
      category: 'Minéraux',
      unit: 'mcg',
      avg_intake: avgIodine,
      total_intake: Math.round(totalIodine * 10) / 10,
      target: 150,
      min_target: 120,
      sources_conseillees: 'Poissons de mer, algues (nori, wakame), fruits de mer, sel iodé.'
    },

    // --- VITAMINES ---
    {
      id: 'vit_a',
      name: 'Vitamine A',
      category: 'Vitamines',
      unit: 'mcg',
      avg_intake: avgVitA,
      total_intake: Math.round(totalVitA),
      target: 750,
      min_target: 600,
      sources_conseillees: 'Carottes, patate douce, potiron, épinards, foie de veau, beurre bio.'
    },
    {
      id: 'vit_d',
      name: 'Vitamine D',
      category: 'Vitamines',
      unit: 'mcg',
      avg_intake: avgVitD,
      total_intake: Math.round(totalVitD * 10) / 10,
      target: 15,
      min_target: 10,
      sources_conseillees: 'Exposition solaire, poissons gras (saumon, sardines, maquereaux), jaune d’œuf, huile de foie de morue.'
    },
    {
      id: 'vit_e',
      name: 'Vitamine E',
      category: 'Vitamines',
      unit: 'mg',
      avg_intake: avgVitE,
      total_intake: Math.round(totalVitE * 10) / 10,
      target: 15,
      min_target: 12,
      sources_conseillees: 'Huile de tournesol et de germe de blé, amandes, noisettes, graines de tournesol, avocat.'
    },
    {
      id: 'vit_k',
      name: 'Vitamine K',
      category: 'Vitamines',
      unit: 'mcg',
      avg_intake: avgVitK,
      total_intake: Math.round(totalVitK * 10) / 10,
      target: 79,
      min_target: 60,
      sources_conseillees: 'Légumes à feuilles vert foncé (chou frisé, épinards, persil, brocoli).'
    },
    {
      id: 'vit_c',
      name: 'Vitamine C',
      category: 'Vitamines',
      unit: 'mg',
      avg_intake: avgVitC,
      total_intake: Math.round(totalVitC),
      target: 110,
      min_target: 80,
      sources_conseillees: 'Poivrons rouges, kiwis, agrumes (oranges, pamplemousses), brocoli crus, fraises, cassis.'
    },
    {
      id: 'vit_b1',
      name: 'Vitamine B1 (Thiamine)',
      category: 'Vitamines',
      unit: 'mg',
      avg_intake: avgVitB1,
      total_intake: Math.round(totalVitB1 * 100) / 100,
      target: 1.2,
      min_target: 1.0,
      sources_conseillees: 'Levure de bière, porc maigre, graines de tournesol, céréales complètes, légumineuses.'
    },
    {
      id: 'vit_b2',
      name: 'Vitamine B2 (Riboflavine)',
      category: 'Vitamines',
      unit: 'mg',
      avg_intake: avgVitB2,
      total_intake: Math.round(totalVitB2 * 100) / 100,
      target: 1.6,
      min_target: 1.3,
      sources_conseillees: 'Produits laitiers, œufs, foie, amandes, champignons.'
    },
    {
      id: 'vit_b3',
      name: 'Vitamine B3 (Niacine)',
      category: 'Vitamines',
      unit: 'mg',
      avg_intake: avgVitB3,
      total_intake: Math.round(totalVitB3 * 10) / 10,
      target: 16,
      min_target: 14,
      sources_conseillees: 'Poulet, dinde, thon, cacahuètes, champignons, céréales enrichies.'
    },
    {
      id: 'vit_b5',
      name: 'Vitamine B5 (Acide pantothénique)',
      category: 'Vitamines',
      unit: 'mg',
      avg_intake: avgVitB5,
      total_intake: Math.round(totalVitB5 * 10) / 10,
      target: 5.0,
      min_target: 4.0,
      sources_conseillees: 'Champignons shiitake, œufs, foie, saumon, graines de tournesol, avoine.'
    },
    {
      id: 'vit_b6',
      name: 'Vitamine B6',
      category: 'Vitamines',
      unit: 'mg',
      avg_intake: avgVitB6,
      total_intake: Math.round(totalVitB6 * 100) / 100,
      target: 1.7,
      min_target: 1.4,
      sources_conseillees: 'Bananes, volaille, thon, saumon, pommes de terre, pistaches.'
    },
    {
      id: 'vit_b9',
      name: 'Vitamine B9 (Acide folique)',
      category: 'Vitamines',
      unit: 'mcg',
      avg_intake: avgVitB9,
      total_intake: Math.round(totalVitB9),
      target: 330,
      min_target: 250,
      sources_conseillees: 'Épinards, asperges, brocolis, lentilles, pois chiches, œufs, foies.'
    },
    {
      id: 'vit_b12',
      name: 'Vitamine B12',
      category: 'Vitamines',
      unit: 'mcg',
      avg_intake: avgVitB12,
      total_intake: Math.round(totalVitB12 * 100) / 100,
      target: 4.0,
      min_target: 2.5,
      sources_conseillees: 'Foie de génisse, huîtres, maqueraux, sardines, viande rouge, œufs, fromage.'
    },

    // --- HYDRATATION & AUTRES ---
    {
      id: 'water',
      name: 'Eau',
      category: 'Hydratation',
      unit: 'g',
      avg_intake: avgWater,
      total_intake: Math.round(totalWater * 10) / 10,
      target: 2000,
      min_target: 1500,
      sources_conseillees: 'Eau minérale, tisanes, infusions, fruits et légumes frais.'
    },
    {
      id: 'alcohol',
      name: 'Alcool',
      category: 'Autres',
      unit: 'g',
      avg_intake: avgAlcohol,
      total_intake: Math.round(totalAlcohol * 10) / 10,
      target: 0,
      max_limit: 20,
      is_upper_limit: true,
      sources_conseillees: 'À modérer au maximum (recommandation ANSES < 2 verres/jour).'
    },
    {
      id: 'caffeine',
      name: 'Caféine',
      category: 'Autres',
      unit: 'mg',
      avg_intake: avgCaffeine,
      total_intake: Math.round(totalCaffeine),
      target: 400,
      max_limit: 400,
      is_upper_limit: true,
      sources_conseillees: 'Café, thé, maté (éviter après 14h pour favoriser la récupération nerveuse).'
    }
  ];

  // Compute status and percent_arj for each item
  let deficitCount = 0;
  let excessCount = 0;

  const processedNutrients = itemsList.map((item) => {
    const pct = item.target > 0 ? Math.round((item.avg_intake / item.target) * 100) : 0;
    let status = 'OPTIMAL'; // OPTIMAL, DEFICIT_CRITIQUE, SOUS_OPTIMAL, EXCES_RISQUE, EXCES_ATTENTION
    let isProblem = false;

    if (item.id === 'alcohol') {
      if (item.avg_intake > 20) {
        status = 'EXCES_RISQUE';
        isProblem = true;
        excessCount++;
      } else if (item.avg_intake > 0) {
        status = 'EXCES_ATTENTION';
        isProblem = true;
        excessCount++;
      } else {
        status = 'OPTIMAL';
      }
    } else if (item.is_upper_limit) {
      if (item.avg_intake > item.target * 1.3) {
        status = 'EXCES_RISQUE';
        isProblem = true;
        excessCount++;
      } else if (item.avg_intake > item.target) {
        status = 'EXCES_ATTENTION';
        isProblem = true;
        excessCount++;
      } else {
        status = 'OPTIMAL';
      }
    } else if (item.id === 'kcal') {
      if (pct < 70) {
        status = 'DEFICIT_CRITIQUE';
        isProblem = true;
        deficitCount++;
      } else if (pct < 85) {
        status = 'SOUS_OPTIMAL';
        isProblem = true;
        deficitCount++;
      } else if (pct > 125) {
        status = 'EXCES_ATTENTION';
        isProblem = true;
        excessCount++;
      } else {
        status = 'OPTIMAL';
      }
    } else {
      if (pct < 70) {
        status = 'DEFICIT_CRITIQUE';
        isProblem = true;
        deficitCount++;
      } else if (pct < 90) {
        status = 'SOUS_OPTIMAL';
        isProblem = true;
        deficitCount++;
      } else {
        status = 'OPTIMAL';
      }
    }

    return {
      ...item,
      percentage_arj: pct,
      status,
      is_problem: isProblem
    };
  });

  // --- CLINICAL RATIOS & BIOMARKERS ---
  let omegaRatioVal = null;
  let omegaRatioStatus = 'INDETERMINE';
  let omegaIsProblem = false;
  if (avgOmega3 > 0) {
    omegaRatioVal = Math.round((avgOmega6 / avgOmega3) * 10) / 10;
    if (omegaRatioVal > 8.0) {
      omegaRatioStatus = 'CRITIQUE';
      omegaIsProblem = true;
    } else if (omegaRatioVal > 4.0) {
      omegaRatioStatus = 'ATTENTION';
      omegaIsProblem = true;
    } else {
      omegaRatioStatus = 'OPTIMAL';
    }
  } else if (avgOmega6 > 0) {
    // Oméga-6 consommé sans aucun Oméga-3 : déséquilibre critique
    omegaRatioVal = null;
    omegaRatioStatus = 'CRITIQUE';
    omegaIsProblem = true;
  }

  let potSodRatioVal = null;
  let potSodStatus = 'INDETERMINE';
  let potSodProblem = false;
  if (avgSodium > 0) {
    potSodRatioVal = Math.round((avgPotassium / avgSodium) * 100) / 100;
    if (potSodRatioVal < 1.0) {
      potSodStatus = 'CRITIQUE';
      potSodProblem = true;
    } else if (potSodRatioVal < 1.7) {
      potSodStatus = 'SOUS_OPTIMAL';
      potSodProblem = true;
    } else {
      potSodStatus = 'OPTIMAL';
    }
  } else if (avgPotassium > 0) {
    // Apport potassique sans sel/sodium excessif
    potSodRatioVal = null;
    potSodStatus = 'OPTIMAL';
  }

  let caMgRatioVal = null;
  let caMgStatus = 'INDETERMINE';
  let caMgProblem = false;
  if (avgMagnesium > 0) {
    caMgRatioVal = Math.round((avgCalcium / avgMagnesium) * 10) / 10;
    if (caMgRatioVal < 1.5 || caMgRatioVal > 2.2) {
      caMgStatus = 'ATTENTION';
      caMgProblem = true;
    } else {
      caMgStatus = 'OPTIMAL';
    }
  }

  let znCuRatioVal = null;
  let znCuStatus = 'INDETERMINE';
  let znCuProblem = false;
  if (avgCopper > 0) {
    znCuRatioVal = Math.round((avgZinc / avgCopper) * 10) / 10;
    if (znCuRatioVal < 8.0 || znCuRatioVal > 15.0) {
      znCuStatus = 'ATTENTION';
      znCuProblem = true;
    } else {
      znCuStatus = 'OPTIMAL';
    }
  }

  let fiberDensityVal = null;
  let fiberDensityStatus = 'INDETERMINE';
  let fiberDensityProblem = false;
  if (avgKcal > 0) {
    fiberDensityVal = Math.round((avgFiber / avgKcal) * 1000 * 10) / 10;
    if (fiberDensityVal < 10.0) {
      fiberDensityStatus = 'CRITIQUE';
      fiberDensityProblem = true;
    } else if (fiberDensityVal < 14.0) {
      fiberDensityStatus = 'SOUS_OPTIMAL';
      fiberDensityProblem = true;
    } else {
      fiberDensityStatus = 'OPTIMAL';
    }
  }

  let satFatShareVal = null;
  let satFatStatus = 'INDETERMINE';
  let satFatProblem = false;
  if (avgFat > 0) {
    satFatShareVal = Math.round((avgSatFat / avgFat) * 100);
    if (satFatShareVal > 38) {
      satFatStatus = 'CRITIQUE';
      satFatProblem = true;
    } else if (satFatShareVal > 33) {
      satFatStatus = 'ATTENTION';
      satFatProblem = true;
    } else {
      satFatStatus = 'OPTIMAL';
    }
  } else if (days > 0) {
    satFatShareVal = 0;
    satFatStatus = 'OPTIMAL';
  }

  // --- NOUVEAUX RATIOS CLINIQUES RECOMMANDÉS (AUDIT MEDICAL) ---
  // 1. Ratio Glucides / Fibres (Harvard Carb-to-Fiber Rule)
  let carbFiberRatioVal = null;
  let carbFiberStatus = 'INDETERMINE';
  let carbFiberProblem = false;
  if (avgFiber > 0) {
    carbFiberRatioVal = Math.round((avgCarbs / avgFiber) * 10) / 10;
    if (carbFiberRatioVal <= 10.0) {
      carbFiberStatus = 'OPTIMAL';
    } else if (carbFiberRatioVal <= 15.0) {
      carbFiberStatus = 'SOUS_OPTIMAL';
      carbFiberProblem = true;
    } else {
      carbFiberStatus = 'CRITIQUE';
      carbFiberProblem = true;
    }
  } else if (avgCarbs > 0) {
    // Glucides consommés sans aucune fibre : pic glycémique et absorption rapide
    carbFiberRatioVal = null;
    carbFiberStatus = 'CRITIQUE';
    carbFiberProblem = true;
  }

  // 2. Ratio Calcium / Phosphore (Ca/P)
  let caPRatioVal = null;
  let caPStatus = 'INDETERMINE';
  let caPProblem = false;
  if (avgPhosphorus > 0) {
    caPRatioVal = Math.round((avgCalcium / avgPhosphorus) * 100) / 100;
    if (caPRatioVal >= 1.0 && caPRatioVal <= 1.5) {
      caPStatus = 'OPTIMAL';
    } else if ((caPRatioVal >= 0.8 && caPRatioVal < 1.0) || caPRatioVal > 1.5) {
      caPStatus = 'ATTENTION';
      caPProblem = true;
    } else {
      caPStatus = 'CRITIQUE';
      caPProblem = true;
    }
  }

  // 3. Densité Protéique Pondérale (g/kg via Boditrax)
  const weightScan = db.prepare(`
    SELECT weight_kg FROM body_scans
    WHERE weight_kg IS NOT NULL AND weight_kg > 0
    ORDER BY CASE WHEN scan_date BETWEEN ? AND ? THEN 0 ELSE 1 END, scan_datetime DESC
    LIMIT 1
  `).get(startDateStr, endDateStr);
  const userWeightKg = weightScan?.weight_kg || null;

  let protWeightVal = null;
  let protWeightStatus = 'INDETERMINE';
  let protWeightProblem = false;
  if (userWeightKg && userWeightKg > 0) {
    protWeightVal = Math.round((avgProteins / userWeightKg) * 100) / 100;
    if (protWeightVal >= 1.2 && protWeightVal <= 2.2) {
      protWeightStatus = 'OPTIMAL';
    } else if (protWeightVal >= 0.8 && protWeightVal < 1.2) {
      protWeightStatus = 'SOUS_OPTIMAL';
      protWeightProblem = true;
    } else if (protWeightVal < 0.8) {
      protWeightStatus = 'CRITIQUE';
      protWeightProblem = true;
    } else {
      protWeightStatus = 'ATTENTION';
      protWeightProblem = true;
    }
  }

  // 4. Index Lipidique P/S (Poly-insaturés / Saturés)
  let psIndexVal = null;
  let psIndexStatus = 'INDETERMINE';
  let psIndexProblem = false;
  if (avgSatFat > 0) {
    psIndexVal = Math.round((avgPolyFat / avgSatFat) * 100) / 100;
    if (psIndexVal >= 1.0) {
      psIndexStatus = 'OPTIMAL';
    } else if (psIndexVal >= 0.4) {
      psIndexStatus = 'ATTENTION';
      psIndexProblem = true;
    } else {
      psIndexStatus = 'CRITIQUE';
      psIndexProblem = true;
    }
  } else if (avgPolyFat > 0) {
    psIndexVal = null;
    psIndexStatus = 'OPTIMAL';
  }

  // PRAL : calcul délégué au service PRAL (domaine pur + frontière SQL).
  // Le ratio conserve l'identifiant historique `indice_pral` : compatibilité
  // API/frontend préservée, mais la formule, la qualité des données, le
  // dénominateur et les seuils ne sont plus calculés ici.
  const pralRatio = getPralRatio(startDateStr, endDateStr, db);

  const totalMacroKcal = (avgProteins * 4) + (avgCarbs * 4) + (avgFat * 9);
  let macroSplit = { protein_pct: 0, carbs_pct: 0, fat_pct: 0 };
  if (totalMacroKcal > 0) {
    const pPct = Math.round(((avgProteins * 4) / totalMacroKcal) * 100);
    const cPct = Math.round(((avgCarbs * 4) / totalMacroKcal) * 100);
    const fPct = Math.max(0, 100 - pPct - cPct);
    macroSplit = {
      protein_pct: pPct,
      carbs_pct: cPct,
      fat_pct: fPct
    };
  }

  const ratios = [
    {
      id: 'ratio_omega6_omega3',
      label: 'Ratio Oméga-6 / Oméga-3',
      value: omegaRatioVal,
      unit: ': 1',
      target_label: 'Cible < 4.0 : 1',
      status: omegaRatioStatus,
      is_problem: omegaIsProblem,
      explanation: 'Un ratio supérieur à 4.0 entretient une inflammation systémique de bas grade. Consommez davantage de petits poissons gras (sardines, maquereaux) et d’huiles de lin/noix.'
    },
    {
      id: 'ratio_potassium_sodium',
      label: 'Ratio Potassium / Sodium',
      value: potSodRatioVal,
      unit: ': 1',
      target_label: 'Cible >= 1.7 : 1',
      status: potSodStatus,
      is_problem: potSodProblem,
      explanation: 'Un ratio massique inférieur à 1.7 (équivalent au ratio molaire 1:1 de l’OMS) favorise l’hypertension artérielle. Diminuez les produits salés et consommez plus de végétaux riches en potassium.'
    },
    {
      id: 'ratio_glucides_fibres',
      label: 'Ratio Glucides / Fibres',
      value: carbFiberRatioVal,
      unit: ': 1',
      target_label: 'Cible <= 10.0 : 1',
      status: carbFiberStatus,
      is_problem: carbFiberProblem,
      explanation: 'Règle 10:1 de Harvard (Index de qualité glucidique). Un ratio <= 10 garantit des glucides non raffinés, stabilise la glycémie et améliore la sensibilité à l’insuline.'
    },
    {
      id: 'ratio_calcium_magnesium',
      label: 'Ratio Calcium / Magnésium',
      value: caMgRatioVal,
      unit: ': 1',
      target_label: 'Cible 1.5 - 2.2 : 1',
      status: caMgStatus,
      is_problem: caMgProblem,
      explanation: 'Le magnésium est la clé de la biodisponibilité du calcium. Un déséquilibre impacte le système musculaire et nerveux.'
    },
    {
      id: 'ratio_calcium_phosphore',
      label: 'Ratio Calcium / Phosphore',
      value: caPRatioVal,
      unit: ': 1',
      target_label: 'Cible 1.0 - 1.5 : 1',
      status: caPStatus,
      is_problem: caPProblem,
      explanation: 'Régulateur clé de la matrice osseuse. Un excès de phosphore (< 1.0) stimule la parathormone (PTH) et favorise la déminéralisation osseuse.'
    },
    {
      id: 'ratio_zinc_cuivre',
      label: 'Ratio Zinc / Cuivre',
      value: znCuRatioVal,
      unit: ': 1',
      target_label: 'Cible 8.0 - 15.0 : 1',
      status: znCuStatus,
      is_problem: znCuProblem,
      explanation: 'Un déséquilibre persistant nuit aux réactions enzymatiques antioxydantes et à l’immunité.'
    },
    {
      id: 'densite_fibres',
      label: 'Densité en Fibres',
      value: fiberDensityVal,
      unit: 'g / 1000 kcal',
      target_label: 'Cible >= 14g / 1000 kcal',
      status: fiberDensityStatus,
      is_problem: fiberDensityProblem,
      explanation: 'Mesure la qualité nutritionnelle globale et la satiété procurée par le régime alimentaire.'
    },
    {
      id: 'part_gras_sature',
      label: 'Part des Graisses Saturées',
      value: satFatShareVal,
      unit: '% des lipides',
      target_label: 'Cible <= 33%',
      status: satFatStatus,
      is_problem: satFatProblem,
      explanation: 'Un excès d’acides gras saturés (>33% des lipides totaux) élève le LDL-cholestérol sanguin.'
    },
    {
      id: 'index_lipidique_ps',
      label: 'Index Lipidique P/S (Poly / Sat)',
      value: psIndexVal,
      unit: ': 1',
      target_label: 'Cible >= 1.0 : 1',
      status: psIndexStatus,
      is_problem: psIndexProblem,
      explanation: 'Rapport cardiométabolique de substitution lipidique. Un index >= 1.0 favorise la modulation à la baisse du LDL-cholestérol athérogène.'
    },
    {
      id: 'densite_proteique_ponderale',
      label: 'Densité Protéique Pondérale',
      value: protWeightVal,
      unit: 'g / kg',
      target_label: 'Cible 1.2 - 1.8 g / kg',
      status: protWeightStatus,
      is_problem: protWeightProblem,
      explanation: userWeightKg ? `Apport rapporté au poids corporel (${userWeightKg} kg, dernier scan Boditrax). Préserve la masse musculaire active et prévient la sarcopénie.` : 'Poids non renseigné via scan Boditrax.'
    },
    pralRatio
  ];

  // Weighted Compliance Score (seuls les items déterminables sont comptabilisés)
  const allEvaluatedItems = [
    ...processedNutrients.map(n => n.status),
    ...ratios.map(r => r.status)
  ].filter(s => s !== 'INDETERMINE' && s !== 'NON_EVALUABLE');

  let totalScorePoints = 0;
  for (const s of allEvaluatedItems) {
    if (s === 'OPTIMAL') {
      totalScorePoints += 1.0;
    } else if (s === 'SOUS_OPTIMAL' || s === 'EXCES_ATTENTION' || s === 'ATTENTION') {
      totalScorePoints += 0.75;
    } else {
      // DEFICIT_CRITIQUE or EXCES_RISQUE or CRITIQUE
      totalScorePoints += 0.30;
    }
  }

  const globalComplianceScore = allEvaluatedItems.length > 0
    ? Math.round((totalScorePoints / allEvaluatedItems.length) * 100)
    : 100;
  const totalProblemsCount = processedNutrients.filter(n => n.is_problem).length + ratios.filter(r => r.is_problem).length;

  // Daily Meals & Sports Breakdown for Day-by-Day Report Export
  const mealEntries = db.prepare(`
    SELECT ml.*,
           f.name as food_name, f.energy_kcal_100g, f.proteins_g_100g, f.carbohydrates_g_100g, f.fat_g_100g, f.fiber_g_100g,
           r.name as recipe_name, r.energy_kcal_per_portion, r.proteins_g_per_portion, r.carbohydrates_g_per_portion, r.fat_g_per_portion, r.fiber_g_per_portion, r.total_weight_g as recipe_total_weight, r.portions as recipe_portions
    FROM meal_log ml
    LEFT JOIN foods f ON f.id = ml.food_id
    LEFT JOIN recipes r ON r.id = ml.recipe_id
    WHERE ml.date_ BETWEEN ? AND ?
    ORDER BY ml.date_ ASC, ml.logged_at ASC
  `).all(startDateStr, endDateStr);

  const sportEntries = db.prepare(`
    SELECT * FROM sport_log
    WHERE date_ BETWEEN ? AND ?
    ORDER BY date_ ASC, logged_at ASC
  `).all(startDateStr, endDateStr);

  // ── Boditrax delta : seulement les scans nouveaux depuis le dernier export
  const lastMeta = db.prepare(
    'SELECT last_boditrax_id FROM exports_metadata WHERE export_type = ?'
  ).get('diagnostics');
  const lastBoditraxId = lastMeta?.last_boditrax_id ?? 0;

  const boditraxEntries = db.prepare(`
    SELECT * FROM body_scans
    WHERE id > ? AND scan_date BETWEEN ? AND ?
    ORDER BY scan_date ASC
  `).all(lastBoditraxId, startDateStr, endDateStr);

  const dailyLogsMap = new Map();
  for (const row of dashboard.rows) {
    dailyLogsMap.set(row.date, {
      date: row.date,
      meals: {
        petit_dejeuner: [],
        dejeuner: [],
        diner: [],
        collation: []
      },
      sports: [],
      boditrax: [],
      totals: {
        kcal: row.kcal_in,
        target_kcal: row.targets.kcal,
        proteins_g: row.proteins_g,
        target_proteins_g: row.targets.proteins_g,
        carbs_g: row.carbs_g,
        target_carbs_g: row.targets.carbs_g,
        sugars_g: row.sugars_g,
        fiber_g: row.fiber_g,
        target_fiber_g: row.targets.fiber_g,
        fat_g: row.fat_g,
        target_fat_g: row.targets.fat_g,
        saturated_fat_g: row.saturated_fat_g,
        monounsaturated_fat_g: row.monounsaturated_fat_g || 0,
        polyunsaturated_fat_g: row.polyunsaturated_fat_g || 0,
        omega_3_g: row.omega_3_g,
        omega_6_g: row.omega_6_g,
        trans_fat_g: row.trans_fat_g || 0,
        cholesterol_mg: row.cholesterol_mg || 0,
        salt_g: row.salt_g,
        sodium_mg: row.micros?.sodium_mg || 0,
        calcium_mg: row.micros?.calcium_mg || 0,
        iron_mg: row.micros?.iron_mg || 0,
        magnesium_mg: row.micros?.magnesium_mg || 0,
        phosphorus_mg: row.micros?.phosphorus_mg || 0,
        potassium_mg: row.micros?.potassium_mg || 0,
        zinc_mg: row.micros?.zinc_mg || 0,
        copper_mg: row.micros?.copper_mg || 0,
        manganese_mg: row.micros?.manganese_mg || 0,
        selenium_mcg: row.micros?.selenium_mcg || 0,
        iodine_mcg: row.micros?.iodine_mcg || 0,
        vit_a_mcg: row.micros?.vit_a_mcg || 0,
        vit_d_mcg: row.micros?.vit_d_mcg || 0,
        vit_e_mg: row.micros?.vit_e_mg || 0,
        vit_k_mcg: row.micros?.vit_k_mcg || 0,
        vit_c_mg: row.micros?.vit_c_mg || 0,
        vit_b1_mg: row.micros?.vit_b1_mg || 0,
        vit_b2_mg: row.micros?.vit_b2_mg || 0,
        vit_b3_mg: row.micros?.vit_b3_mg || 0,
        vit_b5_mg: row.micros?.vit_b5_mg || 0,
        vit_b6_mg: row.micros?.vit_b6_mg || 0,
        vit_b9_mcg: row.micros?.vit_b9_mcg || 0,
        vit_b12_mcg: row.micros?.vit_b12_mcg || 0,
        water_g: row.micros?.water_g || 0,
        alcohol_g: row.micros?.alcohol_g || 0,
        caffeine_mg: row.micros?.caffeine_mg || 0
      }
    });
  }

  for (const m of mealEntries) {
    const dayLog = dailyLogsMap.get(m.date_);
    if (!dayLog) continue;

    let foodName = 'Aliment inconnu';
    let kcal = 0;
    let prot = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;
    let qtyDisplay = formatGrams(m.quantity_g);

    if (m.food_id && m.food_name) {
      foodName = m.food_name;
      const factor = m.quantity_g / 100.0;
      kcal = Math.round((m.energy_kcal_100g || 0) * factor);
      prot = Math.round(((m.proteins_g_100g || 0) * factor) * 10) / 10;
      carbs = Math.round(((m.carbohydrates_g_100g || 0) * factor) * 10) / 10;
      fat = Math.round(((m.fat_g_100g || 0) * factor) * 10) / 10;
      fiber = Math.round(((m.fiber_g_100g || 0) * factor) * 10) / 10;
      if (m.original_qty && m.original_unit && m.original_unit !== 'g') {
        qtyDisplay = `${m.original_qty}${m.original_unit} (${formatGrams(m.quantity_g)})`;
      } else {
        qtyDisplay = formatGrams(m.quantity_g);
      }
    } else if (m.recipe_id && m.recipe_name) {
      foodName = m.recipe_name;
      const weightPerPortion = (m.recipe_total_weight || 100) / (m.recipe_portions || 1);
      // portions_count = new format (number of portions). If NULL, fallback legacy (quantity_g = grams).
      const portions = m.portions_count != null ? m.portions_count : (m.quantity_g / weightPerPortion);
      kcal = Math.round((m.energy_kcal_per_portion || 0) * portions);
      prot = Math.round(((m.proteins_g_per_portion || 0) * portions) * 10) / 10;
      carbs = Math.round(((m.carbohydrates_g_per_portion || 0) * portions) * 10) / 10;
      fat = Math.round(((m.fat_g_per_portion || 0) * portions) * 10) / 10;
      fiber = Math.round(((m.fiber_g_per_portion || 0) * portions) * 10) / 10;
      qtyDisplay = m.portions_count != null
        ? `${m.portions_count} portion${m.portions_count > 1 ? 's' : ''}`
        : `${formatGrams(m.quantity_g)}`;
    }

    const periodKey = dayLog.meals[m.period] ? m.period : 'collation';
    dayLog.meals[periodKey].push({
      id: m.id,
      name: foodName,
      quantity_g: m.quantity_g,
      qty_display: qtyDisplay,
      kcal,
      proteins_g: prot,
      carbs_g: carbs,
      fat_g: fat,
      fiber_g: fiber
    });
  }

  for (const s of sportEntries) {
    const dayLog = dailyLogsMap.get(s.date_);
    if (!dayLog) continue;
    dayLog.sports.push({
      id: s.id,
      sport_type: s.sport_type,
      duration_min: s.duration_min,
      kcal_burned: s.kcal_burned || 0,
      avg_hr_bpm: s.avg_hr_bpm || null,
      distance_km: s.distance_km || null,
      elevation_m: s.elevation_m || null,
      notes: s.notes || null
    });
  }

  // ── Boditrax : un seul scan par jour (le plus récent), enrichi
  for (const scan of boditraxEntries) {
    const dayLog = dailyLogsMap.get(scan.scan_date);
    if (!dayLog) continue;
    // Calcul MG% depuis kg si disponible
    const fatPct = (scan.weight_kg && scan.fat_mass_kg)
      ? Math.round((scan.fat_mass_kg / scan.weight_kg) * 1000) / 10
      : null;
    dayLog.boditrax.push({
      id: scan.id,
      scan_date: scan.scan_date,
      weight_kg: scan.weight_kg ? Math.round(scan.weight_kg * 10) / 10 : null,
      fat_mass_kg: scan.fat_mass_kg ? Math.round(scan.fat_mass_kg * 10) / 10 : null,
      fat_pct: fatPct,
      muscle_mass_kg: scan.muscle_mass_kg ? Math.round(scan.muscle_mass_kg * 10) / 10 : null,
      water_mass_kg: scan.water_mass_kg ? Math.round(scan.water_mass_kg * 10) / 10 : null,
      visceral_fat_rating: scan.visceral_fat_rating || null,
      bmr_kcal: scan.bmr_kcal || null,
      metabolic_age: scan.metabolic_age || null
    });
  }

  // ── Mettre à jour exports_metadata pour le prochain delta
  if (boditraxEntries.length > 0) {
    const maxScanId = Math.max(...boditraxEntries.map(s => s.id));
    db.prepare(`
      INSERT INTO exports_metadata (export_type, last_boditrax_id, last_export_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(export_type) DO UPDATE SET last_boditrax_id = excluded.last_boditrax_id, last_export_at = excluded.last_export_at
    `).run('diagnostics', maxScanId);
  }

  return {
    query_info: {
      start_date: startDateStr,
      end_date: endDateStr,
      period_days: days,
      execution_time_ms: 0
    },
    summary: {
      total_days: days,
      total_problems: totalProblemsCount,
      deficit_count: deficitCount,
      excess_count: excessCount,
      macro_split: macroSplit,
      global_score_pct: globalComplianceScore
    },
    ratios,
    nutrients: processedNutrients,
    daily_logs: Array.from(dailyLogsMap.values())
  };
}



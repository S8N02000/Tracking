/**
 * nutrients.js
 * Référentiel unique des 35 nutriments suivis dans NutriTrack.
 * Sert de source de vérité pour les calculs, formats, tooltips et colonnes de Dashboard & Journal.
 */

export const NUTRIENTS_MAP = {
  kcal: {
    key: 'kcal',
    label: 'Kcal',
    name: 'Énergie (Calories)',
    unit: 'kcal',
    decimals: 0,
    foodProp: 'energy_kcal_100g',
    recipeProp: 'energy_kcal_per_portion',
    color: 'text-cyan-300',
    tooltip: 'Total calorique. Base métabolique et énergétique journalière.'
  },
  P: {
    key: 'P',
    label: 'Protéines',
    name: 'Protéines',
    unit: 'g',
    decimals: 1,
    foodProp: 'proteins_g_100g',
    recipeProp: 'proteins_g_per_portion',
    color: 'text-rose-300',
    tooltip: 'Masse musculaire, synthèse tissulaire. Viser 1.6 à 2.2g/kg de poids corporel.'
  },
  G: {
    key: 'G',
    label: 'Glucides',
    name: 'Glucides',
    unit: 'g',
    decimals: 1,
    foodProp: 'carbohydrates_g_100g',
    recipeProp: 'carbohydrates_g_per_portion',
    color: 'text-amber-200',
    tooltip: 'Carburant énergétique principal. Privilégier les sources à index glycémique modéré.'
  },
  sucres: {
    key: 'sucres',
    label: 'Sucres',
    name: 'Sucres simples',
    unit: 'g',
    decimals: 1,
    foodProp: 'sugars_g_100g',
    recipeProp: 'sugars_g_per_portion',
    color: 'text-amber-400',
    tooltip: 'Sucres simples et rapides. Recommandation OMS : < 50g/jour (idéal < 25g).'
  },
  fibres: {
    key: 'fibres',
    label: 'Fibres',
    name: 'Fibres alimentaires',
    unit: 'g',
    decimals: 1,
    foodProp: 'fiber_g_100g',
    recipeProp: 'fiber_g_per_portion',
    color: 'text-emerald-300',
    tooltip: 'Microbiote, satiété et transit. Cible idéale : >= 30g/jour.'
  },
  L: {
    key: 'L',
    label: 'Lipides',
    name: 'Lipides totaux',
    unit: 'g',
    decimals: 1,
    foodProp: 'fat_g_100g',
    recipeProp: 'fat_g_per_portion',
    color: 'text-yellow-300',
    tooltip: 'Santé hormonale et cérébrale. 1g = 9kcal. Viser ~1g/kg de poids corporel.'
  },
  AGS: {
    key: 'AGS',
    label: 'Sat.',
    name: 'Acides Gras Saturés',
    unit: 'g',
    decimals: 1,
    foodProp: 'saturated_fat_g_100g',
    recipeProp: 'saturated_fat_g_per_portion',
    color: 'text-yellow-500',
    tooltip: 'Graisses saturées. À limiter à moins de 10% de l’apport énergétique global.'
  },
  sel: {
    key: 'sel',
    label: 'Sel',
    name: 'Sel (NaCl)',
    unit: 'g',
    decimals: 2,
    foodProp: 'salt_g_100g',
    recipeProp: 'salt_g_per_portion',
    color: 'text-slate-400',
    tooltip: 'Équilibre osmotique et tensionnel. Viser < 5-6g/jour.'
  },
  mono: {
    key: 'mono',
    label: 'Mono-Insat',
    name: 'Acides Gras Mono-insaturés',
    unit: 'g',
    decimals: 1,
    foodProp: 'monounsaturated_fat_g_100g',
    recipeProp: 'monounsaturated_fat_g_per_portion',
    color: 'text-yellow-400',
    tooltip: 'Gras protecteurs cardiovasculaires (huile d’olive, avocat).'
  },
  poly: {
    key: 'poly',
    label: 'Poly-Insat',
    name: 'Acides Gras Poly-insaturés',
    unit: 'g',
    decimals: 1,
    foodProp: 'polyunsaturated_fat_g_100g',
    recipeProp: 'polyunsaturated_fat_g_per_portion',
    color: 'text-yellow-400',
    tooltip: 'Acides gras essentiels oméga-3 et oméga-6.'
  },
  omega3: {
    key: 'omega3',
    label: 'O3',
    name: 'Oméga-3',
    unit: 'g',
    decimals: 2,
    foodProp: 'omega3_g_100g',
    recipeProp: 'omega3_g_per_portion',
    color: 'text-emerald-300',
    tooltip: 'Anti-inflammatoire majeur. Cible : >= 2g/jour (EPA + DHA + ALA).'
  },
  omega6: {
    key: 'omega6',
    label: 'O6',
    name: 'Oméga-6',
    unit: 'g',
    decimals: 2,
    foodProp: 'omega6_g_100g',
    recipeProp: 'omega6_g_per_portion',
    color: 'text-emerald-300',
    tooltip: 'Pro-inflammatoire physiologique. Maintenir un ratio Oméga-6/Oméga-3 < 4:1.'
  },
  trans: {
    key: 'trans',
    label: 'Trans',
    name: 'Graisses Trans',
    unit: 'g',
    decimals: 2,
    foodProp: 'trans_fat_g_100g',
    recipeProp: 'trans_fat_g_per_portion',
    color: 'text-rose-400',
    tooltip: 'Graisses industrielles néfastes. Viser le strict minimum (< 1g/jour).'
  },
  chol: {
    key: 'chol',
    label: 'Chol.',
    name: 'Cholestérol',
    unit: 'mg',
    decimals: 0,
    foodProp: 'cholesterol_mg_100g',
    recipeProp: 'cholesterol_mg_per_portion',
    color: 'text-amber-500',
    tooltip: 'Cholestérol alimentaire. Référence : < 300mg/jour.'
  },
  sodium: {
    key: 'sodium',
    label: 'Sodium',
    name: 'Sodium',
    unit: 'mg',
    decimals: 0,
    foodProp: 'sodium_mg_100g',
    recipeProp: 'sodium_mg_per_portion',
    color: 'text-slate-300',
    tooltip: 'Sel sous forme élémentaire. 1g Na ~ 2.54g sel. VNR < 2000mg/jour.'
  },
  Ca: {
    key: 'Ca',
    label: 'Ca',
    name: 'Calcium',
    unit: 'mg',
    decimals: 0,
    foodProp: 'calcium_mg_100g',
    recipeProp: 'calcium_mg_per_portion',
    color: 'text-cyan-300',
    tooltip: 'Santé osseuse et contraction musculaire. VNR 1000mg/jour.'
  },
  Fe: {
    key: 'Fe',
    label: 'Fe',
    name: 'Fer',
    unit: 'mg',
    decimals: 2,
    foodProp: 'iron_mg_100g',
    recipeProp: 'iron_mg_per_portion',
    color: 'text-rose-300',
    tooltip: 'Transport de l’oxygène et énergie. VNR 11mg (homme) à 16mg (femme).'
  },
  Mg: {
    key: 'Mg',
    label: 'Mg',
    name: 'Magnésium',
    unit: 'mg',
    decimals: 0,
    foodProp: 'magnesium_mg_100g',
    recipeProp: 'magnesium_mg_per_portion',
    color: 'text-emerald-300',
    tooltip: 'Système nerveux, sommeil et muscles. VNR 420mg/jour.'
  },
  Pmin: {
    key: 'Pmin',
    label: 'P',
    name: 'Phosphore',
    unit: 'mg',
    decimals: 0,
    foodProp: 'phosphorus_mg_100g',
    recipeProp: 'phosphorus_mg_per_portion',
    color: 'text-purple-300',
    tooltip: 'Santé des os et métabolisme ATP. VNR 700mg/jour.'
  },
  K: {
    key: 'K',
    label: 'K',
    name: 'Potassium',
    unit: 'mg',
    decimals: 0,
    foodProp: 'potassium_mg_100g',
    recipeProp: 'potassium_mg_per_portion',
    color: 'text-indigo-300',
    tooltip: 'Équilibre acido-basique et pression artérielle. VNR 3500-4700mg/jour.'
  },
  Zn: {
    key: 'Zn',
    label: 'Zn',
    name: 'Zinc',
    unit: 'mg',
    decimals: 2,
    foodProp: 'zinc_mg_100g',
    recipeProp: 'zinc_mg_per_portion',
    color: 'text-teal-300',
    tooltip: 'Immunité et synthèse de la testostérone. VNR 11mg/jour.'
  },
  cuivre: {
    key: 'cuivre',
    label: 'Cu',
    name: 'Cuivre',
    unit: 'mg',
    decimals: 2,
    foodProp: 'copper_mg_100g',
    recipeProp: 'copper_mg_per_portion',
    color: 'text-amber-300',
    tooltip: 'Métabolisme du fer et antioxydant. VNR 1.5mg/jour.'
  },
  manganese: {
    key: 'manganese',
    label: 'Mn',
    name: 'Manganèse',
    unit: 'mg',
    decimals: 2,
    foodProp: 'manganese_mg_100g',
    recipeProp: 'manganese_mg_per_portion',
    color: 'text-amber-300',
    tooltip: 'Protection contre le stress oxydatif. VNR 2.5mg/jour.'
  },
  selenium: {
    key: 'selenium',
    label: 'Se',
    name: 'Sélénium',
    unit: 'mcg',
    decimals: 1,
    foodProp: 'selenium_mg_100g',
    recipeProp: 'selenium_mcg_per_portion',
    color: 'text-emerald-300',
    tooltip: 'Fonction thyroïdienne et antioxydante. VNR 70mcg/jour.'
  },
  iode: {
    key: 'iode',
    label: 'Iode',
    name: 'Iode',
    unit: 'mcg',
    decimals: 0,
    foodProp: 'iodine_mg_100g',
    recipeProp: 'iodine_mcg_per_portion',
    color: 'text-cyan-300',
    tooltip: 'Hormones thyroïdiennes T3/T4. VNR 150mcg/jour.'
  },
  vitA: {
    key: 'vitA',
    label: 'Vit A',
    name: 'Vitamine A',
    unit: 'mcg',
    decimals: 0,
    foodProp: 'vit_a_mcg_100g',
    recipeProp: 'vit_a_mcg_per_portion',
    color: 'text-amber-200',
    tooltip: 'Vision et renouvellement cellulaire. VNR 750mcg/jour.'
  },
  vitD: {
    key: 'vitD',
    label: 'Vit D',
    name: 'Vitamine D',
    unit: 'mcg',
    decimals: 1,
    foodProp: 'vit_d_mcg_100g',
    recipeProp: 'vit_d_mcg_per_portion',
    color: 'text-amber-200',
    tooltip: 'Absorption du calcium et immunité. VNR 15mcg (600 UI) / jour.'
  },
  vitE: {
    key: 'vitE',
    label: 'Vit E',
    name: 'Vitamine E',
    unit: 'mg',
    decimals: 1,
    foodProp: 'vit_e_mg_100g',
    recipeProp: 'vit_e_mg_per_portion',
    color: 'text-amber-200',
    tooltip: 'Antioxydant lipidique majeur. VNR 12mg/jour.'
  },
  vitK: {
    key: 'vitK',
    label: 'Vit K',
    name: 'Vitamine K',
    unit: 'mcg',
    decimals: 0,
    foodProp: 'vit_k_mcg_100g',
    recipeProp: 'vit_k_mcg_per_portion',
    color: 'text-amber-200',
    tooltip: 'Coagulation et minéralisation osseuse. VNR 75mcg/jour.'
  },
  vitC: {
    key: 'vitC',
    label: 'Vit C',
    name: 'Vitamine C',
    unit: 'mg',
    decimals: 0,
    foodProp: 'vit_c_mg_100g',
    recipeProp: 'vit_c_mg_per_portion',
    color: 'text-amber-200',
    tooltip: 'Synthèse de collagène, antioxydant et immunité. VNR 110mg/jour.'
  },
  B1: {
    key: 'B1',
    label: 'B1',
    name: 'Vitamine B1 (Thiamine)',
    unit: 'mg',
    decimals: 2,
    foodProp: 'vit_b1_mg_100g',
    recipeProp: 'vit_b1_mg_per_portion',
    color: 'text-amber-200',
    tooltip: 'Métabolisme glucidique et fonction cardiaque. VNR 1.1mg/jour.'
  },
  B2: {
    key: 'B2',
    label: 'B2',
    name: 'Vitamine B2 (Riboflavine)',
    unit: 'mg',
    decimals: 2,
    foodProp: 'vit_b2_mg_100g',
    recipeProp: 'vit_b2_mg_per_portion',
    color: 'text-amber-200',
    tooltip: 'Production d’énergie cellulaire. VNR 1.4mg/jour.'
  },
  B3: {
    key: 'B3',
    label: 'B3',
    name: 'Vitamine B3 (Niacine)',
    unit: 'mg',
    decimals: 1,
    foodProp: 'vit_b3_mg_100g',
    recipeProp: 'vit_b3_mg_per_portion',
    color: 'text-amber-200',
    tooltip: 'Santé de la peau et système nerveux. VNR 16mg/jour.'
  },
  B5: {
    key: 'B5',
    label: 'B5',
    name: 'Vitamine B5 (Acide pantothénique)',
    unit: 'mg',
    decimals: 2,
    foodProp: 'vit_b5_mg_100g',
    recipeProp: 'vit_b5_mg_per_portion',
    color: 'text-amber-200',
    tooltip: 'Synthèse des neurotransmetteurs et stéroïdes. VNR 6mg/jour.'
  },
  B6: {
    key: 'B6',
    label: 'B6',
    name: 'Vitamine B6 (Pyridoxine)',
    unit: 'mg',
    decimals: 2,
    foodProp: 'vit_b6_mg_100g',
    recipeProp: 'vit_b6_mg_per_portion',
    color: 'text-amber-200',
    tooltip: 'Métabolisme des acides aminés et glycogène. VNR 1.4mg/jour.'
  },
  B9: {
    key: 'B9',
    label: 'B9',
    name: 'Vitamine B9 (Folates)',
    unit: 'mcg',
    decimals: 0,
    foodProp: 'vit_b9_mcg_100g',
    recipeProp: 'vit_b9_mcg_per_portion',
    color: 'text-amber-200',
    tooltip: 'Division cellulaire et synthèse de l’ADN. VNR 330mcg/jour.'
  },
  B12: {
    key: 'B12',
    label: 'B12',
    name: 'Vitamine B12 (Cobalamine)',
    unit: 'mcg',
    decimals: 1,
    foodProp: 'vit_b12_mcg_100g',
    recipeProp: 'vit_b12_mcg_per_portion',
    color: 'text-amber-200',
    tooltip: 'Globules rouges et myéline neuronale. VNR 4mcg/jour.'
  },
  cafeine: {
    key: 'cafeine',
    label: 'Caféine',
    name: 'Caféine',
    unit: 'mg',
    decimals: 0,
    foodProp: 'caffeine_mg_100g',
    recipeProp: 'caffeine_mg_per_portion',
    color: 'text-orange-400',
    tooltip: 'Stimulant du SNC. Limite sécuritaire EFSA : < 400mg/jour.'
  }
};

export const DISPLAY_COLS = Object.keys(NUTRIENTS_MAP);

/**
 * Calcule la quantité d'un nutriment pour une entrée de repas (aliment ou recette).
 * @param {Object} meal
 * @param {string} col - clé du nutriment dans NUTRIENTS_MAP
 * @returns {number}
 */
export function calcNutr(meal, col) {
  if (!meal) return 0;
  const def = NUTRIENTS_MAP[col];
  if (!def) return 0;

  const qty = meal.quantity_g || 0;
  let rawVal = 0;

  if (meal.food_id) {
    const factor = qty / 100;
    rawVal = factor * (meal[def.foodProp] || 0);
  } else if (meal.recipe_id) {
    let portions = 1;
    if (meal.portions_count != null && !isNaN(Number(meal.portions_count)) && Number(meal.portions_count) > 0) {
      portions = Number(meal.portions_count);
    } else {
      const portionWeight = (meal.recipe_total_weight || 0) / (meal.recipe_portions || 1);
      portions = portionWeight > 0 ? (qty / portionWeight) : 1;
    }
    rawVal = portions * (meal[def.recipeProp] || 0);
  }

  return def.decimals > 0 ? +(rawVal.toFixed(def.decimals)) : Math.round(rawVal);
}

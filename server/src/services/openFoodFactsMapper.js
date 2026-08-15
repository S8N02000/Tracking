export function mapOffProductToFood(rawProduct) {
  if (!rawProduct) return null;

  const n = rawProduct.nutriments || {};
  const name =
    rawProduct.product_name_fr ||
    rawProduct.product_name ||
    rawProduct.product_name_en ||
    'Produit Open Food Facts';

  const brand = rawProduct.brands || rawProduct.brand_owner || null;

  const getNum = (val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? null : parsed;
  };

  const saltG = getNum(n['salt_100g']);
  let sodiumMg = getNum(n['sodium_100g']);
  if (sodiumMg == null && saltG != null) {
    sodiumMg = (saltG / 2.54) * 1000;
  }

  return {
    name: name.trim(),
    brand: brand ? brand.trim() : null,
    category: 'autre',
    weight_per_unit_g: getNum(rawProduct.product_quantity) || null,
    default_unit: 'g',
    density_g_ml: 1.0,

    energy_kcal_100g: getNum(
      n['energy-kcal_100g'] ??
        n['energy-kcal'] ??
        (n['energy_100g'] != null ? n['energy_100g'] / 4.184 : null)
    ),
    proteins_g_100g: getNum(n['proteins_100g']),
    carbohydrates_g_100g: getNum(n['carbohydrates_100g']),
    sugars_g_100g: getNum(n['sugars_100g']),
    fiber_g_100g: getNum(n['fiber_100g']),
    starch_g_100g: getNum(n['starch_100g']),
    fat_g_100g: getNum(n['fat_100g']),
    saturated_fat_g_100g: getNum(n['saturated-fat_100g']),
    trans_fat_g_100g: getNum(n['trans-fat_100g']),
    omega3_g_100g: getNum(n['omega-3-fat_100g']),
    omega6_g_100g: getNum(n['omega-6-fat_100g']),
    omega9_g_100g: getNum(n['omega-9-fat_100g']),

    salt_g_100g: saltG,
    sodium_mg_100g: sodiumMg,
    cholesterol_mg_100g: getNum(n['cholesterol_100g']) != null ? getNum(n['cholesterol_100g']) * 1000 : null,
    calcium_mg_100g: getNum(n['calcium_100g']) != null ? getNum(n['calcium_100g']) * 1000 : null,
    iron_mg_100g: getNum(n['iron_100g']) != null ? getNum(n['iron_100g']) * 1000 : null,
    magnesium_mg_100g: getNum(n['magnesium_100g']) != null ? getNum(n['magnesium_100g']) * 1000 : null,
    potassium_mg_100g: getNum(n['potassium_100g']) != null ? getNum(n['potassium_100g']) * 1000 : null,
    zinc_mg_100g: getNum(n['zinc_100g']) != null ? getNum(n['zinc_100g']) * 1000 : null,
    phosphorus_mg_100g: getNum(n['phosphorus_100g']) != null ? getNum(n['phosphorus_100g']) * 1000 : null,
    manganese_mg_100g: getNum(n['manganese_100g']) != null ? getNum(n['manganese_100g']) * 1000 : null,
    copper_mg_100g: getNum(n['copper_100g']) != null ? getNum(n['copper_100g']) * 1000 : null,
    selenium_mg_100g: getNum(n['selenium_100g']) != null ? getNum(n['selenium_100g']) * 1000 : null,
    iodine_mg_100g: getNum(n['iodine_100g']) != null ? getNum(n['iodine_100g']) * 1000 : null,

    vit_a_mcg_100g: getNum(n['vitamin-a_100g']) != null ? getNum(n['vitamin-a_100g']) * 1000000 : null,
    vit_b1_mg_100g: getNum(n['vitamin-b1_100g']) != null ? getNum(n['vitamin-b1_100g']) * 1000 : null,
    vit_b2_mg_100g: getNum(n['vitamin-b2_100g']) != null ? getNum(n['vitamin-b2_100g']) * 1000 : null,
    vit_b3_mg_100g: getNum(n['vitamin-pp_100g'] ?? n['vitamin-b3_100g']) != null ? getNum(n['vitamin-pp_100g'] ?? n['vitamin-b3_100g']) * 1000 : null,
    vit_b5_mg_100g: getNum(n['pantothenic-acid_100g'] ?? n['vitamin-b5_100g']) != null ? getNum(n['pantothenic-acid_100g'] ?? n['vitamin-b5_100g']) * 1000 : null,
    vit_b6_mg_100g: getNum(n['vitamin-b6_100g']) != null ? getNum(n['vitamin-b6_100g']) * 1000 : null,
    vit_b9_mcg_100g: getNum(n['folates_100g'] ?? n['vitamin-b9_100g']) != null ? getNum(n['folates_100g'] ?? n['vitamin-b9_100g']) * 1000000 : null,
    vit_b12_mcg_100g: getNum(n['vitamin-b12_100g']) != null ? getNum(n['vitamin-b12_100g']) * 1000000 : null,
    vit_c_mg_100g: getNum(n['vitamin-c_100g']) != null ? getNum(n['vitamin-c_100g']) * 1000 : null,
    vit_d_mcg_100g: getNum(n['vitamin-d_100g']) != null ? getNum(n['vitamin-d_100g']) * 1000000 : null,
    vit_e_mg_100g: getNum(n['vitamin-e_100g']) != null ? getNum(n['vitamin-e_100g']) * 1000 : null,
    vit_k_mcg_100g: getNum(n['vitamin-k_100g']) != null ? getNum(n['vitamin-k_100g']) * 1000000 : null,

    source: 'openfoodfacts',
    notes: `Code-barres: ${rawProduct.code || rawProduct._id || 'N/A'}`
  };
}

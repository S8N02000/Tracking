/**
 * PRAL — constantes de domaine.
 *
 * Module pur : aucune dépendance I/O, aucun import d'infrastructure.
 *
 * Source de la formule : Remer & Manz, "Relation between dietary acid load
 * and urinary pH of healthy adults", Am J Clin Nutr 1995;61:539-45.
 * Table 1 de l'article ; reprise dans Sebastian et al., "The dietary acid
 * and alkali load and its relation to intake of protein and fruit and
 * vegetable intake", J Nutr 2002;132:2191-5.
 *
 * Unité : le PRAL est exprimé en mEq/jour (milliéquivalents d'acide ou de
 * base par jour). Les entrées sont converties dans les unités
 * canoniques avant application des coefficients :
 *   - protéines  : g
 *   - phosphore   : mg
 *   - potassium   : mg
 *   - magnésium   : mg
 *   - calcium     : mg
 *
 * ─────────────────────────────────────────────────────────────────────────
 * AFFECTATION CALCIUM / MAGNÉSIUM
 *
 * Point de vigilance majeur, historically source de bug : dans la Table 1
 * de Remer & Manz, le coefficient −0,0263 est appliqué au MAGNÉSIUM et le
 * coefficient −0,0125 au CALCIUM. L'inversion de ces deux coefficients
 * (ce que faisait l'ancienne version de l'application) sous-estime le
 * PRAL d'environ 0,013 × (Ca − Mg) mEq par jour.
 */

/**
 * Coefficients canoniques exacts (Table 1 de Remer & Manz 1995).
 *
 * Effets pour un régime omnivore :
 *   +0,4888 mEq/g de protéines, +0,0366 mEq/mg de phosphore,
 *   −0,0205 mEq/mg de potassium, −0,0263 mEq/mg de magnésium,
 *   −0,0125 mEq/mg de calcium.
 *
 * Les coefficients EXACTS et ARRONDIS de l'article diffèrent de ~0,1 % :
 * c'est normal (l'article publie une formule à 4 décimales et une formule
 * « simplifiée » à 3 décimales). UNE SEULE est utilisée par défaut
 * (cf. DEFAULT_COEFFICIENT_SET) ; l'autre reste exposée comme variante
 * documentée pour les études de sensibilité.
 */
export const COEFFICIENTS_EXACT = Object.freeze({
  proteins: 0.4888,
  phosphorus: 0.0366,
  potassium: -0.0205,
  magnesium: -0.0263,
  calcium: -0.0125
});

/**
 * Coefficients arrondis (variante « simplifiée » publiée dans l'article).
 * Sert d'étude de sensibilité et de comparaison avec les implémentations
 * historiques qui utilisaient la version arrondie.
 */
export const COEFFICIENTS_ROUNDED = Object.freeze({
  proteins: 0.49,
  phosphorus: 0.037,
  potassium: -0.021,
  magnesium: -0.026,
  calcium: -0.013
});

/** Jeu de coefficients actif par défaut. */
export const DEFAULT_COEFFICIENT_SET = 'exact';

/** Tous les jeux de coefficients disponibles, indexés par nom. */
export const COEFFICIENT_SETS = Object.freeze({
  exact: COEFFICIENTS_EXACT,
  rounded: COEFFICIENTS_ROUNDED
});

/**
 * Résout un jeu de coefficients à partir d'un nom (ou d'un objet).
 * Lève une erreur explicite sur un nom inconnu : mieux vaut un échec
 * bruyant au démarrage qu'un calcul silencieusement faux.
 *
 * @param {string|object} nameOrSet
 * @returns {Readonly<object>}
 */
export function resolveCoefficientSet(nameOrSet) {
  if (nameOrSet && typeof nameOrSet === 'object') {
    return Object.freeze({ ...nameOrSet });
  }
  const key = nameOrSet ?? DEFAULT_COEFFICIENT_SET;
  const set = COEFFICIENT_SETS[key];
  if (!set) {
    throw new Error(
      `Jeu de coefficients PRAL inconnu : "${key}". Valeurs acceptées : ${Object.keys(COEFFICIENT_SETS).join(', ')}.`
    );
  }
  return set;
}

/**
 * Les 5 nutriments qui entrent dans la formule PRAL, avec leur unité
 * canonique et la colonne `foods` qui les porte.
 *
 * L'ordre est stable : il définit l'ordre des termes dans la décomposition
 * retournée par l'API et dans les snapshots de test.
 */
export const PRAL_NUTRIENTS = Object.freeze([
  Object.freeze({ key: 'proteins', label: 'Protéines', unit: 'g', column: 'proteins_g_100g', coefficientKey: 'proteins' }),
  Object.freeze({ key: 'phosphorus', label: 'Phosphore', unit: 'mg', column: 'phosphorus_mg_100g', coefficientKey: 'phosphorus' }),
  Object.freeze({ key: 'potassium', label: 'Potassium', unit: 'mg', column: 'potassium_mg_100g', coefficientKey: 'potassium' }),
  Object.freeze({ key: 'magnesium', label: 'Magnésium', unit: 'mg', column: 'magnesium_mg_100g', coefficientKey: 'magnesium' }),
  Object.freeze({ key: 'calcium', label: 'Calcium', unit: 'mg', column: 'calcium_mg_100g', coefficientKey: 'calcium' })
]);

/** Clés des nutriments PRAL, dans l'ordre canonique. */
export const PRAL_NUTRIENT_KEYS = Object.freeze(PRAL_NUTRIENTS.map((n) => n.key));

/** Unité canonique de chaque nutriment PRAL. */
export const PRAL_NUTRIENT_UNITS = Object.freeze(
  Object.fromEntries(PRAL_NUTRIENTS.map((n) => [n.key, n.unit]))
);

/** Les 4 minéraux (tous sujets à une absence physique documentée). */
export const PRAL_MINERAL_KEYS = Object.freeze(
  PRAL_NUTRIENTS.filter((n) => n.key !== 'proteins').map((n) => n.key)
);

/** Unité du score PRAL. */
export const PRAL_UNIT = 'mEq/jour';

/**
 * Conversion mg -> mEq pour chaque minéral.
 *
 * Masse molaire atomique (g/mol) : P = 30,974 ; K = 39,098 ; Mg = 24,305 ;
 * Ca = 40,078. Charge : +1 pour P et K, +2 pour Mg et Ca.
 *
 * mEq = mg / (masse molaire / valence) = mg / (equivalent_weight).
 * Ces constantes ne sont PAS utilisées pour le calcul du score (les
 * coefficients Remer & Manz intègrent déjà la conversion) : elles servent
 * uniquement à l'affichage et à l'audit ("mg -> mEq").
 */
export const MINERAL_EQUIVALENT_WEIGHTS = Object.freeze({
  phosphorus: 30.974,
  potassium: 39.098,
  magnesium: 24.305 / 2,
  calcium: 40.078 / 2
});

/** Convertit une masse de minéral (mg) en milliéquivalents. */
export function mineralMgToMeq(key, mg) {
  if (mg == null || !Number.isFinite(mg)) return null;
  const eq = MINERAL_EQUIVALENT_WEIGHTS[key];
  if (!eq) return null;
  return mg / eq;
}

/**
 * Identifiant stable du ratio PRAL dans le contrat `ratios` de
 * /api/analytics/diagnostics. Conservé pour compatibilité API/frontend.
 */
export const PRAL_RATIO_ID = 'indice_pral';

/**
 * PRAL — politique clinique de seuils.
 *
 * Module pur : la politique est une donnée, pas une logique. Elle est
 * centralisée ici pour être auditée, testée et remplaçable sans toucher au
 * calcul.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CADRE CLINIQUE
 * ─────────────────────────────────────────────────────────────────────────
 * Le PRAL (Potential Renal Acid Load) est un indicateur de POPULATION. Il
 * estime, à partir de la composition alimentaire, la charge nette d'acide
 * métabolique ingérée. Ce n'est PAS un diagnostic individuel et ne doit
 * jamais être présenté comme tel.
 *
 * Repères publiés :
 *  - Régimes omnivores occidentales : charge acide nette usuelle d'environ
 *    +10 à +30 mEq/jour (Sebastian et al., J Nutr 2002 ; Remer & Manz,
 *    Am J Clin Nutr 1995).
 *  - Saturation de la capacité d'excrétion rénale d'acide : au-delà
 *    d'environ +70 à +80 mEq/jour, l'organisme ne peut plus éliminer la
 *    charge acide résiduelle par voie urinaire.
 *  - Les seuils ci-dessous sont donc des repères de COHÉRENCE NUTRITIONNELLE,
 *    pas des seuils de danger individuel.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PRINCIPE DE LANGAGE
 * ─────────────────────────────────────────────────────────────────────────
 * Une alimentation omnivore normale produit un PRAL positif. Afficher
 * « CRITIQUE » au-delà de +15 mEq/jour (seuil historique de l'application)
 * est cliniquement infondé : la quasi-totalité des régimes omnivores
 * occidentaux se situait au-dessus, ce qui rend l'alarme automatique et
 * non informative. Les seuils ci-dessous sont calibrés sur les repères
 * publiés, et le vocabulaire est volontairement non alarmiste.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * VOCABULAIRE (compatible frontend)
 * ─────────────────────────────────────────────────────────────────────────
 * Les statuts réutilisent volontairement le vocabulaire déjà rendu par le
 * client (OPTIMAL / SOUS_OPTIMAL / ATTENTION / CRITIQUE) afin de ne pas
 * casser l'affichage. La finesse clinique est portée par `band` et
 * `label`, pas par le statut.
 */

/** Statuts exposés (sous-ensemble du vocabulaire déjà rendu par le client). */
export const PRAL_STATUS = Object.freeze({
  OPTIMAL: 'OPTIMAL',
  ATTENTION: 'ATTENTION',
  SOUS_OPTIMAL: 'SOUS_OPTIMAL',
  CRITIQUE: 'CRITIQUE'
});

/**
 * Bandes de charge acide, de la plus favorable à la plus défavorable.
 *
 * `min` est inclusif, `max` est exclusif (la dernière bande a `max: null`).
 */
export const PRAL_BANDS = Object.freeze([
  Object.freeze({
    id: 'normal_omnivore',
    min: -Infinity,
    max: 30,
    status: PRAL_STATUS.OPTIMAL,
    label: 'Charge normale',
    interpretation:
      'Charge acide nette cohérente avec un régime omnivore occidental.'
  }),
  Object.freeze({
    id: 'elevated',
    min: 30,
    max: 45,
    status: PRAL_STATUS.ATTENTION,
    label: 'Charge élevée',
    interpretation:
      'Charge acide nette supérieure au registre usuel des régimes omnivores. À surveiller sur la durée.'
  }),
  Object.freeze({
    id: 'high',
    min: 45,
    max: 70,
    status: PRAL_STATUS.SOUS_OPTIMAL,
    label: 'Charge nettement élevée',
    interpretation:
      'Charge acide nette proche de la saturation de la capacité d’excrétion urinaire. Ajustement alimentaire recommandé.'
  }),
  Object.freeze({
    id: 'very_high',
    min: 70,
    max: null,
    status: PRAL_STATUS.CRITIQUE,
    label: 'Charge très élevée',
    interpretation:
      'Charge acide nette au-delà de la capacité d’excrétion urinaire estimée. Rééquilibrage alimentaire recommandé.'
  })
]);

/** Seuil médian de référence (mEq/jour) : médiane des régimes omnivores. */
export const PRAL_REFERENCE_MEDIAN = 20;

/** Intervalle de référence usuel des régimes omnivores (mEq/jour). */
export const PRAL_REFERENCE_RANGE = Object.freeze({ min: 10, max: 30 });

/** Capacité d'excrétion rénale d'acide (mEq/jour), ordre de grandeur publié. */
export const PRAL_RENAL_EXCRETION_CAPACITY = 70;

/**
 * Identifie la bande correspondant à un score.
 *
 * @param {number} score
 * @param {Array} [bands]  jeu de bandes (défaut : PRAL_BANDS). Permet de
 *                         remplacer la politique clinique sans toucher au code.
 * @returns {object} la bande (jamais null pour un score fini)
 */
export function classifyPral(score, bands = PRAL_BANDS) {
  if (!Number.isFinite(score)) {
    throw new Error(`Score PRAL non fini : ${score}`);
  }
  const list = Array.isArray(bands) && bands.length > 0 ? bands : PRAL_BANDS;
  for (const band of list) {
    const belowMax = band.max === null || score < band.max;
    if (score >= band.min && belowMax) return band;
  }
  // Garde-fou : la dernière bande a max=null, donc le tableau est exhaustif.
  return list[list.length - 1];
}

/**
 * Évalue un score PRAL : bande, statut et indicateurs d'alerte.
 *
 * @param {number} score
 * @param {object} [options]
 * @param {boolean} [options.problem]  force le signalement « à problème »
 * @param {Array}  [options.bands]    jeu de bandes personnalisé
 * @returns {object} { status, band, bandId, label, isProblem, interpretation }
 */
export function evaluatePral(score, options = {}) {
  const band = classifyPral(score, options.bands);
  return {
    status: band.status,
    band: band.id,
    bandId: band.id,
    label: band.label,
    interpretation: band.interpretation,
    // « Problème » = situation nécessitant une action, pas simple vigilance.
    isProblem:
      options.problem !== undefined
        ? Boolean(options.problem)
        : band.status === PRAL_STATUS.SOUS_OPTIMAL || band.status === PRAL_STATUS.CRITIQUE
  };
}

/**
 * Cible affichée dans l'interface. Historiquement « <= 0 (Alcalinisant) »,
 * ce qui était trompeur : un régime omnivore normal n'a pas « pour cible »
 * un PRAL négatif. La cible affichée est une fourchette de référence.
 */
export const PRAL_TARGET_LABEL = '≈ 0 à +30 mEq/jour (régime omnivore usual)';

/**
 * Texte d'explication du ratio, versionné pour le contrat `ratios`.
 * Explique la formule, l'unité et le caractère populationnel de l'indicateur.
 */
export const PRAL_EXPLANATION =
  "Charge acide-alcaline alimentaire (Remer & Manz 1995) : " +
  "+0,4888×protéines (g) +0,0366×phosphore (mg) −0,0205×potassium (mg) " +
  "−0,0263×magnésium (mg) −0,0125×calcium (mg). " +
  "Indicateur de population : un régime omnivore occidental usuel se situe " +
  "entre +10 et +30 mEq/jour. Ce score n’est pas un diagnostic individuel.";

/**
 * Valide qu'une configuration de seuils est cohérente (bornes croisées,
 * statuts connus, continuité).
 * @param {Array} [bands]
 */
export function validateBands(bands = PRAL_BANDS) {
  if (!Array.isArray(bands) || bands.length === 0) {
    throw new Error('PRAL : la liste des bandes doit être non vide.');
  }
  const known = new Set(Object.values(PRAL_STATUS));
  for (let i = 0; i < bands.length; i += 1) {
    const band = bands[i];
    if (!known.has(band.status)) {
      throw new Error(`PRAL : statut inconnu "${band.status}" dans la bande ${band.id}.`);
    }
    if (band.max !== null && band.max <= band.min) {
      throw new Error(`PRAL : bornes incohérentes dans la bande ${band.id}.`);
    }
    if (i > 0 && band.min !== bands[i - 1].max) {
      throw new Error(
        `PRAL : discontinuity entre les bandes ${bands[i - 1].id} et ${band.id}.`
      );
    }
  }
  return true;
}

/**
 * dateUtils.js
 * Helpers pour la gestion des dates en heure locale (évite les bugs de décalage UTC de toISOString).
 */

/**
 * Retourne la date du jour au format YYYY-MM-DD en heure locale.
 * @returns {string} ex: "2026-11-15"
 */
export function getTodayLocalDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formate un objet Date JS en chaîne YYYY-MM-DD locale.
 * @param {Date} dateObj
 * @returns {string}
 */
export function formatDateToISO(dateObj) {
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return getTodayLocalDate();
  }
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Décale une date YYYY-MM-DD d'un nombre de jours donné.
 * @param {string} dateStr "YYYY-MM-DD"
 * @param {number} daysDelta ex: -7, +1
 * @returns {string} "YYYY-MM-DD"
 */
export function shiftDaysLocal(dateStr, daysDelta) {
  if (!dateStr || typeof dateStr !== 'string') return getTodayLocalDate();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return getTodayLocalDate();

  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  d.setDate(d.getDate() + daysDelta);
  return formatDateToISO(d);
}

/**
 * Formate une date YYYY-MM-DD en format court lisible JJ/MM.
 * @param {string} dateStr "YYYY-MM-DD"
 * @returns {string} ex: "15/11"
 */
export function formatShortDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

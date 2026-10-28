import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Racine du serveur (server/src/config -> server).
 */
export const SERVER_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Chargement déterministe du fichier `.env`.
 *
 * `dotenv.config()` sans option cherche `.env` relativement à
 * `process.cwd()` : le comportement changeait donc selon le répertoire
 * depuis lequel le serveur ou les tests étaient lancés. Ici, le fichier
 * est cherché dans la racine du serveur, ce qui rend le démarrage
 * indépendant du répertoire courant.
 *
 * Priorité conservée : une variable déjà présente dans l'environnement
 * l'emporte (dotenv ne surcharge pas par défaut). En production, les
 * variables viennent de l'orchestrateur (env_file) et ne sont jamais
 * écrasées par un fichier local.
 */
export function loadEnv() {
  dotenv.config({ path: path.join(SERVER_ROOT, '.env') });
}

loadEnv();

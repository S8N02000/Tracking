import { defineConfig } from 'vitest/config';

/**
 * Configuration Vitest de la racine du monorepo.
 *
 * Le monorepo contient deux projets de test aux environnements distincts :
 *   - `server` : Node.js, base SQLite, API Express ;
 *   - `client` : jsdom, composants Vue, alias `@` -> `client/src`.
 *
 * Chaque projet conserve SA configuration (`server/vitest.config.js`,
 * `client/vitest.config.js`) : le root ne fait que les agréger. Cela évite
 * de dupliquer les réglages (plugins, alias, environment) et garantit que
 * `npm test` depuis la racine donne exactement le même résultat que
 * `npm test` dans chaque workspace.
 */
export default defineConfig({
  test: {
    projects: ['./server', './client']
  }
});

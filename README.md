# 🥗 NutriTrack — Plateforme de Suivi Nutritionnel & Impédancemétrie (PWA)

[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-brightgreen.svg)](https://nodejs.org/)
[![Framework](https://img.shields.io/badge/Frontend-Vue_3_|_Vite_|_Tailwind_CSS-4fc08d.svg)](https://vuejs.org/)
[![State Management](https://img.shields.io/badge/State-Pinia-yellow.svg)](https://pinia.vuejs.org/)
[![Database](https://img.shields.io/badge/Database-SQLite3_(WAL_mode)-003b57.svg)](https://www.sqlite.org/)
[![PWA](https://img.shields.io/badge/PWA-vite--plugin--pwa-blueviolet.svg)](https://vite-pwa-org.netlify.app/)
[![Tests](https://img.shields.io/badge/Tests-14_Suites_|_29_Passed-success.svg)](https://vitest.dev/)

**NutriTrack** est une application web monopage (**SPA**) et **Progressive Web App (PWA)** complète, moderne et haute performance, dédiée au suivi précis des apports nutritionnels (jusqu'à 35 nutriments), des dépenses sportives, du bilan calorique quotidien et des scans biométriques d'impédancemétrie (Poids, Masse Musculaire, Masse Grasse, BMR).

Conçue dans une philosophie **Local-First**, elle fonctionne avec un backend **Node.js (ESM)** léger dialoguant avec une base de données **SQLite** synchrone à haute performance via `better-sqlite3` en mode **WAL** (*Write-Ahead Logging*).

---

## 🌟 Fonctionnalités Principales

- 📊 **Matrice Consolidée Temporelle & Glissante :**
  - Affichage matriciel fluide des bilans journaliers (Apport, BMR, Sport, Bilan Net, Poids, Macros & Micros).
  - Contrôle temporel glissant par chevrons `<` et `>` (décalage de 7j en 7j, 30j en 30j, 90j en 90j) avec bouton de remise à zéro rapide (*Aujourd'hui*).
  - **Double Mode d'Affichage :** *Vue Principale (14 colonnes clés)* et *Vue Complète (35 Nutriments exhaustifs)*.

- 📈 **Explorateur Universel de Courbes Temporelles ("TOUT") :**
  - Visualisation dynamique sur 7j, 30j, 90j, 1 An ou Tout l'historique de **n'importe quelle variable** (Masse Musculaire, Poids, Kcal, Protéines, Lipides, Omégas, Calcium, Vitamine C, etc.).
  - **Lissage de Tendance :** Superposition optionnelle d'une courbe de moyenne mobile glissante sur 7 jours.
  - **Gestion des trous de données (*Zero-Gap Handling*) :** Les jours sans scan ou sans saisie sont traités comme `null` avec reliure continue (`spanGaps`), éliminant les chutes artificielles à 0.

- 🥑 **Catalogue Alimentaire (35 Nutriments) & Open Food Facts :**
  - Importation instantanée par nom ou code-barres via l'API **Open Food Facts**.
  - Formulaire d'édition complet par **onglets thématiques** (*Macros & Bases*, *Lipides & Omégas*, *Minéraux & Traces*, *Vitamines*).

- 📖 **Gestionnaire de Recettes Multi-Ingrédients :**
  - Création et modification de recettes composées de plusieurs aliments du catalogue.
  - Calcul et re-calcul automatique des nutriments et calories par portion.

- ⚖️ **Importation & Suivi Impédancemétrique Boditrax :**
  - Upload direct et analyse idempotente de fichiers CSV exportés depuis les balances **Boditrax**.
  - Historisation du poids, masse grasse, masse musculaire, graisse viscérale et âge métabolique.

- 📱 **Interface Mobile-First & PWA :**
  - Menu drawer réactif pour smartphone et tablette.
  - Installation en tant qu'application PWA native avec support hors-ligne (Service Worker).

- 🔒 **Sécurité Admin & Saisie Privilégiée :**
  - Authentification timing-safe (`ADMIN_SECRET` / En-tête `Authorization: Bearer <token>`) pour protéger la création, modification et suppression de données.

- 🤖 **Serveur MCP (Model Context Protocol) & Agent IA (Hermes Agent) :**
  - Serveur Stdio réactif permettant à un agent LLM (ex: **Hermes Agent**) d'exécuter des opérations typées et sécurisées (saisie de repas, création d'aliments/recettes, bilans journaliers/hebdomadaires, gestion de stock) via l'exécution contrôlée des scripts Python du projet.

---

## 🏗️ Architecture du Monorepo

Le projet est structuré sous forme de monorepo léger Node.js :

```
nutrition/
├── package.json               # Script racine (npm run dev, build, mcp, test:server)
├── HERMES_MCP_SETUP.md        # Guide de configuration MCP pour Hermes Agent
├── client/                    # Frontend Vue 3 (SPA & PWA)
│   ├── index.html
│   ├── vite.config.js         # Configuration Vite & vite-plugin-pwa
│   ├── tailwind.config.js     # Thème & utilitaires Tailwind CSS
│   └── src/
│       ├── api/               # Client Axios configuré (Bearer token)
│       ├── components/        # AppHeader (avec Drawer mobile), AuthModal, etc.
│       ├── stores/            # Stores Pinia (Dashboard, Foods, Recipes, Boditrax, Auth)
│       └── views/             # DashboardView, AnalyticsView, JournalView, FoodsView, RecipesView, BoditraxView
├── mcp/                       # Serveur MCP (Model Context Protocol pour Hermes Agent)
│   ├── package.json
│   └── index.js               # 8 outils MCP typés encapsulant les scripts Python
└── server/                    # Backend Node.js Express (Modules ESM Natifs)
    ├── .env                   # Configuration serveur & secret admin
    ├── src/
    │   ├── app.js             # Initialisation serveur Express & middlewares CORS/JSON
    │   ├── database/          # db.js (SQLite WAL) & migrate.js (auto-migration)
    │   ├── routes/            # Routes RESTful (/api/dashboard, /api/foods, /api/recipes, etc.)
    │   └── services/          # Services d'agrégation, calculs de recettes & parser Boditrax
    └── vitest.config.js       # Configuration Vitest (29 tests unitaires & d'intégration)
```

---

## ⚡ Démarrage Rapide

### 1. Prérequis
- **Node.js** `>= 18.0.0`
- **npm** `>= 9.0.0`

### 2. Installation
Cloner le dépôt et installer les dépendances du monorepo :

```bash
# 1. Cloner le projet
git clone https://github.com/S8N02000/Tracking.git
cd Tracking

# 2. Installer toutes les dépendances (serveur et client)
npm install
```

### 3. Configuration des Variables d'Environnement
Vérifier ou créer le fichier `server/.env` :

```env
PORT=3001
ADMIN_SECRET=secret_admin_token_123456
CORS_ORIGIN=http://localhost:5173
DATABASE_PATH=./src/database/nutrition.db
```

### 4. Lancer l'Application en Mode Développement
Une seule commande démarre simultanément le serveur backend Express (port 3001) et le serveur dev Vite frontend (port 5173) :

```bash
npm run dev
```

Ouvrez votre navigateur sur **`http://localhost:5173`**.

---

## 🧪 Lancer la Suite de Tests

Le projet dispose d'une couverture de test automatisée complète pour le moteur de calcul, le parseur Boditrax, la base SQLite et la totalité des routes API RESTful.

```bash
# Exécuter les 14 suites de tests (29 tests au total)
npm run test:server
```

---

## 📦 Compilation Production (Bundle PWA)

Pour construire la version de production distribuée et le Service Worker PWA :

```bash
npm run build
```

Les fichiers statiques prêts pour le déploiement seront générés dans `client/dist`.

---

## 🔌 Aperçu de l'API RESTful

| Méthode | Route | Description | Auth Admin |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/health` | Vérification de la santé du serveur et de SQLite | Non |
| `POST` | `/api/auth/verify` | Authentification timing-safe du secret administrateur | Oui |
| `GET` | `/api/dashboard` | Agrégation matricielle multi-tables avec plage de dates (`?start=...&end=...`) | Non |
| `GET` | `/api/analytics/correlation` | Séries temporelles Poids vs Bilan Calorique Cumulé | Non |
| `GET` | `/api/analytics/radar` | Profil micronutritionnel vs Apports Journaliers Recommandés (% AJR) | Non |
| `GET` | `/api/foods` | Liste des aliments avec recherche textuelle et filtrage par catégorie | Non |
| `POST` | `/api/foods` | Création d'un aliment avec 35 nutriments | Oui |
| `PUT` | `/api/foods/:id` | Modification d'un aliment | Oui |
| `DELETE` | `/api/foods/:id` | Suppression d'un aliment | Oui |
| `GET` | `/api/recipes` | Liste des recettes avec décomposition nutritionnelle par portion | Non |
| `POST` | `/api/recipes` | Création d'une recette multi-ingrédients | Oui |
| `PUT` | `/api/recipes/:id` | Mise à jour d'une recette | Oui |
| `DELETE` | `/api/recipes/:id` | Suppression d'une recette | Oui |
| `GET` | `/api/meals?date=YYYY-MM-DD` | Consultation du journal des repas pour une date | Non |
| `POST` | `/api/meals` | Saisie d'une consommation de repas ou recette | Oui |
| `POST` | `/api/boditrax/upload` | Importation idempotente de fichiers CSV d'impédancemétrie Boditrax | Oui |

---

## 🤖 Serveur MCP pour Hermes Agent

Un serveur **MCP (Model Context Protocol)** est directement inclus dans `mcp/` pour permettre à des agents IA comme **Hermes Agent** d'interagir en toute sécurité avec la base de données et le système de fichiers via les scripts Python du projet.

### Outils MCP exposés
- `add_food` : Ajout d'aliment dans `foods/` (35 nutriments)
- `add_recipe` : Création de recette avec macros par portion
- `log_meal` / `log_recipe` : Consignation de repas/recettes dans `log/`
- `compute_day` / `compute_week` : Bilans nutritionnels journaliers et hebdomadaires
- `new_stock` / `close_stock` : Gestion des sessions de stock produit

Pour plus de détails sur la configuration dans Hermes Agent, consultez **[HERMES_MCP_SETUP.md](./HERMES_MCP_SETUP.md)**.

```bash
# Lancer le serveur MCP Stdio manuellement
npm run mcp
```

---

## 📝 Licence

Projet personnel sous licence **MIT**.

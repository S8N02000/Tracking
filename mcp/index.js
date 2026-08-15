#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');

async function runPythonScript(scriptName, args = []) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  try {
    const { stdout, stderr } = await execFileAsync('python3', [scriptPath, ...args], {
      cwd: PROJECT_ROOT,
    });
    const output = (stdout + (stderr ? `\n[STDERR]\n${stderr}` : '')).trim();
    return {
      content: [
        {
          type: 'text',
          text: output || '✓ Opération exécutée avec succès (aucune sortie)',
        },
      ],
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Erreur d'exécution de ${scriptName}: ${error.message}\n${error.stdout || ''}\n${error.stderr || ''}`.trim(),
        },
      ],
    };
  }
}

const server = new Server(
  {
    name: 'nutritrack-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const NUTRI_FIELDS = [
  'kcal_par_100g', 'proteines_par_100g', 'glucides_par_100g', 'sucres_par_100g',
  'fibres_par_100g', 'amidon_par_100g', 'lipides_par_100g', 'ags_par_100g',
  'agi_par_100g', 'omega3_par_100g', 'omega6_par_100g', 'omega9_par_100g',
  'trans_par_100g', 'sel_par_100g', 'sodium_par_100g', 'cholesterol_par_100g',
  'vitamine_a_par_100g', 'vitamine_b1_par_100g', 'vitamine_b2_par_100g', 'vitamine_b3_par_100g',
  'vitamine_b5_par_100g', 'vitamine_b6_par_100g', 'vitamine_b9_par_100g', 'vitamine_b12_par_100g',
  'vitamine_c_par_100g', 'vitamine_d_par_100g', 'vitamine_e_par_100g', 'vitamine_k_par_100g',
  'calcium_par_100g', 'fer_par_100g', 'magnesium_par_100g', 'potassium_par_100g',
  'zinc_par_100g', 'phosphore_par_100g', 'manganese_par_100g', 'cuivre_par_100g',
  'selenium_par_100g', 'iode_par_100g'
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const foodProperties = {
    nom: { type: 'string', description: "Nom de l'aliment (ex: 'Flocons d'avoine')" },
    poids_unite_g: { type: 'number', description: 'Poids d unitaire en grammes (défaut: 100)' },
  };

  for (const field of NUTRI_FIELDS) {
    const fieldName = field.replace('_par_100g', '');
    foodProperties[field] = {
      type: 'number',
      description: `Quantité de ${fieldName} pour 100g`,
    };
  }

  return {
    tools: [
      {
        name: 'add_food',
        description: 'Enregistre un nouvel aliment avec sa fiche nutritionnelle dans le catalogue foods/ (35 nutriments).',
        inputSchema: {
          type: 'object',
          properties: foodProperties,
          required: ['nom'],
        },
      },
      {
        name: 'add_recipe',
        description: 'Enregistre une nouvelle recette dans recipes/ avec ses ingrédients et macros par portion.',
        inputSchema: {
          type: 'object',
          properties: {
            nom: { type: 'string', description: 'Nom de la recette' },
            ingredients: { type: 'string', description: 'Ingrédients sous la forme: slug1:quantite_g;slug2:quantite_g2 (ex: "poulet:150;riz:200")' },
            portions: { type: 'number', description: 'Nombre de portions (défaut: 1)' },
            kcal: { type: 'number', description: 'Calories par portion' },
            proteines: { type: 'number', description: 'Protéines en g par portion' },
            glucides: { type: 'number', description: 'Glucides en g par portion' },
            lipides: { type: 'number', description: 'Lipides en g par portion' },
            fibres: { type: 'number', description: 'Fibres en g par portion' },
            sel: { type: 'number', description: 'Sel en g par portion' },
          },
          required: ['nom', 'ingredients'],
        },
      },
      {
        name: 'log_meal',
        description: 'Consigne la consommation d un aliment dans le journal du jour (log/YYYY/MM/YYYY-MM-DD.csv).',
        inputSchema: {
          type: 'object',
          properties: {
            aliment: { type: 'string', description: "Slug ou nom de l'aliment dans foods/" },
            quantite: { type: 'number', description: 'Quantité consommée' },
            periode: { type: 'string', description: 'Période du repas: matin, midi, collation, ou soir' },
            unite: { type: 'string', description: 'Unité (ex: "g" ou "portion", défaut: "g")' },
            date: { type: 'string', description: 'Date au format YYYY-MM-DD (défaut: date du jour)' },
          },
          required: ['aliment', 'quantite', 'periode'],
        },
      },
      {
        name: 'log_recipe',
        description: 'Consigne une portion de recette préparée dans le journal du jour.',
        inputSchema: {
          type: 'object',
          properties: {
            recipe: { type: 'string', description: 'Slug de la recette dans recipes/' },
            portions: { type: 'number', description: 'Nombre de portions consommées (défaut: 1)' },
            date: { type: 'string', description: 'Date au format YYYY-MM-DD (défaut: date du jour)' },
          },
          required: ['recipe'],
        },
      },
      {
        name: 'compute_day',
        description: 'Calcule le bilan nutritionnel et calorique complet pour une journée donnée.',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date au format YYYY-MM-DD (défaut: date du jour)' },
          },
        },
      },
      {
        name: 'compute_week',
        description: 'Calcule la moyenne nutritionnelle hebdomadaire sur 7 jours.',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date de référence au format YYYY-MM-DD (défaut: date du jour)' },
          },
        },
      },
      {
        name: 'new_stock',
        description: 'Ouvre un nouveau suivi de stock pour un produit entamé.',
        inputSchema: {
          type: 'object',
          properties: {
            nom: { type: 'string', description: 'Nom du produit entamé' },
            quantite_g: { type: 'number', description: 'Quantité totale du produit en grammes' },
            jours_estimes: { type: 'number', description: 'Durée estimée d utilisation en jours (défaut: 15)' },
          },
          required: ['nom', 'quantite_g'],
        },
      },
      {
        name: 'close_stock',
        description: 'Clôture une session de stock produit et enregistre la consommation réelle.',
        inputSchema: {
          type: 'object',
          properties: {
            nom: { type: 'string', description: 'Nom du produit entamé à clôturer' },
            consomme_g: { type: 'number', description: 'Quantité consommée réelle en g (défaut: totalité du stock)' },
          },
          required: ['nom'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  switch (name) {
    case 'add_food': {
      const cliArgs = ['--nom', String(args.nom)];
      if (args.poids_unite_g !== undefined) {
        cliArgs.push('--poids-unite-g', String(args.poids_unite_g));
      }
      for (const field of NUTRI_FIELDS) {
        if (args[field] !== undefined && args[field] !== null) {
          const dash = field.replace(/_/g, '-');
          cliArgs.push(`--${dash}`, String(args[field]));
        }
      }
      return await runPythonScript('add_food.py', cliArgs);
    }

    case 'add_recipe': {
      const cliArgs = ['--nom', String(args.nom), '--ingredients', String(args.ingredients)];
      if (args.portions !== undefined) cliArgs.push('--portions', String(args.portions));
      for (const key of ['kcal', 'proteines', 'glucides', 'lipides', 'fibres', 'sel']) {
        if (args[key] !== undefined && args[key] !== null) {
          cliArgs.push(`--${key}`, String(args[key]));
        }
      }
      return await runPythonScript('add_recipe.py', cliArgs);
    }

    case 'log_meal': {
      const cliArgs = [
        '--aliment', String(args.aliment),
        '--quantite', String(args.quantite),
        '--periode', String(args.periode),
      ];
      if (args.unite) cliArgs.push('--unite', String(args.unite));
      if (args.date) cliArgs.push('--date', String(args.date));
      return await runPythonScript('log_meal.py', cliArgs);
    }

    case 'log_recipe': {
      const cliArgs = ['--recipe', String(args.recipe)];
      if (args.portions !== undefined) cliArgs.push('--portions', String(args.portions));
      if (args.date) cliArgs.push('--date', String(args.date));
      return await runPythonScript('log_recipe.py', cliArgs);
    }

    case 'compute_day': {
      const cliArgs = [];
      if (args.date) cliArgs.push('--date', String(args.date));
      return await runPythonScript('compute_day.py', cliArgs);
    }

    case 'compute_week': {
      const cliArgs = [];
      if (args.date) cliArgs.push('--date', String(args.date));
      return await runPythonScript('compute_week.py', cliArgs);
    }

    case 'new_stock': {
      const cliArgs = ['--nom', String(args.nom), '--quantite-g', String(args.quantite_g)];
      if (args.jours_estimes !== undefined) cliArgs.push('--jours-estimes', String(args.jours_estimes));
      return await runPythonScript('new_stock.py', cliArgs);
    }

    case 'close_stock': {
      const cliArgs = ['--nom', String(args.nom)];
      if (args.consomme_g !== undefined) cliArgs.push('--consomme-g', String(args.consomme_g));
      return await runPythonScript('close_stock.py', cliArgs);
    }

    default:
      return {
        isError: true,
        content: [{ type: 'text', text: `Outil MCP inconnu: ${name}` }],
      };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✓ NutriTrack MCP Server en cours d exécution sur Stdio');
}

main().catch((err) => {
  console.error('Erreur fatale du serveur MCP:', err);
  process.exit(1);
});

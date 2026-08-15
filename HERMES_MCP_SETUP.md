# 🤖 Configuration du Serveur MCP NutriTrack pour Hermes Agent

Ce serveur **MCP (Model Context Protocol)** permet à votre **Hermes Agent** (ou tout autre assistant/agent compatible MCP) d'interagir en toute sécurité avec vos scripts Python NutriTrack pour créer, modifier, logguer ou calculer des données nutritionnelles sans aucun risque de corruption.

---

## 🛠️ Outils MCP Disponibles

Le serveur MCP met à disposition d'Hermes Agent 8 outils typés :

| Outil MCP | Action |
| :--- | :--- |
| `add_food` | Enregistre un aliment dans `foods/` (35 nutriments pris en charge) |
| `add_recipe` | Enregistre une recette dans `recipes/` avec ses ingrédients et macros |
| `log_meal` | Enregistre la consommation d'un aliment dans le journal journalier (`log/YYYY/MM/`) |
| `log_recipe` | Consigne une portion de recette dans le journal du jour |
| `compute_day` | Calcule et affiche le bilan nutritionnel/calorique complet d'une journée |
| `compute_week` | Calcule le bilan moyen hebdomadaire sur 7 jours |
| `new_stock` | Ouvre une session de suivi de stock pour un produit entamé |
| `close_stock` | Clôture un suivi de stock et calcule la consommation réelle |

---

## ⚙️ Intégration dans Hermes Agent

Ajoutez la configuration suivante dans le fichier de configuration de votre **Hermes Agent** (`~/.hermes/config.json` ou `mcp_servers.json` selon votre installation) :

### Option 1 : Via Node.js (Recommandé)

```json
{
  "mcpServers": {
    "nutritrack": {
      "command": "node",
      "args": ["/home/s8n/Documents/projets/nutrition/mcp/index.js"]
    }
  }
}
```

### Option 2 : Via NPX

```json
{
  "mcpServers": {
    "nutritrack": {
      "command": "npx",
      "args": ["-y", "tsx", "/home/s8n/Documents/projets/nutrition/mcp/index.js"]
    }
  }
}
```

### Option 3 : Via Script npm

```json
{
  "mcpServers": {
    "nutritrack": {
      "command": "npm",
      "args": ["run", "mcp", "--prefix", "/home/s8n/Documents/projets/nutrition"]
    }
  }
}
```

---

## 🧪 Tester manuellement le Serveur MCP

Vous pouvez lancer le serveur MCP en ligne de commande pour vérifier qu'il s'exécute normalement sur l'entrée/sortie standard (Stdio) :

```bash
npm run mcp
```

Vous devriez voir s'afficher sur la sortie d'erreur (`stderr`) :
`✓ NutriTrack MCP Server en cours d exécution sur Stdio`

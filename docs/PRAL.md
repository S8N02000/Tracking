# Moteur PRAL — documentation technique

> Indicateur de **population** (charge acide-alcaline alimentaire).
> Ce n'est **pas** un diagnostic individuel.

---

## 1. Formule

### Coefficients canoniques — Remer & Manz (1995)

| Nutriment | Exact | Arrondi | Unité |
|-----------|-------|---------|-------|
| Protéines  | `0,4888` | `0,49`  | g |
| Phosphore  | `0,0366` | `0,037` | mg |
| Potassium  | `-0,0205` | `-0,021`| mg |
| Magnésium  | `-0,0263` | `-0,026`| mg |
| Calcium    | `-0,0125` | `-0,013`| mg |

**Le calcium porte le coefficient le plus faible en valeur absolue ; le magnésium
le plus fort.** Inverser les deux est un bug silencieux qui sous-estime le
PRAL d'environ `0,013 × (Ca − Mg)` mEq/jour (≈ 7,7 mEq/jour sur la fenêtre
réelle du 22–28/10/2026).

La variante `exact` est le défaut. La variante `rounded` est exposée mais
n'est pas utilisée par défaut.

### Contrôle empirique

Sur 22 aliments, erreur absolue de reconstruction :

| Affectation | Erreur absolue |
|--------------|----------------|
| Remer & Manz | 44,3 |
| Ancienne (Ca/Mg inversés) | 58,1 |

---

## 2. Architecture

```
src/domain/pral/          domaine PUR — aucune dépendance SQLite/Express
  constants.js             coefficients, unités, clés, sources
  formula.js               calcul strict/partial + agrégats bornés
  quality.js               provenance, couverture, bornes, validations
  thresholds.js            politique clinique (bandes, statuts)
  period.js                journées valides, dénominateur, exclusions

src/services/
  pralQueries.js           frontière SQL unique, NULL-aware
  pralService.js           orchestrateur SQL → qualité → formule → période → seuils
```

Le domaine est testable isolement (Vitest, sans base) ; le SQL est isolé dans
un seul fichier ; l'orchestrateur ne fait que composer.

---

## 3. Qualité des données

### Trois résolutions distinctes

| Résolution | Signification |
|------------|---------------|
| `direct` | Valeur documentée dans la source. |
| `donor` | Valeur issue d'une curation auditée (provenance + fenêtre). |
| `unresolved` | Non documentée. **Jamais convertie en zéro.** |

### Un NULL n'est pas un zéro

La stratégie historique `NULL → 0` produisait un score faussement précis.
La stratégie `imputed` (défaut) conserve l'absence et l'expose.

Conséquences mesurées sur 22–28/10/2026 :

| Stratégie | PRAL | Charge acide retirée |
|-----------|------|----------------------|
| `NULL → 0` (historique) | +25,4 mEq/j | — |
| `imputed` (défaut) | +26,3 mEq/j | 0 |
| `complete_case` | +22,5 mEq/j | 10,4 mEq/j |

`complete_case` est une **étude de sensibilité**, pas le mode par défaut :
sur cette fenêtre elle retire notamment des protéines de la baguette et
sous-estime davantage le PRAL.

### Bornes sign-aware

K, Mg et Ca portent un coefficient **négatif** : une incertitude sur ces
termes **diminue** la borne basse, tandis qu'elle augmente la borne haute
sur les termes positifs (protéines, phosphore). L'implémentation calcule les
contributions bornées puis applique `Math.min`/`Math.max`.

`-0` est normalisé en `0` avant publication.

### Imputation par catégorie : refusée

La médiane de catégorie a été évaluée et **rejetée** :

- `Yanga` (food 68, 13,5 kg consommés) → environ **−138 mEq** : aberration.
- `Baguette` (food 48, ≈ 2,7 kg consommés) → fausse, la baguette a une
  composition minérale propre.

Pour les lignes à fort levier ou ambiguës, on utilise un **intervalle
d'incertitude documenté** plutôt qu'une imputation ponctuelle.

### Pas de matching automatique

Le plus-proche-voisin par catégorie a produit `beurre → huile` et
`pêche → zeste de citron`. Tout appariement est une **curation manuelle**
enregistrée en base.

---

## 4. Curations — traçabilité temporelle

Table `food_nutrient_references` :

```sql
food_id      INTEGER NOT NULL
reference_id INTEGER NOT NULL
mode         TEXT NOT NULL          -- 'donor' | 'zero'
valid_from   TEXT NOT NULL DEFAULT ''   -- '' = depuis un temps indéterminé
valid_to     TEXT                   -- NULL/'' = sans fin connue
note         TEXT
UNIQUE (food_id, mode, valid_from)
```

- Les dates sont comparées à la date de la **ligne de repas** (`meal_log.date_`).
- Un aliment peut porter **plusieurs curations disjointes** dans le temps.
- `note` porte la provenance et l'impact rétroactif assumé.

### Curation active

| Aliment | Donneur | Provenance | Fenêtre |
|---------|---------|------------|---------|
| `48` Baguette (minéraux non documentés) | `123` Baguette Complète | Ciqual | 2026-08-01 → 2026-12-31 |

---

## 5. Périodes et dénominateur

```js
DEFAULT_DAY_POLICY = { minDayKcal: 800, minDayCoverage: 0.9 }
```

Motifs d'exclusion : `no_meals`, `below_min_kcal`, `insufficient_coverage`.

Une journée incomplète **n'est jamais traitée silencieusement comme
complète** : elle est exclue et nommée dans `exclusions`.

> `dashboard.rows` n'est pas un dénominateur fiable : il inclut les jours
> calendaires vides.

---

## 6. Politique clinique

| Bande | Score (mEq/j) | Libellé |
|-------|---------------|---------|
| `normal_omnivore` | ≤ +30 | Charge normale |
| `surveillance` | +30 … +45 | À surveiller |
| `alerte` | +45 … +70 | Charge élevée |
| `exces` | > +70 | Excès net |

Le seuil historique `> 15 = CRITIQUE` était **cliniquement infondé** : il
plaçait un régime omnivore occidental usuel en zone d'alerte.

Les bandes sont **injectables** (`evaluatePral(score, { bands })`) : la
politique est remplaçable sans toucher au moteur.

---

## 7. Recettes

- Les recettes sont **décomposées ingrédient par ingrédient** via
  `recipe_ingredients`.
- Les totaux stockés dans `recipes` ne sont **pas** une autorité : ils ont
  été calculés par un convertisseur qui transformait les `NULL` en zéros.
  → 13 recettes décomposables avaient des totaux partiels présentés comme
  complets.
- `recipeCalculator` expose désormais `partial_nutrients`,
  `undocumented_nutrients` et `nutrients_complete` — **sans** changer la
  sémantique numérique des agrégats existants (pas de régression dashboard).
- Les 9 recettes saisies directement (sans `recipe_ingredients`) sont marquées
  comme origine legacy.

Base d'unité :

```
recipe_ingredients.quantity_g = masse de l'ingrédient pour la RECETTE ENTIÈRE
grams_per_portion = total_weight_g / portions
consumed_grams    = quantity_g × consumed_portions
```

---

## 8. API

### Compatibilité préservée

Le ratio conserve l'identifiant historique **`indice_pral`** :

```json
{
  "id": "indice_pral",
  "label": "Indice PRAL (Charge Acide)",
  "value": 26.3,
  "unit": "mEq / jour",
  "status": "OPTIMAL",
  "is_problem": false,
  "band": "normal_omnivore",
  "band_label": "Charge normale",
  "low": 26.3,
  "high": 26.3,
  "valid_days": 6,
  "excluded_days": 1
}
```

### Endpoint dédié

```
GET /api/analytics/pral?start=YYYY-MM-DD&end=YYYY-MM-DD
```

Retourne le rapport complet : `period`, `days[]`, `exclusions`, `clinical`,
`quality`, `donors`, `zeroDeclared`, `ratio`.

Le client ne calcule rien : il consomme le ratio.

---

## 9. Tests

```bash
cd /data/nutrition/server
npx vitest run src/domain/pral src/services/__tests__/pralService.test.js src/services/__tests__/pralApi.test.js
```

| Fichier | Couvre |
|---------|--------|
| `src/domain/pral/__tests__/formula.test.js` | coefficients, bornes sign-aware, `-0`, partial/strict |
| `src/domain/pral/__tests__/quality.test.js` | provenance, couverture, stratégie, fenêtres de validité |
| `src/domain/pral/__tests__/period.test.js` | journées valides, exclusions motivées |
| `src/services/__tests__/pralService.test.js` | intégration sur base temporaire |
| `src/services/__tests__/pralApi.test.js` | non-régression `indice_pral` + endpoint HTTP |

---

## 10. Déploiement

```bash
cd /data/nutrition
docker cp server/src/. nutrition-app:/app/server/src/
cd client && npm run build && docker cp dist/. nutrition-app:/app/client/dist/
docker stop nutrition-app && sleep 3 && docker start nutrition-app
```

> `docker restart` seul ne recharge pas les modules Node : il faut
> `docker stop && sleep 2 && docker start`.

Migration de la base :

```bash
cd /data/nutrition/server && node -e "import('./src/database/migrate.js').then(m => m.runMigrations('/data/nutrition/sqlite/nutrition.db'))"
```

Sauvegarder **avant** toute écriture :

```bash
cp sqlite/nutrition.db sqlite/nutrition.db.bak-pre-<motif>-$(date +%Y%m%d-%H%M%S)
```

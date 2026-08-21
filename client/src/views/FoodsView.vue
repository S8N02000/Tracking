<template>
  <div class="space-y-6">
    <!-- Top Bar -->
    <div class="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-white flex items-center gap-2">
          <UtensilsCrossed class="w-6 h-6 text-cyan-400" />
          Base de Données Alimentaire (35 Nutriments Éditables)
        </h2>
        <p class="text-xs text-slate-400">Recherche, édition complète de tous les nutriments, minéraux et vitamines</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button
          @click="showOffModal = true"
          class="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition"
        >
          <Barcode class="w-4 h-4" />
          <span>Import Open Food Facts</span>
        </button>

        <button
          v-if="authStore.isAuthenticated"
          @click="openAddModal"
          class="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20"
        >
          <Plus class="w-4 h-4" />
          <span>Nouvel aliment</span>
        </button>
      </div>
    </div>

    <!-- Filters & Search Bar -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="relative md:col-span-2">
        <Search class="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
        <input
          v-model="foodsStore.searchQuery"
          @input="foodsStore.fetchFoods()"
          type="text"
          placeholder="Rechercher par nom ou marque..."
          class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-cyan-500 font-sans"
        />
      </div>

      <div>
        <select
          v-model="foodsStore.selectedCategory"
          @change="foodsStore.fetchFoods()"
          class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-cyan-500 font-sans"
        >
          <option value="">Toutes les catégories</option>
          <option value="produit_laitier">Produit Laitier</option>
          <option value="viande">Viande</option>
          <option value="poisson">Poisson</option>
          <option value="oeuf">Œuf</option>
          <option value="legume">Légume</option>
          <option value="fruit">Fruit</option>
          <option value="cereale">Céréale</option>
          <option value="legumineuse">Légumineuse</option>
          <option value="matière_grasse">Matière Grasse</option>
          <option value="sucre">Sucre</option>
          <option value="epice">Épice</option>
          <option value="condiment">Condiment</option>
          <option value="boisson">Boisson</option>
          <option value="supplement">Supplément</option>
          <option value="plat_prepare">Plat Préparé</option>
          <option value="autre">Autre</option>
        </select>
      </div>
    </div>

    <!-- Foods Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="food in foodsStore.foods"
        :key="food.id"
        class="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition space-y-3 flex flex-col justify-between"
      >
        <div>
          <div class="flex items-start justify-between">
            <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-cyan-400 tracking-wider">
              {{ food.category }}
            </span>
            <span class="text-xs text-slate-500 font-mono">ID: #{{ food.id }}</span>
          </div>

          <h3 class="text-base font-bold text-white mt-2">{{ food.name }}</h3>
          <p v-if="food.brand" class="text-xs text-slate-400">{{ food.brand }}</p>
        </div>

        <div class="grid grid-cols-4 gap-2 pt-3 border-t border-slate-800 text-center font-mono text-xs">
          <div>
            <span class="block text-[10px] text-slate-500 uppercase">Kcal</span>
            <span class="font-bold text-cyan-300">{{ food.energy_kcal_100g || 0 }}</span>
          </div>
          <div>
            <span class="block text-[10px] text-slate-500 uppercase">Prot.</span>
            <span class="font-bold text-rose-300">{{ food.proteins_g_100g || 0 }}g</span>
          </div>
          <div>
            <span class="block text-[10px] text-slate-500 uppercase">Gluc.</span>
            <span class="font-bold text-amber-300">{{ food.carbohydrates_g_100g || 0 }}g</span>
          </div>
          <div>
            <span class="block text-[10px] text-slate-500 uppercase">Lip.</span>
            <span class="font-bold text-yellow-300">{{ food.fat_g_100g || 0 }}g</span>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-800/60">
          <!-- Accessible à tous : bouton détails nutriments -->
          <button @click="openNutrientModal(food)" class="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition">
            <Info class="w-3.5 h-3.5" /> Tous les nutriments
          </button>

          <div v-if="authStore.isAuthenticated" class="flex space-x-3">
            <button @click="openEditModal(food)" class="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold">
              <Edit class="w-3.5 h-3.5" /> Éditer
            </button>
            <button @click="foodsStore.deleteFood(food.id)" class="text-xs text-rose-400 hover:underline flex items-center gap-1">
              <Trash2 class="w-3.5 h-3.5" /> Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Open Food Facts -->
    <div v-if="showOffModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="glass-panel max-w-2xl w-full rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-4">
        <h3 class="text-lg font-bold text-white flex items-center gap-2">
          <Barcode class="w-5 h-5 text-emerald-400" />
          Recherche & Import Open Food Facts
        </h3>

        <div class="flex space-x-2">
          <input
            v-model="offQuery"
            type="text"
            placeholder="Saisissez un nom de produit ou un code-barres (ex: 3017620422003)..."
            class="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
          />
          <button
            @click="handleOffSearch"
            class="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400"
          >
            Rechercher
          </button>
        </div>

        <div v-if="foodsStore.offSearching" class="py-8 text-center text-slate-400 text-sm">
          Recherche sur l'API Open Food Facts en cours...
        </div>

        <div v-else class="max-h-80 overflow-y-auto space-y-2">
          <div
            v-for="(item, idx) in foodsStore.offSearchResults"
            :key="idx"
            class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between"
          >
            <div>
              <p class="font-bold text-white text-sm">{{ item.name }}</p>
              <p class="text-xs text-slate-400">{{ item.brand }} • {{ item.energy_kcal_100g || 0 }} kcal / 100g</p>
            </div>
            <button
              v-if="authStore.isAuthenticated"
              @click="importOffItem(item)"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400"
            >
              Importer
            </button>
          </div>
        </div>

        <div class="flex justify-end">
          <button @click="showOffModal = false" class="px-4 py-2 rounded-xl text-sm text-slate-400">Fermer</button>
        </div>
      </div>
    </div>

    <!-- 🌟 FULL 35-NUTRIENT TABBED EDIT MODAL -->
    <div v-if="showFoodFormModal" class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div class="glass-panel max-w-3xl w-full rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-white flex items-center justify-between">
          <span>{{ editingFoodId ? 'Édition Aliment #' + editingFoodId : 'Créer un Aliment (35 Nutriments)' }}</span>
          <span class="text-xs font-mono text-cyan-400">Échelle pour 100g</span>
        </h3>

        <!-- Tab Bar -->
        <div class="flex space-x-2 border-b border-slate-800 pb-2 text-xs font-mono overflow-x-auto">
          <button
            type="button"
            @click="activeTab = 'macros'"
            class="px-3 py-1.5 rounded-lg transition"
            :class="activeTab === 'macros' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'"
          >
            Macros & Bases
          </button>
          <button
            type="button"
            @click="activeTab = 'fats'"
            class="px-3 py-1.5 rounded-lg transition"
            :class="activeTab === 'fats' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'"
          >
            Lipides & Omégas
          </button>
          <button
            type="button"
            @click="activeTab = 'minerals'"
            class="px-3 py-1.5 rounded-lg transition"
            :class="activeTab === 'minerals' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'"
          >
            Minéraux & Traces
          </button>
          <button
            type="button"
            @click="activeTab = 'vitamins'"
            class="px-3 py-1.5 rounded-lg transition"
            :class="activeTab === 'vitamins' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'"
          >
            Vitamines
          </button>
        </div>

        <form @submit.prevent="submitFoodForm">
          <!-- TAB 1: MACROS & BASE -->
          <div v-show="activeTab === 'macros'" class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div class="md:col-span-2">
              <label class="block text-slate-400 mb-1">Nom de l'aliment *</label>
              <input v-model="foodForm.name" type="text" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" required />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Marque / Enseigne</label>
              <input v-model="foodForm.brand" type="text" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Catégorie *</label>
              <select v-model="foodForm.category" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" required>
                <option value="produit_laitier">Produit Laitier</option>
                <option value="viande">Viande</option>
                <option value="poisson">Poisson</option>
                <option value="oeuf">Œuf</option>
                <option value="legume">Légume</option>
                <option value="fruit">Fruit</option>
                <option value="cereale">Céréale</option>
                <option value="legumineuse">Légumineuse</option>
                <option value="matière_grasse">Matière Grasse</option>
                <option value="sucre">Sucre</option>
                <option value="epice">Épice</option>
                <option value="condiment">Condiment</option>
                <option value="boisson">Boisson</option>
                <option value="supplement">Supplément</option>
                <option value="plat_prepare">Plat Préparé</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Énergie (kcal / 100g)</label>
              <input v-model.number="foodForm.energy_kcal_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Protéines (g / 100g)</label>
              <input v-model.number="foodForm.proteins_g_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Glucides (g / 100g)</label>
              <input v-model.number="foodForm.carbohydrates_g_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Sucres (g / 100g)</label>
              <input v-model.number="foodForm.sugars_g_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Lipides Totaux (g / 100g)</label>
              <input v-model.number="foodForm.fat_g_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Fibres (g / 100g)</label>
              <input v-model.number="foodForm.fiber_g_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Sel (g / 100g)</label>
              <input v-model.number="foodForm.salt_g_100g" type="number" step="0.01" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Sodium (mg / 100g)</label>
              <input v-model.number="foodForm.sodium_mg_100g" type="number" step="1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" />
            </div>
          </div>

          <!-- TAB 2: FATS & OMEGAS -->
          <div v-show="activeTab === 'fats'" class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label class="block text-slate-400 mb-1">Lipides Saturés (g)</label>
              <input v-model.number="foodForm.saturated_fat_g_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Mono-insaturés (g)</label>
              <input v-model.number="foodForm.monounsaturated_fat_g_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Poly-insaturés (g)</label>
              <input v-model.number="foodForm.polyunsaturated_fat_g_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Oméga-3 (g)</label>
              <input v-model.number="foodForm.omega_3_g_100g" type="number" step="0.01" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Oméga-6 (g)</label>
              <input v-model.number="foodForm.omega_6_g_100g" type="number" step="0.01" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Gras Trans (g)</label>
              <input v-model.number="foodForm.trans_fat_g_100g" type="number" step="0.01" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Cholestérol (mg)</label>
              <input v-model.number="foodForm.cholesterol_mg_100g" type="number" step="1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" />
            </div>
          </div>

          <!-- TAB 3: MINERALS -->
          <div v-show="activeTab === 'minerals'" class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div><label class="block text-slate-400 mb-1">Calcium (mg)</label><input v-model.number="foodForm.calcium_mg_100g" type="number" step="1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Fer (mg)</label><input v-model.number="foodForm.iron_mg_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Magnésium (mg)</label><input v-model.number="foodForm.magnesium_mg_100g" type="number" step="1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Phosphore (mg)</label><input v-model.number="foodForm.phosphorus_mg_100g" type="number" step="1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Potassium (mg)</label><input v-model.number="foodForm.potassium_mg_100g" type="number" step="1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Zinc (mg)</label><input v-model.number="foodForm.zinc_mg_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Cuivre (mg)</label><input v-model.number="foodForm.copper_mg_100g" type="number" step="0.01" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Manganèse (mg)</label><input v-model.number="foodForm.manganese_mg_100g" type="number" step="0.01" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Sélénium (µg)</label><input v-model.number="foodForm.selenium_mcg_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Iode (µg)</label><input v-model.number="foodForm.iodine_mcg_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
          </div>

          <!-- TAB 4: VITAMINS -->
          <div v-show="activeTab === 'vitamins'" class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div><label class="block text-slate-400 mb-1">Vitamine A (µg)</label><input v-model.number="foodForm.vit_a_mcg_100g" type="number" step="1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Vitamine D (µg)</label><input v-model.number="foodForm.vit_d_mcg_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Vitamine E (mg)</label><input v-model.number="foodForm.vit_e_mg_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Vitamine K (µg)</label><input v-model.number="foodForm.vit_k_mcg_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Vitamine C (mg)</label><input v-model.number="foodForm.vit_c_mg_100g" type="number" step="1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Vit B1 Thiamine (mg)</label><input v-model.number="foodForm.vit_b1_mg_100g" type="number" step="0.01" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Vit B2 Riboflavine (mg)</label><input v-model.number="foodForm.vit_b2_mg_100g" type="number" step="0.01" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Vit B3 Niacine (mg)</label><input v-model.number="foodForm.vit_b3_mg_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Vit B5 Pantothénique (mg)</label><input v-model.number="foodForm.vit_b5_mg_100g" type="number" step="0.1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Vit B6 Pyridoxine (mg)</label><input v-model.number="foodForm.vit_b6_mg_100g" type="number" step="0.01" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Vit B9 Folates (µg)</label><input v-model.number="foodForm.vit_b9_mcg_100g" type="number" step="1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
            <div><label class="block text-slate-400 mb-1">Vit B12 Cobalamine (µg)</label><input v-model.number="foodForm.vit_b12_mcg_100g" type="number" step="0.01" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" /></div>
          </div>

          <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-800">
            <button type="button" @click="showFoodFormModal = false" class="px-4 py-2 rounded-xl text-sm font-medium text-slate-400">Annuler</button>
            <button type="submit" class="px-5 py-2 rounded-xl text-sm font-semibold bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20">
              {{ editingFoodId ? 'Enregistrer Modifications' : 'Créer Aliment' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL DÉTAIL NUTRIMENTS — accessible à tous -->
    <div v-if="showNutrientModal && selectedNutrientFood" class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div class="glass-panel max-w-2xl w-full rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-white">{{ selectedNutrientFood.name }}</h3>
          <button @click="showNutrientModal = false" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <!-- Mini summary bar -->
        <div class="grid grid-cols-4 gap-2 text-center font-mono text-xs p-3 bg-slate-900/80 rounded-xl">
          <div><span class="block text-[10px] text-slate-500 uppercase">Kcal</span><span class="font-bold text-cyan-300">{{ selectedNutrientFood.energy_kcal_100g || 0 }}</span></div>
          <div><span class="block text-[10px] text-slate-500 uppercase">Prot.</span><span class="font-bold text-rose-300">{{ selectedNutrientFood.proteins_g_100g || 0 }}g</span></div>
          <div><span class="block text-[10px] text-slate-500 uppercase">Gluc.</span><span class="font-bold text-amber-300">{{ selectedNutrientFood.carbohydrates_g_100g || 0 }}g</span></div>
          <div><span class="block text-[10px] text-slate-500 uppercase">Lip.</span><span class="font-bold text-yellow-300">{{ selectedNutrientFood.fat_g_100g || 0 }}g</span></div>
        </div>

        <!-- Lipides détaillés -->
        <div v-if="selectedNutrientFood.saturated_fat_g_100g || selectedNutrientFood.omega3_g_100g || selectedNutrientFood.omega6_g_100g || selectedNutrientFood.omega9_g_100g || selectedNutrientFood.trans_fat_g_100g">
          <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Lipides</h4>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
            <div v-if="selectedNutrientFood.saturated_fat_g_100g"><span class="text-slate-400">Sat.</span> <span class="text-white">{{ selectedNutrientFood.saturated_fat_g_100g }}g</span></div>
            <div v-if="selectedNutrientFood.omega3_g_100g"><span class="text-slate-400">Oméga-3</span> <span class="text-green-400">{{ selectedNutrientFood.omega3_g_100g }}g</span></div>
            <div v-if="selectedNutrientFood.omega6_g_100g"><span class="text-slate-400">Oméga-6</span> <span class="text-yellow-400">{{ selectedNutrientFood.omega6_g_100g }}g</span></div>
            <div v-if="selectedNutrientFood.omega9_g_100g"><span class="text-slate-400">Oméga-9</span> <span class="text-blue-400">{{ selectedNutrientFood.omega9_g_100g }}g</span></div>
            <div v-if="selectedNutrientFood.trans_fat_g_100g"><span class="text-slate-400">Trans</span> <span class="text-orange-400">{{ selectedNutrientFood.trans_fat_g_100g }}g</span></div>
            <div v-if="selectedNutrientFood.cholesterol_mg_100g"><span class="text-slate-400">Chol.</span> <span class="text-white">{{ selectedNutrientFood.cholesterol_mg_100g }}mg</span></div>
          </div>
        </div>

        <!-- Glucides détaillés -->
        <div v-if="selectedNutrientFood.sugars_g_100g || selectedNutrientFood.fiber_g_100g || selectedNutrientFood.starch_g_100g">
          <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Glucides</h4>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
            <div v-if="selectedNutrientFood.carbohydrates_g_100g"><span class="text-slate-400">Totaux</span> <span class="text-white">{{ selectedNutrientFood.carbohydrates_g_100g }}g</span></div>
            <div v-if="selectedNutrientFood.sugars_g_100g"><span class="text-slate-400">Sucres</span> <span class="text-amber-400">{{ selectedNutrientFood.sugars_g_100g }}g</span></div>
            <div v-if="selectedNutrientFood.fiber_g_100g"><span class="text-slate-400">Fibres</span> <span class="text-green-400">{{ selectedNutrientFood.fiber_g_100g }}g</span></div>
            <div v-if="selectedNutrientFood.starch_g_100g"><span class="text-slate-400">Amidon</span> <span class="text-white">{{ selectedNutrientFood.starch_g_100g }}g</span></div>
          </div>
        </div>

        <!-- Minéraux -->
        <div v-if="selectedNutrientFood.calcium_mg_100g || selectedNutrientFood.iron_mg_100g || selectedNutrientFood.magnesium_mg_100g || selectedNutrientFood.phosphorus_mg_100g || selectedNutrientFood.potassium_mg_100g || selectedNutrientFood.zinc_mg_100g || selectedNutrientFood.manganese_mg_100g || selectedNutrientFood.copper_mg_100g || selectedNutrientFood.selenium_mg_100g || selectedNutrientFood.iodine_mg_100g">
          <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Minéraux & Oligo-éléments</h4>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
            <div v-if="selectedNutrientFood.calcium_mg_100g"><span class="text-slate-400">Calcium</span> <span class="text-white">{{ selectedNutrientFood.calcium_mg_100g }}mg</span></div>
            <div v-if="selectedNutrientFood.iron_mg_100g"><span class="text-slate-400">Fer</span> <span class="text-red-400">{{ selectedNutrientFood.iron_mg_100g }}mg</span></div>
            <div v-if="selectedNutrientFood.magnesium_mg_100g"><span class="text-slate-400">Magnésium</span> <span class="text-purple-400">{{ selectedNutrientFood.magnesium_mg_100g }}mg</span></div>
            <div v-if="selectedNutrientFood.phosphorus_mg_100g"><span class="text-slate-400">Phosphore</span> <span class="text-white">{{ selectedNutrientFood.phosphorus_mg_100g }}mg</span></div>
            <div v-if="selectedNutrientFood.potassium_mg_100g"><span class="text-slate-400">Potassium</span> <span class="text-pink-400">{{ selectedNutrientFood.potassium_mg_100g }}mg</span></div>
            <div v-if="selectedNutrientFood.zinc_mg_100g"><span class="text-slate-400">Zinc</span> <span class="text-white">{{ selectedNutrientFood.zinc_mg_100g }}mg</span></div>
            <div v-if="selectedNutrientFood.manganese_mg_100g"><span class="text-slate-400">Manganèse</span> <span class="text-slate-300">{{ selectedNutrientFood.manganese_mg_100g }}mg</span></div>
            <div v-if="selectedNutrientFood.copper_mg_100g"><span class="text-slate-400">Cuivre</span> <span class="text-orange-300">{{ selectedNutrientFood.copper_mg_100g }}mg</span></div>
            <div v-if="selectedNutrientFood.selenium_mg_100g"><span class="text-slate-400">Sélénium</span> <span class="text-yellow-300">{{ (selectedNutrientFood.selenium_mg_100g * 1000).toFixed(0) }}µg</span></div>
            <div v-if="selectedNutrientFood.iodine_mg_100g"><span class="text-slate-400">Iode</span> <span class="text-cyan-300">{{ (selectedNutrientFood.iodine_mg_100g * 1000).toFixed(0) }}µg</span></div>
          </div>
        </div>

        <!-- Vitamines -->
        <div v-if="selectedNutrientFood.vit_a_mcg_100g || selectedNutrientFood.vit_d_mcg_100g || selectedNutrientFood.vit_e_mg_100g || selectedNutrientFood.vit_k_mcg_100g || selectedNutrientFood.vit_c_mg_100g || selectedNutrientFood.vit_b1_mg_100g || selectedNutrientFood.vit_b2_mg_100g || selectedNutrientFood.vit_b3_mg_100g || selectedNutrientFood.vit_b5_mg_100g || selectedNutrientFood.vit_b6_mg_100g || selectedNutrientFood.vit_b9_mcg_100g || selectedNutrientFood.vit_b12_mcg_100g">
          <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Vitamines</h4>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
            <div v-if="selectedNutrientFood.vit_a_mcg_100g"><span class="text-slate-400">Vit A</span> <span class="text-orange-300">{{ selectedNutrientFood.vit_a_mcg_100g }}µg</span></div>
            <div v-if="selectedNutrientFood.vit_d_mcg_100g"><span class="text-slate-400">Vit D</span> <span class="text-yellow-300">{{ selectedNutrientFood.vit_d_mcg_100g }}µg</span></div>
            <div v-if="selectedNutrientFood.vit_e_mg_100g"><span class="text-slate-400">Vit E</span> <span class="text-green-400">{{ selectedNutrientFood.vit_e_mg_100g }}mg</span></div>
            <div v-if="selectedNutrientFood.vit_k_mcg_100g"><span class="text-slate-400">Vit K</span> <span class="text-pink-400">{{ selectedNutrientFood.vit_k_mcg_100g }}µg</span></div>
            <div v-if="selectedNutrientFood.vit_c_mg_100g"><span class="text-slate-400">Vit C</span> <span class="text-red-300">{{ selectedNutrientFood.vit_c_mg_100g }}mg</span></div>
            <div v-if="selectedNutrientFood.vit_b1_mg_100g"><span class="text-slate-400">Vit B1</span> <span class="text-white">{{ selectedNutrientFood.vit_b1_mg_100g }}mg</span></div>
            <div v-if="selectedNutrientFood.vit_b2_mg_100g"><span class="text-slate-400">Vit B2</span> <span class="text-white">{{ selectedNutrientFood.vit_b2_mg_100g }}mg</span></div>
            <div v-if="selectedNutrientFood.vit_b3_mg_100g"><span class="text-slate-400">Vit B3</span> <span class="text-white">{{ selectedNutrientFood.vit_b3_mg_100g }}mg</span></div>
            <div v-if="selectedNutrientFood.vit_b5_mg_100g"><span class="text-slate-400">Vit B5</span> <span class="text-white">{{ selectedNutrientFood.vit_b5_mg_100g }}mg</span></div>
            <div v-if="selectedNutrientFood.vit_b6_mg_100g"><span class="text-slate-400">Vit B6</span> <span class="text-white">{{ selectedNutrientFood.vit_b6_mg_100g }}mg</span></div>
            <div v-if="selectedNutrientFood.vit_b9_mcg_100g"><span class="text-slate-400">Vit B9</span> <span class="text-purple-300">{{ selectedNutrientFood.vit_b9_mcg_100g }}µg</span></div>
            <div v-if="selectedNutrientFood.vit_b12_mcg_100g"><span class="text-slate-400">Vit B12</span> <span class="text-red-400">{{ selectedNutrientFood.vit_b12_mcg_100g }}µg</span></div>
          </div>
        </div>

        <!-- Sel & Sodium -->
        <div v-if="selectedNutrientFood.salt_g_100g || selectedNutrientFood.sodium_mg_100g">
          <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Sel & Sodium</h4>
          <div class="grid grid-cols-2 gap-2 text-xs font-mono">
            <div v-if="selectedNutrientFood.salt_g_100g"><span class="text-slate-400">Sel</span> <span class="text-red-400">{{ selectedNutrientFood.salt_g_100g }}g</span></div>
            <div v-if="selectedNutrientFood.sodium_mg_100g"><span class="text-slate-400">Sodium</span> <span class="text-white">{{ selectedNutrientFood.sodium_mg_100g }}mg</span></div>
          </div>
        </div>

        <!-- Notes source -->
        <div v-if="selectedNutrientFood.notes" class="text-xs text-slate-500 italic pt-2 border-t border-slate-800">
          Source: {{ selectedNutrientFood.notes }}
        </div>

        <div class="flex justify-end pt-2">
          <button @click="showNutrientModal = false" class="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white">Fermer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useFoodsStore } from '@/stores/foodsStore.js';
import { useAuthStore } from '@/stores/authStore.js';
import { UtensilsCrossed, Plus, Search, Barcode, Trash2, Edit, Info } from 'lucide-vue-next';

const foodsStore = useFoodsStore();
const authStore = useAuthStore();

const showOffModal = ref(false);
const showFoodFormModal = ref(false);
const showNutrientModal = ref(false);
const selectedNutrientFood = ref(null);
const editingFoodId = ref(null);
const activeTab = ref('macros');
const offQuery = ref('');

const emptyFoodObj = {
  name: '', brand: '', category: 'autre',
  energy_kcal_100g: 0, proteins_g_100g: 0, carbohydrates_g_100g: 0, sugars_g_100g: 0,
  fat_g_100g: 0, saturated_fat_g_100g: 0, monounsaturated_fat_g_100g: 0, polyunsaturated_fat_g_100g: 0,
  omega_3_g_100g: 0, omega_6_g_100g: 0, trans_fat_g_100g: 0, cholesterol_mg_100g: 0,
  fiber_g_100g: 0, salt_g_100g: 0, sodium_mg_100g: 0,
  calcium_mg_100g: 0, iron_mg_100g: 0, magnesium_mg_100g: 0, phosphorus_mg_100g: 0,
  potassium_mg_100g: 0, zinc_mg_100g: 0, copper_mg_100g: 0, manganese_mg_100g: 0,
  selenium_mcg_100g: 0, iodine_mcg_100g: 0,
  vit_a_mcg_100g: 0, vit_d_mcg_100g: 0, vit_e_mg_100g: 0, vit_k_mcg_100g: 0, vit_c_mg_100g: 0,
  vit_b1_mg_100g: 0, vit_b2_mg_100g: 0, vit_b3_mg_100g: 0, vit_b5_mg_100g: 0, vit_b6_mg_100g: 0,
  vit_b9_mcg_100g: 0, vit_b12_mcg_100g: 0, water_g_100g: 0, alcohol_g_100g: 0
};

const foodForm = ref({ ...emptyFoodObj });

const openAddModal = () => {
  editingFoodId.value = null;
  activeTab.value = 'macros';
  foodForm.value = { ...emptyFoodObj };
  showFoodFormModal.value = true;
};

const openNutrientModal = (food) => {
  selectedNutrientFood.value = food;
  showNutrientModal.value = true;
};

const openEditModal = (food) => {
  editingFoodId.value = food.id;
  activeTab.value = 'macros';
  foodForm.value = { ...emptyFoodObj, ...food };
  showFoodFormModal.value = true;
};

const handleOffSearch = async () => {
  if (!offQuery.value) return;
  if (/^\d{8,14}$/.test(offQuery.value.trim())) {
    const single = await foodsStore.fetchByBarcode(offQuery.value.trim());
    foodsStore.offSearchResults = single ? [single] : [];
  } else {
    await foodsStore.searchOpenFoodFacts(offQuery.value);
  }
};

const importOffItem = async (item) => {
  await foodsStore.createFood(item);
  showOffModal.value = false;
};

const submitFoodForm = async () => {
  if (editingFoodId.value) {
    await foodsStore.updateFood(editingFoodId.value, foodForm.value);
  } else {
    await foodsStore.createFood(foodForm.value);
  }
  showFoodFormModal.value = false;
};

onMounted(() => {
  foodsStore.fetchFoods();
});
</script>

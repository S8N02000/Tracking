<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-white flex items-center gap-2">
          <BookOpen class="w-6 h-6 text-cyan-400" />
          Gestionnaire & Carnet de Recettes
        </h2>
        <p class="text-xs text-slate-400">Création, évaluation sur 10, filtrage par note et calcul automatique par portion</p>
      </div>

      <button
        v-if="authStore.isAuthenticated"
        @click="openCreateModal"
        class="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20"
      >
        <Plus class="w-4 h-4" />
        <span>Créer une recette</span>
      </button>
    </div>

    <!-- Filters & Search Bar -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <!-- Search Input -->
      <div class="relative sm:col-span-1">
        <Search class="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
        <input
          v-model="recipesStore.searchQuery"
          @input="recipesStore.fetchRecipes()"
          type="text"
          placeholder="Rechercher une recette..."
          class="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500 font-sans"
        />
      </div>

      <!-- Rating Filter -->
      <div class="flex items-center space-x-2">
        <label class="text-xs font-mono text-slate-400">Note min. :</label>
        <select
          v-model="recipesStore.minRating"
          @change="recipesStore.fetchRecipes()"
          class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
        >
          <option value="">Toutes les notes</option>
          <option value="9">⭐ 9/10 et + (Excellents)</option>
          <option value="8">⭐ 8/10 et + (Très bons)</option>
          <option value="7">⭐ 7/10 et + (Bons)</option>
          <option value="5">⭐ 5/10 et + (Passables)</option>
        </select>
      </div>

      <!-- Sort By -->
      <div class="flex items-center space-x-2">
        <label class="text-xs font-mono text-slate-400">Trier par :</label>
        <select
          v-model="recipesStore.sortBy"
          @change="recipesStore.fetchRecipes()"
          class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
        >
          <option value="rating_desc">⭐ Note (Plus élevée)</option>
          <option value="name">🔤 Nom (A-Z)</option>
          <option value="kcal_asc">⚡ Kcal (Croissant)</option>
          <option value="kcal_desc">⚡ Kcal (Décroissant)</option>
        </select>
      </div>
    </div>

    <!-- Recipes Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="recipe in recipesStore.recipes"
        :key="recipe.id"
        class="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
      >
        <div>
          <div class="flex items-center justify-between">
            <!-- Rating Badge -->
            <div class="flex items-center space-x-1">
              <span
                v-if="recipe.rating !== null && recipe.rating !== undefined"
                class="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30"
              >
                <Star class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{{ recipe.rating }}/10</span>
              </span>
              <span v-else class="text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded bg-slate-800">
                Non noté
              </span>
            </div>

            <div v-if="authStore.isAuthenticated" class="flex items-center space-x-2">
              <button
                @click="openEditModal(recipe)"
                class="text-slate-400 hover:text-cyan-400 transition"
                title="Éditer la recette"
              >
                <Edit class="w-4 h-4" />
              </button>
              <button
                @click="recipesStore.deleteRecipe(recipe.id)"
                class="text-slate-500 hover:text-rose-400 transition"
                title="Supprimer la recette"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class="mt-3">
            <h3 class="text-lg font-bold text-white">{{ recipe.name }}</h3>
            <span class="text-[11px] font-mono text-cyan-400 block mt-0.5">
              {{ recipe.portions }} portions • {{ recipe.total_weight_g }} g au total
            </span>
          </div>

          <p v-if="recipe.description" class="text-xs text-slate-400 mt-2 whitespace-pre-wrap break-words line-clamp-3">{{ recipe.description }}</p>

          <div class="mt-4 pt-3 border-t border-slate-800/80">
            <h4 class="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Ingrédients :</h4>
            <ul class="text-xs text-slate-400 space-y-1 font-mono">
              <li v-for="(ing, idx) in recipe.ingredients" :key="idx" class="flex justify-between">
                <span>• {{ ing.food_name }}</span>
                <span class="text-slate-300 font-bold">{{ ing.quantity_g }} g</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="bg-slate-900/90 p-3 rounded-xl border border-slate-800 grid grid-cols-3 gap-2 text-center font-mono text-xs">
          <div>
            <span class="block text-[10px] text-slate-500 uppercase">Kcal/port.</span>
            <span class="font-bold text-cyan-300">{{ recipe.energy_kcal_per_portion }}</span>
          </div>
          <div>
            <span class="block text-[10px] text-slate-500 uppercase">Prot.</span>
            <span class="font-bold text-rose-300">{{ recipe.proteins_g_per_portion }}g</span>
          </div>
          <div>
            <span class="block text-[10px] text-slate-500 uppercase">Gluc.</span>
            <span class="font-bold text-amber-300">{{ recipe.carbohydrates_g_per_portion }}g</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit Recipe Modal -->
    <div v-if="showRecipeModal" class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div class="glass-panel max-w-2xl w-full rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-white flex items-center justify-between">
          <span>{{ editingRecipeId ? 'Éditer la Recette #' + editingRecipeId : 'Créer une Nouvelle Recette' }}</span>
          <span v-if="recipeForm.rating !== null && recipeForm.rating !== ''" class="text-xs font-mono text-amber-300 flex items-center gap-1">
            <Star class="w-4 h-4 fill-amber-400 text-amber-400" /> {{ recipeForm.rating }}/10
          </span>
        </h3>

        <form @submit.prevent="submitRecipe">
          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="sm:col-span-2">
                <label class="block text-xs text-slate-400 mb-1">Nom de la recette *</label>
                <input v-model="recipeForm.name" type="text" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" required />
              </div>
              <div>
                <label class="block text-xs text-slate-400 mb-1">Portions *</label>
                <input v-model.number="recipeForm.portions" type="number" min="1" step="1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" required />
              </div>
            </div>

            <!-- Rating 0 to 10 Input -->
            <div class="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Star class="w-4 h-4 text-amber-400 fill-amber-400" />
                  Note de la Recette (sur 10) :
                </label>
                <span class="text-xs font-mono font-bold text-amber-400">
                  {{ recipeForm.rating !== null && recipeForm.rating !== '' ? recipeForm.rating + ' / 10' : 'Sans note' }}
                </span>
              </div>
              <div class="flex items-center space-x-3">
                <input
                  v-model.number="recipeForm.rating"
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  class="flex-1 accent-amber-400 bg-slate-800 rounded-lg cursor-pointer"
                />
                <input
                  v-model.number="recipeForm.rating"
                  type="number"
                  min="0"
                  max="10"
                  step="any"
                  placeholder="Ex: 8.5"
                  class="w-20 px-2 py-1 text-center rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs text-slate-400 mb-1">Description / Appréciation</label>
              <textarea
                v-model="recipeForm.description"
                rows="3"
                placeholder="Notes, instructions de préparation, appréciations..."
                class="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500 font-sans"
              ></textarea>
            </div>

            <!-- Ingredients Builder -->
            <div class="space-y-2">
              <label class="block text-xs font-semibold text-slate-300">Ingrédients de la recette :</label>

              <div v-for="(ing, idx) in ingredientRows" :key="idx" class="flex items-center space-x-2">
                <select v-model="ing.food_id" class="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs" required>
                  <option :value="null">Choisir un aliment...</option>
                  <option v-for="f in foodsStore.foods" :key="f.id" :value="f.id">{{ f.name }} ({{ f.energy_kcal_100g }} kcal/100g)</option>
                </select>

                <!-- 🌟 FIXED: step="any" allows decimal weights like 73.3g or 12.5g without browser HTML validation popup errors -->
                <input
                  v-model.number="ing.quantity_g"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Poids (g)"
                  class="w-28 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                  required
                />

                <button type="button" @click="ingredientRows.splice(idx, 1)" class="text-slate-500 hover:text-rose-400 p-2">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>

              <button type="button" @click="addIngredientRow" class="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold pt-2">
                <Plus class="w-3.5 h-3.5" /> Ajouter un ingrédient
              </button>
            </div>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button type="button" @click="showRecipeModal = false" class="px-4 py-2 rounded-xl text-sm text-slate-400">Annuler</button>
            <button type="submit" class="px-5 py-2 rounded-xl text-sm font-semibold bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20">
              {{ editingRecipeId ? 'Mettre à jour la Recette' : 'Calculer & Enregistrer Recette' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRecipesStore } from '@/stores/recipesStore.js';
import { useFoodsStore } from '@/stores/foodsStore.js';
import { useAuthStore } from '@/stores/authStore.js';
import { BookOpen, Plus, Trash2, Edit, Star, Search } from 'lucide-vue-next';

const recipesStore = useRecipesStore();
const foodsStore = useFoodsStore();
const authStore = useAuthStore();

const showRecipeModal = ref(false);
const editingRecipeId = ref(null);

const recipeForm = ref({
  name: '',
  description: '',
  rating: 8.5,
  portions: 4
});

const ingredientRows = ref([
  { food_id: null, quantity_g: 100 }
]);

const openCreateModal = () => {
  editingRecipeId.value = null;
  recipeForm.value = { name: '', description: '', rating: 8, portions: 4 };
  ingredientRows.value = [{ food_id: null, quantity_g: 100 }];
  showRecipeModal.value = true;
};

const openEditModal = (recipe) => {
  editingRecipeId.value = recipe.id;
  recipeForm.value = {
    name: recipe.name,
    description: recipe.description || '',
    rating: recipe.rating !== undefined ? recipe.rating : 8,
    portions: recipe.portions
  };
  ingredientRows.value = recipe.ingredients.map(ing => ({
    food_id: ing.food_id,
    quantity_g: ing.quantity_g
  }));
  showRecipeModal.value = true;
};

const addIngredientRow = () => {
  ingredientRows.value.push({ food_id: null, quantity_g: 100 });
};

const submitRecipe = async () => {
  if (editingRecipeId.value) {
    await recipesStore.updateRecipe(editingRecipeId.value, recipeForm.value, ingredientRows.value);
  } else {
    await recipesStore.createRecipe(recipeForm.value, ingredientRows.value);
  }
  showRecipeModal.value = false;
};

onMounted(() => {
  recipesStore.fetchRecipes();
  foodsStore.fetchFoods();
});
</script>

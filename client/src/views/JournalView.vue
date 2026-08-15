<template>
  <div class="space-y-6">
    <!-- Date picker & Top Bar -->
    <div class="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-white flex items-center gap-2">
          <Calendar class="w-6 h-6 text-cyan-400" />
          Journal de la Journée
        </h2>
        <p class="text-xs text-slate-400">Saisie des repas et activités sportives pour la date sélectionnée</p>
      </div>

      <div class="flex items-center space-x-3">
        <label class="text-xs font-mono text-slate-400">Date :</label>
        <input
          v-model="logsStore.selectedDate"
          @change="onDateInputChange"
          type="date"
          class="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
        />
      </div>
    </div>

    <!-- Main Grid: Meals & Sports -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Meals List (2 cols) -->
      <div class="lg:col-span-2 space-y-6">
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <UtensilsCrossed class="w-5 h-5 text-cyan-400" />
              Repas Enregistrés
            </h3>

            <button
              v-if="authStore.isAuthenticated"
              @click="showAddMealModal = true"
              class="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20"
            >
              <Plus class="w-4 h-4" />
              <span>Ajouter un repas</span>
            </button>
          </div>

          <div v-if="logsStore.meals.length === 0" class="py-12 text-center text-slate-500 text-sm">
            Aucun repas enregistré pour le {{ logsStore.selectedDate }}.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="meal in logsStore.meals"
              :key="meal.id"
              class="flex items-center justify-between p-4 rounded-xl bg-slate-900/80 border border-slate-800"
            >
              <div>
                <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 uppercase tracking-wider mr-2">
                  {{ meal.period }}
                </span>
                <span class="font-semibold text-white">
                  {{ meal.food_name || meal.recipe_name }}
                </span>
                <span class="text-xs text-slate-400 ml-2 font-mono">
                  ({{ meal.quantity_g }} g)
                </span>
              </div>

              <div class="flex items-center space-x-4 font-mono text-xs">
                <span class="text-cyan-300 font-bold">
                  {{ calculateMealKcal(meal) }} kcal
                </span>
                <button
                  v-if="authStore.isAuthenticated"
                  @click="logsStore.deleteMeal(meal.id)"
                  class="text-slate-500 hover:text-rose-400 transition"
                  title="Supprimer"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sports Column (1 col) -->
      <div class="space-y-6">
        <!-- Sports Section -->
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <Activity class="w-5 h-5 text-emerald-400" />
              Activités Sportives
            </h3>

            <button
              v-if="authStore.isAuthenticated"
              @click="showAddSportModal = true"
              class="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
            >
              <Plus class="w-4 h-4" />
              <span>Saisir sport</span>
            </button>
          </div>

          <div v-if="logsStore.sports.length === 0" class="py-8 text-center text-slate-500 text-sm">
            Aucune séance enregistrée.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="sport in logsStore.sports"
              :key="sport.id"
              class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono"
            >
              <div>
                <span class="font-bold text-white uppercase block">{{ sport.sport_type }}</span>
                <span class="text-slate-400">{{ sport.duration_min }} min <span v-if="sport.kcal_burned">• {{ sport.kcal_burned }} kcal</span></span>
              </div>
              <button
                v-if="authStore.isAuthenticated"
                @click="logsStore.deleteSport(sport.id)"
                class="text-slate-500 hover:text-rose-400"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Add Meal -->
    <div v-if="showAddMealModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="glass-panel max-w-lg w-full rounded-2xl p-6 border border-slate-800 shadow-2xl">
        <h3 class="text-lg font-bold text-white mb-4">Ajouter un repas au journal</h3>

        <form @submit.prevent="submitMeal">
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Période du repas</label>
              <select v-model="newMeal.period" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm">
                <option value="petit_dejeuner">Petit Déjeuner</option>
                <option value="dejeuner">Déjeuner</option>
                <option value="diner">Dîner</option>
                <option value="collation">Collation</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Type d'élément</label>
              <div class="flex space-x-4 mb-2 text-xs">
                <label class="flex items-center space-x-2 text-slate-300">
                  <input type="radio" value="food" v-model="itemType" />
                  <span>Aliment brut</span>
                </label>
                <label class="flex items-center space-x-2 text-slate-300">
                  <input type="radio" value="recipe" v-model="itemType" />
                  <span>Recette</span>
                </label>
              </div>

              <select v-if="itemType === 'food'" v-model="newMeal.food_id" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" required>
                <option :value="null">Sélectionnez un aliment...</option>
                <option v-for="f in foodsStore.foods" :key="f.id" :value="f.id">{{ f.name }} ({{ f.energy_kcal_100g || 0 }} kcal/100g)</option>
              </select>

              <select v-else v-model="newMeal.recipe_id" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" required>
                <option :value="null">Sélectionnez une recette...</option>
                <option v-for="r in recipesStore.recipes" :key="r.id" :value="r.id">{{ r.name }} ({{ r.portions }} portions - {{ r.total_weight_g }}g)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Quantité (g)</label>
              <input v-model.number="newMeal.quantity_g" type="number" step="any" min="0" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" required />
            </div>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button type="button" @click="showAddMealModal = false" class="px-4 py-2 rounded-xl text-sm font-medium text-slate-400">Annuler</button>
            <button type="submit" class="px-5 py-2 rounded-xl text-sm font-semibold bg-cyan-500 text-slate-950">Enregistrer Repas</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Add Sport -->
    <div v-if="showAddSportModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="glass-panel max-w-lg w-full rounded-2xl p-6 border border-slate-800 shadow-2xl">
        <h3 class="text-lg font-bold text-white mb-4">Saisir une activité sportive</h3>

        <form @submit.prevent="submitSport">
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Discipline</label>
              <select v-model="newSport.sport_type" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm">
                <option value="tapis_roulant">Tapis roulant</option>
                <option value="velo">Vélo</option>
                <option value="pied">Marche / Course à pied</option>
                <option value="natation">Natation</option>
                <option value="musculation">Musculation</option>
                <option value="jardin">Jardinage</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-slate-400 mb-1">Durée (minutes)</label>
                <input v-model.number="newSport.duration_min" type="number" min="1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" required />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-400 mb-1">Calories brûlées (kcal)</label>
                <input v-model.number="newSport.kcal_burned" type="number" min="0" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono" />
              </div>
            </div>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button type="button" @click="showAddSportModal = false" class="px-4 py-2 rounded-xl text-sm font-medium text-slate-400">Annuler</button>
            <button type="submit" class="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-slate-950">Enregistrer Sport</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLogsStore } from '@/stores/logsStore.js';
import { useFoodsStore } from '@/stores/foodsStore.js';
import { useRecipesStore } from '@/stores/recipesStore.js';
import { useAuthStore } from '@/stores/authStore.js';
import { Calendar, UtensilsCrossed, Activity, Plus, Trash2 } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const logsStore = useLogsStore();
const foodsStore = useFoodsStore();
const recipesStore = useRecipesStore();
const authStore = useAuthStore();

const showAddMealModal = ref(false);
const showAddSportModal = ref(false);
const itemType = ref('food');

const newMeal = ref({
  period: 'dejeuner',
  food_id: null,
  recipe_id: null,
  quantity_g: 100
});

const newSport = ref({
  sport_type: 'tapis_roulant',
  duration_min: 30,
  kcal_burned: 250
});

const calculateMealKcal = (meal) => {
  if (meal.food_id) {
    return Math.round((meal.quantity_g / 100) * (meal.energy_kcal_100g || 0));
  } else if (meal.recipe_id && meal.recipe_total_weight > 0) {
    const singlePortionWeight = meal.recipe_total_weight / meal.recipe_portions;
    return Math.round((meal.quantity_g / singlePortionWeight) * (meal.energy_kcal_per_portion || 0));
  }
  return 0;
};

const onDateInputChange = () => {
  router.push({ query: { ...route.query, date: logsStore.selectedDate } });
  logsStore.fetchLogsForDate();
};

const submitMeal = async () => {
  if (itemType.value === 'food') newMeal.value.recipe_id = null;
  else newMeal.value.food_id = null;

  await logsStore.addMeal(newMeal.value);
  showAddMealModal.value = false;
};

const submitSport = async () => {
  await logsStore.addSport(newSport.value);
  showAddSportModal.value = false;
};

// Check query param ?date=YYYY-MM-DD on mount or change
onMounted(() => {
  if (route.query.date && /^\d{4}-\d{2}-\d{2}$/.test(route.query.date)) {
    logsStore.selectedDate = route.query.date;
  }
  logsStore.fetchLogsForDate();
  foodsStore.fetchFoods();
  recipesStore.fetchRecipes();
});

watch(() => route.query.date, (newDate) => {
  if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
    logsStore.selectedDate = newDate;
    logsStore.fetchLogsForDate();
  }
});
</script>

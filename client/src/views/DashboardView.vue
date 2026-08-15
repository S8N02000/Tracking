<template>
  <div class="space-y-6">
    <!-- Header Bar & Period Controls -->
    <div class="glass-panel p-4 lg:p-6 rounded-2xl border border-slate-800 space-y-4">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard class="w-6 h-6 text-cyan-400" />
            Matrice du Tableau de Bord
          </h2>
          <p class="text-xs text-slate-400">Vue consolidée temps-réel de l'apport énergétique, du bilan et des 35 nutriments</p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <!-- View Toggle Mode: Synthétique vs Complète 35 Nutriments -->
          <div class="flex items-center space-x-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              @click="fullViewMode = false"
              class="px-3 py-1.5 rounded-lg transition"
              :class="!fullViewMode ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'"
            >
              Vue Principale (14 cols)
            </button>
            <button
              @click="fullViewMode = true"
              class="px-3 py-1.5 rounded-lg transition"
              :class="fullViewMode ? 'bg-amber-400 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'"
            >
              Vue Complète (35 Nutriments)
            </button>
          </div>

          <!-- Quick Period Selectors -->
          <div class="flex items-center space-x-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
            <button
              @click="store.setQuickPeriod(0)"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition"
              :class="store.periodType === 0 ? 'bg-cyan-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-white'"
            >
              Aujourd'hui
            </button>
            <button
              @click="store.setQuickPeriod(7)"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition"
              :class="store.periodType === 7 ? 'bg-cyan-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-white'"
            >
              7 Jours
            </button>
            <button
              @click="store.setQuickPeriod(30)"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition"
              :class="store.periodType === 30 ? 'bg-cyan-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-white'"
            >
              30 Jours
            </button>
            <button
              @click="store.setQuickPeriod(90)"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition"
              :class="store.periodType === 90 ? 'bg-cyan-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-white'"
            >
              90 Jours
            </button>
          </div>
        </div>
      </div>

      <!-- Sliding Window Controls & Range Display -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-3 border-t border-slate-800/80 gap-3 text-xs font-mono">
        <div class="flex items-center space-x-2">
          <button
            @click="store.shiftPeriod(-1)"
            class="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition"
            title="Période précédente"
          >
            <ChevronLeft class="w-4 h-4" />
            <span class="hidden sm:inline">Précédent</span>
          </button>

          <button
            @click="store.shiftPeriod(1)"
            class="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition"
            title="Période suivante"
          >
            <span class="hidden sm:inline">Suivant</span>
            <ChevronRight class="w-4 h-4" />
          </button>

          <button
            @click="store.resetToCurrent()"
            class="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-cyan-400 transition"
            title="Revenir à aujourd'hui"
          >
            <RotateCcw class="w-3.5 h-3.5" />
          </button>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-3">
          <span class="text-slate-400">
            Du <strong class="text-white">{{ store.startDate }}</strong> au <strong class="text-white">{{ store.endDate }}</strong>
            ({{ store.queryInfo?.days_count || 0 }} jours)
          </span>

          <span v-if="store.queryInfo" class="text-emerald-400 flex items-center gap-1">
            <Zap class="w-3.5 h-3.5" /> {{ store.queryInfo.execution_time_ms }} ms
          </span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="store.loading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div>
    </div>

    <!-- High-Density Matrix Table -->
    <div v-else class="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs font-mono whitespace-nowrap">
          <thead class="bg-slate-900/95 text-slate-300 border-b border-slate-800 uppercase tracking-wider sticky top-0 z-20">
            <tr>
              <th class="py-3.5 px-4 sticky left-0 bg-slate-900 z-30 shadow-md">Date</th>
              <th class="py-3.5 px-3 text-cyan-400">Apport Kcal</th>
              <th class="py-3.5 px-3 text-slate-400">BMR</th>
              <th class="py-3.5 px-3 text-emerald-400">Sport Kcal</th>
              <th class="py-3.5 px-3 text-amber-400">Dépense Totale</th>
              <th class="py-3.5 px-3 font-semibold">Bilan Net</th>
              <th class="py-3.5 px-3 text-indigo-400">Poids (kg)</th>

              <!-- Core Macros -->
              <th class="py-3.5 px-3 text-rose-400">Protéines (g)</th>
              <th class="py-3.5 px-3 text-amber-300">Glucides (g)</th>
              <th class="py-3.5 px-3 text-amber-500">Sucres (g)</th>
              <th class="py-3.5 px-3 text-emerald-300">Fibres (g)</th>
              <th class="py-3.5 px-3 text-yellow-400">Lipides (g)</th>
              <th class="py-3.5 px-3 text-yellow-600">Sat. (g)</th>
              <th class="py-3.5 px-3 text-slate-400">Sel (g)</th>

              <!-- Extended 35-Nutrient Columns (v1.2 Full View Mode) -->
              <template v-if="fullViewMode">
                <th class="py-3.5 px-3 text-yellow-500">Mono-Insat (g)</th>
                <th class="py-3.5 px-3 text-yellow-500">Poly-Insat (g)</th>
                <th class="py-3.5 px-3 text-emerald-400">Oméga-3 (g)</th>
                <th class="py-3.5 px-3 text-emerald-400">Oméga-6 (g)</th>
                <th class="py-3.5 px-3 text-rose-500">Trans (g)</th>
                <th class="py-3.5 px-3 text-amber-600">Cholestérol (mg)</th>
                <th class="py-3.5 px-3 text-slate-300">Sodium (mg)</th>
                <th class="py-3.5 px-3 text-cyan-300">Calcium (mg)</th>
                <th class="py-3.5 px-3 text-rose-300">Fer (mg)</th>
                <th class="py-3.5 px-3 text-emerald-300">Magnésium (mg)</th>
                <th class="py-3.5 px-3 text-purple-300">Phosphore (mg)</th>
                <th class="py-3.5 px-3 text-indigo-300">Potassium (mg)</th>
                <th class="py-3.5 px-3 text-teal-300">Zinc (mg)</th>
                <th class="py-3.5 px-3 text-amber-400">Cuivre (mg)</th>
                <th class="py-3.5 px-3 text-amber-400">Manganèse (mg)</th>
                <th class="py-3.5 px-3 text-emerald-400">Sélénium (µg)</th>
                <th class="py-3.5 px-3 text-cyan-400">Iode (µg)</th>
                <th class="py-3.5 px-3 text-amber-300">Vit A (µg)</th>
                <th class="py-3.5 px-3 text-amber-300">Vit D (µg)</th>
                <th class="py-3.5 px-3 text-amber-300">Vit E (mg)</th>
                <th class="py-3.5 px-3 text-amber-300">Vit K (µg)</th>
                <th class="py-3.5 px-3 text-amber-300">Vit C (mg)</th>
                <th class="py-3.5 px-3 text-amber-300">Vit B1 (mg)</th>
                <th class="py-3.5 px-3 text-amber-300">Vit B2 (mg)</th>
                <th class="py-3.5 px-3 text-amber-300">Vit B3 (mg)</th>
                <th class="py-3.5 px-3 text-amber-300">Vit B5 (mg)</th>
                <th class="py-3.5 px-3 text-amber-300">Vit B6 (mg)</th>
                <th class="py-3.5 px-3 text-amber-300">Vit B9 (µg)</th>
                <th class="py-3.5 px-3 text-amber-300">Vit B12 (µg)</th>
                <th class="py-3.5 px-3 text-cyan-300">Eau (g)</th>
                <th class="py-3.5 px-3 text-rose-400">Alcool (g)</th>
              </template>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-800/60">
            <tr v-for="row in store.rows" :key="row.date" class="hover:bg-slate-800/50 transition">
              <td class="py-3 px-4 font-bold text-white sticky left-0 bg-slate-950 z-10 border-r border-slate-800/80 shadow">
                <router-link :to="`/logs?date=${row.date}`" class="hover:text-cyan-400 underline decoration-cyan-500/30">
                  {{ row.date }}
                </router-link>
              </td>

              <td class="py-3 px-3 text-cyan-300 font-semibold">{{ row.kcal_in }}</td>
              <td class="py-3 px-3 text-slate-400">{{ row.bmr_kcal }}</td>
              <td class="py-3 px-3 text-emerald-400">
                <span v-if="row.kcal_sport > 0" class="flex items-center gap-1">+{{ row.kcal_sport }}</span>
                <span v-else class="text-slate-600">-</span>
              </td>
              <td class="py-3 px-3 text-amber-400 font-semibold">{{ row.total_kcal_expended }}</td>

              <td class="py-3 px-3 font-bold">
                <span
                  class="px-2 py-0.5 rounded-full text-[11px]"
                  :class="row.net_balance <= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'"
                >
                  {{ row.net_balance > 0 ? '+' + row.net_balance : row.net_balance }} kcal
                </span>
              </td>

              <td class="py-3 px-3 text-indigo-300 font-semibold">
                <span v-if="row.scan && row.scan.weight_kg">
                  {{ row.scan.weight_kg }}
                  <span v-if="row.scan.is_inherited" class="text-[10px] text-slate-500" title="Reporté">(rep.)</span>
                </span>
                <span v-else class="text-slate-600">-</span>
              </td>

              <td class="py-3 px-3 text-rose-300">{{ row.proteins_g }} <span class="text-[10px] text-slate-500">({{ row.targets.proteins_pct }}%)</span></td>
              <td class="py-3 px-3 text-amber-200">{{ row.carbs_g }} <span class="text-[10px] text-slate-500">({{ row.targets.carbs_pct }}%)</span></td>
              <td class="py-3 px-3 text-amber-400">{{ row.sugars_g }}</td>
              <td class="py-3 px-3 text-emerald-300">{{ row.fiber_g }} <span class="text-[10px] text-slate-500">({{ row.targets.fiber_pct }}%)</span></td>
              <td class="py-3 px-3 text-yellow-300">{{ row.fat_g }} <span class="text-[10px] text-slate-500">({{ row.targets.fat_pct }}%)</span></td>
              <td class="py-3 px-3 text-yellow-500">{{ row.saturated_fat_g }}</td>
              <td class="py-3 px-3 text-slate-400">{{ row.salt_g }}</td>

              <!-- Extended 35-Nutrient Values -->
              <template v-if="fullViewMode">
                <td class="py-3 px-3 text-yellow-400">{{ row.monounsaturated_fat_g }}</td>
                <td class="py-3 px-3 text-yellow-400">{{ row.polyunsaturated_fat_g }}</td>
                <td class="py-3 px-3 text-emerald-300 font-semibold">{{ row.omega_3_g }}</td>
                <td class="py-3 px-3 text-emerald-300">{{ row.omega_6_g }}</td>
                <td class="py-3 px-3 text-rose-400">{{ row.trans_fat_g }}</td>
                <td class="py-3 px-3 text-amber-500">{{ row.cholesterol_mg }}</td>
                <td class="py-3 px-3 text-slate-300">{{ row.micros.sodium_mg }}</td>
                <td class="py-3 px-3 text-cyan-300">{{ row.micros.calcium_mg }}</td>
                <td class="py-3 px-3 text-rose-300">{{ row.micros.iron_mg }}</td>
                <td class="py-3 px-3 text-emerald-300">{{ row.micros.magnesium_mg }}</td>
                <td class="py-3 px-3 text-purple-300">{{ row.micros.phosphorus_mg }}</td>
                <td class="py-3 px-3 text-indigo-300">{{ row.micros.potassium_mg }}</td>
                <td class="py-3 px-3 text-teal-300">{{ row.micros.zinc_mg }}</td>
                <td class="py-3 px-3 text-amber-300">{{ row.micros.copper_mg }}</td>
                <td class="py-3 px-3 text-amber-300">{{ row.micros.manganese_mg }}</td>
                <td class="py-3 px-3 text-emerald-300">{{ row.micros.selenium_mcg }}</td>
                <td class="py-3 px-3 text-cyan-300">{{ row.micros.iodine_mcg }}</td>
                <td class="py-3 px-3 text-amber-200">{{ row.micros.vit_a_mcg }}</td>
                <td class="py-3 px-3 text-amber-200">{{ row.micros.vit_d_mcg }}</td>
                <td class="py-3 px-3 text-amber-200">{{ row.micros.vit_e_mg }}</td>
                <td class="py-3 px-3 text-amber-200">{{ row.micros.vit_k_mcg }}</td>
                <td class="py-3 px-3 text-amber-200">{{ row.micros.vit_c_mg }}</td>
                <td class="py-3 px-3 text-amber-200">{{ row.micros.vit_b1_mg }}</td>
                <td class="py-3 px-3 text-amber-200">{{ row.micros.vit_b2_mg }}</td>
                <td class="py-3 px-3 text-amber-200">{{ row.micros.vit_b3_mg }}</td>
                <td class="py-3 px-3 text-amber-200">{{ row.micros.vit_b5_mg }}</td>
                <td class="py-3 px-3 text-amber-200">{{ row.micros.vit_b6_mg }}</td>
                <td class="py-3 px-3 text-amber-200">{{ row.micros.vit_b9_mcg }}</td>
                <td class="py-3 px-3 text-amber-200">{{ row.micros.vit_b12_mcg }}</td>
                <td class="py-3 px-3 text-cyan-300">{{ row.micros.water_g }}</td>
                <td class="py-3 px-3 text-rose-300">{{ row.micros.alcohol_g }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useDashboardStore } from '@/stores/dashboardStore.js';
import { LayoutDashboard, Zap, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-vue-next';

const store = useDashboardStore();
const fullViewMode = ref(false);

onMounted(() => {
  store.fetchDashboard();
});
</script>

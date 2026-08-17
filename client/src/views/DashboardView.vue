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
              <th class="py-3.5 px-4 sticky left-0 bg-slate-900 z-30 shadow-md">
                <span class="flex items-center gap-1">
                  Date
                  <button
                    class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('date')"
                  >i</button>
                </span>
                <div
                  v-if="activeTooltip === 'date'"
                  class="absolute top-full left-0 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none"
                >
                  <div class="font-bold text-cyan-400 mb-0.5">Date</div>
                  Jour de l'enregistrement. Clique pour ouvrir le journal.
                  <div class="absolute top-0 left-4 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>
              <th class="relative py-3.5 px-3 text-cyan-400">
                <span class="flex items-center gap-1">
                  Apport Kcal
                  <button
                    class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('kcal_in')"
                  >i</button>
                </span>
                <div
                  v-if="activeTooltip === 'kcal_in'"
                  class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none"
                >
                  <div class="font-bold text-cyan-400 mb-0.5">Apport Kcal</div>
                  Total kcal ingérées sur la journée.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>
              <th class="relative py-3.5 px-3 text-slate-400">
                <span class="flex items-center gap-1">
                  BMR
                  <button
                    class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('bmr')"
                  >i</button>
                </span>
                <div
                  v-if="activeTooltip === 'bmr'"
                  class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none"
                >
                  <div class="font-bold text-cyan-400 mb-0.5">BMR</div>
                  Métabolisme de base — calories brûlées au repos.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>
              <th class="relative py-3.5 px-3 text-emerald-400">
                <span class="flex items-center gap-1">
                  Sport Kcal
                  <button
                    class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('kcal_sport')"
                  >i</button>
                </span>
                <div
                  v-if="activeTooltip === 'kcal_sport'"
                  class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none"
                >
                  <div class="font-bold text-cyan-400 mb-0.5">Sport Kcal</div>
                  Calories brûlées pendant l'exercice.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>
              <th class="relative py-3.5 px-3 text-amber-400">
                <span class="flex items-center gap-1">
                  Dépense
                  <button
                    class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('kcal_out')"
                  >i</button>
                </span>
                <div
                  v-if="activeTooltip === 'kcal_out'"
                  class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none"
                >
                  <div class="font-bold text-cyan-400 mb-0.5">Dépense Totale</div>
                  BMR + sport combinés.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>
              <th class="relative py-3.5 px-3 font-semibold">
                <span class="flex items-center gap-1">
                  Bilan
                  <button
                    class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('bilan')"
                  >i</button>
                </span>
                <div
                  v-if="activeTooltip === 'bilan'"
                  class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none"
                >
                  <div class="font-bold text-cyan-400 mb-0.5">Bilan Net</div>
                  Apport − Dépense. Vert = déficit (perte), Rouge = excédent.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>
              <th class="relative py-3.5 px-3 text-indigo-400">
                <span class="flex items-center gap-1">
                  Poids
                  <button
                    class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('poids')"
                  >i</button>
                </span>
                <div
                  v-if="activeTooltip === 'poids'"
                  class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none"
                >
                  <div class="font-bold text-cyan-400 mb-0.5">Poids (kg)</div>
                  Poids Boditrax du jour. (rep.) = reporté si non pesé.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Core Macros -->
              <th class="relative py-3.5 px-3 text-rose-400">
                <span class="flex items-center gap-1">
                  Protéines
                  <button
                    class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('P')"
                  >i</button>
                </span>
                <div
                  v-if="activeTooltip === 'P'"
                  class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none"
                >
                  <div class="font-bold text-cyan-400 mb-0.5">Protéines</div>
                  Construction musculaire. Cible ~150g/jour.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>
              <th class="relative py-3.5 px-3 text-amber-300">
                <span class="flex items-center gap-1">
                  Glucides
                  <button
                    class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('G')"
                  >i</button>
                </span>
                <div
                  v-if="activeTooltip === 'G'"
                  class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none"
                >
                  <div class="font-bold text-cyan-400 mb-0.5">Glucides</div>
                  Énergie principale. Sucre + amidon + fibres.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>
              <th class="relative py-3.5 px-3 text-amber-500">
                <span class="flex items-center gap-1">
                  Sucres
                  <button
                    class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('sucres')"
                  >i</button>
                </span>
                <div
                  v-if="activeTooltip === 'sucres'"
                  class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none"
                >
                  <div class="font-bold text-cyan-400 mb-0.5">Sucres</div>
                  Glucides simples. Viser &lt; 50g/jour.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>
              <th class="relative py-3.5 px-3 text-emerald-300">
                <span class="flex items-center gap-1">
                  Fibres
                  <button
                    class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('fibres')"
                  >i</button>
                </span>
                <div
                  v-if="activeTooltip === 'fibres'"
                  class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none"
                >
                  <div class="font-bold text-cyan-400 mb-0.5">Fibres</div>
                  Digestion, satiété. Cible ~30g/jour.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>
              <th class="relative py-3.5 px-3 text-yellow-400">
                <span class="flex items-center gap-1">
                  Lipides
                  <button
                    class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('L')"
                  >i</button>
                </span>
                <div
                  v-if="activeTooltip === 'L'"
                  class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none"
                >
                  <div class="font-bold text-cyan-400 mb-0.5">Lipides</div>
                  Graisses totales. 1g = 9kcal. Vise ~70g/jour.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>
              <th class="relative py-3.5 px-3 text-yellow-600">
                <span class="flex items-center gap-1">
                  Sat.
                  <button
                    class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('AGS')"
                  >i</button>
                </span>
                <div
                  v-if="activeTooltip === 'AGS'"
                  class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none"
                >
                  <div class="font-bold text-cyan-400 mb-0.5">Acides Gras Saturés</div>
                  Graisses solides. Viser &lt; 22g/jour.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>
              <th class="relative py-3.5 px-3 text-slate-400">
                <span class="flex items-center gap-1">
                  Sel
                  <button
                    class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('sel')"
                  >i</button>
                </span>
                <div
                  v-if="activeTooltip === 'sel'"
                  class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none"
                >
                  <div class="font-bold text-cyan-400 mb-0.5">Sel</div>
                  Sodium. Viser &lt; 6g/jour.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Extended 35-Nutrient Columns (v1.2 Full View Mode) -->
              <template v-if="fullViewMode">
                <th class="relative py-3.5 px-3 text-yellow-500">
                  <span class="flex items-center gap-1">
                    Mono-Insat
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('mono')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'mono'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Mono-Insaturés</div>Gras insaturés protect. Huile olive, avocat.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-yellow-500">
                  <span class="flex items-center gap-1">
                    Poly-Insat
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('poly')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'poly'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Poly-Insaturés</div>Inclut ω3 et ω6. Noix, poissons.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-emerald-400">
                  <span class="flex items-center gap-1">
                    ω3
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('omega3')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'omega3'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Oméga-3</div>Anti-inflammatoire, cerveau. Poisson, noix.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-emerald-400">
                  <span class="flex items-center gap-1">
                    ω6
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('omega6')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'omega6'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Oméga-6</div>Équilibre inflammatoire. Tournesol, noix.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-rose-500">
                  <span class="flex items-center gap-1">
                    Trans
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('trans')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'trans'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Graisses Trans</div>Industrielles — à éviter. &lt; 2g/jour.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-amber-600">
                  <span class="flex items-center gap-1">
                    Chol.
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('chol')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'chol'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Cholestérol</div>À limiter. VNR 300mg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-slate-300">
                  <span class="flex items-center gap-1">
                    Sodium
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('sodium')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'sodium'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Sodium</div>Sel sous forme minérale. VNR &lt; 2000mg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-cyan-300">
                  <span class="flex items-center gap-1">
                    Ca
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('Ca')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'Ca'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Calcium</div>Os, dents. VNR 1000mg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-rose-300">
                  <span class="flex items-center gap-1">
                    Fe
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('Fe')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'Fe'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Fer</div>Transport oxygène. VNR 11mg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-emerald-300">
                  <span class="flex items-center gap-1">
                    Mg
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('Mg')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'Mg'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Magnésium</div>Muscles, nerves. VNR 400mg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-purple-300">
                  <span class="flex items-center gap-1">
                    P
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('Pmin')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'Pmin'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Phosphore</div>Os, énergie. VNR 700mg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-indigo-300">
                  <span class="flex items-center gap-1">
                    K
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('K')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'K'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Potassium</div>Équilibre hydrique. VNR 4700mg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-teal-300">
                  <span class="flex items-center gap-1">
                    Zn
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('Zn')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'Zn'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Zinc</div>Immunité. VNR 11mg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-amber-300">
                  <span class="flex items-center gap-1">
                    Cuivre
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('cuivre')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'cuivre'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Cuivre</div>Absorption fer. VNR 1mg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-amber-300">
                  <span class="flex items-center gap-1">
                    Mn
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('manganese')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'manganese'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Manganèse</div>Métabolisme. VNR 2mg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-emerald-300">
                  <span class="flex items-center gap-1">
                    Se
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('selenium')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'selenium'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Sélénium</div>Thyroïde. VNR 55µg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-cyan-300">
                  <span class="flex items-center gap-1">
                    Iode
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('iode')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'iode'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Iode</div>Thyroïde. VNR 150µg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-amber-200">
                  <span class="flex items-center gap-1">
                    Vit A
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('vitA')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'vitA'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Vitamine A</div>Vue, peau. VNR 800µg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-amber-200">
                  <span class="flex items-center gap-1">
                    Vit D
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('vitD')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'vitD'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Vitamine D</div>Os, calcium. VNR 15µg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-amber-200">
                  <span class="flex items-center gap-1">
                    Vit E
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('vitE')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'vitE'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Vitamine E</div>Anti-oxydant. VNR 12mg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-amber-200">
                  <span class="flex items-center gap-1">
                    Vit K
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('vitK')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'vitK'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Vitamine K</div>Coagulation. VNR 75µg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-amber-200">
                  <span class="flex items-center gap-1">
                    Vit C
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('vitC')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'vitC'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Vitamine C</div>Immunité. VNR 80mg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-amber-200">
                  <span class="flex items-center gap-1">
                    B1
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('B1')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'B1'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Vit. B1</div>Énergie. VNR 1.1mg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-amber-200">
                  <span class="flex items-center gap-1">
                    B2
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('B2')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'B2'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Vit. B2</div>Globules rouges. VNR 1.4mg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-amber-200">
                  <span class="flex items-center gap-1">
                    B3
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('B3')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'B3'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Vit. B3</div>Énergie, peau. VNR 16mg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-amber-200">
                  <span class="flex items-center gap-1">
                    B5
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('B5')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'B5'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Vit. B5</div>Stress. VNR 6mg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-amber-200">
                  <span class="flex items-center gap-1">
                    B6
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('B6')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'B6'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Vit. B6</div>Acides aminés. VNR 1.4mg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-amber-200">
                  <span class="flex items-center gap-1">
                    B9
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('B9')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'B9'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Vit. B9</div>Division cellulaire. VNR 330µg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-amber-200">
                  <span class="flex items-center gap-1">
                    B12
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('B12')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'B12'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Vit. B12</div>Système nerveux. VNR 2.5µg.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-cyan-300">
                  <span class="flex items-center gap-1">
                    Eau
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('eau')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'eau'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Eau</div>Hydratation. Cible ~2L/jour.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-rose-300">
                  <span class="flex items-center gap-1">
                    Alcool
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('alcool')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'alcool'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Alcool</div>À limiter. 7kcal/g, vide nutritionnel.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
                <th class="relative py-3.5 px-3 text-orange-400">
                  <span class="flex items-center gap-1">
                    Caféine
                    <button class="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition" @click.stop="toggleTooltip('cafeine')">i</button>
                  </span>
                  <div v-if="activeTooltip === 'cafeine'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                    <div class="font-bold text-cyan-400 mb-0.5">Caféine</div>Stimulant. VNR 400mg. Yangæ 106mg/500mL.
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                  </div>
                </th>
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
                <td class="py-3 px-3 text-orange-400 font-semibold">{{ row.micros.caffeine_mg }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useDashboardStore } from '@/stores/dashboardStore.js';
import { LayoutDashboard, Zap, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-vue-next';

const store = useDashboardStore();
const fullViewMode = ref(false);
const activeTooltip = ref(null);

function toggleTooltip(col) {
  activeTooltip.value = activeTooltip.value === col ? null : col;
}

function handleClickOutside(e) {
  if (activeTooltip.value && !e.target.closest('th')) {
    activeTooltip.value = null;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  store.fetchDashboard();
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

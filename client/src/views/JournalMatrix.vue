<template>
  <div class="space-y-3">

    <!-- Summary Bar -->
    <div class="glass-panel p-3 rounded-2xl border border-slate-800 grid grid-cols-2 md:grid-cols-5 gap-2">
      <div class="text-center">
        <div class="text-[10px] text-slate-500 font-mono uppercase">kcal</div>
        <div class="text-lg font-bold text-cyan-400 font-mono">{{ totals.kcal }}</div>
      </div>
      <div class="text-center">
        <div class="text-[10px] text-slate-500 font-mono uppercase">Protéines</div>
        <div class="text-lg font-bold text-cyan-400 font-mono">{{ totals.P }}g</div>
      </div>
      <div class="text-center">
        <div class="text-[10px] text-slate-500 font-mono uppercase">Glucides</div>
        <div class="text-lg font-bold text-cyan-400 font-mono">{{ totals.G }}g</div>
      </div>
      <div class="text-center">
        <div class="text-[10px] text-slate-500 font-mono uppercase">Lipides</div>
        <div class="text-lg font-bold text-cyan-400 font-mono">{{ totals.L }}g</div>
      </div>
      <div class="text-center">
        <div class="text-[10px] text-slate-500 font-mono uppercase">Sport</div>
        <div class="text-lg font-bold text-emerald-400 font-mono">{{ sportKcal }}</div>
      </div>
    </div>

    <!-- Date + Add -->
    <div class="glass-panel p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
      <h2 class="text-sm font-bold text-white flex items-center gap-1.5">
        <Calendar class="w-4 h-4 text-cyan-400" />
        Journal Matrix
      </h2>
      <div class="flex items-center gap-2">
        <input
          v-model="logsStore.selectedDate"
          @change="onDateInputChange"
          type="date"
          class="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs w-32 focus:outline-none focus:border-cyan-500"
        />
        <button
          v-if="authStore.isAuthenticated"
          @click="showAddMealModal = true"
          class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Ajouter</span>
        </button>
      </div>
    </div>

    <!-- Sport -->
    <div v-if="logsStore.sports.length > 0" class="glass-panel p-3 rounded-2xl border border-slate-800">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <Activity class="w-3.5 h-3.5 text-emerald-400" />
          <span class="text-xs font-bold text-white">Séances</span>
        </div>
        <button
          v-if="authStore.isAuthenticated"
          @click="showAddSportModal = true"
          class="text-[10px] text-emerald-400 hover:text-emerald-300"
        >
          + Ajouter
        </button>
      </div>
      <div class="mt-1.5 flex flex-wrap gap-2">
        <div
          v-for="sport in logsStore.sports"
          :key="sport.id"
          class="flex items-center gap-1.5 text-[10px] font-mono"
        >
          <span class="text-white font-semibold uppercase">{{ sport.sport_type }}</span>
          <span class="text-slate-500">{{ sport.duration_min }}min</span>
          <span class="text-emerald-400">{{ sport.kcal_burned }}kcal</span>
          <button
            v-if="authStore.isAuthenticated"
            @click="logsStore.deleteSport(sport.id)"
            class="text-slate-600 hover:text-rose-400"
          >
            <Trash2 class="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Matrix Table — exactly matching Dashboard column names & order -->
    <div class="glass-panel rounded-2xl border border-slate-800 overflow-x-auto">
      <div class="overflow-x-auto">
        <table class="w-full text-[11px] font-mono">
          <thead>
            <tr class="border-b border-slate-700">

              <!-- Date / Aliment -->
              <th class="text-left px-2 py-2 text-slate-400 font-semibold uppercase tracking-wider sticky left-0 bg-slate-900 z-10 min-w-[120px]">
                Aliment
              </th>

              <!-- Période -->
              <th class="relative text-center px-1 py-2 text-slate-400 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[44px]"
                  @click="toggleSort('period')">
                <span class="flex items-center justify-center gap-0.5">
                  P {{ sortIndicator('period') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('period')">i</button>
                </span>
                <div v-if="activeTooltip === 'period'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Période</div>Moment du repas : matin, midi, soir ou collation.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- qté -->
              <th class="relative text-center px-1 py-2 text-slate-400 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('quantity_g')">
                <span class="flex items-center justify-center gap-0.5">
                  qté {{ sortIndicator('quantity_g') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('qty')">i</button>
                </span>
                <div v-if="activeTooltip === 'qty'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Quantité</div>Poids en grammes de l'aliment.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- kcal -->
              <th class="relative text-center px-1 py-2 text-cyan-400 font-semibold uppercase tracking-wider cursor-pointer hover:text-white select-none min-w-[50px]"
                  @click="toggleSort('kcal')">
                <span class="flex items-center justify-center gap-0.5">
                  kcal {{ sortIndicator('kcal') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('kcal')">i</button>
                </span>
                <div v-if="activeTooltip === 'kcal'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Apport Kcal</div>Énergie total. 1g lipides = 9kcal, 1g protéines/glucides = 4kcal.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Protéines -->
              <th class="relative text-center px-1 py-2 text-rose-400 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('P')">
                <span class="flex items-center justify-center gap-0.5">
                  Protéines {{ sortIndicator('P') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('P')">i</button>
                </span>
                <div v-if="activeTooltip === 'P'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Protéines</div>Construction musculaire. Cible ~150g/jour.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Glucides -->
              <th class="relative text-center px-1 py-2 text-amber-300 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('G')">
                <span class="flex items-center justify-center gap-0.5">
                  Glucides {{ sortIndicator('G') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('G')">i</button>
                </span>
                <div v-if="activeTooltip === 'G'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Glucides</div>Énergie principale. Sucre + amidon + fibres.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Sucres -->
              <th class="relative text-center px-1 py-2 text-amber-500 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('sucres')">
                <span class="flex items-center justify-center gap-0.5">
                  Sucres {{ sortIndicator('sucres') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('sucres')">i</button>
                </span>
                <div v-if="activeTooltip === 'sucres'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Sucres</div>Glucides simples. Viser &lt; 50g/jour.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Fibres -->
              <th class="relative text-center px-1 py-2 text-emerald-300 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('fibres')">
                <span class="flex items-center justify-center gap-0.5">
                  Fibres {{ sortIndicator('fibres') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('fibres')">i</button>
                </span>
                <div v-if="activeTooltip === 'fibres'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Fibres</div>Digestion, satiété. Cible ~30g/jour.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Lipides -->
              <th class="relative text-center px-1 py-2 text-yellow-400 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('L')">
                <span class="flex items-center justify-center gap-0.5">
                  Lipides {{ sortIndicator('L') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('L')">i</button>
                </span>
                <div v-if="activeTooltip === 'L'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Lipides</div>Graisses totales. 1g = 9kcal. Vise ~70g/jour.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Sat. -->
              <th class="relative text-center px-1 py-2 text-yellow-600 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('AGS')">
                <span class="flex items-center justify-center gap-0.5">
                  Sat. {{ sortIndicator('AGS') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('AGS')">i</button>
                </span>
                <div v-if="activeTooltip === 'AGS'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Acides Gras Saturés</div>Graisses solides. Viser &lt; 22g/jour.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Sel -->
              <th class="relative text-center px-1 py-2 text-slate-400 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('sel')">
                <span class="flex items-center justify-center gap-0.5">
                  Sel {{ sortIndicator('sel') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('sel')">i</button>
                </span>
                <div v-if="activeTooltip === 'sel'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Sel</div>Sodium. Viser &lt; 6g/jour.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Mono-Insat -->
              <th class="relative text-center px-1 py-2 text-yellow-500 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('mono')">
                <span class="flex items-center justify-center gap-0.5">
                  Mono-Insat {{ sortIndicator('mono') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('mono')">i</button>
                </span>
                <div v-if="activeTooltip === 'mono'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Mono-Insaturés</div>Gras insaturés protect. Huile olive, avocat.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Poly-Insat -->
              <th class="relative text-center px-1 py-2 text-yellow-500 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('poly')">
                <span class="flex items-center justify-center gap-0.5">
                  Poly-Insat {{ sortIndicator('poly') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('poly')">i</button>
                </span>
                <div v-if="activeTooltip === 'poly'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Poly-Insaturés</div>Inclut ω3 et ω6. Noix, poissons.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- ω3 -->
              <th class="relative text-center px-1 py-2 text-emerald-400 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('omega3')">
                <span class="flex items-center justify-center gap-0.5">
                  ω3 {{ sortIndicator('omega3') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('omega3')">i</button>
                </span>
                <div v-if="activeTooltip === 'omega3'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Oméga-3</div>Anti-inflammatoire, cerveau. Poisson, noix.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- ω6 -->
              <th class="relative text-center px-1 py-2 text-emerald-400 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('omega6')">
                <span class="flex items-center justify-center gap-0.5">
                  ω6 {{ sortIndicator('omega6') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('omega6')">i</button>
                </span>
                <div v-if="activeTooltip === 'omega6'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Oméga-6</div>Équilibre inflammatoire. Tournesol, noix.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Trans -->
              <th class="relative text-center px-1 py-2 text-rose-500 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('trans')">
                <span class="flex items-center justify-center gap-0.5">
                  Trans {{ sortIndicator('trans') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('trans')">i</button>
                </span>
                <div v-if="activeTooltip === 'trans'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Graisses Trans</div>Industrielles — à éviter. &lt; 2g/jour.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Chol. -->
              <th class="relative text-center px-1 py-2 text-amber-600 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('chol')">
                <span class="flex items-center justify-center gap-0.5">
                  Chol. {{ sortIndicator('chol') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('chol')">i</button>
                </span>
                <div v-if="activeTooltip === 'chol'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Cholestérol</div>À limiter. VNR 300mg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Sodium -->
              <th class="relative text-center px-1 py-2 text-slate-300 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('sodium')">
                <span class="flex items-center justify-center gap-0.5">
                  Sodium {{ sortIndicator('sodium') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('sodium')">i</button>
                </span>
                <div v-if="activeTooltip === 'sodium'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Sodium</div>Sel sous forme minérale. VNR &lt; 2000mg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Ca -->
              <th class="relative text-center px-1 py-2 text-cyan-300 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('Ca')">
                <span class="flex items-center justify-center gap-0.5">
                  Ca {{ sortIndicator('Ca') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('Ca')">i</button>
                </span>
                <div v-if="activeTooltip === 'Ca'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Calcium</div>Os, dents. VNR 1000mg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Fe -->
              <th class="relative text-center px-1 py-2 text-rose-300 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('Fe')">
                <span class="flex items-center justify-center gap-0.5">
                  Fe {{ sortIndicator('Fe') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('Fe')">i</button>
                </span>
                <div v-if="activeTooltip === 'Fe'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Fer</div>Transport oxygène. VNR 11mg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Mg -->
              <th class="relative text-center px-1 py-2 text-emerald-300 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('Mg')">
                <span class="flex items-center justify-center gap-0.5">
                  Mg {{ sortIndicator('Mg') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('Mg')">i</button>
                </span>
                <div v-if="activeTooltip === 'Mg'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Magnésium</div>Muscles, nerves. VNR 400mg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- P (Phosphore) -->
              <th class="relative text-center px-1 py-2 text-purple-300 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('Pmin')">
                <span class="flex items-center justify-center gap-0.5">
                  P {{ sortIndicator('Pmin') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('Pmin')">i</button>
                </span>
                <div v-if="activeTooltip === 'Pmin'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Phosphore</div>Os, énergie. VNR 700mg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- K -->
              <th class="relative text-center px-1 py-2 text-indigo-300 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('K')">
                <span class="flex items-center justify-center gap-0.5">
                  K {{ sortIndicator('K') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('K')">i</button>
                </span>
                <div v-if="activeTooltip === 'K'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Potassium</div>Équilibre hydrique. VNR 4700mg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Zn -->
              <th class="relative text-center px-1 py-2 text-teal-300 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('Zn')">
                <span class="flex items-center justify-center gap-0.5">
                  Zn {{ sortIndicator('Zn') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('Zn')">i</button>
                </span>
                <div v-if="activeTooltip === 'Zn'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Zinc</div>Immunité. VNR 11mg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Cuivre -->
              <th class="relative text-center px-1 py-2 text-amber-300 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('cuivre')">
                <span class="flex items-center justify-center gap-0.5">
                  Cuivre {{ sortIndicator('cuivre') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('cuivre')">i</button>
                </span>
                <div v-if="activeTooltip === 'cuivre'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Cuivre</div>Absorption fer. VNR 1mg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Mn -->
              <th class="relative text-center px-1 py-2 text-amber-300 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('manganese')">
                <span class="flex items-center justify-center gap-0.5">
                  Mn {{ sortIndicator('manganese') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('manganese')">i</button>
                </span>
                <div v-if="activeTooltip === 'manganese'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Manganèse</div>Métabolisme. VNR 2mg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Se -->
              <th class="relative text-center px-1 py-2 text-emerald-300 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('selenium')">
                <span class="flex items-center justify-center gap-0.5">
                  Se {{ sortIndicator('selenium') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('selenium')">i</button>
                </span>
                <div v-if="activeTooltip === 'selenium'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Sélénium</div>Thyroïde. VNR 55µg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Iode -->
              <th class="relative text-center px-1 py-2 text-cyan-300 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('iode')">
                <span class="flex items-center justify-center gap-0.5">
                  Iode {{ sortIndicator('iode') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('iode')">i</button>
                </span>
                <div v-if="activeTooltip === 'iode'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Iode</div>Thyroïde. VNR 150µg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Vit A -->
              <th class="relative text-center px-1 py-2 text-amber-200 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('vitA')">
                <span class="flex items-center justify-center gap-0.5">
                  Vit A {{ sortIndicator('vitA') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('vitA')">i</button>
                </span>
                <div v-if="activeTooltip === 'vitA'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Vitamine A</div>Vue, peau. VNR 800µg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Vit D -->
              <th class="relative text-center px-1 py-2 text-amber-200 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('vitD')">
                <span class="flex items-center justify-center gap-0.5">
                  Vit D {{ sortIndicator('vitD') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('vitD')">i</button>
                </span>
                <div v-if="activeTooltip === 'vitD'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Vitamine D</div>Os, calcium. VNR 15µg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Vit E -->
              <th class="relative text-center px-1 py-2 text-amber-200 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('vitE')">
                <span class="flex items-center justify-center gap-0.5">
                  Vit E {{ sortIndicator('vitE') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('vitE')">i</button>
                </span>
                <div v-if="activeTooltip === 'vitE'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Vitamine E</div>Anti-oxydant. VNR 12mg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Vit K -->
              <th class="relative text-center px-1 py-2 text-amber-200 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('vitK')">
                <span class="flex items-center justify-center gap-0.5">
                  Vit K {{ sortIndicator('vitK') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('vitK')">i</button>
                </span>
                <div v-if="activeTooltip === 'vitK'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Vitamine K</div>Coagulation. VNR 75µg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Vit C -->
              <th class="relative text-center px-1 py-2 text-amber-200 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('vitC')">
                <span class="flex items-center justify-center gap-0.5">
                  Vit C {{ sortIndicator('vitC') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('vitC')">i</button>
                </span>
                <div v-if="activeTooltip === 'vitC'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Vitamine C</div>Immunité. VNR 80mg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- B1 -->
              <th class="relative text-center px-1 py-2 text-amber-200 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('B1')">
                <span class="flex items-center justify-center gap-0.5">
                  B1 {{ sortIndicator('B1') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('B1')">i</button>
                </span>
                <div v-if="activeTooltip === 'B1'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Vit. B1</div>Énergie. VNR 1.1mg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- B2 -->
              <th class="relative text-center px-1 py-2 text-amber-200 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('B2')">
                <span class="flex items-center justify-center gap-0.5">
                  B2 {{ sortIndicator('B2') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('B2')">i</button>
                </span>
                <div v-if="activeTooltip === 'B2'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Vit. B2</div>Globules rouges. VNR 1.4mg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- B3 -->
              <th class="relative text-center px-1 py-2 text-amber-200 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('B3')">
                <span class="flex items-center justify-center gap-0.5">
                  B3 {{ sortIndicator('B3') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('B3')">i</button>
                </span>
                <div v-if="activeTooltip === 'B3'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Vit. B3</div>Énergie, peau. VNR 16mg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- B5 -->
              <th class="relative text-center px-1 py-2 text-amber-200 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('B5')">
                <span class="flex items-center justify-center gap-0.5">
                  B5 {{ sortIndicator('B5') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('B5')">i</button>
                </span>
                <div v-if="activeTooltip === 'B5'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Vit. B5</div>Stress. VNR 6mg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- B6 -->
              <th class="relative text-center px-1 py-2 text-amber-200 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('B6')">
                <span class="flex items-center justify-center gap-0.5">
                  B6 {{ sortIndicator('B6') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('B6')">i</button>
                </span>
                <div v-if="activeTooltip === 'B6'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Vit. B6</div>Acides aminés. VNR 1.4mg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- B9 -->
              <th class="relative text-center px-1 py-2 text-amber-200 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('B9')">
                <span class="flex items-center justify-center gap-0.5">
                  B9 {{ sortIndicator('B9') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('B9')">i</button>
                </span>
                <div v-if="activeTooltip === 'B9'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Vit. B9</div>Division cellulaire. VNR 330µg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- B12 -->
              <th class="relative text-center px-1 py-2 text-amber-200 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('B12')">
                <span class="flex items-center justify-center gap-0.5">
                  B12 {{ sortIndicator('B12') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('B12')">i</button>
                </span>
                <div v-if="activeTooltip === 'B12'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Vit. B12</div>Système nerveux. VNR 2.5µg.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <!-- Caféine -->
              <th class="relative text-center px-1 py-2 text-orange-400 font-semibold uppercase tracking-wider cursor-pointer hover:text-cyan-400 select-none min-w-[40px]"
                  @click="toggleSort('cafeine')">
                <span class="flex items-center justify-center gap-0.5">
                  Caféine {{ sortIndicator('cafeine') }}
                  <button class="w-3.5 h-3.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-bold leading-none flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition"
                    @click.stop="toggleTooltip('cafeine')">i</button>
                </span>
                <div v-if="activeTooltip === 'cafeine'" class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl pointer-events-none">
                  <div class="font-bold text-cyan-400 mb-0.5">Caféine</div>Stimulant. VNR 400mg. Yangæ 106mg/500mL.
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                </div>
              </th>

              <th v-if="authStore.isAuthenticated" class="px-1 py-2 min-w-[28px]" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in sortedRows"
              :key="row.id"
              class="border-b border-slate-800 hover:bg-slate-800/40"
            >
              <td class="px-2 py-1.5 text-white font-semibold sticky left-0 bg-slate-900 z-10">
                <div class="truncate max-w-[120px]">{{ row.name }}</div>
                <div class="text-slate-600 font-normal text-[9px] truncate">{{ row.category }}</div>
              </td>
              <td class="text-center px-1 py-1.5">
                <span class="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-800 text-cyan-400">{{ row.period_short }}</span>
              </td>
              <td class="text-center px-1 py-1.5 text-slate-400">{{ row.quantity_g }}</td>
              <td class="text-center px-1 py-1.5 text-cyan-300 font-bold">{{ row.kcal }}</td>
              <td class="text-center px-1 py-1.5 text-rose-300">{{ row.P }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200">{{ row.G }}</td>
              <td class="text-center px-1 py-1.5 text-amber-400">{{ row.sucres }}</td>
              <td class="text-center px-1 py-1.5 text-emerald-300">{{ row.fibres }}</td>
              <td class="text-center px-1 py-1.5 text-yellow-300">{{ row.L }}</td>
              <td class="text-center px-1 py-1.5 text-yellow-500">{{ row.AGS }}</td>
              <td class="text-center px-1 py-1.5 text-slate-400">{{ row.sel }}</td>
              <td class="text-center px-1 py-1.5 text-yellow-400">{{ row.mono }}</td>
              <td class="text-center px-1 py-1.5 text-yellow-400">{{ row.poly }}</td>
              <td class="text-center px-1 py-1.5 text-emerald-300">{{ row.omega3 }}</td>
              <td class="text-center px-1 py-1.5 text-emerald-300">{{ row.omega6 }}</td>
              <td class="text-center px-1 py-1.5 text-rose-400">{{ row.trans }}</td>
              <td class="text-center px-1 py-1.5 text-amber-500">{{ row.chol }}</td>
              <td class="text-center px-1 py-1.5 text-slate-300">{{ row.sodium }}</td>
              <td class="text-center px-1 py-1.5 text-cyan-300">{{ row.Ca }}</td>
              <td class="text-center px-1 py-1.5 text-rose-300">{{ row.Fe }}</td>
              <td class="text-center px-1 py-1.5 text-emerald-300">{{ row.Mg }}</td>
              <td class="text-center px-1 py-1.5 text-purple-300">{{ row.Pmin }}</td>
              <td class="text-center px-1 py-1.5 text-indigo-300">{{ row.K }}</td>
              <td class="text-center px-1 py-1.5 text-teal-300">{{ row.Zn }}</td>
              <td class="text-center px-1 py-1.5 text-amber-300">{{ row.cuivre }}</td>
              <td class="text-center px-1 py-1.5 text-amber-300">{{ row.manganese }}</td>
              <td class="text-center px-1 py-1.5 text-emerald-300">{{ row.selenium }}</td>
              <td class="text-center px-1 py-1.5 text-cyan-300">{{ row.iode }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200">{{ row.vitA }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200">{{ row.vitD }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200">{{ row.vitE }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200">{{ row.vitK }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200">{{ row.vitC }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200">{{ row.B1 }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200">{{ row.B2 }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200">{{ row.B3 }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200">{{ row.B5 }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200">{{ row.B6 }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200">{{ row.B9 }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200">{{ row.B12 }}</td>
              <td class="text-center px-1 py-1.5 text-orange-400 font-semibold">{{ row.cafeine }}</td>
              <td v-if="authStore.isAuthenticated" class="px-1 py-1.5">
                <button @click="logsStore.deleteMeal(row.id)" class="text-slate-600 hover:text-rose-400 transition">
                  <Trash2 class="w-3 h-3" />
                </button>
              </td>
            </tr>
          </tbody>
          <!-- Totals -->
          <tfoot>
            <tr class="border-t-2 border-slate-600 bg-slate-900/95">
              <td class="px-2 py-1.5 font-bold text-white sticky left-0 bg-slate-900 z-10 text-xs">TOTAL</td>
              <td class="text-center px-1 py-1.5" />
              <td class="text-center px-1 py-1.5 text-slate-300 font-semibold text-[11px]">{{ totalsAll.qty }}</td>
              <td class="text-center px-1 py-1.5 text-cyan-400 font-bold text-[11px]">{{ totalsAll.kcal }}</td>
              <td class="text-center px-1 py-1.5 text-rose-300 font-bold text-[11px]">{{ totalsAll.P }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200 font-bold text-[11px]">{{ totalsAll.G }}</td>
              <td class="text-center px-1 py-1.5 text-amber-400 font-semibold text-[11px]">{{ totalsAll.sucres }}</td>
              <td class="text-center px-1 py-1.5 text-emerald-300 font-semibold text-[11px]">{{ totalsAll.fibres }}</td>
              <td class="text-center px-1 py-1.5 text-yellow-300 font-bold text-[11px]">{{ totalsAll.L }}</td>
              <td class="text-center px-1 py-1.5 text-yellow-500 font-semibold text-[11px]">{{ totalsAll.AGS }}</td>
              <td class="text-center px-1 py-1.5 text-slate-300 font-semibold text-[11px]">{{ totalsAll.sel }}</td>
              <td class="text-center px-1 py-1.5 text-yellow-400 font-semibold text-[11px]">{{ totalsAll.mono }}</td>
              <td class="text-center px-1 py-1.5 text-yellow-400 font-semibold text-[11px]">{{ totalsAll.poly }}</td>
              <td class="text-center px-1 py-1.5 text-emerald-300 font-semibold text-[11px]">{{ totalsAll.omega3 }}</td>
              <td class="text-center px-1 py-1.5 text-emerald-300 font-semibold text-[11px]">{{ totalsAll.omega6 }}</td>
              <td class="text-center px-1 py-1.5 text-rose-400 font-semibold text-[11px]">{{ totalsAll.trans }}</td>
              <td class="text-center px-1 py-1.5 text-amber-500 font-semibold text-[11px]">{{ totalsAll.chol }}</td>
              <td class="text-center px-1 py-1.5 text-slate-300 font-semibold text-[11px]">{{ totalsAll.sodium }}</td>
              <td class="text-center px-1 py-1.5 text-cyan-300 font-semibold text-[11px]">{{ totalsAll.Ca }}</td>
              <td class="text-center px-1 py-1.5 text-rose-300 font-semibold text-[11px]">{{ totalsAll.Fe }}</td>
              <td class="text-center px-1 py-1.5 text-emerald-300 font-semibold text-[11px]">{{ totalsAll.Mg }}</td>
              <td class="text-center px-1 py-1.5 text-purple-300 font-semibold text-[11px]">{{ totalsAll.Pmin }}</td>
              <td class="text-center px-1 py-1.5 text-indigo-300 font-semibold text-[11px]">{{ totalsAll.K }}</td>
              <td class="text-center px-1 py-1.5 text-teal-300 font-semibold text-[11px]">{{ totalsAll.Zn }}</td>
              <td class="text-center px-1 py-1.5 text-amber-300 font-semibold text-[11px]">{{ totalsAll.cuivre }}</td>
              <td class="text-center px-1 py-1.5 text-amber-300 font-semibold text-[11px]">{{ totalsAll.manganese }}</td>
              <td class="text-center px-1 py-1.5 text-emerald-300 font-semibold text-[11px]">{{ totalsAll.selenium }}</td>
              <td class="text-center px-1 py-1.5 text-cyan-300 font-semibold text-[11px]">{{ totalsAll.iode }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200 font-semibold text-[11px]">{{ totalsAll.vitA }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200 font-semibold text-[11px]">{{ totalsAll.vitD }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200 font-semibold text-[11px]">{{ totalsAll.vitE }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200 font-semibold text-[11px]">{{ totalsAll.vitK }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200 font-semibold text-[11px]">{{ totalsAll.vitC }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200 font-semibold text-[11px]">{{ totalsAll.B1 }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200 font-semibold text-[11px]">{{ totalsAll.B2 }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200 font-semibold text-[11px]">{{ totalsAll.B3 }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200 font-semibold text-[11px]">{{ totalsAll.B5 }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200 font-semibold text-[11px]">{{ totalsAll.B6 }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200 font-semibold text-[11px]">{{ totalsAll.B9 }}</td>
              <td class="text-center px-1 py-1.5 text-amber-200 font-semibold text-[11px]">{{ totalsAll.B12 }}</td>
              <td class="text-center px-1 py-1.5 text-orange-400 font-bold text-[11px]">{{ totalsAll.cafeine }}</td>
              <td v-if="authStore.isAuthenticated" />
            </tr>
          </tfoot>
        </table>
      </div>

      <div v-if="logsStore.meals.length === 0" class="py-8 text-center text-slate-600 text-xs">
        Aucun repas enregistré.
      </div>
    </div>

    <!-- Modal Add Meal -->
    <div v-if="showAddMealModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="glass-panel max-w-md w-full rounded-2xl p-5 border border-slate-800 shadow-2xl">
        <h3 class="text-base font-bold text-white mb-4">Ajouter un repas</h3>
        <form @submit.prevent="submitMeal">
          <div class="space-y-3">
            <div>
              <label class="block text-[11px] font-medium text-slate-400 mb-1">Période</label>
              <select v-model="newMeal.period" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs">
                <option value="petit_dejeuner">Petit Déjeuner</option>
                <option value="dejeuner">Déjeuner</option>
                <option value="diner">Dîner</option>
                <option value="collation">Collation</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-medium text-slate-400 mb-1">Type</label>
              <div class="flex space-x-4 mb-2 text-xs">
                <label class="flex items-center space-x-1.5 text-slate-300">
                  <input type="radio" value="food" v-model="itemType" />
                  <span>Aliment</span>
                </label>
                <label class="flex items-center space-x-1.5 text-slate-300">
                  <input type="radio" value="recipe" v-model="itemType" />
                  <span>Recette</span>
                </label>
              </div>
              <select v-if="itemType === 'food'" v-model="newMeal.food_id" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs" required>
                <option :value="null">Sélectionnez...</option>
                <option v-for="f in foodsStore.foods" :key="f.id" :value="f.id">{{ f.name }}</option>
              </select>
              <select v-else v-model="newMeal.recipe_id" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs" required>
                <option :value="null">Sélectionnez...</option>
                <option v-for="r in recipesStore.recipes" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-medium text-slate-400 mb-1">Quantité (g)</label>
              <input v-model.number="newMeal.quantity_g" type="number" step="any" min="0" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono" required />
            </div>
          </div>
          <div class="flex justify-end space-x-3 mt-5">
            <button type="button" @click="showAddMealModal = false" class="px-4 py-2 rounded-xl text-xs font-medium text-slate-400">Annuler</button>
            <button type="submit" class="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 text-slate-950">Ajouter</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Add Sport -->
    <div v-if="showAddSportModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="glass-panel max-w-md w-full rounded-2xl p-5 border border-slate-800 shadow-2xl">
        <h3 class="text-base font-bold text-white mb-4">Ajouter du sport</h3>
        <form @submit.prevent="submitSport">
          <div class="space-y-3">
            <div>
              <label class="block text-[11px] font-medium text-slate-400 mb-1">Discipline</label>
              <select v-model="newSport.sport_type" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs">
                <option value="tapis_roulant">Tapis roulant</option>
                <option value="velo">Vélo</option>
                <option value="pied">Marche / Course</option>
                <option value="natation">Natation</option>
                <option value="musculation">Musculation</option>
                <option value="jardin">Jardinage</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-medium text-slate-400 mb-1">Durée (min)</label>
                <input v-model.number="newSport.duration_min" type="number" min="1" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono" required />
              </div>
              <div>
                <label class="block text-[11px] font-medium text-slate-400 mb-1">kcal brûlées</label>
                <input v-model.number="newSport.kcal_burned" type="number" min="0" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono" />
              </div>
            </div>
          </div>
          <div class="flex justify-end space-x-3 mt-5">
            <button type="button" @click="showAddSportModal = false" class="px-4 py-2 rounded-xl text-xs font-medium text-slate-400">Annuler</button>
            <button type="submit" class="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950">Ajouter</button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLogsStore } from '@/stores/logsStore.js';
import { useFoodsStore } from '@/stores/foodsStore.js';
import { useRecipesStore } from '@/stores/recipesStore.js';
import { useAuthStore } from '@/stores/authStore.js';
import { Calendar, Activity, Plus, Trash2 } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const logsStore = useLogsStore();
const foodsStore = useFoodsStore();
const recipesStore = useRecipesStore();
const authStore = useAuthStore();

const showAddMealModal = ref(false);
const showAddSportModal = ref(false);
const itemType = ref('food');
const activeTooltip = ref(null);

function toggleTooltip(col) {
  activeTooltip.value = activeTooltip.value === col ? null : col;
}

function handleClickOutside(e) {
  if (activeTooltip.value && !e.target.closest('th')) {
    activeTooltip.value = null;
  }
}

const newMeal = ref({ period: 'dejeuner', food_id: null, recipe_id: null, quantity_g: 100 });
const newSport = ref({ sport_type: 'tapis_roulant', duration_min: 30, kcal_burned: 250 });

const sortKey = ref(null);
const sortCol = ref(null);

const PERIOD_SHORT = {
  petit_dejeuner: 'matin',
  dejeuner: 'midi',
  diner: 'soir',
  collation: 'col'
};

// Column order matching Dashboard exactly
const DISPLAY_COLS = [
  'kcal', 'P', 'G', 'sucres', 'fibres', 'L', 'AGS', 'sel',
  'mono', 'poly', 'omega3', 'omega6', 'trans', 'chol', 'sodium',
  'Ca', 'Fe', 'Mg', 'Pmin', 'K', 'Zn', 'cuivre', 'manganese', 'selenium', 'iode',
  'vitA', 'vitD', 'vitE', 'vitK', 'vitC', 'B1', 'B2', 'B3', 'B5', 'B6', 'B9', 'B12',
  'cafeine'
];

function calcNutr(meal, col) {
  if (!meal) return 0;
  const qty = meal.quantity_g || 0;
  if (meal.food_id) {
    const f = meal;
    const base = qty / 100;
    switch (col) {
      case 'kcal':    return +(base * (f.energy_kcal_100g || 0)).toFixed(0);
      case 'P':       return +(base * (f.proteins_g_100g || 0)).toFixed(1);
      case 'G':       return +(base * (f.carbohydrates_g_100g || 0)).toFixed(1);
      case 'sucres':  return +(base * (f.sugars_g_100g || 0)).toFixed(1);
      case 'fibres':  return +(base * (f.fiber_g_100g || 0)).toFixed(1);
      case 'L':       return +(base * (f.fat_g_100g || 0)).toFixed(1);
      case 'AGS':     return +(base * (f.saturated_fat_g_100g || 0)).toFixed(1);
      case 'sel':     return +(base * (f.salt_g_100g || 0)).toFixed(2);
      case 'mono':    return +(base * (f.monounsaturated_fat_g_100g || 0)).toFixed(1);
      case 'poly':    return +(base * (f.polyunsaturated_fat_g_100g || 0)).toFixed(1);
      case 'omega3':  return +(base * (f.omega3_g_100g || 0)).toFixed(2);
      case 'omega6':  return +(base * (f.omega6_g_100g || 0)).toFixed(2);
      case 'trans':   return +(base * (f.trans_fat_g_100g || 0)).toFixed(2);
      case 'chol':    return +(base * (f.cholesterol_mg_100g || 0)).toFixed(0);
      case 'sodium': return +(base * (f.sodium_mg_100g || 0)).toFixed(0);
      case 'Ca':      return +(base * (f.calcium_mg_100g || 0)).toFixed(0);
      case 'Fe':      return +(base * (f.iron_mg_100g || 0)).toFixed(2);
      case 'Mg':      return +(base * (f.magnesium_mg_100g || 0)).toFixed(0);
      case 'Pmin':    return +(base * (f.phosphorus_mg_100g || 0)).toFixed(0);
      case 'K':       return +(base * (f.potassium_mg_100g || 0)).toFixed(0);
      case 'Zn':      return +(base * (f.zinc_mg_100g || 0)).toFixed(2);
      case 'cuivre':  return +(base * (f.copper_mg_100g || 0)).toFixed(2);
      case 'manganese': return +(base * (f.manganese_mg_100g || 0)).toFixed(2);
      case 'selenium': return +(base * (f.selenium_mg_100g || 0)).toFixed(1);
      case 'iode':    return +(base * (f.iodine_mg_100g || 0)).toFixed(0);
      case 'vitA':    return +(base * (f.vit_a_mcg_100g || 0)).toFixed(0);
      case 'vitD':    return +(base * (f.vit_d_mcg_100g || 0)).toFixed(1);
      case 'vitE':    return +(base * (f.vit_e_mg_100g || 0)).toFixed(1);
      case 'vitK':    return +(base * (f.vit_k_mcg_100g || 0)).toFixed(0);
      case 'vitC':    return +(base * (f.vit_c_mg_100g || 0)).toFixed(0);
      case 'B1':      return +(base * (f.vit_b1_mg_100g || 0)).toFixed(2);
      case 'B2':      return +(base * (f.vit_b2_mg_100g || 0)).toFixed(2);
      case 'B3':      return +(base * (f.vit_b3_mg_100g || 0)).toFixed(1);
      case 'B5':      return +(base * (f.vit_b5_mg_100g || 0)).toFixed(2);
      case 'B6':      return +(base * (f.vit_b6_mg_100g || 0)).toFixed(2);
      case 'B9':      return +(base * (f.vit_b9_mcg_100g || 0)).toFixed(0);
      case 'B12':     return +(base * (f.vit_b12_mcg_100g || 0)).toFixed(1);
      case 'cafeine': return +(base * (f.caffeine_mg_100g || 0)).toFixed(0);
      default: return 0;
    }
  } else if (meal.recipe_id) {
    const r = meal;
    const portionWeight = (r.recipe_total_weight || 0) / (r.recipe_portions || 1);
    const portions = qty / portionWeight;
    switch (col) {
      case 'kcal':    return +(portions * (r.energy_kcal_per_portion || 0)).toFixed(0);
      case 'P':       return +(portions * (r.proteins_g_per_portion || 0)).toFixed(1);
      case 'G':       return +(portions * (r.carbohydrates_g_per_portion || 0)).toFixed(1);
      case 'sucres':  return +(portions * (r.sugars_g_per_portion || 0)).toFixed(1);
      case 'fibres':  return +(portions * (r.fiber_g_per_portion || 0)).toFixed(1);
      case 'L':       return +(portions * (r.fat_g_per_portion || 0)).toFixed(1);
      case 'AGS':     return +(portions * (r.saturated_fat_g_per_portion || 0)).toFixed(1);
      case 'sel':     return +(portions * (r.salt_g_per_portion || 0)).toFixed(2);
      case 'Ca':      return +(portions * (r.calcium_mg_per_portion || 0)).toFixed(0);
      case 'Fe':      return +(portions * (r.iron_mg_per_portion || 0)).toFixed(2);
      case 'Mg':      return +(portions * (r.magnesium_mg_per_portion || 0)).toFixed(0);
      case 'Pmin':    return +(portions * (r.phosphorus_mg_per_portion || 0)).toFixed(0);
      case 'K':       return +(portions * (r.potassium_mg_per_portion || 0)).toFixed(0);
      case 'Zn':      return +(portions * (r.zinc_mg_per_portion || 0)).toFixed(2);
      case 'vitA':    return +(portions * (r.vit_a_mcg_per_portion || 0)).toFixed(0);
      case 'vitC':    return +(portions * (r.vit_c_mg_per_portion || 0)).toFixed(0);
      case 'vitD':     return +(portions * (r.vit_d_mcg_per_portion || 0)).toFixed(1);
      case 'B1':      return +(portions * (r.vit_b1_mg_per_portion || 0)).toFixed(2);
      case 'B2':      return +(portions * (r.vit_b2_mg_per_portion || 0)).toFixed(2);
      case 'B3':      return +(portions * (r.vit_b3_mg_per_portion || 0)).toFixed(1);
      case 'B5':      return +(portions * (r.vit_b5_mg_per_portion || 0)).toFixed(2);
      case 'B6':      return +(portions * (r.vit_b6_mg_per_portion || 0)).toFixed(2);
      case 'B9':      return +(portions * (r.vit_b9_mcg_per_portion || 0)).toFixed(0);
      case 'B12':     return +(portions * (r.vit_b12_mcg_per_portion || 0)).toFixed(1);
      case 'vitE':    return +(portions * (r.vit_e_mg_per_portion || 0)).toFixed(1);
      case 'cafeine': return +(portions * (r.caffeine_mg_per_portion || 0)).toFixed(0);
      default: return 0;
    }
  }
  return 0;
}

const rows = computed(() => {
  return logsStore.meals.map(m => {
    const name = m.food_name || m.recipe_name || '?';
    const category = m.food_category || '';
    const row = {
      id: m.id,
      name,
      category,
      period: m.period,
      period_short: PERIOD_SHORT[m.period] || m.period,
      quantity_g: m.quantity_g,
    };
    for (const col of DISPLAY_COLS) {
      row[col] = calcNutr(m, col);
    }
    return row;
  });
});

const sortedRows = computed(() => {
  if (!sortCol.value) return rows.value;
  const col = sortCol.value;
  const dir = sortKey.value;
  return [...rows.value].sort((a, b) => {
    const va = a[col], vb = b[col];
    if (va == null || vb == null) return 0;
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
});

function toggleSort(col) {
  if (sortCol.value !== col) {
    sortCol.value = col;
    sortKey.value = 'asc';
  } else if (sortKey.value === 'asc') {
    sortKey.value = 'desc';
  } else if (sortKey.value === 'desc') {
    sortCol.value = null;
    sortKey.value = null;
  }
}

function sortIndicator(col) {
  if (sortCol.value !== col) return '';
  return sortKey.value === 'asc' ? '↑' : '↓';
}

function sumCol(col) {
  return rows.value.reduce((acc, r) => acc + (parseFloat(r[col]) || 0), 0);
}

const DECIMAL_COLS = new Set(['omega3', 'omega6', 'trans', 'P', 'G', 'sucres', 'fibres', 'L', 'AGS', 'sel', 'mono', 'poly', 'Fe', 'Zn', 'cuivre', 'manganese', 'selenium', 'vitD', 'vitE', 'B1', 'B2', 'B3', 'B5', 'B6', 'B12']);

const totalsAll = computed(() => {
  const r = {};
  for (const col of DISPLAY_COLS) {
    const val = sumCol(col);
    r[col] = DECIMAL_COLS.has(col) ? parseFloat(val.toFixed(2)) : parseFloat(val.toFixed(0));
  }
  r.qty = rows.value.reduce((acc, r) => acc + (parseFloat(r.quantity_g) || 0), 0);
  return r;
});

const totals = computed(() => ({
  kcal: totalsAll.value.kcal,
  P: totalsAll.value.P,
  G: totalsAll.value.G,
  L: totalsAll.value.L,
}));

const sportKcal = computed(() => {
  return logsStore.sports.reduce((acc, s) => acc + (s.kcal_burned || 0), 0);
});

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

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  if (route.query.date && /^\d{4}-\d{2}-\d{2}$/.test(route.query.date)) {
    logsStore.selectedDate = route.query.date;
  }
  logsStore.fetchLogsForDate();
  foodsStore.fetchFoods();
  recipesStore.fetchRecipes();
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

watch(() => route.query.date, (newDate) => {
  if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
    logsStore.selectedDate = newDate;
    logsStore.fetchLogsForDate();
  }
});
</script>

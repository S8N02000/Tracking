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
    <div v-if="logsStore.sports.length > 0" class="glass-panel p-3.5 rounded-2xl border border-slate-800">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <Activity class="w-4 h-4 text-emerald-400" />
          <span class="text-xs font-bold text-white uppercase tracking-wider">Séances d'activité</span>
        </div>
        <button
          v-if="authStore.isAuthenticated"
          @click="showAddSportModal = true"
          class="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition"
        >
          + Ajouter une séance
        </button>
      </div>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="sport in logsStore.sports"
          :key="sport.id"
          class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono shadow-sm"
        >
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="text-white font-semibold">{{ formatSportName(sport.sport_type) }}</span>
          <span class="text-slate-400">{{ sport.duration_min }} min</span>
          <span class="text-emerald-400 font-bold tabular-nums">-{{ sport.kcal_burned }} kcal</span>
          <button
            v-if="authStore.isAuthenticated"
            @click="logsStore.deleteSport(sport.id)"
            class="text-slate-500 hover:text-rose-400 transition ml-1"
            title="Supprimer la séance"
          >
            <Trash2 class="w-3.5 h-3.5" />
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
                  <div class="font-bold text-cyan-400 mb-0.5">Vitamine A</div>Vue, peau (activité rétinol). VNR 750µg.
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
              class="border-b border-slate-800/80 hover:bg-slate-800/40 transition"
            >
              <td class="px-3 py-2 text-white font-semibold sticky left-0 bg-slate-950 z-20 border-r border-slate-800 shadow-md">
                <div class="truncate max-w-[150px] text-slate-100" :title="row.name">{{ row.name }}</div>
                <div class="text-slate-500 font-normal text-[9px] truncate" v-if="row.category && row.category !== row.name">{{ row.category }}</div>
              </td>
              <td class="text-center px-1.5 py-2">
                <span class="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm" :class="periodBadgeClass(row.period)">{{ row.period_short }}</span>
              </td>
              <td class="text-right px-2 py-2 text-slate-300 tabular-nums">{{ row.quantity_g }}</td>
              <td class="text-right px-2 py-2 text-cyan-300 font-bold tabular-nums">{{ row.kcal }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.P) ? 'text-slate-600' : 'text-rose-300'">{{ formatCell(row.P) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.G) ? 'text-slate-600' : 'text-amber-200'">{{ formatCell(row.G) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.sucres) ? 'text-slate-600' : 'text-amber-400'">{{ formatCell(row.sucres) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.fibres) ? 'text-slate-600' : 'text-emerald-300'">{{ formatCell(row.fibres) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.L) ? 'text-slate-600' : 'text-yellow-300'">{{ formatCell(row.L) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.AGS) ? 'text-slate-600' : 'text-yellow-500'">{{ formatCell(row.AGS) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.sel) ? 'text-slate-600' : 'text-slate-400'">{{ formatCell(row.sel) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.mono) ? 'text-slate-600' : 'text-yellow-400'">{{ formatCell(row.mono) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.poly) ? 'text-slate-600' : 'text-yellow-400'">{{ formatCell(row.poly) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.omega3) ? 'text-slate-600' : 'text-emerald-300'">{{ formatCell(row.omega3) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.omega6) ? 'text-slate-600' : 'text-emerald-300'">{{ formatCell(row.omega6) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.trans) ? 'text-slate-600' : 'text-rose-400'">{{ formatCell(row.trans) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.chol) ? 'text-slate-600' : 'text-amber-500'">{{ formatCell(row.chol) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.sodium) ? 'text-slate-600' : 'text-slate-300'">{{ formatCell(row.sodium) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.Ca) ? 'text-slate-600' : 'text-cyan-300'">{{ formatCell(row.Ca) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.Fe) ? 'text-slate-600' : 'text-rose-300'">{{ formatCell(row.Fe) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.Mg) ? 'text-slate-600' : 'text-emerald-300'">{{ formatCell(row.Mg) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.Pmin) ? 'text-slate-600' : 'text-purple-300'">{{ formatCell(row.Pmin) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.K) ? 'text-slate-600' : 'text-indigo-300'">{{ formatCell(row.K) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.Zn) ? 'text-slate-600' : 'text-teal-300'">{{ formatCell(row.Zn) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.cuivre) ? 'text-slate-600' : 'text-amber-300'">{{ formatCell(row.cuivre) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.manganese) ? 'text-slate-600' : 'text-amber-300'">{{ formatCell(row.manganese) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.selenium) ? 'text-slate-600' : 'text-emerald-300'">{{ formatCell(row.selenium) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.iode) ? 'text-slate-600' : 'text-cyan-300'">{{ formatCell(row.iode) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.vitA) ? 'text-slate-600' : 'text-amber-200'">{{ formatCell(row.vitA) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.vitD) ? 'text-slate-600' : 'text-amber-200'">{{ formatCell(row.vitD) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.vitE) ? 'text-slate-600' : 'text-amber-200'">{{ formatCell(row.vitE) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.vitK) ? 'text-slate-600' : 'text-amber-200'">{{ formatCell(row.vitK) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.vitC) ? 'text-slate-600' : 'text-amber-200'">{{ formatCell(row.vitC) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.B1) ? 'text-slate-600' : 'text-amber-200'">{{ formatCell(row.B1) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.B2) ? 'text-slate-600' : 'text-amber-200'">{{ formatCell(row.B2) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.B3) ? 'text-slate-600' : 'text-amber-200'">{{ formatCell(row.B3) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.B5) ? 'text-slate-600' : 'text-amber-200'">{{ formatCell(row.B5) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.B6) ? 'text-slate-600' : 'text-amber-200'">{{ formatCell(row.B6) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.B9) ? 'text-slate-600' : 'text-amber-200'">{{ formatCell(row.B9) }}</td>
              <td class="text-right px-2 py-2 tabular-nums" :class="isZeroCell(row.B12) ? 'text-slate-600' : 'text-amber-200'">{{ formatCell(row.B12) }}</td>
              <td class="text-right px-2 py-2 tabular-nums font-semibold" :class="isZeroCell(row.cafeine) ? 'text-slate-600' : 'text-orange-400'">{{ formatCell(row.cafeine) }}</td>
              <td v-if="authStore.isAuthenticated" class="px-2 py-2 text-center">
                <button @click="logsStore.deleteMeal(row.id)" class="text-slate-600 hover:text-rose-400 transition" title="Supprimer">
                  <Trash2 class="w-3.5 h-3.5" />
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
  petit_dejeuner: 'Matin',
  dejeuner: 'Midi',
  diner: 'Soir',
  collation: 'Collation'
};

const PERIOD_ORDER = {
  petit_dejeuner: 1,
  dejeuner: 2,
  collation: 3,
  diner: 4
};

const SPORT_LABELS = {
  tapis_roulant: 'Tapis de course',
  velo: 'Vélo',
  pied: 'Marche / Course',
  natation: 'Natation',
  musculation: 'Musculation',
  jardin: 'Jardinage',
  autre: 'Autre sport'
};

function formatSportName(type) {
  if (!type) return 'Séance sportive';
  const clean = String(type).toLowerCase();
  return SPORT_LABELS[clean] || type.replace(/_/g, ' ');
}

function formatCell(val) {
  if (val === 0 || val === '0' || val === '0.0' || val === '0.00' || val == null) {
    return '—';
  }
  return val;
}

function isZeroCell(val) {
  return val === 0 || val === '0' || val === '0.0' || val === '0.00' || val == null;
}

function periodBadgeClass(period) {
  switch (period) {
    case 'petit_dejeuner': return 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/50';
    case 'dejeuner': return 'bg-amber-950/80 text-amber-300 border border-amber-700/50';
    case 'collation': return 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50';
    case 'diner': return 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/50';
    default: return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
}

import { NUTRIENTS_MAP, DISPLAY_COLS, calcNutr } from '@/config/nutrients.js';

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
  if (!sortCol.value) {
    return [...rows.value].sort((a, b) => {
      const orderA = PERIOD_ORDER[a.period] || 99;
      const orderB = PERIOD_ORDER[b.period] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }
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

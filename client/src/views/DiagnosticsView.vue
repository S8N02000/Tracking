<template>
  <div class="space-y-8">
    <!-- Header & Date Controls -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl print:hidden">
      <div>
        <div class="flex items-center space-x-3 mb-1">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Stethoscope class="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Bilan Clinique & Diagnostic des Carences
            </h1>
            <p class="text-xs text-slate-400">
              Analyse cumulée des apports nutritionnels, détection des déficits et ratios de santé (ANSES / EFSA)
            </p>
          </div>
        </div>
      </div>

      <!-- Action Buttons & Date Filter Controls -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- Preset Timeframes -->
        <div class="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            v-for="preset in presets"
            :key="preset.id"
            @click="selectPreset(preset.id)"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            :class="selectedPreset === preset.id ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'"
          >
            {{ preset.label }}
          </button>
        </div>

        <!-- Sliding Window Controls -->
        <div class="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            @click="shiftPeriod(-1)"
            class="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Période précédente"
          >
            <ChevronLeft class="w-4 h-4 text-cyan-400" />
            <span class="hidden sm:inline">Précédent</span>
          </button>

          <button
            @click="shiftPeriod(1)"
            class="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Période suivante"
          >
            <span class="hidden sm:inline">Suivant</span>
            <ChevronRight class="w-4 h-4 text-cyan-400" />
          </button>

          <button
            @click="resetToCurrent()"
            class="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
            title="Revenir aux dates d'aujourd'hui"
          >
            <RotateCcw class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Custom Date Range Dialog / Inputs -->
        <div v-if="selectedPreset === 'custom'" class="flex items-center space-x-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          <div class="flex items-center space-x-1">
            <span class="text-[10px] text-slate-400 font-mono">Du:</span>
            <input
              type="date"
              v-model="customStart"
              @change="handleCustomDateChange"
              @input="handleCustomDateChange"
              class="bg-slate-950 text-white text-xs px-2.5 py-1 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div class="flex items-center space-x-1">
            <span class="text-[10px] text-slate-400 font-mono">Au:</span>
            <input
              type="date"
              v-model="customEnd"
              @change="handleCustomDateChange"
              @input="handleCustomDateChange"
              class="bg-slate-950 text-white text-xs px-2.5 py-1 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <!-- Toggle: TOUT LES MACRO -->
        <button
          @click="showAllMacros = !showAllMacros"
          class="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border"
          :class="showAllMacros ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'"
          title="Activer ou désactiver l'affichage complet de tous les macronutriments et micronutriments"
        >
          <Sparkles class="w-4 h-4 text-amber-400" />
          <span>{{ showAllMacros ? 'TOUT les macro : OUI' : 'TOUT les macro : NON' }}</span>
        </button>

        <!-- Export Markdown Button -->
        <button
          @click="exportMarkdown"
          :disabled="isGeneratingMd"
          class="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 font-bold text-xs border border-cyan-500/30 transition shadow-md disabled:opacity-50"
          title="Télécharger le rapport au format Markdown (.md)"
        >
          <FileCode v-if="!isGeneratingMd" class="w-4 h-4" />
          <Loader2 v-else class="w-4 h-4 animate-spin" />
          <span>{{ isGeneratingMd ? 'Génération MD...' : 'Export Markdown' }}</span>
        </button>

        <!-- Export PDF Button -->
        <button
          @click="exportPDF"
          :disabled="isGeneratingPdf"
          class="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          title="Générer un PDF léger économe en encre (fond blanc)"
        >
          <FileText v-if="!isGeneratingPdf" class="w-4 h-4" />
          <Loader2 v-else class="w-4 h-4 animate-spin" />
          <span>{{ isGeneratingPdf ? 'Génération PDF...' : 'Télécharger PDF' }}</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 space-y-4">
      <div class="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
      <p class="text-sm font-mono text-slate-400 animate-pulse">Calcul du diagnostic nutritionnel et des ratios médicaux...</p>
    </div>

    <!-- Main Diagnostic Content (Screen View) -->
    <div v-else-if="diagnostics" class="space-y-8">

      <!-- Executive Health Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Global Compliance Score Card -->
        <div class="glass-panel p-5 rounded-2xl border border-slate-800/80 relative overflow-hidden flex items-center justify-between">
          <div>
            <span class="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Score de Conformité</span>
            <div class="flex items-baseline space-x-2">
              <span class="text-3xl font-black" :class="scoreColorClass(diagnostics.summary.global_score_pct)">
                {{ diagnostics.summary.global_score_pct }}%
              </span>
              <span class="text-xs text-slate-400">/ 100</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Global Health Balance</p>
          </div>
          <div class="w-12 h-12 rounded-xl flex items-center justify-center" :class="scoreBgClass(diagnostics.summary.global_score_pct)">
            <ShieldCheck v-if="diagnostics.summary.global_score_pct >= 80" class="w-7 h-7 text-emerald-400" />
            <AlertTriangle v-else-if="diagnostics.summary.global_score_pct >= 65" class="w-7 h-7 text-amber-400" />
            <AlertOctagon v-else class="w-7 h-7 text-rose-400" />
          </div>
        </div>

        <!-- Problems & Anomalies Counter -->
        <div class="glass-panel p-5 rounded-2xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <span class="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Anomalies Décelées</span>
            <div class="flex items-baseline space-x-2">
              <span class="text-3xl font-black" :class="diagnostics.summary.total_problems > 0 ? 'text-rose-400' : 'text-emerald-400'">
                {{ diagnostics.summary.total_problems }}
              </span>
              <span class="text-xs text-slate-400">anomalies</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">
              {{ diagnostics.summary.deficit_count }} carences, {{ diagnostics.summary.excess_count }} excès
            </p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <Activity class="w-6 h-6 text-rose-400" />
          </div>
        </div>

        <!-- Timeframe Info -->
        <div class="glass-panel p-5 rounded-2xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <span class="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Période Analysée</span>
            <div class="flex items-baseline space-x-2">
              <span class="text-3xl font-black text-cyan-400">{{ diagnostics.summary.total_days }}</span>
              <span class="text-xs text-slate-400">jour(s)</span>
            </div>
            <p class="text-[11px] font-mono text-slate-400 mt-1">
              Du {{ formatDate(startDate) }} au {{ formatDate(endDate) }}
            </p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Calendar class="w-6 h-6 text-cyan-400" />
          </div>
        </div>

        <!-- Macro Split Bar Card -->
        <div class="glass-panel p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <span class="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">Macro-Énergie (% Calories)</span>
            <div class="flex items-center justify-between text-xs font-mono mb-1 text-slate-300">
              <span class="text-emerald-400 font-bold">P: {{ diagnostics.summary.macro_split.protein_pct }}%</span>
              <span class="text-amber-400 font-bold">G: {{ diagnostics.summary.macro_split.carbs_pct }}%</span>
              <span class="text-rose-400 font-bold">L: {{ diagnostics.summary.macro_split.fat_pct }}%</span>
            </div>
            <!-- Progress Bar -->
            <div class="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
              <div :style="{ width: diagnostics.summary.macro_split.protein_pct + '%' }" class="bg-emerald-500"></div>
              <div :style="{ width: diagnostics.summary.macro_split.carbs_pct + '%' }" class="bg-amber-500"></div>
              <div :style="{ width: diagnostics.summary.macro_split.fat_pct + '%' }" class="bg-rose-500"></div>
            </div>
          </div>
          <p class="text-[10px] text-slate-400 mt-2">Cible: P 15-20%, G 45-55%, L 30-35%</p>
        </div>
      </div>

      <!-- Section: Clinical Ratios & Biomarkers -->
      <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <Scale class="w-5 h-5 text-cyan-400" />
              Ratios Cliniques & Équilibres Biomédicaux
            </h2>
            <p class="text-xs text-slate-400">Ratios métaboliques de référence (Biomarqueurs cliniques)</p>
          </div>
          <span class="text-xs font-mono px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            7 Ratios Clés
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="ratio in diagnostics.ratios"
            :key="ratio.id"
            class="p-4 rounded-xl border transition-all duration-200"
            :class="ratioCardClass(ratio.status)"
          >
            <div class="flex items-start justify-between mb-2">
              <div>
                <span class="text-xs font-semibold text-slate-300 block mb-0.5">{{ ratio.label }}</span>
                <span class="text-xs font-mono text-slate-400">{{ ratio.target_label }}</span>
              </div>
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider"
                :class="statusBadgeClass(ratio.status)"
              >
                {{ formatStatusLabel(ratio.status) }}
              </span>
            </div>

            <div class="flex items-baseline space-x-2 my-2">
              <span class="text-2xl font-black font-mono text-white">{{ ratio.value }}</span>
              <span class="text-xs text-slate-400">{{ ratio.unit }}</span>
            </div>

            <p class="text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2 mt-2">
              {{ ratio.explanation }}
            </p>
          </div>
        </div>
      </div>

      <!-- Section: Day-by-Day Meal Logs ("Journal Alimentaire & Repas Détaillés") -->
      <div v-if="diagnostics.daily_logs && diagnostics.daily_logs.length > 0" class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
        <div class="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <Utensils class="w-5 h-5 text-amber-400" />
              Journal Alimentaire & Détail Repas par Repas
            </h2>
            <p class="text-xs text-slate-400">Liste exhaustive des repas enregistrés et des totaux par jour</p>
          </div>
          <span class="text-xs font-mono px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
            {{ diagnostics.daily_logs.length }} jour(s)
          </span>
        </div>

        <div class="space-y-6">
          <div
            v-for="dayLog in diagnostics.daily_logs"
            :key="dayLog.date"
            class="bg-slate-900/60 rounded-xl p-5 border border-slate-800 space-y-4"
          >
            <div class="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <Calendar class="w-4 h-4 text-cyan-400" />
                Rapport Nutritionnel — {{ formatDate(dayLog.date) }}
              </h3>
              <span class="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                {{ dayLog.totals.kcal }} / {{ dayLog.totals.target_kcal }} kcal
              </span>
            </div>

            <!-- Meals Breakdown per Period -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Petit-Déjeuner -->
              <div v-if="dayLog.meals.petit_dejeuner.length > 0" class="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 space-y-2">
                <h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🥄 Petit-déjeuner</span>
                </h4>
                <table class="w-full text-left text-xs font-mono">
                  <thead>
                    <tr class="text-slate-500 border-b border-slate-800">
                      <th class="pb-1 font-medium">Aliment</th>
                      <th class="pb-1 font-medium">Qté</th>
                      <th class="pb-1 font-medium text-right">kcal</th>
                      <th class="pb-1 font-medium text-right">P</th>
                      <th class="pb-1 font-medium text-right">G</th>
                      <th class="pb-1 font-medium text-right">L</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/40 text-slate-300">
                    <tr v-for="item in dayLog.meals.petit_dejeuner" :key="item.id">
                      <td class="py-1 font-sans text-slate-200">{{ item.name }}</td>
                      <td class="py-1 text-slate-400 text-[11px]">{{ item.qty_display }}</td>
                      <td class="py-1 text-right text-slate-100">{{ item.kcal }}</td>
                      <td class="py-1 text-right text-emerald-400">{{ item.proteins_g }}</td>
                      <td class="py-1 text-right text-amber-400">{{ item.carbs_g }}</td>
                      <td class="py-1 text-right text-rose-400">{{ item.fat_g }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Déjeuner -->
              <div v-if="dayLog.meals.dejeuner.length > 0" class="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 space-y-2">
                <h4 class="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🌙 Déjeuner</span>
                </h4>
                <table class="w-full text-left text-xs font-mono">
                  <thead>
                    <tr class="text-slate-500 border-b border-slate-800">
                      <th class="pb-1 font-medium">Aliment</th>
                      <th class="pb-1 font-medium">Qté</th>
                      <th class="pb-1 font-medium text-right">kcal</th>
                      <th class="pb-1 font-medium text-right">P</th>
                      <th class="pb-1 font-medium text-right">G</th>
                      <th class="pb-1 font-medium text-right">L</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/40 text-slate-300">
                    <tr v-for="item in dayLog.meals.dejeuner" :key="item.id">
                      <td class="py-1 font-sans text-slate-200">{{ item.name }}</td>
                      <td class="py-1 text-slate-400 text-[11px]">{{ item.qty_display }}</td>
                      <td class="py-1 text-right text-slate-100">{{ item.kcal }}</td>
                      <td class="py-1 text-right text-emerald-400">{{ item.proteins_g }}</td>
                      <td class="py-1 text-right text-amber-400">{{ item.carbs_g }}</td>
                      <td class="py-1 text-right text-rose-400">{{ item.fat_g }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Dîner -->
              <div v-if="dayLog.meals.diner.length > 0" class="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 space-y-2">
                <h4 class="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🍽️ Dîner</span>
                </h4>
                <table class="w-full text-left text-xs font-mono">
                  <thead>
                    <tr class="text-slate-500 border-b border-slate-800">
                      <th class="pb-1 font-medium">Aliment</th>
                      <th class="pb-1 font-medium">Qté</th>
                      <th class="pb-1 font-medium text-right">kcal</th>
                      <th class="pb-1 font-medium text-right">P</th>
                      <th class="pb-1 font-medium text-right">G</th>
                      <th class="pb-1 font-medium text-right">L</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/40 text-slate-300">
                    <tr v-for="item in dayLog.meals.diner" :key="item.id">
                      <td class="py-1 font-sans text-slate-200">{{ item.name }}</td>
                      <td class="py-1 text-slate-400 text-[11px]">{{ item.qty_display }}</td>
                      <td class="py-1 text-right text-slate-100">{{ item.kcal }}</td>
                      <td class="py-1 text-right text-emerald-400">{{ item.proteins_g }}</td>
                      <td class="py-1 text-right text-amber-400">{{ item.carbs_g }}</td>
                      <td class="py-1 text-right text-rose-400">{{ item.fat_g }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Collation -->
              <div v-if="dayLog.meals.collation.length > 0" class="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 space-y-2">
                <h4 class="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🍏 Collation</span>
                </h4>
                <table class="w-full text-left text-xs font-mono">
                  <thead>
                    <tr class="text-slate-500 border-b border-slate-800">
                      <th class="pb-1 font-medium">Aliment</th>
                      <th class="pb-1 font-medium">Qté</th>
                      <th class="pb-1 font-medium text-right">kcal</th>
                      <th class="pb-1 font-medium text-right">P</th>
                      <th class="pb-1 font-medium text-right">G</th>
                      <th class="pb-1 font-medium text-right">L</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/40 text-slate-300">
                    <tr v-for="item in dayLog.meals.collation" :key="item.id">
                      <td class="py-1 font-sans text-slate-200">{{ item.name }}</td>
                      <td class="py-1 text-slate-400 text-[11px]">{{ item.qty_display }}</td>
                      <td class="py-1 text-right text-slate-100">{{ item.kcal }}</td>
                      <td class="py-1 text-right text-emerald-400">{{ item.proteins_g }}</td>
                      <td class="py-1 text-right text-amber-400">{{ item.carbs_g }}</td>
                      <td class="py-1 text-right text-rose-400">{{ item.fat_g }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Daily Totals Summary Table -->
            <div class="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="text-xs font-mono space-y-1">
                <span class="text-slate-400 font-bold uppercase tracking-wider block">Totaux de la journée :</span>
                <div class="flex flex-wrap gap-3 text-slate-200">
                  <span><strong>kcal:</strong> {{ dayLog.totals.kcal }} / {{ dayLog.totals.target_kcal }}</span>
                  <span><strong class="text-emerald-400">P:</strong> {{ dayLog.totals.proteins_g }}g / {{ dayLog.totals.target_proteins_g }}g</span>
                  <span><strong class="text-amber-400">G:</strong> {{ dayLog.totals.carbs_g }}g / {{ dayLog.totals.target_carbs_g }}g</span>
                  <span><strong class="text-rose-400">L:</strong> {{ dayLog.totals.fat_g }}g / {{ dayLog.totals.target_fat_g }}g</span>
                  <span><strong class="text-cyan-400">Fibres:</strong> {{ dayLog.totals.fiber_g }}g / {{ dayLog.totals.target_fiber_g }}g</span>
                </div>
              </div>

              <!-- Sport entries if any -->
              <div v-if="dayLog.sports && dayLog.sports.length > 0" class="text-xs font-mono bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                <span class="text-emerald-400 font-bold">🏃 Sport:</span>
                <span v-for="sp in dayLog.sports" :key="sp.id" class="ml-2 text-slate-300">
                  {{ sp.sport_type }} ({{ sp.duration_min }}min, -{{ sp.kcal_burned }} kcal)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section: Detailed Deficiency & Nutrient Status Explorer (Micronutrients) -->
      <div v-if="showAllMacros" class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
        <!-- Controls Header: Category Tabs & Status Filters -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <Zap class="w-5 h-5 text-amber-400" />
              Analyse par Nutriment & Apports (ARJ / AJR)
            </h2>
            <p class="text-xs text-slate-400">Comparaison quotidienne moyenne aux apports nutritionnels conseillés (ANSES)</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- STATUS FILTER BUTTONS -->
            <button
              v-for="statusFilter in statusFilters"
              :key="statusFilter.id"
              @click="selectedStatusFilter = statusFilter.id"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5"
              :class="selectedStatusFilter === statusFilter.id
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'"
            >
              <span>{{ statusFilter.label }}</span>
              <span
                class="px-1.5 py-0.2 rounded-full text-[10px] font-mono"
                :class="selectedStatusFilter === statusFilter.id ? 'bg-slate-950 text-cyan-300' : 'bg-slate-800 text-slate-400'"
              >
                {{ statusFilter.count }}
              </span>
            </button>

            <!-- Search input -->
            <div class="relative ml-2">
              <Search class="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Chercher..."
                class="pl-9 pr-4 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36"
              />
            </div>
          </div>
        </div>

        <!-- Category Filter Pills -->
        <div class="flex items-center space-x-2 overflow-x-auto pb-2">
          <button
            v-for="cat in categories"
            :key="cat"
            @click="selectedCategory = cat"
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
            :class="selectedCategory === cat ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 font-semibold' : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'"
          >
            {{ cat }}
          </button>
        </div>

        <!-- Nutrients Cards Grid -->
        <div v-if="filteredNutrients.length === 0" class="text-center py-12 glass-panel rounded-xl border border-slate-800">
          <CheckCircle2 class="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
          <h3 class="text-base font-bold text-white">Aucun nutriment ne correspond à ce filtre !</h3>
          <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Tous les nutriments de cette catégorie respectent les apports nutritionnels recommandés.
          </p>
          <button
            @click="selectedStatusFilter = 'all'; selectedCategory = 'Tous';"
            class="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition"
          >
            Réinitialiser les filtres
          </button>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="nut in filteredNutrients"
            :key="nut.id"
            class="glass-panel p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between"
            :class="nutrientCardBorderClass(nut.status)"
          >
            <div>
              <!-- Title & Category Header -->
              <div class="flex items-start justify-between mb-3">
                <div>
                  <span class="text-xs font-mono text-cyan-400/80 uppercase tracking-wider block mb-0.5">{{ nut.category }}</span>
                  <h3 class="text-sm font-bold text-white flex items-center gap-1.5">
                    {{ nut.name }}
                  </h3>
                </div>

                <!-- Status Badge -->
                <span
                  class="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider"
                  :class="nutrientStatusBadgeClass(nut.status)"
                >
                  {{ formatNutrientStatusLabel(nut.status) }}
                </span>
              </div>

              <!-- Intake vs ARJ Progress Bar & Metrics -->
              <div class="space-y-2 mb-4">
                <div class="flex justify-between items-baseline text-xs font-mono">
                  <span class="text-slate-400">Moyenne quotidienne:</span>
                  <span class="font-bold text-white text-sm">
                    {{ nut.avg_intake }} {{ nut.unit }}
                  </span>
                </div>

                <div class="flex justify-between items-baseline text-xs font-mono">
                  <span class="text-slate-400">Référence (ARJ):</span>
                  <span class="text-slate-300">
                    {{ nut.target }} {{ nut.unit }}
                    <span v-if="nut.is_upper_limit" class="text-[10px] text-amber-400 font-bold ml-1">(Seuil Max)</span>
                  </span>
                </div>

                <!-- % ARJ Bar -->
                <div>
                  <div class="flex justify-between text-[11px] font-mono font-bold mb-1">
                    <span class="text-slate-400">% ARJ:</span>
                    <span :class="percentageTextColorClass(nut.status)">{{ nut.percentage_arj }}%</span>
                  </div>
                  <div class="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :style="{ width: Math.min(nut.percentage_arj, 100) + '%' }"
                      :class="percentageBarColorClass(nut.status)"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Targeted Food Advice Box -->
            <div class="pt-3 border-t border-slate-800/80 bg-slate-900/40 -mx-5 -mb-5 p-4 rounded-b-2xl">
              <span class="text-[11px] font-semibold text-slate-300 flex items-center gap-1 mb-1">
                <Utensils class="w-3.5 h-3.5 text-amber-400" />
                Sources conseillées :
              </span>
              <p class="text-xs text-slate-400 leading-relaxed font-sans">
                {{ nut.sources_conseillees }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden Dedicated Ink-Friendly PDF Template Container (#printable-pdf-template) -->
    <div id="printable-pdf-template" v-if="diagnostics" class="hidden">
      <div style="background-color: #ffffff; color: #0f172a; font-family: system-ui, -apple-system, sans-serif; padding: 15px; width: 100%;">
        
        <!-- Header -->
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1 style="font-size: 20px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase;">BILAN CLINIQUE & DIAGNOSTIC DES CARENCES</h1>
            <p style="font-size: 11px; color: #475569; margin: 2px 0 0 0; font-family: monospace;">NutriTrack Clinical Diagnostic Engine • Normes ANSES / EFSA</p>
          </div>
          <div style="text-align: right; font-size: 11px; color: #475569; font-family: monospace;">
            <p style="margin: 0;"><strong>Période :</strong> {{ formatDate(startDate) }} au {{ formatDate(endDate) }} ({{ diagnostics.summary.total_days }}j)</p>
            <p style="margin: 2px 0 0 0;"><strong>Généré le :</strong> {{ formatDate(new Date().toISOString().substring(0,10)) }}</p>
          </div>
        </div>

        <!-- Executive Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid;">
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px;">
            <span style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block;">Score Conformité</span>
            <span style="font-size: 22px; font-weight: 900; color: #0f172a;">{{ diagnostics.summary.global_score_pct }}%</span>
            <span style="font-size: 9px; color: #64748b; display: block; margin-top: 2px;">Global Health Balance</span>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px;">
            <span style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block;">Anomalies Décelées</span>
            <span style="font-size: 22px; font-weight: 900; color: #e11d48;">{{ diagnostics.summary.total_problems }}</span>
            <span style="font-size: 9px; color: #64748b; display: block; margin-top: 2px;">{{ diagnostics.summary.deficit_count }} carences, {{ diagnostics.summary.excess_count }} excès</span>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px;">
            <span style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block;">Période Analysée</span>
            <span style="font-size: 22px; font-weight: 900; color: #0284c7;">{{ diagnostics.summary.total_days }}j</span>
            <span style="font-size: 9px; color: #64748b; display: block; margin-top: 2px;">Du {{ formatDate(startDate) }} au {{ formatDate(endDate) }}</span>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px;">
            <span style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block;">Macro-Énergie</span>
            <div style="font-size: 11px; font-weight: bold; margin-top: 4px;">
              <span style="color: #059669;">P: {{ diagnostics.summary.macro_split.protein_pct }}%</span> |
              <span style="color: #d97706;">G: {{ diagnostics.summary.macro_split.carbs_pct }}%</span> |
              <span style="color: #e11d48;">L: {{ diagnostics.summary.macro_split.fat_pct }}%</span>
            </div>
          </div>
        </div>

        <!-- Clinical Ratios Table -->
        <div style="margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid;">
          <h2 style="font-size: 13px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px;">
            ⚖️ RATIOS CLINIQUES & ÉQUILIBRES BIOMÉDICAUX
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left; color: #475569;">
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1;">Ratio / Biomarqueur</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1; text-align: center;">Valeur Mesurée</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1;">Objectif Cible</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1; text-align: center;">Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in diagnostics.ratios" :key="r.id" style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: bold;">{{ r.label }}</td>
                <td style="padding: 4px 6px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: bold;">{{ r.value }} {{ r.unit }}</td>
                <td style="padding: 4px 6px; border: 1px solid #cbd5e1; color: #475569;">{{ r.target_label }}</td>
                <td style="padding: 4px 6px; border: 1px solid #cbd5e1; text-align: center;">
                  <span
                    style="padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;"
                    :style="r.status === 'OPTIMAL' ? 'background-color: #dcfce7; color: #166534;' : r.status === 'ATTENTION' || r.status === 'SOUS_OPTIMAL' ? 'background-color: #fef3c7; color: #92400e;' : 'background-color: #ffe4e6; color: #9f1239;'"
                  >
                    {{ formatStatusLabel(r.status) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Day-by-Day Meal Logs -->
        <div v-if="diagnostics.daily_logs && diagnostics.daily_logs.length > 0" style="margin-bottom: 16px;">
          <h2 style="font-size: 13px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px;">
            🥄 DETAIL ALIMENTAIRE JOUR PAR JOUR
          </h2>

          <div v-for="dayLog in diagnostics.daily_logs" :key="dayLog.date" style="margin-bottom: 14px; page-break-inside: avoid; break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background-color: #ffffff;">
            <div style="font-size: 11px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0; pb: 4px; margin-bottom: 6px; display: flex; justify-content: space-between;">
              <span>📅 Journée du {{ formatDate(dayLog.date) }}</span>
              <span style="font-family: monospace; color: #0284c7;">{{ dayLog.totals.kcal }} kcal (Cible: {{ dayLog.totals.target_kcal }})</span>
            </div>

            <!-- Meal tables -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 6px;">
              <!-- Petit-déjeuner -->
              <div v-if="dayLog.meals.petit_dejeuner.length > 0">
                <div style="font-size: 9px; font-weight: bold; color: #d97706; margin-bottom: 2px;">Petit-déjeuner :</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
                  <tr v-for="item in dayLog.meals.petit_dejeuner" :key="item.id" style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 2px 0; color: #1e293b;">{{ item.name }}</td>
                    <td style="padding: 2px 0; color: #64748b; text-align: right;">{{ item.qty_display }}</td>
                    <td style="padding: 2px 0; color: #0f172a; text-align: right; font-weight: bold; font-family: monospace;">{{ item.kcal }} kcal</td>
                  </tr>
                </table>
              </div>

              <!-- Déjeuner -->
              <div v-if="dayLog.meals.dejeuner.length > 0">
                <div style="font-size: 9px; font-weight: bold; color: #0284c7; margin-bottom: 2px;">Déjeuner :</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
                  <tr v-for="item in dayLog.meals.dejeuner" :key="item.id" style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 2px 0; color: #1e293b;">{{ item.name }}</td>
                    <td style="padding: 2px 0; color: #64748b; text-align: right;">{{ item.qty_display }}</td>
                    <td style="padding: 2px 0; color: #0f172a; text-align: right; font-weight: bold; font-family: monospace;">{{ item.kcal }} kcal</td>
                  </tr>
                </table>
              </div>

              <!-- Dîner -->
              <div v-if="dayLog.meals.diner.length > 0">
                <div style="font-size: 9px; font-weight: bold; color: #7c3aed; margin-bottom: 2px;">Dîner :</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
                  <tr v-for="item in dayLog.meals.diner" :key="item.id" style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 2px 0; color: #1e293b;">{{ item.name }}</td>
                    <td style="padding: 2px 0; color: #64748b; text-align: right;">{{ item.qty_display }}</td>
                    <td style="padding: 2px 0; color: #0f172a; text-align: right; font-weight: bold; font-family: monospace;">{{ item.kcal }} kcal</td>
                  </tr>
                </table>
              </div>

              <!-- Collation -->
              <div v-if="dayLog.meals.collation.length > 0">
                <div style="font-size: 9px; font-weight: bold; color: #059669; margin-bottom: 2px;">Collation :</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
                  <tr v-for="item in dayLog.meals.collation" :key="item.id" style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 2px 0; color: #1e293b;">{{ item.name }}</td>
                    <td style="padding: 2px 0; color: #64748b; text-align: right;">{{ item.qty_display }}</td>
                    <td style="padding: 2px 0; color: #0f172a; text-align: right; font-weight: bold; font-family: monospace;">{{ item.kcal }} kcal</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Day totals summary -->
            <div style="background-color: #f8fafc; border-top: 1px solid #cbd5e1; padding-top: 4px; font-size: 9px; font-family: monospace; display: flex; justify-content: space-between;">
              <span><strong>Totaux :</strong> {{ dayLog.totals.kcal }} kcal | P: {{ dayLog.totals.proteins_g }}g | G: {{ dayLog.totals.carbs_g }}g | L: {{ dayLog.totals.fat_g }}g | Fibres: {{ dayLog.totals.fiber_g }}g</span>
              <span v-if="dayLog.sports.length > 0" style="color: #059669; font-weight: bold;">🏃 Sport: {{ dayLog.sports[0].sport_type }} ({{ dayLog.sports[0].duration_min }}m)</span>
            </div>
          </div>
        </div>

        <!-- Full Micronutrients Breakdown Table if showAllMacros is true -->
        <div v-if="showAllMacros" style="margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid;">
          <h2 style="font-size: 13px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px;">
            💊 APPORTS EN VITAMINES, MINÉRAUX & MACRO-NUTRIMENTS (TOUT LES MACRO)
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left; color: #475569;">
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1;">Catégorie</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1;">Nutriment</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1; text-align: right;">Apport Moyen</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1; text-align: right;">Cible (ARJ)</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1; text-align: center;">% ARJ</th>
                <th style="padding: 4px 6px; border: 1px solid #cbd5e1; text-align: center;">Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="nut in diagnostics.nutrients" :key="nut.id" style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 3px 6px; border: 1px solid #cbd5e1; color: #64748b;">{{ nut.category }}</td>
                <td style="padding: 3px 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #0f172a;">{{ nut.name }}</td>
                <td style="padding: 3px 6px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">{{ nut.avg_intake }} {{ nut.unit }}</td>
                <td style="padding: 3px 6px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; color: #64748b;">{{ nut.target }} {{ nut.unit }}</td>
                <td style="padding: 3px 6px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: bold;">{{ nut.percentage_arj }}%</td>
                <td style="padding: 3px 6px; border: 1px solid #cbd5e1; text-align: center;">
                  <span
                    style="padding: 1px 5px; border-radius: 4px; font-size: 8px; font-weight: bold;"
                    :style="nut.status === 'OPTIMAL' ? 'background-color: #dcfce7; color: #166534;' : nut.status === 'SOUS_OPTIMAL' || nut.status === 'EXCES_ATTENTION' ? 'background-color: #fef3c7; color: #92400e;' : 'background-color: #ffe4e6; color: #9f1239;'"
                  >
                    {{ formatNutrientStatusLabel(nut.status) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Practitioner Notes Section -->
        <div style="border: 1px dashed #94a3b8; border-radius: 6px; padding: 10px; margin-top: 16px; page-break-inside: avoid; break-inside: avoid;">
          <h3 style="font-size: 10px; font-weight: bold; color: #0f172a; margin: 0 0 4px 0;">Observations & Recommandations du Praticien / Nutritionniste :</h3>
          <div style="height: 50px;"></div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '@/api/client.js';
import html2pdf from 'html2pdf.js';
import {
  Stethoscope, Calendar, Activity, ShieldCheck, AlertTriangle, AlertOctagon,
  Scale, Zap, Search, CheckCircle2, FileText, Loader2, Utensils,
  ChevronLeft, ChevronRight, RotateCcw, Sparkles, FileCode
} from 'lucide-vue-next';

// State
const loading = ref(true);
const isGeneratingPdf = ref(false);
const isGeneratingMd = ref(false);
const showAllMacros = ref(true); // Default active for complete reports
const diagnostics = ref(null);
const selectedPreset = ref('7d');
const customStart = ref('');
const customEnd = ref('');
const startDate = ref('');
const endDate = ref('');
const selectedStatusFilter = ref('problems'); // 'problems', 'all', 'critical', 'suboptimal', 'optimal'
const selectedCategory = ref('Tous');
const searchQuery = ref('');

const presets = [
  { id: '1d', label: "Aujourd'hui" },
  { id: '7d', label: '7 jours' },
  { id: '30d', label: '30 jours' },
  { id: '90d', label: '90 jours' },
  { id: 'custom', label: 'Personnalisé' }
];

const categories = ['Tous', 'Vitamines', 'Minéraux', 'Macronutriments'];

// Compute dates based on preset
const calculateDates = () => {
  const end = new Date();
  let start = new Date();

  if (selectedPreset.value === '1d') {
    start = end;
  } else if (selectedPreset.value === '7d') {
    start.setDate(end.getDate() - 6);
  } else if (selectedPreset.value === '30d') {
    start.setDate(end.getDate() - 29);
  } else if (selectedPreset.value === '90d') {
    start.setDate(end.getDate() - 89);
  }

  startDate.value = start.toISOString().substring(0, 10);
  endDate.value = end.toISOString().substring(0, 10);
};

const selectPreset = (presetId) => {
  selectedPreset.value = presetId;
  if (presetId === 'custom') {
    const todayStr = new Date().toISOString().substring(0, 10);
    if (!customStart.value) customStart.value = startDate.value || todayStr;
    if (!customEnd.value) customEnd.value = endDate.value || todayStr;
    startDate.value = customStart.value;
    endDate.value = customEnd.value;
  } else {
    calculateDates();
  }
  fetchDiagnostics();
};

const handleCustomDateChange = () => {
  if (customStart.value && customEnd.value) {
    startDate.value = customStart.value;
    endDate.value = customEnd.value;
    fetchDiagnostics();
  }
};

const shiftPeriod = (direction) => {
  let daysToShift = 7;
  if (selectedPreset.value === '1d') {
    daysToShift = 1;
  } else if (selectedPreset.value === '7d') {
    daysToShift = 7;
  } else if (selectedPreset.value === '30d') {
    daysToShift = 30;
  } else if (selectedPreset.value === '90d') {
    daysToShift = 90;
  } else {
    const s = new Date(startDate.value);
    const e = new Date(endDate.value);
    daysToShift = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
  }

  const s = new Date(startDate.value);
  const e = new Date(endDate.value);

  s.setDate(s.getDate() + direction * daysToShift);
  e.setDate(e.getDate() + direction * daysToShift);

  startDate.value = s.toISOString().substring(0, 10);
  endDate.value = e.toISOString().substring(0, 10);

  if (selectedPreset.value === 'custom') {
    customStart.value = startDate.value;
    customEnd.value = endDate.value;
  }

  fetchDiagnostics();
};

const resetToCurrent = () => {
  if (selectedPreset.value === 'custom') {
    selectPreset('7d');
  } else {
    calculateDates();
    fetchDiagnostics();
  }
};

const fetchDiagnostics = async () => {
  loading.value = true;
  try {
    const res = await api.get('/analytics/diagnostics', {
      params: {
        start: startDate.value,
        end: endDate.value
      }
    });
    diagnostics.value = res.data;
  } catch (err) {
    console.error('Erreur lors du chargement des diagnostics:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  calculateDates();
  fetchDiagnostics();
});

// Status filter items with counters
const statusFilters = computed(() => {
  if (!diagnostics.value) return [];
  const list = diagnostics.value.nutrients;
  return [
    { id: 'problems', label: 'Problèmes', count: list.filter(n => n.is_problem).length },
    { id: 'critical', label: 'Carences Critiques', count: list.filter(n => n.status === 'DEFICIT_CRITIQUE' || n.status === 'EXCES_RISQUE').length },
    { id: 'suboptimal', label: 'Sous-optimal', count: list.filter(n => n.status === 'SOUS_OPTIMAL' || n.status === 'EXCES_ATTENTION').length },
    { id: 'optimal', label: 'Conformes', count: list.filter(n => n.status === 'OPTIMAL').length },
    { id: 'all', label: 'Tous', count: list.length }
  ];
});

// Computed nutrient list filtering
const filteredNutrients = computed(() => {
  if (!diagnostics.value) return [];
  let list = [...diagnostics.value.nutrients];

  // Filter by category
  if (selectedCategory.value !== 'Tous') {
    list = list.filter((n) => n.category === selectedCategory.value);
  }

  // Filter by status filter
  if (selectedStatusFilter.value === 'problems') {
    list = list.filter((n) => n.is_problem);
  } else if (selectedStatusFilter.value === 'critical') {
    list = list.filter((n) => n.status === 'DEFICIT_CRITIQUE' || n.status === 'EXCES_RISQUE');
  } else if (selectedStatusFilter.value === 'suboptimal') {
    list = list.filter((n) => n.status === 'SOUS_OPTIMAL' || n.status === 'EXCES_ATTENTION');
  } else if (selectedStatusFilter.value === 'optimal') {
    list = list.filter((n) => n.status === 'OPTIMAL');
  }

  // Search query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter((n) => n.name.toLowerCase().includes(q) || n.sources_conseillees.toLowerCase().includes(q));
  }

  // Sort nutrients by status severity (Critical -> Suboptimal -> Optimal)
  list.sort((a, b) => a.percentage_arj - b.percentage_arj);

  return list;
});

// Ink-Friendly PDF Export function using html2pdf.js
const exportPDF = async () => {
  isGeneratingPdf.value = true;
  const templateEl = document.getElementById('printable-pdf-template');
  if (!templateEl) {
    isGeneratingPdf.value = false;
    return;
  }

  // Temporarily reveal light template for capturing
  templateEl.classList.remove('hidden');

  const filename = startDate.value === endDate.value
    ? `${startDate.value}_rapport.pdf`
    : `Bilan_Nutritionnel_${startDate.value}_au_${endDate.value}.pdf`;

  const opt = {
    margin: [8, 8, 8, 8],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  try {
    await html2pdf().set(opt).from(templateEl).save();
  } catch (err) {
    console.error('Erreur lors de la génération PDF html2pdf:', err);
    window.print();
  } finally {
    templateEl.classList.add('hidden');
    isGeneratingPdf.value = false;
  }
};

// Markdown Export Generator matching backup_reports format
const exportMarkdown = () => {
  if (!diagnostics.value) return;
  isGeneratingMd.value = true;

  let md = '';

  const logs = diagnostics.value.daily_logs || [];
  if (logs.length === 0) {
    md += `# Rapport Nutritionnel — ${formatDate(startDate.value)} au ${formatDate(endDate.value)}\n\n`;
    md += `*Aucun repas enregistré sur cette période.*\n`;
  } else {
    for (let i = 0; i < logs.length; i++) {
      const dayLog = logs[i];
      md += `# Rapport Nutritionnel — ${formatDate(dayLog.date)}\n\n`;

      // Petit-déjeuner
      md += `## 🥄 Petit-déjeuner\n`;
      if (dayLog.meals.petit_dejeuner.length === 0) {
        md += `*Rien enregistré*\n\n`;
      } else {
        md += `| Aliment | Qté | kcal | P | G | L | Fibres |\n`;
        md += `|---|---|---|---|---|---|---|\n`;
        for (const item of dayLog.meals.petit_dejeuner) {
          md += `| ${item.name} | ${item.qty_display} | ${item.kcal} | ${item.proteins_g} | ${item.carbs_g} | ${item.fat_g} | ${item.fiber_g} |\n`;
        }
        md += `\n`;
      }

      // Déjeuner
      md += `## 🌙 Déjeuner\n`;
      if (dayLog.meals.dejeuner.length === 0) {
        md += `*Rien enregistré*\n\n`;
      } else {
        md += `| Aliment | Qté | kcal | P | G | L | Fibres |\n`;
        md += `|---|---|---|---|---|---|---|\n`;
        for (const item of dayLog.meals.dejeuner) {
          md += `| ${item.name} | ${item.qty_display} | ${item.kcal} | ${item.proteins_g} | ${item.carbs_g} | ${item.fat_g} | ${item.fiber_g} |\n`;
        }
        md += `\n`;
      }

      // Dîner
      md += `## 🍽️ Dîner\n`;
      if (dayLog.meals.diner.length === 0) {
        md += `*Rien enregistré*\n\n`;
      } else {
        md += `| Aliment | Qté | kcal | P | G | L | Fibres |\n`;
        md += `|---|---|---|---|---|---|---|\n`;
        for (const item of dayLog.meals.diner) {
          md += `| ${item.name} | ${item.qty_display} | ${item.kcal} | ${item.proteins_g} | ${item.carbs_g} | ${item.fat_g} | ${item.fiber_g} |\n`;
        }
        md += `\n`;
      }

      // Collation if any
      if (dayLog.meals.collation.length > 0) {
        md += `## 🍏 Collation\n`;
        md += `| Aliment | Qté | kcal | P | G | L | Fibres |\n`;
        md += `|---|---|---|---|---|---|---|\n`;
        for (const item of dayLog.meals.collation) {
          md += `| ${item.name} | ${item.qty_display} | ${item.kcal} | ${item.proteins_g} | ${item.carbs_g} | ${item.fat_g} | ${item.fiber_g} |\n`;
        }
        md += `\n`;
      }

      // Sport
      md += `## 🏃 Sport\n`;
      if (!dayLog.sports || dayLog.sports.length === 0) {
        md += `| Type | Durée | kcal brûlées |\n`;
        md += `|---|---|---|\n`;
        md += `| Aucun | — | — |\n\n`;
      } else {
        md += `| Type | Durée | kcal brûlées |\n`;
        md += `|---|---|---|\n`;
        for (const sp of dayLog.sports) {
          md += `| ${sp.sport_type} | ${sp.duration_min} min | ${sp.kcal_burned} |\n`;
        }
        md += `\n`;
      }

      // Totaux journée
      const t = dayLog.totals;
      const kcalPct = t.target_kcal > 0 ? Math.round((t.kcal / t.target_kcal) * 100) : 0;
      const protPct = t.target_proteins_g > 0 ? Math.round((t.proteins_g / t.target_proteins_g) * 100) : 0;
      const carbsPct = t.target_carbs_g > 0 ? Math.round((t.carbs_g / t.target_carbs_g) * 100) : 0;
      const fatPct = t.target_fat_g > 0 ? Math.round((t.fat_g / t.target_fat_g) * 100) : 0;

      md += `## 📊 Totaux journée\n`;
      md += `| | Cible | Réel | % |\n`;
      md += `|---|---|---|---|\n`;
      md += `| **kcal** | ${t.target_kcal} | ${t.kcal} | ${kcalPct >= 90 ? '✅' : '⚠️'} ${kcalPct}% |\n`;
      md += `| **Protéines** | ${t.target_proteins_g}g | ${t.proteins_g}g | ${protPct >= 90 ? '✅' : '⚠️'} ${protPct}% |\n`;
      md += `| **Glucides** | ${t.target_carbs_g}g | ${t.carbs_g}g | ${carbsPct}% |\n`;
      md += `| **Lipides** | ${t.target_fat_g}g | ${t.fat_g}g | ${fatPct >= 80 ? '✅' : '⚠️'} ${fatPct}% |\n\n`;

      if (showAllMacros.value) {
        // Profil Lipidique
        const omega3 = t.omega_3_g || 0;
        const omega6 = t.omega_6_g || 0;
        const omegaRatio = omega3 > 0 ? (omega6 / omega3).toFixed(1) : '—';
        md += `## 🐟 Profil Lipidique\n`;
        md += `| | Valeur | Ratio |\n`;
        md += `|---|---|---|\n`;
        md += `| AGS | ${t.saturated_fat_g}g | |\n`;
        md += `| **Oméga-3** | **${omega3}g** | |\n`;
        md += `| **Oméga-6** | **${omega6}g** | |\n`;
        md += `| **Ratio ω6/ω3** | | **${omegaRatio}:1** ${parseFloat(omegaRatio) <= 4.5 ? '✅' : '⚠️'} |\n\n`;

        // Minéraux
        md += `## 💊 Minéraux\n`;
        md += `| Minéral | Apport | Cible | % VNR |\n`;
        md += `|---|---|---|---|\n`;
        md += `| Calcium | ${t.calcium_mg}mg | 1000mg | ${Math.round((t.calcium_mg / 1000) * 100)}% |\n`;
        md += `| Fer | ${t.iron_mg}mg | 11mg | ${Math.round((t.iron_mg / 11) * 100)}% |\n`;
        md += `| Magnésium | ${t.magnesium_mg}mg | 420mg | ${Math.round((t.magnesium_mg / 420) * 100)}% |\n`;
        md += `| Potassium | ${t.potassium_mg}mg | 3500mg | ${Math.round((t.potassium_mg / 3500) * 100)}% |\n`;
        md += `| Zinc | ${t.zinc_mg}mg | 11mg | ${Math.round((t.zinc_mg / 11) * 100)}% |\n`;
        md += `| Phosphore | ${t.phosphorus_mg}mg | 700mg | ${Math.round((t.phosphorus_mg / 700) * 100)}% |\n\n`;

        // Vitamines
        md += `## 💊 Vitamines\n`;
        md += `| Vitamine | Apport | Cible | % VNR |\n`;
        md += `|---|---|---|---|\n`;
        md += `| A | ${t.vit_a_mcg}µg | 750µg | ${Math.round((t.vit_a_mcg / 750) * 100)}% |\n`;
        md += `| B1 | ${t.vit_b1_mg}mg | 1.2mg | ${Math.round((t.vit_b1_mg / 1.2) * 100)}% |\n`;
        md += `| B2 | ${t.vit_b2_mg}mg | 1.6mg | ${Math.round((t.vit_b2_mg / 1.6) * 100)}% |\n`;
        md += `| B3 | ${t.vit_b3_mg}mg | 16mg | ${Math.round((t.vit_b3_mg / 16) * 100)}% |\n`;
        md += `| B6 | ${t.vit_b6_mg}mg | 1.7mg | ${Math.round((t.vit_b6_mg / 1.7) * 100)}% |\n`;
        md += `| B9 (Folate) | ${t.vit_b9_mcg}µg | 330µg | ${Math.round((t.vit_b9_mcg / 330) * 100)}% |\n`;
        md += `| B12 | ${t.vit_b12_mcg}µg | 4µg | ${Math.round((t.vit_b12_mcg / 4) * 100)}% |\n`;
        md += `| C | ${t.vit_c_mg}mg | 110mg | ${Math.round((t.vit_c_mg / 110) * 100)}% |\n`;
        md += `| D | ${t.vit_d_mcg}µg | 15µg | ${Math.round((t.vit_d_mcg / 15) * 100)}% |\n`;
        md += `| E | ${t.vit_e_mg}mg | 15mg | ${Math.round((t.vit_e_mg / 15) * 100)}% |\n\n`;
      }

      // Add separator if multiple days
      if (i < logs.length - 1) {
        md += `---\n\n`;
      }
    }
  }

  // Download blob
  const filename = startDate.value === endDate.value
    ? `${startDate.value}_rapport.md`
    : `Bilan_Nutritionnel_${startDate.value}_au_${endDate.value}.md`;

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);

  isGeneratingMd.value = false;
};

// Formatting Helpers
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const scoreColorClass = (score) => {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 65) return 'text-amber-400';
  return 'text-rose-400';
};

const scoreBgClass = (score) => {
  if (score >= 80) return 'bg-emerald-500/10 border border-emerald-500/20';
  if (score >= 65) return 'bg-amber-500/10 border border-amber-500/20';
  return 'bg-rose-500/10 border border-rose-500/20';
};

const ratioCardClass = (status) => {
  if (status === 'OPTIMAL') return 'bg-slate-900/60 border-slate-800';
  if (status === 'SOUS_OPTIMAL' || status === 'ATTENTION') return 'bg-amber-950/20 border-amber-500/30';
  return 'bg-rose-950/30 border-rose-500/40 shadow-lg shadow-rose-500/5';
};

const statusBadgeClass = (status) => {
  if (status === 'OPTIMAL') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  if (status === 'SOUS_OPTIMAL' || status === 'ATTENTION') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
};

const formatStatusLabel = (status) => {
  const map = {
    OPTIMAL: 'Optimal',
    SOUS_OPTIMAL: 'Sous-optimal',
    ATTENTION: 'Vigilance',
    CRITIQUE: 'Déséquilibre Critique'
  };
  return map[status] || status;
};

const nutrientCardBorderClass = (status) => {
  if (status === 'DEFICIT_CRITIQUE' || status === 'EXCES_RISQUE') return 'bg-rose-950/20 border-rose-500/40';
  if (status === 'SOUS_OPTIMAL' || status === 'EXCES_ATTENTION') return 'bg-amber-950/10 border-amber-500/30';
  return 'bg-slate-900/50 border-slate-800';
};

const nutrientStatusBadgeClass = (status) => {
  if (status === 'DEFICIT_CRITIQUE') return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
  if (status === 'SOUS_OPTIMAL') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  if (status === 'EXCES_RISQUE') return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
  if (status === 'EXCES_ATTENTION') return 'bg-amber-500/10 text-amber-300 border border-amber-500/20';
  return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
};

const formatNutrientStatusLabel = (status) => {
  const map = {
    DEFICIT_CRITIQUE: 'Déficit Critique',
    SOUS_OPTIMAL: 'Sous-optimal',
    OPTIMAL: 'Conforme',
    EXCES_ATTENTION: 'Élevé',
    EXCES_RISQUE: 'Excès Risqué'
  };
  return map[status] || status;
};

const percentageTextColorClass = (status) => {
  if (status === 'DEFICIT_CRITIQUE' || status === 'EXCES_RISQUE') return 'text-rose-400';
  if (status === 'SOUS_OPTIMAL' || status === 'EXCES_ATTENTION') return 'text-amber-400';
  return 'text-emerald-400';
};

const percentageBarColorClass = (status) => {
  if (status === 'DEFICIT_CRITIQUE' || status === 'EXCES_RISQUE') return 'bg-rose-500';
  if (status === 'SOUS_OPTIMAL' || status === 'EXCES_ATTENTION') return 'bg-amber-500';
  return 'bg-emerald-500';
};
</script>

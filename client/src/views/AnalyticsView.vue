<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="glass-panel p-4 lg:p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-white flex items-center gap-2">
          <LineChart class="w-6 h-6 text-cyan-400" />
          Analyses & Explorateur de Courbes Temporelles
        </h2>
        <p class="text-xs text-slate-400">Visualisation dynamique avec gestion intelligente des jours sans données (null/gap-spanning)</p>
      </div>

      <!-- Main period selector -->
      <div class="flex items-center space-x-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
        <button
          @click="changeRange(7)"
          class="px-3 py-1.5 rounded-lg transition"
          :class="rangeDays === 7 ? 'bg-cyan-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-white'"
        >
          7 Jours
        </button>
        <button
          @click="changeRange(30)"
          class="px-3 py-1.5 rounded-lg transition"
          :class="rangeDays === 30 ? 'bg-cyan-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-white'"
        >
          30 Jours
        </button>
        <button
          @click="changeRange(90)"
          class="px-3 py-1.5 rounded-lg transition"
          :class="rangeDays === 90 ? 'bg-cyan-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-white'"
        >
          90 Jours
        </button>
        <button
          @click="changeRange(365)"
          class="px-3 py-1.5 rounded-lg transition"
          :class="rangeDays === 365 ? 'bg-cyan-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-white'"
        >
          1 An
        </button>
        <button
          @click="changeRange(9999)"
          class="px-3 py-1.5 rounded-lg transition"
          :class="rangeDays === 9999 ? 'bg-cyan-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-white'"
        >
          Tout
        </button>
      </div>
    </div>

    <!-- 🌟 FEATURE COMPLETE: Universal Dynamic Custom Metric Chart Builder with Zero-Gap Handling & Trendline -->
    <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles class="w-5 h-5 text-amber-400" />
            Explorateur Sur-Mesure ("TOUT")
          </h3>
          <p class="text-xs text-slate-400">Sélectionnez un indicateur. Les jours sans données sont automatiquement ignorés pour éviter les chutes à 0.</p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <!-- Metric Select -->
          <div class="flex items-center space-x-2">
            <label class="text-xs font-mono text-slate-400">Variable :</label>
            <select
              v-model="customMetricKey"
              @change="updateCustomChart"
              class="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
            >
              <optgroup label="Impédancemétrie Biométrique (Scans)">
                <option value="muscle_mass_kg">Masse Musculaire (kg)</option>
                <option value="weight_kg">Poids (kg)</option>
                <option value="fat_mass_kg">Masse Grasse (kg)</option>
              </optgroup>
              <optgroup label="Apport Calorique & Dépense">
                <option value="kcal_in">Calories Consommées (kcal)</option>
                <option value="kcal_sport">Dépense Sportive (kcal)</option>
                <option value="total_kcal_expended">Dépense Globale (BMR + Sport)</option>
                <option value="net_balance">Bilan Calorique Net (kcal)</option>
              </optgroup>
              <optgroup label="Macronutriments (g)">
                <option value="proteins_g">Protéines (g)</option>
                <option value="carbs_g">Glucides (g)</option>
                <option value="sugars_g">Sucres (g)</option>
                <option value="fat_g">Lipides (g)</option>
                <option value="saturated_fat_g">Lipides Saturés (g)</option>
                <option value="fiber_g">Fibres (g)</option>
              </optgroup>
              <optgroup label="Micronutriments & Minéraux">
                <option value="salt_g">Sel (g)</option>
                <option value="sodium_mg">Sodium (mg)</option>
                <option value="calcium_mg">Calcium (mg)</option>
                <option value="iron_mg">Fer (mg)</option>
                <option value="magnesium_mg">Magnésium (mg)</option>
                <option value="vit_c_mg">Vitamine C (mg)</option>
              </optgroup>
            </select>
          </div>

          <!-- Ignore Zeroes Toggle -->
          <label class="flex items-center space-x-2 text-xs font-mono text-slate-300 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            <input type="checkbox" v-model="ignoreZeroes" @change="updateCustomChart" class="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0" />
            <span>Ignorer jours à 0 (Reliure continue)</span>
          </label>

          <!-- Trendline Toggle -->
          <label class="flex items-center space-x-2 text-xs font-mono text-slate-300 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            <input type="checkbox" v-model="showTrendline" @change="updateCustomChart" class="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0" />
            <span>Afficher Tendance</span>
          </label>
        </div>
      </div>

      <!-- Custom Chart Container -->
      <div class="h-80 w-full">
        <Line v-if="customChartData" :data="customChartData" :options="customChartOptions" />
        <div v-else class="h-full flex items-center justify-center text-slate-500 text-xs">
          Chargement des données du graphique...
        </div>
      </div>
    </div>

    <!-- Body Composition Card -->
    <div class="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-800">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-4">
        <Scale class="w-5 h-5 text-rose-400 shrink-0" />
        <h3 class="text-sm sm:text-base font-bold text-white">Composition Corporelle</h3>
        <span class="text-xs text-slate-500 font-mono ml-auto shrink-0">{{ latestScanDate }}</span>
      </div>

      <div class="flex flex-col gap-4">
        <!-- Top: fat % + badge -->
        <div class="flex items-end gap-4">
          <div>
            <div class="text-3xl font-bold text-rose-400">{{ fatPercent }}<span class="text-lg">%</span></div>
            <div class="text-xs text-slate-400">Masse Grasse</div>
          </div>
          <span
            class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold self-start mt-1"
            :class="fatCategoryClass"
          >
            {{ fatCategoryLabel }}
          </span>
        </div>

        <!-- Scale bar (full width) -->
        <div class="w-full flex flex-col gap-1">
          <div class="relative h-3 rounded-full bg-slate-800 overflow-hidden flex">
            <div class="h-full bg-blue-500/50" style="width:13%" />
            <div class="h-full bg-emerald-400/50" style="width:19%" />
            <div class="h-full bg-yellow-400/50" style="width:17%" />
            <div class="h-full bg-orange-400/50" style="width:21%" />
            <div class="h-full bg-rose-500/50" style="width:30%" />
            <!-- Marker: white triangle pointing down -->
            <div
              v-if="fatPercent !== '—'"
              class="absolute top-0 w-0 h-0"
              :style="`left:${fatScalePosition};transform:translateX(-50%)`"
              style="border-left:4px solid transparent;border-right:4px solid transparent;border-top:6px solid white"
            />
          </div>
          <div class="flex justify-between text-[9px] text-slate-600 font-mono leading-tight">
            <span>2%</span><span>13%</span><span>17%</span><span>24%</span><span>25%+</span>
          </div>
          <div class="flex justify-between text-[9px] text-slate-500 font-mono leading-tight">
            <span>Min</span><span>Athl.</span><span>Forme</span><span>Moyen</span><span>Obèse</span>
          </div>
        </div>

        <!-- Stats: 3 columns on mobile -->
        <div class="grid grid-cols-3 gap-2 text-xs font-mono">
          <div class="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-slate-800/50">
            <div class="text-indigo-400 font-bold">{{ latestScanWeight }} <span class="text-slate-500 text-[10px]">kg</span></div>
            <div class="text-slate-500 text-[10px]">Poids</div>
          </div>
          <div class="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-slate-800/50">
            <div class="text-emerald-400 font-bold">{{ latestScanMuscle }} <span class="text-slate-500 text-[10px]">kg</span></div>
            <div class="text-slate-500 text-[10px]">Muscle</div>
          </div>
          <div class="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-slate-800/50">
            <div class="text-rose-400 font-bold">{{ latestScanFat }} <span class="text-slate-500 text-[10px]">kg</span></div>
            <div class="text-slate-500 text-[10px]">Gras</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Grid: Correlation & Radar -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 1. Correlation: Weight vs Cumulative Caloric Balance -->
      <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 class="text-base font-bold text-white flex items-center justify-between">
          <span>Corrélation : Poids & Bilan Calorique Cumulé</span>
          <span class="text-xs font-mono text-cyan-400">Chart.js Dual Axis</span>
        </h3>
        <div class="h-72 w-full">
          <Line v-if="correlationData" :data="correlationData" :options="correlationOptions" />
        </div>
      </div>

      <!-- 2. Micronutrients Radar vs RDA -->
      <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 class="text-base font-bold text-white flex items-center justify-between">
          <span>Radar Micronutritionnel (% AJR)</span>
          <span class="text-xs font-mono text-emerald-400">Couverture Apports</span>
        </h3>
        <div class="h-72 w-full flex items-center justify-center">
          <Radar v-if="radarData" :data="radarData" :options="radarOptions" />
        </div>
      </div>

      <!-- 3. Meal Distribution Doughnut -->
      <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 lg:col-span-2">
        <h3 class="text-base font-bold text-white flex items-center justify-between">
          <span>Répartition Calorique par Repas</span>
          <span class="text-xs font-mono text-amber-400">Total: {{ mealTotalKcal }} kcal</span>
        </h3>
        <div class="h-64 w-full flex items-center justify-center">
          <Doughnut v-if="mealData" :data="mealData" :options="mealOptions" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '@/api/client.js';
import { LineChart, Sparkles, Scale } from 'lucide-vue-next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Radar, Doughnut } from 'vue-chartjs';
import { useBoditraxStore } from '@/stores/boditraxStore.js';
import { useAuthStore } from '@/stores/authStore.js';
const boditraxStore = useBoditraxStore();
const authStore = useAuthStore();

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const rangeDays = ref(30);
const customMetricKey = ref('muscle_mass_kg');
const ignoreZeroes = ref(true);
const showTrendline = ref(true);

const dashboardRawRows = ref([]);
const customChartData = ref(null);
const correlationData = ref(null);
const radarData = ref(null);
const mealData = ref(null);
const mealTotalKcal = ref(0);

// Latest Boditrax scan computed
const latestScan = computed(() => {
  return boditraxStore.scans.length > 0 ? boditraxStore.scans[0] : null;
});

const latestScanDate = computed(() => {
  return latestScan.value ? latestScan.value.scan_datetime.substring(0, 10) : '—';
});
const latestScanWeight = computed(() => latestScan.value?.weight_kg ?? '—');
const latestScanMuscle = computed(() => latestScan.value?.muscle_mass_kg ?? '—');
const latestScanFat = computed(() => latestScan.value?.fat_mass_kg ?? '—');

const fatPercent = computed(() => {
  if (!latestScan.value) return '—';
  return ((latestScan.value.fat_mass_kg / latestScan.value.weight_kg) * 100).toFixed(1);
});

const fatCategoryLabel = computed(() => {
  const p = parseFloat(fatPercent.value);
  if (isNaN(p)) return '—';
  if (p < 5) return 'Minimum vital';
  if (p < 13) return 'Athlétique';
  if (p < 17) return 'En forme';
  if (p < 25) return 'Moyen';
  return 'Obèse';
});

const fatCategoryClass = computed(() => {
  const p = parseFloat(fatPercent.value);
  if (isNaN(p)) return '';
  if (p < 5) return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
  if (p < 13) return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  if (p < 17) return 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30';
  if (p < 25) return 'bg-orange-400/20 text-orange-300 border border-orange-400/30';
  return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
});

// Position of marker on the scale bar (0–100%)
// Scale spans 2% to 35%+ (33 percentage points), map fat% to 0–100%
const fatScalePosition = computed(() => {
  const p = parseFloat(fatPercent.value);
  if (isNaN(p)) return '0%';
  const clamped = Math.max(2, Math.min(35, p));
  return `${((clamped - 2) / 33) * 100}%`;
});

const customMetricLabels = {
  muscle_mass_kg: 'Masse Musculaire (kg)',
  weight_kg: 'Poids Impédancemétrie (kg)',
  fat_mass_kg: 'Masse Grasse (kg)',
  kcal_in: 'Calories Consommées (kcal)',
  kcal_sport: 'Dépense Sportive (kcal)',
  total_kcal_expended: 'Dépense Globale (kcal)',
  net_balance: 'Bilan Calorique Net (kcal)',
  proteins_g: 'Protéines (g)',
  carbs_g: 'Glucides (g)',
  sugars_g: 'Sucres (g)',
  fat_g: 'Lipides (g)',
  saturated_fat_g: 'Lipides Saturés (g)',
  fiber_g: 'Fibres (g)',
  salt_g: 'Sel (g)',
  sodium_mg: 'Sodium (mg)',
  calcium_mg: 'Calcium (mg)',
  iron_mg: 'Fer (mg)',
  magnesium_mg: 'Magnésium (mg)',
  vit_c_mg: 'Vitamine C (mg)'
};

const customChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  spanGaps: true, // Connect lines across null values
  scales: {
    x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
    y: { ticks: { color: '#06b6d4' }, grid: { color: '#1e293b' } }
  },
  plugins: {
    legend: { labels: { color: '#f8fafc' } }
  }
};

const correlationOptions = {
  responsive: true,
  maintainAspectRatio: false,
  spanGaps: true,
  scales: {
    x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
    yWeight: {
      type: 'linear',
      display: true,
      position: 'left',
      ticks: { color: '#818cf8' },
      grid: { color: '#1e293b' },
      title: { display: true, text: 'Poids (kg)', color: '#818cf8' }
    },
    yBalance: {
      type: 'linear',
      display: true,
      position: 'right',
      ticks: { color: '#06b6d4' },
      grid: { drawOnChartArea: false },
      title: { display: true, text: 'Bilan Cumulé (kcal)', color: '#06b6d4' }
    }
  },
  plugins: {
    legend: { labels: { color: '#f8fafc' } }
  }
};

const radarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    r: {
      angleLines: { color: '#334155' },
      grid: { color: '#1e293b' },
      pointLabels: { color: '#f8fafc', font: { size: 11 } },
      ticks: { backdropColor: 'transparent', color: '#94a3b8' }
    }
  },
  plugins: {
    legend: { display: false }
  }
};

const mealOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { color: '#f8fafc' } }
  }
};

// Calculate moving average trendline excluding nulls
function calculateMovingAverage(values, windowSize = 7) {
  const result = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const subset = values.slice(start, i + 1).filter(v => v !== null && v !== undefined && !isNaN(v));
    if (subset.length === 0) {
      result.push(null);
    } else {
      const avg = subset.reduce((acc, curr) => acc + curr, 0) / subset.length;
      result.push(Math.round(avg * 10) / 10);
    }
  }
  return result;
}

function extractMetricValue(row, key) {
  const isBiometric = ['muscle_mass_kg', 'weight_kg', 'fat_mass_kg'].includes(key);

  if (isBiometric) {
    if (row.scan && row.scan.has_scan && row.scan[key]) {
      return row.scan[key];
    }
    return null; // Return null on non-scan days to avoid dropping to 0
  }

  let val = 0;
  if (row[key] !== undefined) val = row[key];
  else if (row.micros && row.micros[key] !== undefined) val = row.micros[key];

  if (ignoreZeroes.value && (val === 0 || val === null)) {
    return null;
  }
  return val;
}

const updateCustomChart = () => {
  if (!dashboardRawRows.value || dashboardRawRows.value.length === 0) return;

  const labels = dashboardRawRows.value.map(r => r.date);
  const values = dashboardRawRows.value.map(r => extractMetricValue(r, customMetricKey.value));

  const datasets = [
    {
      label: customMetricLabels[customMetricKey.value] || customMetricKey.value,
      data: values,
      borderColor: '#06b6d4',
      backgroundColor: 'rgba(6, 182, 212, 0.15)',
      pointRadius: 3,
      spanGaps: true,
      fill: false,
      tension: 0.2
    }
  ];

  if (showTrendline.value) {
    const trendValues = calculateMovingAverage(values, 7);
    datasets.push({
      label: 'Courbe de Tendance (Moyenne Mobile 7j)',
      data: trendValues,
      borderColor: '#f59e0b',
      borderWidth: 2.5,
      borderDash: [6, 4],
      pointRadius: 0,
      spanGaps: true,
      fill: false,
      tension: 0.4
    });
  }

  customChartData.value = { labels, datasets };
};

const loadAnalytics = async () => {
  const today = new Date().toISOString().substring(0, 10);
  let start = '2000-01-01';

  if (rangeDays.value !== 9999) {
    const d = new Date();
    d.setDate(d.getDate() - rangeDays.value);
    start = d.toISOString().substring(0, 10);
  }

  const [dashRes, corrRes, radRes, mealRes] = await Promise.all([
    api.get(`/dashboard?start=${start}&end=${today}`),
    api.get(`/analytics/correlation?start=${start}&end=${today}`),
    api.get(`/analytics/radar?start=${start}&end=${today}`),
    api.get(`/analytics/meal-distribution?start=${start}&end=${today}`)
  ]);

  dashboardRawRows.value = dashRes.data.rows || [];
  updateCustomChart();

  // Correlation
  const c = corrRes.data;
  correlationData.value = {
    labels: c.labels,
    datasets: [
      {
        label: 'Bilan Calorique Cumulé (kcal)',
        data: c.series.cumulative_balance_kcal,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true,
        yAxisID: 'yBalance',
        tension: 0.3
      },
      {
        label: 'Poids Impédancemétrie (kg)',
        data: c.series.weight_kg,
        borderColor: '#818cf8',
        backgroundColor: '#818cf8',
        pointRadius: 4,
        spanGaps: true,
        yAxisID: 'yWeight',
        tension: 0.1
      }
    ]
  };

  // Radar
  const r = radRes.data;
  const p = r.percentage_rda || {};
  radarData.value = {
    labels: [
      'Calcium', 'Fer', 'Magnésium', 'Potassium', 'Zinc',
      'Vit C', 'Vit D', 'Vit B12'
    ],
    datasets: [
      {
        label: '% Apport Journalier Recommandé',
        data: [
          p.calcium || 0, p.iron || 0, p.magnesium || 0, p.potassium || 0,
          p.zinc || 0, p.vit_c || 0, p.vit_d || 0, p.vit_b12 || 0
        ],
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10b981',
        pointBackgroundColor: '#10b981'
      }
    ]
  };

  // Meal distribution
  const m = mealRes.data;
  mealTotalKcal.value = m.total_kcal || 0;
  mealData.value = {
    labels: ['Petit Déjeuner', 'Déjeuner', 'Dîner', 'Collation'],
    datasets: [
      {
        data: [
          m.distribution.petit_dejeuner || 0,
          m.distribution.dejeuner || 0,
          m.distribution.diner || 0,
          m.distribution.collation || 0
        ],
        backgroundColor: ['#38bdf8', '#34d399', '#fbbf24', '#f43f5e'],
        borderWidth: 0
      }
    ]
  };
};

const changeRange = (days) => {
  rangeDays.value = days;
  loadAnalytics();
};

onMounted(() => {
  loadAnalytics();
  boditraxStore.fetchScans();
});
</script>

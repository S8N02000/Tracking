<template>
  <div class="space-y-6">
    <!-- Top Bar -->
    <div class="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-white flex items-center gap-2">
          <Activity class="w-6 h-6 text-cyan-400" />
          Suivi Impédancemétrie Boditrax
        </h2>
        <p class="text-xs text-slate-400">Téléversement de fichiers d'exportation CSV et historique des mesures biométriques</p>
      </div>

      <div class="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/20 font-semibold">
        {{ boditraxStore.scans.length }} Scans Enregistrés
      </div>
    </div>

    <!-- Drag and Drop Dropzone -->
    <div
      v-if="authStore.isAuthenticated"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      class="glass-panel p-8 rounded-2xl border-2 border-dashed transition text-center cursor-pointer space-y-3"
      :class="isDragging ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-800 hover:border-slate-700'"
      @click="triggerFileInput"
    >
      <input ref="fileInput" type="file" accept=".csv" class="hidden" @change="handleFileSelect" />

      <UploadCloud class="w-12 h-12 text-cyan-400 mx-auto animate-bounce" />
      <div>
        <h3 class="text-base font-bold text-white">Glissez-déposez votre fichier d'export CSV Boditrax ici</h3>
        <p class="text-xs text-slate-400">ou cliquez pour parcourir les fichiers de votre ordinateur</p>
      </div>

      <div v-if="boditraxStore.uploading" class="text-xs text-cyan-400 font-mono flex items-center justify-center gap-2">
        <span class="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></span>
        Importation et vérification de l'idempotence SQLite en cours...
      </div>

      <div v-if="boditraxStore.uploadResult" class="text-xs text-emerald-400 font-mono font-semibold">
        {{ boditraxStore.uploadResult.message }}
      </div>
    </div>

    <!-- Latest Scan Stats Cards -->
    <div v-if="latestScan" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
        <span class="text-[10px] font-mono text-slate-400 uppercase">Dernier Poids</span>
        <div class="text-xl font-bold font-mono text-indigo-400">{{ latestScan.weight_kg }} kg</div>
        <div class="text-[10px] text-slate-500 font-mono">{{ latestScan.scan_datetime }}</div>
      </div>

      <div class="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
        <span class="text-[10px] font-mono text-slate-400 uppercase">Masse Musculaire</span>
        <div class="text-xl font-bold font-mono text-emerald-400">{{ latestScan.muscle_mass_kg }} kg</div>
        <div class="text-[10px] text-slate-500 font-mono">{{ Math.round((latestScan.muscle_mass_kg / latestScan.weight_kg) * 100) }}% du poids</div>
      </div>

      <div class="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
        <span class="text-[10px] font-mono text-slate-400 uppercase">Masse Grasse</span>
        <div class="text-xl font-bold font-mono text-rose-400">{{ latestScan.fat_mass_kg }} kg</div>
        <div class="text-[10px] text-slate-500 font-mono">{{ Math.round((latestScan.fat_mass_kg / latestScan.weight_kg) * 100) }}% du poids</div>
      </div>

      <div class="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
        <span class="text-[10px] font-mono text-slate-400 uppercase">BMR Métabolisme</span>
        <div class="text-xl font-bold font-mono text-amber-400">{{ latestScan.bmr_kcal }} kcal</div>
        <div class="text-[10px] text-slate-500 font-mono">Âge métabolique: {{ latestScan.metabolic_age }} ans</div>
      </div>
    </div>

    <!-- Scans History Table -->
    <div class="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs font-mono">
          <thead class="bg-slate-900/90 text-slate-300 border-b border-slate-800 uppercase tracking-wider">
            <tr>
              <th class="py-3 px-4">Date & Heure Scan</th>
              <th class="py-3 px-3 text-indigo-400">Poids (kg)</th>
              <th class="py-3 px-3 text-rose-400">Masse Grasse (kg)</th>
              <th class="py-3 px-3 text-emerald-400">Masse Musculaire (kg)</th>
              <th class="py-3 px-3 text-cyan-400">Masse Maigre (kg)</th>
              <th class="py-3 px-3 text-amber-400">BMR (kcal)</th>
              <th class="py-3 px-3 text-yellow-500">Graisse Viscérale</th>
              <th class="py-3 px-3 text-slate-400">Âge Métabolique</th>
              <th class="py-3 px-3 text-slate-400">IMC (BMI)</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-800/60">
            <tr v-for="scan in boditraxStore.scans" :key="scan.id" class="hover:bg-slate-800/40 transition">
              <td class="py-3 px-4 font-bold text-white">{{ scan.scan_datetime }}</td>
              <td class="py-3 px-3 text-indigo-300 font-bold">{{ scan.weight_kg }}</td>
              <td class="py-3 px-3 text-rose-300">{{ scan.fat_mass_kg }}</td>
              <td class="py-3 px-3 text-emerald-300 font-semibold">{{ scan.muscle_mass_kg }}</td>
              <td class="py-3 px-3 text-cyan-300">{{ scan.fat_free_mass_kg }}</td>
              <td class="py-3 px-3 text-amber-300 font-bold">{{ scan.bmr_kcal }}</td>
              <td class="py-3 px-3 text-yellow-400">{{ scan.visceral_fat_rating }}</td>
              <td class="py-3 px-3 text-slate-300">{{ scan.metabolic_age }} ans</td>
              <td class="py-3 px-3 text-slate-400">{{ scan.bmi }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useBoditraxStore } from '@/stores/boditraxStore.js';
import { useAuthStore } from '@/stores/authStore.js';
import { Activity, UploadCloud } from 'lucide-vue-next';

const boditraxStore = useBoditraxStore();
const authStore = useAuthStore();

const fileInput = ref(null);
const isDragging = ref(false);

const latestScan = computed(() => {
  return boditraxStore.scans.length > 0 ? boditraxStore.scans[0] : null;
});

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    boditraxStore.uploadCsvFile(file);
  }
};

const handleDrop = (event) => {
  isDragging.value = false;
  const file = event.dataTransfer.files[0];
  if (file) {
    boditraxStore.uploadCsvFile(file);
  }
};

onMounted(() => {
  boditraxStore.fetchScans();
});
</script>

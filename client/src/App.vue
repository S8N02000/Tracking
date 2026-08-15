<template>
  <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
    <AppHeader />
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
      <router-view />
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs font-mono text-slate-500">
      NutriTrack &copy; 2026 — Plateforme Souveraine de Suivi Nutritionnel & Impédancemétrie Boditrax
    </footer>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import AppHeader from '@/components/AppHeader.vue';
import { useAuthStore } from '@/stores/authStore.js';

const authStore = useAuthStore();

onMounted(() => {
  if (authStore.adminSecret) {
    authStore.verifySecret();
  }
});
</script>

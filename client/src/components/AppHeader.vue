<template>
  <header class="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <!-- Logo & Title -->
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Activity class="w-6 h-6 text-slate-950 font-bold" />
        </div>
        <div>
          <h1 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            NutriTrack
            <span class="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">v1.0 ESM</span>
          </h1>
          <p class="text-xs text-slate-400 hidden sm:block">Plateforme Locale de Suivi Nutritionnel & Impédancemétrie</p>
        </div>
      </div>

      <!-- Desktop Navigation Tabs -->
      <nav class="hidden md:flex items-center space-x-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
        <router-link
          to="/"
          class="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all"
          :class="$route.path === '/' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'"
        >
          <LayoutDashboard class="w-4 h-4" />
          <span>Matrice</span>
        </router-link>

        <router-link
          to="/analytics"
          class="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all"
          :class="$route.path === '/analytics' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'"
        >
          <LineChart class="w-4 h-4" />
          <span>Analyses</span>
        </router-link>

        <router-link
          to="/diagnostics"
          class="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all"
          :class="$route.path === '/diagnostics' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'"
        >
          <Stethoscope class="w-4 h-4" />
          <span>Bilan & Carences</span>
        </router-link>

        <router-link
          to="/logs"
          class="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all"
          :class="$route.path === '/logs' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'"
        >
          <Calendar class="w-4 h-4" />
          <span>Journal</span>
        </router-link>

        <router-link
          to="/foods"
          class="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all"
          :class="$route.path === '/foods' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'"
        >
          <UtensilsCrossed class="w-4 h-4" />
          <span>Aliments</span>
        </router-link>

        <router-link
          to="/recipes"
          class="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all"
          :class="$route.path === '/recipes' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'"
        >
          <BookOpen class="w-4 h-4" />
          <span>Recettes</span>
        </router-link>

        <router-link
          to="/boditrax"
          class="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all"
          :class="$route.path === '/boditrax' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'"
        >
          <Activity class="w-4 h-4" />
          <span>Boditrax</span>
        </router-link>
      </nav>

      <!-- Desktop Auth Controls & Mobile Menu Toggle Button -->
      <div class="flex items-center space-x-3">
        <div class="hidden sm:flex items-center space-x-2">
          <button
            v-if="!authStore.isAuthenticated"
            @click="showAuthModal = true"
            class="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition"
          >
            <Lock class="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>

          <div v-else class="flex items-center space-x-2">
            <span class="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Admin</span>
            </span>
            <button
              @click="reloadDb"
              :disabled="isReloading"
              class="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Forcer la mise à jour des données (同步DB)"
            >
              <RefreshCw class="w-4 h-4" :class="isReloading && 'animate-spin'" />
            </button>
            <button
              @click="authStore.logout()"
              class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title="Déconnexion"
            >
              <Unlock class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Mobile Hamburger Button -->
        <button
          @click="mobileMenuOpen = !mobileMenuOpen"
          class="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          aria-label="Toggle navigation menu"
        >
          <Menu v-if="!mobileMenuOpen" class="w-6 h-6" />
          <X v-else class="w-6 h-6" />
        </button>
      </div>
    </div>

    <!-- Mobile Navigation Drawer -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <div v-if="mobileMenuOpen" class="md:hidden mt-3 p-4 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl space-y-3">
        <nav class="grid grid-cols-2 gap-2">
          <router-link
            to="/"
            @click="mobileMenuOpen = false"
            class="flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-medium"
            :class="$route.path === '/' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'"
          >
            <LayoutDashboard class="w-4 h-4" />
            <span>Matrice</span>
          </router-link>

          <router-link
            to="/analytics"
            @click="mobileMenuOpen = false"
            class="flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-medium"
            :class="$route.path === '/analytics' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'"
          >
            <LineChart class="w-4 h-4" />
            <span>Analyses</span>
          </router-link>

          <router-link
            to="/diagnostics"
            @click="mobileMenuOpen = false"
            class="flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-medium"
            :class="$route.path === '/diagnostics' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'"
          >
            <Stethoscope class="w-4 h-4" />
            <span>Carences</span>
          </router-link>

          <router-link
            to="/logs"
            @click="mobileMenuOpen = false"
            class="flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-medium"
            :class="$route.path === '/logs' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'"
          >
            <Calendar class="w-4 h-4" />
            <span>Journal</span>
          </router-link>

          <router-link
            to="/foods"
            @click="mobileMenuOpen = false"
            class="flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-medium"
            :class="$route.path === '/foods' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'"
          >
            <UtensilsCrossed class="w-4 h-4" />
            <span>Aliments</span>
          </router-link>

          <router-link
            to="/recipes"
            @click="mobileMenuOpen = false"
            class="flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-medium"
            :class="$route.path === '/recipes' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'"
          >
            <BookOpen class="w-4 h-4" />
            <span>Recettes</span>
          </router-link>

          <router-link
            to="/boditrax"
            @click="mobileMenuOpen = false"
            class="flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-medium"
            :class="$route.path === '/boditrax' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'"
          >
            <Activity class="w-4 h-4" />
            <span>Boditrax</span>
          </router-link>
        </nav>

        <div class="pt-3 border-t border-slate-800 flex justify-between items-center">
          <span class="text-xs text-slate-400 font-mono">Statut Admin:</span>
          <button
            v-if="!authStore.isAuthenticated"
            @click="showAuthModal = true; mobileMenuOpen = false;"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"
          >
            Connexion Admin
          </button>
          <div v-else class="flex items-center space-x-2">
            <span class="text-xs font-mono text-emerald-400 font-semibold">Connecté</span>
            <button @click="reloadDb" :disabled="isReloading" class="px-2 py-1 rounded-lg text-slate-400 hover:text-cyan-400 bg-slate-800 border border-slate-700 text-xs font-mono disabled:opacity-50" title="Forcer la mise à jour DB">
              <RefreshCw class="w-3.5 h-3.5 inline" :class="isReloading && 'animate-spin'" />
            </button>
            <button @click="authStore.logout()" class="text-xs text-rose-400 underline">Déconnexion</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Auth Modal -->
    <div v-if="showAuthModal" class="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="glass-panel max-w-md w-full rounded-2xl p-6 border border-slate-800 shadow-2xl">
        <h3 class="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Lock class="w-5 h-5 text-amber-400" />
          Authentification Administration
        </h3>
        <p class="text-sm text-slate-400 mb-4">
          Saisissez votre secret administrateur pour déverrouiller l'enregistrement des repas, l'import Boditrax et les modifications.
        </p>

        <form @submit.prevent="handleLogin">
          <input
            v-model="inputSecret"
            type="password"
            placeholder="ADMIN_SECRET..."
            class="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 mb-4 font-mono text-sm"
            required
          />

          <p v-if="loginError" class="text-xs text-rose-400 mb-4">{{ loginError }}</p>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="showAuthModal = false"
              class="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              class="px-5 py-2 rounded-xl text-sm font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
            >
              Valider Jeton
            </button>
          </div>
        </form>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/authStore.js';
import {
  LayoutDashboard, LineChart, Stethoscope, Calendar, UtensilsCrossed,
  BookOpen, Activity, Lock, Unlock, Menu, X, RefreshCw
} from 'lucide-vue-next';

const authStore = useAuthStore();
const showAuthModal = ref(false);
const mobileMenuOpen = ref(false);
const inputSecret = ref('');
const loginError = ref('');
const isReloading = ref(false);

const handleLogin = async () => {
  loginError.value = '';
  const success = await authStore.login(inputSecret.value);
  if (success) {
    showAuthModal.value = false;
    inputSecret.value = '';
  } else {
    loginError.value = 'Secret administrateur invalide.';
  }
};

const reloadDb = async () => {
  isReloading.value = true;
  try {
    const res = await fetch('/api/admin/reload-db', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_secret')}` }
    });
    if (!res.ok) throw new Error('Server error');
    // Refresh current page data
    window.location.reload();
  } catch (err) {
    alert('Erreur lors du rechargement de la DB : ' + err.message);
  } finally {
    isReloading.value = false;
  }
};
</script>

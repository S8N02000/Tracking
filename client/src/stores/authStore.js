import { defineStore } from 'pinia';
import api from '@/api/client.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    adminSecret: localStorage.getItem('admin_secret') || '',
    isAuthenticated: false,
    loading: false,
    error: null
  }),
  actions: {
    async verifySecret(secret = null) {
      const token = secret !== null ? secret : this.adminSecret;
      if (!token) {
        this.isAuthenticated = false;
        return false;
      }

      this.loading = true;
      this.error = null;

      try {
        await api.post(
          '/auth/verify',
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        this.adminSecret = token;
        this.isAuthenticated = true;
        localStorage.setItem('admin_secret', token);
        return true;
      } catch (err) {
        this.isAuthenticated = false;
        this.error = 'Jeton administrateur invalide.';
        return false;
      } finally {
        this.loading = false;
      }
    },
    login(secret) {
      return this.verifySecret(secret);
    },
    logout() {
      this.adminSecret = '';
      this.isAuthenticated = false;
      localStorage.removeItem('admin_secret');
    }
  }
});

import { defineStore } from 'pinia';
import api from '@/api/client.js';

export const useBoditraxStore = defineStore('boditrax', {
  state: () => ({
    scans: [],
    uploading: false,
    uploadResult: null,
    loading: false,
    error: null
  }),
  actions: {
    async fetchScans() {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/boditrax/scans');
        this.scans = res.data || [];
      } catch (err) {
        this.error = 'Erreur lors du chargement de l\'historique des scans Boditrax.';
      } finally {
        this.loading = false;
      }
    },
    async uploadCsvFile(file) {
      this.uploading = true;
      this.error = null;
      this.uploadResult = null;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await api.post('/boditrax/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        this.uploadResult = res.data;
        await this.fetchScans();
        return res.data;
      } catch (err) {
        this.error = err.response?.data?.message || 'Erreur lors du téléversement du fichier Boditrax.';
        throw err;
      } finally {
        this.uploading = false;
      }
    }
  }
});

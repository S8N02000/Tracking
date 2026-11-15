import { defineStore } from 'pinia';
import api from '@/api/client.js';
import { getTodayLocalDate, shiftDaysLocal } from '@/utils/dateUtils.js';

export const useDashboardStore = defineStore('dashboard', {
  state: () => {
    const today = getTodayLocalDate();
    const sevenDaysAgo = shiftDaysLocal(today, -7);

    return {
      periodType: 7, // 0 (today), 7, 30, 90, 'custom'
      startDate: sevenDaysAgo,
      endDate: today,
      rows: [],
      queryInfo: null,
      loading: false,
      error: null
    };
  },
  actions: {
    setDateRange(start, end) {
      this.periodType = 'custom';
      this.startDate = start;
      this.endDate = end;
      return this.fetchDashboard();
    },
    setQuickPeriod(days) {
      this.periodType = days;
      const today = getTodayLocalDate();
      if (days === 0) {
        this.startDate = today;
        this.endDate = today;
      } else {
        this.startDate = shiftDaysLocal(today, -days);
        this.endDate = today;
      }
      return this.fetchDashboard();
    },
    shiftPeriod(direction) {
      // direction: -1 (previous period), 1 (next period)
      let daysToShift = 7;
      if (typeof this.periodType === 'number' && this.periodType > 0) {
        daysToShift = this.periodType;
      } else if (this.periodType === 0) {
        daysToShift = 1;
      } else {
        // Compute delta between startDate and endDate
        const s = new Date(this.startDate);
        const e = new Date(this.endDate);
        daysToShift = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
      }

      this.startDate = shiftDaysLocal(this.startDate, direction * daysToShift);
      this.endDate = shiftDaysLocal(this.endDate, direction * daysToShift);

      return this.fetchDashboard();
    },
    resetToCurrent() {
      return this.setQuickPeriod(this.periodType === 'custom' ? 7 : this.periodType);
    },
    async fetchDashboard() {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get(`/dashboard?start=${this.startDate}&end=${this.endDate}`);
        this.rows = res.data.rows || [];
        this.queryInfo = res.data.query_info || null;
      } catch (err) {
        this.error = 'Erreur lors du chargement de la matrice du tableau de bord.';
      } finally {
        this.loading = false;
      }
    }
  }
});

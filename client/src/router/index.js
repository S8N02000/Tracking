import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '@/views/DashboardView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: () => import('@/views/AnalyticsView.vue')
    },
    {
      path: '/diagnostics',
      name: 'diagnostics',
      component: () => import('@/views/DiagnosticsView.vue')
    },
    {
      path: '/logs',
      name: 'logs',
      component: () => import('@/views/JournalView.vue')
    },
    {
      path: '/foods',
      name: 'foods',
      component: () => import('@/views/FoodsView.vue')
    },
    {
      path: '/recipes',
      name: 'recipes',
      component: () => import('@/views/RecipesView.vue')
    },
    {
      path: '/boditrax',
      name: 'boditrax',
      component: () => import('@/views/BoditraxView.vue')
    }
  ]
});

export default router;

import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/today' },
    { path: '/today', component: () => import('~/views/TodayView.vue'), meta: { tab: 'today' } },
    { path: '/levels', component: () => import('~/views/LevelsView.vue'), meta: { tab: 'levels' } },
    { path: '/journal', component: () => import('~/views/JournalView.vue'), meta: { tab: 'journal' } },
    { path: '/settings', component: () => import('~/views/SettingsView.vue'), meta: { tab: 'settings' } },
    { path: '/challenge/:id/:page(read|track)?', component: () => import('~/views/ChallengeView.vue'), meta: { hideTabs: true } },
    { path: '/onboarding', component: () => import('~/views/OnboardingView.vue'), meta: { hideTabs: true } },
    { path: '/custom/new', component: () => import('~/views/CustomView.vue'), meta: { hideTabs: true } },
    { path: '/:pathMatch(.*)*', redirect: '/today' },
  ],
})

import type { Component } from 'vue'
import type { Locale, TrackerKind } from '~/data/challenges'
import type { DayEntry } from '~/lib/progress'
import { defineAsyncComponent } from 'vue'
import { tr } from '~/i18n/translate'
import { formatClock } from '~/lib/date'

type Summary = (d: DayEntry, l?: Locale) => string

const lazy = (loader: () => Promise<{ default: Component }>) => defineAsyncComponent({ loader, delay: 0 })

const mins = (ms?: number) => (ms ? `${Math.floor(ms / 60000)}′${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}` : '')

export const TRACKERS: Record<TrackerKind, { component: Component, summary?: Summary }> = {
  walk: { component: lazy(() => import('./WalkTracker.vue')), summary: d => d.data.elapsed ? `${Math.round(d.data.elapsed / 60000)} min${d.data.steps ? ` · ${d.data.steps} ${tr('steps')}` : ''}` : '' },
  sunrise: { component: lazy(() => import('./SunriseTracker.vue')), summary: d => d.data.wake ?? '' },
  vitamins: { component: lazy(() => import('./VitaminsTracker.vue')), summary: d => [...(d.data.fruits ?? []), ...(d.data.veggies ?? [])].filter(Boolean).join(', ') },
  sober: { component: lazy(() => import('./SoberTracker.vue')), summary: d => d.data.cravings ? `${d.data.cravings} ${tr('craving(s) beaten')}` : '' },
  sweep: { component: lazy(() => import('./SweepTracker.vue')), summary: d => d.data.rooms?.length ? `${d.data.rooms.length} ${tr('room(s)')}` : '' },
  meals: { component: lazy(() => import('./MealsTracker.vue')), summary: d => [d.data.lunch && tr('Lunch'), d.data.dinner && tr('Dinner')].filter(Boolean).join(' · ') },
  hold: { component: lazy(() => import('./HoldTracker.vue')) },
  ted: { component: lazy(() => import('./TedTracker.vue')), summary: d => d.data.topic ?? '' },
  stretch: { component: lazy(() => import('./StretchTracker.vue')), summary: d => mins(d.data.elapsed) },
  toss: { component: lazy(() => import('./TossTracker.vue')), summary: d => (d.data.objects ?? []).join(', ') },
  meditate: { component: lazy(() => import('./MeditateTracker.vue')), summary: d => mins(d.data.elapsed) },
  cold: { component: lazy(() => import('./ColdTracker.vue')), summary: d => d.data.best ? formatClock(d.data.best) : '' },
  yes: { component: lazy(() => import('./YesTracker.vue')), summary: d => d.data.note ?? '' },
  photo: { component: lazy(() => import('./PhotoTracker.vue')), summary: d => d.data.photo ? tr('Photo ✓') : '' },
  gratitude: { component: lazy(() => import('./GratitudeTracker.vue')), summary: d => (d.data.items ?? []).some(Boolean) ? `${(d.data.items ?? []).filter(Boolean).length}/3` : '' },
  water: { component: lazy(() => import('./WaterTracker.vue')), summary: d => d.data.glasses ? `${d.data.glasses} ${tr('glasses of water')}` : '' },
  read: { component: lazy(() => import('./ReadTracker.vue')), summary: d => d.data.pages ? `${d.data.pages} ${tr('pages')}` : '' },
  sketch: { component: lazy(() => import('./SketchTracker.vue')), summary: d => d.data.subject ?? '' },
  offline: { component: lazy(() => import('./OfflineTracker.vue')), summary: d => mins(d.data.elapsed) },
  complain: { component: lazy(() => import('./ComplainTracker.vue')), summary: d => d.data.switches ? `${d.data.switches} ${tr('switch(es)')}` : '' },
  stairs: { component: lazy(() => import('./StairsTracker.vue')), summary: d => d.data.floors ? `${d.data.floors} ${tr('floors')}` : '' },
  pushups: { component: lazy(() => import('./PushupsTracker.vue')), summary: d => d.data.count ? `${d.data.count}` : '' },
  stranger: { component: lazy(() => import('./StrangerTracker.vue')), summary: d => d.data.note ?? '' },
  sugar: { component: lazy(() => import('./SugarTracker.vue')), summary: d => d.data.temptations ? `${d.data.temptations} ${tr('temptation(s)')}` : '' },
  explore: { component: lazy(() => import('./ExploreTracker.vue')), summary: d => d.data.street ?? '' },
  curfew: { component: lazy(() => import('./CurfewTracker.vue')), summary: d => d.data.bed ?? '' },
  pages: { component: lazy(() => import('./PagesTracker.vue')), summary: d => d.data.words ? `${d.data.words} ${tr('words')}` : '' },
  fear: { component: lazy(() => import('./FearTracker.vue')), summary: d => d.data.what ?? '' },
  messenger: { component: lazy(() => import('./MessengerTracker.vue')), summary: d => d.data.who ?? '' },
  fast: { component: lazy(() => import('./FastTracker.vue')), summary: d => d.data.fasted ? `${(d.data.fasted / 3_600_000).toFixed(1)} h` : '' },
  plank: { component: lazy(() => import('./PlankTracker.vue')) },
  firsthour: { component: lazy(() => import('./FirstHourTracker.vue')) },
  cook: { component: lazy(() => import('./CookTracker.vue')) },
  words: { component: lazy(() => import('./WordsTracker.vue')) },
  standup: { component: lazy(() => import('./StandupTracker.vue')) },
  declutter: { component: lazy(() => import('./DeclutterTracker.vue')) },
  nospend: { component: lazy(() => import('./NoSpendTracker.vue')) },
  call: { component: lazy(() => import('./CallTracker.vue')) },
  kindness: { component: lazy(() => import('./KindnessTracker.vue')) },
  nature: { component: lazy(() => import('./NatureTracker.vue')) },
  memory: { component: lazy(() => import('./MemoryTracker.vue')) },
  detox: { component: lazy(() => import('./DetoxTracker.vue')) },
  practice: { component: lazy(() => import('./PracticeTracker.vue')) },
  dance: { component: lazy(() => import('./DanceTracker.vue')) },
  forgive: { component: lazy(() => import('./ForgiveTracker.vue')), summary: d => d.data.who ? `${d.data.who}${d.data.how ? ` · ${d.data.how}` : ''}` : '' },
  still: { component: lazy(() => import('./StillTracker.vue')) },
  compliment: { component: lazy(() => import('./ComplimentTracker.vue')), summary: d => d.data.to ? `${d.data.to}: ${d.data.did ?? d.data.words ?? ''}` : '' },
  listen: { component: lazy(() => import('./ListenTracker.vue')), summary: d => d.data.who ? `${d.data.who} · ${Math.round((d.data.elapsed ?? 0) / 60000)} min` : '' },
  sunset: { component: lazy(() => import('./SunsetTracker.vue')) },
  focus: { component: lazy(() => import('./FocusTracker.vue')) },
  review: { component: lazy(() => import('./ReviewTracker.vue')) },
  letter: { component: lazy(() => import('./LetterTracker.vue')), summary: d => d.data.text ? `${String(d.data.text).trim().split(/\s+/).length} ${tr('words')}` : '' },
  custom: { component: lazy(() => import('./HoldTracker.vue')) },
}

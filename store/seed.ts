const iso = (d: Date) => d.toISOString().slice(0, 10)
const today = new Date()
const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
const at = (w: number) => { const d = new Date(monday); d.setDate(d.getDate() - 7 * w); return iso(d) }
const full = (extra: (i: number) => any) => Array.from({ length: 7 }, (_, i) => ({ done: true, data: extra(i) }))
const doneRun = (id: string, w: number, extra: (i: number) => any = () => ({})) => ({ id: `${id}-r`, challengeId: id, start: at(w), completedAt: Date.now() - w * 86400000, days: full(extra) })
const todayIdx = (today.getDay() + 6) % 7
const live = { id: 'mq06-live', challengeId: 'mq06', start: at(0), days: Array.from({ length: 7 }, (_, i) => ({ done: i < todayIdx, data: i < todayIdx ? { lunch: true, dinner: true } : {} })) }
export const state = {
  version: 1,
  custom: [],
  jokers: { earned: [{ kind: 'share', at: Date.now() - 86400000 * 3 }], used: [] },
  settings: { locale: 'auto', i18nV2: true, sound: true, haptics: true, reminder: '09:00', evening: '21:30', wakeAlarm: '05:45', wakeAuto: true, hardcore: false, onboarded: true, debug: false, unlockAll: false },
  runs: [
    doneRun('mq01', 5, i => ({ elapsed: (20 + i * 5) * 60000, steps: 2800 + i * 450 })),
    doneRun('mq02', 4, () => ({ wake: '06:12' })),
    doneRun('mq03', 3, () => ({ fruits: ['Apple', 'Kiwi'], veggies: ['Carrot', 'Spinach'] })),
    doneRun('mq04', 2, () => ({ cravings: 1 })),
    doneRun('mq05', 1, () => ({ rooms: ['Kitchen', 'Bathroom'] })),
    live,
  ],
}
if (import.meta.main)
  console.log(JSON.stringify(state))

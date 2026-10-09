import type { App } from 'vue'
import { tr } from './i18n/translate'

const en = {
  tabs: { today: 'Today', levels: 'Levels', journal: 'Notebook', settings: 'Settings' },
  common: {
    day: 'Day {n}',
    done: 'Done',
    start: 'Start',
    cancel: 'Cancel',
    save: 'Save',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    tips: 'Tips',
    startDate: 'Challenge start date',
    monday: 'Monday',
    level: 'Level {n}',
    minutes: '{n} min',
    seconds: '{n} s',
    of: 'of',
    abandon: 'Give up',
    restart: 'Restart',
    open: 'Open',
    continue: 'Continue',
  },
  home: {
    hello: 'Hello',
    mondayHello: 'Monday morning.',
    noQuest: 'No challenge in progress.',
    pickOne: 'Pick your next challenge and start on Monday morning.',
    nextUp: 'Next challenge',
    todayTask: 'Today',
    dayOf: 'Day {n} of 7',
    startsIn: 'Starts Monday',
    streak: 'days in a row | day in a row | days in a row',
    checks: 'boxes ticked',
    completed: 'challenges done',
    finishing: 'All 7 days are ticked. Stamp DONE!',
    missed: 'The week is over.',
  },
  start: {
    title: 'When do you start?',
    nextMonday: 'Next Monday',
    now: 'Right now',
    nowHint: 'Day 1 = today',
    mondayHint: 'The true spirit of Monday Quest',
    hardcore: 'Hardcore: the whole level this week',
  },
  detail: {
    track: 'Track',
    read: 'Read',
    swipe: 'Turn the page',
    completedOn: 'Completed on {date}',
    locked: 'Finish the previous level to unlock this challenge.',
  },
  done: {
    title: 'Challenge complete',
    subtitle: 'You are a more resilient version of yourself.',
    share: 'Share',
    levelUp: 'Level {n} complete!',
  },
  journal: {
    title: 'Notebook',
    empty: 'Your notebook will fill up week after week.',
    week: 'Week of {date}',
    stats: 'Stats',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    auto: 'Automatic',
    sound: 'Sounds',
    haptics: 'Haptics',
    reminder: 'Daily reminder',
    evening: 'Evening reminder',
    wakeAlarm: '"Rising sun" alarm',
    hardcore: 'Hardcore mode',
    hardcoreHint: 'Start all 5 challenges of a level the same week.',
    notifications: 'Notifications',
    enableNotifications: 'Enable notifications',
    widget: 'Widget & Live Activity',
    widgetHint: 'Long-press your home screen, tap +, search for Monday Quest. It updates by itself, and you can tick the day right from the widget.',
    custom: 'My challenges',
    createCustom: 'Create a challenge',
    about: 'About',
    aboutText: '52 challenges, a new one every Monday morning. A whole year.',
    version: 'Version',
    update: 'Update',
    reset: 'Erase everything',
    resetConfirm: 'Erase all your progress?',
    review: 'Rate the app',
    health: 'Health notice',
    healthText: 'Some challenges ask you to change your habits significantly. Make sure your physical and mental health allow you to take on such an adventure. If in doubt, talk to your doctor.',
  },
  custom: {
    title: 'New challenge',
    name: 'Challenge name',
    short: 'Challenge description',
    long: 'Long description',
    tip: 'Tips',
    icon: 'Pictogram',
    category: 'Category',
    create: 'Create',
    bonus: 'Bonus level',
  },
  onboarding: {
    preface: 'Preface',
    p1: 'Monday Quest is a personal growth tool made of 52 challenges, one week each: one a week for a year.',
    p2: 'The goal of this adventure is to help you step out of your comfort zone, discover new habits and become "a better version of yourself".',
    how: 'How does it work?',
    h1: 'Every challenge starts on a Monday morning and lasts 7 days.',
    h2: 'Tick each day. On the seventh, stamp DONE.',
    h3: '11 levels, 52 weeks. Finish a level to unlock the next.',
    begin: 'Begin the adventure',
    allow: 'Allow reminders',
  },
  notif: {
    mondayTitle: 'Monday morning',
    mondayBody: 'A new challenge starts today: {title}.',
    dailyTitle: '{title} — day {n}',
    dailyBody: 'Did you tick your box today?',
    eveningTitle: 'Before bed',
    eveningBody: 'Take a minute to fill in your notebook.',
    actionDone: 'Done ✓',
    actionLater: 'Later',
  },
}

type Messages = typeof en

function lookup(path: string): string | undefined {
  let cur: any = en
  for (const part of path.split('.'))
    cur = cur?.[part]
  return typeof cur === 'string' ? cur : undefined
}

/** Every English message string, for prefetching translations. */
export function allMessages(obj: any = en, out: string[] = []): string[] {
  for (const v of Object.values(obj)) {
    if (typeof v === 'string')
      out.push(...v.split(' | '))
    else if (v && typeof v === 'object')
      allMessages(v, out)
  }
  return out
}

/** Translate a message key; {placeholders} are filled after translation so they stay cacheable. */
export function t(key: string, params?: Record<string, unknown> | number): string {
  let source = lookup(key)
  if (source === undefined)
    return key
  // Plural messages "zero | one | many": pick the English form, translate that form only.
  if (typeof params === 'number') {
    const forms = source.split(' | ')
    source = forms.length === 3 ? forms[params === 0 ? 0 : params === 1 ? 1 : 2]! : forms.length === 2 ? forms[params === 1 ? 0 : 1]! : source
    params = { n: params, count: params }
  }
  const text = tr(source)
  const p = params
  return p ? text.replace(/\{(\w+)\}/g, (m, k) => (k in p ? String(p[k]) : m)) : text
}

export const i18n = {
  install(app: App) {
    app.config.globalProperties.$t = t
  },
  global: { t },
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $t: typeof t
  }
}

export type { Messages }

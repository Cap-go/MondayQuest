import type { Def } from '../challenges'

export const LEVEL_11: Def[] = [
  // ───────────── NIVEAU XI — LA BOUCLE ─────────────
  {
    n: 51,
    level: 11,
    icon: 'loop',
    tracker: 'review',
    category: 'growth',
    text: {
      title: 'Rewind',
      short: 'Reread your notebook, one level a day, and write down what changed, for a week.',
      body: [
        'A year of challenges is fifty weeks of effort, misses and small wins. We move so fast that we forget where we started.',
        'Looking back lets you measure the road, keep what took root and choose what you want to carry into next year.',
      ],
      tip: 'For each level, ask yourself: what am I still doing today? One line is enough, but be honest.',
    },
  },
  {
    n: 52,
    level: 11,
    icon: 'envelope',
    tracker: 'letter',
    category: 'growth',
    text: {
      title: 'Dear future me',
      short: 'Write one paragraph a day of a letter to yourself. On day seven, seal it: it comes back in exactly one year.',
      body: [
        'You have just spent a year of Mondays changing small things. Write down who you are today: what changed, what you are proud of, what still scares you, what you hope for.',
        'One paragraph a day, then the letter is sealed. The app keeps it closed and gives it back to you in a year, when you will be able to see how far you went.',
      ],
      tip: 'Be specific and honest: names, places, the small details you will have forgotten. Ask your future self a question or two.',
    },
  },
]

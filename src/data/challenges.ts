import { LEVEL_7 } from './levels/level7'
import { LEVEL_8 } from './levels/level8'
import { LEVEL_9 } from './levels/level9'
// 52 challenges, one for every week of the year: 10 levels of 5 plus a 2-week finale.
// Levels VII–XI live in ./levels/ to keep this file readable.
import { LEVEL_10 } from './levels/level10'
import { LEVEL_11 } from './levels/level11'

/** Content is written once, in English; any other language comes from the translation worker. */
export type Locale = string
export type Category = 'health' | 'growth' | 'wellbeing'

export type TrackerKind
  = | 'walk' // pedometer + 30 min walk timer
    | 'sunrise' // wake-up time + alarm
    | 'vitamins' // 2 fruits + 2 vegetables
    | 'sober' // live clean clock + craving water glass
    | 'sweep' // wipe the dust off the screen
    | 'meals' // lunch / dinner chew pacer
    | 'hold' // long-press commitment ring
    | 'ted' // talk topic + in-app browser
    | 'stretch' // guided stretching sequence
    | 'toss' // throw an object in the bin
    | 'meditate' // breathing circle + bell
    | 'cold' // cold shower stopwatch with frost
    | 'yes' // OUI stamp + note
    | 'photo' // a portrait a day (no selfies)
    | 'gratitude' // three good things, dictation
    | 'water' // tilt the bottle, 8 glasses
    | 'read' // page flip counter
    | 'sketch' // draw on canvas
    | 'offline' // one hour offline, network watch
    | 'complain' // bracelet swap counter
    | 'stairs' // barometer floors
    | 'pushups' // nose-tap push-up counter
    | 'stranger' // conversation log
    | 'sugar' // sugar cube dissolving
    | 'explore' // compass + new street
    | 'curfew' // bedtime + light sensor
    | 'pages' // morning pages word count
    | 'fear' // fear thermometer before/after
    | 'messenger' // envelope to a loved one
    | 'fast' // 16:8 fasting clock
    | 'plank'
    | 'firsthour'
    | 'cook'
    | 'words'
    | 'standup'
    | 'declutter'
    | 'nospend'
    | 'call'
    | 'kindness'
    | 'nature'
    | 'memory'
    | 'detox'
    | 'practice'
    | 'dance'
    | 'forgive'
    | 'still'
    | 'compliment'
    | 'listen'
    | 'sunset'
    | 'focus'
    | 'review'
    | 'share'
    | 'custom' // user-made challenge

export type IconName
  = | 'foot' | 'sunrise' | 'apple' | 'pill' | 'broom' | 'cutlery' | 'dot' | 'nodes' | 'stretch' | 'minus'
    | 'stones' | 'shower' | 'ok' | 'frame' | 'heart' | 'drop' | 'book' | 'pencil' | 'plane' | 'band'
    | 'stairs' | 'arms' | 'bubble' | 'cube' | 'compass' | 'moon' | 'lines' | 'flame' | 'envelope' | 'clock' | 'star' | 'lock' | 'joker' | 'ear' | 'feather'
    | 'plank' | 'phone' | 'pot' | 'cards' | 'chair' | 'box' | 'coin' | 'dial' | 'seed' | 'leaf' | 'calendar' | 'nosign' | 'note' | 'wave' | 'bed' | 'still' | 'ribbon' | 'balls' | 'sunset' | 'tomato' | 'loop' | 'share'

export interface ChallengeText {
  title: string
  short: string
  body: string[]
  tip: string
}

export interface Challenge {
  id: string
  n: number
  level: number
  icon: IconName
  tracker: TrackerKind
  category: Category
  source: 'book' | 'quest' | 'custom'
  text: ChallengeText
}

export interface Level {
  n: number
  roman: string
  text: string
}

export const LEVELS: Level[] = [
  { n: 1, roman: 'I', text: 'Breaking free' },
  { n: 2, roman: 'II', text: 'Emancipation' },
  { n: 3, roman: 'III', text: 'At the foot of the mountain' },
  { n: 4, roman: 'IV', text: 'The climb' },
  { n: 5, roman: 'V', text: 'The ridge' },
  { n: 6, roman: 'VI', text: 'The summit' },
  { n: 7, roman: 'VII', text: 'Second wind' },
  { n: 8, roman: 'VIII', text: 'The headland' },
  { n: 9, roman: 'IX', text: 'Open sea' },
  { n: 10, roman: 'X', text: 'The horizon' },
  { n: 11, roman: 'XI', text: 'Full circle' },
]

export const CATEGORY_LABEL: Record<Category, string> = {
  health: 'Health',
  growth: 'Personal growth',
  wellbeing: 'Well-being',
}

export type Def = Omit<Challenge, 'id' | 'source'>

const defs: Def[] = [
  // ───────────── NIVEAU I — L'AFFRANCHISSEMENT ─────────────
  {
    n: 1,
    level: 1,
    icon: 'foot',
    tracker: 'walk',
    category: 'health',
    text: {
      title: 'The stroller',
      short: 'Walk every day: 20 minutes on day one, 5 more each day, 50 by day seven.',
      body: [
        'Walking has countless benefits. Walking regularly lowers your risk of cardiovascular disease, cancer and diabetes.',
        'Beyond lowering the risk of serious illness, walking sharpens your thinking and gives you a real break in your day.',
      ],
      tip: 'Block a slot every day for a stroll. Empty your mind, try to think about nothing and enjoy what surrounds you.',
    },
  },
  {
    n: 2,
    level: 1,
    icon: 'sunrise',
    tracker: 'sunrise',
    category: 'growth',
    text: {
      title: 'Rising sun',
      short: 'Wake up before sunrise every day for a week.',
      body: [
        'Getting up early has many perks. Best-sellers like Hal Elrod\'s Miracle Morning swear by it. Waking before everyone else strengthens your discipline and tames your willpower.',
        'It is also a chance to enjoy the quiet of the morning and think calmly about your day, your duties and your desires before the rush begins!',
      ],
      tip: 'The app works out sunrise where you are and sets a real alarm 15 minutes before. Don\'t snooze: jump out of bed at the very first ring!',
    },
  },
  {
    n: 3,
    level: 1,
    icon: 'apple',
    tracker: 'vitamins',
    category: 'health',
    text: {
      title: 'Vitamin N',
      short: 'Eat at least two different fruits and two different vegetables every day for a week.',
      body: [
        'Vitamins are essential to life ("vita" in Latin). A balanced diet is how you get enough of them to avoid deficiencies and stay healthy!',
        'Eating at least two different vegetables and two different fruits a day fills you up with vitamins — and with vitality!',
      ],
      tip: 'Go for organic, seasonal produce. The goal is a vitamin cure, not a pesticide one!',
    },
  },
  {
    n: 4,
    level: 1,
    icon: 'pill',
    tracker: 'sober',
    category: 'health',
    text: {
      title: 'High on life',
      short: 'Abstain from any non-prescribed substance for a week.',
      body: [
        'Caffeine, theine, nicotine and alcohol are part of everyday life. Yet they are stimulants you can grow addicted to.',
        'Going a week without any non-prescribed substance strengthens your will and boosts your self-esteem. It is a chance to free yourself from every addiction — and that is real freedom!',
      ],
      tip: 'When you crave a coffee or a cigarette, pour yourself a big glass of water instead.',
    },
  },
  {
    n: 5,
    level: 1,
    icon: 'broom',
    tracker: 'sweep',
    category: 'wellbeing',
    text: {
      title: 'Spotless',
      short: 'Clean your home and live in an immaculate space for a week.',
      body: [
        'A clean, organised space benefits your mind and your health, and even sparks creativity. It also reduces allergy risks and gets rid of the contaminants living in your home.',
        'Clean, tidy and rethink how things are organised. Enjoy the result and live in a stimulating, inspiring environment.',
      ],
      tip: 'Sleep quality reportedly improves by 20% on average in clean sheets.',
    },
  },

  // ───────────── NIVEAU II — L'ÉMANCIPATION ─────────────
  {
    n: 6,
    level: 2,
    icon: 'cutlery',
    tracker: 'meals',
    category: 'health',
    text: {
      title: 'Forks up',
      short: 'Chew every bite of your meals slowly for a week.',
      body: [
        'Eating too fast doubles the risk of obesity, dulls the feeling of fullness and keeps your digestive system from working properly.',
        'You miss the taste of your food and a moment of sharing with family, friends or colleagues.',
        'Be present, put your cutlery down and chew every bite slowly.',
      ],
      tip: 'Start the meal with a big glass of water to curb hunger and help you feel full.',
    },
  },
  {
    n: 7,
    level: 2,
    icon: 'dot',
    tracker: 'hold',
    category: 'growth',
    text: {
      title: 'Secular abstinence',
      short: 'Practise sexual abstinence. No sex, no masturbation, no pornographic or erotic films for a week.',
      body: [
        'Sex is good for your mood and your heart, and can even lower your blood pressure. It is one of the pillars of our lives. Yet a period of abstinence lets you reconnect with your body and your desires.',
        'The result speaks for itself: through this spiritual adventure you learn to master your impulses and your self-control improves. Abstinence might even reset your libido.',
      ],
      tip: 'You will feel a surge of energy — use it for the tasks you keep putting off!',
    },
  },
  {
    n: 8,
    level: 2,
    icon: 'nodes',
    tracker: 'ted',
    category: 'growth',
    text: {
      title: 'Back to school',
      short: 'Watch a TED talk every day for a week.',
      body: [
        'TED (Technology, Entertainment and Design) talks exist to spread ideas worth spreading. They cover science, arts, politics, global issues, architecture, music and many other fields.',
        'The format is simple: one topic, one mic, one talk, from five minutes to an hour. Perfect to learn something new every day and spark your creativity.',
      ],
      tip: 'Browse ted.com under "Discover" and pick a topic that interests you each day.',
    },
  },
  {
    n: 9,
    level: 2,
    icon: 'stretch',
    tracker: 'stretch',
    category: 'wellbeing',
    text: {
      title: 'Feline flexibility',
      short: 'Stretch for at least 15 minutes every day for a week.',
      body: [
        'Stretching is not just for elite athletes. It keeps you mobile and independent, and keeps your muscles healthy, flexible and strong.',
        'Do about fifteen minutes of stretching to loosen your muscles, relax and move better.',
      ],
      tip: 'Start with the upper body and finish with the legs. Don\'t pull too hard — listen to your body!',
    },
  },
  {
    n: 10,
    level: 2,
    icon: 'minus',
    tracker: 'toss',
    category: 'growth',
    text: {
      title: 'Bare minimum',
      short: 'Throw away at least one object every day for a week.',
      body: [
        'Minimalism is booming. Born in Japan as a reaction to materialism, the idea is to part with everything that is useless — or rather, not essential. It frees up space in your home and, above all, in your head.',
        'Go through your cupboards and throw away (or give, or sell) whatever is not essential.',
      ],
      tip: 'Start by getting rid of everything you own twice!',
    },
  },

  // ───────────── NIVEAU III — AU PIED DE LA MONTAGNE ─────────────
  {
    n: 11,
    level: 3,
    icon: 'stones',
    tracker: 'meditate',
    category: 'wellbeing',
    text: {
      title: 'Zen chef',
      short: 'Meditate every day: 5 minutes on day one, building up to 15 by day seven.',
      body: [
        'Meditation is essential to keep your mental (and even physical) balance — science keeps proving it. Future generations will look at people who don\'t meditate the way we look at people who don\'t brush their teeth.',
        'If you have meditated before, just sit down and start. For everyone else, don\'t panic: it is "very simple".',
        'Sit comfortably, back straight, eyes closed. Breathe in and out deeply. Focus on your breath. When your attention drifts to a thought or a sensation, notice it and come back to your breath.',
      ],
      tip: 'Find a quiet place, settle in and silence your phone. Take a deep breath and begin.',
    },
  },
  {
    n: 12,
    level: 3,
    icon: 'shower',
    tracker: 'cold',
    category: 'growth',
    text: {
      title: 'The James Bond shower',
      short: 'End every shower ice-cold: 20 seconds on day one, 10 more every day.',
      body: [
        'The cold means you no harm. Repeated cold exposure has been shown to boost your immune system and improve your sleep and overall mood.',
        'Fans all agree: cold showers are addictive. You get hooked on the challenge, on pushing yourself, and on the inner calm that follows…',
        'Take a deep breath and go for it — hold on as long as you can before stepping out.',
      ],
      tip: 'Don\'t fight the shivering: it is your body\'s normal way of sending blood to your extremities!',
    },
  },
  {
    n: 13,
    level: 3,
    icon: 'ok',
    tracker: 'yes',
    category: 'growth',
    text: {
      title: 'Yes man',
      short: 'Say yes to everything you are asked for a week (as long as it doesn\'t put you in danger).',
      body: [
        'Add a dose of the unknown to break your routine. Accepting new things opens doors and pushes you out of your comfort zone. Say yes to your inner requests too (should I get out of bed? Yes).',
        'If someone suggests something strange, something radically outside your habits, accept!',
      ],
      tip: 'If someone asks you to rob a bank, you must refuse. No accepting requests that could put you in danger!',
    },
  },
  {
    n: 14,
    level: 3,
    icon: 'frame',
    tracker: 'photo',
    category: 'growth',
    text: {
      title: 'Reflection',
      short: 'Have your picture taken every day for a week.',
      body: [
        'Facing your own image is a great exercise in personal growth and self-acceptance. We are not used to it — which is exactly why it matters.',
        'Being photographed every day, in different places, outfits and moods, helps you get familiar with your image and understand it better.',
      ],
      tip: 'No selfies! Ask someone to take the picture.',
    },
  },
  {
    n: 15,
    level: 3,
    icon: 'heart',
    tracker: 'gratitude',
    category: 'growth',
    text: {
      title: 'Gratitude',
      short: 'Write down three good things about your day, every day for a week.',
      body: [
        'Stepping in a puddle or spilling a few drops of coffee on your trousers does not mean you are having the worst day of your life.',
        'Make an effort to pay more attention to the good things in your day than to the small annoyances.',
        'Take a moment at the end of each day to recall and write down three good things that happened to you.',
      ],
      tip: 'Notice the small moments of joy you usually overlook.',
    },
  },

  // ───────────── NIVEAU IV — L'ASCENSION (Monday Quest) ─────────────
  {
    n: 16,
    level: 4,
    icon: 'drop',
    tracker: 'water',
    category: 'health',
    text: {
      title: 'The spring',
      short: 'Drink water every day: 6 big glasses on day one, up to 8 by the end of the week.',
      body: [
        'Your body is 60% water. Losing just 2% is enough to dull your focus, memory and energy.',
        'Drinking steadily through the day helps digestion, skin and mood. It is the simplest healthy habit there is.',
      ],
      tip: 'Keep a bottle on your desk and drink a glass as soon as you wake up — before your first coffee.',
    },
  },
  {
    n: 17,
    level: 4,
    icon: 'book',
    tracker: 'read',
    category: 'growth',
    text: {
      title: 'Bookworm',
      short: 'Read every day: 10 pages on day one, 2 more each day, 22 by day seven.',
      body: [
        'Reading for just six minutes can cut stress by almost 70%. It grows your vocabulary, your empathy and the focus that screens keep eroding.',
        'Twenty pages a day is about fifteen books a year. Enough to change a life.',
      ],
      tip: 'Swap the last ten minutes of scrolling before bed for today\'s pages.',
    },
  },
  {
    n: 18,
    level: 4,
    icon: 'pencil',
    tracker: 'sketch',
    category: 'wellbeing',
    text: {
      title: 'Sketchbook',
      short: 'Draw something around you every day for a week.',
      body: [
        'Drawing is not about talent, it is about attention. To draw an object you have to truly look at it — its shape, its shadows, its details.',
        'This moment of creation calms the mind like meditation and wakes up your curiosity about the world.',
      ],
      tip: 'Forget perfection. A mug, a plant, a hand: three minutes is enough.',
    },
  },
  {
    n: 19,
    level: 4,
    icon: 'plane',
    tracker: 'offline',
    category: 'wellbeing',
    text: {
      title: 'Offline',
      short: 'Go offline every day: 30 minutes on day one, 10 more each day, 90 by day seven.',
      body: [
        'We check our phones more than 150 times a day. Every notification splinters our attention and keeps us from being fully present.',
        'One hour with no internet, no messages, no feeds is an hour given back to yourself, your loved ones, or to boredom — the soil of creativity.',
      ],
      tip: 'Switch on airplane mode and start the timer. The app keeps an eye on your connection.',
    },
  },
  {
    n: 20,
    level: 4,
    icon: 'band',
    tracker: 'complain',
    category: 'growth',
    text: {
      title: 'Zero complaints',
      short: 'Don\'t complain even once all day, every day for a week.',
      body: [
        'Complaining fires the same brain areas as stress and strengthens negative circuits. The more you complain, the easier it gets.',
        'The rule is simple: wear a band on your wrist. Each time you complain, switch wrists and restart your counter. Goal: a whole day without switching.',
      ],
      tip: 'Replace "I have to" with "I get to". The sentence changes — so does the day.',
    },
  },

  // ───────────── NIVEAU V — LA CRÊTE (Monday Quest) ─────────────
  {
    n: 21,
    level: 5,
    icon: 'stairs',
    tracker: 'stairs',
    category: 'health',
    text: {
      title: 'The staircase',
      short: 'Ban lifts and escalators: 5 floors on day one, one more each day, 11 by day seven.',
      body: [
        'Climbing stairs burns twice as many calories as walking and strengthens your heart, legs and lungs. It is a free gym, open everywhere.',
        'Your phone\'s barometer measures altitude: every floor you climb is counted.',
      ],
      tip: 'No stairs at home? Do a few rounds at the office or in the subway.',
    },
  },
  {
    n: 22,
    level: 5,
    icon: 'arms',
    tracker: 'pushups',
    category: 'health',
    text: {
      title: 'Nose to the floor',
      short: 'Push-ups every day: 10 on Monday, 5 more each day, 40 by Sunday.',
      body: [
        'Push-ups work your chest, shoulders, arms and core. One exercise, no equipment, visible results within days.',
        'Put your phone on the floor under your face: tap the screen with your nose on every rep to count.',
      ],
      tip: 'No need to do them all at once: small sets across the day count too. Knees on the floor if needed, they are still push-ups.',
    },
  },
  {
    n: 23,
    level: 5,
    icon: 'bubble',
    tracker: 'stranger',
    category: 'growth',
    text: {
      title: 'The stranger',
      short: 'Start a conversation with a stranger every day for a week.',
      body: [
        'Studies are clear: talking to strangers makes us happier than we expect. And strangers enjoy the chat far more than we think.',
        'A compliment to the baker, a question to the person next to you on the train: every exchange widens your world.',
      ],
      tip: 'Open with something you share right now: the queue, the weather, the book they\'re reading.',
    },
  },
  {
    n: 24,
    level: 5,
    icon: 'cube',
    tracker: 'sugar',
    category: 'health',
    text: {
      title: 'Sugar-free',
      short: 'Eat no added sugar for a week.',
      body: [
        'Sugar lights up the reward circuit like some drugs do. It hides everywhere: sauces, sliced bread, yoghurts, ready meals.',
        'One week without added sugar retrains your taste buds: fruit becomes incredibly sweet again.',
      ],
      tip: 'Read labels: sucrose, glucose syrup, dextrose… sugar goes by many names.',
    },
  },
  {
    n: 25,
    level: 5,
    icon: 'compass',
    tracker: 'explore',
    category: 'wellbeing',
    text: {
      title: 'The explorer',
      short: 'Take a street or path you have never taken, every day for a week.',
      body: [
        'Routine puts the brain to sleep. Novelty triggers dopamine and the formation of new memories.',
        'Change your route, get a little lost, let the compass pick a direction. Your neighbourhood hides more secrets than you think.',
      ],
      tip: 'Let the app draw a random direction and follow it for ten minutes.',
    },
  },

  // ───────────── NIVEAU VI — LE SOMMET (Monday Quest) ─────────────
  {
    n: 26,
    level: 6,
    icon: 'moon',
    tracker: 'curfew',
    category: 'wellbeing',
    text: {
      title: 'Curfew',
      short: 'Go to bed before 10:30 p.m. with no screens in the bedroom, every night for a week.',
      body: [
        'Blue light from screens delays melatonin, the sleep hormone. Result: you fall asleep later and sleep worse.',
        'A regular bedtime, in the dark and screen-free, is the best investment in tomorrow\'s energy.',
      ],
      tip: 'Buy a real alarm clock and charge your phone outside the bedroom.',
    },
  },
  {
    n: 27,
    level: 6,
    icon: 'lines',
    tracker: 'pages',
    category: 'growth',
    text: {
      title: 'Morning pages',
      short: 'Write unfiltered when you wake up: 150 words on day one, 50 more each day, 450 by day seven.',
      body: [
        'Popularised by Julia Cameron, morning pages mean writing whatever crosses your mind, without rereading or judging.',
        'Emptying your mind onto the page clears room for the day, calms anxiety and surfaces unexpected ideas.',
      ],
      tip: 'Write before checking your messages. If nothing comes, write "nothing comes" until something does.',
    },
  },
  {
    n: 28,
    level: 6,
    icon: 'flame',
    tracker: 'fear',
    category: 'growth',
    text: {
      title: 'The leap',
      short: 'Do one thing that scares you every day for a week.',
      body: [
        'Courage is not the absence of fear — it is acting despite it. Every fear you face shrinks, and your comfort zone grows.',
        'Rate your fear before, then after: you\'ll see how often anticipation is worse than reality.',
      ],
      tip: 'No need to skydive: speak up in a meeting, call instead of texting, ask for a raise.',
    },
  },
  {
    n: 29,
    level: 6,
    icon: 'envelope',
    tracker: 'messenger',
    category: 'growth',
    text: {
      title: 'The messenger',
      short: 'Tell someone close what they mean to you, every day for a week.',
      body: [
        'We often think well of people without ever telling them. Expressing gratitude strengthens bonds and makes the writer as happy as the reader.',
        'A call, a message, a letter: pick a different person every day.',
      ],
      tip: 'Be specific: a shared memory or a concrete quality touches far more than "thanks for everything".',
    },
  },
  {
    n: 30,
    level: 6,
    icon: 'clock',
    tracker: 'fast',
    category: 'health',
    text: {
      title: 'Sixteen eight',
      short: 'Fast every day: 12 hours on day one, building up to 16:8 by day seven.',
      body: [
        '16:8 fasting means eating within an eight-hour window and fasting for the other sixteen. Your body taps into its reserves and regenerates.',
        'Beyond the metabolic effects, it is a willpower workout that changes your relationship with hunger.',
      ],
      tip: 'Stretch the fast one hour at a time, in the evening or the morning. For 16:8, the easiest version: skip breakfast and eat between noon and 8 p.m. Water, tea and black coffee are fine… unless you\'re redoing "High on life".',
    },
  },
]

export const CHALLENGES: Challenge[] = [...defs, ...LEVEL_7, ...LEVEL_8, ...LEVEL_9, ...LEVEL_10, ...LEVEL_11].map(d => ({
  ...d,
  id: `mq${String(d.n).padStart(2, '0')}`,
  source: d.n <= 15 ? 'book' : 'quest',
}))

export function challengeById(id: string): Challenge | undefined {
  return CHALLENGES.find(c => c.id === id)
}

export function challengesOfLevel(level: number): Challenge[] {
  return CHALLENGES.filter(c => c.level === level)
}

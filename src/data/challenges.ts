// Challenges 1–15 are transcribed from the LUNDI MATIN© booklet (levels I–III).
// Challenges 16–30 are Monday Quest originals written in the same voice.

export type Locale = 'fr' | 'en'
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
    | 'custom' // user-made challenge

export type IconName
  = | 'foot' | 'sunrise' | 'apple' | 'pill' | 'broom' | 'cutlery' | 'dot' | 'nodes' | 'stretch' | 'minus'
    | 'stones' | 'shower' | 'ok' | 'frame' | 'heart' | 'drop' | 'book' | 'pencil' | 'plane' | 'band'
    | 'stairs' | 'arms' | 'bubble' | 'cube' | 'compass' | 'moon' | 'lines' | 'flame' | 'envelope' | 'clock' | 'star'

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
  text: Record<Locale, ChallengeText>
}

export interface Level {
  n: number
  roman: string
  text: Record<Locale, string>
}

export const LEVELS: Level[] = [
  { n: 1, roman: 'I', text: { fr: 'L\'affranchissement', en: 'Breaking free' } },
  { n: 2, roman: 'II', text: { fr: 'L\'émancipation', en: 'Emancipation' } },
  { n: 3, roman: 'III', text: { fr: 'Au pied de la montagne', en: 'At the foot of the mountain' } },
  { n: 4, roman: 'IV', text: { fr: 'L\'ascension', en: 'The climb' } },
  { n: 5, roman: 'V', text: { fr: 'La crête', en: 'The ridge' } },
  { n: 6, roman: 'VI', text: { fr: 'Le sommet', en: 'The summit' } },
]

export const CATEGORY_LABEL: Record<Category, Record<Locale, string>> = {
  health: { fr: 'Santé', en: 'Health' },
  growth: { fr: 'Développement personnel', en: 'Personal growth' },
  wellbeing: { fr: 'Bien-être', en: 'Well-being' },
}

type Def = Omit<Challenge, 'id' | 'source'>

const defs: Def[] = [
  // ───────────── NIVEAU I — L'AFFRANCHISSEMENT ─────────────
  {
    n: 1,
    level: 1,
    icon: 'foot',
    tracker: 'walk',
    category: 'health',
    text: {
      fr: {
        title: 'Le flâneur',
        short: 'Sortez faire une marche de 30 minutes chaque jour pendant une semaine.',
        body: [
          'Les bénéfices de la marche sont nombreux. Marcher régulièrement réduit les risques de développer des maladies cardio-vasculaires, des cancers et du diabète.',
          'En plus de faire baisser vos risques de développer des maladies graves, la marche améliore vos capacités cognitives et vous fait profiter d\'un moment de coupure dans votre journée.',
        ],
        tip: 'Fixez-vous un créneau chaque jour pour aller vous balader une trentaine de minutes. Faites le vide, essayez de ne penser à rien et appréciez les choses qui vous entourent.',
      },
      en: {
        title: 'The stroller',
        short: 'Go for a 30-minute walk every day for a week.',
        body: [
          'Walking has countless benefits. Walking regularly lowers your risk of cardiovascular disease, cancer and diabetes.',
          'Beyond lowering the risk of serious illness, walking sharpens your thinking and gives you a real break in your day.',
        ],
        tip: 'Block a slot every day for a thirty-minute stroll. Empty your mind, try to think about nothing and enjoy what surrounds you.',
      },
    },
  },
  {
    n: 2,
    level: 1,
    icon: 'sunrise',
    tracker: 'sunrise',
    category: 'growth',
    text: {
      fr: {
        title: 'Soleil levant',
        short: 'Réveillez-vous avant 6h00 du matin chaque jour pendant une semaine.',
        body: [
          'Se lever tôt a de nombreux avantages. Des best-sellers en font la promotion, comme le Miracle Morning de Hal Elrod. Se réveiller avant tout le monde vous permet de renforcer votre discipline et de dompter votre volonté.',
          'C\'est aussi l\'occasion de profiter de la quiétude du matin, de réfléchir calmement à votre journée, vos obligations et vos envies avant d\'entrer dans le rush !',
        ],
        tip: 'Programmez votre réveil, ne « snoozez » pas et jetez-vous hors du lit dès la première sonnerie !',
      },
      en: {
        title: 'Rising sun',
        short: 'Wake up before 6:00 a.m. every day for a week.',
        body: [
          'Getting up early has many perks. Best-sellers like Hal Elrod\'s Miracle Morning swear by it. Waking before everyone else strengthens your discipline and tames your willpower.',
          'It is also a chance to enjoy the quiet of the morning and think calmly about your day, your duties and your desires before the rush begins!',
        ],
        tip: 'Set your alarm, don\'t snooze, and jump out of bed at the very first ring!',
      },
    },
  },
  {
    n: 3,
    level: 1,
    icon: 'apple',
    tracker: 'vitamins',
    category: 'health',
    text: {
      fr: {
        title: 'Vitamines N',
        short: 'Mangez au moins deux fruits et deux légumes différents chaque jour pendant une semaine.',
        body: [
          'Les vitamines sont indispensables à la vie (« vita » en latin). C\'est grâce à une alimentation équilibrée que vous consommez suffisamment de vitamines pour éviter les carences et rester en bonne santé !',
          'Consommer au moins deux légumes et deux fruits différents par jour vous aide à faire le plein de vitamines et donc, de vitalité !',
        ],
        tip: 'Pensez à consommer des fruits et légumes bio et de saison. L\'objectif est de faire une cure de vitamines, pas de pesticides !',
      },
      en: {
        title: 'Vitamin N',
        short: 'Eat at least two different fruits and two different vegetables every day for a week.',
        body: [
          'Vitamins are essential to life ("vita" in Latin). A balanced diet is how you get enough of them to avoid deficiencies and stay healthy!',
          'Eating at least two different vegetables and two different fruits a day fills you up with vitamins — and with vitality!',
        ],
        tip: 'Go for organic, seasonal produce. The goal is a vitamin cure, not a pesticide one!',
      },
    },
  },
  {
    n: 4,
    level: 1,
    icon: 'pill',
    tracker: 'sober',
    category: 'health',
    text: {
      fr: {
        title: 'Défoncé à la vie',
        short: 'Abstenez-vous de consommer toute substance non prescrite pendant une semaine.',
        body: [
          'La caféine, la théine, la nicotine ou encore l\'alcool sont des substances qui font partie de notre quotidien. Ce sont pourtant des stimulants auprès desquels vous pouvez développer une forme d\'addiction.',
          'S\'abstenir de consommer pendant une semaine toute substance non prescrite vous permet de renforcer votre volonté et d\'améliorer votre estime personnelle. C\'est aussi l\'occasion de vous libérer de toute addiction et c\'est ça la vraie liberté !',
        ],
        tip: 'Si l\'envie vous prend de boire du café ou de fumer une cigarette, servez-vous un grand verre d\'eau à la place.',
      },
      en: {
        title: 'High on life',
        short: 'Abstain from any non-prescribed substance for a week.',
        body: [
          'Caffeine, theine, nicotine and alcohol are part of everyday life. Yet they are stimulants you can grow addicted to.',
          'Going a week without any non-prescribed substance strengthens your will and boosts your self-esteem. It is a chance to free yourself from every addiction — and that is real freedom!',
        ],
        tip: 'When you crave a coffee or a cigarette, pour yourself a big glass of water instead.',
      },
    },
  },
  {
    n: 5,
    level: 1,
    icon: 'broom',
    tracker: 'sweep',
    category: 'wellbeing',
    text: {
      fr: {
        title: 'Aseptisation',
        short: 'Nettoyez votre intérieur et vivez dans un espace immaculé pendant une semaine.',
        body: [
          'Vivre dans un espace propre et organisé profite à votre psychologie, votre santé et stimule même votre créativité. C\'est aussi un moyen de réduire les risques d\'allergies et de vous débarrasser des agents contaminants qui vivent dans votre intérieur.',
          'Nettoyez, rangez et repensez votre organisation. Appréciez le résultat et vivez dans un environnement stimulant et inspirant.',
        ],
        tip: 'La qualité de votre sommeil serait améliorée en moyenne de 20 % dans des draps de lit propres.',
      },
      en: {
        title: 'Spotless',
        short: 'Clean your home and live in an immaculate space for a week.',
        body: [
          'A clean, organised space benefits your mind and your health, and even sparks creativity. It also reduces allergy risks and gets rid of the contaminants living in your home.',
          'Clean, tidy and rethink how things are organised. Enjoy the result and live in a stimulating, inspiring environment.',
        ],
        tip: 'Sleep quality reportedly improves by 20% on average in clean sheets.',
      },
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
      fr: {
        title: 'Fourchettes en l\'air',
        short: 'Mâchez lentement chaque bouchée de vos plats pendant une semaine.',
        body: [
          'Manger trop rapidement double les risques d\'obésité, réduit la sensation de satiété et empêche votre système digestif de fonctionner correctement.',
          'Vous ne prenez pas le temps d\'apprécier le goût des aliments et vous passez à côté d\'un moment de partage avec votre famille, vos amis ou vos collègues de travail.',
          'Prenez conscience du moment présent, posez vos couverts et mâchez lentement chaque bouchée.',
        ],
        tip: 'Commencez le repas avec un grand verre d\'eau pour réduire la sensation de faim et encourager le sentiment de satiété.',
      },
      en: {
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
  },
  {
    n: 7,
    level: 2,
    icon: 'dot',
    tracker: 'hold',
    category: 'growth',
    text: {
      fr: {
        title: 'Abstinence aréligieuse',
        short: 'Pratiquez l\'abstinence sexuelle. Pas de sexe, pas de masturbation, pas de films pornographiques ni érotiques pendant une semaine.',
        body: [
          'Le sexe est bon pour le moral, le cœur et peut même faire baisser votre tension. C\'est un des piliers de nos vies. Pourtant, s\'imposer une période d\'abstinence vous permet de reconnecter avec votre corps et vos envies.',
          'Le résultat est sans appel, à travers cette aventure spirituelle vous apprenez à maîtriser vos pulsions et votre self-control s\'améliore. Des périodes d\'abstinence pourraient même réinitialiser votre libido.',
        ],
        tip: 'Vous allez sentir un gain d\'énergie, mettez cette énergie à profit pour réaliser des tâches que vous avez l\'habitude de repousser !',
      },
      en: {
        title: 'Secular abstinence',
        short: 'Practise sexual abstinence. No sex, no masturbation, no pornographic or erotic films for a week.',
        body: [
          'Sex is good for your mood and your heart, and can even lower your blood pressure. It is one of the pillars of our lives. Yet a period of abstinence lets you reconnect with your body and your desires.',
          'The result speaks for itself: through this spiritual adventure you learn to master your impulses and your self-control improves. Abstinence might even reset your libido.',
        ],
        tip: 'You will feel a surge of energy — use it for the tasks you keep putting off!',
      },
    },
  },
  {
    n: 8,
    level: 2,
    icon: 'nodes',
    tracker: 'ted',
    category: 'growth',
    text: {
      fr: {
        title: 'Back to school',
        short: 'Regardez une conférence TED chaque jour pendant une semaine.',
        body: [
          'Les conférences TED (Technology, Entertainment and Design) sont des conférences dont l\'objectif est de diffuser des idées qui en valent la peine. Les exposés couvrent un large éventail de sujets, tels que la science, les arts, la politique, les questions mondiales, l\'architecture, la musique et plusieurs autres sphères de compétences.',
          'Le format est simple : un sujet, un micro et une présentation. La durée varie de cinq minutes à une heure. C\'est parfait pour en apprendre chaque jour sur un sujet différent et stimuler votre créativité.',
        ],
        tip: 'Naviguez sur ted.com, dans l\'onglet « Discover », afin de choisir chaque jour un sujet qui vous intéresse.',
      },
      en: {
        title: 'Back to school',
        short: 'Watch a TED talk every day for a week.',
        body: [
          'TED (Technology, Entertainment and Design) talks exist to spread ideas worth spreading. They cover science, arts, politics, global issues, architecture, music and many other fields.',
          'The format is simple: one topic, one mic, one talk, from five minutes to an hour. Perfect to learn something new every day and spark your creativity.',
        ],
        tip: 'Browse ted.com under "Discover" and pick a topic that interests you each day.',
      },
    },
  },
  {
    n: 9,
    level: 2,
    icon: 'stretch',
    tracker: 'stretch',
    category: 'wellbeing',
    text: {
      fr: {
        title: 'Souplesse féline',
        short: 'Étirez-vous pendant un minimum de 15 minutes chaque jour pendant une semaine.',
        body: [
          'S\'étirer n\'est pas réservé aux athlètes de haut niveau. C\'est un moyen de conserver votre mobilité, votre indépendance et cela permet à vos muscles de rester en bonne santé, flexibles et résistants.',
          'Pratiquez une quinzaine de minutes d\'étirements pour détendre vos muscles, vous relaxer et améliorer votre mobilité.',
        ],
        tip: 'Commencez par les groupes musculaires du haut du corps et terminez avec les jambes. Ne tirez pas trop sur vos muscles, écoutez votre corps !',
      },
      en: {
        title: 'Feline flexibility',
        short: 'Stretch for at least 15 minutes every day for a week.',
        body: [
          'Stretching is not just for elite athletes. It keeps you mobile and independent, and keeps your muscles healthy, flexible and strong.',
          'Do about fifteen minutes of stretching to loosen your muscles, relax and move better.',
        ],
        tip: 'Start with the upper body and finish with the legs. Don\'t pull too hard — listen to your body!',
      },
    },
  },
  {
    n: 10,
    level: 2,
    icon: 'minus',
    tracker: 'toss',
    category: 'growth',
    text: {
      fr: {
        title: 'A minima',
        short: 'Jetez un objet minimum chaque jour pendant une semaine.',
        body: [
          'Le mode de vie minimaliste est en plein boom. Originaire du Japon, il vient s\'opposer au matérialisme. L\'idée est de vous séparer de tous vos objets inutiles ou plutôt, ceux qui ne vous sont pas essentiels. Cela libère de l\'espace dans votre maison et surtout, dans votre tête.',
          'Faites le tour de vos placards et jetez (ou donnez, ou vendez) ce qui ne vous est pas essentiel.',
        ],
        tip: 'Commencez par vous débarrasser de tous les objets que vous avez en double !',
      },
      en: {
        title: 'Bare minimum',
        short: 'Throw away at least one object every day for a week.',
        body: [
          'Minimalism is booming. Born in Japan as a reaction to materialism, the idea is to part with everything that is useless — or rather, not essential. It frees up space in your home and, above all, in your head.',
          'Go through your cupboards and throw away (or give, or sell) whatever is not essential.',
        ],
        tip: 'Start by getting rid of everything you own twice!',
      },
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
      fr: {
        title: 'Zen chef',
        short: 'Méditez pendant un minimum de 15 minutes chaque jour pendant une semaine.',
        body: [
          'La méditation est une pratique essentielle pour maintenir votre équilibre mental (et même physique). La science ne cesse de le prouver. Les futures générations vont regarder ceux qui ne méditent pas comme nous regardons ceux qui ne se brossent pas les dents.',
          'Si vous avez déjà médité il vous suffit de vous asseoir et de commencer votre session. Pour les autres, pas de panique, c\'est « très simple ».',
          'Asseyez-vous confortablement, le dos droit et fermez les yeux. Inspirez et expirez profondément. Concentrez votre attention sur votre respiration. Si votre attention se détache de votre respiration vers une pensée ou une sensation, prenez-en conscience et concentrez-vous de nouveau sur votre respiration.',
        ],
        tip: 'Trouvez un endroit calme, installez-vous et désactivez votre téléphone. Inspirez profondément et commencez votre session.',
      },
      en: {
        title: 'Zen chef',
        short: 'Meditate for at least 15 minutes every day for a week.',
        body: [
          'Meditation is essential to keep your mental (and even physical) balance — science keeps proving it. Future generations will look at people who don\'t meditate the way we look at people who don\'t brush their teeth.',
          'If you have meditated before, just sit down and start. For everyone else, don\'t panic: it is "very simple".',
          'Sit comfortably, back straight, eyes closed. Breathe in and out deeply. Focus on your breath. When your attention drifts to a thought or a sensation, notice it and come back to your breath.',
        ],
        tip: 'Find a quiet place, settle in and silence your phone. Take a deep breath and begin.',
      },
    },
  },
  {
    n: 12,
    level: 3,
    icon: 'shower',
    tracker: 'cold',
    category: 'growth',
    text: {
      fr: {
        title: 'La douche de James Bond',
        short: 'Terminez vos douches avec de l\'eau glacée chaque jour pendant une semaine.',
        body: [
          'Le froid ne vous veut pas de mal. Il a été démontré qu\'une exposition répétée au froid stimule vos défenses immunitaires, améliore la qualité de votre sommeil et votre humeur globale.',
          'Les adeptes sont unanimes, les douches froides rendent dépendants. Elles rendent accros au défi, au dépassement de soi, au bien-être et à l\'harmonie intérieure qui en résulte…',
          'Inspirez un bon coup et lancez-vous, essayez de tenir le plus longtemps possible avant de sortir de la douche.',
        ],
        tip: 'Ne luttez pas contre le grelottement, c\'est une réaction normale du corps pour envoyer du sang dans vos extrémités !',
      },
      en: {
        title: 'The James Bond shower',
        short: 'End every shower with ice-cold water every day for a week.',
        body: [
          'The cold means you no harm. Repeated cold exposure has been shown to boost your immune system and improve your sleep and overall mood.',
          'Fans all agree: cold showers are addictive. You get hooked on the challenge, on pushing yourself, and on the inner calm that follows…',
          'Take a deep breath and go for it — hold on as long as you can before stepping out.',
        ],
        tip: 'Don\'t fight the shivering: it is your body\'s normal way of sending blood to your extremities!',
      },
    },
  },
  {
    n: 13,
    level: 3,
    icon: 'ok',
    tracker: 'yes',
    category: 'growth',
    text: {
      fr: {
        title: 'Yes man',
        short: 'Répondez par oui à tout ce que l\'on vous demande pendant une semaine (tant que cela ne vous met pas en danger).',
        body: [
          'Ajoutez une dose d\'inconnu à votre quotidien pour sortir de votre routine. Accepter des choses nouvelles peut être l\'occasion de saisir des opportunités et c\'est un bon exercice pour sortir de votre zone de confort. Pensez aussi à dire oui à vos requêtes intérieures et pensées personnelles (dois-je me lever de mon lit ? Oui).',
          'Si quelqu\'un vous propose quelque chose d\'étrange, quelque chose qui sort radicalement de vos habitudes et de votre quotidien, acceptez !',
        ],
        tip: 'Si on vous propose de braquer une banque, vous devez refuser. Il n\'est pas question d\'accepter des requêtes qui pourraient vous mettre en danger !',
      },
      en: {
        title: 'Yes man',
        short: 'Say yes to everything you are asked for a week (as long as it doesn\'t put you in danger).',
        body: [
          'Add a dose of the unknown to break your routine. Accepting new things opens doors and pushes you out of your comfort zone. Say yes to your inner requests too (should I get out of bed? Yes).',
          'If someone suggests something strange, something radically outside your habits, accept!',
        ],
        tip: 'If someone asks you to rob a bank, you must refuse. No accepting requests that could put you in danger!',
      },
    },
  },
  {
    n: 14,
    level: 3,
    icon: 'frame',
    tracker: 'photo',
    category: 'growth',
    text: {
      fr: {
        title: 'Réflexion',
        short: 'Faites-vous prendre en photo chaque jour pendant une semaine.',
        body: [
          'Se confronter à son image est un bon exercice de développement personnel et d\'acceptation de soi. C\'est un exercice auquel nous ne sommes pas habitués et c\'est pour cela qu\'il est intéressant.',
          'Se faire prendre en photo tous les jours, dans des situations, des vêtements et des humeurs différentes vous aide à vous familiariser avec votre image et à mieux l\'appréhender.',
        ],
        tip: 'Pas de selfies ! Demandez à quelqu\'un de vous prendre en photo.',
      },
      en: {
        title: 'Reflection',
        short: 'Have your picture taken every day for a week.',
        body: [
          'Facing your own image is a great exercise in personal growth and self-acceptance. We are not used to it — which is exactly why it matters.',
          'Being photographed every day, in different places, outfits and moods, helps you get familiar with your image and understand it better.',
        ],
        tip: 'No selfies! Ask someone to take the picture.',
      },
    },
  },
  {
    n: 15,
    level: 3,
    icon: 'heart',
    tracker: 'gratitude',
    category: 'growth',
    text: {
      fr: {
        title: 'Gratitude',
        short: 'Écrivez trois choses positives sur votre journée chaque jour pendant une semaine.',
        body: [
          'Ce n\'est pas parce que vous avez marché dans une flaque ou que quelques gouttes de café se sont renversées sur votre pantalon que vous êtes en train de passer la pire journée de votre vie.',
          'Faites un effort pour accorder plus d\'attention aux choses positives de votre quotidien plutôt qu\'aux petits désagréments.',
          'Prenez un moment à la fin de chaque journée pour vous rappeler et noter trois choses positives qui vous sont arrivées.',
        ],
        tip: 'Prêtez attention aux petits moments de joie et de bonheur auxquels vous ne prêtez pas attention d\'habitude.',
      },
      en: {
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
  },

  // ───────────── NIVEAU IV — L'ASCENSION (Monday Quest) ─────────────
  {
    n: 16,
    level: 4,
    icon: 'drop',
    tracker: 'water',
    category: 'health',
    text: {
      fr: {
        title: 'La source',
        short: 'Buvez huit grands verres d\'eau chaque jour pendant une semaine.',
        body: [
          'Votre corps est composé à 60 % d\'eau. Une déshydratation de seulement 2 % suffit à réduire votre concentration, votre mémoire et votre énergie.',
          'Boire régulièrement tout au long de la journée améliore votre digestion, l\'éclat de votre peau et votre humeur. C\'est le geste santé le plus simple qui existe.',
        ],
        tip: 'Gardez une bouteille sur votre bureau et buvez un verre dès le réveil, avant même votre premier café.',
      },
      en: {
        title: 'The spring',
        short: 'Drink eight big glasses of water every day for a week.',
        body: [
          'Your body is 60% water. Losing just 2% is enough to dull your focus, memory and energy.',
          'Drinking steadily through the day helps digestion, skin and mood. It is the simplest healthy habit there is.',
        ],
        tip: 'Keep a bottle on your desk and drink a glass as soon as you wake up — before your first coffee.',
      },
    },
  },
  {
    n: 17,
    level: 4,
    icon: 'book',
    tracker: 'read',
    category: 'growth',
    text: {
      fr: {
        title: 'Rat de bibliothèque',
        short: 'Lisez au moins vingt pages d\'un livre chaque jour pendant une semaine.',
        body: [
          'Lire seulement six minutes suffit à réduire le stress de près de 70 %. La lecture développe votre vocabulaire, votre empathie et votre capacité de concentration, mise à mal par les écrans.',
          'Vingt pages par jour, c\'est une quinzaine de livres par an. De quoi changer une vie.',
        ],
        tip: 'Remplacez les dix dernières minutes de scroll avant de dormir par vos vingt pages.',
      },
      en: {
        title: 'Bookworm',
        short: 'Read at least twenty pages of a book every day for a week.',
        body: [
          'Reading for just six minutes can cut stress by almost 70%. It grows your vocabulary, your empathy and the focus that screens keep eroding.',
          'Twenty pages a day is about fifteen books a year. Enough to change a life.',
        ],
        tip: 'Swap the last ten minutes of scrolling before bed for your twenty pages.',
      },
    },
  },
  {
    n: 18,
    level: 4,
    icon: 'pencil',
    tracker: 'sketch',
    category: 'wellbeing',
    text: {
      fr: {
        title: 'Carnet de croquis',
        short: 'Dessinez quelque chose qui vous entoure chaque jour pendant une semaine.',
        body: [
          'Dessiner n\'est pas une question de talent mais d\'attention. Pour dessiner un objet, vous devez vraiment le regarder — sa forme, ses ombres, ses détails.',
          'Ce moment de création calme l\'esprit comme une méditation et réveille votre curiosité pour le monde qui vous entoure.',
        ],
        tip: 'Ne cherchez pas la perfection. Une tasse, une plante, une main : trois minutes suffisent.',
      },
      en: {
        title: 'Sketchbook',
        short: 'Draw something around you every day for a week.',
        body: [
          'Drawing is not about talent, it is about attention. To draw an object you have to truly look at it — its shape, its shadows, its details.',
          'This moment of creation calms the mind like meditation and wakes up your curiosity about the world.',
        ],
        tip: 'Forget perfection. A mug, a plant, a hand: three minutes is enough.',
      },
    },
  },
  {
    n: 19,
    level: 4,
    icon: 'plane',
    tracker: 'offline',
    category: 'wellbeing',
    text: {
      fr: {
        title: 'Hors ligne',
        short: 'Passez une heure complètement déconnecté chaque jour pendant une semaine.',
        body: [
          'Nous consultons notre téléphone plus de 150 fois par jour. Chaque notification fragmente notre attention et nous empêche d\'être pleinement présents.',
          'Une heure sans internet, sans messages ni réseaux sociaux, c\'est une heure rendue à vous-même, à vos proches ou à l\'ennui — terreau de la créativité.',
        ],
        tip: 'Activez le mode avion et lancez le chrono. L\'application garde un œil sur votre connexion.',
      },
      en: {
        title: 'Offline',
        short: 'Spend one fully disconnected hour every day for a week.',
        body: [
          'We check our phones more than 150 times a day. Every notification splinters our attention and keeps us from being fully present.',
          'One hour with no internet, no messages, no feeds is an hour given back to yourself, your loved ones, or to boredom — the soil of creativity.',
        ],
        tip: 'Switch on airplane mode and start the timer. The app keeps an eye on your connection.',
      },
    },
  },
  {
    n: 20,
    level: 4,
    icon: 'band',
    tracker: 'complain',
    category: 'growth',
    text: {
      fr: {
        title: 'Zéro plainte',
        short: 'Ne vous plaignez pas une seule fois de la journée, chaque jour pendant une semaine.',
        body: [
          'Se plaindre active les mêmes zones du cerveau que le stress et renforce les circuits de la négativité. Plus vous vous plaignez, plus il devient facile de vous plaindre.',
          'Le principe est simple : un bracelet au poignet. À chaque plainte, changez-le de bras et recommencez votre compteur. Objectif : une journée entière sans changer.',
        ],
        tip: 'Remplacez « je dois » par « j\'ai la chance de ». La phrase change, la journée aussi.',
      },
      en: {
        title: 'Zero complaints',
        short: 'Don\'t complain even once all day, every day for a week.',
        body: [
          'Complaining fires the same brain areas as stress and strengthens negative circuits. The more you complain, the easier it gets.',
          'The rule is simple: wear a band on your wrist. Each time you complain, switch wrists and restart your counter. Goal: a whole day without switching.',
        ],
        tip: 'Replace "I have to" with "I get to". The sentence changes — so does the day.',
      },
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
      fr: {
        title: 'L\'escalier',
        short: 'Bannissez ascenseurs et escalators : montez au moins dix étages chaque jour pendant une semaine.',
        body: [
          'Monter les escaliers brûle deux fois plus de calories que la marche et renforce le cœur, les jambes et les poumons. C\'est une salle de sport gratuite, ouverte partout.',
          'Le baromètre de votre téléphone mesure votre altitude : chaque étage gravi est compté.',
        ],
        tip: 'Pas d\'escaliers chez vous ? Faites des allers-retours dans ceux de votre bureau ou du métro.',
      },
      en: {
        title: 'The staircase',
        short: 'Ban lifts and escalators: climb at least ten floors every day for a week.',
        body: [
          'Climbing stairs burns twice as many calories as walking and strengthens your heart, legs and lungs. It is a free gym, open everywhere.',
          'Your phone\'s barometer measures altitude: every floor you climb is counted.',
        ],
        tip: 'No stairs at home? Do a few rounds at the office or in the subway.',
      },
    },
  },
  {
    n: 22,
    level: 5,
    icon: 'arms',
    tracker: 'pushups',
    category: 'health',
    text: {
      fr: {
        title: 'Le nez au sol',
        short: 'Faites cinquante pompes chaque jour pendant une semaine.',
        body: [
          'Les pompes sollicitent les pectoraux, les épaules, les bras et la sangle abdominale. Un seul exercice, aucun matériel, des résultats visibles en quelques jours.',
          'Posez votre téléphone au sol, sous votre visage : touchez l\'écran du bout du nez à chaque descente pour compter.',
        ],
        tip: 'Pas besoin de tout faire d\'un coup : cinq séries de dix tout au long de la journée comptent aussi.',
      },
      en: {
        title: 'Nose to the floor',
        short: 'Do fifty push-ups every day for a week.',
        body: [
          'Push-ups work your chest, shoulders, arms and core. One exercise, no equipment, visible results within days.',
          'Put your phone on the floor under your face: tap the screen with your nose on every rep to count.',
        ],
        tip: 'No need to do them all at once: five sets of ten across the day count too.',
      },
    },
  },
  {
    n: 23,
    level: 5,
    icon: 'bubble',
    tracker: 'stranger',
    category: 'growth',
    text: {
      fr: {
        title: 'L\'inconnu',
        short: 'Engagez la conversation avec un inconnu chaque jour pendant une semaine.',
        body: [
          'Les études sont formelles : parler à des inconnus nous rend plus heureux que nous l\'imaginons. Et les inconnus apprécient la conversation bien plus que nous le pensons.',
          'Un compliment au boulanger, une question à votre voisin de train : chaque échange élargit votre monde.',
        ],
        tip: 'Commencez par une observation sur ce que vous partagez à cet instant : la file d\'attente, la météo, le livre qu\'il lit.',
      },
      en: {
        title: 'The stranger',
        short: 'Start a conversation with a stranger every day for a week.',
        body: [
          'Studies are clear: talking to strangers makes us happier than we expect. And strangers enjoy the chat far more than we think.',
          'A compliment to the baker, a question to the person next to you on the train: every exchange widens your world.',
        ],
        tip: 'Open with something you share right now: the queue, the weather, the book they\'re reading.',
      },
    },
  },
  {
    n: 24,
    level: 5,
    icon: 'cube',
    tracker: 'sugar',
    category: 'health',
    text: {
      fr: {
        title: 'Sucre glace',
        short: 'Ne consommez aucun sucre ajouté pendant une semaine.',
        body: [
          'Le sucre active le circuit de la récompense comme certaines drogues. Il se cache partout : sauces, pain de mie, yaourts, plats préparés.',
          'Une semaine sans sucre ajouté suffit à rééduquer vos papilles : les fruits redeviennent incroyablement sucrés.',
        ],
        tip: 'Lisez les étiquettes : saccharose, sirop de glucose, dextrose… le sucre a beaucoup de noms.',
      },
      en: {
        title: 'Sugar-free',
        short: 'Eat no added sugar for a week.',
        body: [
          'Sugar lights up the reward circuit like some drugs do. It hides everywhere: sauces, sliced bread, yoghurts, ready meals.',
          'One week without added sugar retrains your taste buds: fruit becomes incredibly sweet again.',
        ],
        tip: 'Read labels: sucrose, glucose syrup, dextrose… sugar goes by many names.',
      },
    },
  },
  {
    n: 25,
    level: 5,
    icon: 'compass',
    tracker: 'explore',
    category: 'wellbeing',
    text: {
      fr: {
        title: 'L\'explorateur',
        short: 'Empruntez une rue ou un chemin que vous n\'avez jamais pris, chaque jour pendant une semaine.',
        body: [
          'La routine endort le cerveau. La nouveauté, elle, stimule la production de dopamine et la formation de nouveaux souvenirs.',
          'Changez d\'itinéraire, perdez-vous un peu, laissez la boussole choisir une direction. Votre quartier cache plus de secrets que vous ne le croyez.',
        ],
        tip: 'Laissez l\'application tirer une direction au sort et suivez-la pendant dix minutes.',
      },
      en: {
        title: 'The explorer',
        short: 'Take a street or path you have never taken, every day for a week.',
        body: [
          'Routine puts the brain to sleep. Novelty triggers dopamine and the formation of new memories.',
          'Change your route, get a little lost, let the compass pick a direction. Your neighbourhood hides more secrets than you think.',
        ],
        tip: 'Let the app draw a random direction and follow it for ten minutes.',
      },
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
      fr: {
        title: 'Couvre-feu',
        short: 'Couchez-vous avant 22h30, sans écran dans la chambre, chaque soir pendant une semaine.',
        body: [
          'La lumière bleue des écrans retarde la sécrétion de mélatonine, l\'hormone du sommeil. Résultat : on s\'endort plus tard, on dort moins bien.',
          'Un coucher régulier, dans le noir et sans écran, est le meilleur investissement pour votre énergie du lendemain.',
        ],
        tip: 'Achetez un vrai réveil et laissez votre téléphone charger hors de la chambre.',
      },
      en: {
        title: 'Curfew',
        short: 'Go to bed before 10:30 p.m. with no screens in the bedroom, every night for a week.',
        body: [
          'Blue light from screens delays melatonin, the sleep hormone. Result: you fall asleep later and sleep worse.',
          'A regular bedtime, in the dark and screen-free, is the best investment in tomorrow\'s energy.',
        ],
        tip: 'Buy a real alarm clock and charge your phone outside the bedroom.',
      },
    },
  },
  {
    n: 27,
    level: 6,
    icon: 'lines',
    tracker: 'pages',
    category: 'growth',
    text: {
      fr: {
        title: 'Pages du matin',
        short: 'Écrivez 300 mots au réveil, sans filtre, chaque jour pendant une semaine.',
        body: [
          'Popularisées par Julia Cameron, les pages du matin consistent à écrire tout ce qui vous passe par la tête, sans vous relire ni vous juger.',
          'Vider votre esprit sur le papier libère de la place pour la journée, apaise les angoisses et fait émerger des idées inattendues.',
        ],
        tip: 'Écrivez avant de consulter vos messages. Si rien ne vient, écrivez « rien ne vient » jusqu\'à ce que quelque chose vienne.',
      },
      en: {
        title: 'Morning pages',
        short: 'Write 300 unfiltered words when you wake up, every day for a week.',
        body: [
          'Popularised by Julia Cameron, morning pages mean writing whatever crosses your mind, without rereading or judging.',
          'Emptying your mind onto the page clears room for the day, calms anxiety and surfaces unexpected ideas.',
        ],
        tip: 'Write before checking your messages. If nothing comes, write "nothing comes" until something does.',
      },
    },
  },
  {
    n: 28,
    level: 6,
    icon: 'flame',
    tracker: 'fear',
    category: 'growth',
    text: {
      fr: {
        title: 'Le grand saut',
        short: 'Faites une chose qui vous fait peur chaque jour pendant une semaine.',
        body: [
          'Le courage n\'est pas l\'absence de peur, c\'est d\'agir malgré elle. Chaque peur affrontée rétrécit et votre zone de confort s\'agrandit.',
          'Notez votre peur avant, puis après : vous verrez à quel point l\'anticipation est souvent pire que la réalité.',
        ],
        tip: 'Pas besoin de sauter en parachute : prendre la parole en réunion, appeler au lieu d\'écrire, demander une augmentation.',
      },
      en: {
        title: 'The leap',
        short: 'Do one thing that scares you every day for a week.',
        body: [
          'Courage is not the absence of fear — it is acting despite it. Every fear you face shrinks, and your comfort zone grows.',
          'Rate your fear before, then after: you\'ll see how often anticipation is worse than reality.',
        ],
        tip: 'No need to skydive: speak up in a meeting, call instead of texting, ask for a raise.',
      },
    },
  },
  {
    n: 29,
    level: 6,
    icon: 'envelope',
    tracker: 'messenger',
    category: 'growth',
    text: {
      fr: {
        title: 'Le messager',
        short: 'Dites à un proche ce qu\'il représente pour vous, chaque jour pendant une semaine.',
        body: [
          'Nous pensons souvent du bien des gens sans jamais le leur dire. Exprimer sa reconnaissance renforce les liens et rend heureux celui qui écrit autant que celui qui reçoit.',
          'Un appel, un message, une lettre : choisissez une personne différente chaque jour.',
        ],
        tip: 'Soyez précis : un souvenir partagé ou une qualité concrète touchent bien plus qu\'un « merci pour tout ».',
      },
      en: {
        title: 'The messenger',
        short: 'Tell someone close what they mean to you, every day for a week.',
        body: [
          'We often think well of people without ever telling them. Expressing gratitude strengthens bonds and makes the writer as happy as the reader.',
          'A call, a message, a letter: pick a different person every day.',
        ],
        tip: 'Be specific: a shared memory or a concrete quality touches far more than "thanks for everything".',
      },
    },
  },
  {
    n: 30,
    level: 6,
    icon: 'clock',
    tracker: 'fast',
    category: 'health',
    text: {
      fr: {
        title: 'Seize huit',
        short: 'Pratiquez le jeûne intermittent 16:8 chaque jour pendant une semaine.',
        body: [
          'Le jeûne 16:8 consiste à concentrer vos repas sur une fenêtre de huit heures et à jeûner les seize autres. Le corps puise dans ses réserves et se régénère.',
          'Au-delà des effets sur le métabolisme, c\'est un exercice de volonté qui transforme votre rapport à la faim.',
        ],
        tip: 'Le plus simple : sauter le petit-déjeuner et manger entre midi et 20h. Eau, thé et café noir sont autorisés… sauf si vous refaites « Défoncé à la vie ».',
      },
      en: {
        title: 'Sixteen eight',
        short: 'Practise 16:8 intermittent fasting every day for a week.',
        body: [
          '16:8 fasting means eating within an eight-hour window and fasting for the other sixteen. Your body taps into its reserves and regenerates.',
          'Beyond the metabolic effects, it is a willpower workout that changes your relationship with hunger.',
        ],
        tip: 'Easiest version: skip breakfast and eat between noon and 8 p.m. Water, tea and black coffee are fine… unless you\'re redoing "High on life".',
      },
    },
  },
]

export const CHALLENGES: Challenge[] = defs.map(d => ({
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

export function hashtag(c: Challenge): string {
  return `#MondayQuest${String(c.n).padStart(2, '0')}`
}

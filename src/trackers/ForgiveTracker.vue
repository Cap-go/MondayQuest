<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

// "Passer l'éponge": write the grudge, choose how you'll say it, then hold the sponge to
// wipe it off the page. The week goes from small grudges to the heavy one.
const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { who: '', what: '', how: '' as '' | 'call' | 'message' | 'person' | 'private' })

const who = ref(data.value.who)
const what = ref(data.value.what)

const PROMPTS = [
  { fr: 'Quelque chose de petit : un retard, une remarque, un oubli.', en: 'Something small: being late, a remark, a forgotten thing.' },
  { fr: 'Un agacement du quotidien avec un proche.', en: 'An everyday annoyance with someone close.' },
  { fr: 'Un collègue ou un voisin qui vous a froissé.', en: 'A colleague or a neighbour who rubbed you the wrong way.' },
  { fr: 'Un ami qui vous a déçu.', en: 'A friend who let you down.' },
  { fr: 'Un vieux reproche que vous traînez depuis longtemps.', en: 'An old grudge you have been carrying for a while.' },
  { fr: 'Un parent, pour quelque chose qui vous pèse encore.', en: 'A parent, for something that still weighs on you.' },
  { fr: 'Le plus lourd. Ou vous-même.', en: 'The heaviest one. Or yourself.' },
]
const prompt = computed(() => PROMPTS[Math.min(props.idx, 6)]!)

const HOW = [
  { id: 'call', fr: 'Appel', en: 'Call' },
  { id: 'message', fr: 'Message', en: 'Message' },
  { id: 'person', fr: 'En face', en: 'In person' },
  { id: 'private', fr: 'En privé', en: 'Privately' },
] as const

const ready = computed(() => who.value.trim().length > 0 && what.value.trim().length >= 4 && !!data.value.how)

function save() {
  patch({ who: who.value, what: what.value })
}

function pick(how: typeof HOW[number]['id']) {
  if (!props.editable || done.value)
    return
  haptic.select()
  patch({ how })
}

// Hold the sponge to wipe the grudge off the page.
const wipe = ref(0)
let raf = 0
let t0 = 0
let lastTick = 0
const HOLD = 1800

function press() {
  if (!props.editable || !ready.value || done.value)
    return
  save()
  t0 = performance.now()
  lastTick = 0
  const loop = (t: number) => {
    wipe.value = Math.min(1, (t - t0) / HOLD)
    if (t - lastTick > 160) {
      lastTick = t
      haptic.tap()
      sfx.play('erase', 0.35)
    }
    if (wipe.value >= 1) {
      sfx.play('chime')
      haptic.success()
      markDone({ who: who.value.trim(), what: what.value.trim(), how: data.value.how })
      return
    }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
}

function release() {
  cancelAnimationFrame(raf)
  if (!done.value)
    wipe.value = 0
}

onBeforeUnmount(() => cancelAnimationFrame(raf))

const howLabel = computed(() => HOW.find(h => h.id === data.value.how))
</script>

<template>
  <div>
    <p class="t-label text-graphite">
      {{ L(`Jour ${idx + 1}`, `Day ${idx + 1}`) }} · {{ L(prompt.fr, prompt.en) }}
    </p>

    <!-- the grudge, written on the page, wiped by the sponge -->
    <div class="slate mt-3" :style="{ '--w': done ? 1 : wipe }">
      <p class="t-display text-lg leading-tight">
        {{ L('Je pardonne à', 'I forgive') }}
        <input v-if="!done && editable" v-model="who" class="ink-input inline-input t-display" :placeholder="L('qui ?', 'who?')" @change="save">
        <span v-else>{{ data.who || '…' }}</span>
      </p>
      <p class="t-body mt-2">
        {{ L('pour', 'for') }}
      </p>
      <textarea v-if="!done && editable" v-model="what" rows="2" class="ink-input w-full resize-none" :placeholder="L('ce mot de trop au dîner de Noël…', 'that remark at the Christmas dinner…')" @change="save" />
      <p v-else class="t-body italic">
        {{ data.what || '…' }}
      </p>
      <div class="smear" />
      <p v-if="done" class="t-display released">
        {{ L('Éponge passée', 'Let go') }}
      </p>
    </div>

    <template v-if="!done && editable">
      <p class="t-label mt-4">
        {{ L('Je le lui dis par', 'I tell them by') }}
      </p>
      <div class="grid grid-cols-4 gap-1.5 mt-2">
        <button v-for="h in HOW" :key="h.id" class="how" :class="{ on: data.how === h.id }" @click="pick(h.id)">
          {{ L(h.fr, h.en) }}
        </button>
      </div>
      <p class="t-body text-xs text-pencil mt-2">
        {{ data.how === 'private'
          ? L('Si contacter la personne n\'est pas sûr ou pas sain pour vous, pardonner en privé compte aussi.', 'If contacting them isn\'t safe or healthy for you, forgiving privately counts too.')
          : L('Sans reproche caché : « Je repensais à ça, je voulais te dire que c\'est oublié. »', 'No hidden reproach: "I was thinking about that, I wanted to tell you it\'s forgotten."') }}
      </p>
      <button
        class="btn btn-ink w-full mt-4 select-none" :disabled="!ready"
        @pointerdown.prevent="press" @pointerup="release" @pointerleave="release" @pointercancel="release"
      >
        {{ ready ? L('C\'est dit. Maintenir pour passer l\'éponge', 'It\'s said. Hold to wipe it away') : L('Qui, pour quoi, et comment', 'Who, what for, and how') }}
      </button>
    </template>
    <p v-else-if="done && howLabel" class="t-label text-center text-graphite mt-3">
      {{ L('Dit par', 'Told by') }} · {{ L(howLabel.fr, howLabel.en) }}
    </p>
  </div>
</template>

<style scoped>
.slate {
  position: relative;
  padding: 16px;
  border: 2.5px solid var(--color-ink);
  background: var(--color-paper);
  overflow: hidden;
}

/* the sponge's wet trail grows from the left as you hold */
.smear {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(90deg, var(--color-paper) 0 calc(var(--w) * 100%), transparent calc(var(--w) * 100% + 30px));
  opacity: 0.94;
}

.released {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 1.6rem;
  animation: rise 900ms var(--ease-out-quint) both;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

.inline-input {
  display: inline-block;
  width: 9em;
  font-size: inherit;
}

.how {
  padding: 9px 2px;
  border: 2px solid var(--color-ink);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.7rem;
  text-transform: uppercase;
}

.how.on {
  background: var(--color-ink);
  color: var(--color-paper);
}
</style>

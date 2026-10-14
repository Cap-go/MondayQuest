<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { computed, ref } from 'vue'
import CameraCapture from '~/components/CameraCapture.vue'
import { useInView } from '~/composables/useInView'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

// A recipe card: name the dish, drop raw ingredients into the pot, serve.
const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone, unmark } = useDay(props, { dish: '', ingredients: [] as string[], photo: '' })
const MIN = 3

const draft = ref('')
const falling = ref<{ id: number, label: string } | null>(null)
let fid = 0

const ready = computed(() => !!data.value.dish.trim() && data.value.ingredients.length >= MIN)
const heat = computed(() => Math.min(1, data.value.ingredients.length / MIN))
/** At most 6 bubbles animate, however full the pot gets. */
const BUBBLES = 6
const bubbles = computed(() => Math.min(BUBBLES, data.value.ingredients.length))
const root = ref<HTMLElement>()
const visible = useInView(root)

function setDish(v: string) {
  patch({ dish: v })
  if (!v.trim() && done.value)
    unmark()
}

function add() {
  const label = draft.value.trim()
  if (!props.editable || !label || data.value.ingredients.length >= 12)
    return
  draft.value = ''
  falling.value = { id: ++fid, label }
  haptic.tap()
  sfx.play('whoosh', 0.4)
  setTimeout(() => {
    patch({ ingredients: [...data.value.ingredients, label] })
    sfx.play('water', 0.6)
    haptic.press()
    falling.value = null
  }, 520)
}

function remove(i: number) {
  if (!props.editable || done.value)
    return
  haptic.select()
  sfx.play('erase', 0.5)
  patch({ ingredients: data.value.ingredients.filter((_, j) => j !== i) })
}

const cam = ref<InstanceType<typeof CameraCapture> | null>(null)

function setPhoto(photo: string) {
  patch({ photo })
  sfx.play('shutter')
  haptic.success()
}

function serve() {
  if (!ready.value || done.value)
    return
  sfx.play('stamp')
  haptic.thud()
  markDone()
}
</script>

<template>
  <div ref="root" class="card border-[2.5px] border-ink p-4 bg-sheet" :class="{ 'anim-off': !visible }">
    <p class="t-label text-graphite">
      {{ L('On the menu') }}
    </p>
    <input
      class="ink-input t-display text-xl w-full" :value="data.dish" :disabled="!editable || done"
      :placeholder="L('Pumpkin soup')" @change="setDish(($event.target as HTMLInputElement).value)"
    >

    <!-- the plated dish replaces the pot once photographed -->
    <figure v-if="data.photo" class="plate mt-3">
      <img :src="data.photo" alt="">
      <figcaption class="t-body text-sm text-center mt-2">
        {{ data.dish || L('Homemade') }}
      </figcaption>
      <div v-if="done" class="stamp t-display">
        {{ L('Served') }}
      </div>
    </figure>

    <div v-else class="relative flex justify-center mt-3">
      <svg viewBox="0 0 200 130" class="w-48">
        <!-- steam -->
        <g v-if="heat > 0" fill="none" stroke="var(--color-pencil)" stroke-width="2.5" stroke-linecap="round">
          <g v-for="i in 3" :key="i" class="steam" :style="{ animationDelay: `${i * 0.4}s` }">
            <path :d="`M${60 + i * 20} 34 q-8 -10 0 -18 q8 -8 0 -18`" :style="{ opacity: heat }" />
          </g>
        </g>
        <!-- bubbles -->
        <circle v-for="(_, i) in bubbles" :key="i" :cx="58 + ((i * 37) % 84)" cy="52" :r="3 + (i % 3)" fill="none" stroke="var(--color-ink)" stroke-width="2" class="bubble" :style="{ animationDelay: `${(i * 0.31) % 1.4}s` }" />
        <!-- pot -->
        <path d="M40 48 h120 v52 q0 22 -22 22 h-76 q-22 0 -22 -22 z" fill="var(--color-paper)" stroke="var(--color-ink)" stroke-width="3" />
        <line x1="40" y1="48" x2="160" y2="48" stroke="var(--color-ink)" stroke-width="3" />
        <path d="M40 60 h-14 M160 60 h14" stroke="var(--color-ink)" stroke-width="3" />
        <!-- flame -->
        <g v-if="data.ingredients.length && !done" fill="none" stroke="var(--color-sun)" stroke-width="2.5">
          <path v-for="i in 3" :key="i" :d="`M${70 + i * 15} 128 q-4 -6 0 -10 q4 4 0 10`" class="flame" />
        </g>
      </svg>
      <span v-if="falling" :key="falling.id" class="drop t-label">{{ falling.label }}</span>
      <div v-if="done" class="stamp t-display">
        {{ L('Served') }}
      </div>
    </div>

    <TransitionGroup tag="div" name="chip" class="flex flex-wrap gap-1.5 mt-3 min-h-8">
      <button v-for="(it, i) in data.ingredients" :key="`${i}-${it}`" class="chip t-label" :disabled="!editable || done" @click="remove(i)">
        {{ it }}
      </button>
    </TransitionGroup>

    <form v-if="editable && !done" class="flex gap-2 mt-3" @submit.prevent="add">
      <input v-model="draft" class="ink-input flex-1" :placeholder="L('A raw ingredient…')">
      <button class="btn px-4" type="submit" :disabled="!draft.trim()">
        +
      </button>
    </form>

    <div v-if="editable" class="grid grid-cols-2 gap-2 mt-3">
      <button class="btn" @click="cam?.open()">
        {{ data.photo ? L('Retake') : L('Photo of the dish') }}
      </button>
      <button class="btn" @click="cam?.pick()">
        {{ L('Gallery') }}
      </button>
    </div>
    <CameraCapture ref="cam" position="rear" :hint="L('Your dish, at its best')" @shot="setPhoto" />

    <button v-if="!done" class="btn btn-ink w-full mt-3" :disabled="!editable || !ready" @click="serve">
      {{ ready ? L('Serve') : L(`${Math.max(0, MIN - data.ingredients.length)} more ingredient(s)`) }}
    </button>
  </div>
</template>

<style scoped>
.plate {
  position: relative;
  margin-inline: auto;
  width: 220px;
  padding: 10px 10px 6px;
  background: #fff;
  border: 1.5px solid var(--color-rule);
  box-shadow: 0 10px 30px -12px rgb(0 0 0 / 0.35);
  transform: rotate(2deg);
  animation: develop 700ms var(--ease-spring);
}

.plate img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

@keyframes develop {
  from {
    transform: rotate(-6deg) translateY(24px) scale(0.92);
    opacity: 0;
  }
}

.chip {
  padding: 3px 9px;
  border: 1.5px solid var(--color-ink);
  background: var(--color-paper);
}

.chip-enter-active {
  transition: all 350ms var(--ease-spring);
}

.chip-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.6);
}

.chip-leave-active {
  transition: all 200ms ease;
}

.chip-leave-to {
  opacity: 0;
  transform: scale(0.6);
}

.drop {
  position: absolute;
  top: 0;
  left: 50%;
  padding: 2px 8px;
  border: 1.5px solid var(--color-ink);
  background: var(--color-paper);
  animation: drop 520ms cubic-bezier(0.5, 0, 0.9, 0.4) forwards;
}

@keyframes drop {
  from {
    transform: translate(-50%, -20px) rotate(-8deg);
    opacity: 1;
  }
  to {
    transform: translate(-50%, 60px) rotate(14deg) scale(0.4);
    opacity: 0;
  }
}

.steam {
  animation: steam 2.2s ease-in-out infinite;
}

/* group opacity: same look as stroke-opacity on a single stroke, cheaper to animate */
@keyframes steam {
  0% {
    transform: translateY(6px);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(-8px);
    opacity: 0;
  }
}

.bubble {
  animation: bubble 1.4s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}

@keyframes bubble {
  50% {
    transform: translateY(-5px) scale(1.25);
  }
}

.flame {
  animation: flicker 400ms ease-in-out infinite alternate;
  transform-box: fill-box;
  transform-origin: bottom;
}

@keyframes flicker {
  to {
    transform: scaleY(1.3);
  }
}

.stamp {
  position: absolute;
  top: 38%;
  padding: 2px 14px;
  font-size: 1.6rem;
  border: 3px solid var(--color-ink);
  background: var(--color-paper);
  transform: rotate(-10deg);
  animation: stamp 420ms var(--ease-spring);
}

@keyframes stamp {
  from {
    transform: rotate(-10deg) scale(2.2);
    opacity: 0;
  }
}
</style>

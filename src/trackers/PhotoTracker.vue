<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { ref } from 'vue'
import CameraCapture from '~/components/CameraCapture.vue'
import { useL } from '~/composables/useL'
import { useDay } from './useDay'

// "No selfies!" — rear camera only, hand the phone to someone.
const props = defineProps<TrackerProps>()
const L = useL()
const { data, markDone } = useDay(props, { photo: '' })
const cam = ref<InstanceType<typeof CameraCapture> | null>(null)
</script>

<template>
  <div>
    <div class="polaroid mx-auto" :class="{ has: data.photo }">
      <div class="shot">
        <img v-if="data.photo" :src="data.photo" alt="">
        <span v-else class="t-label text-pencil">{{ L('No selfies!') }}</span>
      </div>
      <p class="t-body text-center text-sm mt-2">
        {{ L(`Day ${idx + 1}`) }}
      </p>
    </div>
    <div class="grid grid-cols-2 gap-3 mt-5">
      <button class="btn btn-ink" :disabled="!editable" @click="cam?.open()">
        {{ L('Hand over phone') }}
      </button>
      <button class="btn" :disabled="!editable" @click="cam?.pick()">
        {{ L('Gallery') }}
      </button>
    </div>
    <CameraCapture ref="cam" position="rear" :hint="L('Ask someone to take your picture')" @shot="photo => markDone({ photo })" />
  </div>
</template>

<style scoped>
.polaroid {
  width: 200px;
  padding: 10px 10px 8px;
  background: #fff;
  border: 1.5px solid var(--color-rule);
  box-shadow: 0 10px 30px -12px rgb(0 0 0 / 0.35);
  transform: rotate(-3deg);
  transition: transform 500ms var(--ease-spring);
}

.polaroid.has {
  animation: develop 700ms var(--ease-spring);
}

.shot {
  aspect-ratio: 4 / 5;
  display: grid;
  place-items: center;
  background: var(--color-paper);
  overflow: hidden;
}

.shot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: reveal 1.8s ease both;
}

@keyframes reveal {
  from {
    filter: brightness(2.4) contrast(0.3) grayscale(1);
  }
}

@keyframes develop {
  from {
    transform: rotate(8deg) translateY(30px) scale(0.9);
  }
}
</style>

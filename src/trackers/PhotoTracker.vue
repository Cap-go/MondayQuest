<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { Capacitor } from '@capacitor/core'
import { CameraPreview } from '@capgo/camera-preview'
import { PhotoLibrary } from '@capgo/capacitor-photo-library'
import { onBeforeUnmount, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, markDone } = useDay(props, { photo: '' })
const native = Capacitor.isNativePlatform()
const camera = ref(false)
const flash = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

/** Downscale to keep the notebook light (stored on device only). */
function shrink(src: string, max = 900): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = img.width * k
      c.height = img.height * k
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', 0.75))
    }
    img.onerror = () => resolve(src)
    img.src = src
  })
}

async function save(src: string) {
  markDone({ photo: await shrink(src) })
}

// "No selfies!" — rear camera only, hand the phone to someone.
async function openCamera() {
  if (!native)
    return fileInput.value?.click()
  haptic.tap()
  const perm = await CameraPreview.requestPermissions({ disableAudio: true }).catch(() => null)
  if (perm?.camera !== 'granted')
    return
  document.documentElement.classList.add('camera-on')
  camera.value = true
  // Full-screen preview: the default 4:3 frame leaves the native background showing below it.
  await CameraPreview.start({ position: 'rear', toBack: true, disableAudio: true, aspectRatio: 'fill', aspectMode: 'cover', includeSafeAreaInsets: false }).catch(close)
}

async function shoot() {
  sfx.play('shutter')
  haptic.thud()
  flash.value = true
  setTimeout(() => (flash.value = false), 180)
  const res = await CameraPreview.capture({ quality: 80, width: 1080 }).catch(() => null)
  await close()
  if (res?.value)
    await save(`data:image/jpeg;base64,${res.value}`)
}

async function close() {
  camera.value = false
  document.documentElement.classList.remove('camera-on')
  await CameraPreview.stop().catch(() => {})
}

async function fromLibrary() {
  if (!native)
    return fileInput.value?.click()
  const res = await PhotoLibrary.pickMedia({ selectionLimit: 1, includeImages: true, includeVideos: false, thumbnailWidth: 900, thumbnailHeight: 900 }).catch(() => null)
  const asset = res?.assets[0]
  const file = asset?.thumbnail ?? asset?.file
  if (file)
    await save(file.webPath ?? Capacitor.convertFileSrc(file.path))
}

function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f)
    return
  const r = new FileReader()
  r.onload = () => void save(String(r.result))
  r.readAsDataURL(f)
}

onBeforeUnmount(() => {
  if (camera.value)
    void close()
})
</script>

<template>
  <div>
    <div class="polaroid mx-auto" :class="{ has: data.photo }">
      <div class="shot">
        <img v-if="data.photo" :src="data.photo" alt="">
        <span v-else class="t-label text-pencil">{{ L('Pas de selfie !', 'No selfies!') }}</span>
      </div>
      <p class="t-body text-center text-sm mt-2">
        {{ L(`Jour ${idx + 1}`, `Day ${idx + 1}`) }}
      </p>
    </div>
    <div class="grid grid-cols-2 gap-3 mt-5">
      <button class="btn btn-ink" :disabled="!editable" @click="openCamera">
        {{ L('Tendre le téléphone', 'Hand over phone') }}
      </button>
      <button class="btn" :disabled="!editable" @click="fromLibrary">
        {{ L('Galerie', 'Gallery') }}
      </button>
    </div>
    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFile">

    <Teleport to="body">
      <div v-if="camera" class="cam-ui">
        <p class="t-label cam-hint">
          {{ L('Demandez à quelqu\'un de vous photographier', 'Ask someone to take your picture') }}
        </p>
        <div class="cam-bar">
          <button class="t-label cam-cancel" @click="close">
            {{ L('Annuler', 'Cancel') }}
          </button>
          <button class="shutter" aria-label="shutter" @click="shoot" />
          <span class="w-14" />
        </div>
        <div v-if="flash" class="cam-flash" />
      </div>
    </Teleport>
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

<style>
.cam-ui {
  position: fixed;
  inset: 0;
  background:
    linear-gradient(to bottom, rgb(0 0 0 / 0.45), transparent 18%),
    linear-gradient(to top, rgb(0 0 0 / 0.55), transparent 26%);
  z-index: 300;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: calc(var(--safe-top) + 20px) 24px calc(var(--safe-bottom) + 28px);
}

.cam-hint {
  color: #fff;
  text-align: center;
  text-shadow: 0 1px 6px rgb(0 0 0 / 0.6);
}

.cam-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cam-cancel {
  width: 56px;
  color: #fff;
  text-shadow: 0 1px 6px rgb(0 0 0 / 0.6);
}

.shutter {
  width: 78px;
  height: 78px;
  border-radius: 50%;
  border: 5px solid #fff;
  background: rgb(255 255 255 / 0.3);
  transition: transform 120ms;
}

.shutter:active {
  transform: scale(0.9);
}

.cam-flash {
  position: fixed;
  inset: 0;
  background: #fff;
  animation: camflash 180ms ease-out forwards;
}

@keyframes camflash {
  to {
    opacity: 0;
  }
}
</style>

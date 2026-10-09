<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { CameraPreview } from '@capgo/camera-preview'
import { PhotoLibrary } from '@capgo/capacitor-photo-library'
import { onBeforeUnmount, ref } from 'vue'
import { useL } from '~/composables/useL'
import { fileToDataUrl, shrinkImage } from '~/lib/image'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'

// Full-screen native camera behind a transparent WebView (global `camera-on` CSS hides the app),
// plus library and web file fallbacks. Emits a downscaled JPEG data URL.
const props = withDefaults(defineProps<{ position?: 'rear' | 'front', hint?: string }>(), { position: 'rear', hint: '' })
const emit = defineEmits<{ shot: [dataUrl: string] }>()
const L = useL()
const native = Capacitor.isNativePlatform()
const camera = ref(false)
const flash = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

async function done(src: string) {
  emit('shot', await shrinkImage(src))
}

async function open() {
  if (!native)
    return fileInput.value?.click()
  haptic.tap()
  const perm = await CameraPreview.requestPermissions({ disableAudio: true }).catch(() => null)
  if (perm?.camera !== 'granted')
    return
  document.documentElement.classList.add('camera-on')
  camera.value = true
  // Full-screen preview: the default 4:3 frame leaves the native background showing below it.
  await CameraPreview.start({ position: props.position, toBack: true, disableAudio: true, aspectRatio: 'fill', aspectMode: 'cover', includeSafeAreaInsets: false }).catch(close)
}

async function shoot() {
  sfx.play('shutter')
  haptic.thud()
  flash.value = true
  setTimeout(() => (flash.value = false), 180)
  const res = await CameraPreview.capture({ quality: 80, width: 1080 }).catch(() => null)
  await close()
  if (res?.value)
    await done(`data:image/jpeg;base64,${res.value}`)
}

async function close() {
  camera.value = false
  document.documentElement.classList.remove('camera-on')
  await CameraPreview.stop().catch(() => {})
}

async function pick() {
  if (!native)
    return fileInput.value?.click()
  const res = await PhotoLibrary.pickMedia({ selectionLimit: 1, includeImages: true, includeVideos: false, thumbnailWidth: 900, thumbnailHeight: 900 }).catch(() => null)
  const asset = res?.assets[0]
  const file = asset?.thumbnail ?? asset?.file
  if (file)
    await done(file.webPath ?? Capacitor.convertFileSrc(file.path))
}

async function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f)
    await done(await fileToDataUrl(f))
}

onBeforeUnmount(() => {
  if (camera.value)
    void close()
})

defineExpose({ open, pick })
</script>

<template>
  <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFile">
  <Teleport to="body">
    <div v-if="camera" class="cam-ui">
      <p v-if="hint" class="t-label cam-hint">
        {{ hint }}
      </p>
      <span v-else />
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
</template>

<style>
.cam-ui {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: calc(var(--safe-top) + 20px) 24px calc(var(--safe-bottom) + 28px);
  background:
    linear-gradient(to bottom, rgb(0 0 0 / 0.45), transparent 18%),
    linear-gradient(to top, rgb(0 0 0 / 0.55), transparent 26%);
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

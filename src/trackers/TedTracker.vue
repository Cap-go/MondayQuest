<script setup lang="ts">
import type { PluginListenerHandle } from '@capacitor/core'
import type { TrackerProps } from './useDay'
import { Capacitor } from '@capacitor/core'
import { InAppBrowser, ToolBarType } from '@capgo/capacitor-inappbrowser'
import { onBeforeUnmount, ref } from 'vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { useDay } from './useDay'

const props = defineProps<TrackerProps>()
const L = useL()
const { data, done, patch, markDone } = useDay(props, { topic: '', url: '' })
const draft = ref(data.value.topic)
const handles: PluginListenerHandle[] = []

function titleFromUrl(url: string) {
  const m = url.match(/ted\.com\/talks\/([^/?#]+)/)
  if (!m)
    return ''
  return m[1]!.split('_').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ')
}

async function open() {
  haptic.tap()
  const url = 'https://www.ted.com/talks'
  if (!Capacitor.isNativePlatform()) {
    window.open(url, '_blank')
    return
  }
  handles.push(await InAppBrowser.addListener('urlChangeEvent', (e) => {
    const t = titleFromUrl(e.url)
    if (t) {
      draft.value = t
      patch({ url: e.url })
    }
  }))
  handles.push(await InAppBrowser.addListener('closeEvent', () => {
    handles.splice(0).forEach(h => void h.remove())
  }))
  await InAppBrowser.openWebView({ url, title: 'TED', toolbarType: ToolBarType.NAVIGATION, toolbarColor: '#f6f4ef', toolbarTextColor: '#141414', backgroundColor: 'white' as any, showReloadButton: false, isPresentAfterPageLoad: true })
}

function save() {
  const topic = draft.value.trim()
  if (!topic)
    return
  markDone({ topic })
}

onBeforeUnmount(() => handles.forEach(h => void h.remove()))
</script>

<template>
  <div>
    <button class="ted-card w-full" :disabled="!editable" @click="open">
      <span class="t-display text-3xl">TED</span>
      <span class="t-body text-sm text-left">{{ L('Open ted.com and pick today\'s topic') }}</span>
      <span class="text-2xl">↗</span>
    </button>
    <label class="block mt-5">
      <span class="t-label">{{ L('Talk topic') }} :</span>
      <input v-model="draft" class="ink-input mt-1" :disabled="!editable" :placeholder="L('e.g. The power of vulnerability')" @keyup.enter="save">
    </label>
    <button class="btn btn-ink w-full mt-4" :disabled="!editable || !draft.trim() || (done && draft === data.topic)" @click="save">
      {{ done && draft === data.topic ? L('Talk watched ✓') : L('I watched it') }}
    </button>
  </div>
</template>

<style scoped>
.ted-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 2.5px solid var(--color-ink);
  background: var(--color-ink);
  color: var(--color-paper);
  transition: transform 180ms var(--ease-spring);
}

.ted-card:active {
  transform: scale(0.97);
}
</style>

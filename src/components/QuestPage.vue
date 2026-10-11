<script setup lang="ts">
import { setupPage } from '@capgo/capacitor-transitions/vue'
import { onMounted, onUnmounted, ref } from 'vue'
import { nativeTabs, setScrolledTitle } from '~/services/navigation'

/** `title`: tab pages pass their title; once the booklet heading scrolls away it stays on top in the native navbar. */
const props = defineProps<{ flush?: boolean, title?: string }>()
const emit = defineEmits<{ enter: [], leave: [] }>()

const page = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
let cleanup: (() => void) | undefined
let active = true
let compact = false
const COMPACT_AT = 64

function syncTitle(force = false) {
  if (!props.title || !nativeTabs || !active)
    return
  const next = (content.value?.scrollTop ?? 0) > COMPACT_AT
  if (next !== compact || force) {
    compact = next
    setScrolledTitle(next ? props.title : null)
  }
}

onMounted(() => {
  if (page.value) {
    cleanup = setupPage(page.value, {
      onDidEnter: () => {
        active = true
        syncTitle(true)
        emit('enter')
      },
      onWillLeave: () => {
        active = false
        emit('leave')
      },
    })
  }
})
onUnmounted(() => cleanup?.())
</script>

<template>
  <cap-page ref="page">
    <cap-content ref="content" slot="content" fullscreen scroll-y @scroll.passive="syncTitle()">
      <div :class="[props.flush ? 'page-flush' : 'page-body', { 'under-navbar': props.title }]">
        <slot />
      </div>
    </cap-content>
  </cap-page>
</template>

<style>
.page-body {
  min-height: 100%;
  /* Wide screens (iPhone Duo inner display, iPad): keep a booklet-width column. */
  max-width: 640px;
  margin-inline: auto;
  padding: calc(max(var(--safe-top), var(--cap-native-navigation-top, 0px)) + 18px) 20px calc(var(--safe-bottom) + var(--tabbar-h) + 36px);
}

/* Tab pages: the navbar only appears once scrolled and floats over the content (no jump). */
.page-body.under-navbar {
  padding-top: calc(var(--safe-top) + 18px);
}

.page-flush {
  min-height: 100%;
}
</style>

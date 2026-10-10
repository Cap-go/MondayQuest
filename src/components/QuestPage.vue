<script setup lang="ts">
import { setupPage } from '@capgo/capacitor-transitions/vue'
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{ flush?: boolean }>()
const emit = defineEmits<{ enter: [], leave: [] }>()

const page = ref<HTMLElement | null>(null)
let cleanup: (() => void) | undefined

onMounted(() => {
  if (page.value) {
    cleanup = setupPage(page.value, {
      onDidEnter: () => emit('enter'),
      onWillLeave: () => emit('leave'),
    })
  }
})
onUnmounted(() => cleanup?.())
</script>

<template>
  <cap-page ref="page">
    <cap-content slot="content" fullscreen scroll-y>
      <div :class="props.flush ? 'page-flush' : 'page-body'">
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

.page-flush {
  min-height: 100%;
}
</style>

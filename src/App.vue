<script setup lang="ts">
import type { TabId } from '~/services/navigation'
import { setupRouterOutlet } from '@capgo/capacitor-transitions/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import WebTabBar from '~/components/WebTabBar.vue'
import { activeTab, nativeTabs } from '~/services/navigation'

const outlet = ref<HTMLElement | null>(null)
const route = useRoute()
const showWebTabs = computed(() => !nativeTabs && !route.meta.hideTabs)
watch(() => route.meta.tab, (tab) => {
  if (tab)
    activeTab.value = tab as TabId
}, { immediate: true })

onMounted(() => {
  if (outlet.value)
    setupRouterOutlet(outlet.value, { platform: 'auto', swipeGesture: 'auto', keepInDom: true, maxCached: 6 })
})
</script>

<template>
  <div class="app-root" :class="{ 'has-web-tabs': showWebTabs }">
    <cap-router-outlet ref="outlet" class="outlet">
      <router-view />
    </cap-router-outlet>
    <Transition name="tabbar">
      <WebTabBar v-if="showWebTabs" />
    </Transition>
  </div>
</template>

<style>
.app-root {
  position: fixed;
  inset: 0;
  background: var(--color-paper);
  --tabbar-h: var(--cap-native-tabbar-height, 0px);
}

.app-root.has-web-tabs {
  --tabbar-h: 72px;
}

.outlet {
  position: absolute;
  inset: 0;
  display: block;
}

cap-page {
  background: var(--color-paper);
}

.tabbar-enter-active,
.tabbar-leave-active {
  transition: transform 320ms var(--ease-out-quint);
}

.tabbar-enter-from,
.tabbar-leave-to {
  transform: translateY(110%);
}
</style>

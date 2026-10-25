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
    <!-- Paper strip behind the iOS status bar so scrolled content never sits under the clock. -->
    <div class="status-scrim" aria-hidden="true" />
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
  inset: 0 var(--safe-right) 0 var(--safe-left);
  background: var(--color-paper);
  --tabbar-h: var(--cap-native-tabbar-height, 0px);
}

.app-root.has-web-tabs {
  --tabbar-h: 72px;
}

.outlet {
  container-type: inline-size;
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
.status-scrim {
  position: fixed;
  inset: 0 0 auto;
  /* Grows with the native navbar (iOS 26 draws it fully clear): content fades out under the title. */
  height: calc(max(var(--safe-top), var(--cap-native-navigation-top, 0px)) + 14px);
  z-index: 50;
  pointer-events: none;
  background: linear-gradient(var(--color-paper) calc(100% - 22px), rgb(246 244 239 / 0));
  transition: height 220ms var(--ease-out-quint);
}
</style>

<script setup lang="ts">
import type { TabId } from '~/services/navigation'
import { setDirection } from '@capgo/capacitor-transitions/vue'
import { useRouter } from 'vue-router'
import { haptic } from '~/services/haptics'
import { activeTab, TAB_ICONS, TABS } from '~/services/navigation'
import { sfx } from '~/services/sound'

// Browser fallback for the native tab bar drawn by @capgo/capacitor-native-navigation.
const router = useRouter()

function go(id: TabId) {
  if (activeTab.value === id)
    return
  haptic.select()
  sfx.play('tick', 0.4)
  activeTab.value = id
  setDirection('root')
  void router.push(`/${id}`)
}
</script>

<template>
  <nav class="web-tabbar">
    <button v-for="id in TABS" :key="id" class="tab" :class="{ on: activeTab === id }" @click="go(id)">
      <span class="ico" v-html="TAB_ICONS[id].svg" />
      <span class="t-label text-[0.62rem]">{{ $t(`tabs.${id}`) }}</span>
    </button>
  </nav>
</template>

<style scoped>
.web-tabbar {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(var(--safe-bottom) + 10px);
  height: 62px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: color-mix(in oklab, var(--color-sheet) 88%, transparent);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  border: 2.5px solid var(--color-ink);
  z-index: 50;
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--color-pencil);
  transition: color 200ms;
}

.tab.on {
  color: var(--color-ink);
}

.ico :deep(svg) {
  width: 24px;
  height: 24px;
  transition: transform 260ms var(--ease-spring);
}

.tab.on .ico :deep(svg) {
  transform: translateY(-1px) scale(1.12);
}
</style>

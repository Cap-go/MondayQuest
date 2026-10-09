<script setup lang="ts">
import type { Category, IconName } from '~/data/challenges'
import { toast } from '@capgo/capacitor-pretty-toast'
import { setDirection } from '@capgo/capacitor-transitions/vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import BackButton from '~/components/BackButton.vue'
import QuestIcon from '~/components/QuestIcon.vue'
import QuestPage from '~/components/QuestPage.vue'
import { useL } from '~/composables/useL'
import { CATEGORY_LABEL } from '~/data/challenges'
import { haptic } from '~/services/haptics'
import { useQuest } from '~/stores/quest'

const quest = useQuest()
const router = useRouter()
const L = useL()

const ICONS: IconName[] = ['star', 'heart', 'flame', 'drop', 'book', 'pencil', 'foot', 'moon', 'sunrise', 'compass', 'stones', 'bubble', 'clock', 'apple', 'arms', 'dot']
const title = ref('')
const short = ref('')
const long = ref('')
const tip = ref('')
const icon = ref<IconName>('star')
const category = ref<Category>('growth')
const valid = computed(() => title.value.trim() && short.value.trim())

function create() {
  if (!valid.value)
    return
  const t = { title: title.value.trim(), short: short.value.trim(), body: long.value.trim() ? long.value.trim().split(/\n+/) : [], tip: tip.value.trim() }
  const c = quest.addCustom({ icon: icon.value, tracker: 'custom', category: category.value, text: { fr: t, en: t } })
  haptic.success()
  toast.success(L('Challenge créé', 'Challenge created'), { message: t.title })
  setDirection('forward')
  void router.replace(`/challenge/${c.id}/read`)
}
</script>

<template>
  <QuestPage>
    <BackButton fallback="/levels" class="mb-4" />
    <div class="frame">
      <div class="frame-inner p-5">
        <div class="flex justify-center">
          <QuestIcon :key="icon" :name="icon" :size="64" draw />
        </div>
        <p class="t-label text-center text-graphite mt-3">
          {{ $t('custom.bonus') }}
        </p>
        <input v-model="title" class="ink-input t-display text-center text-xl mt-3" :placeholder="$t('custom.name')">
        <input v-model="short" class="ink-input text-center mt-3" :placeholder="$t('custom.short')">
        <p class="t-body italic text-center text-sm mt-3">
          - {{ CATEGORY_LABEL[category][quest.locale] }} #MondayQuestBonus
        </p>
        <textarea v-model="long" rows="4" class="ink-input mt-4 resize-none dashed-lines" :placeholder="$t('custom.long')" />
        <input v-model="tip" class="ink-input italic mt-3" :placeholder="`${$t('custom.tip')} : …`">
      </div>
    </div>

    <p class="t-label mt-6">
      {{ $t('custom.icon') }}
    </p>
    <div class="grid grid-cols-8 gap-2 mt-2">
      <button v-for="i in ICONS" :key="i" class="ico" :class="{ on: icon === i }" @click="icon = i; haptic.select()">
        <QuestIcon :name="i" :size="26" :stroke="3" />
      </button>
    </div>

    <p class="t-label mt-6">
      {{ $t('custom.category') }}
    </p>
    <div class="flex gap-2 mt-2">
      <button v-for="k in (['health', 'growth', 'wellbeing'] as const)" :key="k" class="chip" :class="{ on: category === k }" @click="category = k; haptic.select()">
        {{ CATEGORY_LABEL[k][quest.locale] }}
      </button>
    </div>

    <button class="btn btn-ink w-full mt-8" :disabled="!valid" @click="create">
      {{ $t('custom.create') }}
    </button>
  </QuestPage>
</template>

<style scoped>
.ico {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border: 2px solid transparent;
}

.ico.on {
  border-color: var(--color-ink);
}

.chip {
  padding: 8px 12px;
  border: 2px solid var(--color-ink);
  font-size: 0.85rem;
}

.chip.on {
  background: var(--color-ink);
  color: var(--color-paper);
}
</style>

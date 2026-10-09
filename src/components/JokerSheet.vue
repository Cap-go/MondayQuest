<script setup lang="ts">
import type { Challenge } from '~/data/challenges'
import { Capacitor } from '@capacitor/core'
import { FileSharer } from '@capgo/capacitor-file-sharer'
import { toast } from '@capgo/capacitor-pretty-toast'
import { computed, ref } from 'vue'
import QuestIcon from '~/components/QuestIcon.vue'
import { useL } from '~/composables/useL'
import { haptic } from '~/services/haptics'
import { sfx } from '~/services/sound'
import { MAX_SHARE_JOKERS, useQuest } from '~/stores/quest'

// Jokers keep people going when a challenge isn't for them: skip it (it still unlocks
// the next level), and earn more by sharing the app or redoing a finished challenge.
const props = defineProps<{ challenge?: Challenge }>()
const emit = defineEmits<{ used: [] }>()
const quest = useQuest()
const L = useL()
const sheet = ref<any>(null)
const sharing = ref(false)

const canUse = computed(() => !!props.challenge && quest.canUseJoker(props.challenge))
const title = computed(() => props.challenge?.text[quest.locale].title ?? '')

function present() {
  haptic.tap()
  sheet.value?.present?.()
}

function use() {
  if (!props.challenge || !quest.useJoker(props.challenge))
    return
  sfx.play('stamp')
  haptic.success()
  sheet.value?.dismiss?.()
  toast.success(L('Joker posé', 'Joker played'), { message: L(`« ${title.value} » est passé.`, `"${title.value}" is skipped.`) })
  emit('used')
}

/** Booklet-style invitation card, shared with the link. */
function card(): string {
  const c = document.createElement('canvas')
  c.width = 1080
  c.height = 1350
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#f6f4ef'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.fillStyle = '#141414'
  ctx.font = '800 150px Archivo'
  ctx.fillText('MONDAY', 90, 520)
  ctx.fillText('QUEST', 90, 670)
  ctx.font = '400 54px "Didact Gothic"'
  ctx.fillText(L('52 challenges, un par semaine.', '52 challenges, one a week.'), 96, 790)
  ctx.fillText(L('On commence lundi ?', 'Start with me on Monday?'), 96, 870)
  ctx.lineWidth = 12
  for (let i = 0; i < 7; i++) {
    ctx.strokeRect(96 + i * 128, 980, 92, 92)
    if (i < 3) {
      ctx.beginPath()
      ctx.moveTo(110 + i * 128, 1030)
      ctx.lineTo(132 + i * 128, 1056)
      ctx.lineTo(186 + i * 128, 984)
      ctx.stroke()
    }
  }
  ctx.font = '800 44px Archivo'
  ctx.fillText('MONDAYQUEST.COM', 96, 1230)
  return c.toDataURL('image/png').split(',')[1]!
}

async function share() {
  if (sharing.value)
    return
  sharing.value = true
  haptic.press()
  const text = L('Fais Monday Quest avec moi : 52 challenges, un chaque lundi. https://mondayquest.com', 'Do Monday Quest with me: 52 challenges, one every Monday. https://mondayquest.com')
  let shared = false
  try {
    if (Capacitor.isNativePlatform()) {
      await FileSharer.share({ filename: 'monday-quest.png', base64Data: card(), contentType: 'image/png', title: 'Monday Quest', text })
      shared = true
    }
    else if (navigator.share) {
      await navigator.share({ title: 'Monday Quest', text })
      shared = true
    }
    else {
      await navigator.clipboard.writeText(text)
      toast.info(L('Lien copié', 'Link copied'))
      shared = true
    }
  }
  catch {}
  sharing.value = false
  if (shared && quest.earnShareJoker()) {
    sfx.play('chime')
    haptic.success()
    toast.success(L('Joker gagné !', 'Joker earned!'), { message: L('Merci de faire tourner Monday Quest.', 'Thanks for spreading Monday Quest.') })
  }
}

defineExpose({ present })
</script>

<template>
  <cap-sheet ref="sheet" detents="34em" content-placement="bottom" swipe-dismissal="true">
    <cap-sheet-portal>
      <cap-sheet-view>
        <cap-sheet-backdrop />
        <cap-sheet-content class="joker-sheet">
          <cap-sheet-handle />
          <div class="flex items-end justify-between mt-2">
            <h3 class="t-display text-2xl">
              Jokers
            </h3>
            <div class="flex gap-1">
              <QuestIcon v-for="i in Math.max(quest.jokerBalance, 0)" :key="i" name="joker" :size="30" :stroke="3" />
              <span v-if="!quest.jokerBalance" class="t-label text-pencil">{{ L('aucun', 'none left') }}</span>
            </div>
          </div>
          <p class="t-body text-sm text-graphite mt-1">
            {{ L('Un joker passe un challenge qui ne vous parle pas. Il compte pour débloquer le niveau suivant.', 'A joker skips a challenge that isn\'t for you. It still counts to unlock the next level.') }}
          </p>

          <button v-if="canUse" class="choice inverted" @click="use">
            <span class="t-display text-lg">{{ L('Passer avec un joker', 'Skip with a joker') }}</span>
            <span class="t-body text-sm">« {{ title }} » · {{ L(`il en restera ${quest.jokerBalance - 1}`, `${quest.jokerBalance - 1} left after`) }}</span>
          </button>
          <p v-else-if="challenge && !quest.jokerBalance" class="t-body text-sm mt-3">
            {{ L('Plus de joker. Gagnez-en un :', 'No joker left. Earn one:') }}
          </p>

          <button class="choice" :disabled="sharing || quest.shareJokersLeft <= 0" @click="share">
            <span class="t-display text-lg">{{ L('Partager à un ami', 'Share with a friend') }} · +1</span>
            <span class="t-body text-sm text-graphite">
              {{ quest.shareJokersLeft > 0 ? L(`Encore ${quest.shareJokersLeft} joker(s) à gagner ainsi (max ${MAX_SHARE_JOKERS}).`, `${quest.shareJokersLeft} more joker(s) to earn this way (max ${MAX_SHARE_JOKERS}).`) : L('Maximum atteint, merci !', 'Maximum reached, thank you!') }}
            </span>
          </button>
          <div class="choice static">
            <span class="t-display text-lg">{{ L('Refaire un challenge', 'Repeat a challenge') }} · +1</span>
            <span class="t-body text-sm text-graphite">{{ L('Terminez une deuxième fois un challenge déjà réussi.', 'Finish a challenge you already completed once more.') }}</span>
          </div>
        </cap-sheet-content>
      </cap-sheet-view>
    </cap-sheet-portal>
  </cap-sheet>
</template>

<style scoped>
.joker-sheet {
  background: var(--color-sheet);
  padding: 10px 20px calc(var(--safe-bottom) + 24px);
  border-top: 2.5px solid var(--color-ink);
}

.choice {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  text-align: left;
  margin-top: 12px;
  padding: 14px 16px;
  border: 2.5px solid var(--color-ink);
  transition: transform 160ms var(--ease-spring);
}

.choice:active:not(.static) {
  transform: scale(0.98);
}

.choice.static {
  border-style: dashed;
}

.choice.inverted {
  background: var(--color-ink);
  color: var(--color-paper);
}

.choice:disabled {
  opacity: 0.5;
}
</style>

<script setup lang="ts">
import type { TrackerProps } from './useDay'
import { ref } from 'vue'
import { useDay } from './useDay'

// Generic "write what happened" page used by text-first challenges.
const props = defineProps<TrackerProps & { field: string, label: string, placeholder: string, cta: string, doneLabel: string }>()
const { data, done, markDone } = useDay(props, { [props.field]: '' } as Record<string, string>)
const draft = ref<string>(data.value[props.field] ?? '')

function save() {
  const v = draft.value.trim()
  if (v)
    markDone({ [props.field]: v })
}
</script>

<template>
  <div>
    <slot name="visual" :done="done" />
    <label class="block">
      <span class="t-label">{{ label }} :</span>
      <textarea v-model="draft" rows="3" class="ink-input mt-2 resize-none" :disabled="!editable" :placeholder="placeholder" />
    </label>
    <slot />
    <button class="btn btn-ink w-full mt-4" :disabled="!editable || !draft.trim() || (done && draft === data[field])" @click="save">
      {{ done && draft === data[field] ? doneLabel : cta }}
    </button>
  </div>
</template>

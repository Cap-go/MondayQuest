<script setup lang="ts">
// Monday Quest monogram: an "M" built from two slanted strokes, echoing the booklet's angular mark.
withDefaults(defineProps<{ size?: number }>(), { size: 48 })
</script>

<template>
  <svg :width="size" :height="size * 0.8" viewBox="0 0 60 48" fill="currentColor" aria-label="Monday Quest">
    <path d="M4 44 L16 4 H25 L13 44 Z" />
    <path d="M22 44 L34 4 H43 L31 44 Z" />
    <path d="M40 44 L46 24 H55 L49 44 Z" />
  </svg>
</template>

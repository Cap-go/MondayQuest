import type { Ref } from 'vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * True while `el` is on screen. Trackers put `anim-off` on their root when it is not,
 * so decorative loops (steam, ripples, waves) stop costing frames on the read page
 * or behind another tab.
 */
export function useInView(el: Ref<Element | null | undefined>) {
  const visible = ref(true)
  let io: IntersectionObserver | undefined
  onMounted(() => {
    if (!el.value || typeof IntersectionObserver === 'undefined')
      return
    io = new IntersectionObserver(([e]) => {
      visible.value = !!e?.isIntersecting
    })
    io.observe(el.value)
  })
  onBeforeUnmount(() => io?.disconnect())
  return visible
}

<script>
// The theme switch in the docs' top bar: light, dark, or the system's setting (the default).
// docs/public/vp-theme.js applies the theme, before the first paint and when a choice is made here;
// this only draws the three buttons and keeps the choice (the same localStorage entry).
import { ref } from 'vue'
import light from '@carbon/icons/es/light/20.js'
import asleep from '@carbon/icons/es/asleep/20.js'
import screenIcon from '@carbon/icons/es/screen/20.js'

const KEY = 'fcr-docs-theme'

// Carbon's icons one weight heavier, as on the rest of the site (src/lib/icons.js): each shape gets
// an outline in its own colour, half a unit on Carbon's 32-unit grid.
const escAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
const toSvg = (n) => `<${n.elem}${Object.entries(n.attrs || {}).map(([k, v]) => ` ${k}="${escAttr(v)}"`).join('')}>${(n.content || []).map(toSvg).join('')}</${n.elem}>`
function icon(d) {
  const { width, height, ...attrs } = d.attrs
  return toSvg({ ...d, attrs: { ...attrs, stroke: 'currentColor', 'stroke-width': 0.5, 'stroke-linejoin': 'miter', 'stroke-miterlimit': 10, width: 18, height: 18, 'aria-hidden': 'true', focusable: 'false' } })
}

const OPTIONS = [
  { id: 'light', label: 'Light', svg: icon(light) },
  { id: 'dark', label: 'Dark', svg: icon(asleep) },
  { id: 'system', label: 'System', svg: icon(screenIcon) },
]
// One choice for both places the switch appears (the top bar, and the menu on phones).
const choice = ref('system')
</script>

<script setup>
import { onMounted } from 'vue'

// In the phone menu the switch is a labelled row; in the top bar it is the buttons alone.
defineProps({ screen: { type: Boolean, default: false } })

onMounted(() => {
  try { const v = localStorage.getItem(KEY); if (v === 'light' || v === 'dark') choice.value = v } catch { /* no storage */ }
})

function pick(id) {
  choice.value = id
  try { if (id === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, id) } catch { /* no storage */ }
  window.fcrDocsTheme?.(id)
}
</script>

<template>
  <div class="theme-picker" :class="{ 'is-screen': screen }">
    <span v-if="screen" class="theme-picker-label" aria-hidden="true">Theme</span>
    <div class="theme-picker-options" role="group" aria-label="Theme">
      <button v-for="o in OPTIONS" :key="o.id" type="button" :aria-pressed="choice === o.id" :aria-label="o.label" :title="o.label" @click="pick(o.id)" v-html="o.svg"></button>
    </div>
  </div>
</template>

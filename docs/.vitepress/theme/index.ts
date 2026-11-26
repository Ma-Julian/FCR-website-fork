// The default VitePress theme in the home page's look (custom.css): the system type, so no font
// files, and a light and a dark theme with a switch in the top bar (ThemePicker.vue).
import { h } from 'vue'
import DefaultTheme from 'vitepress/theme-without-fonts'
import ThemePicker from './ThemePicker.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    // After the top bar's links; on phones, where those links move into the menu, in the menu.
    'nav-bar-content-after': () => h(ThemePicker),
    'nav-screen-content-after': () => h(ThemePicker, { screen: true }),
  }),
}

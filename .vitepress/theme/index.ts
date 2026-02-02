import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'

// Particle canvas background (same as standalone index.html)
import '../../src/styles/index.css'
// Overrides so nav and content sit on top of the canvas
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp() {
    if (typeof window === 'undefined') return
    import('../../src/scripts/app.js').catch((err) => {
      console.error('[particles] failed to load background app', err)
    })
  }
} satisfies Theme

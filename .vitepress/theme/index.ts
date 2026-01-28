import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'

// Global styles and WebGL canvas background (same as index.html experience)
import '../src/styles/index.scss'

export default {
  extends: DefaultTheme,
  enhanceApp() {
    // Run WebGL app only in the browser (no document/window during SSR)
    if (typeof window === 'undefined') return
    import('../src/scripts/app.js')
  }
} satisfies Theme

import { defineConfig } from 'vitepress'
import glslifyDeps from 'glslify-deps'
import glslifyBundle from 'glslify-bundle'


// https://vitepress.dev/reference/site-config
export default defineConfig({
  // Make dark mode the initial theme (important for dark particle background)
  appearance: 'dark',
  vite: {
    optimizeDeps: {
      include: ['three', 'gsap', 'dat.gui', 'tiny-emitter', 'lodash.debounce']
    }
  },
  title: "††",
  description: "My views",
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      {
        text: 'Articles',
        items: [
          { text: 'Joining Atoma', link: '/articles/joining-atoma' },
          { text: 'Sovereign Rollups', link: '/articles/sovereign-rollups' },
          { text: 'Trad Church Decline', link: '/articles/trad-church-decline' }
        ]
      },
      { text: 'Code', link: 'https://www.maschad.codes/' },
      { text: 'Recommended Reading', link: '/recommended-reading' }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/maschad' }
    ]
  },

  vue: {
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag.includes('three-')
      }
    }
  }
})

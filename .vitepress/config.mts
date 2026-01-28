import { defineConfig } from 'vitepress'
import glsl from 'vite-plugin-glsl'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  vite: {
    plugins: [
      // @ts-ignore - Type mismatch between vite-plugin-glsl and VitePress's bundled Vite
      glsl({
        include: [
          '**/*.glsl',
          '**/*.wgsl',
          '**/*.vert',
          '**/*.frag',
          '**/*.vs',
          '**/*.fs'
        ],
        exclude: undefined,
        warnDuplicatedImports: true,
        defaultExtension: 'glsl',
        watch: true,
      })
    ],
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

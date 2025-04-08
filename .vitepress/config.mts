import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "††",
  description: "My views",
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

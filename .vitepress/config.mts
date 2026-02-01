import { defineConfig } from 'vitepress'
import glslifyDeps from 'glslify-deps'
import glslifyBundle from 'glslify-bundle'

function glslifyShadersPlugin() {
  return {
    name: 'glslify-shaders',
    enforce: 'pre',
    async load(id: string) {
      const filepath = id.split('?', 1)[0]
      if (!/\.(glsl|wgsl|vert|frag|vs|fs)$/.test(filepath)) return null

      const depper = glslifyDeps({ cwd: process.cwd() })
      const deps = await new Promise<any[]>((resolve, reject) => {
        depper.add(filepath, (err: unknown, d: any[]) => {
          if (err) reject(err)
          else resolve(d)
        })
      })

      // Watch dependency files for HMR
      try {
        for (const d of deps) {
          if (d?.file) this.addWatchFile(d.file)
        }
      } catch {
        // ignore (watching is best-effort)
      }

      const bundled = glslifyBundle(deps)
      return `export default ${JSON.stringify(bundled)};`
    }
  }
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  // Make dark mode the initial theme (important for dark particle background)
  appearance: 'dark',
  vite: {
    plugins: [
      // Expand `#pragma glslify:` requires inside shader files
      glslifyShadersPlugin()
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

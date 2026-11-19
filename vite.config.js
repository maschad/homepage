import { defineConfig } from 'vite';
import path from 'path';
import glslifyDeps from 'glslify-deps';
import glslifyBundle from 'glslify-bundle';

// Load .vert/.frag/.glsl files as strings, resolving glslify #pragma imports
// (Parcel does this automatically; Vite needs this small plugin).
function glslify() {
  return {
    name: 'glslify',
    enforce: 'pre',
    async transform(src, id) {
      const file = id.split('?')[0];
      if (!/\.(vert|frag|glsl)$/.test(file)) return null;

      const dir = path.dirname(file);
      const depper = glslifyDeps({ cwd: dir });
      const tree = await new Promise((resolve, reject) => {
        depper.inline(src, dir, (err, deps) => (err ? reject(err) : resolve(deps)));
      });

      return { code: `export default ${JSON.stringify(glslifyBundle(tree))};`, map: null };
    },
  };
}

export default defineConfig({
  plugins: [glslify()],
  // The HTML and CSS reference files as /public/..., so serve that folder as-is
  publicDir: false,
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        reading: path.resolve(__dirname, 'recommended-reading.html'),
      },
    },
  },
});

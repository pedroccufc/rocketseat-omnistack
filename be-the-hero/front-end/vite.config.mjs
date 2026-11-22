import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';

// Preserve existing React 16 components: their JSX uses .js extensions.
function legacyJsxInJs() {
  return {
    name: 'legacy-jsx-in-js',
    enforce: 'pre',
    async transform(code, id) {
      if (!/\/src\/.*\.js(?:\?|$)/.test(id)) return null;
      return transformWithEsbuild(code, id, {
        loader: 'jsx',
        jsx: 'transform',
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment',
      });
    },
  };
}

export default defineConfig({
  plugins: [legacyJsxInJs(), react({ jsxRuntime: 'classic' })],
  build: { outDir: 'build' },
});

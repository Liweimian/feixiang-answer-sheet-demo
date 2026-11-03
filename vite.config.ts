import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

/**
 * Metis is built for a webpack/CRA toolchain and imports SVGs both ways:
 *   import { ReactComponent as Icon } from './x.svg'   // component
 *   import url from './x.svg'                          // asset URL
 * vite-plugin-svgr only yields the component, so re-attach the URL as the default export.
 * `?url` imports carry a query string, so they bypass this filter and reach Vite's asset pipeline.
 */
function craCompatibleSvg(): Plugin {
  const inner = svgr({
    include: '**/*.svg',
    svgrOptions: { exportType: 'named', namedExport: 'ReactComponent' },
  })
  const innerLoad = inner.load as (this: unknown, id: string) => Promise<{ code: string } | undefined>
  return {
    ...inner,
    name: 'cra-compatible-svg',
    async load(id) {
      const result = await innerLoad.call(this, id)
      if (!result) return
      const file = id.replace(/[?#].*$/s, '')
      return {
        code: `import __svgUrl from ${JSON.stringify(file + '?url')};\n${result.code}\nexport default __svgUrl;\n`,
        map: null,
      }
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), craCompatibleSvg()],
  resolve: {
    // @yuanfudao/metis-jwt imports Node's `buffer`; point it at the browser polyfill
    alias: { buffer: 'buffer/' },
  },
  define: {
    // some Metis transitive deps reference Node's `global`
    global: 'globalThis',
    // Metis reads the CRA-style env var at module load; undefined `process` blanks the page in dev
    'process.env.REACT_APP_ENV': JSON.stringify('development'),
  },
  optimizeDeps: {
    // dev pre-bundling runs through esbuild, which needs the same substitutions
    esbuildOptions: {
      define: {
        global: 'globalThis',
        'process.env.REACT_APP_ENV': JSON.stringify('development'),
      },
    },
  },
  css: {
    preprocessorOptions: {
      // Metis ships antd-style .less sources that rely on inline JS
      less: { javascriptEnabled: true },
    },
  },
  build: {
    // prototypes may be published publicly; don't ship source maps of the internal library
    sourcemap: false,
  },
})

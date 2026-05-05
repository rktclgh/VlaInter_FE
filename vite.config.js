import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const PDF_EXPORT_VENDOR_CHUNKS = ['jspdf-vendor', 'html2canvas-vendor']
const VITE_PRELOAD_HELPER_ID = 'vite/preload-helper'

function isPdfExportVendorDependency(dependency) {
  return PDF_EXPORT_VENDOR_CHUNKS.some((chunkName) =>
    dependency.includes(`${chunkName}-`) || dependency.includes(`${chunkName}.`),
  )
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === 'build'

  return {
    plugins: [react()],
    build: {
      // 배포 번들에서 소스맵 파일 생성을 막아 원본 추적 노출을 줄임
      sourcemap: false,
      minify: 'esbuild',
      cssMinify: true,
      modulePreload: {
        resolveDependencies(_url, deps, { hostType }) {
          if (hostType !== 'html') {
            return deps
          }

          return deps.filter((dependency) => !isPdfExportVendorDependency(dependency))
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes(VITE_PRELOAD_HELPER_ID)) {
              return 'vite-preload-helper'
            }

            if (id.includes('node_modules/jspdf')) {
              return 'jspdf-vendor'
            }

            if (id.includes('node_modules/html2canvas')) {
              return 'html2canvas-vendor'
            }
          },
        },
      },
    },
    esbuild: isBuild
      ? {
          minifyIdentifiers: true,
          minifySyntax: true,
          minifyWhitespace: true,
          legalComments: 'none',
          drop: ['console', 'debugger'],
        }
      : undefined,
  }
})

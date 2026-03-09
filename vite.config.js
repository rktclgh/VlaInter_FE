import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const distDir = join(process.cwd(), 'dist')
const assetsDir = join(distDir, 'assets')
const indexHtmlPath = join(distDir, 'index.html')

function fail(message) {
  console.error(message)
  process.exitCode = 1
}

if (!existsSync(indexHtmlPath) || !existsSync(assetsDir)) {
  fail('dist output is missing. Run npm run build before this check.')
  process.exit()
}

const indexHtml = readFileSync(indexHtmlPath, 'utf8')
const modulePreloadLines = indexHtml
  .split('\n')
  .filter((line) => line.includes('rel="modulepreload"'))

if (modulePreloadLines.some((line) => /(?:jspdf|html2canvas)-vendor/.test(line))) {
  fail('PDF export vendor chunks must not be initial HTML modulepreload dependencies.')
}

const assets = readdirSync(assetsDir)
const studentCourseChunk = assets.find((asset) => /^StudentCoursePage-.*\.js$/.test(asset))

if (!studentCourseChunk) {
  fail('StudentCoursePage chunk was not found in dist/assets.')
  process.exit()
}

const studentCourseCode = readFileSync(join(assetsDir, studentCourseChunk), 'utf8')

if (!/import\("\.\/html2canvas-vendor-[^"]+\.js"\)/.test(studentCourseCode)) {
  fail('StudentCoursePage must keep html2canvas as a dynamic import.')
}

if (!/import\("\.\/jspdf-vendor-[^"]+\.js"\)/.test(studentCourseCode)) {
  fail('StudentCoursePage must keep jspdf as a dynamic import.')
}

if (!assets.some((asset) => /^html2canvas-vendor-.*\.js$/.test(asset))) {
  fail('html2canvas vendor chunk was not emitted.')
}

if (!assets.some((asset) => /^jspdf-vendor-.*\.js$/.test(asset))) {
  fail('jspdf vendor chunk was not emitted.')
}

if (process.exitCode) {
  process.exit()
}

console.log('PDF export vendor preload check passed.')

import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const url = process.argv[2]
const w = Number(process.argv[3] || 1440)
const h = Number(process.argv[4] || 900)
const theme = process.argv[5] || 'dark'

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({
  viewport: { width: w, height: h },
  deviceScaleFactor: 1,
  colorScheme: theme === 'dark' ? 'dark' : 'light',
})
const page = await ctx.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(`pageerror: ${e.message.slice(0, 200)}`))
page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${m.text().slice(0, 200)}`) })
page.on('unhandledrejection', (e) => errs.push(`rejection: ${String(e.reason).slice(0, 200)}`))
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2000)
await fs.mkdir('/workspace/.caps', { recursive: true })
const sections = await page.$$('[data-showcase-section]')
for (let i = 0; i < sections.length; i++) {
  const sec = sections[i]
  const id = await sec.evaluate(el => el.id)
  await sec.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `/workspace/.caps/${theme}-${w}-${id}.png` })
}
// Overflow horizontal? alguma seção passa da largura da viewport?
const overflow = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth
  const bad = []
  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.right > vw + 1 || r.left < -1) {
      const cls = (el.className && typeof el.className === 'string') ? el.className.slice(0, 60) : ''
      bad.push(`${el.tagName}.${cls} left=${Math.round(r.left)} right=${Math.round(r.right)} vw=${vw}`)
    }
  })
  return bad.slice(0, 20)
})
console.log('errors:', errs.length); errs.forEach(e => console.log('  ', e))
console.log('overflow elements:', overflow.length)
overflow.forEach(o => console.log('  ', o))
await browser.close()

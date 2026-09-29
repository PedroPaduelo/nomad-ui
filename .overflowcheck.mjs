import { chromium } from 'playwright'
const url = process.argv[2]
const w = Number(process.argv[3] || 1440)
const h = Number(process.argv[4] || 900)
const theme = process.argv[5] || 'dark'
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({
  viewport: { width: w, height: h },
  colorScheme: theme === 'dark' ? 'dark' : 'light',
})
const page = await ctx.newPage()
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2000)
const overflow = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth
  const isScrollContainer = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p)
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll' || cs.overflow === 'hidden') return true
    }
    return false
  }
  const bad = []
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.right > vw + 1 || r.left < -1) {
      if (isScrollContainer(el)) return // dentro de scroll container: rola, não vaza
      const cls = (typeof el.className === 'string') ? el.className.slice(0, 50) : ''
      bad.push(`${el.tagName}.${cls} l=${Math.round(r.left)} r=${Math.round(r.right)} vw=${vw}`)
    }
  })
  return bad.slice(0, 15)
})
console.log('overflow REAL:', overflow.length)
overflow.forEach(o => console.log('  ', o))
await browser.close()

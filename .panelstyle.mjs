import { chromium } from 'playwright'
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
await page.goto('https://sb-nomad-ui-app.mp.serendiped.com/?section=barra-nomad', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const info = await page.evaluate(() => {
  const out = []
  document.querySelectorAll('.ntb-panel--inline').forEach((p) => {
    const cs = getComputedStyle(p)
    out.push({
      inlineStyle: p.getAttribute('style'),
      computedMaxWidth: cs.maxWidth,
      computedWidth: cs.width,
      minWidth: cs.minWidth,
      boxSizing: cs.boxSizing,
      rectW: Math.round(p.getBoundingClientRect().width),
    })
  })
  return out
})
console.log(JSON.stringify(info, null, 2))
await browser.close()

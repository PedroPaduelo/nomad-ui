import { chromium } from 'playwright'
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
await page.goto('https://sb-nomad-ui-app.mp.serendiped.com/?section=barra-nomad', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const info = await page.evaluate(() => {
  const out = {}
  const card = document.querySelector('[data-testid="topbar-closed"]')
  if (card) {
    const cr = card.getBoundingClientRect()
    const bar = card.querySelector('.ntb-root') || card.firstElementChild
    const br = bar?.getBoundingClientRect()
    out.card = { left: Math.round(cr.left), right: Math.round(cr.right), w: Math.round(cr.width) }
    out.bar = br ? { left: Math.round(br.left), right: Math.round(br.right), w: Math.round(br.width) } : null
    out.barClipped = br ? (br.left < cr.left - 1 || br.right > cr.right + 1) : null
  }
  return out
})
console.log(JSON.stringify(info, null, 2))
await page.screenshot({ path: '/workspace/.cap-topbar.png' })
await browser.close()

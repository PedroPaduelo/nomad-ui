import { chromium } from 'playwright'
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
await page.goto('https://sb-nomad-ui-app.mp.serendiped.com/?section=barra-nomad', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const info = await page.evaluate(() => {
  const out = []
  document.querySelectorAll('.ntb-pop-root--inline').forEach((r) => {
    const rr = r.getBoundingClientRect()
    const panel = r.querySelector('.ntb-panel--inline')
    const pr = panel?.getBoundingClientRect()
    const card = r.closest('.relative')
    const cr = card?.getBoundingClientRect()
    out.push({
      rootW: Math.round(rr.width), rootLeft: Math.round(rr.left), rootRight: Math.round(rr.right),
      panelW: pr ? Math.round(pr.width) : null, panelLeft: pr ? Math.round(pr.left) : null,
      cardW: cr ? Math.round(cr.width) : null, cardLeft: cr ? Math.round(cr.left) : null, cardRight: cr ? Math.round(cr.right) : null,
    })
  })
  return out
})
console.log(JSON.stringify(info, null, 2))
await browser.close()

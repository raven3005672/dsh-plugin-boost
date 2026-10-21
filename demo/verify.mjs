import { chromium } from '/Users/yanglin/github/deepseek-harness/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const here = path.dirname(new URL(import.meta.url).pathname)
const url = pathToFileURL(path.join(here, 'index.html')).href
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })

await page.goto(url)
await page.waitForTimeout(300)

const support = await page.evaluate(() => ({
  highlightApi: typeof CSS !== 'undefined' && !!CSS.highlights,
  messages: document.querySelectorAll('[data-chat-node-key]').length,
}))

// 1. 真实鼠标划选 + 右键，验证菜单
const box = await page.evaluate(() => {
  const p = document.querySelectorAll('[data-chat-node-key="assistant-step:1:1"] .markdown p')[0]
  const text = p.firstChild
  const r = document.createRange()
  r.setStart(text, 4)
  r.setEnd(text, 14)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(r)
  const rect = r.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, selected: r.toString() }
})
await page.mouse.click(box.x, box.y, { button: 'right' })
await page.waitForTimeout(150)
const menuVisible = await page.evaluate(() => getComputedStyle(document.getElementById('menu')).display)
await page.screenshot({ path: path.join(here, 'shot-menu.png') })

// 2. 点“标注”，写注释，保存
await page.click('#menu button[data-act="annotate"]')
await page.fill('#composer textarea', '这里说的就是冻结机制')
await page.click('#composer button[data-act="composer-save"]')
await page.waitForTimeout(250)
const afterSave = await page.evaluate(() => ({
  count: window.__demo.annotations.length,
  highlights: window.__demo.highlightCount(),
  stats: window.__demo.stats(),
}))

// 3. 再来两条，用于展示多条高亮
await page.evaluate(() => {
  window.__demo.addAt('assistant-step:1:1', 640, 12, '')
  window.__demo.addAt('assistant-step:1:2', 90, 16, '引文兜底的判定阈值')
})
await page.waitForTimeout(200)
await page.screenshot({ path: path.join(here, 'shot-highlight.png') })

// 4. 刷新页面，验证持久化 + 重定位
await page.reload()
await page.waitForTimeout(400)
const afterReload = await page.evaluate(() => ({
  count: window.__demo.annotations.length,
  highlights: window.__demo.highlightCount(),
  statuses: window.__demo.stats().counts,
}))

// 5. 前文改写 → 偏移失效，看是否走引文兜底
await page.click('#btn-shift')
await page.waitForTimeout(200)
const afterShift = await page.evaluate(() => window.__demo.stats())
await page.screenshot({ path: path.join(here, 'shot-shift.png') })

// 6. 性能：300 条全量重定位（读取页面自报的耗时）
await page.click('#btn-perf')
await page.waitForTimeout(120)
const perfText = await page.textContent('#hint')

// 6.5 最坏情况：两条消息前文都被改写 → 全部锚点走引文兜底
await page.click('#btn-shift-all')
await page.waitForTimeout(250)
const worst = await page.evaluate(() => window.__demo.stats())
await page.screenshot({ path: path.join(here, 'shot-worst.png') })

// 6.6 点列表项 → active 高亮（橙色）
await page.click('#list li')
await page.waitForTimeout(200)
const active = await page.evaluate(() => ({
  hasActive: CSS.highlights.has('dsh-annotation-active'),
  count: window.__demo.highlightCount(),
}))

// 7. 流式追加期间的单帧耗时
const stream = await page.evaluate(async () => {
  const body = document.querySelector('[data-chat-node-key="assistant-step:1:2"] .markdown')
  const p = document.createElement('p')
  body.append(p)
  const text = '流式追加性能测试：每个字符一帧，记录重定位开销。'.repeat(4)
  let max = 0, sum = 0, n = 0
  for (const ch of text) {
    await new Promise(r => requestAnimationFrame(r))
    const t = performance.now()
    p.textContent += ch
    max = Math.max(max, performance.now() - t); sum += performance.now() - t; n++
  }
  return { max, avg: sum / n, chars: n }
})

console.log(JSON.stringify({ support, menuVisible, selected: box.selected, afterSave, afterReload, afterShift, perfText, worst, active, stream, errors }, null, 2))
await browser.close()

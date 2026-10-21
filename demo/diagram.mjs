import { chromium } from '/Users/yanglin/github/deepseek-harness/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const here = path.dirname(new URL(import.meta.url).pathname)
const url = `file://${path.join(here, 'index.html')}`

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
await page.goto(url)
await page.waitForTimeout(300)

// 两条标注，位置上分散一点，方便看图
await page.evaluate(() => {
  window.__demo.addAt('assistant-step:1:1', 120, 14, '这里说的是冻结块的时机')
  window.__demo.addAt('assistant-step:1:1', 560, 18, '')
  window.__demo.addAt('assistant-step:1:2', 60, 20, '引文兜底的判据')
})
await page.waitForTimeout(200)

// 选中一段文字并右键，让菜单可见
const anchor = await page.evaluate(() => {
  const p = document.querySelectorAll('[data-chat-node-key="assistant-step:1:1"] .markdown p')[1]
  const text = p.firstChild
  const len = text.nodeValue.length
  const r = document.createRange()
  r.setStart(text, 2)
  r.setEnd(text, Math.min(len - 1, 2 + Math.min(12, len - 3)))
  window.getSelection().removeAllRanges()
  window.getSelection().addRange(r)
  const rect = r.getBoundingClientRect()
  return { x: rect.left + 60, y: rect.top + 8 }
})
await page.mouse.click(anchor.x, anchor.y, { button: 'right' })
await page.waitForTimeout(150)

const shotMain = (await page.screenshot()).toString('base64')

const rects = await page.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel)
    if (el === null) return null
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  }
  const highlight = (() => {
    const reg = CSS.highlights.get('dsh-annotation')
    if (!reg) return null
    const range = [...reg][1]
    if (!range) return null
    const r = range.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })()
  return {
    chat: box('#chat'),
    message: box('[data-chat-node-key="assistant-step:1:1"]'),
    markdown: box('[data-chat-node-key="assistant-step:1:1"] .markdown'),
    highlight,
    panel: box('#panel'),
    panelHeader: box('#panel header'),
    listItem: box('#list li'),
    badge: box('#list .badge'),
    tools: box('#tools'),
    stats: box('#stats'),
    menu: box('#menu'),
    hint: box('#hint'),
  }
})

// 打开注释框拍一张小图
await page.click('#menu button[data-act="annotate"]')
await page.waitForTimeout(200)
const composerRect = await page.evaluate(() => {
  const r = document.getElementById('composer').getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
const shotComposer = (await page.screenshot({
  clip: { x: composerRect.x - 12, y: composerRect.y - 12, width: composerRect.w + 24, height: composerRect.h + 24 },
})).toString('base64')

const S = 0.78
const marks = [
  { n: 1, label: '会话区', tone: 'dsh', r: rects.chat },
  { n: 2, label: '消息卡片', tone: 'dsh', r: rects.message },
  { n: 3, label: 'Markdown 正文', tone: 'dsh', r: rects.markdown },
  { n: 4, label: '高亮段', tone: 'algo', r: rects.highlight },
  { n: 5, label: '标注面板', tone: 'demo', r: rects.panel, corner: 'right' },
  { n: 6, label: '标注列表项', tone: 'demo', r: rects.listItem },
  { n: 7, label: '状态徽章', tone: 'algo', r: rects.badge },
  { n: 8, label: '操作按钮区', tone: 'demo', r: rects.tools },
  { n: 9, label: '统计区', tone: 'algo', r: rects.stats },
  { n: 10, label: '右键菜单', tone: 'float', r: rects.menu },
  { n: 12, label: '底部提示', tone: 'demo', r: rects.hint },
]

const toneColor = { dsh: '#2563eb', algo: '#b45309', demo: '#6b7280', float: '#7c3aed' }

const boxes = marks.map(({ n, r, tone, corner }) => {
  if (r === null) return ''
  const x = r.x * S, y = r.y * S, w = r.w * S, h = r.h * S
  const c = toneColor[tone]
  // 窄框把编号放到右上角，避免压住里面的文字
  const right = w < 110 || corner === 'right'
  const left = Math.max(2, right ? (x + w - 9) : (x - 9))
  const top = Math.max(2, y - 9)
  return `<div class="box" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-color:${c}">
    <span class="num" style="background:${c};left:${left}px;top:${top}px">${n}</span></div>`
}).join('')

const legend = [
  { group: 'DSH 本体（插件不改，只读它的 DOM）', items: [1, 2, 3] },
  { group: '算法产物（这条链路要做出来的东西）', items: [4, 7, 9] },
  { group: 'demo 脚手架（不打算进插件）', items: [5, 6, 8, 12] },
  { group: '浮层（触发时出现）', items: [10, 11] },
]
const names = { 1: '会话区 #chat', 2: '消息卡片 .msg', 3: 'Markdown 正文', 4: '高亮段（CSS Highlight）', 5: '标注面板 #panel', 6: '标注列表项 li', 7: '状态徽章 exact/fuzzy/lost', 8: '操作按钮区 #tools', 9: '统计区 #stats', 10: '右键菜单 #menu', 11: '注释输入框 #composer', 12: '底部提示 .hint' }

const legendHtml = legend.map(({ group, items }) => `
  <div class="group">
    <div class="gtitle">${group}</div>
    ${items.map(n => `<div class="item"><span class="num2" style="background:${toneColor[(marks.find(m => m.n === n)?.tone) ?? 'float']}">${n}</span>${names[n]}</div>`).join('')}
  </div>`).join('')

const html = `<!doctype html><meta charset="utf-8">
<style>
  body { margin:0; background:#eef0f4; font:13px/1.55 -apple-system,'PingFang SC',sans-serif; color:#1f2328; }
  .wrap { display:flex; gap:20px; padding:20px; align-items:flex-start; }
  .stage { position:relative; width:${1280 * S}px; height:${900 * S}px; flex:none;
           background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,.08); }
  .stage img { position:absolute; inset:0; width:100%; height:100%; }
  .box { position:absolute; border:1.5px solid; border-radius:4px; box-sizing:border-box; }
  .num { position:absolute; color:#fff; font-size:11px; font-weight:700; width:18px; height:18px;
         border-radius:50%; display:grid; place-items:center; box-shadow:0 0 0 2px #fff; }
  .side { width:330px; flex:none; display:grid; gap:12px; }
  .card { background:#fff; border-radius:10px; padding:14px 16px; box-shadow:0 2px 10px rgba(0,0,0,.06); }
  .gtitle { font-weight:600; font-size:12px; color:#374151; margin:2px 0 6px; }
  .group + .group { border-top:1px solid #eceff3; margin-top:10px; padding-top:10px; }
  .item { display:flex; align-items:center; gap:8px; font-size:12.5px; padding:2px 0; }
  .num2 { width:18px; height:18px; border-radius:50%; color:#fff; font-size:11px; font-weight:700;
          display:inline-grid; place-items:center; flex:none; }
  .inset { text-align:center; }
  .inset img { max-width:100%; border-radius:6px; border:1px solid #e5e7eb; }
  .cap { font-size:11.5px; color:#6b7280; margin-top:6px; }
  h1 { font-size:15px; margin:0 0 4px; }
  .sub { font-size:11.5px; color:#6b7280; }
</style>
<div class="wrap">
  <div class="stage"><img src="data:image/png;base64,${shotMain}">${boxes}</div>
  <div class="side">
    <div class="card">
      <h1>demo 页面布局</h1>
      <div class="sub">1280×900 视口，按区域编号</div>
      ${legendHtml}
    </div>
    <div class="card inset">
      <div class="gtitle"><span class="num2" style="background:${toneColor.float}">11</span> 注释输入框 #composer</div>
      <img src="data:image/png;base64,${shotComposer}">
      <div class="cap">点「标注」后出现在选区下方，浮在正文之上</div>
    </div>
  </div>
</div>`

const out = await browser.newPage({ viewport: { width: 1500, height: 880 }, deviceScaleFactor: 2 })
await out.setContent(html)
await out.waitForTimeout(400)
await out.screenshot({ path: path.join(here, 'layout.png') })
await browser.close()
console.log('written', path.join(here, 'layout.png'))

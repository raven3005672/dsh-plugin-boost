import { chromium } from '/Users/yanglin/github/deepseek-harness/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const here = path.dirname(new URL(import.meta.url).pathname)
const shot = readFileSync('/tmp/dsh-window.png').toString('base64')

// 窗口坐标系（1602 × 820），由窗口截图目测得到
const W = 1602
const H = 820

const regions = [
  { n: 1, x: 0, y: 0, w: 278, h: 820, tone: 'shell', name: '侧栏' },
  { n: 2, x: 278, y: 0, w: 910, h: 74, tone: 'shell', name: '顶栏' },
  { n: 3, x: 278, y: 74, w: 910, h: 746, tone: 'chat', name: '会话区（滚动容器）' },
  { n: 4, x: 358, y: 80, w: 620, h: 320, tone: 'chat', name: '消息正文（选区来源）' },
  { n: 5, x: 398, y: 406, w: 674, h: 50, tone: 'chat', name: '工具结果卡片', corner: 'tr' },
  { n: 6, x: 788, y: 500, w: 284, h: 58, tone: 'chat', name: '用户消息气泡' },
  { n: 7, x: 370, y: 596, w: 330, h: 28, tone: 'chat', name: '工具执行行' },
  { n: 8, x: 370, y: 686, w: 704, h: 104, tone: 'input', name: '输入框' },
  { n: 9, x: 378, y: 748, w: 688, h: 36, tone: 'input', name: '输入框工具条' },
  { n: 10, x: 390, y: 792, w: 650, h: 22, tone: 'input', name: '状态栏' },
  { n: 11, x: 1188, y: 0, w: 414, h: 820, tone: 'right', name: '右栏（开始面板）' },
  { n: 12, x: 0, y: 0, w: W, h: H, tone: 'overlay', name: '浮层作用范围', corner: 'br' },
]

const tone = { shell: '#38bdf8', chat: '#f59e0b', input: '#34d399', right: '#a78bfa', overlay: '#f472b6' }
const S = 0.9

const boxes = regions.map(({ n, x, y, w, h, tone: t, corner }) => {
  const c = tone[t]
  const dashed = t === 'overlay' ? 'border-style:dashed;' : ''
  const narrow = w * S < 130
  const right = narrow || corner === 'tr' || corner === 'br'
  const bottom = corner === 'br'
  const left = Math.max(2, right ? (x + w) * S - 20 : x * S + 3)
  const top = bottom ? (y + h) * S - 22 : Math.max(2, y * S + 3)
  return `<div class="box" style="left:${x * S}px;top:${y * S}px;width:${w * S}px;height:${h * S}px;border-color:${c};${dashed}">
    <span class="num" style="background:${c};left:${left - x * S}px;top:${top - y * S}px">${n}</span></div>`
}).join('')

const groups = [
  { title: '外壳骨架（DSH 自身，插件只读）', items: [1, 2, 3, 11] },
  { title: '会话区内部（标注交互发生的地方）', items: [4, 5, 6, 7] },
  { title: '输入区（「添加到对话中」的去处）', items: [8, 9, 10] },
  { title: '浮层（菜单、注释框将来画在这一层）', items: [12] },
]

const legend = groups.map(({ title, items }) => `
  <div class="group">
    <div class="gtitle">${title}</div>
    ${items.map(n => {
      const r = regions.find(x => x.n === n)
      return `<div class="item"><span class="badge" style="background:${tone[r.tone]}">${n}</span>${r.name}</div>`
    }).join('')}
  </div>`).join('')

const html = `<!doctype html><meta charset="utf-8">
<style>
  body { margin:0; background:#eef0f4; font:13px/1.6 -apple-system,'PingFang SC',sans-serif; color:#111827; }
  .wrap { display:flex; gap:18px; padding:18px; align-items:flex-start; }
  .stage { position:relative; width:${W * S}px; height:${H * S}px; flex:none; border-radius:8px; overflow:hidden;
           box-shadow:0 4px 18px rgba(0,0,0,.18); background:#000; }
  .stage img { position:absolute; inset:0; width:100%; height:100%; display:block; }
  .box { position:absolute; border:2px solid; box-sizing:border-box; border-radius:3px; }
  .num { position:absolute; width:18px; height:18px; border-radius:50%; color:#fff; font-size:11px; font-weight:700;
         display:grid; place-items:center; box-shadow:0 0 0 2px rgba(255,255,255,.85); }
  .side { width:300px; flex:none; background:#fff; border-radius:10px; padding:14px 16px; box-shadow:0 2px 10px rgba(0,0,0,.08); }
  h1 { font-size:14px; margin:0 0 2px; }
  .sub { font-size:11px; color:#6b7280; margin-bottom:10px; }
  .group + .group { border-top:1px solid #eceff3; margin-top:9px; padding-top:9px; }
  .gtitle { font-size:11.5px; font-weight:600; color:#374151; margin-bottom:5px; }
  .item { display:flex; align-items:center; gap:8px; font-size:12.5px; padding:1.5px 0; }
  .badge { width:17px; height:17px; border-radius:50%; color:#fff; font-size:10.5px; font-weight:700;
           display:inline-grid; place-items:center; flex:none; }
</style>
<div class="wrap">
  <div class="stage"><img src="data:image/png;base64,${shot}">${boxes}</div>
  <div class="side"><h1>DSH 主界面分区</h1><div class="sub">1602 × 820 窗口，按区域编号</div>${legend}</div>
</div>`

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1810, height: 780 }, deviceScaleFactor: 2 })
await page.setContent(html)
await page.waitForTimeout(300)
await page.screenshot({ path: path.join(here, 'dsh-layout.png') })
await browser.close()
console.log('written')

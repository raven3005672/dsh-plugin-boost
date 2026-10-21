# DSH 标注 Demo（锚点算法 + CSS Highlight）

一个零依赖的单文件 demo，用来验证「选中回答里的文字 → 右键 → 标注」这个交互在 DSH Web 端是否可行，重点是回答两个疑问：**重定位会不会卡**、**锚点会不会漂**。

> 目前只是交互与算法的验证页，**还不是插件包**：没有 `dsh.client` 清单、没有 slot 注册、也没有接入 DSH 的存储。等交互细节定下来再决定怎么落进插件。

直接双击 `index.html` 用 Chrome 打开即可（需要 CSS Custom Highlight API，Chrome 105+）。

## 交互

1. 用鼠标选中任意一段回答文字
2. 右键 → 「标注」
3. 写注释（可留空）→ 保存
4. 右栏可以看到全部标注；点一条会滚动定位并显示橙色 active 高亮

## 锚点怎么存

```js
{
  nodeKey: 'assistant-step:1:1',  // 消息身份，取自 DSH 的 data-chat-node-key
  start: 22, end: 33,             // 渲染后纯文本的字符偏移
  quote: '到达浏览器时是一段',      // 引文，用于校验与兜底
  prefix: '…前 32 字',            // 前文，给候选打分
  suffix: '…后 32 字',            // 后文
  note: '这里说的就是冻结机制'
}
```

解析顺序：**偏移直命中**（失败才走）→ **引文扫描 + 前后文打分**（唯一候选或得分够高才算命中）→ 否则标记 `lost`。

## 实测数据（本机 Chrome 155 / Apple Silicon）

| 场景 | 结果 |
|---|---|
| 300 条锚点，偏移全部命中 | **0.40 ms**，300/300 命中 |
| 300 条锚点，偏移全部失效（全部走引文兜底） | **0.60 ms**，300/300 命中 |
| 流式逐字符追加，每帧重定位 | 平均 0.12 ms，最长 0.30 ms |
| 刷新页面后重定位 3 条 | 3/3 `exact`，标注位置不变 |
| 摘要文字被改写（偏移后移 8 字） | 自动转 `fuzzy`，位置仍然正确 |

关键优化：**一次重定位里同一条消息只遍历一次文本节点**（`cache`），否则 N 条锚点就是 N 次 DOM 树遍历——这是初版最慢的一环，加上缓存后耗时降到原来的约 60%。

## 面板按钮

- **模拟重新渲染**：把整棵 DOM 重建一遍，偏移不变，应当全部 `exact`
- **模拟前文被改写**：只改第一条消息的标题，验证单条锚点的兜底
- **最坏情况：两条都改写**：在两条消息前各插一段，所有偏移失效，全部走引文兜底
- **模拟流式追加**：3 秒逐字追加，观察重定位是否跟得上
- **性能测试**：临时生成 300 条锚点，分别测「偏移命中」和「全部失效」的耗时

## 已知限制（有意留白，不是 bug）

- 跨消息的选区直接拒绝；跨块选区没有拆分
- 高亮统一黄色（active 为橙色）。每条标注独立配色需要静态的 highlight 名，`::highlight()` 不支持通配
- 折叠区（DSH 里 reasoning / turn-process 收起的内容）不在 DOM 里，这类锚点会 `lost`
- 用 localStorage 代替 DSH 的 `dsh storage`，仅用于 demo

## 移植到 DSH 的落点

- 绘制：`CSS.highlights.set('dsh-annotation', new Highlight(...ranges))`，完全不动 DOM，因此不会碰 `MarkdownText` 的冻结块缓存
- 消息身份：`ChatNodeSeat` 已经给每个节点挂了 `data-chat-node-key`，`closest()` 直接取
- 菜单：`ui-primitives` 的 `Menu` / `MenuSurface`
- 时机：`MutationObserver` 盯 `[data-chat-flow]`，用 `requestAnimationFrame` 合并到一帧
- 存储：`dsh storage`（非 session 存储），按 sessionId + nodeKey 索引
- **Web 端可行；桌面端右键菜单在 Electron 主进程里，插件改不了**

## 自动化验证

```sh
node verify.mjs   # 需要本地有 playwright 与 Chrome，会输出各项断言并截图
```

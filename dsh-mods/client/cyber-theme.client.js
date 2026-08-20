// 赛博主题 v2（code.client 载荷）：全窗口皮肤，不限于任何任务/会话。
// 机制：主题 token 由 ui-layout 的 presenter 挂到 <body>，整个 Web UI（侧栏/会话/
// 详情/设置/编辑器/工具卡片）都消费 --dsw-alias-* 变量，因此主题天生作用于整个窗口；
// 本载荷再叠加三层全窗口效果：氛围层（扫描线+CRT 暗角+透视网格）、HUD 层（四角霓虹
// 框架+状态文字+开机故障动画）、交互层（选区/焦点/悬停霓虹）。
// 运行前先 cordis_inspect_query 核对 ctx.theme 的 register/setTheme 签名，再
// cordis_define + cordis_run。回滚：ctx.theme.setTheme('dark') 或 cordis_stop。
// 契约来源：packages/client/ui-theme/src/client/index.ts ——
// ThemeDefinition.tokens 是扁平单值映射（Record<string,string>），
// 双模式 {light,dark} 属于 overrideTokens 层，不属于 register。

export const inject = ['theme']

const TOKENS = {
  '--dsw-alias-bg-base': '#05070d',
  '--dsw-alias-bg-layer-1': '#0a0f1c',
  '--dsw-alias-bg-layer-2': '#111a2e',
  '--dsw-alias-bg-overlay': '#16213a',
  '--dsw-alias-border-l1': '#1e2c4a',
  '--dsw-alias-border-l2': '#2c4a7a',
  '--dsw-alias-brand-primary': '#00f0ff',
  '--dsw-alias-label-primary': '#d6f5ff',
  '--dsw-alias-label-secondary': '#7fa8c9',
  '--dsw-alias-state-error-primary': '#ff2e63',
  '--dsw-alias-state-success-primary': '#00ff9d',
  '--dsw-alias-state-warn-primary': '#ffb300',
  '--dsw-specific-sidebar-fill': '#070b14',
}

// 全窗口氛围 + 交互样式。只使用主题 token 与通用选择器，不依赖任何组件内部结构；
// 动效只用 opacity/transform，尊重 prefers-reduced-motion。
const GLOBAL_CSS = `
/* ── 氛围层 ─────────────────────────────────────────────── */
body {
  text-shadow: 0 0 1px rgba(0, 240, 255, 0.22);
  background-image:
    radial-gradient(1200px 600px at 80% -10%, rgba(0, 240, 255, 0.08), transparent 60%),
    radial-gradient(900px 500px at 10% 110%, rgba(255, 46, 99, 0.07), transparent 60%);
  background-attachment: fixed;
}
/* CRT 暗角 */
body::before {
  content: "";
  position: fixed; inset: 0; z-index: 9998; pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.42) 100%);
}
/* 扫描线 */
body::after {
  content: "";
  position: fixed; inset: 0; z-index: 9999; pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(0, 240, 255, 0.04) 0 1px, transparent 1px 3px);
  mix-blend-mode: screen;
}
/* 底部透视网格（缓慢上移） */
.dsh-cyber-grid {
  position: fixed; left: 0; right: 0; bottom: -20%; height: 55%; z-index: 9997; pointer-events: none;
  background-image:
    linear-gradient(rgba(0, 240, 255, 0.10) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 240, 255, 0.10) 1px, transparent 1px);
  background-size: 44px 44px;
  transform: perspective(320px) rotateX(58deg);
  mask-image: linear-gradient(transparent, black 60%);
  animation: dsh-cyber-grid-move 30s linear infinite;
}
@keyframes dsh-cyber-grid-move {
  from { background-position: 0 0, 0 0; }
  to   { background-position: 0 44px, 0 0; }
}
/* ── 交互层（含焦点可见性，保证键盘可用） ──────────────── */
*::selection { background: rgba(0, 240, 255, 0.9); color: #05070d; }
input:focus-visible, textarea:focus-visible, button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
  outline: 1px solid var(--dsw-alias-brand-primary, #00f0ff);
  outline-offset: 1px;
  box-shadow: 0 0 0 3px rgba(0, 240, 255, 0.18);
}
button:hover:not(:disabled), a:hover {
  filter: drop-shadow(0 0 5px rgba(0, 240, 255, 0.35));
}
/* ── 开机故障动画（一次性） ─────────────────────────────── */
.dsh-cyber-boot { animation: dsh-cyber-boot-glitch 1.1s steps(2, end) 1; }
@keyframes dsh-cyber-boot-glitch {
  0%   { filter: none; }
  12%  { filter: invert(0.9) hue-rotate(90deg); transform: translateX(-2px); }
  24%  { filter: none; transform: translateX(2px); }
  36%  { filter: saturate(4); }
  48%  { filter: none; }
  100% { filter: none; }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-cyber-grid { animation: none; }
  .dsh-cyber-boot { animation: none; }
}
`

// 四角 HUD：霓虹角框 + 状态文字。
const HUD_SPECS = [
  { label: 'DSH.CYBER OS', pos: 'top:12px;left:14px;', borders: 'border-top:1px solid var(--dsw-alias-brand-primary,#00f0ff);border-left:1px solid var(--dsw-alias-brand-primary,#00f0ff);' },
  { label: 'SYS.ONLINE', pos: 'top:12px;right:14px;', borders: 'border-top:1px solid var(--dsw-alias-state-success-primary,#00ff9d);border-right:1px solid var(--dsw-alias-state-success-primary,#00ff9d);' },
  { label: 'MODE: SHOWTIME', pos: 'bottom:12px;left:14px;', borders: 'border-bottom:1px solid var(--dsw-alias-state-warn-primary,#ffb300);border-left:1px solid var(--dsw-alias-state-warn-primary,#ffb300);' },
  { label: 'SKIN: FULL-WINDOW', pos: 'bottom:12px;right:14px;', borders: 'border-bottom:1px solid var(--dsw-alias-state-error-primary,#ff2e63);border-right:1px solid var(--dsw-alias-state-error-primary,#ff2e63);' },
]

export function apply(ctx) {
  // 1) 注册全窗口主题并立即切换。
  ctx.effect(() => ctx.theme.register({
    id: 'cyber',
    colorScheme: 'dark',
    tokens: TOKENS,
  }), 'cyber-theme: register')
  ctx.theme.setTheme('cyber')

  // 2) 注入全局样式表。
  ctx.effect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-dsh-cyber', 'true')
    style.textContent = GLOBAL_CSS
    document.head.appendChild(style)
    return () => { style.remove() }
  }, 'cyber-theme: global css')

  // 3) 挂载四角 HUD 与网格层。
  ctx.effect(() => {
    const pieces = []
    for (const spec of HUD_SPECS) {
      const el = document.createElement('div')
      el.setAttribute('data-dsh-cyber', 'true')
      el.style.cssText = `position:fixed;${spec.pos}z-index:10000;pointer-events:none;` +
        `padding:6px 10px;${spec.borders}` +
        `color:var(--dsw-alias-label-secondary,#7fa8c9);` +
        `font:11px/1.4 Consolas,monospace;letter-spacing:2px;` +
        `text-shadow:0 0 6px rgba(0,240,255,0.5);`
      el.textContent = spec.label
      document.body.appendChild(el)
      pieces.push(el)
    }
    const grid = document.createElement('div')
    grid.className = 'dsh-cyber-grid'
    grid.setAttribute('data-dsh-cyber', 'true')
    document.body.appendChild(grid)
    pieces.push(grid)
    return () => { for (const el of pieces) el.remove() }
  }, 'cyber-theme: hud + grid')

  // 4) 开机故障动画（一次性，自动摘除 class）。
  ctx.effect(() => {
    document.documentElement.classList.add('dsh-cyber-boot')
    const timer = setTimeout(() => {
      document.documentElement.classList.remove('dsh-cyber-boot')
    }, 1200)
    return () => { clearTimeout(timer); document.documentElement.classList.remove('dsh-cyber-boot') }
  }, 'cyber-theme: boot glitch')
}

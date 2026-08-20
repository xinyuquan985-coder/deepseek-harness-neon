// VS 对决视图（code.client 载荷 v1）：向 conversation.view 槽位注册「VS 对决」标签页，
// 渲染分屏 VS 视觉外壳（左=正方蓝 / 中=VS 徽章+回合 / 右=反方红 / 底=裁判栏）。
// v1 是纯视觉外壳 + 占位：真实子代理数据接线放 v2（先在创造模式会话里用
// Service.listService / Slots.listSubTree 查 sessions 绑定与事件 API，再接入）。
// 注册姿势对齐 packages/client/ui-trajectory/src/client/index.ts 的官方样板。
// 运行前：cordis_inspect_query 核对 'conversation.view' 槽位的 PropsRuntime 与
// 客户端运行时里 React 的导入方式，再 cordis_define + cordis_run。

import React, { useEffect, useState } from 'react'

export const inject = ['slots']

export function apply(ctx) {
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'debate-vs',
    order: 5,
    label: () => 'VS 对决',
    inject: (sessionId) => ({ sessionId }),
  }, DebateVSView))
}

function DebateVSView(props) {
  const [round, setRound] = useState(0)
  // v1 占位数据；v2 从会话事件流（辩论战报消息）解析真实回合与双方内容。
  const affirmative = '正方 · 待立论'
  const negative = '反方 · 待立论'
  const verdict = '裁判席 · 待裁决'

  useEffect(() => {
    // v2 接线点：订阅会话事件，识别战报消息更新 round/双方内容。
    return undefined
  }, [])

  return React.createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 96px 1fr',
      gridTemplateRows: '1fr auto',
      gap: '10px',
      height: '100%',
      padding: '12px',
      boxSizing: 'border-box',
      color: 'var(--dsw-alias-label-primary, #d6f5ff)',
      background: 'var(--dsw-alias-bg-base, #05070d)',
    },
  },
    React.createElement('section', { style: sideStyle('rgba(0,240,255,0.10)', '#00f0ff') },
      React.createElement('h2', { style: h2Style('#00f0ff') }, '正方'),
      React.createElement('pre', { style: bodyStyle() }, affirmative),
    ),
    React.createElement('aside', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' } },
      React.createElement('div', { style: { fontSize: '34px', fontWeight: 900, fontStyle: 'italic', color: '#ff2e63', textShadow: '0 0 12px rgba(255,46,99,0.8)' } }, 'VS'),
      React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary, #7fa8c9)' } }, `第 ${round} 回合`),
    ),
    React.createElement('section', { style: sideStyle('rgba(255,46,99,0.10)', '#ff2e63') },
      React.createElement('h2', { style: h2Style('#ff2e63') }, '反方'),
      React.createElement('pre', { style: bodyStyle() }, negative),
    ),
    React.createElement('footer', {
      style: {
        gridColumn: '1 / -1',
        borderTop: '1px solid var(--dsw-alias-border-l1, #1e2c4a)',
        paddingTop: '8px',
        color: 'var(--dsw-alias-state-warn-primary, #ffb300)',
        fontSize: '13px',
      },
    }, verdict),
  )
}

function sideStyle(fill, accent) {
  return {
    border: `1px solid ${accent}`,
    borderRadius: '8px',
    background: fill,
    padding: '12px',
    boxShadow: `0 0 18px ${accent}33, inset 0 0 24px ${accent}14`,
    overflow: 'auto',
  }
}

function h2Style(color) {
  return { margin: '0 0 8px', fontSize: '16px', color, letterSpacing: '2px' }
}

function bodyStyle() {
  return { margin: 0, whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: 1.6, fontFamily: 'inherit' }
}

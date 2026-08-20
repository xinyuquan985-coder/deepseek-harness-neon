# @deepseek-ai/dsh-client-ui-persona

[English](README.md) | 中文

赛博朋克角色皮肤插件，浏览器侧：填充由 [ui-conversation](../ui-conversation/README.md) 聊天视图声明的键位插槽 `conversation.chat.persona` 的三个条目——`user` 与 `steering` 渲染「网络行者」皮肤，`assistant-step` 渲染「Blackwall_AI」皮肤。每个条目由项目内 CG 肖像、单层斜切平角头像框、名牌和状态组成。默认对话与代码执行工作台使用同一套 82×80 头像几何：AI 身份区位于消息框外左侧，用户身份区位于消息框外右侧；仅翻转网络行者肖像，使人物朝向对话内侧。角色可以替换头像内容，但不得改变边框几何和尺寸。头像行通过 `body[data-theme-id='cyber']`（由 ui-layout 呈现器投影）以 CSS 门控只在赛博朋克主题显示，浅色／深色主题保持原样；卸载本插件不影响聊天行，因为未认领的键位渲染为空。

## 模型体验

无模型可见表面：本插件只贡献展示层皮肤，不产生会话事件、不写会话数据。

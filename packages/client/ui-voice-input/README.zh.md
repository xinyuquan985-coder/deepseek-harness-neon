# @deepseek-ai/dsh-client-ui-voice-input

[English](README.md) | 中文

会话头部的语音输入开关，浏览器侧：向 `conversation.session.header.actions` 注册一个麦克风动作。当浏览器提供 SpeechRecognition 实现时，点击开关会开启 zh-CN 语音识别会话，最终识别文本通过框架的 `inputActions.setDraft` 追加进输入框草稿；中间结果被忽略。API 缺失时开关不渲染，且其 CSS 通过 `body[data-theme-id='cyber']` 门控只在赛博朋克主题显示，浅色/深色主题的头部保持原样。识别音频由浏览器自带的语音服务处理；在用户发送前，任何转写文本都不会进入会话日志。

## 模型体验

发送前无模型可见表面：本插件只写输入框草稿，自身不产生会话事件。

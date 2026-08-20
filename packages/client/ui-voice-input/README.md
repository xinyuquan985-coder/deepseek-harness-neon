# @deepseek-ai/dsh-client-ui-voice-input

English | [中文](README.zh.md)

Voice input toggle for the session header, browser half: registers a mic action into `conversation.session.header.actions`. When the browser exposes a SpeechRecognition implementation, clicking the toggle starts a zh-CN recognition session whose final transcripts append to the composer draft through the framework's `inputActions.setDraft`; interim results are ignored. The toggle renders nothing where the API is absent, and its CSS gates visibility to the cyber theme (`body[data-theme-id='cyber']`), so the light/dark palettes keep their header chrome unchanged. Recognition audio is handled by the browser's own speech service; no transcript ever crosses the session log until the user sends the message.

## Model Experience

No model-visible surface until send: the plugin only writes the composer draft. It emits no session events by itself.

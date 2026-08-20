# @deepseek-ai/dsh-client-ui-persona

English | [中文](README.zh.md)

Cyberpunk character-skin plugin, browser half: fills the keyed `conversation.chat.persona` seat (declared by [ui-conversation](../ui-conversation/README.md)'s chat view) with three entries — `user` and `steering` render the netrunner skin, while `assistant-step` renders the Blackwall AI skin. Each entry mounts a project-owned CG portrait inside one flat-chamfered frame plus a nameplate and status. Conversation and Code Execution use the same 82×80 portrait geometry: the assistant identity sits outside the message on the left, the user identity sits outside it on the right, and only the netrunner raster is mirrored so the character faces inward. A role can replace portrait content without changing frame geometry or dimensions. The rows are CSS-gated to the Cyber theme through `body[data-theme-id='cyber']` (projected by ui-layout's presenter), so the light/dark palettes keep their chrome; uninstalling the plugin leaves chat rows intact because unclaimed keys render nothing.

## Model Experience

No model-visible surface: this plugin contributes presentation-only chrome. It emits no session events and writes no session data.

# creator-trial 安装脚本：把「内容创作」预设与 3 个技能安装到 DSH 用户目录。
# 用法：powershell -ExecutionPolicy Bypass -File install.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$presetDest = Join-Path $dshHome '.agent-presets\creator'
$skillsDest = Join-Path $dshHome 'skills'
New-Item -ItemType Directory -Force -Path $presetDest, $skillsDest | Out-Null
Copy-Item -Recurse -Force (Join-Path $root 'preset\creator\*') $presetDest
foreach ($s in 'topic-research', 'review-draft', 'video-script') {
  Copy-Item -Recurse -Force (Join-Path $root "skills\$s") (Join-Path $skillsDest $s)
}
Write-Host "已安装：预设 -> $presetDest"
Write-Host "已安装：技能 -> $skillsDest"
Write-Host "无需重启：新建会话时在预设选择器中选择「内容创作」。"

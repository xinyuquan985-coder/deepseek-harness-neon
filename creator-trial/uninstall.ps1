# creator-trial 卸载脚本。
$ErrorActionPreference = 'Stop'
$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
Remove-Item -Recurse -Force (Join-Path $dshHome '.agent-presets\creator')
foreach ($s in 'topic-research', 'review-draft', 'video-script') {
  Remove-Item -Recurse -Force (Join-Path $dshHome "skills\$s")
}
Write-Host "已卸载 creator 预设与 3 个技能。"

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'prepare_home_lower_v7.ps1') -LibraryOnly
$panelSource = 'E:\Codex\.codex\generated_images\01a00e76-e7a7-7b20-bc0a-2a3ce82f3f1c\exec-3e52805b-173c-4cd7-b3cc-0dd657b13b2b.png'
$panelDir = Join-Path $PSScriptRoot '..\public\assets\home-v8'
New-Item -ItemType Directory -Path $panelDir -Force | Out-Null
$panelOutput = Join-Path $panelDir 'paper-panel.png'
# Source already has true alpha. Only trim transparent padding and resize.
[HomeStickerPack]::Prepare($panelSource, $panelOutput, 'alpha', 1200)
[HomeStickerPack]::Audit($panelOutput)

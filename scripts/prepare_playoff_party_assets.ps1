$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$assetDir = Join-Path $projectRoot 'public\assets\v3-pages\playoff-party-v1'
$tempDir = Join-Path $projectRoot 'tmp\imagegen\playoff-party-v1'
$helper = 'E:\Codex\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py'
$python = 'C:\Users\Administrator\AppData\Local\Programs\Python\Python314\python.exe'

New-Item -ItemType Directory -Force -Path $assetDir, $tempDir | Out-Null

$sources = @{
  'playoff-title-v1.png' = 'E:\Codex\.codex\generated_images\019fe294-a84c-7a42-a0ac-e9915f432e4f\exec-94701b2f-a98e-4682-88b4-3bb0f0f06089.png'
  'bracket-paper-v1.png' = 'E:\Codex\.codex\generated_images\019fe294-a84c-7a42-a0ac-e9915f432e4f\exec-c37d86de-60ec-4f0f-a523-1339cebc2678.png'
  'current-series-panel-v1.png' = 'E:\Codex\.codex\generated_images\019fe294-a84c-7a42-a0ac-e9915f432e4f\exec-ae47aa2f-cbaa-43da-ae77-b1e6baf86e96.png'
  'filter-tabs-v1.png' = 'E:\Codex\.codex\generated_images\019fe294-a84c-7a42-a0ac-e9915f432e4f\exec-9ec45402-7ade-4321-a0b0-2dfe3a61c24f.png'
  'matchup-card-v1.png' = 'E:\Codex\.codex\generated_images\019fe294-a84c-7a42-a0ac-e9915f432e4f\exec-6aa111ad-a24d-45b4-b3f4-acf2a17a439e.png'
  'series-game-card-v1.png' = 'E:\Codex\.codex\generated_images\019fe294-a84c-7a42-a0ac-e9915f432e4f\exec-3f916e8d-64f8-44fa-86a5-4cc9e3c28000.png'
}

foreach ($entry in $sources.GetEnumerator()) {
  $sourceCopy = Join-Path $tempDir ($entry.Key -replace '\.png$', '-source.png')
  $output = Join-Path $assetDir $entry.Key
  Copy-Item -LiteralPath $entry.Value -Destination $sourceCopy -Force
  & $python $helper --input $sourceCopy --out $output --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --edge-contract 1 --force
  if ($LASTEXITCODE -ne 0) { throw "Failed to prepare $($entry.Key)" }
}

Write-Output "Prepared $($sources.Count) playoff party assets in $assetDir"

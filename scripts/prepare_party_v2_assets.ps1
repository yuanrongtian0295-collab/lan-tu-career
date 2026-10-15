param(
  [string]$GeneratedRoot = 'E:\Codex\.codex\generated_images\019fe294-a84c-7a42-a0ac-e9915f432e4f'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $projectRoot 'public\assets\party-v2'
$keyScript = 'E:\Codex\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py'

$sheets = [ordered]@{
  home = 'exec-58841e14-4e49-4a7c-a0d0-df033e18ff33.png'
  game = 'exec-c15f8bec-c52c-451b-a320-935502ec47a7.png'
  phone = 'exec-2b971201-7563-4d01-9df4-b0dfb09c9bab.png'
  player = 'exec-4054575f-3d3b-4808-a3eb-1866065fc69c.png'
  league = 'exec-8f315a46-2131-4f36-8ce1-05653c6e986c.png'
  offseason = 'exec-3410f4fb-9f16-4419-ace9-1e227ecd842e.png'
  retired = 'exec-2afb08ae-4681-4192-af06-a0d5c2d68d6a.png'
  builder = 'exec-d9227109-7ecc-46dd-a342-553b5ba9aa4d.png'
}
$homeCorrection = 'exec-2d96009b-0edc-44e5-a35b-8cd60f94ba77.png'

foreach ($page in $sheets.Keys) {
  $source = Join-Path $GeneratedRoot $sheets[$page]
  $pageDir = Join-Path $assetRoot $page
  if (-not (Test-Path -LiteralPath $source)) { throw "Missing generated sheet: $source" }
  New-Item -ItemType Directory -Force -Path $pageDir | Out-Null
  $chromaSource = Join-Path $pageDir 'sheet-chroma.png'
  $transparentSheet = Join-Path $pageDir 'sheet-transparent.png'
  Copy-Item -LiteralPath $source -Destination $chromaSource -Force
  & py -3 $keyScript --input $chromaSource --out $transparentSheet --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
  if ($LASTEXITCODE -ne 0) { throw "Chroma removal failed for $page" }
  Remove-Item -LiteralPath $chromaSource -Force
}

$homeCorrectionSource = Join-Path $GeneratedRoot $homeCorrection
if (-not (Test-Path -LiteralPath $homeCorrectionSource)) { throw "Missing generated sheet: $homeCorrectionSource" }
$homeCorrectionTransparent = Join-Path $assetRoot 'home\correction-transparent.png'
& py -3 $keyScript --input $homeCorrectionSource --out $homeCorrectionTransparent --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
if ($LASTEXITCODE -ne 0) { throw 'Home correction chroma removal failed' }
& py -3 -c "from PIL import Image; from pathlib import Path; p=Path(r'$homeCorrectionTransparent'); o=p.parent; im=Image.open(p).convert('RGBA'); im.crop((30,225,912,458)).save(o/'info-panel-dark.png',optimize=True); im.crop((28,690,914,1385)).save(o/'match-panel-dark.png',optimize=True); p.unlink()"
if ($LASTEXITCODE -ne 0) { throw 'Home correction slicing failed' }

& py -3 (Join-Path $PSScriptRoot 'slice_party_v2_assets.py')
if ($LASTEXITCODE -ne 0) { throw 'Asset slicing failed' }

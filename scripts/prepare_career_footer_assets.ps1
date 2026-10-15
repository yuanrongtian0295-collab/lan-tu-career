param(
  [string]$GeneratedRoot = "E:\Codex\.codex\generated_images\019fe294-a84c-7a42-a0ac-e9915f432e4f"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$OutputRoot = Join-Path $ProjectRoot "public\assets\v3-pages\career-party\footer-v1"
New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null

$Panels = @{
  "injury-panel.png" = "exec-119f763c-21c7-4d39-82b7-32492fb6e912.png"
  "stats-panel.png" = "exec-ed065aae-b8fa-4179-b386-56d540a1a471.png"
  "goal-panel.png" = "exec-6ec4cc3f-951e-4f85-83fc-e31e55225c0e.png"
}

foreach ($entry in $Panels.GetEnumerator()) {
  Copy-Item -Force -LiteralPath (Join-Path $GeneratedRoot $entry.Value) -Destination (Join-Path $OutputRoot $entry.Key)
}

$Icons = @{
  "stat-points.png" = "exec-8d1f70b9-7296-4d92-a667-fae4c85e9fee.png"
  "stat-rebounds.png" = "exec-2cf2b85f-af08-4867-8f10-30f0613435f0.png"
  "stat-assists.png" = "exec-943eb9de-77ee-49f2-adda-7aba5088196e.png"
  "stat-minutes.png" = "exec-679e64ee-494a-42f8-b634-1cad8c3fd0e6.png"
  "stat-points-v2.png" = "exec-c9ea39a9-29d7-406b-8af6-5c4fd60ac625.png"
  "stat-rebounds-v2.png" = "exec-fe64deaf-8b8d-43a7-8abd-a30514ceaf94.png"
  "stat-assists-v2.png" = "exec-943eb9de-77ee-49f2-adda-7aba5088196e.png"
  "stat-minutes-v2.png" = "exec-679e64ee-494a-42f8-b634-1cad8c3fd0e6.png"
  "injury-ankle.png" = "exec-942551fd-6ac2-47ac-ac0c-5e14c5f46a37.png"
  "injury-knee.png" = "exec-96f67453-082d-4132-ae4e-98c88a7eab9d.png"
  "injury-calf.png" = "exec-d8defdcb-7264-4482-8da9-2fc5d73ea1ac.png"
  "injury-hamstring.png" = "exec-d5cfad1c-5415-4b0d-856c-b6735cc888c8.png"
  "injury-back.png" = "exec-910b955b-b8fb-4ec0-9f28-69507fc1ce4d.png"
  "injury-overload.png" = "exec-b974d25d-999e-488f-a6f8-d3b4755c024f.png"
}

foreach ($entry in $Icons.GetEnumerator()) {
  Copy-Item -Force -LiteralPath (Join-Path $GeneratedRoot $entry.Value) -Destination (Join-Path $OutputRoot $entry.Key)
}

Copy-Item -Force -LiteralPath (Join-Path $GeneratedRoot "exec-41616cc6-cb31-480f-b814-e2ddb065bf3e.png") -Destination (Join-Path $OutputRoot "goal-label-v2.png")

py (Join-Path $PSScriptRoot "normalize_career_footer_assets.py")
Write-Output "Prepared career footer assets at $OutputRoot"

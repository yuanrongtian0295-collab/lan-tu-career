param(
  [string]$SourcePath = 'E:\Codex\.codex\generated_images\01a00e76-e7a7-7b20-bc0a-2a3ce82f3f1c\exec-8b75f77d-2c7a-4f1e-a2b4-ca913e7f46c0.png',
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\public\assets\home-v6\overall-label-v2-generated.png')
)

Add-Type -AssemblyName System.Drawing

function Test-MagentaBackground([System.Drawing.Color]$Color) {
  $minimumRedBlue = [Math]::Min([int]$Color.R, [int]$Color.B)
  $dominance = $minimumRedBlue - [int]$Color.G
  return $Color.R -gt 110 -and $Color.B -gt 110 -and $dominance -gt 12
}

if (-not (Test-Path -LiteralPath $SourcePath)) {
  throw "Missing generated overall label source: $SourcePath"
}

$outputDirectory = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

$source = [System.Drawing.Bitmap]::new($SourcePath)
$keyed = [System.Drawing.Bitmap]::new(
  $source.Width,
  $source.Height,
  [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)

$minX = $source.Width
$minY = $source.Height
$maxX = -1
$maxY = -1

try {
  for ($y = 0; $y -lt $source.Height; $y++) {
    for ($x = 0; $x -lt $source.Width; $x++) {
      $color = $source.GetPixel($x, $y)
      if (Test-MagentaBackground $color) {
        $keyed.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        continue
      }

      $keyed.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $color.R, $color.G, $color.B))
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }

  if ($maxX -lt $minX -or $maxY -lt $minY) {
    throw 'No label pixels remained after removing the magenta background.'
  }

  $cropRectangle = [System.Drawing.Rectangle]::new(
    $minX,
    $minY,
    $maxX - $minX + 1,
    $maxY - $minY + 1
  )
  $crop = $keyed.Clone($cropRectangle, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

  try {
    $canvasWidth = 1024
    $canvasHeight = 512
    $contentWidth = 960
    $contentHeight = 448
    $scale = [Math]::Min($contentWidth / [double]$crop.Width, $contentHeight / [double]$crop.Height)
    $drawWidth = [Math]::Max(1, [int][Math]::Round($crop.Width * $scale))
    $drawHeight = [Math]::Max(1, [int][Math]::Round($crop.Height * $scale))
    $drawX = [int][Math]::Floor(($canvasWidth - $drawWidth) / 2)
    $drawY = [int][Math]::Floor(($canvasHeight - $drawHeight) / 2)

    $canvas = [System.Drawing.Bitmap]::new(
      $canvasWidth,
      $canvasHeight,
      [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )

    try {
      $graphics = [System.Drawing.Graphics]::FromImage($canvas)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.DrawImage(
          $crop,
          [System.Drawing.Rectangle]::new($drawX, $drawY, $drawWidth, $drawHeight)
        )
      } finally {
        $graphics.Dispose()
      }

      for ($y = 0; $y -lt $canvas.Height; $y++) {
        for ($x = 0; $x -lt $canvas.Width; $x++) {
          $resampled = $canvas.GetPixel($x, $y)
          if ($resampled.A -gt 0 -and (Test-MagentaBackground $resampled)) {
            $canvas.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
          }
        }
      }

      $canvas.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
      Write-Output (
        'overall-label: source-bbox=({0},{1},{2},{3}); output={4}x{5}; path={6}' -f 
          $minX, $minY, $maxX, $maxY, $canvasWidth, $canvasHeight, $OutputPath
      )
    } finally {
      $canvas.Dispose()
    }
  } finally {
    $crop.Dispose()
  }
} finally {
  $keyed.Dispose()
  $source.Dispose()
}

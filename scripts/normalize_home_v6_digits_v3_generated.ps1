param(
  [string]$OutputDir = (Join-Path $PSScriptRoot '..\public\assets\home-v6\digits-v3-generated')
)

Add-Type -AssemblyName System.Drawing

$sources = [ordered]@{
  '0' = 'E:\Codex\.codex\generated_images\01a03c1d-3f74-7f62-9faf-e96f76699f56\exec-19a4b64c-9550-4cbe-a723-371ef480e032.png'
  '1' = 'E:\Codex\.codex\generated_images\01a03c1d-3f74-7f62-9faf-e96f76699f56\exec-0a5f246a-9c3f-4b36-9b35-83820ae50e71.png'
  '2' = 'E:\Codex\.codex\generated_images\01a03c1d-3f74-7f62-9faf-e96f76699f56\exec-7cf41fd0-5888-416d-8df3-4bd170cec5f2.png'
  '3' = 'E:\Codex\.codex\generated_images\01a03c1d-3f74-7f62-9faf-e96f76699f56\exec-82fb6051-576c-4205-8ed3-2dc07d879745.png'
  '4' = 'E:\Codex\.codex\generated_images\01a03695-1a47-7ae2-9b5f-748fc489fdc9\exec-d6737042-6ddd-4d87-8421-1b75f88e4b78.png'
  '5' = 'E:\Codex\.codex\generated_images\01a03c1d-3f74-7f62-9faf-e96f76699f56\exec-7ff38d68-3c31-420d-b5a6-ecc0e1e030c3.png'
  '6' = 'E:\Codex\.codex\generated_images\01a03c1d-3f74-7f62-9faf-e96f76699f56\exec-629b87ab-803f-4d9c-bd60-0a0343671551.png'
  '7' = 'E:\Codex\.codex\generated_images\01a03695-1a47-7ae2-9b5f-748fc489fdc9\exec-e4bfea87-f94c-46d5-8631-aa65ca61ef2e.png'
  '8' = 'E:\Codex\.codex\generated_images\01a03c1d-3f74-7f62-9faf-e96f76699f56\exec-6523922b-00e1-4ecc-af33-76e0c852c8cf.png'
  '9' = 'E:\Codex\.codex\generated_images\01a03c1d-3f74-7f62-9faf-e96f76699f56\exec-11dff039-ee26-42e8-a8d4-394f63e7686e.png'
}

$canvasWidth = 512
$canvasHeight = 640
$contentHeight = 580
$contentWidth = 470
$marginTop = 30
$outputFormat = [System.Drawing.Imaging.ImageFormat]::Png

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

function Test-MagentaBackground([System.Drawing.Color]$color) {
  # The generated source uses a saturated pink chroma background. Yellow/orange
  # fill, navy outlines, and white sticker borders do not satisfy this key.
  $minRedBlue = [Math]::Min([int]$color.R, [int]$color.B)
  $dominance = $minRedBlue - [int]$color.G
  return $color.R -gt 100 -and $color.B -gt 100 -and $color.G -lt 248 -and $dominance -gt 8
}

foreach ($entry in $sources.GetEnumerator()) {
  $digit = $entry.Key
  $sourcePath = $entry.Value
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Missing generated source for digit ${digit}: $sourcePath"
  }

  $source = [System.Drawing.Bitmap]::new($sourcePath)
  $keyed = [System.Drawing.Bitmap]::new($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
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
      throw "No non-background pixels found for digit $digit"
    }

    $cropRectangle = [System.Drawing.Rectangle]::new($minX, $minY, $maxX - $minX + 1, $maxY - $minY + 1)
    $crop = $keyed.Clone($cropRectangle, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $scale = [Math]::Min($contentHeight / [double]$crop.Height, $contentWidth / [double]$crop.Width)
      $drawWidth = [Math]::Max(1, [int][Math]::Round($crop.Width * $scale))
      $drawHeight = [Math]::Max(1, [int][Math]::Round($crop.Height * $scale))
      $canvas = [System.Drawing.Bitmap]::new($canvasWidth, $canvasHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      try {
        $graphics = [System.Drawing.Graphics]::FromImage($canvas)
        try {
          $graphics.Clear([System.Drawing.Color]::Transparent)
          $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
          $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
          $drawX = [int][Math]::Floor(($canvasWidth - $drawWidth) / 2)
          $drawY = $marginTop
          $graphics.DrawImage($crop, [System.Drawing.Rectangle]::new($drawX, $drawY, $drawWidth, $drawHeight))
        } finally {
          $graphics.Dispose()
        }

        # Bicubic resampling can create a few semi-transparent magenta edge
        # pixels from the chroma-key source. Remove those pixels after scaling
        # so the project asset has no visible pink fringe on the court art.
        for ($y = 0; $y -lt $canvas.Height; $y++) {
          for ($x = 0; $x -lt $canvas.Width; $x++) {
            $resampled = $canvas.GetPixel($x, $y)
            if ($resampled.A -gt 0 -and (Test-MagentaBackground $resampled)) {
              $canvas.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            }
          }
        }

        $outputPath = Join-Path $OutputDir "digit-$digit.png"
        $canvas.Save($outputPath, $outputFormat)
        Write-Output ("digit-{0}: source={1}; source-bbox=({2},{3},{4},{5}); output={6}x{7}; path={8}" -f $digit, (Split-Path $sourcePath -Leaf), $minX, $minY, $maxX, $maxY, $canvasWidth, $canvasHeight, $outputPath)
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
}

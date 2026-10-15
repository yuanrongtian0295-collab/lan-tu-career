[CmdletBinding()]
param(
  [ValidateSet('Preview', 'All')]
  [string]$Mode = 'Preview',
  [string]$PreviewDirectory = '',
  [string]$OutputDirectory = '',
  [string]$FontDirectory = ''
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# Keep defaults relative to the script so Windows PowerShell's legacy script
# encoding cannot corrupt the Chinese project path before it reaches the API.
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ([string]::IsNullOrWhiteSpace($PreviewDirectory)) {
  $PreviewDirectory = 'E:\Temp\overall-digit-font-tests'
}
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
  $OutputDirectory = Join-Path $projectRoot 'public\assets\home-v6\digits-v2'
}
if ([string]::IsNullOrWhiteSpace($FontDirectory)) {
  $FontDirectory = Join-Path $projectRoot 'public\assets\glyphs\fonts'
}

$canvasWidth = 512
$canvasHeight = 640
$targetGlyphHeight = 430.0
$targetTop = 82.0
$targetCenterX = $canvasWidth / 2.0
$glyphWidthScale = 1.13
$yellowBodyStrokeWidth = 20.0
$shadowStrokeWidth = 38.0
$outerStrokeWidth = 84.0
$innerStrokeWidth = 56.0

$fontSpecs = @(
  [ordered]@{
    Key = 'lantu'
    Path = (Join-Path $FontDirectory 'lantu-graffiti-titles.ttf')
    FontSize = 520.0
  },
  [ordered]@{
    Key = 'genuine'
    Path = (Join-Path $FontDirectory 'genuine-numbers-v1.ttf')
    FontSize = 520.0
  }
)

function New-PathMatrix {
  param(
    [float]$M11 = 1,
    [float]$M12 = 0,
    [float]$M21 = 0,
    [float]$M22 = 1,
    [float]$Dx = 0,
    [float]$Dy = 0
  )
  return (New-Object System.Drawing.Drawing2D.Matrix($M11, $M12, $M21, $M22, $Dx, $Dy))
}

function New-GlyphPath {
  param(
    [System.Drawing.FontFamily]$FontFamily,
    [string]$Text,
    [float]$FontSize
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  [void]($path.FillMode = [System.Drawing.Drawing2D.FillMode]::Winding)
  $path.AddString(
    $Text,
    $FontFamily,
    [int][System.Drawing.FontStyle]::Regular,
    $FontSize,
    [System.Drawing.PointF]::new(0, 0),
    [System.Drawing.StringFormat]::GenericTypographic
  )
  return $path
}

function Move-PathToFrame {
  param(
    [System.Drawing.Drawing2D.GraphicsPath]$Path,
    [float]$TargetHeight,
    [float]$Top,
    [float]$CenterX
  )

  $raw = $Path.GetBounds()
  if ($raw.Height -le 0) {
    throw 'The selected font returned an empty glyph path.'
  }

  $scale = $TargetHeight / $raw.Height
  $scaleMatrix = New-PathMatrix -M11 $scale -M22 $scale
  $Path.Transform($scaleMatrix)
  $scaleMatrix.Dispose()

  # The reference uses broad, forward-leaning comic numerals. Expand the
  # glyph horizontally after matching height, then re-center it below after
  # the shear/rotation so every digit keeps the same baseline and canvas.
  $widthMatrix = New-PathMatrix -M11 $glyphWidthScale
  $Path.Transform($widthMatrix)
  $widthMatrix.Dispose()

  # The negative m21 shear moves the upper part forward/right, while the
  # small rotation keeps the silhouette closer to a hand-lettered game mark.
  $shearMatrix = New-PathMatrix -M21 -0.115
  $Path.Transform($shearMatrix)
  $shearMatrix.Dispose()

  $sheared = $Path.GetBounds()
  $pivot = [System.Drawing.PointF]::new(
    $sheared.Left + ($sheared.Width / 2.0),
    $sheared.Top + ($sheared.Height / 2.0)
  )
  $rotateMatrix = New-Object System.Drawing.Drawing2D.Matrix
  $rotateMatrix.RotateAt(-3.5, $pivot)
  $Path.Transform($rotateMatrix)
  $rotateMatrix.Dispose()

  $positioned = $Path.GetBounds()
  $dx = $CenterX - ($positioned.Left + ($positioned.Width / 2.0))
  $dy = $Top - $positioned.Top
  $moveMatrix = New-PathMatrix -Dx $dx -Dy $dy
  $Path.Transform($moveMatrix)
  $moveMatrix.Dispose()
}

function Draw-GlyphSprite {
  param(
    [string]$Text,
    [System.Drawing.FontFamily]$FontFamily,
    [float]$FontSize,
    [string]$OutputPath
  )

  $bitmap = New-Object System.Drawing.Bitmap(
    $canvasWidth,
    $canvasHeight,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $path = $null
  $shadowPath = $null
  $outerPen = $null
  $innerPen = $null
  $bodyPen = $null
  $shadowPen = $null
  $whiteBrush = $null
  $navyBrush = $null
  $grainBrush = $null
  $gradientBrush = $null

  try {
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $path = New-GlyphPath -FontFamily $FontFamily -Text $Text -FontSize $FontSize
    Move-PathToFrame -Path $path -TargetHeight $targetGlyphHeight -Top $targetTop -CenterX $targetCenterX
    $bounds = $path.GetBounds()

    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $navyBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 7, 24, 71))

    $shadowPath = $path.Clone()
    $shadowMatrix = New-PathMatrix -Dx 15 -Dy 18
    $shadowPath.Transform($shadowMatrix)
    $shadowMatrix.Dispose()
    $shadowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 7, 24, 71), $shadowStrokeWidth)
    $shadowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Miter
    $graphics.FillPath($navyBrush, $shadowPath)
    $graphics.DrawPath($shadowPen, $shadowPath)

    $outerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $outerStrokeWidth)
    $outerPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Miter
    $outerPen.MiterLimit = 4
    $innerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 8, 27, 83), $innerStrokeWidth)
    $innerPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Miter
    $innerPen.MiterLimit = 4
    $gradientBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      [System.Drawing.PointF]::new(0, $bounds.Top),
      [System.Drawing.PointF]::new(0, $bounds.Bottom),
      [System.Drawing.Color]::FromArgb(255, 255, 215, 45),
      [System.Drawing.Color]::FromArgb(255, 239, 140, 4)
    )
    # Add a broad yellow body stroke between the navy inner outline and the
    # fill. This thickens the visible numeral without flattening the sticker
    # border proportions from the reference.
    $bodyPen = New-Object System.Drawing.Pen($gradientBrush, $yellowBodyStrokeWidth)

    $graphics.DrawPath($outerPen, $path)
    $graphics.DrawPath($innerPen, $path)
    $graphics.DrawPath($bodyPen, $path)
    $graphics.FillPath($gradientBrush, $path)

    # Deterministic, low-contrast halftone/grain clipped to the yellow fill.
    $graphics.SetClip($path, [System.Drawing.Drawing2D.CombineMode]::Intersect)
    for ($y = [int]$bounds.Top + 12; $y -lt [int]$bounds.Bottom; $y += 15) {
      $row = [math]::Floor(($y - $bounds.Top) / 15)
      $offset = if (($row % 2) -eq 0) { 0 } else { 7 }
      for ($x = [int]$bounds.Left + 9 + $offset; $x -lt [int]$bounds.Right; $x += 15) {
        $depth = ($y - $bounds.Top) / [math]::Max(1, $bounds.Height)
        $alpha = [int](18 + (28 * $depth))
        $radius = 1.0 + (1.35 * $depth)
        $grainBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($alpha, 150, 74, 0))
        $graphics.FillEllipse($grainBrush, $x - $radius, $y - $radius, $radius * 2, $radius * 2)
        $grainBrush.Dispose()
        $grainBrush = $null
      }
    }
    $graphics.ResetClip()

    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    if ($grainBrush) { $grainBrush.Dispose() }
    if ($gradientBrush) { $gradientBrush.Dispose() }
    if ($whiteBrush) { $whiteBrush.Dispose() }
    if ($navyBrush) { $navyBrush.Dispose() }
    if ($outerPen) { $outerPen.Dispose() }
    if ($innerPen) { $innerPen.Dispose() }
    if ($bodyPen) { $bodyPen.Dispose() }
    if ($shadowPen) { $shadowPen.Dispose() }
    if ($shadowPath) { $shadowPath.Dispose() }
    if ($path) { $path.Dispose() }
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

function Render-FontSet {
  param(
    [System.Collections.IDictionary]$FontSpec,
    [string[]]$Digits,
    [string]$Destination
  )

  if (-not (Test-Path -LiteralPath $FontSpec.Path)) {
    throw "Font not found: $($FontSpec.Path)"
  }

  $fontCollection = New-Object System.Drawing.Text.PrivateFontCollection
  $fontCollection.AddFontFile($FontSpec.Path)
  $fontFamily = $fontCollection.Families[0]
  try {
    foreach ($digit in $Digits) {
      $outputPath = Join-Path $Destination ("{0}-digit-{1}.png" -f $FontSpec.Key, $digit)
      Draw-GlyphSprite -Text $digit -FontFamily $fontFamily -FontSize $FontSpec.FontSize -OutputPath $outputPath
    }
    Write-Output ("Rendered {0} using {1} ({2})" -f ($Digits -join ','), $FontSpec.Key, $fontFamily.Name)
  } finally {
    $fontCollection.Dispose()
  }
}

if ($Mode -eq 'Preview') {
  New-Item -ItemType Directory -Force -Path $PreviewDirectory | Out-Null
  foreach ($fontSpec in $fontSpecs) {
    Render-FontSet -FontSpec $fontSpec -Digits @('7', '4') -Destination $PreviewDirectory
  }
  Write-Output ("Preview files written to {0}" -f $PreviewDirectory)
  exit 0
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$selectedFont = $fontSpecs[0]
$fontCollection = New-Object System.Drawing.Text.PrivateFontCollection
$fontCollection.AddFontFile($selectedFont.Path)
$fontFamily = $fontCollection.Families[0]
try {
  foreach ($digit in 0..9) {
    $outputPath = Join-Path $OutputDirectory ("digit-{0}.png" -f $digit)
    Draw-GlyphSprite -Text ([string]$digit) -FontFamily $fontFamily -FontSize $selectedFont.FontSize -OutputPath $outputPath
  }
} finally {
  $fontCollection.Dispose()
}
Write-Output ("Generated deterministic transparent overall digit sprites in {0} using {1}" -f $OutputDirectory, $fontFamily.Name)

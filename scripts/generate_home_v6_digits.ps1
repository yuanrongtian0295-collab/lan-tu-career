param(
  [string]$OutputDirectory = "E:\项目\NBA\public\assets\home-v6\digits",
  [string]$FontPath = "E:\项目\NBA\public\assets\glyphs\fonts\genuine-numbers-v1.ttf"
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
Add-Type -AssemblyName System.Drawing

$fontCollection = New-Object System.Drawing.Text.PrivateFontCollection
$fontCollection.AddFontFile($FontPath)
$fontFamily = $fontCollection.Families[0]
$font = New-Object System.Drawing.Font($fontFamily, 116, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)

try {
  for ($digit = 0; $digit -le 9; $digit++) {
    $bitmap = New-Object System.Drawing.Bitmap(144, 156, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
      $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

      $text = [string]$digit
      $measure = $graphics.MeasureString($text, $font)
      $x = (144 - $measure.Width) / 2 - 1
      $y = 11
      $outlinePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 7, 25, 82), 10)
      $outlinePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
      $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(150, 4, 17, 50))
      $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 211, 25))
      $highlightBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, 255, 255, 255))
      $path = New-Object System.Drawing.Drawing2D.GraphicsPath
      $path.AddString($text, $fontFamily, [int][System.Drawing.FontStyle]::Regular, 116, [System.Drawing.PointF]::new($x, $y), [System.Drawing.StringFormat]::GenericTypographic)

      $shadowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
      $shadowPath.AddString($text, $fontFamily, [int][System.Drawing.FontStyle]::Regular, 116, [System.Drawing.PointF]::new($x + 5, $y + 7), [System.Drawing.StringFormat]::GenericTypographic)
      $graphics.FillPath($shadowBrush, $shadowPath)
      $graphics.DrawPath($outlinePen, $path)
      $graphics.FillPath($brush, $path)
      $graphics.FillPath($highlightBrush, $path)

      $output = Join-Path $OutputDirectory ("digit-{0}.png" -f $digit)
      $bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
      $path.Dispose()
      $shadowPath.Dispose()
      $outlinePen.Dispose()
      $shadowBrush.Dispose()
      $brush.Dispose()
      $highlightBrush.Dispose()
    } finally {
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  }
} finally {
  $font.Dispose()
  $fontCollection.Dispose()
}

Write-Output ("Generated 10 deterministic overall digit sprites in {0}" -f $OutputDirectory)

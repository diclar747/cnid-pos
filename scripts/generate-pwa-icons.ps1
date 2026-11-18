Add-Type -AssemblyName System.Drawing

foreach ($size in @(192, 512)) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.Color]::FromArgb(15, 23, 42))
  $blue = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(37, 99, 235))
  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $graphics.FillEllipse($blue, [int]($size * 0.15), [int]($size * 0.15), [int]($size * 0.7), [int]($size * 0.7))
  $font = [System.Drawing.Font]::new('Arial', [single]($size * 0.27), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $box = [System.Drawing.RectangleF]::new([single]0, [single]0, [single]$size, [single]$size)
  $graphics.DrawString('C', $font, $white, $box, $format)
  $bitmap.Save((Join-Path $PSScriptRoot "../public/pwa-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $format.Dispose()
  $font.Dispose()
  $white.Dispose()
  $blue.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$index = [System.IO.File]::ReadAllText('apps-script/index.html', [System.Text.Encoding]::UTF8)
$styles = [System.IO.File]::ReadAllText('apps-script/styles.html', [System.Text.Encoding]::UTF8)
$app = [System.IO.File]::ReadAllText('apps-script/app.html', [System.Text.Encoding]::UTF8)

# Replicate Google Apps Script include evaluation
$merged = $index.Replace('<?!= include("styles"); ?>', $styles).Replace('<?!= include("app"); ?>', $app)
$lines = $merged -split '\r?\n'

Write-Host "Total lines: $($lines.Count)"
for ($i = 4310; $i -le 4340; $i++) {
    if ($i -le $lines.Count) {
        Write-Host "$($i): $($lines[$i - 1])"
    }
}

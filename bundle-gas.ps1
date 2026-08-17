# Create the apps-script output directory if not exists
New-Item -ItemType Directory -Force -Path "apps-script"

# 1. Copy Code.gs
Copy-Item "Code.gs" "apps-script/Code.gs" -Force

# 2. Bundle styles.css to styles.html
$css = [System.IO.File]::ReadAllText("styles.css", [System.Text.Encoding]::UTF8)
$styleHtml = "<style>`n$css`n</style>"
[System.IO.File]::WriteAllText("apps-script/styles.html", $styleHtml, [System.Text.Encoding]::UTF8)

# 3. Bundle app.js to app.html
$js = [System.IO.File]::ReadAllText("app.js", [System.Text.Encoding]::UTF8)
$appHtml = "<script>`n$js`n</script>"
[System.IO.File]::WriteAllText("apps-script/app.html", $appHtml, [System.Text.Encoding]::UTF8)

# 4. Process index.html to index.html for Apps Script
$html = [System.IO.File]::ReadAllText("index.html", [System.Text.Encoding]::UTF8)

# Replace CSS link (handle whitespace variation)
$html = $html -replace '<link\s+rel="stylesheet"\s+href="styles.css"\s*\/?>', '<?!= include("styles"); ?>'

# Replace JS link (handle whitespace variation)
$html = $html -replace '<script\s+src="app.js"><\/script>', '<?!= include("app"); ?>'

[System.IO.File]::WriteAllText("apps-script/index.html", $html, [System.Text.Encoding]::UTF8)

Write-Host "✅ Apps Script deployment bundle generated successfully in the 'apps-script' folder!" -ForegroundColor Green

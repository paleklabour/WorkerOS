# Lightweight Native PowerShell HTTP Server for Migrant Worker System
try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:3000/")
    $listener.Start()
    Write-Output "HTTP Server started successfully at http://localhost:3000/"
    
    $baseDir = "C:\Users\Katua\.gemini\antigravity\scratch\migrant-worker-system"

    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            
            # API upload handler for saving client files locally to avoid localStorage quota limits
            if ($request.HttpMethod -eq "POST" -and $request.Url.LocalPath -eq "/api/upload") {
                $reader = New-Object System.IO.StreamReader($request.InputStream)
                $body = $reader.ReadToEnd()
                $reader.Close()
                
                $parts = $body.Split(',')
                if ($parts.Length -ge 2) {
                    $base64 = $parts[1]
                    $bytes = [System.Convert]::FromBase64String($base64)
                    
                    $uploadsDir = Join-Path $baseDir "uploads"
                    if (-not (Test-Path $uploadsDir)) {
                        [System.IO.Directory]::CreateDirectory($uploadsDir) | Out-Null
                    }
                    
                    $queryFilename = $request.QueryString["filename"]
                    if ([string]::IsNullOrEmpty($queryFilename)) {
                        $queryFilename = "upload_" + (Get-Date -Format "yyyyMMdd_HHmmss")
                    } else {
                        $queryFilename = $queryFilename -replace '[^a-zA-Z0-9_\-\.]', '_'
                    }
                    
                    $filePath = Join-Path $uploadsDir $queryFilename
                    [System.IO.File]::WriteAllBytes($filePath, $bytes)
                    
                    $jsonRes = '{"status":"success", "fileUrl":"/uploads/' + $queryFilename + '"}'
                    $resBuffer = [System.Text.Encoding]::UTF8.GetBytes($jsonRes)
                    
                    $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $resBuffer.Length
                    $response.OutputStream.Write($resBuffer, 0, $resBuffer.Length)
                } else {
                    $response.StatusCode = 400
                }
                $response.Close()
                continue
            }

            # Map request path to local file path
            $rawPath = $request.Url.LocalPath
            if ($rawPath -eq "/") { $rawPath = "/index.html" }
            $filePath = Join-Path $baseDir $rawPath
            
            if ([System.IO.File]::Exists($filePath)) {
                $buffer = [System.IO.File]::ReadAllBytes($filePath)
                
                # Determine Content-Type
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = "text/plain"
                if ($ext -eq ".html") { $contentType = "text/html; charset=utf-8" }
                elseif ($ext -eq ".css") { $contentType = "text/css; charset=utf-8" }
                elseif ($ext -eq ".js") { $contentType = "application/javascript; charset=utf-8" }
                elseif ($ext -eq ".png") { $contentType = "image/png" }
                elseif ($ext -eq ".jpg" -or $ext -eq ".jpeg") { $contentType = "image/jpeg" }
                elseif ($ext -eq ".gif") { $contentType = "image/gif" }
                elseif ($ext -eq ".pdf") { $contentType = "application/pdf" }
                
                # Disable caching for hot-reloading changes in browser
                $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")
                $response.AddHeader("Pragma", "no-cache")
                $response.AddHeader("Expires", "0")

                $response.ContentType = $contentType
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            } else {
                $response.StatusCode = 404
            }
            $response.Close()
        } catch {
            # Ignore individual request errors to keep server running
        }
    }
} catch {
    Write-Error $_.Exception.Message
}

# Layer 3: Execution script (PowerShell) - Package TrackVisites for deployment
# Use this to create a clean deployment bundle.

Write-Host "--- [Execution] Preparing 'dist/' for deployment ---" -ForegroundColor Cyan

# Source: Current directory (absolute path for AG system)
$cwd = Get-Location
$distPath = Join-Path $cwd "dist"
$tmpPath = Join-Path $cwd ".tmp"

# Files needed for the web app
$sourceFiles = @(
    "index.html",
    "script.js",
    "styles.css",
    "Exemple idesign interface.png"
)

# Clean up old dist
if (Test-Path $distPath) {
    Write-Host "Removing old '$distPath'..."
    Remove-Item -Path $distPath -Recurse -Force
}

New-Item -ItemType Directory -Path $distPath -Force | Out-Null
Write-Host "Created '$distPath'."

# Copy files
foreach ($f in $sourceFiles) {
    $src = Join-Path $cwd $f
    if (Test-Path $src) {
        Write-Host "Copying $f..."
        Copy-Item -Path $src -Destination $distPath -Force
    } else {
        Write-Warning "File not found: $f"
    }
}

# Create zip for manual upload (Option C in directive)
if (-not (Test-Path $tmpPath)) {
    New-Item -ItemType Directory -Path $tmpPath -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$zipName = "trackvisites_deploy_$timestamp.zip"
$zipPath = Join-Path $tmpPath $zipName

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Compress-Archive -Path "$distPath\*" -DestinationPath $zipPath -Force

Write-Host "--- [Execution] Package created at $zipPath ---" -ForegroundColor Green
Write-Host "Ready for manual upload to Vercel/Netlify." -ForegroundColor DarkGreen

# Also create a fixed-name zip for easier referencing
$v1ZipPath = Join-Path $tmpPath "trackvisites_ready.zip"
Copy-Item $zipPath $v1ZipPath -Force

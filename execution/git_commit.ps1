# Layer 3: Execution script (PowerShell) - Commit project changes to Git
# Use this to automate a clean commit.

$gitPath = "C:\Users\mleboucher\AppData\Local\Programs\Git\bin\git.exe"
if (-not (Test-Path $gitPath)) {
    $gitPath = "C:\Program Files\Git\bin\git.exe" # Backup candidate
}

Write-Host "--- [Execution] Committing changes to Git ---" -ForegroundColor Cyan

# Ensure we are in the right directory
# (Script runs in CWD)

# Add and commit
& $gitPath add .
& $gitPath commit -m "Mise à jour TrackVisites - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

if ($LASTEXITCODE -eq 0) {
    Write-Host "--- [Execution] Commit effectué avec succès ! ---" -ForegroundColor Green
}
else {
    Write-Host "--- [Execution] Aucun changement à committer ou erreur git. ---" -ForegroundColor Yellow
}

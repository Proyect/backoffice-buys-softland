param(
  [switch]$WithFrontend = $true
)

Write-Host "[Run-Local] Starting local dev..." -ForegroundColor Cyan

# Backend
Push-Location backend
if (-not (Test-Path "node_modules")) { npm install }
$backend = Start-Process -FilePath "npm" -ArgumentList "run","dev" -NoNewWindow -PassThru
Pop-Location

# Frontend (optional)
if ($WithFrontend) {
  Push-Location frontend
  if (-not (Test-Path "node_modules")) { npm install }
  $frontend = Start-Process -FilePath "npm" -ArgumentList "run","dev" -NoNewWindow -PassThru
  Pop-Location
}

Write-Host "[Run-Local] Backend PID: $($backend.Id)" -ForegroundColor Green
if ($WithFrontend) { Write-Host "[Run-Local] Frontend PID: $($frontend.Id)" -ForegroundColor Green }
Write-Host "[Run-Local] Press Enter to stop..." -ForegroundColor Cyan
[void][System.Console]::ReadLine()

# Cleanup
try { if ($backend) { Stop-Process -Id $backend.Id -Force } } catch {}
try { if ($frontend) { Stop-Process -Id $frontend.Id -Force } } catch {}

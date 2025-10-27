param(
  [switch]$AllInDocker = $false,
  [switch]$WithPgAdmin = $false
)

Write-Host "[Run-Docker] Starting services..." -ForegroundColor Cyan

# Ensure .env exists
if (-not (Test-Path ".env")) {
  Write-Host "[Run-Docker] .env not found. Copying from .env.example..." -ForegroundColor Yellow
  Copy-Item ".env.example" ".env"
}

# Base services
$profiles = @()
if ($AllInDocker) { $profiles += '--profile all-in-docker' }
if ($WithPgAdmin) { $profiles += '--profile db-tools' }

$profileArgs = ($profiles -join ' ')
if ($profileArgs) { $profileArgs = " $profileArgs" }

$cmd = "docker compose$profileArgs up -d db backend"

# Optional services
if ($AllInDocker) { $cmd = "$cmd frontend" }
if ($WithPgAdmin) { $cmd = "$cmd pgadmin" }

Write-Host "[Run-Docker] Executing: $cmd" -ForegroundColor Cyan
Invoke-Expression $cmd

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[Run-Docker] Logs (backend). Press Ctrl+C to stop following." -ForegroundColor Cyan
# Tail backend logs
Invoke-Expression "docker compose logs -f backend"

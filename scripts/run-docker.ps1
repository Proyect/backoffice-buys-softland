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
$cmd = "docker compose up -d db backend"

# Optional services
if ($AllInDocker) { $cmd = "$cmd frontend" }
if ($WithPgAdmin) { $cmd = "$cmd pgadmin" }

Write-Host "[Run-Docker] Executing: $cmd" -ForegroundColor Cyan
iex $cmd

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[Run-Docker] Logs (backend). Press Ctrl+C to stop following." -ForegroundColor Cyan
# Tail backend logs
iex "docker compose logs -f backend"

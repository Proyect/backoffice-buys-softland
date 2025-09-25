param(
  [switch]$Setup = $true,
  [switch]$Watch = $false,
  [string]$Filter = "",
  [switch]$Local = $false
)

function Run-Docker {
  param([string]$cmd)
  Write-Host "[Tests] docker compose exec backend $cmd" -ForegroundColor Cyan
  iex "docker compose exec backend $cmd"
}

function Run-LocalBackend {
  param([string]$cmd)
  Push-Location backend
  try {
    if (-not (Test-Path "node_modules")) { npm install }
    Write-Host "[Tests] (local) $cmd" -ForegroundColor Cyan
    iex $cmd
  } finally {
    Pop-Location
  }
}

if ($Setup) {
  if ($Local) {
    Run-LocalBackend "npm run prisma:migrate:deploy"
    Run-LocalBackend "npm run prisma:seed"
  } else {
    Run-Docker "npm run test:setup"
  }
}

$testCmd = "npm run test"
if ($Watch) { $testCmd = "npm run test:watch" }
if ($Filter -ne "") { $testCmd = "$testCmd -- -t \"$Filter\"" }

if ($Local) {
  Run-LocalBackend $testCmd
} else {
  Run-Docker $testCmd
}

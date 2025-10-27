param()

function Show-Header {
  Clear-Host
  Write-Host "=== Backoffice Buys Softland - Menu ===" -ForegroundColor Cyan
  Write-Host "Repo root: $([System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')) )" -ForegroundColor DarkGray
  Write-Host "" 
}

function Show-Menu {
  Write-Host "[1] Iniciar DB + Backend" -ForegroundColor Green
  Write-Host "[2] Iniciar DB + Backend + Frontend" -ForegroundColor Green
  Write-Host "[3] Iniciar DB + Backend + Frontend + pgAdmin" -ForegroundColor Green
  Write-Host "[4] Ver estado (docker compose ps)" -ForegroundColor Yellow
  Write-Host "[5] Ver logs (seleccionar servicio)" -ForegroundColor Yellow
  Write-Host "[6] Detener (docker compose down)" -ForegroundColor Red
  Write-Host "[7] Detener y borrar volúmenes (down -v)" -ForegroundColor Red
  Write-Host "[8] Ejecutar tests backend" -ForegroundColor Magenta
  Write-Host "[9] Rebuild sin caché (build --no-cache + up -d)" -ForegroundColor Cyan
  Write-Host "[10] Prune (limpiar recursos no usados)" -ForegroundColor DarkYellow
  Write-Host "[11] Salir" -ForegroundColor White
}

function Ask-Choice {
  param([string]$Prompt)
  Write-Host ""
  return Read-Host $Prompt
}

function Run-LogsMenu {
  Write-Host "Servicios disponibles:" -ForegroundColor Cyan
  Write-Host "  [1] db" -ForegroundColor Yellow
  Write-Host "  [2] backend" -ForegroundColor Yellow
  Write-Host "  [3] frontend" -ForegroundColor Yellow
  $svc = Read-Host "Elegí servicio (1-3)"
  switch ($svc) {
    '1' { $service = 'db' }
    '2' { $service = 'backend' }
    '3' { $service = 'frontend' }
    default { Write-Host "Opción inválida" -ForegroundColor Red; return }
  }
  Write-Host "Mostrando logs de '$service' (Ctrl+C para salir)" -ForegroundColor Cyan
  iex "docker compose logs -f $service"
}

function Run-RebuildNoCache {
  Write-Host "Esto reconstruirá TODAS las imágenes del compose sin caché y levantará en segundo plano." -ForegroundColor Yellow
  $confirm = Read-Host 'Confirmar rebuild sin caché? (yes/no)'
  if ($confirm -ne 'yes') { Write-Host 'Cancelado.' -ForegroundColor DarkYellow; return }
  iex 'docker compose build --no-cache'
  if ($LASTEXITCODE -ne 0) { return }
  iex 'docker compose up -d'
}

function Run-PruneMenu {
  Write-Host "Prune options:" -ForegroundColor Cyan
  Write-Host "  [1] docker image prune -a (solo imágenes no usadas)" -ForegroundColor Yellow
  Write-Host "  [2] docker volume prune (volúmenes no usados)" -ForegroundColor Yellow
  Write-Host "  [3] docker system prune -a (IMPACTO ALTO)" -ForegroundColor Red
  Write-Host "  [4] Cancelar" -ForegroundColor White
  $opt = Read-Host 'Elegí opción (1-4)'
  switch ($opt) {
    '1' {
      $c = Read-Host 'Confirmar image prune -a? (yes/no)'
      if ($c -eq 'yes') { iex 'docker image prune -a' } else { Write-Host 'Cancelado.' -ForegroundColor DarkYellow }
    }
    '2' {
      $c = Read-Host 'Confirmar volume prune? (yes/no)'
      if ($c -eq 'yes') { iex 'docker volume prune' } else { Write-Host 'Cancelado.' -ForegroundColor DarkYellow }
    }
    '3' {
      $c = Read-Host 'Confirmar system prune -a (muy destructivo)? (type: IUNDERSTAND)'
      if ($c -eq 'IUNDERSTAND') { iex 'docker system prune -a' } else { Write-Host 'Cancelado.' -ForegroundColor DarkYellow }
    }
    default { Write-Host 'Cancelado.' -ForegroundColor DarkYellow }
  }
}

# MAIN LOOP
while ($true) {
  Show-Header
  Show-Menu
  $choice = Ask-Choice "Elegí una opción (1-11)"
  switch ($choice) {
    '1' {
      & (Join-Path $PSScriptRoot 'run-docker.ps1')
      Pause
    }
    '2' {
      & (Join-Path $PSScriptRoot 'run-docker.ps1') -AllInDocker
      Pause
    }
    '3' {
      & (Join-Path $PSScriptRoot 'run-docker.ps1') -AllInDocker -WithPgAdmin
      Pause
    }
    '4' {
      iex 'docker compose ps'
      Pause
    }
    '5' {
      Run-LogsMenu
      Pause
    }
    '6' {
      iex 'docker compose down'
      Pause
    }
    '7' {
      $confirm = Read-Host 'Esto borrará volúmenes (datos de DB). Confirmar? (yes/no)'
      if ($confirm -eq 'yes') { iex 'docker compose down -v' } else { Write-Host 'Cancelado.' -ForegroundColor DarkYellow }
      Pause
    }
    '8' {
      & (Join-Path $PSScriptRoot 'test.ps1')
      Pause
    }
    '9' {
      Run-RebuildNoCache
      Pause
    }
    '10' {
      Run-PruneMenu
      Pause
    }
    '11' { break }
    default {
      Write-Host 'Opción inválida' -ForegroundColor Red
      Start-Sleep -Seconds 1
    }
  }
}

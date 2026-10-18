<#
.SYNOPSIS
  Monitor de memoria y procesos con línea base, alertas y verificación de protecciones.
  ISW-612 - Tema 3: Memoria y procesos sospechosos.

.DESCRIPTION
  Cada IntervaloSeg segundos registra por proceso: nombre, PID, working set, memoria privada,
  hilos y handles. Detecta (1) crecimiento sostenido de memoria privada y (2) procesos NUEVOS
  que corren desde carpetas Temp o AppData. Al final verifica RunAsPPL y Credential Guard
  y exporta todo a un JSON.

  SOLO LEE información del sistema. No accede a LSASS ni cambia configuración.
  Ejecutar solo en el equipo propio, autorizado por el profesor (no en equipos de la universidad ni de terceros).

  NOTA: código generado con ayuda de IA. Verificar cada cmdlet en la documentación de Microsoft
  y registrar el uso en bitacora-ia.md.

.EXAMPLE
  .\monitor.ps1 -DuracionSeg 120 -IntervaloSeg 5
#>
param(
    [int]$DuracionSeg = 120,          # cuánto dura la prueba
    [int]$IntervaloSeg = 5,           # cada cuánto se toma una muestra
    [double]$UmbralCrecimientoPct = 50,   # alerta si crece más de X% ...
    [int]$VentanaMuestras = 6,        # ... de forma sostenida durante N muestras
    [double]$MinCrecimientoMB = 20,   # ignora crecimientos pequeños (ruido)
    [double]$MinPrivadoMB = 5,        # no registra procesos con menos memoria que esto
    [string]$Salida = (Join-Path $PSScriptRoot "..\datos\ejemplo.json")
)

$ErrorActionPreference = "Stop"
$inicio = Get-Date
$muestras = New-Object System.Collections.Generic.List[object]
$alertas  = New-Object System.Collections.Generic.List[object]
$historial = @{}          # PID -> lista de valores de memoria privada (MB)
$alertados = @{}          # PID -> true (para no repetir la misma alerta)
$lineaBase = @{}          # PID -> $true (procesos presentes en la primera muestra)

function Get-RutaProceso($p) {
    # Path puede fallar sin permisos de administrador; en ese caso devolvemos vacío
    try { return $p.Path } catch { return $null }
}

Write-Host "Monitoreando $DuracionSeg s (cada $IntervaloSeg s). Ctrl+C para cortar." -ForegroundColor Cyan

$primera = $true
while (((Get-Date) - $inicio).TotalSeconds -lt $DuracionSeg) {
    $t = [math]::Round(((Get-Date) - $inicio).TotalSeconds, 0)

    foreach ($p in Get-Process) {
        $privMB = [math]::Round($p.PrivateMemorySize64 / 1MB, 1)
        if ($privMB -lt $MinPrivadoMB) { continue }
        $wsMB = [math]::Round($p.WorkingSet64 / 1MB, 1)

        $muestras.Add([pscustomobject]@{
            t          = $t
            proceso    = $p.ProcessName
            pid        = $p.Id
            ws_mb      = $wsMB
            privado_mb = $privMB
            hilos      = $p.Threads.Count
            handles    = $p.HandleCount
        })

        # --- Línea base: procesos que ya existían al empezar ---
        if ($primera) { $lineaBase[$p.Id] = $true }

        # --- Regla 1: crecimiento sostenido de memoria privada ---
        if (-not $historial.ContainsKey($p.Id)) { $historial[$p.Id] = New-Object System.Collections.Generic.List[double] }
        $h = $historial[$p.Id]
        $h.Add($privMB)
        if ($h.Count -gt $VentanaMuestras) { $h.RemoveAt(0) }

        if ($h.Count -eq $VentanaMuestras -and -not $alertados.ContainsKey($p.Id)) {
            $primero = $h[0]; $ultimo = $h[$h.Count - 1]
            $siempreSube = $true
            for ($i = 1; $i -lt $h.Count; $i++) { if ($h[$i] -lt $h[$i-1]) { $siempreSube = $false; break } }
            $crecMB  = $ultimo - $primero
            $crecPct = if ($primero -gt 0) { ($crecMB / $primero) * 100 } else { 0 }
            if ($siempreSube -and $crecPct -ge $UmbralCrecimientoPct -and $crecMB -ge $MinCrecimientoMB) {
                $alertados[$p.Id] = $true
                $alertas.Add([pscustomobject]@{
                    t = $t; regla = "crecimiento_sostenido"; proceso = $p.ProcessName; pid = $p.Id
                    detalle = "Memoria privada subió de $primero MB a $ultimo MB (+$([math]::Round($crecPct,0))%) en $VentanaMuestras muestras"
                })
                Write-Host "[ALERTA t=$t s] $($p.ProcessName) (PID $($p.Id)) crece de forma sostenida" -ForegroundColor Red
            }
        }

        # --- Regla 2: proceso NUEVO desde carpeta Temp o AppData ---
        if (-not $primera -and -not $lineaBase.ContainsKey($p.Id) -and -not $alertados.ContainsKey("ruta$($p.Id)")) {
            $ruta = Get-RutaProceso $p
            if ($ruta -and $ruta -match '\\(Temp|AppData)\\') {
                $alertados["ruta$($p.Id)"] = $true
                $alertas.Add([pscustomobject]@{
                    t = $t; regla = "proceso_en_carpeta_inusual"; proceso = $p.ProcessName; pid = $p.Id
                    detalle = "Proceso nuevo ejecutándose desde $ruta"
                })
                Write-Host "[ALERTA t=$t s] $($p.ProcessName) nuevo desde carpeta inusual" -ForegroundColor Yellow
            }
        }
    }

    $primera = $false
    Start-Sleep -Seconds $IntervaloSeg
}

# ---------- Verificación de protecciones (solo lectura) ----------
# RunAsPPL: 1 = LSA Protection activada. Si no existe el valor, está desactivada por defecto.
$runAsPPL = $null
try {
    $runAsPPL = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name RunAsPPL -ErrorAction Stop).RunAsPPL
} catch { $runAsPPL = $null }

# Credential Guard: SecurityServicesRunning contiene el valor 1 cuando está en ejecución.
$cgEstado = "no_disponible"
try {
    $dg = Get-CimInstance -Namespace "root\Microsoft\Windows\DeviceGuard" -ClassName Win32_DeviceGuard -ErrorAction Stop
    if ($dg.SecurityServicesRunning -contains 1) { $cgEstado = "activo" }
    elseif ($dg.SecurityServicesConfigured -contains 1) { $cgEstado = "configurado_no_en_ejecucion" }
    else { $cgEstado = "inactivo" }
} catch { $cgEstado = "no_disponible" }

$protecciones = [pscustomobject]@{
    lsa_protection = [pscustomobject]@{
        valor_runasppl = $runAsPPL
        estado = if ($runAsPPL -eq 1 -or $runAsPPL -eq 2) { "activa" } else { "inactiva" }
    }
    credential_guard = [pscustomobject]@{ estado = $cgEstado }
}

# ---------- Exportar JSON ----------
$resultado = [pscustomobject]@{
    meta = [pscustomobject]@{
        equipo = $env:COMPUTERNAME
        fecha = (Get-Date).ToString("s")
        os = (Get-CimInstance Win32_OperatingSystem).Caption
        duracion_s = $DuracionSeg
        intervalo_s = $IntervaloSeg
        umbral_crecimiento_pct = $UmbralCrecimientoPct
        ventana_muestras = $VentanaMuestras
    }
    muestras = $muestras
    alertas = $alertas
    protecciones = $protecciones
}

$dir = Split-Path -Parent $Salida
if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$resultado | ConvertTo-Json -Depth 6 | Set-Content -Path $Salida -Encoding UTF8
Write-Host "Listo. JSON guardado en: $Salida  ($($muestras.Count) muestras, $($alertas.Count) alertas)" -ForegroundColor Green

<#
.SYNOPSIS
  Simula una fuga de memoria PROPIA e INOFENSIVA para probar el monitor.

.DESCRIPTION
  Reserva memoria poco a poco dentro de este mismo proceso de PowerShell y la mantiene
  ocupada. No toca otros procesos, ni LSASS, ni archivos del sistema. Al terminar (o con Ctrl+C)
  libera todo. Tiene un tope (MaxMB) para no saturar el equipo.

  Ejecutar solo en el equipo propio, autorizado por el profesor (no en equipos de la universidad ni de terceros).

  NOTA: código generado con ayuda de IA. Registrar el uso en bitacora-ia.md.

.EXAMPLE
  .\simular-fuga.ps1 -MBPorPaso 20 -SegundosPorPaso 5 -MaxMB 400
#>
param(
    [int]$MBPorPaso = 20,
    [int]$SegundosPorPaso = 5,
    [int]$MaxMB = 400
)

$rnd = New-Object System.Random
$bloques = New-Object System.Collections.Generic.List[byte[]]
$total = 0

Write-Host "Simulador de fuga. PID de este proceso: $PID" -ForegroundColor Cyan
Write-Host "Reservará $MBPorPaso MB cada $SegundosPorPaso s hasta $MaxMB MB. Ctrl+C para cortar." -ForegroundColor Cyan

try {
    while ($total -lt $MaxMB) {
        $buf = New-Object byte[] ($MBPorPaso * 1MB)
        $rnd.NextBytes($buf)          # escribir datos obliga a que la memoria quede realmente usada
        $bloques.Add($buf)
        $total += $MBPorPaso
        Write-Host ("{0}  reservado: {1} MB" -f (Get-Date -Format "HH:mm:ss"), $total)
        Start-Sleep -Seconds $SegundosPorPaso
    }
    Write-Host "Tope alcanzado ($MaxMB MB). Presione Enter para liberar y salir." -ForegroundColor Yellow
    [void](Read-Host)
}
finally {
    $bloques.Clear()
    [GC]::Collect()
    Write-Host "Memoria liberada." -ForegroundColor Green
}

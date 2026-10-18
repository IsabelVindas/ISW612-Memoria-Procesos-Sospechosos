# ISW612-Memoria-Procesos-Sospechosos

Trabajo de Investigación Unidad III · ISW-612 Administración de Sistemas Operativos de Red
Universidad Técnica Nacional · Ingeniería del Software · Prof. Marcos Castro

**Tema 3: Memoria y procesos sospechosos**
**Integrantes:** Angélica Varela Vargas · Isabel María Martínez Vindas

> **Estado:** en desarrollo. Entrega final y defensa: 26 de octubre de 2026.

## Pregunta de investigación

¿Qué indicadores de memoria y de proceso delatan un comportamiento anómalo en Windows, y qué defensas existen para proteger las credenciales en memoria (LSA Protection y Credential Guard)?

## Cómo funciona

El proyecto tiene tres piezas conectadas:

1. **Script de PowerShell** (`script/monitor.ps1`): mide los procesos de Windows cada pocos segundos, aplica reglas de alerta y consulta el estado de las protecciones. Exporta todo a un JSON.
2. **Archivo JSON** (`datos/ejemplo.json`): es el contrato entre el script y la web. Su estructura está documentada en [`datos/esquema.md`](datos/esquema.md).
3. **Aplicación web** (`web/`, en desarrollo): HTML y JavaScript, sin servidor. Carga el JSON en el navegador, muestra gráfico, alertas y protecciones en lenguaje simple. Ningún dato sale del equipo.

```
simular-fuga.ps1 ──► procesos y memoria ──► monitor.ps1 ──► datos/ejemplo.json ──► web/index.html
 (prueba propia)      LSA · Device Guard      (PowerShell)        (JSON)             (navegador)
```

## Qué mide el script

Por cada proceso y cada muestra: nombre, PID, working set, memoria privada, hilos y handles.

| Regla | Qué detecta | Estado |
|---|---|---|
| R1 | Crecimiento sostenido de memoria privada (umbral configurable) | Implementada |
| R2 | Proceso nuevo ejecutándose desde carpetas `Temp` o `AppData` | Implementada |
| R3 | Handles o hilos fuera de la línea base | Pendiente |

Además consulta, **solo en modo lectura**, el estado de:
- **LSA Protection**: valor `RunAsPPL` del registro en `HKLM:\SYSTEM\CurrentControlSet\Control\Lsa`.
- **Credential Guard**: clase WMI `Win32_DeviceGuard`.

## Requisitos

- Windows 10 u 11 con PowerShell 5.1 o superior.
- PowerShell abierto **como administrador** (para leer la ruta de todos los procesos y el registro).
- Un navegador moderno para la app web.

## Cómo reproducir el experimento

1. Clonar el repositorio y abrir PowerShell como administrador en la carpeta `script`:
   ```powershell
   cd .\script
   Set-ExecutionPolicy -Scope Process Bypass
   ```
2. Cerrar programas pesados para que la medición sea limpia.
3. **Ventana 1**: iniciar el monitor.
   ```powershell
   .\monitor.ps1 -DuracionSeg 120 -IntervaloSeg 5
   ```
4. **Ventana 2**, enseguida: iniciar el simulador de fuga de memoria.
   ```powershell
   .\simular-fuga.ps1 -MBPorPaso 20 -SegundosPorPaso 5 -MaxMB 300
   ```
5. Al terminar el monitor se genera `datos/ejemplo.json`, con las muestras, las alertas y el estado de las protecciones.
6. Abrir `web/index.html` con doble clic y cargar el JSON (cuando la web esté lista).

### Parámetros principales de `monitor.ps1`

| Parámetro | Valor por defecto | Significado |
|---|---|---|
| `-DuracionSeg` | 120 | Duración de la prueba |
| `-IntervaloSeg` | 5 | Segundos entre muestras |
| `-UmbralCrecimientoPct` | 50 | Porcentaje de crecimiento que dispara R1 |
| `-VentanaMuestras` | 6 | Muestras consecutivas que se evalúan |
| `-MinCrecimientoMB` | 20 | Crecimiento mínimo para ignorar ruido |
| `-Salida` | `..\datos\ejemplo.json` | Dónde se guarda el JSON |

## Estructura del repositorio

```
├── README.md
├── bitacora-ia.md        Bitácora de uso de IA
├── script/
│   ├── monitor.ps1       Monitor de memoria y procesos
│   └── simular-fuga.ps1  Simulador propio e inofensivo de fuga de memoria
├── datos/
│   ├── ejemplo.json      Salida real del monitor
│   └── esquema.md        Documentación de la estructura del JSON
├── web/                  Aplicación web (en desarrollo)
├── evidencia/            Capturas y mediciones para el documento
└── docs/                 Documento APA 7 y presentación
```

## Ética y seguridad

- Las pruebas se hicieron en el Windows local de las integrantes, **con autorización del profesor** en lugar de una máquina virtual.
- **No se usa malware real.** La fuga de memoria la produce un script propio que solo reserva memoria dentro de su propio proceso y tiene un tope.
- Los scripts **solo leen** información. No acceden a LSASS, no extraen credenciales y no activan ni desactivan protecciones.
- No se suben credenciales, llaves ni datos reales. El JSON de ejemplo usa un nombre de equipo genérico (`PC-DEMO`).

## Uso de IA

Toda ayuda de IA está registrada en [`bitacora-ia.md`](bitacora-ia.md), con lo que se pidió, lo que se verificó y lo que se corrigió.

## Fuentes principales

- Microsoft. (s. f.). *Get-Process (Microsoft.PowerShell.Management)*. Microsoft Learn.
- Microsoft. (s. f.). *Working set*. Microsoft Learn.
- Microsoft. (s. f.). *Configuración de protección adicional para LSA*. Microsoft Learn.
- Microsoft. (s. f.). *Configuración de Credential Guard*. Microsoft Learn.
- MITRE. (s. f.). *OS credential dumping: LSASS memory (T1003.001)*. MITRE ATT&CK.

Las URL completas están en el documento de la ficha y en el documento final.

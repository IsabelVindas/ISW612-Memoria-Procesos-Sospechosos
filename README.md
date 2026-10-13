# ISW612-Memoria-Procesos-Sospechosos

Trabajo de Investigación Unidad III · ISW-612 Administración de Sistemas Operativos de Red
Universidad Técnica Nacional · Ingeniería del Software · Prof. Marcos Castro

**Tema 3: Memoria y procesos sospechosos**
**Integrantes:** Angélica Varela Vargas · [segunda integrante]

> **Estado:** en desarrollo. Entrega final y defensa: 26 de octubre de 2026.

## Pregunta de investigación

¿Qué indicadores de memoria y de proceso delatan un comportamiento anómalo en Windows, y qué defensas existen para proteger las credenciales en memoria (LSA Protection y Credential Guard)?

## Hipótesis

- **H1:** una fuga de memoria simulada hará que los bytes privados de un proceso crezcan de forma continua. Al compararlos con una línea base, un monitor en PowerShell podrá detectarla sin marcar como sospechosos a los procesos normales.
- **H2:** el estado de LSA Protection y de Credential Guard se puede consultar sin tocar credenciales, y no todas las protecciones estarán activas en la VM de laboratorio.

## ¿Qué hace el proyecto?

Tres piezas conectadas:

1. **Script de PowerShell:** mide por proceso el working set, los bytes privados, los hilos y los handles, calcula una línea base, aplica reglas de alerta y consulta (solo lectura) el estado de LSA Protection y Credential Guard.
2. **Archivo JSON:** guarda las muestras, las alertas y el estado de las protecciones. Es el contrato entre el script y la web.
3. **App web (HTML y JavaScript):** carga el JSON en el navegador y lo presenta con un gráfico, semáforo, alertas y explicaciones en lenguaje simple. Funciona sin servidor y ningún dato sale del equipo.

```
VM Windows 11  →  Script PowerShell  →  JSON  →  App web (navegador)
```

## Reglas de alerta

| Regla | Qué detecta |
|---|---|
| R1 | Los bytes privados crecen más de X % durante Y minutos seguidos |
| R2 | Un proceso se ejecuta desde Temp, AppData o Downloads |
| R3 | Handles o hilos fuera de la línea base |

Semáforo: 0 reglas = verde, 1 regla = amarillo, 2 o 3 reglas = rojo. Los umbrales serán configurables en la web.

## Estructura prevista del repositorio

```
ISW612-Memoria-Procesos-Sospechosos/
├─ README.md
├─ script/         scripts de PowerShell
├─ datos/          ejemplo.json y esquema.md
├─ web/            index.html, css/ y js/
├─ evidencia/      capturas y mediciones
├─ bitacora-ia.md
└─ docs/           documento APA y presentación
```

## Seguridad y ética

- Todo se prueba en una **máquina virtual propia y aislada** (VirtualBox), nunca en equipos de la universidad ni de terceros.
- **No se usa malware real:** la fuga de memoria se simula con un programa propio e inofensivo.
- **No se accede a LSASS ni se extraen credenciales.**
- El repositorio no contiene credenciales, llaves ni datos reales.

## Fuentes principales

- Microsoft. (s. f.). *Get-Process (Microsoft.PowerShell.Management)*. Microsoft Learn. https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-process?view=powershell-5.1
- Microsoft. (s. f.). *Working set*. Microsoft Learn. https://learn.microsoft.com/en-us/windows/win32/memory/working-set
- Microsoft. (s. f.). *Configuración de protección adicional para LSA*. Microsoft Learn. https://learn.microsoft.com/es-es/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection
- Microsoft. (s. f.). *Configuración de Credential Guard*. Microsoft Learn. https://learn.microsoft.com/es-es/windows/security/identity-protection/credential-guard/configure
- MITRE. (s. f.). *OS credential dumping: LSASS memory (T1003.001)*. MITRE ATT&CK. https://attack.mitre.org/techniques/T1003/001/

## Uso de IA

El uso de IA se registrará en `bitacora-ia.md`.

> Pendiente para la entrega final: requisitos, pasos para ejecutar el script y abrir la web, cómo reproducir el experimento y limitaciones.

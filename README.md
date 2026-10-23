# ISW612 - Memoria y Procesos Sospechosos

**Trabajo de Investigación - Unidad III**
**Curso:** ISW-612 Administración de Sistemas Operativos de Red
**Universidad:** Universidad Técnica Nacional
**Carrera:** Ingeniería del Software
**Profesor:** Marcos Castro

**Tema 3:** Memoria y procesos sospechosos

**Integrantes:**
- Angélica Varela Vargas
- Isabel María Martínez Vindas

**Estado:** Aplicación web funcional; proyecto académico en preparación para la entrega final.
**Entrega y defensa:** 26 de octubre de 2026.

---

## 1. Pregunta de investigación

¿Qué indicadores de memoria y de proceso delatan un comportamiento anómalo en Windows, y qué defensas existen para proteger las credenciales en memoria mediante LSA Protection y Credential Guard?

## 2. Descripción del proyecto

El proyecto consiste en desarrollar una herramienta que permita monitorear el consumo de memoria de los procesos de Windows, identificar posibles comportamientos anormales y consultar el estado de determinadas protecciones de seguridad del sistema operativo.

Para ello se utiliza un script de PowerShell que recopila información y genera un archivo JSON. Posteriormente, una aplicación web desarrollada con HTML, CSS y JavaScript permite analizar los resultados de forma visual y comprensible.

El proyecto tiene fines educativos y utiliza una simulación controlada de crecimiento de memoria, sin emplear malware real.

## 3. ¿Cómo funciona?

El sistema tiene tres componentes principales:

1. **Script de PowerShell (`Script/monitor.ps1`):** recopila información sobre los procesos de Windows, registra el consumo de memoria, aplica reglas de detección y consulta el estado de LSA Protection y Credential Guard. Los resultados se exportan en formato JSON.

2. **Archivo JSON (`Datos/ejemplo.json`):** contiene las mediciones, las alertas y los estados de las protecciones recopilados durante la prueba. Su estructura está documentada en `Datos/esquema.md`.

3. **Aplicación web (`web/`):** permite cargar y analizar el JSON directamente desde el navegador, sin necesidad de instalar un servidor.

El flujo general del proyecto es:

```text
simular-fuga.ps1
        |
        v
Procesos y consumo de memoria
        |
        v
monitor.ps1
        |
        v
Datos/ejemplo.json
        |
        v
web/index.html
        |
        v
Gráficos, alertas, protecciones y reportes
```

## 4. ¿Qué mide el script?

El monitor registra las siguientes características de los procesos:

- Nombre del proceso.
- Identificador del proceso (PID).
- Memoria privada, en MB.
- Working set, en MB.
- Cantidad de hilos.
- Cantidad de handles.
- Tiempo de la medición.

### Reglas de detección

| Regla | Descripción | Estado |
|---|---|---|
| R1 | Detecta crecimiento sostenido de memoria privada mediante un umbral configurable. | Implementada |
| R2 | Identifica procesos nuevos ejecutados desde ubicaciones inusuales, como `Temp` o `AppData`. | Implementada |
| R3 | Analiza cantidades de handles o hilos fuera de una línea base. | Pendiente |

### Protecciones de Windows

El monitor también consulta, en modo de lectura:

**LSA Protection:** comprueba información relacionada con la protección de la autoridad de seguridad local de Windows y el valor `RunAsPPL`.

**Credential Guard:** consulta información del sistema para determinar el estado registrado de esta protección.

Estas consultas no activan ni desactivan las protecciones.

## 5. Requisitos

Para ejecutar el monitor:

- Windows 10 u 11.
- PowerShell 5.1 o superior.
- Permisos adecuados para consultar la información del sistema.
- Un entorno de pruebas propio y autorizado.

Para utilizar la aplicación web:

- Google Chrome u otro navegador moderno.
- Los archivos incluidos en la carpeta `web/`.
- No se requiere servidor web, XAMPP ni conexión a internet.

## 6. Cómo reproducir el experimento

**Importante:** la ejecución del simulador y del monitor debe realizarse únicamente en una máquina virtual o un entorno de pruebas expresamente autorizado. No ejecutar pruebas en equipos ajenos ni sistemas de producción.

### Paso 1. Abrir PowerShell

Abrir PowerShell con los permisos necesarios y ubicarse en la carpeta `Script`:

```powershell
cd .\Script
```

Si la política de ejecución impide iniciar el script y el entorno de pruebas lo permite, se puede utilizar una configuración temporal para esa sesión:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
```

### Paso 2. Ejecutar el monitor

En la primera ventana de PowerShell:

```powershell
.\monitor.ps1 -DuracionSeg 120 -IntervaloSeg 5
```

Este comando inicia una medición de 120 segundos, con intervalos de 5 segundos.

### Paso 3. Ejecutar el simulador

En una segunda ventana de PowerShell, dentro de la misma carpeta:

```powershell
.\simular-fuga.ps1 -MBPorPaso 20 -SegundosPorPaso 5 -MaxMB 300
```

El simulador produce un aumento controlado de memoria para permitir la observación del comportamiento.

### Paso 4. Obtener el archivo JSON

Al terminar el monitoreo se genera un archivo JSON con los resultados, según la ruta de salida configurada en `monitor.ps1`.

### Paso 5. Analizar la información

Abrir `web/index.html` en el navegador y seleccionar el JSON generado para revisar los resultados.

También es posible usar directamente los datos de ejemplo incluidos en el repositorio, sin ejecutar los scripts.

### Parámetros principales del monitor

| Parámetro | Valor por defecto | Significado |
|---|---|---|
| `-DuracionSeg` | 120 | Duración de la prueba en segundos |
| `-IntervaloSeg` | 5 | Intervalo entre mediciones |
| `-UmbralCrecimientoPct` | 50 | Porcentaje utilizado por la regla de crecimiento |
| `-VentanaMuestras` | 6 | Cantidad de muestras consecutivas evaluadas |
| `-MinCrecimientoMB` | 20 | Crecimiento mínimo considerado por la regla |
| `-Salida` | `..\Datos\ejemplo.json` | Ruta del archivo JSON de salida |

## 7. Cómo utilizar la aplicación web

La aplicación web puede abrirse directamente desde el navegador.

### Paso 1. Abrir la aplicación

Ingresar en la carpeta `web` y abrir el archivo:

`web/index.html`

No es necesario iniciar un servidor.

### Paso 2. Cargar los datos

Existen dos opciones:

**Cargar datos de ejemplo:** permite visualizar automáticamente la información proporcionada con el proyecto mediante `web/js/ejemplo.js`.

**Seleccionar archivo JSON:** permite analizar otro archivo generado por el monitor de PowerShell.

### Paso 3. Revisar el resumen

El resumen muestra información como:

- Nombre del equipo.
- Sistema operativo.
- Duración del monitoreo.
- Cantidad de muestras.
- Cantidad de alertas originales.
- Estado general y tres hallazgos principales.

### Paso 4. Analizar el consumo de memoria

La sección de gráficos presenta la evolución de memoria privada durante el monitoreo.

El usuario puede visualizar los cinco procesos con mayor consumo o seleccionar uno específico.

Para revisar el caso de ejemplo, seleccionar:

`powershell (PID 19272)`

En esta prueba se observa un aumento importante de memoria privada, relacionado con la simulación realizada.

### Paso 5. Buscar procesos

La tabla permite buscar procesos por nombre o PID.

También muestra:

- Memoria privada de la última medición.
- Working set de la última medición.
- Estado de las alertas originales asociadas al PID.

### Paso 6. Consultar las alertas

La aplicación diferencia dos tipos de resultados:

**Alertas del monitor:** proceden del análisis realizado por PowerShell.

**Crecimientos observados en la web:** son calculados mediante JavaScript comparando la primera y la última medición disponible de cada proceso.

El umbral configurable permite modificar el porcentaje de crecimiento que utiliza la evaluación adicional de la aplicación web.

**Importante:** ambas evaluaciones emplean criterios diferentes y no deben interpretarse como ataques independientes.

### Paso 7. Consultar las protecciones

La aplicación muestra los estados registrados de:

- LSA Protection.
- Credential Guard.

La información corresponde al momento de la recopilación y no constituye una auditoría completa del sistema.

### Paso 8. Exportar resultados

Se ofrecen dos opciones:

**Descargar JSON:** permite guardar los datos del monitoreo cargados en la aplicación.

**Imprimir reporte / Guardar como PDF:** utiliza la función de impresión del navegador para imprimir o guardar la vista del análisis como documento PDF.

## 8. Pruebas de validación

Para comprobar que la aplicación maneja correctamente archivos incorrectos, se incluyen dos archivos en `Datos/pruebas/`.

### Prueba 1. JSON con estructura incompleta

Archivo:

`Datos/pruebas/prueba_invalida.json`

El archivo contiene datos insuficientes para realizar el análisis.

**Resultado esperado:**

- Aparece un mensaje indicando la sección que falta.
- Se eliminan los resultados del archivo anteriormente cargado.
- Se deshabilitan los botones de exportación.
- La aplicación sigue funcionando y permite cargar otro archivo.

### Prueba 2. JSON vacío

Archivo:

`Datos/pruebas/prueba_vacia.json`

Este archivo no contiene información.

**Resultado esperado:**

- Se muestra el mensaje «El archivo JSON está vacío».
- Se limpian el resumen, el gráfico, las alertas y la tabla.
- Se deshabilitan los botones de exportación.
- Se permite volver a cargar los datos de ejemplo.

Ambas pruebas se realizaron durante el desarrollo de la aplicación web.

## 9. Estructura del repositorio

```text
ISW612-Memoria-Procesos-Sospechosos/
|
|-- README.md
|
|-- Script/
|   |-- monitor.ps1
|   |-- simular-fuga.ps1
|
|-- Datos/
|   |-- ejemplo.json
|   |-- esquema.md
|   |
|   |-- pruebas/
|       |-- prueba_invalida.json
|       |-- prueba_vacia.json
|
|-- web/
|   |-- index.html
|   |
|   |-- css/
|   |   |-- estilos.css
|   |
|   |-- js/
|       |-- app.js
|       |-- ejemplo.js
|
|-- Evidencia/
|   |-- Capturas de las pruebas
|
|-- Bitacora_IA_ISW612.docx
|-- Entregable_0_ISW612_Memoria_y_Procesos (1).docx
```

Los documentos finales, las evidencias adicionales y la presentación se incorporarán según avance la preparación de la entrega.

## 10. Ética y seguridad

Este proyecto tiene fines exclusivamente académicos.

- No utiliza malware real.
- La simulación consiste en reservar memoria dentro de un proceso de prueba, con un límite configurado.
- Las pruebas deben ejecutarse únicamente en entornos propios y autorizados.
- El monitor consulta información del sistema sin extraer credenciales.
- No se intenta acceder a la memoria protegida de LSASS.
- No se modifican las configuraciones de LSA Protection ni Credential Guard.
- El análisis web se procesa localmente en el navegador.
- Las alertas permiten identificar comportamientos para investigar, pero no demuestran por sí solas la presencia de malware.

**Privacidad:** antes de compartir archivos JSON o capturas, se debe verificar que no contengan nombres de equipo, nombres de usuario, rutas u otros datos identificables que no se deseen publicar.

## 11. Uso de inteligencia artificial

Se utilizó inteligencia artificial como herramienta de apoyo en:

- La organización del proyecto.
- El desarrollo y revisión de la aplicación web.
- La explicación de conceptos técnicos.
- La identificación y corrección de errores.
- La preparación de pruebas de validación.
- La documentación del trabajo.

Los resultados deben revisarse y comprobarse mediante pruebas realizadas por las integrantes.

La bitácora del uso de IA se incluye en el proyecto.

## 12. Fuentes principales

- Microsoft. (s. f.). *Get-Process (Microsoft.PowerShell.Management).* Microsoft Learn.
- Microsoft. (s. f.). *Working set.* Microsoft Learn.
- Microsoft. (s. f.). *Configuración de protección adicional para LSA.* Microsoft Learn.
- Microsoft. (s. f.). *Configuración de Credential Guard.* Microsoft Learn.
- MITRE ATT&CK. (s. f.). *OS Credential Dumping: LSASS Memory (T1003.001).*

Las referencias completas y las fuentes adicionales se incluirán en el documento académico final.

---

**Universidad Técnica Nacional — Ingeniería del Software**
**ISW-612 — Administración de Sistemas Operativos de Red**
**III Cuatrimestre, 2026**
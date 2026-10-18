# Esquema del JSON (`datos/ejemplo.json`)

Archivo generado por `script/monitor.ps1`. Es el contrato entre el script de PowerShell y la app web.
Codificación: UTF-8. Todos los campos de texto deben mostrarse en la web como texto, nunca como HTML.

## Estructura general

```json
{
  "meta": { ... },
  "muestras": [ ... ],
  "alertas": [ ... ],
  "protecciones": { ... }
}
```

## `meta` (objeto): datos de la ejecución

| Campo | Tipo | Significado |
|---|---|---|
| `equipo` | texto | Nombre del equipo (VM) donde se ejecutó |
| `fecha` | texto (ISO 8601) | Fecha y hora en que terminó la ejecución y se guardó el JSON |
| `os` | texto | Versión de Windows |
| `duracion_s` | número | Duración de la prueba en segundos |
| `intervalo_s` | número | Segundos entre muestras |
| `umbral_crecimiento_pct` | número | Porcentaje de crecimiento que dispara la alerta |
| `ventana_muestras` | número | Cantidad de muestras consecutivas que se evalúan para el crecimiento sostenido |

## `muestras` (lista): una fila por proceso y por instante

| Campo | Tipo | Significado |
|---|---|---|
| `t` | número | Segundos transcurridos desde el inicio de la prueba |
| `proceso` | texto | Nombre del proceso (sin `.exe`) |
| `pid` | número | Identificador del proceso (PID) |
| `ws_mb` | número | Working set: memoria física en uso, en MB |
| `privado_mb` | número | Memoria privada: la que el proceso reservó solo para él, en MB |
| `hilos` | número | Cantidad de hilos |
| `handles` | número | Cantidad de handles abiertos |

Solo se registran procesos con memoria privada mayor o igual a 5 MB (parámetro `-MinPrivadoMB`).

## `alertas` (lista): lo que detectaron las reglas

| Campo | Tipo | Significado |
|---|---|---|
| `t` | número | Segundo en que se disparó la alerta |
| `regla` | texto | `crecimiento_sostenido` o `proceso_en_carpeta_inusual` |
| `proceso` | texto | Nombre del proceso que disparó la alerta |
| `pid` | número | PID del proceso |
| `detalle` | texto | Explicación de por qué se disparó |

Puede estar vacía si no se detectó nada.

## `protecciones` (objeto): estado de las defensas de credenciales (solo lectura)

| Campo | Tipo | Significado |
|---|---|---|
| `lsa_protection.valor_runasppl` | número o `null` | Valor del registro `RunAsPPL` en la clave de LSA; `null` si no existe |
| `lsa_protection.estado` | texto | `activa` o `inactiva` |
| `credential_guard.estado` | texto | `activo`, `configurado_no_en_ejecucion`, `inactivo` o `no_disponible` |

## Notas
- Si hay una sola muestra, algunas versiones de PowerShell serializan la lista como objeto; la web debe aceptar ambos casos.
- Si falta un bloque o el JSON está vacío, la web debe mostrar un mensaje claro y no romperse.

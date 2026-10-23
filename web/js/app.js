
"use strict";

// ISW-612 - Monitor de memoria y procesos sospechosos
// Primera parte: cargar y validar archivos JSON.

let datosActuales = null;

const archivoJSON = document.getElementById("archivoJSON");
const btnEjemplo = document.getElementById("btnEjemplo");
const mensaje = document.getElementById("mensaje");
const umbral = document.getElementById("umbral");
const btnExportar = document.getElementById("btnExportar");
const btnImprimir = document.getElementById("btnImprimir");

// Verificar la estructura del JSON.
function validarDatos(datos) {
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
        throw new Error("El archivo no contiene un objeto JSON válido.");
    }

    if (!datos.meta || typeof datos.meta !== "object") {
        throw new Error("Falta la seccion 'meta'.");
    }

    if (!datos.muestras || !["object"].includes(typeof datos.muestras)) {
        throw new Error("Falta la seccion 'muestras'.");
    }

    if (!datos.alertas || !["object"].includes(typeof datos.alertas)) {
        throw new Error("Falta la seccion 'alertas'.");
    }

    if (!datos.protecciones || typeof datos.protecciones !== "object") {
        throw new Error("Falta la seccinn 'protecciones'.");
    }

    // Admitir una sola muestra como objeto.
    if (!Array.isArray(datos.muestras)) {
        datos.muestras = [datos.muestras];
    }

    if (!Array.isArray(datos.alertas)) {
        datos.alertas = [datos.alertas];
    }

    return datos;
}

// Procesar el archivo cargado.
function procesarTextoJSON(texto, nombreArchivo) {
    try {

        if (!texto || texto.trim() === "") {
            throw new Error("El archivo JSON esta vacio.");
        }

        let contenido;

        try {
            contenido = JSON.parse(texto);
        } catch {
            throw new Error(
                "El archivo no contiene un JSON valido. Revisa su contenido."
            );
        }

        const datos = validarDatos(contenido);

        datosActuales = datos;
        mensaje.textContent = "Archivo cargado correctamente: " + nombreArchivo;

        btnExportar.disabled = false;
        btnImprimir.disabled = false;

        mostrarResumen(datos);
        mostrarGrafico(datos);
        const porcentaje = Number(umbral.value);

        const alertasCalculadas =
            Number.isFinite(porcentaje) && porcentaje >= 1
                ? detectarCrecimientos(datos, porcentaje)
                : [];

        mostrarAlertas({
            ...datos,
            alertas: [
                ...datos.alertas,
                ...alertasCalculadas
            ]
        });
        mostrarProtecciones(datos);
        mostrarTablaProcesos(datos);

    } catch (error) {
        datosActuales = null;

        mensaje.textContent = "Error: " + error.message;

        btnExportar.disabled = true;
        btnImprimir.disabled = true;

        // Eliminar los resultados del archivo anterior.
        const secciones = [
            "datosGenerales",
            "contenedorGrafico",
            "listaAlertas",
            "estadoProtecciones",
            "tablaProcesos"
        ];

        secciones.forEach(id => {
            const elemento = document.getElementById(id);

            if (elemento) {
                elemento.replaceChildren();
            }
        });

        // Reiniciar el selector del gráfico.
        const selector = document.getElementById("seleccionarProceso");

        if (selector) {
            selector.replaceChildren();

            const opcion = document.createElement("option");
            opcion.value = "principales";
            opcion.textContent = "Mostrar los 5 principales";

            selector.appendChild(opcion);
        }

        // Limpiar el buscador de procesos.
        const buscador = document.getElementById("buscarProceso");

        if (buscador) {
            buscador.value = "";
        }
    }

}

// Cargar un archivo elegido por el usuario.
archivoJSON.addEventListener("change", async function () {
    const archivo = archivoJSON.files[0];

    if (!archivo) {
        return;
    }

    try {
        const texto = await archivo.text();
        procesarTextoJSON(texto, archivo.name);
    } catch {
        mensaje.textContent = "No fue posible leer el archivo.";
    }
});


/*
 * Carga automatica de los datos de ejemplo.
 * Funciona localmente sin servidor ni conexion a internet.
 */
btnEjemplo.addEventListener("click", function () {
    if (!window.DATOS_EJEMPLO) {
        mensaje.textContent =
            "No se encontraron los datos de ejemplo.";
        return;
    }

    const texto = JSON.stringify(window.DATOS_EJEMPLO);
    procesarTextoJSON(texto, "ejemplo.json");
});



// Mostrar un primer resumen.
function mostrarResumen(datos) {
    const contenedor = document.getElementById("datosGenerales");

    contenedor.replaceChildren();

    const informacion = [
        ["Equipo", datos.meta.equipo],
        ["Sistema operativo", datos.meta.os],
        ["Duracion", datos.meta.duracion_s + " segundos"],
        ["Muestras registradas", datos.muestras.length],
        ["Alertas detectadas", datos.alertas.length]
    ];

    informacion.forEach(([titulo, valor]) => {
        const tarjeta = document.createElement("div");
        tarjeta.className = "tarjeta";

        const etiqueta = document.createElement("strong");
        etiqueta.textContent = titulo + ": ";

        const contenido = document.createElement("span");
        contenido.textContent = String(valor ?? "No disponible");

        tarjeta.append(etiqueta, contenido);
        contenedor.appendChild(tarjeta);
    });


    // Resumen de hallazgos originales del monitor.
    const hallazgos = document.createElement("div");
    hallazgos.className = "tarjeta";

    const tituloHallazgos = document.createElement("h3");
    tituloHallazgos.textContent = "Hallazgos principales";
    hallazgos.appendChild(tituloHallazgos);

    const nivel = document.createElement("p");

    if (datos.alertas.length > 0) {
        nivel.textContent =
            "Estado: Requiere revision. Se detectaron " +
            datos.alertas.length + " alertas.";
        nivel.style.color = "#b91c1c";
    } else {
        nivel.textContent =
            "Estado: Sin alertas registradas. " +
            "Esto no garantiza ausencia de riesgos.";
        nivel.style.color = "#166534";
    }

    hallazgos.appendChild(nivel);

    const lista = document.createElement("ol");


    const elementos = [];

    // Hallazgos detectados por el monitor de PowerShell.
    datos.alertas.slice(0, 3).forEach(alerta => {
        elementos.push(
            "Alerta en " + String(alerta.proceso ?? "proceso desconocido") +
            " (PID " + String(alerta.pid ?? "N/D") + "): " +
            String(alerta.regla ?? "comportamiento por revisar")
        );
    });

    // Estado de Credential Guard.
    const credential = datos.protecciones.credential_guard?.estado;

    if (elementos.length < 3) {
        elementos.push(
            credential === "activo"
                ? "Credential Guard: activo. Ayuda a proteger determinadas credenciales."
                : "Credential Guard: " + String(credential ?? "no disponible") +
                ". Se recomienda revisar su configuración y compatibilidad."
        );
    }

    // Estado de LSA Protection.
    const lsa = datos.protecciones.lsa_protection?.estado;

    if (elementos.length < 3) {
        elementos.push(
            lsa === "activa"
                ? "LSA Protection: activa según los datos recopilados."
                : "LSA Protection: " + String(lsa ?? "no disponible") +
                ". Se recomienda verificar su estado."
        );
    }

    elementos.slice(0, 3).forEach(hallazgo => {
        const item = document.createElement("li");
        item.textContent = hallazgo;
        lista.appendChild(item);
    });


    hallazgos.appendChild(lista);
    contenedor.appendChild(hallazgos);

}


/*
 * Grafico de memoria del proyecto ISW-612.
 * Agrupa mediciones por PID y representa memoria privada en MB.
 * No utiliza servidores ni bibliotecas externas.
 */
function mostrarGrafico(datos) {
    const selector = document.getElementById("seleccionarProceso");
    const seleccionAnterior = selector.value;

    const procesosDisponibles = new Map();

    datos.muestras.forEach(muestra => {
        const pid = Number(muestra.pid);

        if (Number.isFinite(pid)) {
            procesosDisponibles.set(
                String(pid),
                String(muestra.proceso ?? "Desconocido")
            );
        }
    });

    selector.replaceChildren();

    const opcionPrincipal = document.createElement("option");
    opcionPrincipal.value = "principales";
    opcionPrincipal.textContent = "Mostrar los 5 principales";
    selector.appendChild(opcionPrincipal);

    for (const [pid, nombre] of procesosDisponibles) {
        const opcion = document.createElement("option");
        opcion.value = pid;
        opcion.textContent = `${nombre} (PID ${pid})`;
        selector.appendChild(opcion);
    }

    selector.value = procesosDisponibles.has(seleccionAnterior)
        ? seleccionAnterior
        : "principales";
    const contenedor = document.getElementById("contenedorGrafico");
    contenedor.replaceChildren();

    const muestras = datos.muestras.filter(m =>
        Number.isFinite(Number(m.t)) &&
        Number.isFinite(Number(m.privado_mb)) &&
        Number.isFinite(Number(m.pid))
    );

    if (muestras.length === 0) {
        contenedor.textContent = "No hay mediciones válidas para mostrar.";
        return;
    }

    // Agrupar las mediciones por identificador de proceso.
    const procesos = new Map();

    for (const muestra of muestras) {
        const clave = String(muestra.pid);

        if (!procesos.has(clave)) {
            procesos.set(clave, {
                nombre: String(muestra.proceso ?? "Desconocido"),
                pid: clave,
                puntos: [],
                maximo: 0
            });
        }

        const proceso = procesos.get(clave);
        const memoria = Number(muestra.privado_mb);

        proceso.puntos.push({
            t: Number(muestra.t),
            memoria: memoria
        });

        proceso.maximo = Math.max(proceso.maximo, memoria);
    }

    // Mostrar los cinco procesos con mayor memoria privada.
    const seleccion = selector.value;

    const principales = seleccion === "principales"
        ? [...procesos.values()]
            .sort((a, b) => b.maximo - a.maximo)
            .slice(0, 5)
        : [...procesos.values()]
            .filter(p => p.pid === seleccion);

    const tiempos = principales.flatMap(p => p.puntos.map(x => x.t));
    const memorias = principales.flatMap(p => p.puntos.map(x => x.memoria));

    const tiempoMin = Math.min(...tiempos);
    const tiempoMax = Math.max(...tiempos);
    const memoriaMax = Math.max(1, ...memorias);

    const ancho = 900;
    const alto = 360;
    const margen = { izq: 75, der: 25, sup: 25, inf: 60 };
    const areaAncho = ancho - margen.izq - margen.der;
    const areaAlto = alto - margen.sup - margen.inf;

    const escalaX = t => margen.izq +
        ((t - tiempoMin) / (tiempoMax - tiempoMin || 1)) * areaAncho;

    const escalaY = mb => margen.sup +
        areaAlto - (mb / memoriaMax) * areaAlto;

    const ns = "http://www.w3.org/2000/svg";

    function elemento(nombre, atributos = {}, texto = null) {
        const nodo = document.createElementNS(ns, nombre);

        for (const [clave, valor] of Object.entries(atributos)) {
            nodo.setAttribute(clave, String(valor));
        }

        if (texto !== null) nodo.textContent = texto;
        return nodo;
    }

    const titulo = document.createElement("p");

    if (seleccion === "principales") {
        titulo.textContent =
            "Evolucion de memoria privada de los cinco procesos con mayor consumo maximo.";
    } else {
        const proceso = principales[0];

        titulo.textContent = proceso
            ? `Evolucion de memoria privada de ${proceso.nombre} (PID ${proceso.pid}).`
            : "No hay mediciones disponibles para el proceso seleccionado.";
    }

    contenedor.appendChild(titulo);

    const grafico = elemento("svg", {
        viewBox: `0 0 ${ancho} ${alto}`,
        role: "img",
        "aria-label": "Grafico de lineas del consumo de memoria por proceso"
    });

    grafico.style.width = "100%";
    grafico.style.height = "auto";

    const colores = [
        "#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c"
    ];

    // Lineas horizontales de referencia.
    for (let i = 0; i <= 4; i++) {
        const valor = memoriaMax * i / 4;
        const y = escalaY(valor);

        grafico.appendChild(elemento("line", {
            x1: margen.izq,
            y1: y,
            x2: ancho - margen.der,
            y2: y,
            stroke: "#dce4ee"
        }));

        grafico.appendChild(elemento("text", {
            x: margen.izq - 10,
            y: y + 4,
            "text-anchor": "end",
            "font-size": 12,
            fill: "#475569"
        }, valor.toFixed(0)));
    }

    // Etiquetas de tiempo.
    for (let i = 0; i <= 4; i++) {
        const tiempo = tiempoMin + (tiempoMax - tiempoMin) * i / 4;

        grafico.appendChild(elemento("text", {
            x: escalaX(tiempo),
            y: alto - 25,
            "text-anchor": "middle",
            "font-size": 12,
            fill: "#475569"
        }, tiempo.toFixed(0) + " s"));
    }

    // Dibujar cada proceso con un color diferente.
    principales.forEach((proceso, indice) => {
        const puntos = proceso.puntos
            .sort((a, b) => a.t - b.t)
            .map(p => `${escalaX(p.t)},${escalaY(p.memoria)}`)
            .join(" ");

        if (proceso.puntos.length > 1) {
            grafico.appendChild(elemento("polyline", {
                points: puntos,
                fill: "none",
                stroke: colores[indice],
                "stroke-width": 2.5,
                "stroke-linejoin": "round"
            }));
        } else {
            grafico.appendChild(elemento("circle", {
                cx: escalaX(proceso.puntos[0].t),
                cy: escalaY(proceso.puntos[0].memoria),
                r: 4,
                fill: colores[indice]
            }));
        }
    });

    contenedor.appendChild(grafico);

    const leyenda = document.createElement("div");
    leyenda.style.display = "flex";
    leyenda.style.flexWrap = "wrap";
    leyenda.style.gap = "15px";

    principales.forEach((proceso, indice) => {
        const item = document.createElement("span");
        item.style.color = colores[indice];
        item.style.fontWeight = "bold";
        item.textContent = `${proceso.nombre} (PID ${proceso.pid})`;
        leyenda.appendChild(item);
    });

    contenedor.appendChild(leyenda);

    const nota = document.createElement("p");
    nota.textContent =
        "Una subida de memoria no confirma por si sola que exista malware. " +
        "Los valores deben compararse con una linea base.";
    contenedor.appendChild(nota);
}


/*
 * Muestra las alertas detectadas por el monitor de PowerShell.
 * Todos los datos externos se presentan usando textContent.
 */
function mostrarAlertas(datos) {
    const contenedor = document.getElementById("listaAlertas");
    contenedor.replaceChildren();

    if (datos.alertas.length === 0) {
        const mensaje = document.createElement("div");
        mensaje.className = "correcto";
        mensaje.textContent =
            "No se registraron alertas durante el monitoreo. " +
            "Esto no garantiza que el equipo este libre de amenazas.";
        contenedor.appendChild(mensaje);
        return;
    }


    datos.alertas.forEach(alerta => {
        const tarjeta = document.createElement("div");

        const esDeteccionWeb =
            alerta.regla === "crecimiento_observado_web";

        tarjeta.className = esDeteccionWeb
            ? "advertencia"
            : "alerta";

        const titulo = document.createElement("h3");
        titulo.textContent =
            (esDeteccionWeb
                ? "Crecimiento observado: "
                : "Alerta del monitor: ") +
            String(alerta.proceso ?? "Proceso desconocido");

        const informacion = document.createElement("p");
        informacion.textContent =
            "PID: " + String(alerta.pid ?? "N/D") +
            " | Segundo: " + String(alerta.t ?? "N/D");

        const regla = document.createElement("p");
        regla.textContent =
            "Regla detectada: " + String(alerta.regla ?? "No especificada");

        const detalle = document.createElement("p");
        detalle.textContent =
            String(alerta.detalle ?? "Sin detalles adicionales.");

        const recomendacion = document.createElement("p");

        if (alerta.regla === "crecimiento_sostenido") {
            recomendacion.textContent =
                "Recomendacion: revisar si el proceso continua " +
                "aumentando su memoria y compararlo con su uso normal.";
        } else if (alerta.regla === "proceso_en_carpeta_inusual") {
            recomendacion.textContent =
                "Recomendacion: verificar el origen del programa " +
                "y comprobar si su ubicacion es confiable.";
        } else {
            recomendacion.textContent =
                "Recomendacion: investigar el comportamiento del proceso.";
        }

        tarjeta.append(
            titulo,
            informacion,
            regla,
            detalle,
            recomendacion
        );

        contenedor.appendChild(tarjeta);
    });
}


/*
 * Detecta crecimiento de memoria privada comparando
 * las primeras y ultimas mediciones de cada proceso.
 *
 * Esta deteccion es adicional a las reglas originales
 * ejecutadas por PowerShell.
 */
function detectarCrecimientos(datos, porcentaje) {
    const procesos = new Map();

    for (const muestra of datos.muestras) {
        const pid = Number(muestra.pid);
        const tiempo = Number(muestra.t);
        const memoria = Number(muestra.privado_mb);

        if (!Number.isFinite(pid) ||
            !Number.isFinite(tiempo) ||
            !Number.isFinite(memoria)) {
            continue;
        }

        if (!procesos.has(pid)) {
            procesos.set(pid, []);
        }

        procesos.get(pid).push({
            t: tiempo,
            memoria: memoria,
            nombre: muestra.proceso
        });
    }

    const resultados = [];

    for (const [pid, muestras] of procesos) {
        muestras.sort((a, b) => a.t - b.t);

        if (muestras.length < 2) continue;

        const inicio = muestras[0].memoria;
        const final = muestras[muestras.length - 1].memoria;

        if (inicio <= 0) continue;

        const crecimiento = ((final - inicio) / inicio) * 100;

        if (crecimiento >= porcentaje) {
            resultados.push({
                t: muestras[muestras.length - 1].t,
                regla: "crecimiento_observado_web",
                proceso: muestras[0].nombre,
                pid: pid,
                detalle:
                    "La memoria paso de " +
                    inicio.toFixed(1) + " MB a " +
                    final.toFixed(1) + " MB (" +
                    crecimiento.toFixed(1) + "%)."
            });
        }
    }

    return resultados;
}

// Actualizar las alertas cuando cambie el umbral.
umbral.addEventListener("change", function () {
    if (!datosActuales) return;

    const porcentaje = Number(umbral.value);

    if (!Number.isFinite(porcentaje) || porcentaje < 1) {
        mensaje.textContent =
            "El umbral debe ser un numero mayor o igual a 1.";
        return;
    }

    const alertasCalculadas =
        detectarCrecimientos(datosActuales, porcentaje);

    const datosTemporales = {
        ...datosActuales,
        alertas: [
            ...datosActuales.alertas,
            ...alertasCalculadas
        ]
    };

    mostrarAlertas(datosTemporales);
});


/*
 * ISW-612: Estado de las protecciones de Windows.
 * Muestra los datos obtenidos por el script de PowerShell.
 * No realiza modificaciones en el sistema.
 */
function mostrarProtecciones(datos) {
    const contenedor = document.getElementById("estadoProtecciones");
    contenedor.replaceChildren();

    const protecciones = datos.protecciones;

    function crearTarjeta(nombre, estado, explicacion, detalle) {
        const tarjeta = document.createElement("div");

        const activo = estado === "activa" || estado === "activo";

        const desconocido = [
            "no_disponible",
            "desconocido",
            "configurado_no_en_ejecucion"
        ].includes(estado);

        tarjeta.className = activo
            ? "correcto"
            : desconocido ? "advertencia" : "alerta";

        const titulo = document.createElement("h3");
        titulo.textContent = nombre;

        const textoEstado = document.createElement("p");
        textoEstado.textContent =
            "Estado: " + String(estado ?? "No disponible");

        const descripcion = document.createElement("p");
        descripcion.textContent = explicacion;

        const informacion = document.createElement("p");
        informacion.textContent = detalle;

        tarjeta.append(
            titulo,
            textoEstado,
            descripcion,
            informacion
        );

        contenedor.appendChild(tarjeta);
    }

    const lsa = protecciones.lsa_protection ?? {};

    crearTarjeta(
        "LSA Protection",
        lsa.estado,
        "Ayuda a proteger el proceso de seguridad de Windows " +
        "contra determinadas formas de acceso no autorizado.",
        "Valor RunAsPPL: " +
        String(lsa.valor_runasppl ?? "No disponible") +
        ". Este valor fue consultado por PowerShell."
    );

    const credential = protecciones.credential_guard ?? {};

    crearTarjeta(
        "Credential Guard",
        credential.estado,
        "Utiliza mecanismos de aislamiento basados en " +
        "virtualizacion para proteger determinadas credenciales.",
        "El estado corresponde a la informacion registrada " +
        "durante la ejecucion del monitor."
    );

    const nota = document.createElement("p");
    nota.textContent =
        "Importante: estas verificaciones son informativas. " +
        "No garantizan por si solas que el equipo este protegido " +
        "contra todas las amenazas.";

    contenedor.appendChild(nota);
}


/*
 * ISW-612 - Exportacion de resultados.
 * Los archivos se generan localmente en el navegador.
 */

// Descargar el JSON cargado.
btnExportar.addEventListener("click", function () {
    if (!datosActuales) {
        mensaje.textContent = "Primero debes cargar un archivo JSON.";
        return;
    }

    const contenido = JSON.stringify(datosActuales, null, 2);

    const blob = new Blob([contenido], {
        type: "application/json;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = "reporte_memoria_ISW612.json";

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    URL.revokeObjectURL(url);
});

// Abrir la ventana para imprimir o guardar como PDF.
btnImprimir.addEventListener("click", function () {
    if (!datosActuales) {
        mensaje.textContent = "Primero debes cargar un archivo JSON.";
        return;
    }

    window.print();
});


/*
 * Tabla de procesos monitoreados.
 * Muestra la ultima medicion de cada PID.
 */
function mostrarTablaProcesos(datos) {
    const contenedor = document.getElementById("tablaProcesos");
    const buscador = document.getElementById("buscarProceso");

    const procesos = new Map();

    for (const muestra of datos.muestras) {
        const pid = Number(muestra.pid);
        const tiempo = Number(muestra.t);

        if (!Number.isFinite(pid) || !Number.isFinite(tiempo)) {
            continue;
        }

        const anterior = procesos.get(pid);

        if (!anterior || tiempo >= Number(anterior.t)) {
            procesos.set(pid, muestra);
        }
    }

    const registros = [...procesos.values()]
        .sort((a, b) =>
            Number(b.privado_mb) - Number(a.privado_mb)
        );

    const pidsAlerta = new Set(
        datos.alertas.map(a => Number(a.pid))
    );

    function actualizarTabla() {
        contenedor.replaceChildren();

        const textoBusqueda = buscador.value.toLowerCase().trim();

        const filtrados = registros.filter(proceso =>
            String(proceso.proceso ?? "")
                .toLowerCase()
                .includes(textoBusqueda) ||
            String(proceso.pid).includes(textoBusqueda)
        );

        if (filtrados.length === 0) {
            contenedor.textContent =
                "No se encontraron procesos con ese criterio.";
            return;
        }

        const tabla = document.createElement("table");
        tabla.className = "tabla-procesos";

        const encabezado = document.createElement("thead");
        const filaEncabezado = document.createElement("tr");

        [
            "Proceso", "PID", "Memoria privada (MB)",
            "Working set (MB)", "Estado"
        ].forEach(nombre => {
            const celda = document.createElement("th");
            celda.textContent = nombre;
            filaEncabezado.appendChild(celda);
        });

        encabezado.appendChild(filaEncabezado);
        tabla.appendChild(encabezado);

        const cuerpo = document.createElement("tbody");

        // Mostrar hasta 100 resultados para mantener la web ágil.
        filtrados.slice(0, 100).forEach(proceso => {
            const fila = document.createElement("tr");

            const alerta = pidsAlerta.has(Number(proceso.pid));

            if (alerta) {
                fila.className = "proceso-alerta";
            }

            const valores = [
                proceso.proceso,
                proceso.pid,
                Number(proceso.privado_mb).toFixed(1),
                Number(proceso.ws_mb).toFixed(1),
                alerta ? "Revisar alerta" : "Sin alerta registrada"
            ];

            valores.forEach(valor => {
                const celda = document.createElement("td");
                celda.textContent = String(valor);
                fila.appendChild(celda);
            });

            cuerpo.appendChild(fila);
        });

        tabla.appendChild(cuerpo);
        contenedor.appendChild(tabla);

        const nota = document.createElement("p");
        nota.textContent =
            "Mostrando " +
            Math.min(filtrados.length, 100) +
            " de " + filtrados.length +
            " procesos encontrados.";

        contenedor.appendChild(nota);
    }

    buscador.oninput = actualizarTabla;
    actualizarTabla();
}

document.getElementById("seleccionarProceso")
    .addEventListener("change", function () {
        if (datosActuales) {
            mostrarGrafico(datosActuales);
        }
    });
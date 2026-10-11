# Calculadora de Clasificación Clínica del Ojo Pequeño con finalidad quirúrgica

Aplicación web (PWA) de apoyo a la decisión quirúrgica, basada en el **algoritmo del manejo de cirugía de catarata en ojo pequeño del Dr. Fermín Silva Cayatopa (Clínica La Luz)**, con referencia a:

- Hoffman RS et al. *Cataract surgery in the small eye.* J Cataract Refract Surg. 2015;41:2565–2575.
- Yosar JC et al. *Cataract surgery in short eyes, including nanophthalmos.* Clin Ophthalmol. 2021;15:4543–4551.

> **Herramienta de apoyo clínico. La decisión final corresponde al cirujano.**
> No es un dispositivo de diagnóstico. El aviso se muestra en todas las pantallas y en el PDF.

## Qué hace

Para cada ojo (OD/OI) el oftalmólogo ingresa biometría, gonioscopía/UBM, hallazgos y retina. La app:

1. Da el **diagnóstico**: Tipo **I** MAR, **II** MPR, **III** MS, **IV** MC o **V** nanoftalmos. Si no hay tipo, devuelve **«No clasificable / zona gris»** con los 2 tipos más cercanos y los criterios en conflicto; nunca fuerza un resultado.
2. Explica **por qué**: criterios mayores y de apoyo, cumplidos ✓ y no cumplidos ✗, con el valor observado.
3. Muestra el **esquema del ojo** del tipo (segmentos cortos, esclera gruesa, efusión, cristalino, microcórnea).
4. Sugiere el **tratamiento** (preoperatorio + técnica) con un glosario de las abreviaturas.
5. Emite **alertas clínicas** configurables. Por ejemplo, avisa de rasgos de nanoftalmos cuando el ojo no cumple todos los mayores del Tipo V.
6. Incluye módulos complementarios: **riesgo de glaucoma maligno** (semáforo), **alerta facomórfica**, **fórmulas de LIO / piggyback** y **checklist preoperatorio**.
7. Advierte cuando una medida está **en el límite** de un umbral (± 0.05 mm).
8. **Compara OD/OI** y **exporta a PDF**.
9. Incluye la página **Evidencia**, que contrasta cada criterio con la literatura para el equipo médico (también disponible en [docs/VALIDACION_CLINICA.md](docs/VALIDACION_CLINICA.md)).

## Stack

React 18 · TypeScript · Vite 7 · Tailwind CSS 3 · componentes estilo shadcn/ui · React Hook Form + Zod · jsPDF + jspdf-autotable · vite-plugin-pwa (Workbox) · Vitest.

## Instalación

Requisitos: Node.js ≥ 20.

```bash
npm install
npm run dev              # http://localhost:5173
npm test                 # pruebas unitarias (Vitest)
npm run build            # typecheck + build de producción en dist/
npm run preview          # sirve dist/ (para probar la PWA y el modo sin conexión)
npm run docs:validacion  # regenera docs/VALIDACION_CLINICA.md desde evidencia.json
```

## Arquitectura

```
src/
├── config/
│   ├── rules.json          ← TODAS las reglas clínicas (editable por el médico)
│   ├── evidencia.json      ← revisión de la literatura (página «Evidencia» y docs/)
│   └── index.ts            ← carga y valida rules.json al iniciar
├── engine/                 ← lógica clínica pura: sin React, sin DOM, sin efectos
│   ├── types.ts
│   ├── configSchema.ts     ← validación Zod de rules.json
│   ├── criteria.ts         ← evaluación de un criterio + etiquetas legibles
│   ├── classifier.ts       ← motor: criterios mayores/apoyo, orden V→I, zona gris, alertas
│   ├── modules.ts          ← glaucoma maligno, facomórfico, LIO, checklist
│   ├── index.ts            ← evaluarOjo(): punto de entrada único
│   └── __tests__/
├── schemas/eyeInput.ts     ← validación del formulario (rangos y tipos)
├── state/                  ← sesión en memoria + historial opcional (localStorage)
├── pdf/exportPdf.ts        ← reporte PDF (carga diferida)
├── components/             ← UI (ui/ = primitivas estilo shadcn; result/ = tarjetas y esquema del ojo)
└── pages/                  ← Inicio, Evaluación, Resultado, Comparar, Acerca de, Evidencia
```

### Lógica del motor

1. Cada criterio tiene `"nivel": "mayor"` (obligatorio) o `"apoyo"` (suma al % de concordancia; es el valor por defecto).
2. Los tipos se recorren en `ordenEvaluacion` (**V → IV → III → II → I**), porque los rangos se superponen: un nanoftalmos también tiene LA < 21 mm, y lo que lo separa del MS es la esclera > 1.4 mm con efusión.
3. **Diagnóstico** = el primer tipo que cumple **todos** sus criterios mayores. Si otro tipo también los cumple, se informa como «también cumple».
4. Si ninguno cumple sus mayores, el resultado es **zona gris** y se muestran los `cercanosEnZonaGris` tipos más cercanos (por fracción de mayores cumplidos y luego por % de apoyo) con sus mayores en conflicto.
5. **Sin dato**: los campos opcionales vacíos (grosor del cristalino) no cuentan en el % de apoyo. Si un criterio mayor queda sin dato, no se cumple y se indica «sin dato».
6. **LA < media − 2 DE**: si se ingresan la LA media y la DE de referencia, el umbral es `media − 2·DE`; si no, se usa LA < 21 mm.

## Cómo editar las reglas (`src/config/rules.json`)

No hay umbrales escritos en el código. Después de editar:

1. `npm test`: valida el archivo y avisa si un cambio altera clasificaciones esperadas (hay que actualizar esas pruebas a propósito).
2. `npm run build` y desplegar.
3. Suba `version` y `fechaRevision`, que aparecen en el pie de página y en el PDF.

Si el archivo tiene un error (operador inexistente, valor mal escrito, tipo sin criterio mayor o ausente en `ordenEvaluacion`), **la app no arranca** y muestra el detalle.

### Tipos de criterio

| `op` | Uso | Ejemplo |
|---|---|---|
| `<` `<=` `>` `>=` | Umbral numérico | `{ "nivel": "mayor", "campo": "acd", "op": "<", "valor": 2.2 }` |
| `entre` | Rango con operador explícito en cada extremo | `{ "campo": "longitudAxial", "op": "entre", "min": 14.5, "max": 20.5, "opMin": ">=", "opMax": "<=" }` |
| `en` | Valor de una lista | `{ "campo": "angulo", "op": "en", "valores": ["estrecho", "cerrado"] }` |
| `es` | Sí / No | `{ "campo": "efusionCoroidea", "op": "es", "valor": true }` |
| `bajoDE` | LA < media − n DE (o valor de respaldo) | `{ "campo": "longitudAxial", "op": "bajoDE", "nDE": 2, "opComparacion": "<", "valorRespaldo": 21.0 }` |
| `iguales` | Dos campos de lista con el mismo valor | `{ "op": "iguales", "campos": ["campoA", "campoB"], "etiqueta": "…" }` |
| `cualquiera` | Basta con uno de los subcriterios | `{ "op": "cualquiera", "etiqueta": "Alteraciones retinianas", "criterios": [ … ] }` |

Opcionales en todos: `"nivel"` (`"mayor"` / `"apoyo"`), `"etiqueta"` (si se omite se genera a partir del criterio, así nunca queda desfasada del umbral) y `"peso"` (por defecto 1).

**Campos numéricos (mm):** `longitudAxial`, `acd`, `grosorCristalino`, `grosorEscleral`.
**Campos de lista:** `angulo` (`abierto` · `estrecho` · `deformado` · `cerrado`), `cuerpoCiliar` (`normal` · `anteriorizado`), `cristalino` (`normal` · `coloboma` · `intumescente`).
**Campos sí/no:** `efusionCoroidea`, `malformaciones`, `pupilaSinequiada`, `alteracionesRetinianas.{retinitisPigmentaria, foveosquisis, drusasNervioOptico, plieguesPapilomaculares, agujeroMacular, otra}`, `factoresRiesgo.{pseudoexfoliacion, cirugiaFiltrantePrevia, cirugiaCatarataPrevia, cierreAngularAgudoAdelfo, antecedenteFamiliarGlaucoma}`.

### Ejemplos frecuentes

**LA del MAR > 20.5 mm (Hoffman 2015)** en lugar del umbral operativo > 22.5 mm por experiencia clínica del Dr. Fermín (tipo `I`, primer criterio):
```json
{ "nivel": "mayor", "campo": "longitudAxial", "op": ">", "valor": 20.5 }
```

**Efusión como criterio de apoyo en el nanoftalmos** (lo que sugiere la literatura), en el tipo `V`:
```json
{ "nivel": "apoyo", "campo": "efusionCoroidea", "op": "es", "valor": true }
```

**Esclera del nanoftalmos > 1.7 mm:** cambie `"valor": 1.4` por `1.7` en el criterio mayor del tipo `V` (y en la alerta `rasgos-nanoftalmos`).

**Completar el preoperatorio del MPR:** llene `"preoperatorio"` del tipo `II` y elimine `"pendiente"`.

**Otros:** `ordenEvaluacion`, `cercanosEnZonaGris`, `alertasClinicas` (criterios + `exceptoTipos` + `reemplazaTecnica`, que sustituye la técnica del tipo asignado, como la excepción de vitrectomía central por PP), `glaucomaMaligno.umbrales`, `alertaFacomorfica`, `lio`, `checklistPreoperatorio` (con `siAlerta` / `salvoAlerta` para ítems que dependen de una alerta), `glosario`, `esquema` de cada tipo (dibujo) y `supuestosPendientes` (lista mostrada en «Acerca de»).

## Validación con la literatura

La página **Evidencia** y [docs/VALIDACION_CLINICA.md](docs/VALIDACION_CLINICA.md) comparan cada criterio y conducta con Hoffman 2015, Yosar 2021, Auffarth 2000 (definición del MAR), Carricondo 2018 (nanoftalmos), la cohorte de 300 ojos pequeños de Hammer et al. (2025), series de microftalmos posterior y estudios de fórmulas de LIO y de manitol. La cohorte reciente incluye MAR, pero al ser una muestra quirúrgica seleccionada no establece valores poblacionales normales ni valida los límites locales. El Dr. Fermín confirmó que los valores de LA > 22.6 mm como referencia general y > 22.5 mm para el criterio MAR reflejan su experiencia y práctica clínica con los tamaños de ojos que observa en pacientes en Perú; se documentan como experiencia local, no como rango normativo poblacional. Resultado: 11 puntos concuerdan, 8 parcialmente, 4 difieren y 1 sin evidencia. Los puntos que difieren necesitan decisión del autor:

1. **Efusión como criterio mayor del Tipo V:** la literatura la describe como propensión, no como requisito. Con la regla actual, un nanoftalmos sin efusión queda en zona gris (la app lo advierte con una alerta).
2. **Esclera del nanoftalmos:** > 1.4 mm en la tabla frente a > 1.7 mm (esclera + coroides) en la literatura.
3. **CA 2–2.5 mm en el MS:** la literatura describe CA normal en el microftalmo simple.
4. **Esclera/efusión del MPR:** la literatura describe engrosamiento esclerocoroideo.

El contenido está en `src/config/evidencia.json`. Tras editarlo, ejecute `npm run docs:validacion`.

## Pruebas

```bash
npm test
```

111 pruebas en `src/engine/__tests__` y `src/schemas/__tests__`:

- **3 o más casos por tipo** (I–V).
- **Límites exactos**: LA 20 / 21 / 22.5, CA 2.0 / 2.5 y esclera 1.4.
- **Orden V → IV → III → II → I** (un nanoftalmos con malformación también cumple los mayores del MC) y orden configurable.
- **LA < media − 2 DE** con y sin referencia.
- **Zona gris** (2 más cercanos, conflictos con su tipo) y datos faltantes.
- **Alertas clínicas** (incluida la excepción de vitrectomía central por PP), glaucoma maligno, facomórfica, LIO y checklist.
- **Configurabilidad** y validación de `rules.json`, integridad de las citas en `evidencia.json` y validación del formulario.

## Despliegue

Es un sitio estático (`dist/`). Incluye la configuración de reescritura SPA y encabezados de seguridad.

**Vercel:** importe el repositorio; se detecta Vite (build `npm run build`, salida `dist`). `vercel.json` redirige las rutas a `index.html`.

**Netlify:** importe el repositorio; `netlify.toml` define el build y `public/_redirects` la reescritura SPA.

**Servidor propio / intranet:** sirva `dist/` reescribiendo las rutas desconocidas a `/index.html`. La PWA requiere HTTPS (o `localhost`).

### Uso sin conexión (PWA)

Tras la primera visita, el service worker guarda la app completa (incluidas fuentes y generador de PDF). Funciona sin conexión y se puede instalar desde el navegador. Solo los enlaces externos (calculadoras de LIO, fuentes bibliográficas) requieren internet.

## Privacidad

- Sin backend: **ningún dato sale del dispositivo**. No se piden datos de identificación del paciente.
- La evaluación en curso vive solo en memoria.
- El **historial es opcional** (casilla en el último paso), se guarda en `localStorage` solo con medidas y fecha, y puede borrarse desde Inicio. Las entradas de versiones anteriores con otro formato se descartan automáticamente.

## Accesibilidad

Pensada para WCAG 2.1 AA: etiquetas asociadas, errores anunciados (`role="alert"`, `aria-invalid`), foco en el encabezado de cada paso y en el primer campo con error, «Saltar al contenido», semáforo y ✓/✗ con texto (no solo color), esquema del ojo con descripción textual, controles táctiles ≥ 44 px, contraste de la paleta institucional (granate `#b0191a` sobre blanco ≈ 7:1) y respeto de `prefers-reduced-motion`.

## Identidad visual

Paleta y tipografía según `LINEA_GRAFICA.md` de Clínica La Luz: granate `#b0191a`, gris `#5f6263`, fondo `#f5f7fa`, **Poppins** local (licencia SIL OFL), tarjetas `rounded-3xl`.

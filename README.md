# Calculadora de clasificación clínica con finalidad quirúrgica del ojo pequeño

Aplicación web (PWA) basada en el **algoritmo de manejo de cirugía de catarata en ojo pequeño del Dr. Fermín Silva Cayatopa (Clínica La Luz)**.

> **Herramienta de apoyo clínico. La decisión final corresponde al cirujano.** No es un dispositivo de diagnóstico.

## Qué hace

El oftalmólogo llena, por ojo (OD/OI), solo las variables de la tabla de clasificación:

| Variable | Dato |
|---|---|
| Longitud axial | mm |
| Cámara anterior | mm |
| Ángulo | Abierto · Estrecho/ocluible · Deformado · Cerrado/ocluible |
| Cristalino (LT) | mm (con la LA se calcula el **índice LT/AL**) |
| Malformaciones anatómicas | No · Sí (colobomas y disgenesias) |
| WTW (blanco-blanco) | mm |

La app devuelve:

- **Tipo**: I MAR · II MPR · III MS · IV MC · V nanoftalmos, o **zona gris** si ninguno cumple sus criterios mayores. Nunca fuerza un resultado.
- **Criterios** cumplidos y no cumplidos, con el valor observado, y debajo el **tratamiento** del tipo (preoperatorio y técnica).
- **Esquema del ojo**, **alertas clínicas**, **riesgo de glaucoma maligno**, **fórmulas de LIO / piggyback** y **checklist**.
- **Comparación OD/OI** y **PDF**.

## Criterios por tipo

Tabla del Dr. Fermín Silva. **Todas las filas son criterios mayores** (obligatorios para asignar el tipo); «variable» = no se evalúa.

| Característica | I MAR | II MPR | III MS | IV MC | V Nanoftalmos |
|---|---|---|---|---|---|
| Longitud axial | > 22.5 | < 20 | 20 ≤ LA < 21 (−2 DE) | < 21 (−2 DE) | < 20 |
| Cámara anterior | < 2.5 | > 2.5 | 2.0–2.5 | variable | < 2.0 |
| Ángulo | estrecho/ocluible | abierto | estrecho o abierto | deformado | cerrado/ocluible |
| Índice LT/AL | < 0.22 | < 0.20 | 0.18–0.20 | variable | > 0.22 |
| Malformaciones | No | No | No | Sí (colobomas y disgenesias) | No |
| WTW | < 11.0 | > 11.0 | < 11.0 | < 11.0 | < 11.0 |

Medidas en mm; el índice LT/AL es adimensional (LT ÷ LA). El tratamiento es el del tipo, sin técnicas añadidas por otras variables. El LT también se usa en la alerta facomórfica.

## Cómo clasifica

1. Los tipos se evalúan en orden **V → IV → III → II → I**. El diagnóstico es el primero que cumple todos sus mayores.
2. Si ninguno los cumple: **zona gris**, con los 2 tipos más cercanos y los criterios en conflicto.
3. Se avisa cuando una medida está a ≤ 0.05 mm de un umbral (≤ 0.005 en el índice LT/AL).
4. El «−2 DE» de la LA (tipos III y IV) se aplica como umbral fijo de **21 mm**.
5. **Alerta facomórfica:** CA < 2.5 mm con LT > 4.5 mm.
6. **Excepción del Tipo I:** con LA > 22.5, CA < 2.0 y LT > 5 mm, la técnica pasa a vitrectomía central por PP + rexis con Utrata + facochop.

### Limitaciones conocidas

- El **riesgo de glaucoma maligno** se calcula solo con las variables de la tabla (LA, CA y ángulo).

## Uso

Requiere Node.js ≥ 20.

```bash
npm install
npm run dev              # http://localhost:5173
npm test                 # 119 pruebas (Vitest)
npm run build            # typecheck + build en dist/
npm run docs:validacion  # regenera docs/VALIDACION_CLINICA.md
```

## Editar las reglas

Todas las reglas están en [`src/config/rules.json`](src/config/rules.json); no hay umbrales en el código.

1. Edite el archivo. Si tiene un error, la app no arranca y muestra el detalle.
2. Ejecute `npm test`. Si un cambio altera clasificaciones esperadas, actualice esas pruebas a propósito.
3. Suba `version` y `fechaRevision` (aparecen en el pie de página y en el PDF).

Operadores: `<` `<=` `>` `>=` · `entre` · `en` (lista) · `es` (sí/no) · `bajoDE` · `iguales` · `cualquiera`. Ejemplo:

```json
{ "nivel": "mayor", "campo": "acd", "op": "<", "valor": 2.5 }
```

Campos:

- **Números:** `longitudAxial`, `acd`, `grosorCristalino` (LT), `wtw`, `indiceLTAL` (calculado: LT / LA).
- **Listas:** `angulo`.
- **Sí/No:** `malformaciones`.

## Validación con la literatura

Está en la página **Evidencia** y en [docs/VALIDACION_CLINICA.md](docs/VALIDACION_CLINICA.md): 12 puntos concuerdan, 6 parcialmente, 1 difiere y 2 sin evidencia. Pendiente del autor: la CA 2–2.5 mm en el MS y el respaldo bibliográfico de los cortes del índice LT/AL.

## Estructura

```
src/
├── config/     rules.json (reglas) · evidencia.json (literatura)
├── engine/     lógica clínica pura (sin React)
├── schemas/    validación del formulario
├── pages/      Inicio, Evaluación, Resultado, Comparar, Acerca de, Evidencia
├── pdf/        reporte PDF
└── state/      sesión en memoria + historial opcional
```

## Despliegue y privacidad

- Sitio estático (`dist/`), listo para Vercel (`vercel.json`) o Netlify (`netlify.toml`). Funciona sin conexión tras la primera visita (requiere HTTPS).
- Sin backend: **ningún dato sale del dispositivo** y no se piden datos del paciente.
- El historial es opcional y solo guarda las medidas y la fecha en `localStorage`.

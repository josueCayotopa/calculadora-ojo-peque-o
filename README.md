# Calculadora de clasificación clínica con finalidad quirúrgica del ojo pequeño

Aplicación web (PWA) basada en el **algoritmo de manejo de cirugía de catarata en ojo pequeño del Dr. Fermín Silva Cayatopa (Clínica La Luz)**.

> **Herramienta de apoyo clínico. La decisión final corresponde al cirujano.** No es un dispositivo de diagnóstico.

## Qué hace

El oftalmólogo llena, por ojo (OD/OI), una lista de 10 variables:

| Variable | Dato |
|---|---|
| Longitud axial | mm |
| Cámara anterior | mm |
| Ángulo | Abierto · Estrecho/ocluible · Deformado · Cerrado/ocluible |
| Grosor escleral – polo posterior (PP) | mm |
| Efusión coroidea | No · Sí |
| Cuerpo ciliar | Normal · Anteriorizado |
| Cristalino (LT) | mm |
| Malformaciones anatómicas | No · Sí (colobomas y disgenesias) |
| Refracción *(opcional)* | Hipermetropía leve · Hipermetropía alta · Hipermetropía moderada |
| Alteraciones asociadas *(opcional, sin marcar = No)* | Leves · Retinitis pigmentaria · Foveosquisis · Drusas del NO · Pliegues papilomaculares · Agujero macular · Colobomas · Otra alteración retiniana · Intumescencia |

La app devuelve:

- **Tipo**: I MAR · II MPR · III MS · IV MC · V nanoftalmos, o **zona gris** si ninguno cumple sus criterios mayores. Nunca fuerza un resultado.
- **Criterios** cumplidos y no cumplidos, con el valor observado, y debajo el **tratamiento** del tipo (preoperatorio y técnica).
- **Esquema del ojo**, **alertas clínicas**, **riesgo de glaucoma maligno**, **fórmulas de LIO / piggyback** y **checklist**.
- **Comparación OD/OI** y **PDF**.

## Criterios por tipo

**Mayor** = obligatorio para asignar el tipo. **Apoyo** = suma al % de concordancia, no decide.

| Tipo | Mayores | Apoyo |
|---|---|---|
| **I** MAR | LA > 22.5 · CA < 2.5 · ángulo estrecho/ocluible | esclera PP < 1.4 · sin efusión · cuerpo ciliar normal · sin malformaciones |
| **II** MPR | CA > 2.5 · LA < 22.5 · ángulo estrecho/ocluible | esclera PP < 1.4 · sin efusión · cuerpo ciliar normal · sin malformaciones · alguna alteración retiniana |
| **III** MS | 20 ≤ LA < 21 · 2.0 ≤ CA ≤ 2.5 · sin malformaciones · ángulo estrecho o abierto | esclera PP < 1.4 · sin efusión · cuerpo ciliar normal |
| **IV** MC | malformaciones · ángulo deformado | LA < 21 · 2.0 ≤ CA ≤ 2.5 · esclera PP < 1.4 · efusión (uveal) · alteración retiniana |
| **V** Nanoftalmos | LA < 20 · esclera PP > 1.4 · efusión · ángulo cerrado/ocluible | LA ≥ 14.5 · CA < 2.0 · cuerpo ciliar anteriorizado · sin malformaciones · intumescencia |

Medidas en mm. No influyen en la clasificación: **cristalino (LT)**, **refracción** y las alteraciones asociadas **leves** y **colobomas**. El LT se usa en la alerta facomórfica.

## Cómo clasifica

1. Los tipos se evalúan en orden **V → IV → III → II → I**. El diagnóstico es el primero que cumple todos sus mayores.
2. Si ninguno los cumple: **zona gris**, con los 2 tipos más cercanos y los criterios en conflicto.
3. Se avisa cuando una medida está a ≤ 0.05 mm de un umbral.
4. «LA < media − 2 DE» usa siempre el umbral fijo de **21 mm**.
5. **Alerta facomórfica:** CA < 2.5 mm con LT > 4.5 mm o intumescencia.
6. **Excepción del Tipo I:** con LA > 22.5, CA < 2.0 y LT > 5 mm, la técnica pasa a vitrectomía central por PP + rexis con Utrata + facochop.

### Limitaciones conocidas

- El **riesgo de glaucoma maligno** se calcula solo con las variables del formulario; pseudoexfoliación y cirugía previa cuentan siempre como «No».

## Uso

Requiere Node.js ≥ 20.

```bash
npm install
npm run dev              # http://localhost:5173
npm test                 # 110 pruebas (Vitest)
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

- **Números:** `longitudAxial`, `acd`, `grosorEscleral` (polo posterior), `grosorCristalino` (LT).
- **Listas:** `angulo`, `cuerpoCiliar`, `refraccion`.
- **Sí/No:** `efusionCoroidea`, `malformaciones`, `alteracionesRetinianas.*`, `alteracionesAsociadas.*`.

La fila de texto `tabla` de cada tipo (refracción, alteraciones asociadas) solo se muestra en «Acerca de».

## Validación con la literatura

Está en la página **Evidencia** y en [docs/VALIDACION_CLINICA.md](docs/VALIDACION_CLINICA.md): 11 puntos concuerdan, 8 parcialmente, 4 difieren y 1 sin evidencia. El autor debe decidir sobre los 4 que difieren:

1. Efusión como criterio mayor del tipo V.
2. Esclera del nanoftalmos: > 1.4 mm frente a > 1.7 mm.
3. CA 2–2.5 mm en el MS.
4. Esclera/efusión del MPR.

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

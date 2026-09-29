// Genera docs/VALIDACION_CLINICA.md a partir de src/config/evidencia.json y src/config/rules.json,
// para que el documento para médicos y la página «Evidencia» de la app nunca se desincronicen.
// Uso: npm run docs:validacion
import fs from 'node:fs';

const ev = JSON.parse(fs.readFileSync(new URL('../src/config/evidencia.json', import.meta.url), 'utf8'));
const rules = JSON.parse(fs.readFileSync(new URL('../src/config/rules.json', import.meta.url), 'utf8'));

const ESTADO = { concuerda: '✅ Concuerda', parcial: '🟡 Parcial', difiere: '🔴 Difiere', sin_evidencia: '⚪ Sin evidencia' };
const num = new Map(ev.fuentes.map((f, i) => [f.id, i + 1]));
const esc = (s) => String(s).replace(/\|/g, '\\|');
const cuenta = (k) => ev.comparaciones.filter((c) => c.concordancia === k).length;

let md = `# Validación clínica — Clasificación del Ojo Pequeño

> Documento generado automáticamente desde \`src/config/evidencia.json\` (revisión ${ev.fechaRevision}) para las reglas v${rules.version}.
> **Herramienta de apoyo clínico. La decisión final corresponde al cirujano.**

## Metodología

${ev.metodologia}

## Resumen

| Estado | N.º de puntos |
|---|---|
| ${ESTADO.concuerda} | ${cuenta('concuerda')} |
| ${ESTADO.parcial} | ${cuenta('parcial')} |
| ${ESTADO.difiere} | ${cuenta('difiere')} |
| ${ESTADO.sin_evidencia} | ${cuenta('sin_evidencia')} |

### Puntos que requieren decisión del Dr. Silva

${ev.comparaciones
  .filter((c) => c.concordancia === 'difiere')
  .map((c) => `- **${c.tema}.** ${c.comentario ?? ''}`)
  .join('\n')}

## Comparación detallada

| Tema | Tabla del Dr. Silva | Literatura | Estado | Implicancia |
|---|---|---|---|---|
${ev.comparaciones
  .map(
    (c) =>
      `| ${esc(c.tema)} | ${esc(c.silva)} | ${esc(c.literatura)} ${c.fuentes.map((f) => `[${num.get(f)}]`).join('')} | ${
        ESTADO[c.concordancia]
      } | ${esc(c.comentario ?? '')} |`,
  )
  .join('\n')}

## Supuestos pendientes en la configuración

${rules.supuestosPendientes.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Fuentes

${ev.fuentes.map((f, i) => `${i + 1}. ${f.cita} *(${f.tipo})*. ${f.url}`).join('\n')}
`;

fs.mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../docs/VALIDACION_CLINICA.md', import.meta.url), md);
console.log('docs/VALIDACION_CLINICA.md generado');

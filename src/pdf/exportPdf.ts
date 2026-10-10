import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { EvaluacionCompleta, EyeInput } from '@/engine/types';
import { NOMBRE_CAMPO, NOMBRE_VALOR, formatNumero } from '@/engine';
import { clinicalConfig, terminosUsados } from '@/config';
import { nombreTipo, resumenResultado } from '@/state/EvaluationContext';

const AVISO = 'Herramienta de apoyo clínico. La decisión final corresponde al cirujano.';
const GRANATE: [number, number, number] = [176, 25, 26];
const GRIS: [number, number, number] = [95, 98, 99];
const TINTA: [number, number, number] = [31, 35, 36];
const MARGEN = 15;

/** Normaliza símbolos que podrían faltar en la fuente del PDF. */
function t(s: string): string {
  return s.replace(/≤/g, '<=').replace(/≥/g, '>=');
}

async function fuenteBase64(url: string): Promise<string> {
  const buf = await (await fetch(url)).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/** Registra Poppins (disponible sin conexión gracias al service worker). Si falla, usa Helvetica. */
async function cargarPoppins(doc: jsPDF): Promise<string> {
  try {
    const [regular, bold] = await Promise.all([
      fuenteBase64('/fonts/Poppins-Regular.ttf'),
      fuenteBase64('/fonts/Poppins-Bold.ttf'),
    ]);
    doc.addFileToVFS('Poppins-Regular.ttf', regular);
    doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');
    doc.addFileToVFS('Poppins-Bold.ttf', bold);
    doc.addFont('Poppins-Bold.ttf', 'Poppins', 'bold');
    return 'Poppins';
  } catch {
    return 'helvetica';
  }
}

/** Nombres de las casillas marcadas de un grupo (retina, factores de riesgo). */
function marcados(grupo: string, obj: object): string {
  const nombres = Object.entries(obj)
    .filter(([, v]) => v === true)
    .map(([k]) => NOMBRE_CAMPO[`${grupo}.${k}` as keyof typeof NOMBRE_CAMPO] ?? k);
  return nombres.length ? nombres.join(', ') : 'Ninguno';
}

const mmOpc = (n: number | null | undefined) => (n == null ? 'No ingresado' : `${formatNumero(n)} mm`);
const listaOpc = (v: string | null | undefined) => (v ? NOMBRE_VALOR[v] ?? v : 'Sin dato');

function datosIngresados(e: EyeInput): [string, string][] {
  return [
    ['Longitud axial (LA)', `${formatNumero(e.longitudAxial)} mm`],
    [
      'LA de referencia (media ± DE)',
      e.laMediaReferencia != null && e.laDEReferencia != null
        ? `${formatNumero(e.laMediaReferencia)} ± ${formatNumero(e.laDEReferencia)} mm`
        : 'No ingresada (se usa LA < 21 mm)',
    ],
    ['Cámara anterior (CA)', `${formatNumero(e.acd)} mm`],
    ['Diámetro blanco-blanco (W-W)', `${formatNumero(e.blancoBlanco)} mm`],
    ['Grosor del cristalino', mmOpc(e.grosorCristalino)],
    ['Segmento anterior / posterior', `${listaOpc(e.segmentoAnterior)} / ${listaOpc(e.segmentoPosterior)}`],
    ['Refracción', listaOpc(e.refraccion)],
    ['Alteraciones retinianas', marcados('alteracionesRetinianas', e.alteracionesRetinianas)],
    ['Ángulo (gonioscopía)', NOMBRE_VALOR[e.angulo]],
    ['Grosor escleral', `${formatNumero(e.grosorEscleral)} mm`],
    ['Efusión coroidea', e.efusionCoroidea ? 'Sí' : 'No'],
    ['Cuerpo ciliar (UBM)', NOMBRE_VALOR[e.cuerpoCiliar]],
    ['Cristalino', NOMBRE_VALOR[e.cristalino]],
    ['Córnea', NOMBRE_VALOR[e.cornea]],
    ['Malformaciones (coloboma/disgenesia)', e.malformaciones ? 'Sí' : 'No'],
    ['Potencia de LIO calculada', e.potenciaLio != null ? `${formatNumero(e.potenciaLio)} D` : 'No ingresada'],
    ['Otros factores de riesgo', marcados('factoresRiesgo', e.factoresRiesgo)],
  ];
}

export async function exportarPdf(evaluaciones: EvaluacionCompleta[]): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const fuente = await cargarPoppins(doc);
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const util = ancho - 2 * MARGEN;
  const fecha = new Date();
  let y = 0;

  const finalY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  function asegurarEspacio(mm: number) {
    if (y + mm > alto - 20) {
      doc.addPage();
      y = MARGEN;
    }
  }

  function titulo(texto: string) {
    asegurarEspacio(14);
    y += 4;
    doc.setFont(fuente, 'bold').setFontSize(12).setTextColor(...GRANATE);
    doc.text(t(texto), MARGEN, y);
    y += 2;
    doc.setDrawColor(...GRANATE).setLineWidth(0.4).line(MARGEN, y, MARGEN + 20, y);
    y += 5;
  }

  function parrafo(texto: string, opts: { color?: [number, number, number]; bold?: boolean; size?: number } = {}) {
    doc.setFont(fuente, opts.bold ? 'bold' : 'normal').setFontSize(opts.size ?? 9.5).setTextColor(...(opts.color ?? TINTA));
    const lineas = doc.splitTextToSize(t(texto), util);
    const h = lineas.length * (opts.size ?? 9.5) * 0.45;
    asegurarEspacio(h + 2);
    doc.text(lineas, MARGEN, y + 3);
    y += h + 2;
  }

  function tabla(head: string[] | null, body: string[][], columnStyles: Record<number, object> = {}, filaDestacada?: number) {
    autoTable(doc, {
      startY: y,
      head: head ? [head.map(t)] : undefined,
      body: body.map((r) => r.map(t)),
      margin: { left: MARGEN, right: MARGEN, bottom: 20 },
      styles: { font: fuente, fontSize: 9, cellPadding: 1.8, textColor: TINTA, lineColor: [230, 230, 230], lineWidth: 0.2 },
      headStyles: { fillColor: GRANATE, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles,
      didParseCell: (d) => {
        if (d.section === 'body' && d.row.index === filaDestacada) {
          d.cell.styles.fillColor = [253, 242, 242];
          d.cell.styles.textColor = GRANATE;
          d.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = finalY() + 3;
  }

  function encabezado(e: EvaluacionCompleta) {
    doc.setFillColor(...GRANATE).rect(0, 0, ancho, 26, 'F');
    doc.setTextColor(255).setFont(fuente, 'bold').setFontSize(9).text('CLÍNICA LA LUZ', MARGEN, 9);
    doc.setFontSize(14).text('Clasificación Clínica del Ojo Pequeño', MARGEN, 16);
    doc.setFont(fuente, 'normal').setFontSize(9);
    doc.text(
      `${e.entrada.ojo === 'OD' ? 'Ojo derecho (OD)' : 'Ojo izquierdo (OI)'} · ${fecha.toLocaleString('es-PE')}`,
      MARGEN,
      22,
    );
    y = 32;
    doc.setFillColor(253, 242, 242).setDrawColor(...GRANATE).setLineWidth(0.3);
    doc.roundedRect(MARGEN, y, util, 9, 2, 2, 'FD');
    doc.setTextColor(...GRANATE).setFont(fuente, 'bold').setFontSize(9.5).text(AVISO, MARGEN + 3, y + 5.8);
    y += 13;
  }

  evaluaciones.forEach((e, idx) => {
    if (idx > 0) doc.addPage();
    encabezado(e);
    const c = e.clasificacion;

    titulo('Diagnóstico');
    parrafo(resumenResultado(e), { bold: true, size: 13, color: c.estado === 'clasificado' ? GRANATE : [146, 64, 14] });
    if (c.estado !== 'clasificado') {
      parrafo('Ningún tipo cumple todos sus criterios mayores. No se fuerza un diagnóstico.');
      parrafo(
        `Criterios mayores en conflicto: ${c.conflictos
          .map((k) => `Tipo ${k.tipo}: ${k.etiqueta} (${k.sinDato ? 'sin dato' : `observado: ${k.observado}`})`)
          .join('; ')}`,
      );
    }
    c.alertas.forEach((a) => parrafo(`${a.titulo}: ${a.mensaje}`, { color: [153, 27, 27] }));
    for (const tipo of c.masCercanos) {
      parrafo(
        `Tipo ${tipo.romano} · ${nombreTipo(tipo)}: mayores ${tipo.mayores.cumplidos}/${tipo.mayores.total}, apoyo ${
          tipo.apoyo.cumplidos
        }/${tipo.apoyo.total} (${Math.round(tipo.apoyo.porcentaje * 100)} %)`,
        { color: GRIS },
      );
      tabla(
        ['Criterio', 'Nivel', 'Observado', 'Cumple'],
        tipo.criterios.map((k) => [
          k.etiqueta + (k.enLimite ? ' (valor en el límite)' : ''),
          k.nivel === 'mayor' ? 'Mayor' : 'Apoyo',
          k.observado,
          k.sinDato ? 'Sin dato' : k.cumple ? 'Sí' : 'No',
        ]),
        { 1: { cellWidth: 16 }, 2: { cellWidth: 32 }, 3: { halign: 'center', cellWidth: 18 } },
      );
    }
    if (c.tambienCumplen.length) {
      parrafo(
        `También cumple los criterios mayores de: ${c.tambienCumplen.map((t) => `Tipo ${t.romano}`).join(', ')} (orden de evaluación ${clinicalConfig.ordenEvaluacion.join(' → ')}).`,
        { color: GRIS },
      );
    }
    if (c.advertenciasLimite.length) {
      parrafo(
        `Valores en el límite (≤ ${clinicalConfig.toleranciaLimiteMm} mm de un umbral): ${c.advertenciasLimite
          .map((a) => `${a.medida} = ${a.observado} (umbral: ${a.criterios.join('; ')})`)
          .join(' · ')}. Considere repetir la medición.`,
        { color: [146, 64, 14] },
      );
    }

    titulo('Datos ingresados');
    tabla(null, datosIngresados(e.entrada), { 0: { fontStyle: 'bold', cellWidth: 75 } });

    const tipoPlan = c.tipo ?? c.masCercanos[0];
    titulo(
      c.estado === 'clasificado'
        ? 'Tratamiento sugerido'
        : `Tratamiento del tipo más cercano (Tipo ${tipoPlan.romano}) — solo referencial`,
    );
    parrafo(`Preoperatorio: ${tipoPlan.preoperatorio.join('; ') || '—'}`);
    parrafo(`Técnica quirúrgica: ${tipoPlan.tecnica.join(' + ')}`, { bold: true });
    if (tipoPlan.pendiente) parrafo(tipoPlan.pendiente, { color: [146, 64, 14] });
    const tiposCfg = clinicalConfig.tipos;
    tabla(
      ['Tipo', 'Tratamiento'],
      tiposCfg.map((t) => [
        `Tipo ${t.romano} · ${t.nombre}${t.id === tipoPlan.id ? (c.estado === 'clasificado' ? ' (resultado)' : ' (más cercano)') : ''}`,
        [...t.preoperatorio, ...t.tecnica].join(' · '),
      ]),
      { 0: { cellWidth: 70 } },
      tiposCfg.findIndex((t) => t.id === tipoPlan.id),
    );
    const glosario = terminosUsados(tiposCfg.flatMap((t) => [...t.preoperatorio, ...t.tecnica]));
    if (glosario.length) parrafo(glosario.map((g) => `${g.termino}: ${g.definicion}`).join(' · '), { color: GRIS, size: 8.5 });

    titulo('Riesgo de glaucoma maligno');
    const g = e.glaucomaMaligno;
    parrafo(`Nivel: ${g.nivel.toUpperCase()} (${g.presentes} de ${g.total} factores)`, {
      bold: true,
      color: g.nivel === 'alto' ? [153, 27, 27] : g.nivel === 'moderado' ? [146, 64, 14] : [22, 101, 52],
    });
    const presentes = g.factores.filter((f) => f.presente).map((f) => f.etiqueta);
    parrafo(`Factores presentes: ${presentes.length ? presentes.join('; ') : 'ninguno'}`);

    titulo('Alertas');
    const alertas: string[] = [];
    if (e.facomorfico.activa) alertas.push(`Facomórfica: ${e.facomorfico.mensaje}`);
    if (e.lio.piggyback.activa) alertas.push(`Piggyback: ${e.lio.piggyback.motivo} ${e.lio.piggyback.mensaje}`);
    if (alertas.length === 0) alertas.push('Sin alertas adicionales.');
    alertas.forEach((a) => parrafo(`• ${a}`));

    titulo('Cálculo de LIO');
    parrafo(e.lio.biometria);
    e.lio.formulas.forEach((f) => parrafo(`• ${f.nombre}: ${f.url}`));

    titulo('Preparación preoperatoria');
    e.checklist.forEach((i) => parrafo(`[  ] ${i.texto}${i.referencial ? ' (referencial)' : ''}`));
  });

  titulo('Referencias');
  clinicalConfig.referencias.forEach((r, i) => parrafo(`${i + 1}. ${r.cita}`, { color: GRIS, size: 8.5 }));

  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFont(fuente, 'normal').setFontSize(7.5).setTextColor(...GRIS);
    doc.text(AVISO, MARGEN, alto - 10);
    doc.text(
      `Reglas v${clinicalConfig.version} (${clinicalConfig.fechaRevision}) · Página ${p} de ${paginas}`,
      ancho - MARGEN,
      alto - 10,
      { align: 'right' },
    );
  }

  const ojos = evaluaciones.map((e) => e.entrada.ojo).join('-');
  doc.save(`ojo-pequeno_${ojos}_${fecha.toISOString().slice(0, 10)}.pdf`);
}

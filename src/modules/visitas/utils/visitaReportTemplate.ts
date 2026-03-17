// ─────────────────────────────────────────────────────────────────────────────
//  visitaReportTemplate.ts
//  Generates a self-contained HTML string for A4 PDF rendering via Puppeteer.
// ─────────────────────────────────────────────────────────────────────────────

export interface TicketAsociadoData {
  numero: number;
  codigo: string;
  diagnostico: string;
  solucion: string;
  recomendacion: string;
  /** http/https absolute URLs fetched by Puppeteer on the backend */
  imagenesUrls: string[];
}

export interface VisitaReportData {
  empresaNombre: string;
  sedeNombre: string;
  tipoVisita: string;
  fechaVisita: string;
  horaProgramada?: string;
  tecnicoEncargado: string;
  otrosTecnicos: string;   // comma-separated, empty string when none
  totalTecnicos: number;
  tieneTicket: boolean;
  ticketCodigo?: string;
  activoNombre?: string;
  usuarioTicket?: string;
  cuentaComoVisita: boolean;
  huboCambioComponente: boolean;
  diagnostico: string;
  solucion: string;
  recomendacion: string;
  /** Array of data: URIs (converted from File on the frontend before sending) */
  cierreImagenes: string[];
  ticketsAsociados: TicketAsociadoData[];
  /** data: URI of the logo, embedded so no external fetch needed */
  logoDataUri?: string;
  fechaGeneracion: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const esc = (s: string): string =>
  String(s ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const badge = (value: boolean): string =>
  value
    ? `<span class="badge badge-yes">✓ SÍ</span>`
    : `<span class="badge badge-no">✗ NO</span>`;

const infoRow = (label: string, value: string, full = false): string => `
  <div class="info-cell${full ? ' full' : ''}">
    <div class="info-label">${esc(label)}</div>
    <div class="info-value">${esc(value)}</div>
  </div>`;

const fieldBlock = (label: string, text: string): string => `
  <div class="field-block">
    <div class="field-label">${esc(label)}</div>
    <div class="field-content">${esc(text || 'No especificado.')}</div>
  </div>`;

const imagesGrid = (images: string[], altPrefix = 'Imagen'): string => {
  if (!images.length)
    return `<p class="no-images">No se adjuntaron fotografías.</p>`;
  return `
  <div class="images-grid">
    ${images
      .slice(0, 6)
      .map(
        (src, i) => `
      <div class="image-item">
        <img src="${src}" alt="${altPrefix} ${i + 1}" loading="eager" />
      </div>`,
      )
      .join('')}
  </div>`;
};

/** Small header printed at the top of every page */
const pageHeader = (logoDataUri?: string): string => `
  <div class="header">
    <div class="header-left">
      ${logoDataUri
        ? `<img class="header-logo" src="${logoDataUri}" alt="Logo" />`
        : `<div class="header-logo-placeholder"></div>`}
    </div>
    <div class="header-center">
      <div class="header-title">REPORTE DE CIERRE DE VISITA</div>
      <div class="header-subtitle">IntisCorp · Sistema de Gestión de Visitas</div>
    </div>
    <div class="header-right"></div>
  </div>`;

const sectionTitle = (title: string): string =>
  `<div class="section-title"><span class="section-accent"></span>${esc(title)}</div>`;

// ── CSS — compact professional report ────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { margin: 0; padding: 0; }
body {
  font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif;
  background: #fff;
  color: #111827;
  font-size: 10.5px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── Page layout ── */
.page { width: 210mm; min-height: 297mm; padding: 14mm 16mm 12mm; display: block; position: relative; }
.page-break { break-before: page; }

/* ── Header ── */
.header {
  display: flex; align-items: center; gap: 10px;
  padding-bottom: 8px; margin-bottom: 12px;
  border-bottom: 2px solid #1e40af;
}
.header-left { width: 40px; flex-shrink: 0; }
.header-logo { width: 40px; height: 40px; object-fit: contain; display: block; }
.header-logo-placeholder { width: 40px; height: 40px; }
.header-center { flex: 1; }
.header-title {
  font-size: 15px; font-weight: 800; color: #1e3a5f;
  letter-spacing: -0.3px; line-height: 1.2;
}
.header-subtitle { font-size: 9px; color: #6b7280; font-weight: 500; margin-top: 1px; letter-spacing: 0.3px; }
.header-right { width: 40px; }

/* ── Section titles ── */
.section { margin-bottom: 10px; }
.section-title {
  font-size: 9.5px; font-weight: 700; color: #1e40af;
  text-transform: uppercase; letter-spacing: 0.8px;
  padding-bottom: 3px; margin-bottom: 6px;
  border-bottom: 1px solid #dbeafe;
  display: flex; align-items: center; gap: 4px;
}
.section-accent { display: inline-block; width: 3px; height: 12px; background: #2563eb; border-radius: 2px; }

/* ── Info grid ── */
.info-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0;
  border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;
  background: #fff;
}
.info-cell {
  padding: 6px 10px;
  border-bottom: 1px solid #f3f4f6;
  border-right: 1px solid #f3f4f6;
}
.info-cell:nth-child(even) { border-right: none; }
.info-cell.full { grid-column: 1 / -1; border-right: none; }
.info-cell:last-child, .info-cell:nth-last-child(2):nth-child(odd) { border-bottom: none; }
.info-label { font-size: 8.5px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 1px; }
.info-value { font-size: 11px; color: #111827; font-weight: 600; }

/* ── Text field blocks ── */
.field-block { margin-bottom: 8px; }
.field-label {
  font-size: 9px; font-weight: 700; color: #1e40af;
  text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;
}
.field-content {
  font-size: 10.5px; color: #1f2937; line-height: 1.5;
  white-space: pre-wrap; word-break: break-word;
  padding: 6px 8px; background: #f9fafb; border-radius: 4px;
  border-left: 3px solid #dbeafe;
}
.divider { border: none; border-top: 1px solid #f3f4f6; margin: 6px 0; }

/* ── Badges ── */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 999px;
  font-weight: 700; font-size: 10px;
}
.badge-yes { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
.badge-no  { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

/* ── Ticket blocks ── */
.ticket-header {
  padding: 7px 10px; border-radius: 6px; margin-bottom: 8px;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  display: flex; align-items: center; justify-content: space-between;
}
.ticket-number-label { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.5px; }
.ticket-code { font-weight: 800; color: #fff; font-size: 12px; letter-spacing: -0.2px; }

/* ── Images grid ── */
.images-grid { display: grid; gap: 6px; grid-template-columns: repeat(3, 1fr); margin-top: 6px; }
.image-item {
  overflow: hidden; border-radius: 5px; background: #f8fafc;
  border: 1px solid #e2e8f0; aspect-ratio: 4/3;
  display: flex; align-items: center; justify-content: center;
}
.image-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.no-images { font-size: 10px; color: #9ca3af; font-style: italic; padding: 4px 0; }

/* ── Footer ── */
.footer {
  position: absolute; bottom: 10mm; left: 16mm; right: 16mm;
  font-size: 8.5px; color: #9ca3af; text-align: center;
  border-top: 1px solid #f3f4f6; padding-top: 6px;
}

@media print {
  .page { padding: 10mm 14mm 10mm; }
}
`;

// ── Main export ───────────────────────────────────────────────────────────────

export function generateVisitaReportHtml(data: VisitaReportData): string {
  // ── PAGE 1: all information + closure detail ───────────────────────────────

  const page1 = `
  <div class="page">
    ${pageHeader(data.logoDataUri)}

    <!-- INFORMACIÓN GENERAL -->
    <div class="section">
      ${sectionTitle('Información General')}
      <div class="info-grid">
        ${infoRow('Empresa', data.empresaNombre)}
        ${infoRow('Sede', data.sedeNombre)}
        ${infoRow('Tipo de Visita', data.tipoVisita)}
        ${infoRow('Fecha Programada', data.fechaVisita)}
        ${data.horaProgramada ? infoRow('Hora Programada', data.horaProgramada) : ''}
        ${infoRow('Técnico Encargado', data.tecnicoEncargado)}
        ${infoRow('Total de Técnicos', String(data.totalTecnicos))}
        ${data.otrosTecnicos ? infoRow('Técnicos de Apoyo', data.otrosTecnicos, true) : ''}
      </div>
    </div>

    ${
      data.tieneTicket
        ? `
    <div class="section">
      ${sectionTitle('Información del Ticket')}
      <div class="info-grid">
        ${infoRow('N° de Ticket', data.ticketCodigo || '—')}
        ${infoRow('Activo Asociado', data.activoNombre || '—')}
        ${infoRow('Usuario Asignado', data.usuarioTicket || '—', true)}
      </div>
    </div>`
        : ''
    }

    <!-- RESULTADO -->
    <div class="section">
      ${sectionTitle('Resultado de la Visita')}
      <div class="info-grid">
        <div class="info-cell">
          <div class="info-label">Visita Contractual</div>
          <div class="info-value">${badge(data.cuentaComoVisita)}</div>
        </div>
        <div class="info-cell">
          <div class="info-label">Cambio de Componente</div>
          <div class="info-value">${badge(data.huboCambioComponente)}</div>
        </div>
      </div>
    </div>

    <!-- DETALLE DEL CIERRE -->
    <div class="section">
      ${sectionTitle('Detalle del Cierre')}
      ${fieldBlock('Diagnóstico', data.diagnostico)}
      ${fieldBlock('Resolución', data.solucion)}
      ${fieldBlock('Recomendación', data.recomendacion)}
    </div>

    ${data.cierreImagenes.length > 0 ? `
    <div class="section">
      ${sectionTitle('Evidencia Fotográfica')}
      ${imagesGrid(data.cierreImagenes, 'Cierre')}
    </div>` : ''}

    <div class="footer">
      IntisCorp · Generado el ${esc(data.fechaGeneracion)} · Pág. 1${data.ticketsAsociados.length > 0 ? ` / ${data.ticketsAsociados.length + 1}` : ''}
    </div>
  </div>`;

  // ── Additional pages: associated tickets ──────────────────────────────────

  const ticketPages = data.ticketsAsociados
    .map(
      (t, idx) => `
  <div class="page page-break">
    ${pageHeader(data.logoDataUri)}

    <div class="ticket-header">
      <div class="ticket-number-label">TICKET ${t.numero}</div>
      <div class="ticket-code">${esc(t.codigo)}</div>
    </div>

    <div class="section">
      ${sectionTitle('Detalle del Ticket')}
      ${fieldBlock('Diagnóstico', t.diagnostico)}
      ${fieldBlock('Resolución', t.solucion)}
      ${fieldBlock('Recomendación', t.recomendacion)}
    </div>

    ${t.imagenesUrls.length > 0 ? `
    <div class="section">
      ${sectionTitle('Evidencia Fotográfica')}
      ${imagesGrid(t.imagenesUrls, 'Ticket')}
    </div>` : ''}

    <div class="footer">
      IntisCorp · Generado el ${esc(data.fechaGeneracion)} · Pág. ${idx + 2} / ${data.ticketsAsociados.length + 1}
    </div>
  </div>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reporte de Cierre de Visita</title>
  <style>${CSS}</style>
</head>
<body>
  ${page1}
  ${ticketPages}
</body>
</html>`;
}

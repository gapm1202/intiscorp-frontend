// ─────────────────────────────────────────────────────────────────────────────
//  visitaReportTemplate.ts
//  Generates a self-contained HTML string for A4 PDF rendering via Puppeteer.
// ─────────────────────────────────────────────────────────────────────────────

export type ColumnaPdfTicket =
  | 'fecha'
  | 'codigoTicket'
  | 'codigoActivo'
  | 'usuarioAsignado'
  | 'sede'
  | 'areaActivo'
  | 'diagnostico'
  | 'resolucion'
  | 'recomendaciones';

export const COLUMNAS_PDF_TICKET: { key: ColumnaPdfTicket; label: string; obligatoria?: boolean }[] = [
  { key: 'fecha',           label: 'Fecha',            obligatoria: true },
  { key: 'codigoTicket',    label: 'Código Ticket' },
  { key: 'codigoActivo',    label: 'Código de Activo' },
  { key: 'usuarioAsignado', label: 'Usuario Asignado' },
  { key: 'sede',            label: 'Sede' },
  { key: 'areaActivo',      label: 'Área del Activo' },
  { key: 'diagnostico',     label: 'Diagnóstico' },
  { key: 'resolucion',      label: 'Resolución' },
  { key: 'recomendaciones', label: 'Recomendaciones' },
];

export interface TicketAsociadoData {
  numero: number;
  codigo: string;
  codigoActivo: string;
  usuarioAsignado: string;
  sede: string;
  areaActivo: string;
  fecha: string;
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
  /** Nombre mostrado para la firma del técnico */
  tecnicoFirmaNombre?: string;
  /** Firma rasterizada a imagen (data URI) */
  firmaTecnicoDataUri?: string;
  /** Firma del cliente rasterizada a imagen (data URI) */
  firmaClienteDataUri?: string;
  /** Nombre del cliente que firmó */
  clienteNombre?: string;
  ticketsAsociados: TicketAsociadoData[];
  /** Columnas seleccionadas para la tabla del PDF */
  columnasSeleccionadas?: ColumnaPdfTicket[];
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

// ── Bloque de firmas: técnico (izq) + cliente (der), imagen sobre la raya ──
const signatureBlock = (
  firmaDataUri?: string,
  tecnicoNombre?: string,
  firmaClienteDataUri?: string,
  clienteNombre?: string,
): string => `
  <div class="signatures-row">
    <div class="signature-col">
      <div class="signature-box">
        ${firmaDataUri
          ? `<img class="signature-image" src="${firmaDataUri}" alt="Firma del técnico" />`
          : `<div class="signature-blank"></div>`}
        <div class="signature-line"></div>
        <div class="signature-caption">${esc(tecnicoNombre || 'Técnico Encargado')}</div>
        <div class="signature-role">Firma del Técnico</div>
      </div>
    </div>
    <div class="signature-divider"></div>
    <div class="signature-col">
      <div class="signature-box">
        ${firmaClienteDataUri
          ? `<img class="signature-image" src="${firmaClienteDataUri}" alt="Firma del cliente" />`
          : `<div class="signature-blank"></div>`}
        <div class="signature-line"></div>
        <div class="signature-caption">${esc(clienteNombre || 'Cliente')}</div>
        <div class="signature-role">Firma de Conformidad</div>
      </div>
    </div>
  </div>`;

// ── Ticket table helpers (dynamic columns) ──────────────────────────────────

const COL_CONFIG: Record<ColumnaPdfTicket, { header: string; cssClass: string; getValue: (t: TicketAsociadoData) => string }> = {
  fecha:           { header: 'Fecha',           cssClass: '',          getValue: (t) => t.fecha },
  codigoTicket:    { header: 'Cód. Ticket',     cssClass: 'nowrap',    getValue: (t) => t.codigo },
  codigoActivo:    { header: 'Cód. Activo',     cssClass: 'nowrap',    getValue: (t) => t.codigoActivo },
  usuarioAsignado: { header: 'Usuario Asignado', cssClass: '',         getValue: (t) => t.usuarioAsignado },
  sede:            { header: 'Sede',             cssClass: '',         getValue: (t) => t.sede },
  areaActivo:      { header: 'Área del Activo',  cssClass: '',         getValue: (t) => t.areaActivo },
  diagnostico:     { header: 'Diagnóstico',      cssClass: 'wrap-cell', getValue: (t) => t.diagnostico || 'No especificado.' },
  resolucion:      { header: 'Resolución',       cssClass: 'wrap-cell', getValue: (t) => t.solucion || 'No especificado.' },
  recomendaciones: { header: 'Recomendaciones',  cssClass: 'wrap-cell', getValue: (t) => t.recomendacion || 'No especificado.' },
};

const DEFAULT_COLUMNS: ColumnaPdfTicket[] = [
  'fecha', 'codigoTicket', 'codigoActivo', 'usuarioAsignado',
  'sede', 'diagnostico', 'resolucion', 'recomendaciones',
];

const ticketTable = (tickets: TicketAsociadoData[], cols: ColumnaPdfTicket[]): string => {
  if (!tickets.length) return `<p class="no-data">No hay tickets asociados.</p>`;
  const colWidth = Math.floor(100 / cols.length);
  const headers = cols.map((c) => `<th style="width:${colWidth}%">${esc(COL_CONFIG[c].header)}</th>`).join('');
  const rows = tickets.map((t) => {
    const cells = cols.map((c) => {
      const cfg = COL_CONFIG[c];
      return `<td class="${cfg.cssClass}">${esc(cfg.getValue(t))}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return `
  <table class="ticket-table">
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
};

// ── CSS — landscape corporate report ─────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

@page {
  size: A4 landscape;
  margin: 7mm 10mm 9mm;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
  background: #ffffff;
  color: #0f172a;
  font-size: 10px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  -webkit-print-color-adjust: exact;
}

/* ── Single-flow wrapper — no forced page breaks ── */
.wrapper {
  width: 277mm;
}

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  padding-bottom: 7px;
  border-bottom: 2px solid #0f4c8a;
}

.header-logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.header-center {
  flex: 1;
}

.header-title {
  font-size: 15px;
  font-weight: 800;
  color: #0f2d54;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.header-subtitle {
  font-size: 8px;
  color: #64748b;
  margin-top: 1px;
}

.section {
  margin-bottom: 9px;
}

/* ── Section Title ── */
.section-title {
  font-size: 8.5px;
  font-weight: 700;
  color: #0f4c8a;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 5px;
  border-left: 3px solid #0f4c8a;
  padding-left: 6px;
}

/* ── Info Grid (4 cols for landscape compactness) ── */
.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  overflow: hidden;
}

.info-cell {
  padding: 5px 8px;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  background: #ffffff;
}

.info-cell:nth-child(4n) {
  border-right: none;
}

.info-cell.full {
  grid-column: 1 / -1;
}

.info-label {
  font-size: 7px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 1px;
}

.info-value {
  font-size: 10px;
  font-weight: 600;
  color: #0f172a;
}

/* ── Text Blocks ── */
.field-block {
  margin-bottom: 7px;
}

.field-label {
  font-size: 7.5px;
  font-weight: 700;
  color: #0f4c8a;
  margin-bottom: 2px;
  text-transform: uppercase;
}

.field-content {
  font-size: 9.5px;
  background: #f1f5f9;
  padding: 5px 8px;
  border-left: 3px solid #0f4c8a;
  border-radius: 3px;
  line-height: 1.45;
}

/* ── Badge ── */
.badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 8px;
}

.badge-yes {
  background: #dcfce7;
  color: #166534;
}

.badge-no {
  background: #fee2e2;
  color: #991b1b;
}

/* ── Ticket Table ── */
.ticket-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 7.5px;
  line-height: 1.35;
}

.ticket-table thead {
  display: table-header-group;
}

.ticket-table th {
  background: linear-gradient(135deg, #0f4c8a, #1e3a8a);
  color: #ffffff;
  font-weight: 700;
  font-size: 7px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 4px 4px;
  text-align: left;
  white-space: nowrap;
}

.ticket-table td {
  padding: 3px 4px;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: top;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.ticket-table tbody tr:nth-child(even) {
  background: #f8fafc;
}

.ticket-table .nowrap {
  white-space: nowrap;
}

.ticket-table .wrap-cell {
  word-break: break-word;
  hyphens: auto;
}

.no-data {
  text-align: center;
  color: #64748b;
  font-style: italic;
  padding: 10px;
}

/* ── Images ── */
.images-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.image-item {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ── Signatures — keep together, avoid splitting across pages ── */
.signatures-section {
  break-inside: avoid;
  margin-top: 10px;
}

.signatures-row {
  display: flex;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  overflow: hidden;
}

.signature-col {
  flex: 1;
  padding: 10px 14px;
}

.signature-box {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  min-height: 80px;
}

.signature-image {
  max-height: 50px;
  object-fit: contain;
  margin-bottom: -6px;
}

.signature-line {
  width: 100%;
  border-top: 1px solid #64748b;
  margin-bottom: 5px;
}

.signature-caption {
  font-size: 10px;
  font-weight: 600;
  text-align: center;
}

.signature-role {
  font-size: 8px;
  color: #64748b;
  text-align: center;
}

/* ── Footer ── */
.footer {
  margin-top: 8px;
  padding-top: 4px;
  font-size: 7.5px;
  color: #94a3b8;
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #e2e8f0;
}
`;

// ── Main export ───────────────────────────────────────────────────────────────

export function generateVisitaReportHtml(data: VisitaReportData): string {
  const esProgramada = /programada/i.test(data.tipoVisita);
  const cols = data.columnasSeleccionadas && data.columnasSeleccionadas.length > 0
    ? data.columnasSeleccionadas
    : DEFAULT_COLUMNS;

  const cierreFields = !esProgramada ? `
    <div class="section">
      ${sectionTitle('Cierre de Visita')}
      ${fieldBlock('Diagnóstico', data.diagnostico)}
      ${fieldBlock('Resolución', data.solucion)}
      ${fieldBlock('Recomendación', data.recomendacion)}
    </div>

    ${data.cierreImagenes.length > 0 ? `
    <div class="section">
      ${sectionTitle('Evidencia Fotográfica del Cierre')}
      ${imagesGrid(data.cierreImagenes, 'Cierre')}
    </div>` : ''}` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reporte de Cierre de Visita</title>
  <style>${CSS}</style>
</head>
<body>
<div class="wrapper">

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
      ${infoRow('Visita Contractual', data.cuentaComoVisita ? '✓ SÍ' : '✗ NO')}
      ${infoRow('Cambio de Componente', data.huboCambioComponente ? '✓ SÍ' : '✗ NO')}
    </div>
  </div>

  ${data.tieneTicket ? `
  <div class="section">
    ${sectionTitle('Información del Ticket')}
    <div class="info-grid">
      ${infoRow('N° de Ticket', data.ticketCodigo || '—')}
      ${infoRow('Activo Asociado', data.activoNombre || '—')}
      ${infoRow('Usuario Asignado', data.usuarioTicket || '—')}
    </div>
  </div>` : ''}

  ${data.ticketsAsociados.length > 0 ? `
  <div class="section">
    ${sectionTitle('Tickets Asociados')}
    ${ticketTable(data.ticketsAsociados, cols)}
  </div>` : ''}

  ${cierreFields}

  <!-- FIRMAS — se mantienen juntas, fluyen al final -->  
  <div class="signatures-section">
    ${sectionTitle('Firmas de Conformidad')}
    ${signatureBlock(data.firmaTecnicoDataUri, data.tecnicoFirmaNombre || data.tecnicoEncargado, data.firmaClienteDataUri, data.clienteNombre)}
  </div>

  <div class="footer">
    <span>IntisCorp · Sistema de Gestión de Visitas</span>
    <span>Generado el ${esc(data.fechaGeneracion)}</span>
  </div>

</div>
</body>
</html>`;
}
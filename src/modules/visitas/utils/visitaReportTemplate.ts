// ─────────────────────────────────────────────────────────────────────────────
//  visitaReportTemplate.ts
//  Generates a self-contained HTML string for A4 PDF rendering via Puppeteer.
// ─────────────────────────────────────────────────────────────────────────────

export interface TicketAsociadoData {
  numero: number;
  codigo: string;
  codigoActivo: string;
  usuarioAsignado: string;
  sede: string;
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

// ── Ticket table helpers ─────────────────────────────────────────────────────

const ticketTableRow = (t: TicketAsociadoData): string => `
  <tr>
    <td>${esc(t.fecha)}</td>
    <td class="nowrap">${esc(t.codigo)}</td>
    <td class="nowrap">${esc(t.codigoActivo)}</td>
    <td>${esc(t.usuarioAsignado)}</td>
    <td>${esc(t.sede)}</td>
    <td class="wrap-cell">${esc(t.diagnostico || 'No especificado.')}</td>
    <td class="wrap-cell">${esc(t.solucion || 'No especificado.')}</td>
    <td class="wrap-cell">${esc(t.recomendacion || 'No especificado.')}</td>
  </tr>`;

const ticketTable = (tickets: TicketAsociadoData[]): string => {
  if (!tickets.length) return `<p class="no-data">No hay tickets asociados.</p>`;
  return `
  <table class="ticket-table">
    <thead>
      <tr>
        <th style="width:8%">Fecha</th>
        <th style="width:10%">Cód. Ticket</th>
        <th style="width:10%">Cód. Activo</th>
        <th style="width:12%">Usuario Asignado</th>
        <th style="width:10%">Sede</th>
        <th style="width:17%">Diagnóstico</th>
        <th style="width:17%">Resolución</th>
        <th style="width:16%">Recomendaciones</th>
      </tr>
    </thead>
    <tbody>
      ${tickets.map(ticketTableRow).join('')}
    </tbody>
  </table>`;
};

// ── CSS — landscape corporate report ─────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

@page {
  size: A4 landscape;
  margin: 0;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
  background: #ffffff;
  color: #0f172a;
  font-size: 11px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -webkit-print-color-adjust: exact;
}

/* ── Page ── */
.page {
  width: 297mm;
  min-height: 210mm;
  padding: 8mm 10mm 12mm;
  position: relative;
}

.table-pages {
  width: 297mm;
  padding: 8mm 10mm 12mm;
}

.page-break { break-before: page; }

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 2px solid #0f4c8a;
}

.header-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.header-center {
  flex: 1;
}

.header-title {
  font-size: 17px;
  font-weight: 800;
  color: #0f2d54;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.header-subtitle {
  font-size: 9px;
  color: #64748b;
  margin-top: 1px;
}

.section {
  margin-bottom: 12px;
}

/* ── Section Title ── */
.section-title {
  font-size: 10px;
  font-weight: 700;
  color: #0f4c8a;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
  border-left: 4px solid #0f4c8a;
  padding-left: 8px;
}

/* ── Info Grid (3 cols for landscape) ── */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  overflow: hidden;
}

.info-cell {
  padding: 7px 10px;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  background: #ffffff;
}

.info-cell:nth-child(3n) {
  border-right: none;
}

.info-cell.full {
  grid-column: 1 / -1;
}

.info-label {
  font-size: 8px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.info-value {
  font-size: 11.5px;
  font-weight: 600;
  color: #0f172a;
}

/* ── Text Blocks ── */
.field-block {
  margin-bottom: 10px;
}

.field-label {
  font-size: 9px;
  font-weight: 700;
  color: #0f4c8a;
  margin-bottom: 3px;
  text-transform: uppercase;
}

.field-content {
  font-size: 11px;
  background: #f1f5f9;
  padding: 8px 10px;
  border-left: 4px solid #0f4c8a;
  border-radius: 4px;
  line-height: 1.5;
}

/* ── Badge ── */
.badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 5px;
  font-weight: 700;
  font-size: 9px;
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
  font-size: 8.5px;
  line-height: 1.4;
}

.ticket-table thead {
  display: table-header-group;
}

.ticket-table th {
  background: linear-gradient(135deg, #0f4c8a, #1e3a8a);
  color: #ffffff;
  font-weight: 700;
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 6px 5px;
  text-align: left;
  white-space: nowrap;
}

.ticket-table td {
  padding: 5px 5px;
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
  min-width: 60px;
}

.no-data {
  text-align: center;
  color: #64748b;
  font-style: italic;
  padding: 20px;
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

/* ── Signatures ── */
.signatures-row {
  display: flex;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  overflow: hidden;
}

.signature-col {
  flex: 1;
  padding: 14px;
}

.signature-box {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  min-height: 110px;
}

.signature-image {
  max-height: 60px;
  object-fit: contain;
  margin-bottom: -8px;
}

.signature-line {
  width: 100%;
  border-top: 1px solid #64748b;
  margin-bottom: 6px;
}

.signature-caption {
  font-size: 11px;
  font-weight: 600;
  text-align: center;
}

.signature-role {
  font-size: 9px;
  color: #64748b;
  text-align: center;
}

/* ── Footer ── */
.footer {
  position: absolute;
  bottom: 8mm;
  left: 10mm;
  right: 10mm;
  font-size: 8px;
  color: #64748b;
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #e2e8f0;
  padding-top: 4px;
}
`;

// ── Main export ───────────────────────────────────────────────────────────────

export function generateVisitaReportHtml(data: VisitaReportData): string {
  const esProgramada = /programada/i.test(data.tipoVisita);

  // ── PAGE 1: overview ──────────────────────────────────────────────────────

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
        ${infoRow('Usuario Asignado', data.usuarioTicket || '—')}
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

    <div class="footer">
      <span class="footer-brand">IntisCorp</span>
      <span>Generado el ${esc(data.fechaGeneracion)}</span>
    </div>
  </div>`;

  // ── TICKET TABLE SECTION (auto-flowing, may span multiple pages) ──────────

  const ticketSection = data.ticketsAsociados.length > 0 ? `
  <div class="table-pages page-break">
    ${pageHeader(data.logoDataUri)}

    <div class="section">
      ${sectionTitle('Tickets Asociados')}
      ${ticketTable(data.ticketsAsociados)}
    </div>
  </div>` : '';

  // ── CIERRE PAGE (with signatures) ─────────────────────────────────────────

  const cierrePage = `
  <div class="page page-break">
    ${pageHeader(data.logoDataUri)}

    ${!esProgramada ? `
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
    </div>` : ''}` : ''}

    <div class="section">
      ${sectionTitle('Firmas de Conformidad')}
      ${signatureBlock(data.firmaTecnicoDataUri, data.tecnicoFirmaNombre || data.tecnicoEncargado, data.firmaClienteDataUri, data.clienteNombre)}
    </div>

    <div class="footer">
      <span class="footer-brand">IntisCorp</span>
      <span>Generado el ${esc(data.fechaGeneracion)}</span>
    </div>
  </div>`;

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
  ${ticketSection}
  ${cierrePage}
</body>
</html>`;
}
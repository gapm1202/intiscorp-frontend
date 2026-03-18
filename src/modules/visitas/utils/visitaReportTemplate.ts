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

// ── CSS — refined corporate report ───────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
  background: #ffffff;
  color: #0f172a;
  font-size: 12.5px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -webkit-print-color-adjust: exact;
}

/* ── Page ── */
.page {
  width: 210mm;
  min-height: 297mm;
  padding: 10mm 12mm 14mm;
  position: relative;
}

.page-break { break-before: page; }

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
  padding-bottom: 10px;
  border-bottom: 2px solid #0f4c8a;
}

.header-logo {
  width: 50px;
  height: 50px;
  object-fit: contain;
}

.header-center {
  flex: 1;
}

.header-title {
  font-size: 20px;
  font-weight: 800;
  color: #0f2d54;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.header-subtitle {
  font-size: 10px;
  color: #64748b;
  margin-top: 2px;
}

.section {
  margin-bottom: 16px;
}

/* ── Section Title ── */
.section-title {
  font-size: 11px;
  font-weight: 700;
  color: #0f4c8a;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
  border-left: 4px solid #0f4c8a;
  padding-left: 8px;
}

/* ── Info Grid ── */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  overflow: hidden;
}

.info-cell {
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  background: #ffffff;
}

.info-cell:nth-child(even) {
  border-right: none;
}

.info-cell.full {
  grid-column: 1 / -1;
}

.info-label {
  font-size: 9px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 3px;
}

.info-value {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

/* ── Text Blocks ── */
.field-block {
  margin-bottom: 12px;
}

.field-label {
  font-size: 10px;
  font-weight: 700;
  color: #0f4c8a;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.field-content {
  font-size: 12.5px;
  background: #f1f5f9;
  padding: 10px 12px;
  border-left: 4px solid #0f4c8a;
  border-radius: 4px;
  line-height: 1.6;
}

/* ── Badge ── */
.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 5px;
  font-weight: 700;
  font-size: 10px;
}

.badge-yes {
  background: #dcfce7;
  color: #166534;
}

.badge-no {
  background: #fee2e2;
  color: #991b1b;
}

/* ── Ticket Header ── */
.ticket-header {
  background: linear-gradient(135deg, #0f4c8a, #1e3a8a);
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ticket-number-label {
  font-size: 10px;
  color: #cbd5f5;
  font-weight: 700;
}

.ticket-code {
  font-size: 14px;
  color: #ffffff;
  font-weight: 700;
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
  margin-bottom: -8px; /* 🔥 clave para pegarlo a la línea */
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
  bottom: 10mm;
  left: 12mm;
  right: 12mm;
  font-size: 9px;
  color: #64748b;
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #e2e8f0;
  padding-top: 6px;
}
`;

// ── Main export ───────────────────────────────────────────────────────────────

export function generateVisitaReportHtml(data: VisitaReportData): string {
  const esProgramada = /programada/i.test(data.tipoVisita);
  const totalPages = esProgramada
    ? (data.ticketsAsociados.length > 0
        ? 1 + data.ticketsAsociados.length   // overview + tickets (signatures on last ticket)
        : 2)                                  // overview + signatures-only page
    : 2 + data.ticketsAsociados.length;       // overview + tickets + cierre

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

    <div class="footer">
      <span class="footer-brand">IntisCorp</span>
      <span>Generado el ${esc(data.fechaGeneracion)}</span>
      <span>Pág. 1 / ${totalPages}</span>
    </div>
  </div>`;

  // ── Additional pages: associated tickets ──────────────────────────────────

  const ticketPages = data.ticketsAsociados
    .map(
      (t, idx) => {
        const isLastTicket = idx === data.ticketsAsociados.length - 1;
        const signaturesOnThisPage = esProgramada && isLastTicket;
        const pageNum = idx + 2;
        // For programada, the last ticket page IS the final page (totalPages already accounts for no cierre page)
        const effectiveTotalPages = signaturesOnThisPage ? pageNum : totalPages;
        return `
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

    ${signaturesOnThisPage ? `
    <div class="section">
      ${sectionTitle('Firmas de Conformidad')}
      ${signatureBlock(data.firmaTecnicoDataUri, data.tecnicoFirmaNombre || data.tecnicoEncargado, data.firmaClienteDataUri, data.clienteNombre)}
    </div>` : ''}

    <div class="footer">
      <span class="footer-brand">IntisCorp</span>
      <span>Generado el ${esc(data.fechaGeneracion)}</span>
      <span>Pág. ${pageNum} / ${effectiveTotalPages}</span>
    </div>
  </div>`;
      },
    )
    .join('');

  const cierrePage = `
  <div class="page page-break">
    ${pageHeader(data.logoDataUri)}

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
    </div>` : ''}

    <div class="section">
      ${sectionTitle('Firmas de Conformidad')}
      ${signatureBlock(data.firmaTecnicoDataUri, data.tecnicoFirmaNombre || data.tecnicoEncargado, data.firmaClienteDataUri, data.clienteNombre)}
    </div>

    <div class="footer">
      <span class="footer-brand">IntisCorp</span>
      <span>Generado el ${esc(data.fechaGeneracion)}</span>
      <span>Pág. ${totalPages} / ${totalPages}</span>
    </div>
  </div>`;

  // For PROGRAMADA with tickets: signatures are on the last ticket page, no cierre page.
  // For PROGRAMADA without tickets: we still need a signatures-only page.
  // For POR_TICKET / other: always render the full cierre page.
  const renderCierrePage = esProgramada
    ? (data.ticketsAsociados.length === 0)  // only if no tickets to attach signatures to
    : true;

  // When PROGRAMADA has no tickets, render a slim page with just signatures (no diagnóstico etc.)
  const cierrePageProgramadaOnly = `
  <div class="page page-break">
    ${pageHeader(data.logoDataUri)}

    <div class="section">
      ${sectionTitle('Firmas de Conformidad')}
      ${signatureBlock(data.firmaTecnicoDataUri, data.tecnicoFirmaNombre || data.tecnicoEncargado, data.firmaClienteDataUri, data.clienteNombre)}
    </div>

    <div class="footer">
      <span class="footer-brand">IntisCorp</span>
      <span>Generado el ${esc(data.fechaGeneracion)}</span>
      <span>Pág. 2 / 2</span>
    </div>
  </div>`;

  const finalCierrePage = esProgramada
    ? (renderCierrePage ? cierrePageProgramadaOnly : '')
    : cierrePage;

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
  ${finalCierrePage}
</body>
</html>`;
}
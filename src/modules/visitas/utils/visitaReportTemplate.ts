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
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { margin: 0; padding: 0; }
body {
  font-family: 'DM Sans', -apple-system, 'Segoe UI', sans-serif;
  background: #fff;
  color: #0f172a;
  font-size: 10.5px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── Page layout ── */
.page { width: 210mm; min-height: 297mm; padding: 14mm 16mm 18mm; display: block; position: relative; }
.page-break { break-before: page; }

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 10px;
  margin-bottom: 14px;
}
.header-left { width: 44px; flex-shrink: 0; }
.header-logo { width: 44px; height: 44px; object-fit: contain; display: block; }
.header-logo-placeholder { width: 44px; height: 44px; }
.header-center { flex: 1; border-left: 3px solid #0f4c8a; padding-left: 12px; }
.header-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f2d54;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  line-height: 1.2;
}
.header-subtitle {
  font-size: 8.5px;
  color: #64748b;
  font-weight: 400;
  margin-top: 2px;
  letter-spacing: 0.4px;
}
.header-right { width: 44px; }
.header::after {
  content: '';
  display: block;
  position: absolute;
  left: 16mm;
  right: 16mm;
  top: calc(14mm + 54px);
  height: 1px;
  background: linear-gradient(to right, #0f4c8a 30%, #e2e8f0 100%);
}

/* ── Section titles ── */
.section { margin-bottom: 12px; }
.section-title {
  font-size: 8px;
  font-weight: 700;
  color: #0f4c8a;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  padding-bottom: 4px;
  margin-bottom: 7px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 5px;
}
.section-accent {
  display: inline-block;
  width: 2px;
  height: 11px;
  background: #0f4c8a;
  border-radius: 1px;
  flex-shrink: 0;
}

/* ── Info grid ── */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}
.info-cell {
  padding: 7px 11px;
  border-bottom: 1px solid #f1f5f9;
  border-right: 1px solid #f1f5f9;
  background: #fff;
}
.info-cell:nth-child(even) { border-right: none; }
.info-cell.full { grid-column: 1 / -1; border-right: none; }
.info-cell:last-child,
.info-cell:nth-last-child(2):nth-child(odd) { border-bottom: none; }
.info-cell:nth-child(4n+1),
.info-cell:nth-child(4n+2) { background: #f8fafc; }
.info-label {
  font-size: 7.5px;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}
.info-value {
  font-size: 10.5px;
  color: #0f172a;
  font-weight: 600;
  line-height: 1.3;
}

/* ── Text field blocks ── */
.field-block { margin-bottom: 9px; }
.field-label {
  font-size: 7.5px;
  font-weight: 700;
  color: #0f4c8a;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 4px;
}
.field-content {
  font-size: 10.5px;
  color: #1e293b;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 7px 10px;
  background: #f8fafc;
  border-radius: 3px;
  border-left: 2px solid #0f4c8a;
}
.divider { border: none; border-top: 1px solid #f1f5f9; margin: 7px 0; }

/* ── Badges ── */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: 3px;
  font-weight: 700;
  font-size: 9.5px;
  letter-spacing: 0.3px;
}
.badge-yes { background: #ecfdf5; color: #047857; border: 1px solid #6ee7b7; }
.badge-no  { background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; }

/* ── Ticket header block ── */
.ticket-header {
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 10px;
  background: #0f2d54;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ticket-number-label {
  font-size: 8px;
  font-weight: 700;
  color: rgba(255,255,255,0.55);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.ticket-code {
  font-family: 'DM Mono', monospace;
  font-weight: 500;
  color: #fff;
  font-size: 12px;
  letter-spacing: 0.5px;
}

/* ── Images grid ── */
.images-grid {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 6px;
}
.image-item {
  overflow: hidden;
  border-radius: 4px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  aspect-ratio: 4/3;
  display: flex;
  align-items: center;
  justify-content: center;
}
.image-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.no-images { font-size: 10px; color: #94a3b8; font-style: italic; padding: 4px 0; }

/* ── Signature block — two columns side by side con imagen sobre la raya ── */
.signatures-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}
.signature-col {
  flex: 1;
  padding: 14px 14px 10px 14px;
}
.signature-divider {
  width: 1px;
  background: #e2e8f0;
  flex-shrink: 0;
}
.signature-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  min-height: 90px;
}
.signature-image {
  width: 100%;
  max-height: 70px;
  object-fit: contain;
  display: block;
  margin-bottom: 4px;
}
.signature-blank {
  flex: 1;
  min-height: 70px;
  width: 100%;
}
.signature-line {
  width: 100%;
  border-top: 1px solid #94a3b8;
  margin: 0 0 5px 0;
}
.signature-caption {
  font-size: 9.5px;
  color: #0f172a;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.1px;
  line-height: 1.2;
}
.signature-role {
  font-size: 7.5px;
  color: #94a3b8;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  text-align: center;
  margin-top: 2px;
}

/* ── Footer ── */
.footer {
  position: absolute;
  bottom: 10mm;
  left: 16mm;
  right: 16mm;
  font-size: 8px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #f1f5f9;
  padding-top: 5px;
  letter-spacing: 0.2px;
}
.footer-brand { font-weight: 600; color: #64748b; }

@media print {
  .page { padding: 10mm 14mm 14mm; }
}
`;

// ── Main export ───────────────────────────────────────────────────────────────

export function generateVisitaReportHtml(data: VisitaReportData): string {
  const totalPages = 2 + data.ticketsAsociados.length;

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
      <span class="footer-brand">IntisCorp</span>
      <span>Generado el ${esc(data.fechaGeneracion)}</span>
      <span>Pág. ${idx + 2} / ${totalPages}</span>
    </div>
  </div>`,
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
  ${cierrePage}
</body>
</html>`;
}
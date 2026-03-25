// ─────────────────────────────────────────────────────────────────────────────
//  mantenimientoReportTemplate.ts
//  Generates a self-contained HTML string for A4 PDF rendering (consolidated
//  maintenance report with per-asset pages + signature page).
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivoReportData {
  codigo: string;
  equipo: string;
  usuario: string;
  diagnostico: string;
  trabajoRealizado: string;
  recomendaciones: string;
  observaciones: string;
  cambioComponentes: boolean;
  checklist: Array<{
    label: string;
    value: string | null;
    comentario: string;
  }>;
  evidenciaAntes?: string;
  evidenciaDespues?: string;
}

export interface MantenimientoReportData {
  empresaNombre: string;
  sedeNombre: string;
  fechaMantenimiento: string;
  tecnicoEncargado: string;
  otrosTecnicos: string;
  totalTecnicos: number;
  activos: ActivoReportData[];
  firmaTecnicoNombre: string;
  firmaTecnicoDataUri?: string;
  firmaClienteNombre?: string;
  firmaClienteDataUri?: string;
  logoDataUri?: string;
  fechaGeneracion: string;
}

const esc = (s: string): string =>
  String(s ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function generateMantenimientoReportHtml(data: MantenimientoReportData): string {
  const {
    empresaNombre,
    sedeNombre,
    fechaMantenimiento,
    tecnicoEncargado,
    otrosTecnicos,
    totalTecnicos,
    activos,
    firmaTecnicoNombre,
    firmaTecnicoDataUri,
    firmaClienteNombre,
    firmaClienteDataUri,
    logoDataUri,
    fechaGeneracion,
  } = data;

  const totalPages = 1 + activos.length + 1; // overview + per-asset + signature

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }

    .page {
      width: 210mm; min-height: 297mm; padding: 18mm 16mm 20mm 16mm;
      page-break-after: always; position: relative;
    }
    .page:last-child { page-break-after: avoid; }

    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2.5px solid #1a56db; }
    .header-logo { height: 38px; object-fit: contain; }
    .header-title { font-size: 16px; font-weight: 800; color: #1a56db; letter-spacing: -0.02em; }
    .header-subtitle { font-size: 9px; color: #64748b; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin-bottom: 16px; }
    .info-cell { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 10px; }
    .info-cell.full { grid-column: 1 / -1; }
    .info-label { font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
    .info-value { font-size: 11px; font-weight: 600; color: #0f172a; }

    .section-title { font-size: 12px; font-weight: 800; color: #1a56db; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 1.5px solid #dbeafe; }

    .field-block { margin-bottom: 10px; }
    .field-label { font-size: 9px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
    .field-content { font-size: 10.5px; color: #334155; line-height: 1.5; white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; min-height: 24px; }

    .checklist-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
    .checklist-table th { background: #1a56db; color: #fff; padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
    .checklist-table td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
    .checklist-table tr:nth-child(even) td { background: #f8fafc; }
    .badge-si { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 10px; font-weight: 700; font-size: 9px; }
    .badge-no { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 10px; font-weight: 700; font-size: 9px; }

    .evidence-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
    .evidence-item { text-align: center; }
    .evidence-item img { max-width: 100%; max-height: 140px; border: 1px solid #e2e8f0; border-radius: 6px; object-fit: contain; }
    .evidence-label { font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }

    .signature-section { margin-top: 30px; page-break-inside: avoid; }
    .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 20px; }
    .signature-box { text-align: center; }
    .signature-image { width: 200px; height: 80px; object-fit: contain; margin: 0 auto 8px; display: block; }
    .signature-line { width: 200px; border-top: 1.5px solid #334155; margin: 0 auto 6px; }
    .signature-name { font-size: 11px; font-weight: 700; color: #0f172a; }
    .signature-role { font-size: 9px; color: #64748b; font-weight: 600; }
    .signature-pending { font-size: 10px; color: #f59e0b; font-weight: 600; font-style: italic; margin-bottom: 8px; }

    .page-footer { position: absolute; bottom: 12mm; left: 16mm; right: 16mm; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }

    .asset-header { background: linear-gradient(135deg, #1a56db 0%, #3b82f6 100%); color: #fff; padding: 10px 14px; border-radius: 8px; margin-bottom: 14px; }
    .asset-header-code { font-size: 14px; font-weight: 800; }
    .asset-header-info { font-size: 10px; opacity: 0.85; margin-top: 2px; }

    .overview-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px; }
    .stat-card { background: #f0f9ff; border: 1.5px solid #bfdbfe; border-radius: 8px; padding: 12px; text-align: center; }
    .stat-value { font-size: 22px; font-weight: 900; color: #1a56db; }
    .stat-label { font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-top: 2px; }
  `;

  const pageHeader = `
    <div class="header">
      <div style="display:flex;align-items:center;gap:10px;">
        ${logoDataUri ? `<img class="header-logo" src="${logoDataUri}" alt="Logo" />` : ''}
        <div>
          <div class="header-title">Reporte de Mantenimiento Preventivo</div>
          <div class="header-subtitle">${esc(empresaNombre)} — ${esc(sedeNombre)}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:9px;color:#64748b;">Fecha: ${esc(fechaMantenimiento)}</div>
        <div style="font-size:8px;color:#94a3b8;">Generado: ${esc(fechaGeneracion)}</div>
      </div>
    </div>`;

  // ─── Page 1: Overview ──────────────────────────────────────────────────────
  const overviewPage = `
    <div class="page">
      ${pageHeader}
      <div class="section-title">Información General</div>
      <div class="info-grid">
        <div class="info-cell">
          <div class="info-label">Empresa</div>
          <div class="info-value">${esc(empresaNombre)}</div>
        </div>
        <div class="info-cell">
          <div class="info-label">Sede</div>
          <div class="info-value">${esc(sedeNombre)}</div>
        </div>
        <div class="info-cell">
          <div class="info-label">Técnico Encargado</div>
          <div class="info-value">${esc(tecnicoEncargado)}</div>
        </div>
        <div class="info-cell">
          <div class="info-label">Fecha Programada</div>
          <div class="info-value">${esc(fechaMantenimiento)}</div>
        </div>
        ${otrosTecnicos ? `
        <div class="info-cell full">
          <div class="info-label">Otros Técnicos (${totalTecnicos})</div>
          <div class="info-value">${esc(otrosTecnicos)}</div>
        </div>` : ''}
      </div>

      <div class="section-title">Resumen de Activos</div>
      <div class="overview-stats">
        <div class="stat-card">
          <div class="stat-value">${activos.length}</div>
          <div class="stat-label">Total Atendidos</div>
        </div>
        <div class="stat-card" style="border-color:#86efac;background:#f0fdf4;">
          <div class="stat-value" style="color:#166534;">${activos.filter(a => !a.cambioComponentes).length}</div>
          <div class="stat-label">Sin Cambios</div>
        </div>
        <div class="stat-card" style="border-color:#fde68a;background:#fffbeb;">
          <div class="stat-value" style="color:#92400e;">${activos.filter(a => a.cambioComponentes).length}</div>
          <div class="stat-label">Con Cambio</div>
        </div>
      </div>

      <div class="section-title">Listado de Activos Atendidos</div>
      <table class="checklist-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Código</th>
            <th>Equipo</th>
            <th>Usuario</th>
            <th>Cambio</th>
          </tr>
        </thead>
        <tbody>
          ${activos.map((a, i) => `
          <tr>
            <td>${i + 1}</td>
            <td style="font-weight:700;">${esc(a.codigo)}</td>
            <td>${esc(a.equipo)}</td>
            <td>${esc(a.usuario)}</td>
            <td>${a.cambioComponentes ? '<span class="badge-no">SÍ</span>' : '<span class="badge-si">NO</span>'}</td>
          </tr>`).join('')}
        </tbody>
      </table>

      <div class="page-footer">
        <span>Mantenimiento Preventivo — ${esc(empresaNombre)}</span>
        <span>Página 1 de ${totalPages}</span>
      </div>
    </div>`;

  // ─── Per-asset pages ───────────────────────────────────────────────────────
  const assetPages = activos.map((activo, index) => {
    const pageNum = index + 2;
    const checklistHtml = activo.checklist.length > 0 ? `
      <div class="section-title">Checklist</div>
      <table class="checklist-table">
        <thead>
          <tr><th>#</th><th>Ítem</th><th>Estado</th><th>Comentario</th></tr>
        </thead>
        <tbody>
          ${activo.checklist.map((item, i) => {
            const val = String(item.value ?? '').toUpperCase();
            const badge = val === 'SI'
              ? '<span class="badge-si">SI</span>'
              : val === 'NO'
                ? '<span class="badge-no">NO</span>'
                : `<span style="font-weight:600;">${esc(String(item.value ?? 'N/A'))}</span>`;
            return `
            <tr>
              <td>${i + 1}</td>
              <td>${esc(item.label)}</td>
              <td>${badge}</td>
              <td style="font-size:9px;color:#475569;">${esc(item.comentario || '')}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>` : '';

    const evidenceHtml = (activo.evidenciaAntes || activo.evidenciaDespues) ? `
      <div class="section-title">Evidencias Fotográficas</div>
      <div class="evidence-grid">
        <div class="evidence-item">
          <div class="evidence-label">Antes</div>
          ${activo.evidenciaAntes
            ? `<img src="${activo.evidenciaAntes}" alt="Antes" />`
            : '<p style="color:#94a3b8;font-size:9px;">Sin imagen</p>'}
        </div>
        <div class="evidence-item">
          <div class="evidence-label">Después</div>
          ${activo.evidenciaDespues
            ? `<img src="${activo.evidenciaDespues}" alt="Después" />`
            : '<p style="color:#94a3b8;font-size:9px;">Sin imagen</p>'}
        </div>
      </div>` : '';

    return `
    <div class="page">
      ${pageHeader}
      <div class="asset-header">
        <div class="asset-header-code">Activo: ${esc(activo.codigo)}</div>
        <div class="asset-header-info">${esc(activo.equipo)} — Usuario: ${esc(activo.usuario)} — Cambio componentes: ${activo.cambioComponentes ? 'SÍ' : 'NO'}</div>
      </div>

      <div class="section-title">Informe Técnico</div>
      <div class="field-block">
        <div class="field-label">Diagnóstico</div>
        <div class="field-content">${esc(activo.diagnostico)}</div>
      </div>
      <div class="field-block">
        <div class="field-label">Trabajo Realizado</div>
        <div class="field-content">${esc(activo.trabajoRealizado)}</div>
      </div>
      <div class="field-block">
        <div class="field-label">Recomendaciones</div>
        <div class="field-content">${esc(activo.recomendaciones)}</div>
      </div>
      ${activo.observaciones ? `
      <div class="field-block">
        <div class="field-label">Observaciones</div>
        <div class="field-content">${esc(activo.observaciones)}</div>
      </div>` : ''}

      ${evidenceHtml}
      ${checklistHtml}

      <div class="page-footer">
        <span>Activo ${esc(activo.codigo)} — ${esc(empresaNombre)}</span>
        <span>Página ${pageNum} de ${totalPages}</span>
      </div>
    </div>`;
  }).join('');

  // ─── Signature page ────────────────────────────────────────────────────────
  const signaturePage = `
    <div class="page">
      ${pageHeader}
      <div class="signature-section">
        <div class="section-title" style="font-size:16px;text-align:center;border:none;margin-bottom:30px;">
          Firma de Conformidad
        </div>
        <p style="text-align:center;font-size:11px;color:#475569;margin-bottom:40px;line-height:1.6;">
          Con la presente firma, se da conformidad a los trabajos de mantenimiento preventivo<br/>
          realizados en las instalaciones de <strong>${esc(empresaNombre)}</strong> — Sede <strong>${esc(sedeNombre)}</strong><br/>
          el día <strong>${esc(fechaMantenimiento)}</strong>.
        </p>

        <div class="signature-grid">
          <div class="signature-box">
            ${firmaTecnicoDataUri
              ? `<img class="signature-image" src="${firmaTecnicoDataUri}" alt="Firma Técnico" />`
              : `<div style="height:80px;"></div>`}
            <div class="signature-line"></div>
            <div class="signature-name">${esc(firmaTecnicoNombre)}</div>
            <div class="signature-role">Técnico Responsable</div>
          </div>
          <div class="signature-box">
            ${firmaClienteDataUri
              ? `<img class="signature-image" src="${firmaClienteDataUri}" alt="Firma Cliente" />`
              : `<div class="signature-pending">(Pendiente de firma)</div><div style="height:50px;"></div>`}
            <div class="signature-line"></div>
            <div class="signature-name">${esc(firmaClienteNombre || 'Cliente')}</div>
            <div class="signature-role">Representante del Cliente</div>
          </div>
        </div>
      </div>

      <div class="page-footer">
        <span>Firma de Conformidad — ${esc(empresaNombre)}</span>
        <span>Página ${totalPages} de ${totalPages}</span>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reporte Mantenimiento Preventivo — ${esc(empresaNombre)}</title>
  <style>${css}</style>
</head>
<body>
  ${overviewPage}
  ${assetPages}
  ${signaturePage}
</body>
</html>`;
}

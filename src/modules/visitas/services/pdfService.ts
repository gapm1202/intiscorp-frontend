// ─────────────────────────────────────────────────────────────────────────────
//  pdfService.ts
//  Sends generated HTML to the local Puppeteer PDF server (scripts/pdf-server.cjs)
//  and returns a base64-encoded PDF string.
//
//  The server must be running via:  npm run pdf:server
// ─────────────────────────────────────────────────────────────────────────────

import axiosClient from '@/api/axiosClient';

/**
 * Converts an HTML string to a base64-encoded PDF by calling the main backend
 * endpoint `/api/pdf/generar-reporte-visita`. Uses `axiosClient` so auth
 * headers and baseURL are applied consistently.
 */
export async function htmlToPdfBase64(html: string, visita?: { [k: string]: any }): Promise<string> {
  try {
    const body: any = { html };
    if (visita) body.visita = visita;

    const res = await axiosClient.post('/api/pdf/generar-reporte-visita', body);
    // Expecting { pdfBase64: string } from backend
    const data = res.data as { pdfBase64?: string };
    if (!data || !data.pdfBase64) throw new Error('Respuesta inválida del servidor PDF');
    return data.pdfBase64;
  } catch (err: any) {
    // Normalize error message
    const msg = err?.response?.data ?? err?.message ?? String(err);
    throw new Error(`Error generando PDF en backend: ${JSON.stringify(msg)}`);
  }
}

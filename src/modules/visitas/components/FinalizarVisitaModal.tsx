import { useState, useEffect, useRef } from 'react';
import type { Visita, FinalizarVisitaPayload } from '../types';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { finalizarVisita, enviarResumenVisitaCorreo } from '../services/visitasService';
import { getTicketById, getTickets, cambiarEstadoConImagenes } from '@/modules/tickets/services/ticketsService';
import { getUsuariosByEmpresa } from '@/modules/usuarios/services/usuariosService';
import type { Usuario } from '@/modules/usuarios/services/usuariosService';
import { useAuth } from '@/hooks/useAuth';
import type { Ticket } from '@/modules/tickets/types';

interface FinalizarVisitaModalProps {
  visita: Visita;
  onClose: () => void;
  onVisitaFinalizada: (visita: Visita) => void;
  onError: (error: string) => void;
  onAbrirModalEditarActivo?: (activo: any) => void | Promise<void>;
  kbEntryId?: string | null;
}

export default function FinalizarVisitaModal({
  visita,
  onClose,
  onVisitaFinalizada,
  onError,
  onAbrirModalEditarActivo,
  kbEntryId,
}: FinalizarVisitaModalProps) {
  const { user } = useAuth();
  const [diagnostico, setDiagnostico] = useState('');
  const [resolucion, setResolucion] = useState('');
  const [recomendacion, setRecomendacion] = useState('');
  const [cuentaComoVisita, setCuentaComoVisita] = useState<boolean | null>(null);
  const [hayChangioComponente, setHayChangioComponente] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [activo, setActivo] = useState<any>(null);
  const [cargandoActivo, setCargandoActivo] = useState(false);
  const [ticketCodigo, setTicketCodigo] = useState<string>('');
  const [usuarioNombreTicket, setUsuarioNombreTicket] = useState<string>('');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [destinatariosSeleccionados, setDestinatariosSeleccionados] = useState<string[]>([]);
  const [mostrarSelectorUsuarios, setMostrarSelectorUsuarios] = useState(false);
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [ticketsResueltosDia, setTicketsResueltosDia] = useState<Ticket[]>([]);
  const [ticketsResueltosSeleccionados, setTicketsResueltosSeleccionados] = useState<number[]>([]);
  const [cierreImages, setCierreImages] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cargandoTicketsResueltos, setCargandoTicketsResueltos] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setMostrarSelectorUsuarios(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!visita.empresaId) return;
    setCargandoUsuarios(true);
    getUsuariosByEmpresa(visita.empresaId)
      .then((data) => setUsuarios(data.filter((u) => u.activo)))
      .catch(() => setUsuarios([]))
      .finally(() => setCargandoUsuarios(false));
  }, [visita.empresaId]);

  useEffect(() => {
    const cargarTicketsResueltosMismaFecha = async () => {
      if (!cuentaComoVisita || !visita.empresaId || !visita.fechaProgramada) {
        setTicketsResueltosDia([]);
        setTicketsResueltosSeleccionados([]);
        return;
      }

      setCargandoTicketsResueltos(true);
      try {
        const fechaBase = new Date(visita.fechaProgramada);
        const fechaInicio = new Date(fechaBase);
        fechaInicio.setHours(0, 0, 0, 0);
        const fechaFin = new Date(fechaBase);
        fechaFin.setHours(23, 59, 59, 999);

        const empresaIdNum = Number(visita.empresaId);
        const resp = await getTickets(
          {
            empresaId: Number.isFinite(empresaIdNum) ? empresaIdNum : undefined,
            estado: 'RESUELTO',
            fechaDesde: fechaInicio.toISOString(),
            fechaHasta: fechaFin.toISOString(),
          },
          1,
          200,
        );

        const tickets = Array.isArray(resp?.tickets) ? resp.tickets : [];
        setTicketsResueltosDia(tickets);
        setTicketsResueltosSeleccionados(tickets.map((t) => Number(t.id)).filter((id) => Number.isInteger(id) && id > 0));
      } catch (err) {
        console.error('Error cargando tickets resueltos del día:', err);
        setTicketsResueltosDia([]);
        setTicketsResueltosSeleccionados([]);
      } finally {
        setCargandoTicketsResueltos(false);
      }
    };

    cargarTicketsResueltosMismaFecha();
  }, [cuentaComoVisita, visita.empresaId, visita.fechaProgramada]);

  // Helpers para imágenes
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const processFile = async (file: File): Promise<File> => {
    if (file.size <= 2 * 1024 * 1024) return file;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = (e) => reject(e);
      i.src = URL.createObjectURL(file);
    });

    const maxSide = 1280;
    let { width, height } = img;
    if (Math.max(width, height) > maxSide) {
      const ratio = maxSide / Math.max(width, height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not supported');
    ctx.drawImage(img, 0, 0, width, height);

    const outType = file.type === 'image/png' ? 'image/png' : 'image/webp';
    let quality = 0.8;

    let blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve as any, outType, quality));
    if (!blob) throw new Error('Failed to compress image');

    let outBlob = blob;
    while (outBlob.size > 2 * 1024 * 1024 && quality > 0.3) {
      quality -= 0.15;
      // eslint-disable-next-line no-await-in-loop
      const b = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve as any, outType, quality));
      if (b) outBlob = b;
      else break;
    }

    const newName = file.name.replace(/\.[^.]+$/, '') + (outType === 'image/webp' ? '.webp' : file.name.match(/\.[^.]+$/)?.[0] || '.jpg');
    return new File([outBlob], newName, { type: outType });
  };

  const handleImageInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const list = Array.from(files);
    const newImages: File[] = [];
    const newPreviews: string[] = [];

    for (const f of list) {
      if (newImages.length + cierreImages.length >= 3) break;
      if (!allowedTypes.includes(f.type)) {
        onError('Formato no permitido. Solo JPG, PNG y WEBP.');
        continue;
      }

      try {
        let processed = f;
        if (f.size > 2 * 1024 * 1024 || Math.max((await getImageDimensions(f)).width, (await getImageDimensions(f)).height) > 1280) {
          processed = await processFile(f);
        }
        newImages.push(processed);
        newPreviews.push(URL.createObjectURL(processed));
      } catch (err) {
        console.error('Error procesando imagen:', err);
        onError('Error procesando imagen');
      }
    }

    setCierreImages((prev) => {
      const merged = [...prev, ...newImages].slice(0, 3);
      return merged;
    });
    setPreviewImages((prev) => {
      const merged = [...prev, ...newPreviews].slice(0, 3);
      return merged;
    });
    // Reset input safely using ref if available
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    } else if (e.currentTarget) {
      try { e.currentTarget.value = ''; } catch (e) { /* ignore */ }
    }
  };

  const removeImageAt = (index: number) => {
    setCierreImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleTicketResuelto = (ticketId: number) => {
    setTicketsResueltosSeleccionados((prev) =>
      prev.includes(ticketId) ? prev.filter((id) => id !== ticketId) : [...prev, ticketId]
    );
  };

  const toggleDestinatario = (correo: string) => {
    setDestinatariosSeleccionados((prev) =>
      prev.includes(correo) ? prev.filter((c) => c !== correo) : [...prev, correo]
    );
  };

  const toBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const generarResumenVisitaPdfBase64 = async () => {
    const pdfDoc = await PDFDocument.create();
    const W = 595.28;
    const H = 841.89;
    const page = pdfDoc.addPage([W, H]);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // ── Colores ──
    const blue      = rgb(0.05, 0.25, 0.55);   // #0D4090
    const blueDark  = rgb(0.04, 0.18, 0.42);   // #0A2E6B
    const blueLight = rgb(0.88, 0.93, 0.98);   // #E0EDFA
    const blueMid   = rgb(0.17, 0.45, 0.78);   // #2C73C7
    const gray      = rgb(0.3, 0.3, 0.3);
    const grayLight = rgb(0.55, 0.55, 0.55);
    const white     = rgb(1, 1, 1);
    const green     = rgb(0.05, 0.55, 0.3);
    const red       = rgb(0.7, 0.15, 0.15);

    const MX = 40; // margen horizontal
    const contentW = W - MX * 2;

    // ── Logo (intenta cargar, no bloquea si falla) ──
    let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
    try {
      const logoResp = await fetch('/logo.png');
      const logoBytes = new Uint8Array(await logoResp.arrayBuffer());
      logoImage = await pdfDoc.embedPng(logoBytes);
    } catch {
      try {
        const logoResp = await fetch('/logo.png');
        const logoBytes = new Uint8Array(await logoResp.arrayBuffer());
        logoImage = await pdfDoc.embedJpg(logoBytes);
      } catch { /* sin logo */ }
    }

    // ── Header band ──
    const headerH = 72;
    page.drawRectangle({ x: 0, y: H - headerH, width: W, height: headerH, color: blue });

    if (logoImage) {
      const logoDim = logoImage.scaleToFit(44, 44);
      const logoX = MX;
      const logoY = H - headerH + (headerH - logoDim.height) / 2;
      // Fondo blanco redondeado detrás del logo para que se vea sobre la banda azul
      const logoBgSize = 50;
      const logoBgX = logoX - 3;
      const logoBgY = logoY - 3;
      page.drawRectangle({ x: logoBgX, y: logoBgY, width: logoBgSize, height: logoBgSize, color: white, borderColor: rgb(0.85, 0.9, 0.97), borderWidth: 1 });
      page.drawImage(logoImage, { x: logoX, y: logoY, width: logoDim.width, height: logoDim.height });
    }

    const titleX = logoImage ? MX + 54 : MX;
    page.drawText('REPORTE DE CIERRE DE VISITA', { x: titleX, y: H - 36, size: 16, font: fontBold, color: white });
    page.drawText(`Generado: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`, {
      x: titleX, y: H - 54, size: 9, font: fontRegular, color: rgb(0.78, 0.88, 1),
    });

    // ── Datos disponibles ──
    const fechaVisita = new Date(visita.fechaProgramada).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const tecEncargado = visita.tecnicosAsignados.find((t) => t.esEncargado)?.tecnicoNombre || 'N/A';
    const empresaNombre = visita.empresaNombre || 'N/A';
    const sedeNombre = visita.sedeNombre || 'N/A';
    const tipoVisitaFormateado = visita.tipoVisita.replace(/_/g, ' ');
    const ticketNumero = ticketCodigo || visita.ticketNumero || visita.ticketId || 'N/A';
    const activoNombre = activo?.activo_codigo || activo?.assetId || activo?.codigo || visita.activoNombre || 'N/A';
    const usuarioActivo = usuarioNombreTicket || activo?.usuario_nombre || visita.usuarioTicketNombre || 'N/A';

    let y = H - headerH - 24;

    // ── Helpers ──
    const drawSectionTitle = (title: string, yPos: number) => {
      page.drawRectangle({ x: MX, y: yPos - 4, width: contentW, height: 22, color: blueDark });
      page.drawText(title.toUpperCase(), { x: MX + 10, y: yPos + 2, size: 9, font: fontBold, color: white });
      return yPos - 30;
    };

    const drawRow = (label: string, value: string, yPos: number, highlight = false) => {
      if (highlight) {
        page.drawRectangle({ x: MX, y: yPos - 5, width: contentW, height: 20, color: blueLight });
      }
      page.drawText(label, { x: MX + 10, y: yPos, size: 9.5, font: fontBold, color: blueMid });
      // Truncar valores largos y manejar multilínea para observaciones
      const maxLen = 72;
      const displayVal = value.length > maxLen ? value.slice(0, maxLen) + '...' : value;
      page.drawText(displayVal, { x: MX + 190, y: yPos, size: 9.5, font: fontRegular, color: gray });
      return yPos - 22;
    };

    const drawBadge = (label: string, value: boolean, yPos: number) => {
      page.drawText(label, { x: MX + 10, y: yPos, size: 9.5, font: fontBold, color: blueMid });
      const badgeColor = value ? green : red;
      const badgeText = value ? '  SÍ  ' : '  NO  ';
      const badgeW = fontBold.widthOfTextAtSize(badgeText, 9) + 12;
      page.drawRectangle({ x: MX + 190, y: yPos - 4, width: badgeW, height: 16, color: badgeColor, borderColor: badgeColor, borderWidth: 0 });
      // Rounded corners not natively supported, so we use a filled rect
      page.drawText(badgeText, { x: MX + 196, y: yPos, size: 9, font: fontBold, color: white });
      return yPos - 24;
    };

    // ══════════════════════════════════════════════════════
    // SECCIÓN 1: Información General
    // ══════════════════════════════════════════════════════
    y = drawSectionTitle('Información General', y);
    y = drawRow('Empresa', empresaNombre, y, true);
    y = drawRow('Sede', sedeNombre, y, false);
    y = drawRow('Tipo de Visita', tipoVisitaFormateado, y, true);
    y = drawRow('Fecha Programada', fechaVisita, y, false);
    if (visita.horaProgramada) {
      y = drawRow('Hora Programada', visita.horaProgramada, y, true);
    }

    // Línea separadora
    y -= 6;
    page.drawLine({ start: { x: MX, y }, end: { x: W - MX, y }, thickness: 0.5, color: rgb(0.82, 0.86, 0.92) });
    y -= 16;

    // ══════════════════════════════════════════════════════
    // SECCIÓN 2: Ticket & Activo
    // ══════════════════════════════════════════════════════
    if (visita.tipoVisita === 'POR_TICKET' || visita.ticketId) {
      y = drawSectionTitle('Información del Ticket', y);
      y = drawRow('N° de Ticket', ticketNumero, y, true);
      y = drawRow('Activo Asociado', activoNombre, y, false);
      y = drawRow('Usuario Asignado', usuarioActivo, y, true);

      y -= 6;
      page.drawLine({ start: { x: MX, y }, end: { x: W - MX, y }, thickness: 0.5, color: rgb(0.82, 0.86, 0.92) });
      y -= 16;
    }

    // ══════════════════════════════════════════════════════
    // SECCIÓN 3: Equipo Técnico
    // ══════════════════════════════════════════════════════
    y = drawSectionTitle('Equipo Técnico', y);
    y = drawRow('Técnico Encargado', tecEncargado, y, true);
    if (visita.tecnicosAsignados.length > 1) {
      const otros = visita.tecnicosAsignados.filter((t) => !t.esEncargado).map((t) => t.tecnicoNombre).join(', ');
      y = drawRow('Técnicos de Apoyo', otros || '-', y, false);
    }
    y = drawRow('Total de Técnicos', String(visita.tecnicosAsignados.length), y, false);

    y -= 6;
    page.drawLine({ start: { x: MX, y }, end: { x: W - MX, y }, thickness: 0.5, color: rgb(0.82, 0.86, 0.92) });
    y -= 16;

    // ══════════════════════════════════════════════════════
    // SECCIÓN 4: Resultado de la Visita
    // ══════════════════════════════════════════════════════
    y = drawSectionTitle('Resultado de la Visita', y);
    y = drawBadge('Visita Contractual', cuentaComoVisita ?? false, y);
    y = drawBadge('Cambio de Componente', hayChangioComponente ?? false, y);

    y -= 6;
    page.drawLine({ start: { x: MX, y }, end: { x: W - MX, y }, thickness: 0.5, color: rgb(0.82, 0.86, 0.92) });
    y -= 16;

    // ══════════════════════════════════════════════════════
    // SECCIÓN 5: Diagnóstico / Resolución / Recomendación
    // ══════════════════════════════════════════════════════
    const maxCharsPerLine = 75;
    const drawFieldBox = (label: string, text: string) => {
      y = drawSectionTitle(label, y);
      const fieldText = text.trim() || 'No especificado.';
      const fieldBoxH = Math.max(36, Math.ceil(fieldText.length / maxCharsPerLine) * 14 + 18);
      page.drawRectangle({ x: MX, y: y - fieldBoxH + 14, width: contentW, height: fieldBoxH, color: blueLight, borderColor: rgb(0.78, 0.85, 0.95), borderWidth: 1 });
      const fieldLines: string[] = [];
      for (let i = 0; i < fieldText.length; i += maxCharsPerLine) {
        fieldLines.push(fieldText.slice(i, i + maxCharsPerLine));
      }
      let fieldY = y;
      for (const line of fieldLines.slice(0, 4)) {
        page.drawText(line, { x: MX + 10, y: fieldY, size: 9.5, font: fontRegular, color: gray });
        fieldY -= 14;
      }
      if (fieldLines.length > 4) {
        page.drawText('...', { x: MX + 10, y: fieldY, size: 9.5, font: fontRegular, color: grayLight });
      }
      y = y - fieldBoxH - 6;
    };

    drawFieldBox('Diagnóstico', diagnostico);
    drawFieldBox('Resolución', resolucion);
    drawFieldBox('Recomendación', recomendacion);

    // ── Footer ──
    const footerY = 32;
    page.drawLine({ start: { x: MX, y: footerY + 16 }, end: { x: W - MX, y: footerY + 16 }, thickness: 0.5, color: rgb(0.82, 0.86, 0.92) });
    page.drawText('Documento generado automáticamente por el Sistema de Gestión IntisCorp', {
      x: MX, y: footerY, size: 7.5, font: fontRegular, color: grayLight,
    });
    page.drawText(`Fecha de generación: ${new Date().toLocaleString('es-ES')}`, {
      x: W - MX - fontRegular.widthOfTextAtSize(`Fecha de generación: ${new Date().toLocaleString('es-ES')}`, 7.5),
      y: footerY, size: 7.5, font: fontRegular, color: grayLight,
    });

    const bytes = await pdfDoc.save();
    return toBase64(bytes);
  };

  const getTecnicoFinalizadorId = () => {
    const parsed = Number(user?.id);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
  };

  const getVisitaIdValido = () => {
    const rawId = (visita as any)?._id ?? (visita as any)?.id;
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
  };

  useEffect(() => {
    const cargarActivo = async () => {
      if (visita.tipoVisita !== 'POR_TICKET' || !visita.ticketId) return;
      setCargandoActivo(true);
      try {
        const ticketId = Number(visita.ticketId);
        const ticket = await getTicketById(ticketId);
        console.log('✅ Ticket obtenido:', ticket);
        console.log('📌 Datos de empresa/sede:', { empresa_id: ticket?.empresa_id, sede_id: ticket?.sede_id });

        // Guardar codigo_ticket y usuario_nombre para el PDF
        if (ticket.codigo_ticket) setTicketCodigo(ticket.codigo_ticket);
        if (ticket.activos && ticket.activos.length > 0) {
          const activoDelTicket = ticket.activos[0];
          const activoEnriquecido = { ...activoDelTicket, empresa_id: ticket.empresa_id, sede_id: ticket.sede_id };
          console.log('📦 Activo del ticket enriquecido:', activoEnriquecido);
          setActivo(activoEnriquecido);
          // usuario_nombre viene en el activo del ticket
          const nombreUsuario = (activoDelTicket as unknown as Record<string, unknown>).usuario_nombre as string || (ticket as unknown as Record<string, unknown>).usuario_nombre as string || '';
          if (nombreUsuario) setUsuarioNombreTicket(nombreUsuario);
        }
      } catch (error) {
        console.error('Error cargando activo:', error);
      } finally {
        setCargandoActivo(false);
      }
    };
    cargarActivo();
  }, [visita]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!diagnostico.trim() || !resolucion.trim() || !recomendacion.trim()) { onError('Completa Diagnóstico, Resolución y Recomendación para finalizar la visita'); return; }
    if (cuentaComoVisita === null) { onError('Debes indicar si cuenta como visita contractual'); return; }
    if (hayChangioComponente === null) { onError('Debes indicar si se realizó cambio de componente'); return; }

    const tecnicoFinalizadorId = getTecnicoFinalizadorId();
    if (tecnicoFinalizadorId === null) { onError('No se pudo identificar el técnico finalizador. Vuelve a iniciar sesión.'); return; }

    const visitaId = getVisitaIdValido();
    if (visitaId === null) { onError('No se encontró el ID de la visita a finalizar'); return; }

    setLoading(true);
    try {
      const resumenClausura = [
        `Diagnóstico: ${diagnostico.trim()}`,
        `Resolución: ${resolucion.trim()}`,
        `Recomendación: ${recomendacion.trim()}`,
      ].join('\n\n');

      const payload: FinalizarVisitaPayload & { ticketsResueltosAsociados?: number[]; diagnostico?: string; resolucion?: string; recomendacion?: string; kb_entry_id?: string } = {
        fechaFinalizacion: new Date().toISOString(),
        tecnicoFinalizadorId,
        notasFinalizacion: resumenClausura,
        observacionesClausura: resumenClausura,
        diagnostico: diagnostico.trim(),
        resolucion: resolucion.trim(),
        recomendacion: recomendacion.trim(),
        cuentaComoVisitaContractual: cuentaComoVisita,
        huboCambioComponente: hayChangioComponente,
        ...(kbEntryId ? { kb_entry_id: kbEntryId } : {}),
        ...(destinatariosSeleccionados.length > 0 && { destinatariosCorreo: destinatariosSeleccionados }),
        ...(cuentaComoVisita && ticketsResueltosSeleccionados.length > 0 && { ticketsResueltosAsociados: ticketsResueltosSeleccionados }),
      };

      // If there are images, send them as multipart via visitasService.finalizarVisita
      const response = await finalizarVisita(String(visitaId), payload, cierreImages.length > 0 ? cierreImages : undefined);
      const visitaFinalizada = response.data || response;

      if (destinatariosSeleccionados.length > 0) {
        try {
          const pdfBase64 = await generarResumenVisitaPdfBase64();
          await enviarResumenVisitaCorreo(String(visitaId), {
            destinatarios: destinatariosSeleccionados,
            pdfBase64,
            pdfFileName: `resumen-visita-${visita._id}.pdf`,
            resumen: {
              fechaVisita: new Date(visita.fechaProgramada).toLocaleDateString('es-ES'),
              tecnicoEncargado: visita.tecnicosAsignados.find((t) => t.esEncargado)?.tecnicoNombre || 'N/A',
              observacionesClausura: `Diagnóstico: ${diagnostico.trim()}\nResolución: ${resolucion.trim()}\nRecomendación: ${recomendacion.trim()}`,
              cuentaComoVisitaContractual: cuentaComoVisita ? 'Si' : 'No',
              huboCambioComponente: hayChangioComponente ? 'Si' : 'No',
            },
          });
        } catch (correoError) {
          console.error('No se pudo enviar correo de cierre de visita:', correoError);
          onError('La visita se finalizo correctamente, pero no se pudo enviar el correo con el resumen PDF.');
        }
      }

      // Si la visita proviene de un ticket y hay imágenes, enviarlas también al endpoint del ticket
      if (visita.ticketId && cierreImages.length > 0) {
        try {
          const ticket = await getTicketById(Number(visita.ticketId));
          const ticketIdNum = Number(ticket.id ?? ticket._id ?? ticket.ticketId ?? visita.ticketId);
            if (Number.isInteger(ticketIdNum) && ticketIdNum > 0) {
            const payloadForTicket: any = {
              motivo: 'Imágenes adjuntas desde Finalizar Visita',
              diagnostico: diagnostico.trim(),
              resolucion: resolucion.trim(),
              recomendacion: recomendacion.trim(),
              ...(kbEntryId ? { kb_entry_id: kbEntryId } : {}),
            };
            try {
              // Marcar el ticket como RESUELTO y enviar las imágenes para que se guarden en ticket_imagenes_cierre
              await cambiarEstadoConImagenes(ticketIdNum, 'RESUELTO', payloadForTicket, cierreImages);
            } catch (imgErr) {
              console.error('Error enviando imágenes al endpoint de ticket:', imgErr);
              onError('La visita se finalizó, pero no se pudieron guardar las imágenes en el ticket.');
            }
          }
        } catch (e) {
          console.error('No se pudo obtener ticket para adjuntar imágenes:', e);
        }
      }

      onVisitaFinalizada(visitaFinalizada);
      onClose();
    } catch (error: any) {
      console.error('Error finalizing visita:', error);
      onError(error.message || 'Error al finalizar la visita');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const tecnicoEncargado = visita.tecnicosAsignados.find((t) => t.esEncargado)?.tecnicoNombre || 'N/A';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(15, 30, 60, 0.65)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-blue-100">

        {/* ── HEADER ── */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 px-6 py-4 flex items-center justify-between shrink-0">
          {/* Logo + título */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden shrink-0 border border-white/30">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-8 h-8 object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-widest leading-none mb-0.5">Gestión de Visitas</p>
              <h2 className="text-white text-lg font-extrabold tracking-tight leading-tight">Finalizar Visita</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors border border-white/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5" style={{ background: 'linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%)' }}>

            {/* Información de la Visita */}
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-sky-500 flex items-center gap-2">
                <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Información de la Visita</h3>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                {[
                  { label: 'Fecha Programada', value: formatDate(visita.fechaProgramada) },
                  { label: 'Tipo de Visita',   value: visita.tipoVisita },
                  { label: 'Técnico Encargado', value: tecnicoEncargado },
                  { label: 'Nº de Técnicos',   value: String(visita.tecnicosAsignados.length) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-blue-50/60 rounded-xl px-3 py-2.5 border border-blue-100">
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-sm font-bold text-blue-900 capitalize">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Diagnóstico / Resolución / Recomendación */}
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-sky-500 to-cyan-500 flex items-center gap-2">
                <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Cierre de Visita</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Diagnóstico <span className="text-rose-500">*</span></label>
                  <textarea
                    value={diagnostico}
                    onChange={(e) => setDiagnostico(e.target.value)}
                    placeholder="Describe el diagnóstico identificado..."
                    rows={3}
                    className="w-full px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 border-2 border-blue-100 rounded-xl bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 resize-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Resolución <span className="text-rose-500">*</span></label>
                  <textarea
                    value={resolucion}
                    onChange={(e) => setResolucion(e.target.value)}
                    placeholder="Describe la resolución aplicada..."
                    rows={3}
                    className="w-full px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 border-2 border-blue-100 rounded-xl bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 resize-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Recomendación <span className="text-rose-500">*</span></label>
                  <textarea
                    value={recomendacion}
                    onChange={(e) => setRecomendacion(e.target.value)}
                    placeholder="Agrega recomendaciones para evitar recurrencia..."
                    rows={3}
                    className="w-full px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 border-2 border-blue-100 rounded-xl bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 resize-none transition-colors"
                  />
                </div>
                {/* Imágenes de cierre */}
                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Adjuntar imágenes <span className="text-xs font-medium text-slate-400">(opcional)</span></label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      type="file"
                      multiple
                      ref={fileInputRef}
                      onChange={handleImageInput}
                      disabled={cierreImages.length >= 3}
                      className="text-sm"
                    />
                    <div className="text-xs text-slate-500">{cierreImages.length} / 3 imágenes</div>
                  </div>

                  {previewImages.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {previewImages.map((src, i) => (
                        <div key={i} className="relative">
                          <img src={src} onClick={() => setLightboxIndex(i)} className="w-full h-20 object-cover rounded-md cursor-pointer border border-slate-100" />
                          <button onClick={() => removeImageAt(i)} type="button" className="absolute -top-1 -right-1 bg-rose-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Visita Contractual */}
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-blue-700 to-blue-500 flex items-center gap-2">
                <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">¿Cuenta como visita contractual?</h3>
              </div>
              <div className="p-4 flex gap-4">
                {[
                  { value: true,  label: 'Sí, cuenta',    icon: '✓', activeClass: 'border-emerald-400 bg-emerald-50 text-emerald-800', dotClass: 'bg-emerald-500' },
                  { value: false, label: 'No, no cuenta',  icon: '✕', activeClass: 'border-rose-300 bg-rose-50 text-rose-800',         dotClass: 'bg-rose-500' },
                ].map((opt) => (
                  <label key={String(opt.value)} className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${cuentaComoVisita === opt.value ? opt.activeClass : 'border-blue-100 bg-blue-50/40 text-slate-600 hover:border-blue-300'}`}>
                    <input
                      type="radio"
                      name="cuentaComoVisita"
                      checked={cuentaComoVisita === opt.value}
                      onChange={() => setCuentaComoVisita(opt.value)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${cuentaComoVisita === opt.value ? `${opt.dotClass} border-transparent` : 'border-slate-300'}`}>
                      {cuentaComoVisita === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm font-bold">{opt.label}</span>
                  </label>
                ))}
              </div>

              {cuentaComoVisita === false && (
                <div className="mx-4 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-semibold text-amber-800">Esta visita no se contabilizará como parte del compromiso contractual, pero quedará registrada en el historial.</p>
                </div>
              )}

              {cuentaComoVisita === true && (
                <div className="mx-4 mb-4 bg-emerald-50 border border-emerald-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-emerald-100 border-b border-emerald-200 flex items-center justify-between">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Tickets Resueltos de la Fecha</p>
                    {cargandoTicketsResueltos && (
                      <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1.5">
                        <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                        Cargando...
                      </span>
                    )}
                  </div>
                  <div className="p-3 space-y-2 max-h-44 overflow-y-auto">
                    {!cargandoTicketsResueltos && ticketsResueltosDia.length === 0 && (
                      <p className="text-sm font-semibold text-emerald-800">No se encontraron tickets resueltos para esta fecha.</p>
                    )}
                    {ticketsResueltosDia.map((t) => {
                      const idNum = Number(t.id);
                      const checked = ticketsResueltosSeleccionados.includes(idNum);
                      return (
                        <label key={idNum} className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${checked ? 'bg-white border-emerald-300' : 'bg-emerald-50/60 border-emerald-200 hover:bg-white'}`}>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => toggleTicketResuelto(idNum)}
                          />
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-emerald-600 border-emerald-600' : 'border-emerald-400'}`}>
                            {checked && (
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-emerald-900 truncate">{t.codigo_ticket || `#${t.id}`}</p>
                            <p className="text-xs font-medium text-emerald-700 truncate">{t.titulo || 'Sin título'}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Cambio de Componente */}
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center gap-2">
                <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">¿Se realizó algún cambio de componente?</h3>
              </div>
              <div className="p-4 flex gap-4">
                {[
                  { value: true,  label: 'Sí, hay cambio',  activeClass: 'border-blue-400 bg-blue-50 text-blue-800',   dotClass: 'bg-blue-600' },
                  { value: false, label: 'No, sin cambios', activeClass: 'border-slate-300 bg-slate-50 text-slate-700', dotClass: 'bg-slate-500' },
                ].map((opt) => (
                  <label key={String(opt.value)} className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${hayChangioComponente === opt.value ? opt.activeClass : 'border-blue-100 bg-blue-50/40 text-slate-600 hover:border-blue-300'}`}>
                    <input
                      type="radio"
                      name="hayChangioComponente"
                      checked={hayChangioComponente === opt.value}
                      onChange={() => setHayChangioComponente(opt.value)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${hayChangioComponente === opt.value ? `${opt.dotClass} border-transparent` : 'border-slate-300'}`}>
                      {hayChangioComponente === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm font-bold">{opt.label}</span>
                  </label>
                ))}
              </div>

              {/* Activo asociado */}
              {hayChangioComponente === true && (
                <div className="mx-4 mb-4 bg-blue-50 rounded-xl border border-blue-200 p-4">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Componente Cambiado</p>
                  {cargandoActivo ? (
                    <div className="flex items-center gap-2 text-blue-700">
                      <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                      <span className="text-sm font-semibold">Cargando activo...</span>
                    </div>
                  ) : activo ? (
                    <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-blue-200 shadow-sm">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2"/>
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Código del Activo</p>
                          <p className="text-base font-extrabold text-blue-900 truncate">{activo.activo_codigo || activo.assetId || activo.codigo || activo.id}</p>
                          {activo.categoria && <p className="text-xs font-semibold text-blue-600 mt-0.5">{activo.categoria}</p>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { if (activo?.activo_id && onAbrirModalEditarActivo) onAbrirModalEditarActivo(activo); }}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shrink-0"
                      >
                        Editar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl">
                      <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm font-semibold text-amber-800">No hay activos registrados para este ticket.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notificación por correo */}
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-sky-600 to-blue-500 flex items-center gap-2">
                <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Notificación por correo</h3>
              </div>
              <div className="p-4 space-y-3" ref={selectorRef}>

                {/* Chips */}
                {destinatariosSeleccionados.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {destinatariosSeleccionados.map((correo) => {
                      const u = usuarios.find((usr) => (usr.correoPrincipal || usr.correo) === correo);
                      return (
                        <span key={correo} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold pl-3 pr-1.5 py-1 rounded-full border border-blue-200">
                          {u?.nombreCompleto || correo}
                          <button
                            type="button"
                            onClick={() => toggleDestinatario(correo)}
                            className="ml-0.5 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                            aria-label="Quitar"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Botón trigger */}
                <button
                  type="button"
                  onClick={() => setMostrarSelectorUsuarios((v) => !v)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 border-2 rounded-xl text-sm font-bold transition-all ${
                    mostrarSelectorUsuarios
                      ? 'border-blue-400 bg-blue-50 text-blue-800'
                      : 'border-blue-100 bg-blue-50/40 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {destinatariosSeleccionados.length > 0
                      ? `${destinatariosSeleccionados.length} usuario${destinatariosSeleccionados.length > 1 ? 's' : ''} seleccionado${destinatariosSeleccionados.length > 1 ? 's' : ''}`
                      : 'Seleccionar destinatarios...'}
                  </span>
                  <svg className={`w-4 h-4 text-blue-400 transition-transform ${mostrarSelectorUsuarios ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Panel desplegable */}
                {mostrarSelectorUsuarios && (
                  <div className="border-2 border-blue-100 rounded-xl overflow-hidden shadow-md bg-white">
                    <div className="p-2.5 bg-blue-50 border-b border-blue-100">
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          value={busquedaUsuario}
                          onChange={(e) => setBusquedaUsuario(e.target.value)}
                          placeholder="Buscar por nombre o correo..."
                          autoFocus
                          className="w-full pl-9 pr-3 py-2 text-sm font-medium text-slate-800 placeholder-slate-400 border-2 border-blue-100 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                        />
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto divide-y divide-blue-50">
                      {cargandoUsuarios ? (
                        <div className="p-4 flex items-center gap-2 text-blue-600">
                          <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin inline-block"></span>
                          <span className="text-sm font-semibold">Cargando usuarios...</span>
                        </div>
                      ) : (() => {
                        const filtrados = usuarios.filter((u) => {
                          const q = busquedaUsuario.toLowerCase();
                          return (
                            u.nombreCompleto.toLowerCase().includes(q) ||
                            (u.correoPrincipal || u.correo).toLowerCase().includes(q)
                          );
                        });
                        if (filtrados.length === 0) {
                          return <p className="p-4 text-sm font-semibold text-slate-500 text-center">No se encontraron usuarios.</p>;
                        }
                        return filtrados.map((u) => {
                          const correo = u.correoPrincipal || u.correo;
                          const uid = String(u.id || u._id);
                          const checked = destinatariosSeleccionados.includes(correo);
                          return (
                            <label key={uid} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                {checked && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <input type="checkbox" checked={checked} onChange={() => toggleDestinatario(correo)} className="sr-only" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate">{u.nombreCompleto}</p>
                                <p className="text-xs font-medium text-slate-400 truncate">{correo}</p>
                              </div>
                            </label>
                          );
                        });
                      })()}
                    </div>
                    <div className="px-4 py-2.5 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-600">
                        {destinatariosSeleccionados.length} seleccionado{destinatariosSeleccionados.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMostrarSelectorUsuarios(false)}
                        className="text-xs font-bold text-blue-700 hover:text-blue-900 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── FOOTER FIJO ── */}
          <div className="shrink-0 px-6 py-4 bg-white border-t border-blue-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 border-2 border-blue-200 text-blue-700 rounded-xl hover:bg-blue-50 hover:border-blue-400 font-bold text-sm transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || cuentaComoVisita === null || hayChangioComponente === null}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-xl hover:from-blue-700 hover:to-sky-600 font-bold text-sm transition-all shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
              )}
              {loading ? 'Finalizando...' : 'Finalizar Visita'}
            </button>
          </div>
        </form>
      </div>
      {lightboxIndex !== null && previewImages[lightboxIndex] && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70" onClick={() => setLightboxIndex(null)}>
          <img src={previewImages[lightboxIndex]} className="max-h-[90vh] max-w-[90vw] rounded-md shadow-lg" />
        </div>
      )}
    </div>
  );
}
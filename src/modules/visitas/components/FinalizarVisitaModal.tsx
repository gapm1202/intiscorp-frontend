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
  const scrollBodyRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef(0);
  const [cargandoTicketsResueltos, setCargandoTicketsResueltos] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const toDateKey = (value?: string | Date | null): string | null => {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getTicketDateKey = (t: Ticket): string | null => {
    const raw = (t as any)?.fecha_resolucion
      || (t as any)?.fechaResolucion
      || (t as any)?.fecha_cierre
      || (t as any)?.fechaCierre
      || (t as any)?.fecha_actualizacion
      || (t as any)?.fechaActualizacion
      || (t as any)?.fecha_creacion
      || (t as any)?.fechaCreacion
      || null;
    return toDateKey(raw);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setMostrarSelectorUsuarios(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mantiene estable la posición del contenedor principal ante re-renders de secciones dinámicas.
  useEffect(() => {
    const node = scrollBodyRef.current;
    if (!node) return;
    const rafId = requestAnimationFrame(() => {
      if (scrollBodyRef.current) {
        scrollBodyRef.current.scrollTop = lastScrollTopRef.current;
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [
    cuentaComoVisita,
    hayChangioComponente,
    mostrarSelectorUsuarios,
    ticketsResueltosSeleccionados,
    destinatariosSeleccionados,
  ]);

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
      const esPorTicket = visita.tipoVisita === 'POR_TICKET' || Boolean(visita.ticketId);
      if (!cuentaComoVisita || !esPorTicket || !visita.empresaId || !visita.fechaProgramada) {
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
        const visitaDateKey = toDateKey(visita.fechaProgramada);
        const ticketsMismaFecha = visitaDateKey
          ? tickets.filter((t) => getTicketDateKey(t) === visitaDateKey)
          : tickets;

        setTicketsResueltosDia(ticketsMismaFecha);
        setTicketsResueltosSeleccionados(
          ticketsMismaFecha
            .map((t) => Number(t.id))
            .filter((id) => Number.isInteger(id) && id > 0)
        );
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

  // ─────────────────────────────────────────────────────────────────
  //  PDF GENERATION — rediseñado completamente
  // ─────────────────────────────────────────────────────────────────
  const generarResumenVisitaPdfBase64 = async () => {
    const pdfDoc = await PDFDocument.create();
    const W = 595.28;
    const H = 841.89;

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic  = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // ── Paleta azul-celeste / blanco ──
    const C = {
      navy:       rgb(0.06, 0.20, 0.42),   // #0F3469 — encabezado oscuro
      sky:        rgb(0.12, 0.53, 0.90),   // #1E87E5 — acento celeste
      skyLight:   rgb(0.82, 0.92, 0.98),   // #D1EBF9 — fondo suave
      skyMid:     rgb(0.55, 0.78, 0.94),   // #8CC7EF — borde / divisor
      white:      rgb(1, 1, 1),
      offWhite:   rgb(0.97, 0.98, 0.99),   // #F7FAFD — filas alternas
      textDark:   rgb(0.13, 0.18, 0.28),   // #222D47
      textMid:    rgb(0.35, 0.42, 0.54),   // #596A8A
      textLight:  rgb(0.58, 0.65, 0.75),   // #94A6BF
      green:      rgb(0.10, 0.60, 0.36),   // #19994B
      greenBg:    rgb(0.88, 0.97, 0.92),   // #E1F7EB
      red:        rgb(0.76, 0.18, 0.22),   // #C22E38
      redBg:      rgb(0.99, 0.90, 0.90),   // #FCE6E6
    };

    const MX    = 44;           // margen lateral
    const CW    = W - MX * 2;  // ancho de contenido
    const HDR_H = 80;           // altura del encabezado
    const FTR_H = 36;           // altura del pie
    const BODY_TOP = H - HDR_H - 16;
    const BODY_BOTTOM = FTR_H + 16;

    // ── Logo ──
    let logoImage: any = null;
    try {
      const logoResp = await fetch('/logo.png');
      const logoBytes = new Uint8Array(await logoResp.arrayBuffer());
      try { logoImage = await pdfDoc.embedPng(logoBytes); }
      catch { logoImage = await pdfDoc.embedJpg(logoBytes); }
    } catch { /* sin logo */ }

    // ── Estado mutable de página ──
    let page = pdfDoc.addPage([W, H]);
    let y = BODY_TOP;

    // ─── Funciones base ───────────────────────────────────────────

    const drawHeader = (pg: typeof page) => {
      // Fondo navy completo
      pg.drawRectangle({ x: 0, y: H - HDR_H, width: W, height: HDR_H, color: C.navy });
      // Barra inferior celeste
      pg.drawRectangle({ x: 0, y: H - HDR_H - 4, width: W, height: 4, color: C.sky });
      // Franja lateral izquierda celeste
      pg.drawRectangle({ x: 0, y: H - HDR_H, width: 6, height: HDR_H, color: C.sky });

      // Logo
      if (logoImage) {
        const d = logoImage.scaleToFit(44, 44);
        const lx = MX;
        const ly = H - HDR_H + (HDR_H - d.height) / 2;
        pg.drawRectangle({ x: lx - 5, y: ly - 5, width: d.width + 10, height: d.height + 10, color: C.white, borderColor: C.skyMid, borderWidth: 0.5 });
        pg.drawImage(logoImage, { x: lx, y: ly, width: d.width, height: d.height });
      }

      const tx = logoImage ? MX + 60 : MX + 14;
      pg.drawText('REPORTE DE CIERRE DE VISITA', {
        x: tx, y: H - 33, size: 16, font: fontBold, color: C.white,
      });
      pg.drawText(`Documento generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`, {
        x: tx, y: H - 51, size: 8, font: fontRegular, color: C.skyMid,
      });

      // Número de página provisional (top-right)
      const pgLabel = `Pág. ${pdfDoc.getPageCount()}`;
      pg.drawText(pgLabel, {
        x: W - MX - fontRegular.widthOfTextAtSize(pgLabel, 8),
        y: H - 42,
        size: 8, font: fontRegular, color: C.skyMid,
      });
    };

    const drawFooter = (pg: typeof page) => {
      pg.drawLine({
        start: { x: MX, y: FTR_H + 12 }, end: { x: W - MX, y: FTR_H + 12 },
        thickness: 0.6, color: C.skyMid,
      });
      pg.drawText('IntisCorp · Sistema de Gestión de Visitas', {
        x: MX, y: FTR_H - 1, size: 7, font: fontRegular, color: C.textLight,
      });
    };

    const newPage = () => {
      drawFooter(page);
      page = pdfDoc.addPage([W, H]);
      drawHeader(page);
      y = BODY_TOP;
    };

    const ensureSpace = (h: number) => { if (y - h < BODY_BOTTOM) newPage(); };

    // ─── Sección header (barra navy con texto blanco) ─────────────
    const drawSection = (title: string, icon?: string) => {
      ensureSpace(30);
      y -= 12;
      page.drawRectangle({ x: MX, y: y - 6, width: CW, height: 26, color: C.navy });
      page.drawRectangle({ x: MX, y: y - 6, width: 4, height: 26, color: C.sky });
      const label = icon ? `${icon}  ${title}` : title;
      page.drawText(label, { x: MX + 14, y: y + 4, size: 9, font: fontBold, color: C.white });
      y -= 26;
    };

    // ─── Tabla de dos columnas para datos info ────────────────────
    /**
     * rows: array de [label, value] pares
     */
    const drawInfoTable = (rows: [string, string][]) => {
      const rowH = 22;
      const colW = CW / 2;

      for (let i = 0; i < rows.length; i++) {
        const [label, value] = rows[i];
        ensureSpace(rowH + 4);
        const bg = i % 2 === 0 ? C.offWhite : C.white;
        page.drawRectangle({ x: MX, y: y - rowH + 8, width: CW, height: rowH, color: bg });
        // Borde inferior
        page.drawLine({ start: { x: MX, y: y - rowH + 8 }, end: { x: MX + CW, y: y - rowH + 8 }, thickness: 0.4, color: rgb(0.88, 0.92, 0.96) });
        // Label
        page.drawText(label.toUpperCase(), { x: MX + 10, y: y - 2, size: 7.5, font: fontBold, color: C.textMid });
        // Value
        const maxValChars = 45;
        const val = (value || '—').length > maxValChars ? value.slice(0, maxValChars) + '…' : (value || '—');
        page.drawText(val, { x: MX + colW * 0.78, y: y - 2, size: 8.5, font: fontBold, color: C.textDark });
        y -= rowH;
      }
      y -= 6;
    };

    // ─── Badge sí/no ──────────────────────────────────────────────
    const drawBadgeRow = (label: string, value: boolean, isOdd: boolean) => {
      const rowH = 24;
      ensureSpace(rowH + 4);
      const bg = isOdd ? C.offWhite : C.white;
      page.drawRectangle({ x: MX, y: y - rowH + 8, width: CW, height: rowH, color: bg });
      page.drawLine({ start: { x: MX, y: y - rowH + 8 }, end: { x: MX + CW, y: y - rowH + 8 }, thickness: 0.4, color: rgb(0.88, 0.92, 0.96) });
      page.drawText(label.toUpperCase(), { x: MX + 10, y: y - 1, size: 7.5, font: fontBold, color: C.textMid });

      // Badge pill
      const pillText = value ? '  SÍ  ' : '  NO  ';
      const pillColor = value ? C.green : C.red;
      const pillBg = value ? C.greenBg : C.redBg;
      const pillW = fontBold.widthOfTextAtSize(pillText, 8) + 8;
      const px = MX + CW * 0.6;
      page.drawRectangle({ x: px, y: y - 7, width: pillW, height: 16, color: pillBg, borderColor: pillColor, borderWidth: 0.8 });
      page.drawText(pillText, { x: px + 4, y: y - 2, size: 8, font: fontBold, color: pillColor });
      y -= rowH;
    };

    // ─── Campo de texto largo ──────────────────────────────────────
    const drawTextField = (label: string, text: string) => {
      const fieldText = (text || '').trim() || 'No especificado.';
      const maxChars = 82;
      const rawLines: string[] = [];
      for (let i = 0; i < fieldText.length; i += maxChars) rawLines.push(fieldText.slice(i, i + maxChars));
      const lines = rawLines.slice(0, 10);
      const innerH = lines.length * 13 + 12;
      const totalH = innerH + 28;

      ensureSpace(totalH + 10);
      y -= 8;

      // Label flotante
      page.drawText(label.toUpperCase(), { x: MX, y: y, size: 7.5, font: fontBold, color: C.sky });
      y -= 10;

      // Caja con fondo y borde izquierdo celeste
      page.drawRectangle({ x: MX, y: y - innerH, width: CW, height: innerH + 4, color: C.skyLight, borderColor: C.skyMid, borderWidth: 0.6 });
      page.drawRectangle({ x: MX, y: y - innerH, width: 3, height: innerH + 4, color: C.sky });

      let ty = y - 4;
      for (const line of lines) {
        page.drawText(line, { x: MX + 12, y: ty, size: 8.5, font: fontRegular, color: C.textDark });
        ty -= 13;
      }
      if (rawLines.length > 10) {
        page.drawText('[ texto recortado … ]', { x: MX + 12, y: ty, size: 7.5, font: fontItalic, color: C.textLight });
      }
      y = y - innerH - 10;
    };

    const normalizeUrl = (rawUrl: string) => {
      if (!rawUrl) return '';
      const trimmed = String(rawUrl).trim();
      if (!trimmed) return '';
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      return `${window.location.origin.replace(/\/$/, '')}/${trimmed.replace(/^\//, '')}`;
    };

    // ─── Datos ────────────────────────────────────────────────────
    const fechaVisita = new Date(visita.fechaProgramada).toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const tecEncargado = visita.tecnicosAsignados.find((t) => t.esEncargado)?.tecnicoNombre || '—';
    const empresaNombre = visita.empresaNombre || '—';
    const sedeNombre = visita.sedeNombre || '—';
    const tipoVisitaFormateado = visita.tipoVisita.replace(/_/g, ' ');
    const ticketNumero = ticketCodigo || visita.ticketNumero || visita.ticketId || '—';
    const activoNombre = activo?.activo_codigo || activo?.assetId || activo?.codigo || visita.activoNombre || '—';
    const usuarioActivo = usuarioNombreTicket || activo?.usuario_nombre || visita.usuarioTicketNombre || '—';

    // ════════════════════════════════════════════════════
    //  PÁGINA 1
    // ════════════════════════════════════════════════════
    drawHeader(page);

    // ① Información general
    drawSection('Información General');
    drawInfoTable([
      ['Empresa',          empresaNombre],
      ['Sede',             sedeNombre],
      ['Tipo de Visita',   tipoVisitaFormateado],
      ['Fecha Programada', fechaVisita],
      ...(visita.horaProgramada ? [['Hora Programada', visita.horaProgramada] as [string, string]] : []),
    ]);

    // ② Ticket & activo (condicional)
    if (visita.tipoVisita === 'POR_TICKET' || visita.ticketId) {
      drawSection('Información del Ticket');
      drawInfoTable([
        ['N° de Ticket',      String(ticketNumero)],
        ['Activo Asociado',   String(activoNombre)],
        ['Usuario Asignado',  String(usuarioActivo)],
      ]);
    }

    // ③ Equipo técnico
    drawSection('Equipo Técnico');
    const otrosTecnicos = visita.tecnicosAsignados.length > 1
      ? visita.tecnicosAsignados.filter((t) => !t.esEncargado).map((t) => t.tecnicoNombre).join(', ')
      : '—';
    drawInfoTable([
      ['Técnico Encargado',  tecEncargado],
      ...(visita.tecnicosAsignados.length > 1 ? [['Técnicos de Apoyo', otrosTecnicos] as [string, string]] : []),
      ['Total de Técnicos',  String(visita.tecnicosAsignados.length)],
    ]);

    // ④ Resultado
    drawSection('Resultado de la Visita');
    y -= 4;
    drawBadgeRow('Visita Contractual',    cuentaComoVisita ?? false,   true);
    drawBadgeRow('Cambio de Componente',  hayChangioComponente ?? false, false);
    y -= 4;

    // ⑤ Detalle del cierre
    drawSection('Detalle del Cierre');
    drawTextField('Diagnóstico',    diagnostico);
    drawTextField('Resolución',     resolucion);
    drawTextField('Recomendación',  recomendacion);

    drawFooter(page);

    // ════════════════════════════════════════════════════
    //  PÁGINAS: Tickets seleccionados
    // ════════════════════════════════════════════════════
    const selectedTicketIds = [...new Set(ticketsResueltosSeleccionados)]
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (selectedTicketIds.length > 0) {
      const ticketDetails = await Promise.all(
        selectedTicketIds.map(async (id) => {
          try { return await getTicketById(id); } catch { return null; }
        }),
      );

      for (let i = 0; i < ticketDetails.length; i++) {
        const t = ticketDetails[i] as any;
        if (!t) continue;

        page = pdfDoc.addPage([W, H]);
        drawHeader(page);
        y = BODY_TOP;

        // Título de ticket
        ensureSpace(40);
        y -= 8;
        const codigo = String(t.codigo_ticket || `#${t.id || '—'}`);
        page.drawRectangle({ x: MX, y: y - 6, width: CW, height: 30, color: C.sky });
        page.drawText(`TICKET ${i + 1}`, { x: MX + 14, y: y + 8, size: 8, font: fontBold, color: rgb(0.82, 0.93, 1) });
        page.drawText(codigo, { x: MX + 14, y: y - 2, size: 12, font: fontBold, color: C.white });
        y -= 38;

        drawTextField('Diagnóstico',   String(t.diagnostico || ''));
        drawTextField('Solución',      String(t.resolucion || ''));
        drawTextField('Recomendación', String(t.recomendacion || ''));

        // Fotos del cierre
        const imgs = (t.imagenes_cierre || t.cierre_imagenes || []) as Array<any>;

        drawSection('Evidencia Fotográfica');

        if (!imgs.length) {
          ensureSpace(22);
          page.drawText('No hay fotografías de cierre adjuntas para este ticket.', {
            x: MX + 10, y: y - 4, size: 8.5, font: fontItalic, color: C.textLight,
          });
          y -= 22;
        } else {
          const maxImages = Math.min(imgs.length, 4);
          const gap = 12;
          const imgW = (CW - gap) / 2;
          const imgH = 140;

          for (let j = 0; j < maxImages; j++) {
            const col = j % 2;
            if (col === 0) { ensureSpace(imgH + 24); y -= 6; }

            const xImg = MX + col * (imgW + gap);
            const yImg = y;

            // Marco con sombra simulada
            page.drawRectangle({ x: xImg + 2, y: yImg - imgH - 2, width: imgW, height: imgH, color: rgb(0.80, 0.88, 0.95) });
            page.drawRectangle({ x: xImg, y: yImg - imgH, width: imgW, height: imgH, color: C.skyLight, borderColor: C.skyMid, borderWidth: 0.8 });

            const raw = imgs[j]?.url ?? imgs[j]?.path ?? imgs[j]?.src ?? imgs[j];
            const imageUrl = normalizeUrl(String(raw || ''));
            try {
              const r = await fetch(imageUrl);
              const bytes = new Uint8Array(await r.arrayBuffer());
              const ctype = (r.headers.get('content-type') || '').toLowerCase();
              let embedded: any = null;
              if (ctype.includes('png')) embedded = await pdfDoc.embedPng(bytes);
              else if (ctype.includes('jpeg') || ctype.includes('jpg')) embedded = await pdfDoc.embedJpg(bytes);
              else { try { embedded = await pdfDoc.embedPng(bytes); } catch { embedded = await pdfDoc.embedJpg(bytes); } }
              const fit = embedded.scaleToFit(imgW - 10, imgH - 10);
              page.drawImage(embedded, {
                x: xImg + (imgW - fit.width) / 2,
                y: yImg - imgH + (imgH - fit.height) / 2,
                width: fit.width,
                height: fit.height,
              });
            } catch {
              page.drawText('Imagen no disponible', { x: xImg + 10, y: yImg - 24, size: 7.5, font: fontItalic, color: C.textLight });
            }

            if (col === 1 || j === maxImages - 1) { y -= imgH + 14; }
          }
        }

        drawFooter(page);
      }
    }

    // ─── Numeración final ─────────────────────────────────────────
    const totalPages = pdfDoc.getPageCount();
    pdfDoc.getPages().forEach((pg, p) => {
      const label = `Pág. ${p + 1} / ${totalPages}`;
      const lw = fontRegular.widthOfTextAtSize(label, 8);
      pg.drawRectangle({ x: W - MX - lw - 4, y: H - 48, width: lw + 8, height: 14, color: C.navy });
      pg.drawText(label, { x: W - MX - lw, y: H - 44, size: 8, font: fontRegular, color: C.skyMid });
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
        if (ticket.codigo_ticket) setTicketCodigo(ticket.codigo_ticket);
        if (ticket.activos && ticket.activos.length > 0) {
          const activoDelTicket = ticket.activos[0];
          const activoEnriquecido = { ...activoDelTicket, empresa_id: ticket.empresa_id, sede_id: ticket.sede_id };
          setActivo(activoEnriquecido);
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

  // ─────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(6, 18, 40, 0.72)', backdropFilter: 'blur(6px)' }}
      >
        {/* Modal container */}
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden"
          style={{ boxShadow: '0 32px 80px rgba(6,40,100,0.28), 0 2px 8px rgba(6,40,100,0.10)' }}>

          {/* ─── HEADER ─────────────────────────────────────────── */}
          <div className="relative shrink-0 overflow-hidden rounded-t-3xl"
            style={{ background: 'linear-gradient(135deg, #0A2456 0%, #1563C8 60%, #2196F3 100%)' }}>
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
            <div className="absolute top-4 right-20 w-16 h-16 rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #7EC8FF 0%, transparent 70%)' }} />

            <div className="relative flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-4">
                {/* Logo container */}
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)' }}>
                  <img
                    src="/logo.png" alt="Logo"
                    className="w-8 h-8 object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-0.5"
                    style={{ color: 'rgba(180,210,255,0.85)' }}>Gestión de Visitas</p>
                  <h2 className="text-xl font-black text-white tracking-tight leading-none">
                    Finalizar Visita
                  </h2>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
              >
                <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Bottom edge with info chips */}
            <div className="px-6 pb-4 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.13)', color: 'rgba(210,235,255,0.95)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(visita.fechaProgramada).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.13)', color: 'rgba(210,235,255,0.95)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {tecnicoEncargado}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize"
                style={{ background: 'rgba(33,150,243,0.35)', color: '#A8D8FF', border: '1px solid rgba(33,150,243,0.4)' }}>
                {visita.tipoVisita.replace(/_/g, ' ').toLowerCase()}
              </span>
            </div>
          </div>

          {/* ─── BODY ────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div
              ref={scrollBodyRef}
              onScroll={(e) => { lastScrollTopRef.current = e.currentTarget.scrollTop; }}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
              style={{ background: '#F4F8FE' }}>

              {/* ── 1. Cierre de Visita ── */}
              <SectionCard
                title="Cierre de Visita"
                icon={<PencilIcon />}
                accent="#1563C8"
              >
                <div className="space-y-4 p-5">
                  {[
                    { label: 'Diagnóstico', value: diagnostico, setter: setDiagnostico, placeholder: 'Describe el diagnóstico identificado durante la visita...' },
                    { label: 'Resolución',  value: resolucion,  setter: setResolucion,  placeholder: 'Describe las acciones realizadas para resolver el problema...' },
                    { label: 'Recomendación', value: recomendacion, setter: setRecomendacion, placeholder: 'Incluye recomendaciones para evitar recurrencia...' },
                  ].map(({ label, value, setter, placeholder }) => (
                    <div key={label}>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#1563C8' }}>
                        {label} <span className="text-rose-500 ml-0.5">*</span>
                      </label>
                      <textarea
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        placeholder={placeholder}
                        rows={3}
                        className="w-full px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 rounded-xl resize-none transition-all outline-none"
                        style={{
                          background: '#EFF6FF',
                          border: '1.5px solid #BFDBFE',
                        }}
                        onFocus={e => { e.currentTarget.style.border = '1.5px solid #1563C8'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(21,99,200,0.10)'; }}
                        onBlur={e => { e.currentTarget.style.border = '1.5px solid #BFDBFE'; e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                    </div>
                  ))}

                  {/* Imágenes */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1563C8' }}>
                      Adjuntar Imágenes
                      <span className="ml-2 text-xs font-medium normal-case" style={{ color: '#94A3B8' }}>
                        {cierreImages.length}/3 imágenes · Opcional
                      </span>
                    </label>

                    {previewImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {previewImages.map((src, i) => (
                          <div key={i} className="relative group rounded-xl overflow-hidden"
                            style={{ border: '1.5px solid #BFDBFE', aspectRatio: '4/3' }}>
                            <img
                              src={src}
                              onClick={() => setLightboxIndex(i)}
                              className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                              alt={`Imagen ${i + 1}`}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                            <button
                              onClick={() => removeImageAt(i)}
                              type="button"
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs transition-all"
                              style={{ background: 'rgba(220,38,38,0.9)' }}
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {cierreImages.length < 3 && (
                      <label
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all text-sm font-semibold"
                        style={{ border: '1.5px dashed #93C5FD', background: '#EFF6FF', color: '#1563C8' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#DBEAFE'; (e.currentTarget as HTMLElement).style.borderColor = '#1563C8'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#EFF6FF'; (e.currentTarget as HTMLElement).style.borderColor = '#93C5FD'; }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Seleccionar imagen
                        <input
                          accept="image/jpeg,image/png,image/webp"
                          type="file"
                          multiple
                          ref={fileInputRef}
                          onChange={handleImageInput}
                          disabled={cierreImages.length >= 3}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* ── 2. Visita Contractual ── */}
              <SectionCard title="¿Cuenta como visita contractual?" icon={<CheckCircleIcon />} accent="#1563C8">
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: true,  label: 'Sí, cuenta',   desc: 'Se contabilizará en el compromiso contractual', activeStyle: { border: '2px solid #16A34A', background: '#F0FDF4' }, dotColor: '#16A34A' },
                      { value: false, label: 'No cuenta',    desc: 'Solo quedará registrada en el historial',         activeStyle: { border: '2px solid #DC2626', background: '#FFF5F5' }, dotColor: '#DC2626' },
                    ].map((opt) => {
                      const isActive = cuentaComoVisita === opt.value;
                      return (
                        <div key={String(opt.value)}
                          role="radio"
                          aria-checked={isActive}
                          tabIndex={0}
                          onClick={() => setCuentaComoVisita(opt.value)}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              setCuentaComoVisita(opt.value);
                            }
                          }}
                          className="flex items-start gap-3 p-4 rounded-2xl cursor-pointer transition-all select-none"
                          style={isActive ? opt.activeStyle : { border: '2px solid #DBEAFE', background: '#F8FBFF' }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = '#93C5FD'; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = '#DBEAFE'; }}
                        >
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all"
                            style={isActive
                              ? { background: opt.dotColor, border: `2px solid ${opt.dotColor}` }
                              : { background: 'white', border: '2px solid #CBD5E1' }}>
                            {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold" style={{ color: isActive ? (opt.value ? '#166534' : '#991B1B') : '#374151' }}>{opt.label}</p>
                            <p className="text-xs mt-0.5" style={{ color: isActive ? (opt.value ? '#4ADE80' : '#FCA5A5') : '#94A3B8' }}>{opt.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {cuentaComoVisita === false && (
                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
                      style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <svg className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs font-semibold text-amber-800">Esta visita no se contabilizará como parte del compromiso contractual, pero quedará registrada en el historial de la empresa.</p>
                    </div>
                  )}

                  {cuentaComoVisita === true && (
                    <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #BBF7D0' }}>
                      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: '#DCFCE7' }}>
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#166534' }}>Tickets Resueltos del Día</span>
                        {cargandoTicketsResueltos && (
                          <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#166534' }}>
                            <span className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                            Cargando...
                          </span>
                        )}
                      </div>
                      <div className="p-3 space-y-1.5 overflow-y-auto" style={{ background: '#F0FDF4', maxHeight: '11rem', minHeight: ticketsResueltosDia.length > 0 ? '3rem' : undefined }}>
                        {!cargandoTicketsResueltos && ticketsResueltosDia.length === 0 && (
                          <p className="text-sm font-medium text-center py-3" style={{ color: '#4ADE80' }}>
                            No se encontraron tickets resueltos para esta fecha.
                          </p>
                        )}
                        {ticketsResueltosDia.map((t) => {
                          const idNum = Number(t.id);
                          const checked = ticketsResueltosSeleccionados.includes(idNum);
                          return (
                            <div key={idNum}
                              role="checkbox"
                              aria-checked={checked}
                              tabIndex={0}
                              onClick={() => toggleTicketResuelto(idNum)}
                              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleTicketResuelto(idNum); } }}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-white"
                              style={checked
                                ? { background: '#fff', border: '1.5px solid #86EFAC' }
                                : { background: 'transparent', border: '1.5px solid transparent' }}
                            >
                              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors"
                                style={checked
                                  ? { background: '#16A34A', border: '2px solid #16A34A' }
                                  : { background: 'white', border: '2px solid #86EFAC' }}>
                                {checked && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold truncate" style={{ color: '#166534' }}>{t.codigo_ticket || `#${t.id}`}</p>
                                <p className="text-xs truncate" style={{ color: '#4ADE80' }}>{t.titulo || 'Sin título'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* ── 3. Cambio de Componente ── */}
              <SectionCard title="¿Se realizó cambio de componente?" icon={<RefreshIcon />} accent="#0284C7">
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: true,  label: 'Sí, hay cambio', desc: 'Se reemplazó algún componente', activeStyle: { border: '2px solid #0284C7', background: '#EFF6FF' }, dotColor: '#0284C7' },
                      { value: false, label: 'Sin cambios',    desc: 'No se reemplazaron componentes', activeStyle: { border: '2px solid #64748B', background: '#F8FAFC' }, dotColor: '#64748B' },
                    ].map((opt) => {
                      const isActive = hayChangioComponente === opt.value;
                      return (
                        <div key={String(opt.value)}
                          role="radio"
                          aria-checked={isActive}
                          tabIndex={0}
                          onClick={() => setHayChangioComponente(opt.value)}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              setHayChangioComponente(opt.value);
                            }
                          }}
                          className="flex items-start gap-3 p-4 rounded-2xl cursor-pointer transition-all select-none"
                          style={isActive ? opt.activeStyle : { border: '2px solid #DBEAFE', background: '#F8FBFF' }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = '#93C5FD'; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = '#DBEAFE'; }}
                        >
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all"
                            style={isActive
                              ? { background: opt.dotColor, border: `2px solid ${opt.dotColor}` }
                              : { background: 'white', border: '2px solid #CBD5E1' }}>
                            {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold" style={{ color: isActive ? opt.dotColor : '#374151' }}>{opt.label}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{opt.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {hayChangioComponente === true && (
                    <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #BAE6FD', background: '#F0F9FF' }}>
                      <div className="px-4 py-2.5" style={{ background: '#E0F2FE', borderBottom: '1px solid #BAE6FD' }}>
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#0369A1' }}>Componente Cambiado</span>
                      </div>
                      <div className="p-4">
                        {cargandoActivo ? (
                          <div className="flex items-center gap-2" style={{ color: '#0284C7' }}>
                            <span className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm font-semibold">Cargando activo...</span>
                          </div>
                        ) : activo ? (
                          <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl"
                            style={{ border: '1.5px solid #BAE6FD', boxShadow: '0 1px 4px rgba(2,132,199,0.08)' }}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: 'linear-gradient(135deg, #0284C7, #38BDF8)' }}>
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                                </svg>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: '#0284C7' }}>Código del Activo</p>
                                <p className="text-base font-black truncate" style={{ color: '#0C4A6E' }}>
                                  {activo.activo_codigo || activo.assetId || activo.codigo || activo.id}
                                </p>
                                {activo.categoria && <p className="text-xs font-semibold mt-0.5" style={{ color: '#0284C7' }}>{activo.categoria}</p>}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => { if (activo?.activo_id && onAbrirModalEditarActivo) onAbrirModalEditarActivo(activo); }}
                              className="px-4 py-2 text-sm font-bold text-white rounded-xl transition-all"
                              style={{ background: '#0284C7' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#0369A1')}
                              onMouseLeave={e => (e.currentTarget.style.background = '#0284C7')}
                            >Editar</button>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 px-4 py-3 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                            <svg className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <p className="text-xs font-semibold text-amber-800">No hay activos registrados para este ticket.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* ── 4. Notificación por correo ── */}
              <SectionCard title="Notificación por Correo" icon={<MailIcon />} accent="#0369A1">
                <div className="p-5 space-y-3" ref={selectorRef}>

                  {/* Chips de destinatarios */}
                  {destinatariosSeleccionados.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {destinatariosSeleccionados.map((correo) => {
                        const u = usuarios.find((usr) => (usr.correoPrincipal || usr.correo) === correo);
                        return (
                          <span key={correo}
                            className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-bold"
                            style={{ background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                            {u?.nombreCompleto || correo}
                            <button type="button" onClick={() => toggleDestinatario(correo)}
                              className="w-4 h-4 rounded-full flex items-center justify-center transition-all"
                              style={{ background: 'rgba(29,78,216,0.12)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(29,78,216,0.22)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(29,78,216,0.12)')}
                            >
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Trigger button */}
                  <button
                    type="button"
                    onClick={() => setMostrarSelectorUsuarios((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                    style={mostrarSelectorUsuarios
                      ? { border: '2px solid #1563C8', background: '#EFF6FF', color: '#1D4ED8' }
                      : { border: '2px solid #DBEAFE', background: '#F8FBFF', color: '#64748B' }}
                    onMouseEnter={e => { if (!mostrarSelectorUsuarios) { (e.currentTarget as HTMLElement).style.borderColor = '#93C5FD'; (e.currentTarget as HTMLElement).style.color = '#1D4ED8'; } }}
                    onMouseLeave={e => { if (!mostrarSelectorUsuarios) { (e.currentTarget as HTMLElement).style.borderColor = '#DBEAFE'; (e.currentTarget as HTMLElement).style.color = '#64748B'; } }}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {destinatariosSeleccionados.length > 0
                        ? `${destinatariosSeleccionados.length} destinatario${destinatariosSeleccionados.length !== 1 ? 's' : ''} seleccionado${destinatariosSeleccionados.length !== 1 ? 's' : ''}`
                        : 'Seleccionar destinatarios...'}
                    </span>
                    <svg className={`w-4 h-4 transition-transform ${mostrarSelectorUsuarios ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {mostrarSelectorUsuarios && (
                    <div className="rounded-2xl overflow-hidden shadow-lg" style={{ border: '1.5px solid #DBEAFE' }}>
                      <div className="p-3" style={{ background: '#F0F9FF', borderBottom: '1px solid #DBEAFE' }}>
                        <div className="relative">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#93C5FD' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text" value={busquedaUsuario} onChange={(e) => setBusquedaUsuario(e.target.value)}
                            placeholder="Buscar por nombre o correo..."
                            className="w-full pl-9 pr-3 py-2 text-sm font-medium rounded-xl outline-none transition-all"
                            style={{ border: '1.5px solid #BFDBFE', background: '#fff', color: '#1E3A5F' }}
                            onFocus={e => { e.currentTarget.style.borderColor = '#1563C8'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(21,99,200,0.10)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = '#BFDBFE'; e.currentTarget.style.boxShadow = 'none'; }}
                          />
                        </div>
                      </div>
                      <div className="max-h-52 overflow-y-auto divide-y divide-slate-50 bg-white">
                        {cargandoUsuarios ? (
                          <div className="p-4 flex items-center gap-2" style={{ color: '#1563C8' }}>
                            <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
                          if (filtrados.length === 0) return (
                            <p className="p-4 text-sm font-medium text-center text-slate-400">No se encontraron usuarios.</p>
                          );
                          return filtrados.map((u) => {
                            const correo = u.correoPrincipal || u.correo;
                            const uid = String(u.id || u._id);
                            const checked = destinatariosSeleccionados.includes(correo);
                            return (
                              <div key={uid}
                                role="checkbox"
                                aria-checked={checked}
                                tabIndex={0}
                                onClick={() => toggleDestinatario(correo)}
                                onKeyDown={(e) => {
                                  if (e.key === ' ' || e.key === 'Enter') {
                                    e.preventDefault();
                                    toggleDestinatario(correo);
                                  }
                                }}
                                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
                                style={{ background: checked ? '#EFF6FF' : 'white' }}
                                onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = '#F8FBFF'; }}
                                onMouseLeave={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'white'; }}
                              >
                                <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                                  style={checked
                                    ? { background: '#1563C8', border: '2px solid #1563C8' }
                                    : { background: 'white', border: '2px solid #CBD5E1' }}>
                                  {checked && (
                                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold truncate text-slate-800">{u.nombreCompleto}</p>
                                  <p className="text-xs truncate text-slate-400">{correo}</p>
                                </div>
                                </div>
                            );
                          });
                        })()}
                      </div>
                      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: '#F0F9FF', borderTop: '1px solid #DBEAFE' }}>
                        <span className="text-xs font-bold" style={{ color: '#1563C8' }}>
                          {destinatariosSeleccionados.length} seleccionado{destinatariosSeleccionados.length !== 1 ? 's' : ''}
                        </span>
                        <button type="button" onClick={() => setMostrarSelectorUsuarios(false)}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                          style={{ color: '#1563C8' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#DBEAFE')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >Cerrar</button>
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            {/* ─── FOOTER FIJO ───────────────────────────────────── */}
            <div className="shrink-0 px-6 py-4 flex items-center justify-between gap-3"
              style={{ background: 'white', borderTop: '1.5px solid #DBEAFE' }}>
              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {[
                  { done: diagnostico.trim() && resolucion.trim() && recomendacion.trim(), label: 'Texto' },
                  { done: cuentaComoVisita !== null, label: 'Contractual' },
                  { done: hayChangioComponente !== null, label: 'Componente' },
                ].map(({ done, label }) => (
                  <div key={label} className="flex items-center gap-1" title={label}>
                    <div className="w-2 h-2 rounded-full transition-all"
                      style={{ background: done ? '#1563C8' : '#CBD5E1' }} />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button" onClick={onClose} disabled={loading}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                  style={{ border: '2px solid #DBEAFE', color: '#1563C8', background: 'white' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EFF6FF'; (e.currentTarget as HTMLElement).style.borderColor = '#93C5FD'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white'; (e.currentTarget as HTMLElement).style.borderColor = '#DBEAFE'; }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || cuentaComoVisita === null || hayChangioComponente === null}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #0A2456, #1563C8)', boxShadow: '0 4px 14px rgba(21,99,200,0.35)' }}
                  onMouseEnter={e => { if (!loading && cuentaComoVisita !== null && hayChangioComponente !== null) (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(21,99,200,0.5)'; }}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(21,99,200,0.35)'}
                >
                  {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {loading ? 'Finalizando...' : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Finalizar Visita
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && previewImages[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setLightboxIndex(null)}
        >
          <img
            src={previewImages[lightboxIndex]}
            className="max-h-[88vh] max-w-[88vw] rounded-2xl shadow-2xl"
            style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
            alt="Vista previa"
          />
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold transition-all"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
          >✕</button>
        </div>
      )}
    </>
  );
}

// ─── Sub-componentes auxiliares ──────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  accent = '#1563C8',
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1.5px solid #DBEAFE', boxShadow: '0 1px 6px rgba(21,99,200,0.07)' }}>
      <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ borderBottom: '1px solid #EFF6FF', background: 'linear-gradient(90deg, #F0F7FF 0%, #F8FBFF 100%)' }}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: accent }}>
          <div className="text-white w-3.5 h-3.5">{icon}</div>
        </div>
        <h3 className="text-sm font-bold tracking-tight" style={{ color: '#0C1E40' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
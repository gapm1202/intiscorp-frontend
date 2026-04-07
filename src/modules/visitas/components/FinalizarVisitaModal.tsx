import { useState, useEffect, useRef, useMemo } from 'react';
import type { Visita, FinalizarVisitaPayload } from '../types';
import { finalizarVisita, enviarResumenVisitaCorreo } from '../services/visitasService';
import { htmlToPdfBase64 } from '../services/pdfService';
import { generateVisitaReportHtml } from '../utils/visitaReportTemplate';
import type { TicketAsociadoData } from '../utils/visitaReportTemplate';
import { COLUMNAS_PDF_TICKET } from '../utils/visitaReportTemplate';
import type { ColumnaPdfTicket } from '../utils/visitaReportTemplate';
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
  const [firmaModo, setFirmaModo] = useState<'AUTO' | 'DRAW'>('AUTO');
  const [firmaAutomaticaDataUri, setFirmaAutomaticaDataUri] = useState('');
  const [firmaTrazadaDataUri, setFirmaTrazadaDataUri] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [resolucion, setResolucion] = useState('');
  const [recomendacion, setRecomendacion] = useState('');
  const esProgramada = visita.tipoVisita === 'PROGRAMADA';
  const [cuentaComoVisita, setCuentaComoVisita] = useState<boolean | null>(esProgramada ? true : null);
  const [hayChangioComponente, setHayChangioComponente] = useState<boolean | null>(esProgramada ? false : null);
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
  const [columnasPdf, setColumnasPdf] = useState<ColumnaPdfTicket[]>([
    'fecha', 'codigoTicket', 'codigoActivo', 'usuarioAsignado',
    'sede', 'areaActivo', 'diagnostico', 'resolucion', 'recomendaciones',
  ]);
  const selectorRef = useRef<HTMLDivElement>(null);
  const firmaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const firmaDibujandoRef = useRef(false);
  const firmaTieneTrazoRef = useRef(false);

  const tecnicoFirmaNombre = useMemo(() => {
    const encargado = visita.tecnicosAsignados.find((t) => t.esEncargado)?.tecnicoNombre?.trim();
    if (encargado) return encargado;
    const userNombre = user?.nombre?.trim();
    if (userNombre) return userNombre;
    return 'Tecnico Encargado';
  }, [visita.tecnicosAsignados, user?.nombre]);

  const toDateKey = (value?: string | Date | null): string | null => {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Return local ISO-like string without trailing Z, e.g. "2026-03-17T00:00:00.000"
  const toLocalIsoNoZ = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${y}-${m}-${day}T${hh}:${mm}:${ss}.${ms}`;
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

  const generarFirmaAutomaticaDataUri = async (nombreTecnico: string): Promise<string> => {
    const nombre = nombreTecnico.trim() || 'Tecnico Encargado';
    if (document.fonts?.load) {
      try {
        await Promise.race([
          document.fonts.load('48px Pacifico'),
          new Promise((resolve) => setTimeout(resolve, 250)),
        ]);
      } catch {
        // Si no carga la fuente, se usa fallback cursiva del sistema.
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 260;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.18)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(44, 192);
    ctx.lineTo(canvas.width - 44, 192);
    ctx.stroke();

    let fontSize = 72;
    const minFont = 36;
    const maxTextWidth = canvas.width - 88;
    do {
      ctx.font = `italic ${fontSize}px "Pacifico", "Great Vibes", "Brush Script MT", "Segoe Script", cursive`;
      if (ctx.measureText(nombre).width <= maxTextWidth || fontSize <= minFont) break;
      fontSize -= 2;
    } while (fontSize >= minFont);

    ctx.fillStyle = '#1e3a8a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nombre, canvas.width / 2, 130);

    return canvas.toDataURL('image/png');
  };

  const getFirmaSeleccionadaDataUri = () =>
    (firmaModo === 'DRAW' ? firmaTrazadaDataUri : firmaAutomaticaDataUri) || '';

  const getFirmaTipoSeleccionado = () => (firmaModo === 'DRAW' ? 'TRAZADA' : 'AUTOMATICA');

  useEffect(() => {
    let active = true;
    generarFirmaAutomaticaDataUri(tecnicoFirmaNombre)
      .then((uri) => {
        if (active) setFirmaAutomaticaDataUri(uri);
      })
      .catch(() => {
        if (active) setFirmaAutomaticaDataUri('');
      });
    return () => {
      active = false;
    };
  }, [tecnicoFirmaNombre]);

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
      if (!cuentaComoVisita || (!esPorTicket && !esProgramada) || !visita.empresaId || !visita.fechaProgramada) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentaComoVisita, visita.empresaId, visita.fechaProgramada, esProgramada]);

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

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = firmaCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const iniciarTrazadoFirma = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = firmaCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCanvasPoint(event);
    canvas.setPointerCapture(event.pointerId);
    firmaDibujandoRef.current = true;
    firmaTieneTrazoRef.current = true;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
  };

  const moverTrazadoFirma = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!firmaDibujandoRef.current) return;
    const canvas = firmaCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { x, y } = getCanvasPoint(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const finalizarTrazadoFirma = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = firmaCanvasRef.current;
    if (!canvas) return;

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    if (!firmaDibujandoRef.current) return;
    firmaDibujandoRef.current = false;

    if (firmaTieneTrazoRef.current) {
      setFirmaTrazadaDataUri(canvas.toDataURL('image/png'));
    }
  };

  const limpiarFirmaTrazada = () => {
    const canvas = firmaCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    firmaDibujandoRef.current = false;
    firmaTieneTrazoRef.current = false;
    setFirmaTrazadaDataUri('');
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

  // ─────────────────────────────────────────────────────────────────
  //  FILE → DATA URI helper
  // ─────────────────────────────────────────────────────────────────
  const fileToDataUri = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // ─────────────────────────────────────────────────────────────────
  //  PDF GENERATION — HTML → Puppeteer (pdf-server.cjs)
  // ─────────────────────────────────────────────────────────────────
  const ultimoHtmlGenerado = { current: '' };

  const generarResumenVisitaPdfBase64 = async (): Promise<string> => {
    // ── Logo as data URI ────────────────────────────────────────────
    let logoDataUri: string | undefined;
    try {
      const logoResp = await fetch('/logo.png');
      const blob = await logoResp.blob();
      logoDataUri = await fileToDataUri(new File([blob], 'logo.png', { type: blob.type }));
    } catch { /* logo unavailable */ }
    // ── Cierre images → data URIs ───────────────────────────────────
    const cierreImagenes: string[] = await Promise.all(
      cierreImages.map((f) => fileToDataUri(f).catch(() => '')),
    ).then((uris) => uris.filter(Boolean));

    // ── Tickets asociados ───────────────────────────────────────────
    const selectedTicketIds = [...new Set(ticketsResueltosSeleccionados)]
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0);

    const ticketsAsociados: TicketAsociadoData[] = [];
    let ticketRowNumber = 1;
    if (selectedTicketIds.length > 0) {
      const details = await Promise.all(
        selectedTicketIds.map((id) => getTicketById(id).catch(() => null)),
      );
      details.forEach((t) => {
        if (!t) return;
        const activosDetalle = Array.isArray((t as any).activos) ? (t as any).activos : [];

        const rawImgs = ((t as any).imagenes_cierre || (t as any).cierre_imagenes || []) as Array<any>;
        const imagenesUrls = rawImgs
          .map((img: any) => {
            const raw = img?.url ?? img?.path ?? img?.src ?? img;
            const trimmed = String(raw || '').trim();
            if (!trimmed) return '';
            if (/^https?:\/\//i.test(trimmed)) return trimmed;
            return `${window.location.origin.replace(/\/$/, '')}/${trimmed.replace(/^\//, '')}`;
          })
          .filter(Boolean)
          .slice(0, 4) as string[];

        if (activosDetalle.length > 0) {
          activosDetalle.forEach((activo: any) => {
            const codigoActivo = String(
              activo?.activo_codigo || activo?.codigo || activo?.assetId || activo?.code || '',
            ).trim();
            const usuarioAsignado = String(
              activo?.usuario_nombre || (t as any).usuario_nombre || '',
            ).trim();

            ticketsAsociados.push({
              numero: ticketRowNumber++,
              codigo: String((t as any).codigo_ticket || `#${(t as any).id || '—'}`),
              // If activo exists but codigo is null/empty, mark as data issue instead of masking as '-'.
              codigoActivo: codigoActivo || 'ACTIVO-SIN-CODIGO',
              usuarioAsignado: usuarioAsignado || '—',
              sede: String((t as any).sede_nombre || activo?.sede_nombre || '—'),
              areaActivo: String(activo?.area || activo?.area_nombre || activo?.ubicacion || (t as any).area || '—'),
              fecha: (t as any).fecha_creacion ? new Date((t as any).fecha_creacion).toLocaleDateString('es-ES') : '—',
              diagnostico: String((t as any).descripcion || (t as any).diagnostico || ''),
              solucion: String((t as any).resolucion || '—'),
              recomendacion: String((t as any).recomendaciones || (t as any).recomendacion || '—'),
              imagenesUrls,
            });
          });
          return;
        }

        // Exceptional case: ticket without activos linked.
        ticketsAsociados.push({
          numero: ticketRowNumber++,
          codigo: String((t as any).codigo_ticket || `#${(t as any).id || '—'}`),
          codigoActivo: '—',
          usuarioAsignado: String((t as any).usuario_nombre || '—'),
          sede: String((t as any).sede_nombre || '—'),
          areaActivo: String((t as any).area || '—'),
          fecha: (t as any).fecha_creacion ? new Date((t as any).fecha_creacion).toLocaleDateString('es-ES') : '—',
          diagnostico: String((t as any).descripcion || (t as any).diagnostico || ''),
          solucion: String((t as any).resolucion || '—'),
          recomendacion: String((t as any).recomendaciones || (t as any).recomendacion || '—'),
          imagenesUrls,
        });
      });
    }

    // ── Build data object ───────────────────────────────────────────
    const tecEncargado = visita.tecnicosAsignados.find((t) => t.esEncargado)?.tecnicoNombre || '—';
    const firmaTecnicoDataUri = getFirmaSeleccionadaDataUri() || await generarFirmaAutomaticaDataUri(tecnicoFirmaNombre);
    const otrosTecnicos = visita.tecnicosAsignados.length > 1
      ? visita.tecnicosAsignados.filter((t) => !t.esEncargado).map((t) => t.tecnicoNombre).join(', ')
      : '';

    const reportData = {
      empresaNombre: visita.empresaNombre || '—',
      sedeNombre: visita.sedeNombre || '—',
      tipoVisita: visita.tipoVisita.replace(/_/g, ' '),
      fechaVisita: new Date(visita.fechaProgramada).toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }),
      horaProgramada: visita.horaProgramada,
      tecnicoEncargado: tecEncargado,
      otrosTecnicos,
      totalTecnicos: visita.tecnicosAsignados.length,
      tieneTicket: visita.tipoVisita === 'POR_TICKET' || Boolean(visita.ticketId),
      ticketCodigo: ticketCodigo || String(visita.ticketNumero || visita.ticketId || '') || undefined,
      activoNombre: activo?.activo_codigo || activo?.assetId || activo?.codigo || visita.activoNombre || undefined,
      usuarioTicket: usuarioNombreTicket || (activo as any)?.usuario_nombre || visita.usuarioTicketNombre || undefined,
      cuentaComoVisita: cuentaComoVisita ?? false,
      huboCambioComponente: hayChangioComponente ?? false,
      diagnostico: diagnostico.trim(),
      solucion: resolucion.trim(),
      recomendacion: recomendacion.trim(),
      cierreImagenes,
      ticketsAsociados,
      columnasSeleccionadas: cuentaComoVisita ? columnasPdf : undefined,
      tecnicoFirmaNombre,
      firmaTecnicoDataUri,
      logoDataUri,
      fechaGeneracion: new Date().toLocaleDateString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric',
      }),
    };

    const html = generateVisitaReportHtml(reportData);
    ultimoHtmlGenerado.current = html;

    const visitaPayload = {
      // IDs
      visitaId: (visita as any)?._id || (visita as any)?.id || '',
      visita_id: (visita as any)?._id || (visita as any)?.id || '',

      // Empresa / Sede
      cliente: visita.empresaNombre || '',
      empresa: visita.empresaNombre || '',
      empresa_nombre: visita.empresaNombre || '',
      empresaNombre: visita.empresaNombre || '',
      sede: visita.sedeNombre || '',
      sede_nombre: visita.sedeNombre || '',
      sedeNombre: visita.sedeNombre || '',

      // Tipo y estado (forzamos FINALIZADA porque este PDF se genera al finalizar)
      tipoVisita: visita.tipoVisita?.replace(/_/g, ' ') || '',
      tipo_visita: visita.tipoVisita?.replace(/_/g, ' ') || '',
      estado: 'FINALIZADA',

      // Ticket
      ticket: reportData.ticketCodigo || ticketCodigo || String(visita.ticketNumero || visita.ticketId || '') || '',
      ticket_codigo: reportData.ticketCodigo || ticketCodigo || String(visita.ticketNumero || visita.ticketId || '') || '',
      ticketCodigo: reportData.ticketCodigo || ticketCodigo || String(visita.ticketNumero || visita.ticketId || '') || '',

      // Activo / Usuario
      activoNombre: reportData.activoNombre || '',
      activo_nombre: reportData.activoNombre || '',
      activo_codigo: reportData.activoNombre || '',
      usuarioTicket: reportData.usuarioTicket || '',
      usuario_ticket: reportData.usuarioTicket || '',
      usuario_nombre: reportData.usuarioTicket || '',

      // Técnicos
      tecnico: reportData.tecnicoEncargado || '',
      tecnico_encargado: reportData.tecnicoEncargado || '',
      tecnicoEncargado: reportData.tecnicoEncargado || '',
      otrosTecnicos: reportData.otrosTecnicos || '',
      otros_tecnicos: reportData.otrosTecnicos || '',
      totalTecnicos: reportData.totalTecnicos || 1,
      total_tecnicos: reportData.totalTecnicos || 1,

      // Fecha
      fecha: visita?.fechaProgramada
        ? toLocalIsoNoZ(new Date(visita.fechaProgramada))
        : toLocalIsoNoZ(new Date()),
      fecha_programada: visita?.fechaProgramada
        ? toLocalIsoNoZ(new Date(visita.fechaProgramada))
        : toLocalIsoNoZ(new Date()),
      fechaProgramada: visita?.fechaProgramada || '',
      horaProgramada: visita.horaProgramada || '',
      hora_programada: visita.horaProgramada || '',

      // Cierre
      diagnostico: reportData.diagnostico || '',
      resolucion: resolucion.trim(),
      recomendacion: reportData.recomendacion || '',
      cuentaComoVisita: cuentaComoVisita ?? false,
      cuenta_como_visita: cuentaComoVisita ?? false,
      cuentaComoVisitaContractual: cuentaComoVisita ?? false,
      huboCambioComponente: hayChangioComponente ?? false,
      hubo_cambio_componente: hayChangioComponente ?? false,
      cambio_componente: hayChangioComponente ?? false,

      // Imágenes y tickets asociados
      cierreImagenes,
      cierre_imagenes: cierreImagenes,
      imagenes: cierreImagenes,
      ticketsAsociados: reportData.ticketsAsociados || [],
      tickets_asociados: reportData.ticketsAsociados || [],

      // Firma del técnico
      firmaTecnicoTipo: getFirmaTipoSeleccionado(),
      firma_tecnico_tipo: getFirmaTipoSeleccionado(),
      firmaTecnicoNombre: tecnicoFirmaNombre,
      firma_tecnico_nombre: tecnicoFirmaNombre,
      firmaTecnicoImagen: firmaTecnicoDataUri,
      firma_tecnico_imagen: firmaTecnicoDataUri,
    };

    return htmlToPdfBase64(html, visitaPayload);
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

    if (!esProgramada && (!diagnostico.trim() || !resolucion.trim() || !recomendacion.trim())) { onError('Completa Diagnóstico, Resolución y Recomendación para finalizar la visita'); return; }
    if (cuentaComoVisita === null) { onError('Debes indicar si cuenta como visita contractual'); return; }
    if (!esProgramada && hayChangioComponente === null) { onError('Debes indicar si se realizó cambio de componente'); return; }
    if (destinatariosSeleccionados.length === 0) { onError('Debes seleccionar al menos un destinatario para la notificación por correo'); return; }

    const firmaSeleccionada = getFirmaSeleccionadaDataUri() || await generarFirmaAutomaticaDataUri(tecnicoFirmaNombre);
    if (!firmaSeleccionada) {
      onError('No se pudo generar la firma del técnico. Intenta nuevamente.');
      return;
    }
    if (firmaModo === 'DRAW' && !firmaTrazadaDataUri) {
      onError('Debes trazar la firma del técnico para continuar.');
      return;
    }

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

      const payload: FinalizarVisitaPayload & {
        ticketsResueltosAsociados?: number[];
        diagnostico?: string;
        resolucion?: string;
        recomendacion?: string;
        kb_entry_id?: string;
        firmaTecnicoTipo?: string;
        firmaTecnicoNombre?: string;
        firmaTecnicoImagen?: string;
      } = {
        fechaFinalizacion: new Date().toISOString(),
        tecnicoFinalizadorId,
        notasFinalizacion: resumenClausura,
        observacionesClausura: resumenClausura,
        diagnostico: diagnostico.trim(),
        resolucion: resolucion.trim(),
        recomendacion: recomendacion.trim(),
        cuentaComoVisitaContractual: cuentaComoVisita ?? false,
        huboCambioComponente: hayChangioComponente ?? false,
        firmaTecnicoTipo: getFirmaTipoSeleccionado(),
        firmaTecnicoNombre: tecnicoFirmaNombre,
        firmaTecnicoImagen: firmaSeleccionada,
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
            html: ultimoHtmlGenerado.current,
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
          const ticketRecord = ticket as unknown as Record<string, unknown>;
          const ticketIdNum = Number(ticket.id ?? ticketRecord._id ?? ticketRecord.ticketId ?? visita.ticketId);
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
                title={esProgramada ? 'Firma del Técnico' : 'Cierre de Visita'}
                icon={<PencilIcon />}
                accent="#1563C8"
              >
                <div className="space-y-4 p-5">
                  {!esProgramada && [
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

                  {/* Imágenes — solo para POR_TICKET */}
                  {!esProgramada && (
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
                  )}

                  <div className="rounded-2xl p-4" style={{ border: '1.5px solid #BFDBFE', background: '#F8FBFF' }}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: '#1563C8' }}>
                        Firma del Técnico
                      </label>
                      <span className="text-[11px] font-semibold" style={{ color: '#64748B' }}>
                        {tecnicoFirmaNombre}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {[
                        {
                          value: 'AUTO' as const,
                          label: 'Automática',
                          desc: 'Genera firma manuscrita con el nombre del técnico',
                        },
                        {
                          value: 'DRAW' as const,
                          label: 'Trazar firma',
                          desc: 'Dibuja la firma manualmente en el recuadro',
                        },
                      ].map((opt) => {
                        const active = firmaModo === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFirmaModo(opt.value)}
                            className="text-left p-3 rounded-xl transition-all"
                            style={active
                              ? { border: '2px solid #1563C8', background: '#EFF6FF' }
                              : { border: '2px solid #DBEAFE', background: '#FFFFFF' }}
                          >
                            <p className="text-sm font-bold" style={{ color: '#1E3A8A' }}>{opt.label}</p>
                            <p className="text-xs mt-1" style={{ color: '#64748B' }}>{opt.desc}</p>
                          </button>
                        );
                      })}
                    </div>

                    {firmaModo === 'AUTO' ? (
                      <div className="rounded-xl px-3 py-2" style={{ border: '1.5px solid #C7D2FE', background: '#EEF2FF' }}>
                        {firmaAutomaticaDataUri ? (
                          <img
                            src={firmaAutomaticaDataUri}
                            alt="Firma automática"
                            className="w-full h-24 object-contain"
                          />
                        ) : (
                          <p className="text-xs font-semibold text-slate-500">Generando firma automática...</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <canvas
                          ref={firmaCanvasRef}
                          width={920}
                          height={240}
                          onPointerDown={iniciarTrazadoFirma}
                          onPointerMove={moverTrazadoFirma}
                          onPointerUp={finalizarTrazadoFirma}
                          onPointerLeave={finalizarTrazadoFirma}
                          onPointerCancel={finalizarTrazadoFirma}
                          className="w-full h-32 rounded-xl touch-none"
                          style={{ border: '1.5px dashed #93C5FD', background: '#FFFFFF' }}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium" style={{ color: '#64748B' }}>
                            Firma con mouse o pantalla táctil.
                          </p>
                          <button
                            type="button"
                            onClick={limpiarFirmaTrazada}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' }}
                          >
                            Limpiar
                          </button>
                        </div>
                      </div>
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

                  {cuentaComoVisita === true && (<>
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

                    {/* ── Columnas del PDF ── */}
                    <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #BBF7D0' }}>
                      <div className="px-4 py-2.5" style={{ background: '#DCFCE7' }}>
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#166534' }}>Columnas del reporte PDF</span>
                      </div>
                      <div className="p-3" style={{ background: '#F0FDF4' }}>
                        <div className="grid grid-cols-3 gap-2">
                          {COLUMNAS_PDF_TICKET.map((col) => {
                            const checked = columnasPdf.includes(col.key);
                            const disabled = !!col.obligatoria;
                            return (
                              <label key={col.key} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-white'}`}
                                style={checked ? { background: '#fff', border: '1.5px solid #86EFAC', color: '#166534' } : { background: 'transparent', border: '1.5px solid transparent', color: '#4ADE80' }}>
                                <input
                                  type="checkbox"
                                  className="accent-green-600 w-3.5 h-3.5"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() => {
                                    setColumnasPdf(prev =>
                                      prev.includes(col.key)
                                        ? prev.filter(c => c !== col.key)
                                        : [...prev, col.key]
                                    );
                                  }}
                                />
                                {col.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>)}
                </div>
              </SectionCard>

              {/* ── 3. Cambio de Componente (solo POR_TICKET) ── */}
              {!esProgramada && <SectionCard title="¿Se realizó cambio de componente?" icon={<RefreshIcon />} accent="#0284C7">
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
              </SectionCard>}

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
                {(esProgramada
                  ? [{ done: cuentaComoVisita !== null, label: 'Contractual' }]
                  : [
                      { done: diagnostico.trim() && resolucion.trim() && recomendacion.trim(), label: 'Texto' },
                      { done: cuentaComoVisita !== null, label: 'Contractual' },
                      { done: hayChangioComponente !== null, label: 'Componente' },
                    ]
                ).map(({ done, label }) => (
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
                  disabled={loading || cuentaComoVisita === null || (!esProgramada && hayChangioComponente === null) || destinatariosSeleccionados.length === 0}
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
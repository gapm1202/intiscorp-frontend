import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  consultarFirmaConformidadMantenimiento,
  registrarFirmaConformidadMantenimiento,
} from '../../mantenimientoPreventivo/services/mantenimientosPreventivosService';

type FirmaModo = 'AUTO' | 'DRAW';
type ViewState = 'loading' | 'ready' | 'success' | 'signed' | 'expired' | 'invalid' | 'error';

interface NormalizedStatus {
  state: ViewState;
  message: string;
  empresaNombre?: string;
  tecnicoNombre?: string;
  sedeNombre?: string;
  fechaMantenimiento?: string;
  nombreCliente?: string;
  calificacion?: number;
}

const STAR_VALUES = [1, 2, 3, 4, 5];

function normalizeStatus(response: Record<string, unknown> | null): NormalizedStatus {
  const payload = (response?.data ?? response ?? {}) as Record<string, unknown>;
  const rawState = String(payload?.estado ?? payload?.status ?? '').toUpperCase();
  const signed = Boolean(
    payload?.yaFirmo ?? payload?.ya_firmo ?? payload?.firmado ?? payload?.firmada ?? payload?.completado
  ) || rawState.includes('FIRM');
  const expired = Boolean(payload?.expirado ?? payload?.expired) || rawState.includes('EXPIR');
  const invalid = Boolean(payload?.invalido ?? payload?.invalid) || rawState.includes('INVALID');

  if (signed) {
    return {
      state: 'signed',
      message: 'Gracias, ya firmó este mantenimiento. PDF firmado enviado a su correo.',
      empresaNombre: String(payload?.empresaNombre ?? payload?.empresa_nombre ?? '').trim() || undefined,
      tecnicoNombre: String(payload?.tecnicoNombre ?? payload?.tecnico_nombre ?? '').trim() || undefined,
      sedeNombre: String(payload?.sedeNombre ?? payload?.sede_nombre ?? '').trim() || undefined,
      fechaMantenimiento: String(payload?.fechaMantenimiento ?? payload?.fecha_mantenimiento ?? payload?.fecha ?? '').trim() || undefined,
      nombreCliente: String(payload?.nombreCliente ?? payload?.nombre_cliente ?? '').trim() || undefined,
      calificacion: Number(payload?.calificacion ?? payload?.rating ?? 0) || undefined,
    };
  }

  if (expired) {
    return {
      state: 'expired',
      message: typeof payload?.message === 'string' ? payload.message : 'Este enlace de firma ya expiró.',
    };
  }

  if (invalid) {
    return {
      state: 'invalid',
      message: typeof payload?.message === 'string' ? payload.message : 'El enlace de firma no es válido.',
    };
  }

  return {
    state: 'ready',
    message: 'Revise la conformidad del mantenimiento y complete la firma.',
    empresaNombre: String(payload?.empresaNombre ?? payload?.empresa_nombre ?? '').trim() || undefined,
    tecnicoNombre: String(payload?.tecnicoNombre ?? payload?.tecnico_nombre ?? '').trim() || undefined,
    sedeNombre: String(payload?.sedeNombre ?? payload?.sede_nombre ?? '').trim() || undefined,
    fechaMantenimiento: String(payload?.fechaMantenimiento ?? payload?.fecha_mantenimiento ?? payload?.fecha ?? '').trim() || undefined,
    nombreCliente: String(payload?.nombreCliente ?? payload?.nombre_cliente ?? '').trim() || undefined,
  };
}

function formatFecha(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(date);
}

async function generateFirmaAutomaticaDataUri(nombre: string): Promise<string> {
  const text = nombre.trim();
  if (!text) return '';

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(14, 116, 144, 0.24)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(64, 238);
  ctx.lineTo(canvas.width - 64, 238);
  ctx.stroke();

  let fontSize = 84;
  const maxTextWidth = canvas.width - 128;
  while (fontSize >= 40) {
    ctx.font = `italic ${fontSize}px "Segoe Script", "Brush Script MT", cursive`;
    if (ctx.measureText(text).width <= maxTextWidth) break;
    fontSize -= 2;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(text, canvas.width / 2, 156);

  return canvas.toDataURL('image/png');
}

export default function FirmaConformidadMantenimientoPage() {
  const { token = '' } = useParams();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasStrokeRef = useRef(false);

  const [status, setStatus] = useState<NormalizedStatus>({
    state: 'loading',
    message: 'Validando enlace de firma...',
  });
  const [firmaModo, setFirmaModo] = useState<FirmaModo>('AUTO');
  const [nombreCliente, setNombreCliente] = useState('');
  const [firmaAutomaticaDataUri, setFirmaAutomaticaDataUri] = useState('');
  const [firmaTrazadaDataUri, setFirmaTrazadaDataUri] = useState('');
  const [calificacion, setCalificacion] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!token.trim()) {
        if (active) setStatus({ state: 'invalid', message: 'El enlace de firma no es válido.' });
        return;
      }
      try {
        const response = await consultarFirmaConformidadMantenimiento(token);
        if (!active) return;
        const normalized = normalizeStatus(response);
        setStatus(normalized);
        setNombreCliente(normalized.nombreCliente ?? '');
        if (normalized.calificacion) setCalificacion(normalized.calificacion);
      } catch (rawError) {
        if (!active) return;
        const err = rawError as Error & { status?: number; payload?: Record<string, unknown> };
        const msg = typeof err?.payload?.message === 'string'
          ? err.payload.message as string
          : err.message || 'No se pudo consultar la firma.';
        if (err.status === 404) { setStatus({ state: 'invalid', message: msg }); }
        else if (err.status === 410) { setStatus({ state: 'expired', message: msg }); }
        else { setStatus({ state: 'error', message: msg }); }
      }
    };
    load();
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    let active = true;
    if (firmaModo === 'AUTO') {
      generateFirmaAutomaticaDataUri(nombreCliente)
        .then((uri) => { if (active) setFirmaAutomaticaDataUri(uri); })
        .catch(() => { if (active) setFirmaAutomaticaDataUri(''); });
    }
    return () => { active = false; };
  }, [firmaModo, nombreCliente]);

  const heroMeta = useMemo(
    () => [
      { label: 'Empresa', value: status.empresaNombre },
      { label: 'Sede', value: status.sedeNombre },
      { label: 'Técnico', value: status.tecnicoNombre },
      { label: 'Fecha', value: formatFecha(status.fechaMantenimiento) },
    ].filter((item) => item.value),
    [status.empresaNombre, status.sedeNombre, status.tecnicoNombre, status.fechaMantenimiento],
  );

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  };

  const handleStartDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { x, y } = getCanvasPoint(event);
    canvas.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;
    hasStrokeRef.current = true;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.25;
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleMoveDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { x, y } = getCanvasPoint(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleEndDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (hasStrokeRef.current) setFirmaTrazadaDataUri(canvas.toDataURL('image/png'));
  };

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    isDrawingRef.current = false;
    hasStrokeRef.current = false;
    setFirmaTrazadaDataUri('');
  };

  const selectedSignature = firmaModo === 'DRAW' ? firmaTrazadaDataUri : firmaAutomaticaDataUri;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status.state !== 'ready') return;

    const trimmedName = nombreCliente.trim();
    if (!trimmedName) { setError('Ingrese su nombre para registrar la firma.'); return; }
    if (!selectedSignature) {
      setError(firmaModo === 'DRAW' ? 'Trace la firma antes de confirmar.' : 'No se pudo generar la firma automática.');
      return;
    }
    if (calificacion < 1 || calificacion > 5) { setError('Seleccione una calificación válida.'); return; }

    setSubmitting(true);
    setError('');

    try {
      await registrarFirmaConformidadMantenimiento({
        token,
        firma_cliente_base64: selectedSignature,
        nombre_cliente: trimmedName,
        calificacion,
      });
      setStatus({
        ...status,
        state: 'success',
        message: 'Firma registrada correctamente. El PDF firmado fue enviado a su correo.',
        nombreCliente: trimmedName,
        calificacion,
      });
    } catch (rawError) {
      const err = rawError as Error & { status?: number; payload?: Record<string, unknown> };
      const msg = typeof err?.payload?.message === 'string'
        ? err.payload.message as string
        : err.message || 'No se pudo registrar la firma.';
      if (err.status === 409) { setStatus({ ...status, state: 'signed', message: 'Ya firmó este mantenimiento.' }); }
      else if (err.status === 404) { setStatus({ state: 'invalid', message: msg }); }
      else if (err.status === 410) { setStatus({ state: 'expired', message: msg }); }
      else { setError(msg); }
    } finally {
      setSubmitting(false);
    }
  };

  const isTerminalState = status.state === 'success' || status.state === 'signed';
  const isBlockedState = status.state === 'expired' || status.state === 'invalid' || status.state === 'error';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.18),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#ecfeff_48%,#fff7ed_100%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">

          {/* ─── Left Panel ─────────────────────────────────────── */}
          <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-slate-950 px-6 py-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.28)] sm:px-8 lg:px-10">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.24),transparent_35%,rgba(249,115,22,0.2)_100%)]" />
            <div className="absolute -right-14 top-8 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="absolute -bottom-14 left-8 h-44 w-44 rounded-full bg-amber-300/20 blur-3xl" />

            <div className="relative space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                Confirmación pública
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  Firma de Conformidad
                </h1>
                <p className="max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
                  Revise el mantenimiento preventivo realizado y registre su conformidad. La firma se insertará en el PDF final y se enviará automáticamente a su correo.
                </p>
              </div>

              {heroMeta.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {heroMeta.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 backdrop-blur-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold text-white sm:text-base">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-3xl border border-white/12 bg-white/7 p-5 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/18 text-cyan-100">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12.75 11.25 15 15 9.75m6 2.25a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Proceso seguro y de un solo uso</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      El enlace valida el estado del mantenimiento, evita firmas duplicadas y notifica al cliente con el PDF firmado una vez confirmada la conformidad.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── Right Panel ────────────────────────────────────── */}
          <section className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-sm">

            <div className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] px-6 py-6 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Estado del enlace</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{status.message}</h2>
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-8">

              {/* Loading */}
              {status.state === 'loading' && (
                <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-slate-600">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-100 border-t-cyan-600" />
                  <p className="text-sm font-medium">Validando enlace de firma...</p>
                </div>
              )}

              {/* Terminal: signed / success */}
              {isTerminalState && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-900">
                    <div className="flex items-start gap-3">
                      <svg className="mt-0.5 h-6 w-6 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12.75 11.25 15 15 9.75m6 2.25a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <div>
                        <p className="text-base font-semibold">Conformidad registrada</p>
                        <p className="mt-1 text-sm leading-6 text-emerald-800">{status.message}</p>
                      </div>
                    </div>
                  </div>

                  {(status.nombreCliente || status.calificacion) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cliente</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{status.nombreCliente || 'Registrado'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Calificación</p>
                        <div className="mt-1 flex items-center gap-1 text-amber-500">
                          {STAR_VALUES.map((star) => (
                            <svg key={star} className="h-5 w-5" viewBox="0 0 20 20" fill={star <= (status.calificacion ?? 0) ? 'currentColor' : 'none'} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="m10 2.5 2.318 4.697 5.182.753-3.75 3.655.885 5.161L10 14.328 5.365 16.766l.885-5.161L2.5 7.95l5.182-.753L10 2.5Z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Blocked: expired / invalid / error */}
              {isBlockedState && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-amber-950">
                  <p className="text-base font-semibold">Enlace no disponible</p>
                  <p className="mt-1 text-sm leading-6">{status.message}</p>
                  <p className="mt-3 text-sm text-amber-800">Solicite un nuevo enlace al equipo de soporte si necesita asistencia.</p>
                </div>
              )}

              {/* Ready: form */}
              {status.state === 'ready' && (
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre Completo</label>
                    <input
                      type="text"
                      value={nombreCliente}
                      onChange={(e) => { setNombreCliente(e.target.value); setError(''); }}
                      placeholder="Ingrese su nombre completo..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 transition"
                    />
                  </div>

                  {/* Modo de firma */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Firma</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: 'AUTO' as FirmaModo, label: 'Automática', desc: 'Genera firma con su nombre' },
                        { value: 'DRAW' as FirmaModo, label: 'Trazar', desc: 'Dibuje su firma manualmente' },
                      ]).map((opt) => {
                        const active = firmaModo === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFirmaModo(opt.value)}
                            className="text-left p-3 rounded-xl transition-all"
                            style={active
                              ? { border: '2px solid #0e7490', background: '#ecfeff' }
                              : { border: '2px solid #e2e8f0', background: '#fff' }}
                          >
                            <p className="text-sm font-bold text-slate-800">{opt.label}</p>
                            <p className="text-xs mt-0.5 text-slate-500">{opt.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Firma */}
                  <div>
                    {firmaModo === 'AUTO' ? (
                      <div className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 min-h-[100px] flex items-center justify-center">
                        {firmaAutomaticaDataUri ? (
                          <img src={firmaAutomaticaDataUri} alt="Firma automática" className="max-h-24 object-contain" />
                        ) : (
                          <p className="text-sm text-slate-400">Ingrese su nombre para generar la firma</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <canvas
                          ref={canvasRef}
                          width={920}
                          height={240}
                          onPointerDown={handleStartDrawing}
                          onPointerMove={handleMoveDrawing}
                          onPointerUp={handleEndDrawing}
                          onPointerLeave={handleEndDrawing}
                          onPointerCancel={handleEndDrawing}
                          className="w-full h-32 rounded-xl touch-none"
                          style={{ border: '2px dashed #94a3b8', background: '#fff' }}
                        />
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-slate-500">Firme con mouse o pantalla táctil</p>
                          <button
                            type="button"
                            onClick={clearDrawing}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                          >
                            Limpiar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Calificación */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Calificación del Técnico</label>
                    <div className="flex items-center gap-2">
                      {STAR_VALUES.map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setCalificacion(star)}
                          className="transition-transform hover:scale-110"
                        >
                          <svg className="h-8 w-8" viewBox="0 0 20 20" fill={star <= calificacion ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth={1.2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m10 2.5 2.318 4.697 5.182.753-3.75 3.655.885 5.161L10 14.328 5.365 16.766l.885-5.161L2.5 7.95l5.182-.753L10 2.5Z" />
                          </svg>
                        </button>
                      ))}
                      <span className="text-sm font-semibold text-slate-600 ml-2">{calificacion}/5</span>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      {error}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting || !nombreCliente.trim() || !selectedSignature}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #0e7490, #0891b2)', boxShadow: '0 4px 14px rgba(14,116,144,0.35)' }}
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Registrando firma...
                      </>
                    ) : (
                      'Confirmar Firma de Conformidad'
                    )}
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

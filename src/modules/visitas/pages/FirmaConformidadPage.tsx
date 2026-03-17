import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  consultarFirmaConformidad,
  registrarFirmaConformidad,
  type FirmaConformidadEstadoResponse,
} from '../services/visitasService';

type FirmaModo = 'AUTO' | 'DRAW';

type ViewState = 'loading' | 'ready' | 'success' | 'signed' | 'expired' | 'invalid' | 'error';

interface NormalizedFirmaStatus {
  state: ViewState;
  message: string;
  empresaNombre?: string;
  tecnicoNombre?: string;
  visitaCodigo?: string;
  fechaVisita?: string;
  nombreCliente?: string;
  calificacion?: number;
}

const STAR_VALUES = [1, 2, 3, 4, 5];

function normalizeFirmaStatus(response: FirmaConformidadEstadoResponse | null): NormalizedFirmaStatus {
  const payload = response?.data ?? response ?? {};
  const rawState = String(payload?.estado ?? payload?.status ?? '').toUpperCase();
  const signed = Boolean(
    payload?.yaFirmo
      ?? payload?.ya_firmo
      ?? payload?.firmado
      ?? payload?.firmada
      ?? payload?.completado
      ?? payload?.completada,
  ) || rawState.includes('FIRM');
  const expired = Boolean(payload?.expirado ?? payload?.expired) || rawState.includes('EXPIR');
  const invalid = Boolean(payload?.invalido ?? payload?.invalid) || rawState.includes('INVALID');

  if (signed) {
    return {
      state: 'signed',
      message: 'Gracias, ya firmó esta visita. PDF firmado enviado a su correo.',
      empresaNombre: payload?.empresaNombre ?? payload?.empresa_nombre ?? payload?.empresa?.nombre,
      tecnicoNombre: payload?.tecnicoNombre ?? payload?.tecnico_nombre ?? payload?.tecnico?.nombre,
      visitaCodigo: payload?.visitaCodigo ?? payload?.visita_codigo ?? payload?.visita?.codigo,
      fechaVisita: payload?.fechaVisita ?? payload?.fecha_visita ?? payload?.visita?.fecha,
      nombreCliente: payload?.nombreCliente ?? payload?.nombre_cliente,
      calificacion: Number(payload?.calificacion ?? payload?.rating ?? 0) || undefined,
    };
  }

  if (expired) {
    return {
      state: 'expired',
      message: typeof payload?.message === 'string' ? payload.message : 'Este enlace de firma ya expiró o no está disponible.',
      empresaNombre: payload?.empresaNombre ?? payload?.empresa_nombre ?? payload?.empresa?.nombre,
      tecnicoNombre: payload?.tecnicoNombre ?? payload?.tecnico_nombre ?? payload?.tecnico?.nombre,
      visitaCodigo: payload?.visitaCodigo ?? payload?.visita_codigo ?? payload?.visita?.codigo,
      fechaVisita: payload?.fechaVisita ?? payload?.fecha_visita ?? payload?.visita?.fecha,
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
    message: typeof payload?.message === 'string' ? payload.message : 'Revise la conformidad de la visita y complete la firma.',
    empresaNombre: payload?.empresaNombre ?? payload?.empresa_nombre ?? payload?.empresa?.nombre,
    tecnicoNombre: payload?.tecnicoNombre ?? payload?.tecnico_nombre ?? payload?.tecnico?.nombre,
    visitaCodigo: payload?.visitaCodigo ?? payload?.visita_codigo ?? payload?.visita?.codigo,
    fechaVisita: payload?.fechaVisita ?? payload?.fecha_visita ?? payload?.visita?.fecha,
    nombreCliente: payload?.nombreCliente ?? payload?.nombre_cliente ?? '',
    calificacion: Number(payload?.calificacion ?? payload?.rating ?? 0) || undefined,
  };
}

function formatFecha(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

async function generateFirmaAutomaticaDataUri(nombreCliente: string): Promise<string> {
  const nombre = nombreCliente.trim();
  if (!nombre) return '';

  if (document.fonts?.load) {
    try {
      await Promise.race([
        document.fonts.load('48px Pacifico'),
        new Promise((resolve) => setTimeout(resolve, 250)),
      ]);
    } catch {
      // Fallback a fuentes cursivas del sistema.
    }
  }

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
    ctx.font = `italic ${fontSize}px "Pacifico", "Great Vibes", "Brush Script MT", "Segoe Script", cursive`;
    if (ctx.measureText(nombre).width <= maxTextWidth) break;
    fontSize -= 2;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(nombre, canvas.width / 2, 156);

  return canvas.toDataURL('image/png');
}

export default function FirmaConformidadPage() {
  const { token = '' } = useParams();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasStrokeRef = useRef(false);

  const [status, setStatus] = useState<NormalizedFirmaStatus>({
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

    const loadStatus = async () => {
      if (!token.trim()) {
        if (active) {
          setStatus({ state: 'invalid', message: 'El enlace de firma no es válido.' });
        }
        return;
      }

      try {
        const response = await consultarFirmaConformidad(token);
        if (!active) return;
        const normalized = normalizeFirmaStatus(response);
        setStatus(normalized);
        setNombreCliente(normalized.nombreCliente ?? '');
        if (normalized.calificacion) {
          setCalificacion(normalized.calificacion);
        }
      } catch (rawError) {
        if (!active) return;
        const requestError = rawError as Error & { status?: number; payload?: any };
        const fallbackMessage = typeof requestError?.payload?.message === 'string'
          ? requestError.payload.message
          : requestError.message || 'No se pudo consultar la firma de conformidad.';

        if (requestError.status === 404) {
          setStatus({ state: 'invalid', message: fallbackMessage || 'El enlace de firma no existe.' });
          return;
        }

        if (requestError.status === 410) {
          setStatus({ state: 'expired', message: fallbackMessage || 'Este enlace de firma ya expiró.' });
          return;
        }

        setStatus({ state: 'error', message: fallbackMessage });
      }
    };

    loadStatus();

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    let active = true;

    const renderAutoSignature = async () => {
      if (firmaModo !== 'AUTO') return;
      const dataUri = await generateFirmaAutomaticaDataUri(nombreCliente);
      if (active) {
        setFirmaAutomaticaDataUri(dataUri);
      }
    };

    renderAutoSignature().catch(() => {
      if (active) {
        setFirmaAutomaticaDataUri('');
      }
    });

    return () => {
      active = false;
    };
  }, [firmaModo, nombreCliente]);

  const heroMeta = useMemo(
    () => [
      { label: 'Empresa', value: status.empresaNombre },
      { label: 'Técnico', value: status.tecnicoNombre },
      { label: 'Visita', value: status.visitaCodigo },
      { label: 'Fecha', value: formatFecha(status.fechaVisita) },
    ].filter((item) => item.value),
    [status.empresaNombre, status.tecnicoNombre, status.visitaCodigo, status.fechaVisita],
  );

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
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

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (hasStrokeRef.current) {
      setFirmaTrazadaDataUri(canvas.toDataURL('image/png'));
    }
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
    if (!trimmedName) {
      setError('Ingrese el nombre del cliente para registrar la firma.');
      return;
    }

    if (!selectedSignature) {
      setError(
        firmaModo === 'DRAW'
          ? 'Trace la firma del cliente antes de confirmar.'
          : 'No se pudo generar la firma automática. Revise el nombre y vuelva a intentar.',
      );
      return;
    }

    if (calificacion < 1 || calificacion > 5) {
      setError('Seleccione una calificación válida para el técnico.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await registrarFirmaConformidad({
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
      const requestError = rawError as Error & { status?: number; payload?: any };
      const message = typeof requestError?.payload?.message === 'string'
        ? requestError.payload.message
        : requestError.message || 'No se pudo registrar la firma.';

      if (requestError.status === 409) {
        setStatus({
          ...status,
          state: 'signed',
          message: 'Gracias, ya firmó esta visita. PDF firmado enviado a su correo.',
        });
      } else if (requestError.status === 404) {
        setStatus({ state: 'invalid', message });
      } else if (requestError.status === 410) {
        setStatus({ state: 'expired', message });
      } else {
        setError(message);
      }
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
          <section className="relative overflow-hidden rounded-4xl border border-white/70 bg-slate-950 px-6 py-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.28)] sm:px-8 lg:px-10">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.24),transparent_35%,rgba(249,115,22,0.2)_100%)]" />
            <div className="absolute -right-14 top-8 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="absolute -bottom-14 left-8 h-44 w-44 rounded-full bg-amber-300/20 blur-3xl" />

            <div className="relative space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                Confirmación pública
              </div>

              <div className="space-y-4">
                <h1 className="font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Firma de Conformidad
                </h1>
                <p className="max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
                  Revise el cierre de la visita técnica y registre su conformidad. La firma se insertará en el PDF final y se enviará automáticamente a su correo.
                </p>
              </div>

              {heroMeta.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {heroMeta.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 backdrop-blur-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold text-white sm:text-base">{item.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}

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
                      El enlace valida el estado de la visita, evita firmas duplicadas y notifica al cliente con el PDF firmado una vez confirmada la conformidad.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-4xl border border-slate-200/70 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-sm">
            <div className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] px-6 py-6 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Estado del enlace</p>
              <div className="mt-3 flex items-start gap-3">
                <div className="mt-0.5 h-10 w-10 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-1.5 0h12a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18v-6A1.5 1.5 0 0 1 6 10.5Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{status.message}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {status.state === 'loading'
                      ? 'Consultando el backend para validar el token y recuperar el estado de la visita.'
                      : isTerminalState
                        ? 'No se requiere ninguna acción adicional por parte del cliente.'
                        : isBlockedState
                          ? 'Si necesita apoyo adicional, solicite un nuevo enlace al equipo de soporte.'
                          : 'Complete el nombre, el tipo de firma y la calificación para confirmar la visita.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-8">
              {status.state === 'loading' ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center text-slate-600">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-100 border-t-cyan-600" />
                  <p className="text-sm font-medium">Validando enlace de firma...</p>
                </div>
              ) : null}

              {isTerminalState ? (
                <div className="space-y-6">
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-900">
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

                  {status.nombreCliente || status.calificacion ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cliente</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{status.nombreCliente || 'Registrado'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Calificación del técnico</p>
                        <div className="mt-1 flex items-center gap-1 text-amber-500">
                          {STAR_VALUES.map((star) => (
                            <svg key={star} className="h-5 w-5" viewBox="0 0 20 20" fill={star <= (status.calificacion ?? 0) ? 'currentColor' : 'none'} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="m10 2.5 2.318 4.697 5.182.753-3.75 3.655.885 5.161L10 14.328 5.365 16.766l.885-5.161L2.5 7.95l5.182-.753L10 2.5Z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {isBlockedState ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-5 text-amber-950">
                  <div className="flex items-start gap-3">
                    <svg className="mt-0.5 h-6 w-6 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3.75m0 3.75h.0075M10.29 3.86 1.82 18a2.25 2.25 0 0 0 1.93 3.375h16.5A2.25 2.25 0 0 0 22.18 18L13.71 3.86a2.25 2.25 0 0 0-3.42 0Z" />
                    </svg>
                    <div>
                      <p className="text-base font-semibold">No es posible registrar la firma</p>
                      <p className="mt-1 text-sm leading-6 text-amber-900">{status.message}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {status.state === 'ready' ? (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  {error ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {error}
                    </div>
                  ) : null}

                  <div className="grid gap-5">
                    <div>
                      <label htmlFor="nombre-cliente" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Nombre del cliente
                      </label>
                      <input
                        id="nombre-cliente"
                        type="text"
                        value={nombreCliente}
                        onChange={(event) => setNombreCliente(event.target.value)}
                        placeholder="Ingrese el nombre completo"
                        autoComplete="name"
                        className="h-12 rounded-2xl border-slate-200 bg-white px-4 text-sm shadow-sm"
                      />
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tipo de firma</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {[
                          {
                            value: 'AUTO' as const,
                            title: 'Automática',
                            description: 'Genera una firma manuscrita a partir del nombre ingresado.',
                          },
                          {
                            value: 'DRAW' as const,
                            title: 'Trazar',
                            description: 'Dibuje la firma manualmente usando mouse o pantalla táctil.',
                          },
                        ].map((option) => {
                          const isActive = firmaModo === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setFirmaModo(option.value)}
                              className={`rounded-3xl border px-4 py-4 text-left transition ${
                                isActive
                                  ? 'border-cyan-500 bg-cyan-50 shadow-[0_10px_30px_rgba(8,145,178,0.12)]'
                                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <p className="text-sm font-semibold text-slate-900">{option.title}</p>
                              <p className="mt-1 text-sm leading-6 text-slate-600">{option.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-4 shadow-sm">
                      {firmaModo === 'AUTO' ? (
                        <div className="space-y-3">
                          <div className="rounded-3xl border border-cyan-100 bg-cyan-50/70 px-4 py-3 text-sm text-cyan-900">
                            La firma se genera automáticamente con el nombre del cliente en estilo manuscrito.
                          </div>
                          <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-4">
                            {firmaAutomaticaDataUri ? (
                              <img
                                src={firmaAutomaticaDataUri}
                                alt="Firma automática del cliente"
                                className="max-h-[180px] w-full object-contain"
                              />
                            ) : (
                              <p className="max-w-sm text-center text-sm leading-6 text-slate-500">
                                Ingrese el nombre del cliente para previsualizar la firma automática.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-amber-100 bg-amber-50/80 px-4 py-3">
                            <p className="text-sm text-amber-950">Firme dentro del recuadro. Se capturará exactamente como se dibuje.</p>
                            <button
                              type="button"
                              onClick={clearDrawing}
                              className="rounded-full border border-amber-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800 transition hover:bg-amber-100"
                            >
                              Limpiar
                            </button>
                          </div>
                          <canvas
                            ref={canvasRef}
                            width={1080}
                            height={320}
                            onPointerDown={handleStartDrawing}
                            onPointerMove={handleMoveDrawing}
                            onPointerUp={handleEndDrawing}
                            onPointerLeave={handleEndDrawing}
                            onPointerCancel={handleEndDrawing}
                            className="h-[220px] w-full rounded-3xl border border-dashed border-slate-300 bg-white touch-none"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Calificación del técnico</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {STAR_VALUES.map((star) => {
                          const active = star <= calificacion;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setCalificacion(star)}
                              className={`group flex h-12 w-12 items-center justify-center rounded-2xl border transition ${
                                active
                                  ? 'border-amber-300 bg-amber-50 text-amber-500 shadow-[0_8px_18px_rgba(245,158,11,0.15)]'
                                  : 'border-slate-200 bg-white text-slate-300 hover:border-slate-300 hover:text-slate-500'
                              }`}
                              aria-label={`Calificar con ${star} estrella${star > 1 ? 's' : ''}`}
                            >
                              <svg className="h-6 w-6" viewBox="0 0 20 20" fill={active ? 'currentColor' : 'none'} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="m10 2.5 2.318 4.697 5.182.753-3.75 3.655.885 5.161L10 14.328 5.365 16.766l.885-5.161L2.5 7.95l5.182-.753L10 2.5Z" />
                              </svg>
                            </button>
                          );
                        })}
                        <span className="ml-1 text-sm font-medium text-slate-600">
                          {calificacion} de 5
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0891b2,#0f766e)] px-6 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(8,145,178,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting ? 'Confirmando...' : 'Confirmar'}
                  </button>
                </form>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
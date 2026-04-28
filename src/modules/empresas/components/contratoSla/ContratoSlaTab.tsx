import { useState, useEffect, useCallback, useRef } from 'react';
import { ContratoSlaProvider, useContratoSla } from './ContratoSlaContext';
import ContratoSlaWizard from './ContratoSlaWizard';
import ContratoSlaView from './ContratoSlaView';
import ContratoVersionActiva from './ContratoVersionActiva';
import type { WizardContratoSlaState, ContratoVersion, DocumentoContrato } from './types';
import {
  getContratoActivo,
  getContratoById,
  createContrato,
  updateContratoServicios,
  updateContratoPreventivo,
  updateContratoEconomicos,
  uploadContratoDocumentos,
  deleteContratoDocumento,
} from '@/modules/empresas/services/contratosService';
import { slaService } from '@/modules/sla/services/slaService';
import { getTicketTypes, getCatalogCategories } from '@/modules/catalogo/services/catalogoService';
import { getServicios } from '@/modules/catalogo/services/servicioApi';

// ─────────────────────────────────────────────────
// Helper: convert minutes to human-readable string
// ─────────────────────────────────────────────────
function minutesToDisplay(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function toDateInputValue(value?: string): string {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';

  // Already in date-input format
  const plainDate = trimmed.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (plainDate) return plainDate[1];

  // ISO-like values: keep only YYYY-MM-DD prefix
  const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoPrefix) return isoPrefix[1];

  // Fallback for other parseable formats
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '';
}

// ─────────────────────────────────────────────────
// Helper: map raw API contrato to ContratoVersion
// ─────────────────────────────────────────────────
function mapApiToContratoVersion(raw: any): ContratoVersion | null {
  if (!raw) return null;
  const id = String(raw._id || raw.id || '');
  return {
    id,
    version: raw.version || 1,
    estado: raw.estadoContrato || raw.estado_contrato || 'activo',
    fechaInicio: raw.fechaInicio || raw.fecha_inicio || '',
    fechaFin: raw.fechaFin || raw.fecha_fin || '',
    tipoContrato: raw.tipoContrato || raw.tipo_contrato || '',
    motivoRenovacion: raw.motivoRenovacion || raw.motivo_renovacion,
    aprobadoPor: raw.aprobadoPor || raw.aprobado_por,
    creadoPor: raw.creadoPor || raw.creado_por,
    creadoEn: raw.creadoEn || raw.creado_en,
    monto: raw.economics?.montoReferencial || raw.economics?.monto_referencial,
    moneda: raw.economics?.moneda,
    datosContrato: {
      tipoContrato: raw.tipoContrato || raw.tipo_contrato || '',
      estadoContrato: raw.estadoContrato || raw.estado_contrato || '',
      fechaInicio: raw.fechaInicio || raw.fecha_inicio || '',
      fechaFin: raw.fechaFin || raw.fecha_fin || '',
      renovacionAutomatica: raw.renovacionAutomatica ?? raw.renovacion_automatica ?? true,
      responsableComercial: raw.responsableComercial || raw.responsable_comercial || '',
      observacionesContractuales: raw.observaciones || raw.observaciones_contractuales || '',
      visitaFrecuencia: raw.visitaFrecuencia || raw.visita_frecuencia || '',
      cantidadVisitas: String(raw.cantidadVisitas || raw.cantidad_visitas || ''),
    },
    servicios: {
      soporteRemoto: raw.services?.soporteRemoto ?? false,
      soportePresencial: raw.services?.soportePresencial ?? false,
      mantenimientoPreventivo: raw.services?.mantenimientoPreventivo ?? false,
      gestionInventario: raw.services?.gestionInventario ?? false,
      gestionCredenciales: raw.services?.gestionCredenciales ?? false,
      monitoreo: raw.services?.monitoreo ?? false,
      informesMensuales: raw.services?.informesMensuales ?? false,
      gestionAccesos: raw.services?.gestionAccesos ?? false,
      horasMensualesIncluidas: String(raw.services?.horasMensualesIncluidas || ''),
      excesoHorasFacturable: raw.services?.excesoHorasFacturable ?? false,
      serviciosPersonalizados: [],
    },
    mantenimiento: {
      incluyePreventivo: raw.preventivePolicy?.incluyePreventivo ?? false,
      frecuencia: raw.preventivePolicy?.frecuencia || '',
      modalidad: raw.preventivePolicy?.modalidad || '',
      aplica: raw.preventivePolicy?.aplica || '',
      observaciones: raw.preventivePolicy?.observaciones || '',
    },
    economicas: {
      tipoFacturacion: raw.economics?.tipoFacturacion || '',
      montoReferencial: String(raw.economics?.montoReferencial || ''),
      moneda: raw.economics?.moneda || '',
      diaFacturacion: String(raw.economics?.diaFacturacion || ''),
      observaciones: raw.economics?.observaciones || '',
    },
  };
}

function mapApiDocumentos(raw: any[]): DocumentoContrato[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(d => ({
    id: String(d._id || d.id || ''),
    _id: String(d._id || d.id || ''),
    nombre: d.nombre || d.archivo || d.name || 'Documento',
    url: d.url || d.ruta,
    archivo: d.archivo || d.filename,
    fecha: d.fecha || d.createdAt || '',
    hora: d.hora || '',
    usuario: d.usuario || d.user || '',
    tipo: (d.tipo === 'contrato_principal' || d.tipo === 'auto') ? 'auto' : d.tipo || 'manual',
    hash: d.hash || d.sha,
  }));
}

function resolveHistoryUser(h: any): string {
  const normalize = (v: any) => (typeof v === 'string' ? v.trim() : '');

  const candidates = [
    normalize(h.nombreUsuario),
    normalize(h.nombre_usuario),
    normalize(h.userName),
    normalize(h.user_name),
    normalize(h.user?.nombre),
    normalize(h.user?.name),
    normalize(h.usuario),
    normalize(h.user),
    normalize(h.createdBy),
    normalize(h.created_by),
    normalize(h.email),
  ].filter(Boolean);

  // Prefer non-generic values over placeholders like "Sistema"
  const nonGeneric = candidates.find((c) => c.toLowerCase() !== 'sistema');
  return nonGeneric || candidates[0] || 'Sistema';
}

function mapHistorial(rawHistory: any[]) {
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory.map((h: any) => ({
    // Normalize renewal rows that backend may emit as generic edits
    // (e.g. estado_contrato: activo -> renovado with tipo_accion=EDICION)
    tipoAccion: (() => {
      const tipoRaw = String(h.tipoAccion || h.tipo_accion || '').toUpperCase();
      const campoRaw = String(h.campo || h.fieldChanged || '').toLowerCase();
      const nuevoRaw = String(h.valorNuevo || h.newValue || '').toLowerCase();
      const motivoRaw = String(h.motivo || h.reason || '').toLowerCase();

      const isRenewalByState = campoRaw.includes('estado') && nuevoRaw.includes('renovado');
      const isRenewalByMotivo = motivoRaw.includes('renov');

      if (tipoRaw === 'RENOVACION' || isRenewalByState || isRenewalByMotivo) return 'RENOVACION';
      if (tipoRaw) return tipoRaw;
      return 'EDICION';
    })(),
    campo: h.campo || h.fieldChanged || '',
    valorAnterior: h.valorAnterior || h.oldValue || '—',
    valorNuevo: h.valorNuevo || h.newValue || '—',
    motivo: h.motivo || h.reason,
    // Store raw ISO/timestamp — let component format it
    fecha: h.fecha || h.timestamp || h.createdAt || h.created_at || '',
    usuario: resolveHistoryUser(h),
    contractId: h.contractId || h.contract_id || h.contratoId,
  }));
}

// ─────────────────────────────────────────────────
// Inner component (needs context)
// ─────────────────────────────────────────────────
interface InnerProps {
  empresaId: string;
  sedes?: Array<{ id: string; nombre: string }>;
  usuariosAdmin?: Array<{ id: string; nombre: string }>;
}

function ContratoSlaTabInner({ empresaId, sedes = [], usuariosAdmin = [] }: InnerProps) {
  const { state, initRenewal, reset } = useContratoSla();

  const [mode, setMode] = useState<'loading' | 'wizard' | 'view'>('loading');
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false); // sync guard — prevents double-submit before React state propagates
  const [saveError, setSaveError] = useState<string | null>(null);
  const [contratoActivo, setContratoActivo] = useState<ContratoVersion | null>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoContrato[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [detalleContrato, setDetalleContrato] = useState<ContratoVersion | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load contrato on mount
  const loadContrato = useCallback(async () => {
    setMode('loading');
    setSaveError(null);
    try {
      // Fetch contrato + SLA data + catalogs in parallel
      const [raw, alcanceRaw, tiemposRaw, horariosRaw, ticketTypes, catalogCategorias, catalogServicios] = await Promise.all([
        getContratoActivo(empresaId),
        slaService.getAlcance(empresaId).catch(() => null),
        slaService.getTiempos(empresaId).catch(() => null),
        slaService.getHorarios(empresaId).catch(() => null),
        getTicketTypes().catch(() => [] as any[]),
        getCatalogCategories().catch(() => [] as any[]),
        getServicios().catch(() => [] as any[]),
      ]);

      // Build ID → nombre lookup maps
      const ticketMap: Record<string, string> = {};
      (ticketTypes || []).forEach((t: any) => { ticketMap[String(t.id)] = t.nombre || t.id; });
      const catMap: Record<string, string> = {};
      (catalogCategorias || []).forEach((c: any) => { catMap[String(c.id ?? c._id ?? c.nombre)] = c.nombre; });
      const svcMap: Record<string, string> = {};
      (catalogServicios || []).forEach((s: any) => { svcMap[String(s.id ?? s._id)] = s.nombre || String(s.id); });
      const sedeMap: Record<string, string> = {};
      sedes.forEach((s) => { sedeMap[s.id] = s.nombre; });

      if (raw) {
        const version = mapApiToContratoVersion(raw);
        if (!version) { setMode('wizard'); reset(); return; }

        // Attach SLA data fetched from separate API
        if (alcanceRaw) {
          const resolveNames = (ids: any[], map: Record<string, string>) =>
            (ids || []).map((id) => map[String(id)] || String(id));

          version.alcanceSla = {
            slaActivo: true,
            aplicaA: 'incidentes',
            tiposTicket: resolveNames(alcanceRaw.tiposTicket || [], ticketMap),
            serviciosCatalogoSLA: {
              tipo: alcanceRaw.aplica_todos_servicios ? 'todos' : 'seleccionados',
              servicios: resolveNames(alcanceRaw.servicios ?? [], svcMap),
            },
            activosCubiertos: {
              tipo: alcanceRaw.aplica_todas_categorias ? 'todos' : 'porCategoria',
              categorias: resolveNames(alcanceRaw.categorias ?? [], catMap),
            },
            sedesCubiertas: {
              tipo: alcanceRaw.aplica_todas_sedes ? 'todas' : 'seleccionadas',
              sedes: resolveNames(alcanceRaw.sedes ?? [], sedeMap),
            },
            observaciones: alcanceRaw.observaciones || '',
          };
        }

        // Normalize tiempos — handle { tiempos: [] }, { data: { tiempos: [] } } or []
        const tiemposArray: any[] = tiemposRaw
          ? (Array.isArray(tiemposRaw) ? tiemposRaw
            : tiemposRaw.tiempos ?? tiemposRaw.data?.tiempos ?? [])
          : [];
        if (tiemposArray.length) {
          version.tiemposSla = {
            tiemposPorPrioridad: tiemposArray.map((t: any) => ({
              prioridad: (t.prioridad || 'media').toLowerCase() as 'critica' | 'alta' | 'media' | 'baja',
              tiempoRespuesta: minutesToDisplay(t.tiempo_respuesta_minutos ?? t.tiempoRespuesta ?? 60),
              tiempoResolucion: minutesToDisplay(t.tiempo_resolucion_minutos ?? t.tiempoResolucion ?? 240),
              escalamiento: t.escalamiento ?? false,
              tiempoEscalamiento: (t.tiempo_escalamiento_minutos || t.tiempoEscalamiento)
                ? minutesToDisplay(t.tiempo_escalamiento_minutos ?? t.tiempoEscalamiento ?? 0)
                : undefined,
            })),
          };
        }

        const DIAS_NOMBRES: Record<number, string> = {
          0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miercoles',
          4: 'Jueves', 5: 'Viernes', 6: 'Sabado',
        };
        // Normalize horarios — handle { horarios: [] }, { data: { horarios: [] } } or []
        const horariosArray: any[] = horariosRaw
          ? (Array.isArray(horariosRaw) ? horariosRaw
            : horariosRaw.horarios ?? horariosRaw.data?.horarios ?? [])
          : [];
        if (horariosArray.length) {
          const diasRecord: Record<string, { atiende: boolean; horaInicio: string; horaFin: string }> = {};
          horariosArray.forEach((h: any) => {
            const nombre = DIAS_NOMBRES[h.day_of_week] || String(h.day_of_week);
            diasRecord[nombre] = {
              atiende: h.atiende ?? h.activo ?? true,
              horaInicio: (h.hora_inicio || h.horaInicio || '08:00').slice(0, 5),
              horaFin: (h.hora_fin || h.horaFin || '18:00').slice(0, 5),
            };
          });
          version.horariosSla = {
            dias: diasRecord as any,
            excluirFeriados: false,
            calendarioFeriados: [],
          };
        }

        setContratoActivo(version);
        setHistorial(mapHistorial(raw.history || []));
        setDocumentos(mapApiDocumentos(raw.documentos || raw.documents || []));
        setMode('view');
      } else {
        setMode('wizard');
        reset();
      }
    } catch (err) {
      console.error('[ContratoSlaTab] Error cargando contrato:', err);
      setMode('wizard');
      reset();
    }
  }, [empresaId, reset, sedes]);

  useEffect(() => { loadContrato(); }, [loadContrato]);

  // Save wizard
  const handleWizardSave = async (wizardState: WizardContratoSlaState) => {
    // Guard against double/triple submit (click spam before React re-renders)
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    try {
      const d = wizardState.datosContrato;

      // 1. Create contrato base
      const created = await createContrato(empresaId, {
        tipoContrato: d.tipoContrato,
        estadoContrato: d.estadoContrato || 'activo',
        fechaInicio: d.fechaInicio,
        fechaFin: d.fechaFin,
        renovacionAutomatica: d.renovacionAutomatica,
        responsableComercial: d.responsableComercial,
        observaciones: d.observacionesContractuales,
        visitaFrecuencia: d.visitaFrecuencia,
        cantidadVisitas: d.cantidadVisitas ? Number(d.cantidadVisitas) : undefined,
        motivo: wizardState.isRenewal
          ? (wizardState.motivoRenovacion || 'Renovación de contrato')
          : 'Creación del contrato',
      });

      const contractId = created._id || created.id;

      // 2. Servicios
      const sv = wizardState.servicios;
      await updateContratoServicios(empresaId, contractId, {
        soporteRemoto: sv.soporteRemoto,
        soportePresencial: sv.soportePresencial,
        mantenimientoPreventivo: sv.mantenimientoPreventivo,
        gestionInventario: sv.gestionInventario,
        gestionCredenciales: sv.gestionCredenciales,
        monitoreo: sv.monitoreo,
        informesMensuales: sv.informesMensuales,
        gestionAccesos: sv.gestionAccesos,
        horasMensualesIncluidas: sv.horasMensualesIncluidas ? Number(sv.horasMensualesIncluidas) : undefined,
        excesoHorasFacturable: sv.excesoHorasFacturable,
        motivo: 'Configuración de servicios desde wizard',
      });

      // 3. Preventivo
      const pv = wizardState.mantenimiento;
      await updateContratoPreventivo(empresaId, contractId, {
        incluyePreventivo: pv.incluyePreventivo,
        frecuencia: pv.frecuencia,
        modalidad: pv.modalidad,
        aplica: pv.aplica,
        observaciones: pv.observaciones,
        motivo: 'Configuración preventivo desde wizard',
      });

      // 4. Económicas
      const ec = wizardState.economicas;
      await updateContratoEconomicos(empresaId, contractId, {
        tipoFacturacion: ec.tipoFacturacion,
        moneda: ec.moneda,
        montoReferencial: ec.montoReferencial ? Number(ec.montoReferencial) : undefined,
        diaFacturacion: ec.diaFacturacion ? Number(ec.diaFacturacion) : undefined,
        observaciones: ec.observaciones,
        motivo: 'Configuración económica desde wizard',
      });

      // 5. SLA Alcance
      const al = wizardState.alcanceSla;
      try {
        await slaService.guardarAlcance(empresaId, {
          tiposTicket: al.tiposTicket,
          servicios: al.serviciosCatalogoSLA?.tipo === 'todos'
            ? undefined
            : (al.serviciosCatalogoSLA?.servicios ?? []).map(Number).filter(Boolean),
          categorias: al.activosCubiertos?.tipo === 'todos'
            ? undefined
            : (al.activosCubiertos?.categorias ?? []).map(Number).filter(Boolean),
          sedes: al.sedesCubiertas?.tipo === 'todas'
            ? undefined
            : (al.sedesCubiertas?.sedes ?? []).map(Number).filter(Boolean),
          aplica_todos_servicios: al.serviciosCatalogoSLA?.tipo === 'todos',
          aplica_todas_categorias: al.activosCubiertos?.tipo === 'todos',
          aplica_todas_sedes: al.sedesCubiertas?.tipo === 'todas',
          observaciones: al.observaciones,
        });
      } catch (slaErr) {
        console.warn('[ContratoSlaTab] SLA alcance warning (non-blocking):', slaErr);
      }

      // 6. SLA Tiempos
      try {
        const tiemposPayload = {
          tiempos: (wizardState.tiemposSla.tiemposPorPrioridad || []).map(t => ({
            prioridad: (t.prioridad?.toUpperCase() || 'MEDIA') as 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA',
            tiempo_respuesta_minutos: parseTimeToMinutes(t.tiempoRespuesta),
            tiempo_resolucion_minutos: parseTimeToMinutes(t.tiempoResolucion),
            escalamiento: t.escalamiento,
            tiempo_escalamiento_minutos: t.escalamiento ? parseTimeToMinutes(t.tiempoEscalamiento || '') : undefined,
          })),
        };
        await slaService.guardarTiempos(empresaId, tiemposPayload);
      } catch (slaErr) {
        console.warn('[ContratoSlaTab] SLA tiempos warning (non-blocking):', slaErr);
      }

      // 7. SLA Horarios
      try {
        const hs = wizardState.horariosSla;
        const DIAS_MAP: Record<string, number> = { Domingo: 0, Lunes: 1, Martes: 2, Miercoles: 3, Jueves: 4, Viernes: 5, Sabado: 6 };
        const horariosPayload = {
          horarios: Object.entries(hs.dias || {}).map(([dia, cfg]) => ({
            day_of_week: DIAS_MAP[dia] ?? 0,
            atiende: cfg.atiende,
            hora_inicio: cfg.atiende ? cfg.horaInicio + ':00' : undefined,
            hora_fin: cfg.atiende ? cfg.horaFin + ':00' : undefined,
            es_feriado: false,
          })),
        };
        await slaService.guardarHorarios(empresaId, horariosPayload);
      } catch (slaErr) {
        console.warn('[ContratoSlaTab] SLA horarios warning (non-blocking):', slaErr);
      }

      showToast('✅ Contrato y SLA guardados correctamente', 'success');

      await loadContrato();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el contrato';
      setSaveError(msg);
      showToast('❌ ' + msg, 'error');
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  // Renewal
  const handleRenovar = () => {
    if (!contratoActivo) return;
    initRenewal({
      datosContrato: {
        ...contratoActivo.datosContrato,
        fechaInicio: toDateInputValue(contratoActivo.datosContrato?.fechaInicio),
        fechaFin: toDateInputValue(contratoActivo.datosContrato?.fechaFin),
      },
      servicios: contratoActivo.servicios,
      mantenimiento: contratoActivo.mantenimiento,
      economicas: contratoActivo.economicas,
      alcanceSla: contratoActivo.alcanceSla,
      tiemposSla: contratoActivo.tiemposSla,
      horariosSla: contratoActivo.horariosSla,
    });
    setMode('wizard');
  };

  const handleCancelWizard = () => {
    reset();
    if (contratoActivo) {
      setMode('view');
    }
    // If no contract exists yet, just reset to fresh wizard
  };

  // Document upload
  const handleUploadDoc = async (files: File[], tipo: string) => {
    if (!contratoActivo?.id) return;
    setUploadingDoc(true);
    try {
      await uploadContratoDocumentos(empresaId, contratoActivo.id, files, tipo, 'Subida manual de documento');
      await loadContrato();
      showToast('✅ Documento subido correctamente');
    } catch (err) {
      showToast('❌ Error al subir documento', 'error');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Document delete
  const handleDeleteDoc = async (docId: string) => {
    if (!contratoActivo?.id) return;
    try {
      await deleteContratoDocumento(empresaId, contratoActivo.id, docId, 'Eliminación manual');
      await loadContrato();
      showToast('✅ Documento eliminado');
    } catch (err) {
      showToast('❌ Error al eliminar documento', 'error');
    }
  };

  // Show renovar button whenever a contract exists
  const mostrarBotonRenovar = !!contratoActivo;

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Loading */}
      {mode === 'loading' && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-16 text-center">
          <svg className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-500 font-medium text-sm">Cargando información del contrato y SLA...</p>
        </div>
      )}

      {/* Wizard */}
      {mode === 'wizard' && (
        <div>
          {/* Header */}
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Contrato & SLA</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {state.isRenewal ? 'Renovando contrato con prefill de datos anteriores' : 'Complete todos los pasos del wizard para crear el contrato y SLA.'}
                </p>
              </div>
            </div>
          </div>

          {saveError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              ❌ {saveError}
            </div>
          )}

          <ContratoSlaWizard
            empresaId={empresaId}
            sedes={sedes}
            usuariosAdmin={usuariosAdmin}
            onSave={handleWizardSave}
            onCancel={handleCancelWizard}
            isSaving={isSaving}
          />
        </div>
      )}

      {/* View (post-save) */}
      {mode === 'view' && contratoActivo && (
        <div>
          {/* Header */}
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 mb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Contrato & SLA</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Gestión unificada del contrato y acuerdo de nivel de servicio</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  ['activo', 'vigente'].includes((contratoActivo.estado || '').toLowerCase())
                    ? 'bg-emerald-100 text-emerald-700'
                    : ['vencido'].includes((contratoActivo.estado || '').toLowerCase())
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {(contratoActivo.estado || 'activo').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Modal detalles de versión histórica */}
          {(detalleContrato || detalleLoading) && (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden">
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📋</span>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        {detalleContrato ? `Detalles del Contrato V${detalleContrato.version}` : 'Cargando...'}
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">Vista de solo lectura de la versión histórica</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetalleContrato(null)}
                    className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal body */}
                <div className="p-6 overflow-y-auto max-h-[75vh]">
                  {detalleLoading && !detalleContrato ? (
                    <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      <span className="text-sm font-medium">Cargando detalles del contrato...</span>
                    </div>
                  ) : detalleContrato ? (
                    <ContratoVersionActiva
                      contrato={detalleContrato}
                      onRenovar={() => {}}
                      mostrarBotonRenovar={false}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          )}

          <ContratoSlaView
            contratoActivo={contratoActivo}
            historial={historial}
            documentos={documentos}
            mostrarBotonRenovar={mostrarBotonRenovar}
            onRenovar={handleRenovar}
            onUploadDoc={handleUploadDoc}
            onDeleteDoc={handleDeleteDoc}
            onVerDetalles={async (id) => {
              setDetalleLoading(true);
              try {
                const [raw, alcanceRaw, tiemposRaw, horariosRaw, ticketTypes, catalogCategorias, catalogServicios] = await Promise.all([
                  getContratoById(id),
                  slaService.getAlcance(empresaId).catch(() => null),
                  slaService.getTiempos(empresaId).catch(() => null),
                  slaService.getHorarios(empresaId).catch(() => null),
                  getTicketTypes().catch(() => [] as any[]),
                  getCatalogCategories().catch(() => [] as any[]),
                  getServicios().catch(() => [] as any[]),
                ]);
                const mapped = mapApiToContratoVersion(raw);
                if (!mapped) return;

                // Lookup maps
                const ticketMap: Record<string, string> = {};
                (ticketTypes || []).forEach((t: any) => { ticketMap[String(t.id)] = t.nombre || t.id; });
                const catMap: Record<string, string> = {};
                (catalogCategorias || []).forEach((c: any) => { catMap[String(c.id ?? c._id ?? c.nombre)] = c.nombre; });
                const svcMap: Record<string, string> = {};
                (catalogServicios || []).forEach((s: any) => { svcMap[String(s.id ?? s._id)] = s.nombre || String(s.id); });
                const sedeMap: Record<string, string> = {};
                sedes.forEach((s) => { sedeMap[s.id] = s.nombre; });
                const resolveNames = (ids: any[], map: Record<string, string>) =>
                  (ids || []).map((id: any) => map[String(id)] || String(id));

                if (alcanceRaw) {
                  mapped.alcanceSla = {
                    slaActivo: true,
                    aplicaA: 'incidentes',
                    tiposTicket: resolveNames(alcanceRaw.tiposTicket || [], ticketMap),
                    serviciosCatalogoSLA: {
                      tipo: alcanceRaw.aplica_todos_servicios ? 'todos' : 'seleccionados',
                      servicios: resolveNames(alcanceRaw.servicios ?? [], svcMap),
                    },
                    activosCubiertos: {
                      tipo: alcanceRaw.aplica_todas_categorias ? 'todos' : 'porCategoria',
                      categorias: resolveNames(alcanceRaw.categorias ?? [], catMap),
                    },
                    sedesCubiertas: {
                      tipo: alcanceRaw.aplica_todas_sedes ? 'todas' : 'seleccionadas',
                      sedes: resolveNames(alcanceRaw.sedes ?? [], sedeMap),
                    },
                    observaciones: alcanceRaw.observaciones || '',
                  };
                }

                const tiemposArray: any[] = tiemposRaw
                  ? (Array.isArray(tiemposRaw) ? tiemposRaw : tiemposRaw.tiempos ?? tiemposRaw.data?.tiempos ?? [])
                  : [];
                if (tiemposArray.length) {
                  mapped.tiemposSla = {
                    tiemposPorPrioridad: tiemposArray.map((t: any) => ({
                      prioridad: (t.prioridad || 'media').toLowerCase() as 'critica' | 'alta' | 'media' | 'baja',
                      tiempoRespuesta: minutesToDisplay(t.tiempo_respuesta_minutos ?? t.tiempoRespuesta ?? 60),
                      tiempoResolucion: minutesToDisplay(t.tiempo_resolucion_minutos ?? t.tiempoResolucion ?? 240),
                      escalamiento: t.escalamiento ?? false,
                      tiempoEscalamiento: (t.tiempo_escalamiento_minutos || t.tiempoEscalamiento)
                        ? minutesToDisplay(t.tiempo_escalamiento_minutos ?? t.tiempoEscalamiento ?? 0)
                        : undefined,
                    })),
                  };
                }

                const DIAS_NOMBRES: Record<number, string> = {
                  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miercoles',
                  4: 'Jueves', 5: 'Viernes', 6: 'Sabado',
                };
                const horariosArray: any[] = horariosRaw
                  ? (Array.isArray(horariosRaw) ? horariosRaw : horariosRaw.horarios ?? horariosRaw.data?.horarios ?? [])
                  : [];
                if (horariosArray.length) {
                  const diasRecord: Record<string, { atiende: boolean; horaInicio: string; horaFin: string }> = {};
                  horariosArray.forEach((h: any) => {
                    const nombre = DIAS_NOMBRES[h.day_of_week] || String(h.day_of_week);
                    diasRecord[nombre] = {
                      atiende: h.atiende ?? h.activo ?? true,
                      horaInicio: (h.hora_inicio || h.horaInicio || '08:00').slice(0, 5),
                      horaFin: (h.hora_fin || h.horaFin || '18:00').slice(0, 5),
                    };
                  });
                  mapped.horariosSla = { dias: diasRecord as any, excluirFeriados: false, calendarioFeriados: [] };
                }

                setDetalleContrato(mapped);
              } catch (err) {
                console.error('[ContratoSlaTab] Error cargando detalle:', err);
              } finally {
                setDetalleLoading(false);
              }
            }}
            uploadingDoc={uploadingDoc}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Utility: parse time string to minutes
// ─────────────────────────────────────────────────
function parseTimeToMinutes(str?: string): number {
  if (!str) return 60;
  const match = str.match(/(\d+)\s*(hora|horas|minuto|minutos)/i);
  if (!match) return 60;
  const val = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  return unit.includes('hora') ? val * 60 : val;
}

// ─────────────────────────────────────────────────
// Public export wrapped with Provider
// ─────────────────────────────────────────────────
interface ContratoSlaTabProps {
  empresaId: string;
  sedes?: Array<{ id: string; nombre: string }>;
  usuariosAdmin?: Array<{ id: string; nombre: string }>;
}

export default function ContratoSlaTab(props: ContratoSlaTabProps) {
  return (
    <ContratoSlaProvider>
      <ContratoSlaTabInner {...props} />
    </ContratoSlaProvider>
  );
}

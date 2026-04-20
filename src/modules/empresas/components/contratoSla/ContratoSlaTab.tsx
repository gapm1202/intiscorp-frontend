import { useState, useEffect, useCallback } from 'react';
import { ContratoSlaProvider, useContratoSla } from './ContratoSlaContext';
import ContratoSlaWizard from './ContratoSlaWizard';
import ContratoSlaView from './ContratoSlaView';
import type { WizardContratoSlaState, ContratoVersion, DocumentoContrato } from './types';
import {
  getContratoActivo,
  createContrato,
  updateContratoServicios,
  updateContratoPreventivo,
  updateContratoEconomicos,
  uploadContratoDocumentos,
  deleteContratoDocumento,
} from '@/modules/empresas/services/contratosService';
import { slaService } from '@/modules/sla/services/slaService';

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

function mapHistorial(rawHistory: any[]) {
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory.map((h: any) => ({
    campo: h.campo || h.fieldChanged || '',
    valorAnterior: h.valorAnterior || h.oldValue || '—',
    valorNuevo: h.valorNuevo || h.newValue || '—',
    motivo: h.motivo || h.reason,
    fecha: new Date(h.fecha || h.timestamp).toLocaleString('es-PE'),
    usuario: h.usuario || h.user || 'Sistema',
    tipoAccion: (h.tipoAccion || h.tipo_accion || '').toUpperCase() || 'EDICION',
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [contratoActivo, setContratoActivo] = useState<ContratoVersion | null>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoContrato[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load contrato on mount
  const loadContrato = useCallback(async () => {
    setMode('loading');
    setSaveError(null);
    try {
      // Fetch contrato + SLA data in parallel
      const [raw, alcanceRaw, tiemposRaw] = await Promise.all([
        getContratoActivo(empresaId),
        slaService.getAlcance(empresaId).catch(() => null),
        slaService.getTiempos(empresaId).catch(() => null),
      ]);

      if (raw) {
        const version = mapApiToContratoVersion(raw);
        if (!version) { setMode('wizard'); reset(); return; }

        // Attach SLA data fetched from separate API
        if (alcanceRaw) {
          version.alcanceSla = {
            slaActivo: true,
            aplicaA: 'incidentes',
            tiposTicket: alcanceRaw.tiposTicket || [],
            serviciosCatalogoSLA: {
              tipo: alcanceRaw.aplica_todos_servicios ? 'todos' : 'seleccionados',
              servicios: alcanceRaw.servicios?.map(String) ?? [],
            },
            activosCubiertos: {
              tipo: alcanceRaw.aplica_todas_categorias ? 'todos' : 'porCategoria',
              categorias: alcanceRaw.categorias?.map(String) ?? [],
            },
            sedesCubiertas: {
              tipo: alcanceRaw.aplica_todas_sedes ? 'todas' : 'seleccionadas',
              sedes: alcanceRaw.sedes?.map(String) ?? [],
            },
            observaciones: alcanceRaw.observaciones || '',
          };
        }

        if (tiemposRaw?.tiempos?.length) {
          version.tiemposSla = {
            tiemposPorPrioridad: tiemposRaw.tiempos.map(t => ({
              prioridad: t.prioridad.toLowerCase() as 'critica' | 'alta' | 'media' | 'baja',
              tiempoRespuesta: minutesToDisplay(t.tiempo_respuesta_minutos),
              tiempoResolucion: minutesToDisplay(t.tiempo_resolucion_minutos),
              escalamiento: t.escalamiento,
              tiempoEscalamiento: t.tiempo_escalamiento_minutos
                ? minutesToDisplay(t.tiempo_escalamiento_minutos)
                : undefined,
            })),
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
  }, [empresaId, reset]);

  useEffect(() => { loadContrato(); }, [loadContrato]);

  // Save wizard
  const handleWizardSave = async (wizardState: WizardContratoSlaState) => {
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
      setIsSaving(false);
    }
  };

  // Renewal
  const handleRenovar = () => {
    if (!contratoActivo) return;
    initRenewal({
      datosContrato: contratoActivo.datosContrato,
      servicios: contratoActivo.servicios,
      mantenimiento: contratoActivo.mantenimiento,
      economicas: contratoActivo.economicas,
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

  // Compute "mostrar renovar" logic
  const mostrarBotonRenovar = (() => {
    if (!contratoActivo) return false;
    const estado = (contratoActivo.estado || '').toLowerCase();
    if (estado === 'suspendido' || estado === 'vencido') return true;
    if (contratoActivo.fechaFin) {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const fin = new Date(contratoActivo.fechaFin); fin.setHours(0, 0, 0, 0);
      const dias = Math.ceil((fin.getTime() - hoy.getTime()) / 86400000);
      return dias <= 30;
    }
    return false;
  })();

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

          <ContratoSlaView
            contratoActivo={contratoActivo}
            historial={historial}
            documentos={documentos}
            mostrarBotonRenovar={mostrarBotonRenovar}
            onRenovar={handleRenovar}
            onUploadDoc={handleUploadDoc}
            onDeleteDoc={handleDeleteDoc}
            onVerDetalles={(id) => {
              // For now just show an alert; could integrate existing modal
              console.log('[ContratoSlaTab] Ver detalles:', id);
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

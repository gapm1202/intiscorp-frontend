import { useState, useEffect, useMemo } from 'react';
import type { Visita, FiltrosVisitas, EstadoVisita, ResumenContractualVisitas } from '../types';
import { 
  getVisitas, 
  getResumenContractualVisitas
} from '../services/visitasService';
import { getEmpresas } from '../services/empresasService';
import { getContratoActivo } from '@/modules/empresas/services/contratosService';
import { getSedesByEmpresa } from '@/modules/empresas/services/sedesService';
import { getAreasByEmpresa } from '@/modules/inventario/services/areasService';
import { getCategorias } from '@/modules/inventario/services/categoriasService';
import { getInventarioBySede } from '@/modules/inventario/services/inventarioService';
import type { Category } from '@/modules/inventario/services/categoriasService';
import Toast from '@/components/ui/Toast';
import NewVisitaModal from "../components/NewVisitaModal";
import VisitasCalendarView from "../components/VisitasCalendarView";
import VisitasTableView from "../components/VisitasTableView";
import FinalizarVisitaModal from "../components/FinalizarVisitaModal";
import RegisterAssetModal from "@/modules/inventario/components/RegisterAssetModal";


interface Toast_Props {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

// ─── Iconos inline ────────────────────────────────────────────────────────────
const IconTable = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
const IconCalendar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const IconPlus = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const IconFilter = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
  </svg>
);
const IconRefresh = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  accent: string;   // tailwind border-color class
  textColor: string;
  bgColor: string;
}
const StatCard = ({ label, value, accent, textColor, bgColor }: StatCardProps) => (
  <div className={`${bgColor} rounded-xl border-l-4 ${accent} p-4 flex flex-col gap-1`}>
    <span className={`text-xs font-semibold uppercase tracking-widest ${textColor} opacity-70`}>{label}</span>
    <span className={`text-3xl font-bold ${textColor} leading-none`}>{value}</span>
  </div>
);

// ─── Select estilizado ────────────────────────────────────────────────────────
const StyledSelect = ({ label, value, onChange, children, required }: any) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
      {label}{required && <span className="text-blue-500 ml-0.5">*</span>}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="w-full appearance-none bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-lg px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all cursor-pointer hover:border-blue-300"
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </div>
);

// ─── Badge de estado ──────────────────────────────────────────────────────────
const estadoBadgeClasses: Record<EstadoVisita, string> = {
  PENDIENTE_PROGRAMACION: 'bg-slate-100 text-slate-700 border-slate-200',
  PROGRAMADA:             'bg-blue-50  text-blue-700  border-blue-200',
  EN_PROCESO:             'bg-amber-50 text-amber-700 border-amber-200',
  FINALIZADA:             'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELADA:              'bg-red-50   text-red-700   border-red-200',
};

export default function VisitasPage() {
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast_Props>({ visible: false, message: '', type: 'info' });

  const getCurrentMonthLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };
  
  // Filtros
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [filtros, setFiltros] = useState<FiltrosVisitas>({});
  const [mesAño, setMesAño] = useState(getCurrentMonthLocal()); // YYYY-MM
  
  // Datos para RegisterAssetModal
  const [sedes, setSedes] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Vistas
  const [vistaActual, setVistaActual] = useState<'calendario' | 'tabla'>('tabla');
  
  // Resumen contractual
  const [resumen, setResumen] = useState<ResumenContractualVisitas | null>(null);
  
  // Modales
  const [showNewVisitaModal, setShowNewVisitaModal] = useState(false);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<Visita | null>(null);
  const [prefilledVisitaData, setPrefilledVisitaData] = useState<any>(null);
  const [editingVisita, setEditingVisita] = useState<Visita | null>(null);
  const [showRegisterAssetModal, setShowRegisterAssetModal] = useState(false);
  const [activoSeleccionadoParaEditar, setActivoSeleccionadoParaEditar] = useState<any>(null);
  
  // Contrato activo de la empresa seleccionada
  const [contratoActivo, setContratoActivo] = useState<any>(null);

  const empresaSeleccionada = useMemo(() => {
    if (!filtros.empresaId) return null;
    const empresa = empresas.find((emp) => String(emp?._id ?? emp?.id ?? '') === String(filtros.empresaId)) || null;
    console.log('📊 Empresa seleccionada:', empresa);
    console.log('📄 Contrato de empresa:', empresa?.contrato);
    console.log('🔢 visitaFrecuencia:', empresa?.contrato?.visitaFrecuencia || empresa?.visitaFrecuencia);
    console.log('🔢 cantidadVisitas:', empresa?.contrato?.cantidadVisitas || empresa?.cantidadVisitas);
    return empresa;
  }, [empresas, filtros.empresaId]);

  const resumenEstados = useMemo(() => {
    const base = {
      PENDIENTE_PROGRAMACION: 0,
      PROGRAMADA: 0,
      EN_PROCESO: 0,
      FINALIZADA: 0,
      CANCELADA: 0,
    } as Record<EstadoVisita, number>;

    visitas.forEach((visita) => {
      if (base[visita.estado] !== undefined) {
        base[visita.estado] += 1;
      }
    });

    return base;
  }, [visitas]);

  // Cargar empresas al iniciar
  useEffect(() => {
    const cargarEmpresas = async () => {
      try {
        const response = await getEmpresas();
        setEmpresas(response.data || response || []);
      } catch (error) {
        console.error('Error loading empresas:', error);
        mostrarToast('Error al cargar empresas', 'error');
      }
    };
    cargarEmpresas();
  }, []);

  // Cargar contrato activo cuando cambia empresa seleccionada
  useEffect(() => {
    if (!filtros.empresaId) {
      setContratoActivo(null);
      return;
    }
    const cargarContrato = async () => {
      try {
        const contrato = await getContratoActivo(filtros.empresaId);
        console.log('📄 Contrato activo cargado:', contrato);
        console.log('🔢 visitaFrecuencia:', contrato?.visitaFrecuencia);
        console.log('🔢 cantidadVisitas:', contrato?.cantidadVisitas);
        setContratoActivo(contrato);
      } catch (error) {
        console.error('Error loading contrato:', error);
        setContratoActivo(null);
      }
    };
    cargarContrato();
  }, [filtros.empresaId]);

  // Cargar resumen cuando cambia el contrato activo
  useEffect(() => {
    if (!contratoActivo?.id) {
      setResumen(null);
      return;
    }
    const cargarResumen = async () => {
      try {
        const resumenData = await getResumenContractualVisitas(String(contratoActivo.id));
        setResumen(resumenData);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error loading resumen:', error);
        if (message.includes('404')) {
          setResumen(null);
          return;
        }
      }
    };
    cargarResumen();
  }, [contratoActivo?.id]);

  // Cargar sedes, áreas y categorías cuando se selecciona una empresa
  useEffect(() => {
    const cargarDatosEmpresas = async () => {
      if (!filtros.empresaId) {
        setSedes([]);
        setAreas([]);
        return;
      }
      try {
        const [sedesData, areasData, categoriasData] = await Promise.all([
          getSedesByEmpresa(String(filtros.empresaId)),
          getAreasByEmpresa(String(filtros.empresaId)),
          getCategorias(),
        ]);
        setSedes(sedesData || []);
        setAreas(areasData || []);
        setCategories(categoriasData || []);
      } catch (error) {
        console.error('Error loading enterprise data:', error);
      }
    };
    cargarDatosEmpresas();
  }, [filtros.empresaId]);

  // Cargar visitas con filtros
  useEffect(() => {
    cargarVisitas();
  }, [filtros, mesAño]);

  const cargarVisitas = async () => {
    setLoading(true);
    try {
      const response = await getVisitas({
        ...filtros,
        mes: mesAño,
        limite: 100,
      });
      const visitasRaw = response.data || response || [];
      const visitasNormalizadas = Array.isArray(visitasRaw)
        ? visitasRaw.map((visita: any) => {
            const tecnicosRaw = visita.tecnicosAsignados || visita.tecnicos_asignados || visita.tecnicos || [];
            const tecnicosAsignados = Array.isArray(tecnicosRaw)
              ? tecnicosRaw.map((t: any) => ({
                  tecnicoId: String(t?.tecnicoId ?? t?.tecnico_id ?? t?.id ?? ''),
                  tecnicoNombre: t?.tecnicoNombre || t?.tecnico_nombre || t?.nombre_completo || t?.nombre || 'Desconocido',
                  esEncargado: Boolean(t?.esEncargado ?? t?.es_encargado ?? t?.encargado ?? t?.responsable),
                }))
              : [];
            return {
              ...visita,
              _id: String(visita?._id ?? visita?.id ?? ''),
              fechaProgramada: visita?.fechaProgramada || visita?.fecha_programada || visita?.fecha || '',
              horaProgramada: visita?.horaProgramada || visita?.hora_programada || undefined,
              tipoVisita: visita?.tipoVisita || visita?.tipo_visita || visita?.tipo || '',
              estado: visita?.estado || visita?.estado_visita || 'PENDIENTE_PROGRAMACION',
              tecnicosAsignadosCount: visita?.tecnicosAsignadosCount ?? visita?.tecnicos_asignados_count ?? tecnicosAsignados.length,
              encargadoNombre: visita?.encargadoNombre || visita?.encargado_nombre || undefined,
              encargadoId: visita?.encargadoId || visita?.encargado_id || undefined,
              tecnicosAsignados,
            } as Visita;
          })
        : [];
      setVisitas(visitasNormalizadas);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error loading visitas:', error);
      if (message.includes('404')) {
        setVisitas([]);
        mostrarToast('El backend no tiene el endpoint /api/visitas', 'warning');
        return;
      }
      mostrarToast('Error al cargar visitas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mostrarToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ ...toast, visible: false }), 4000);
  };

  const handleNuevaVisita = () => {
    if (!filtros.empresaId) {
      mostrarToast('Selecciona una empresa primero', 'warning');
      return;
    }
    if (!contratoActivo?.id) {
      mostrarToast('No hay contrato activo para esta empresa', 'warning');
      return;
    }
    setPrefilledVisitaData(null);
    setEditingVisita(null);
    setShowNewVisitaModal(true);
  };

  const handleEditarVisita = (visita: Visita) => {
    setEditingVisita(visita);
    setPrefilledVisitaData(null);
    setShowNewVisitaModal(true);
  };

  const handleVisitaActualizada = async () => {
    setShowNewVisitaModal(false);
    setEditingVisita(null);
    mostrarToast('Visita actualizada exitosamente', 'success');
    cargarVisitas();
  };

  const handleFinalizarVisita = (visita: Visita) => {
    if (visita.tipoVisita === 'POR_TICKET') {
      const ticketRef = visita.ticketNumero || visita.ticketId;
      mostrarToast(
        ticketRef
          ? `Las visitas POR_TICKET deben finalizarse desde el ticket (${ticketRef}) con el boton \"Culminar ticket\".`
          : 'Las visitas POR_TICKET deben finalizarse desde el ticket con el boton "Culminar ticket".',
        'warning',
      );
      return;
    }

    const visitaId = Number((visita as any)?._id ?? (visita as any)?.id);
    if (!Number.isInteger(visitaId) || visitaId <= 0) {
      mostrarToast('No se encontró el ID de la visita a finalizar', 'error');
      return;
    }
    setVisitaSeleccionada({ ...visita, _id: String(visitaId) });
    setShowFinalizarModal(true);
  };

  const handleAbrirModalEditarActivo = async (activo: any) => {
    try {
      console.log('📝 [ABRIENDO MODAL EDITAR ACTIVO]', activo);
      const empresaId = activo.empresa_id;
      const sedeId = activo.sede_id;
      console.log('🔍 [DATOS OBTENIDOS]', { empresaId, sedeId, activoId: activo.activo_id, activoCodigo: activo.activo_codigo });
      if (!empresaId || !sedeId) {
        console.error('❌ No hay empresa_id o sede_id para obtener el inventario', { empresaId, sedeId });
        mostrarToast('Error: No hay datos de empresa o sede', 'error');
        return;
      }
      const empresa = empresas.find((emp) => String(emp._id || emp.id) === String(empresaId));
      const empresaNombre = empresa?.nombre || '';
      console.log('📡 Cargando sedes para empresa:', empresaId);
      const sedesDeEmpresa = await getSedesByEmpresa(String(empresaId));
      const areasDeEmpresa = await getAreasByEmpresa(String(empresaId));
      const categoriasData = await getCategorias();
      const sedesArray = Array.isArray(sedesDeEmpresa) ? sedesDeEmpresa : (sedesDeEmpresa?.data || []);
      const areasArray = Array.isArray(areasDeEmpresa) ? areasDeEmpresa : (areasDeEmpresa?.data || []);
      const categoriasArray = Array.isArray(categoriasData) ? categoriasData : (categoriasData?.data || []);
      console.log('🔎 Buscando sede con ID:', sedeId);
      console.log('📋 Lista de sedes disponibles:', sedesArray.map((s: any) => ({ id: s._id || s.id, nombre: s.nombre })));
      const sede = sedesArray.find((s: any) => String(s._id || s.id) === String(sedeId));
      const sedeNombre = sede?.nombre || '';
      console.log('🏢 Empresa encontrada:', empresaNombre);
      console.log('🏪 Sede encontrada:', sedeNombre, 'Objeto sede:', sede);
      setSedes(sedesArray);
      setAreas(areasArray);
      setCategories(categoriasArray);
      console.log('📋 Áreas cargadas:', areasArray.length, 'lista:', areasArray);
      console.log('📋 Categorías cargadas:', categoriasArray.length);
      console.log('📡 Obteniendo inventario para empresa:', empresaId, 'sede:', sedeId);
      const inventario = await getInventarioBySede(empresaId, sedeId);
      console.log('📦 Inventario obtenido:', inventario);
      const activosList = Array.isArray(inventario) ? inventario : inventario?.data || [];
      const activoCompleto = activosList.find((item: any) => 
        String(item.id) === String(activo.activo_id) || 
        String(item.codigo) === String(activo.activo_codigo) ||
        String(item.assetId) === String(activo.activo_codigo)
      );
      console.log('🔎 Buscando activo con id:', activo.activo_id, 'o codigo:', activo.activo_codigo);
      console.log('✅ Activo completo encontrado:', activoCompleto);
      console.log('📊 Lista de activos en inventario:', activosList.map((a: any) => ({ id: a.id, codigo: a.codigo, assetId: a.assetId })));
      if (activoCompleto) {
        const activoEnriquecido = {
          ...activoCompleto,
          empresa_nombre: empresaNombre,
          empresaNombre: empresaNombre,
          sede_nombre: sedeNombre,
          sedeNombre: sedeNombre,
          _areasDisponibles: areasArray,
        };
        console.log('🎁 Activo enriquecido final (TODOS LOS CAMPOS):', activoEnriquecido);
        console.log('🔍 Campos críticos:', {
          condicionFisica: activoEnriquecido.condicionFisica || activoEnriquecido.condicion_fisica,
          responsable: activoEnriquecido.responsable,
          campos_personalizados_array: activoEnriquecido.campos_personalizados_array,
          camposPersonalizadosArray: activoEnriquecido.camposPersonalizadosArray,
        });
        await new Promise(resolve => setTimeout(resolve, 10));
        console.log('🚀 [ABRIENDO MODAL] Estados finales:', {
          sedesLength: sedesArray.length,
          areasLength: areasArray.length,
          categoriasLength: categoriasArray.length,
          activoTieneCamposPersonalizados: !!activoEnriquecido.camposPersonalizadosArray,
        });
        setActivoSeleccionadoParaEditar(activoEnriquecido);
      } else {
        console.warn('⚠️ Activo no encontrado en inventario, usando datos del ticket');
        setActivoSeleccionadoParaEditar({
          id: activo.activo_id,
          empresa_nombre: empresaNombre,
          empresaNombre: empresaNombre,
          sede_nombre: sedeNombre,
          sedeNombre: sedeNombre,
          ...activo
        });
      }
      setShowRegisterAssetModal(true);
    } catch (error) {
      console.error('❌ Error al cargar el activo:', error);
      mostrarToast('Error al cargar los detalles del activo', 'error');
    }
  };

  const handleVisitaCreada = async () => {
    setShowNewVisitaModal(false);
    mostrarToast('Visita creada exitosamente', 'success');
    cargarVisitas();
  };

  const handleVisitaFinalizada = async () => {
    setShowFinalizarModal(false);
    setVisitaSeleccionada(null);
    mostrarToast('Visita finalizada exitosamente', 'success');
    cargarVisitas();
  };

  const handleFiltroChange = (key: keyof FiltrosVisitas, value: string) => {
    setFiltros(prev => ({ ...prev, [key]: value || undefined }));
  };

  const handleLimpiarFiltros = () => {
    setFiltros({});
    setMesAño(getCurrentMonthLocal());
  };

  // Se mantiene para compatibilidad con children que lo reciben
  const estadoColor: Record<EstadoVisita, string> = {
    PENDIENTE_PROGRAMACION: 'bg-slate-100 text-slate-800',
    PROGRAMADA:             'bg-blue-100 text-blue-800',
    EN_PROCESO:             'bg-amber-100 text-amber-800',
    FINALIZADA:             'bg-emerald-100 text-emerald-800',
    CANCELADA:              'bg-red-100 text-red-800',
  };

  useEffect(() => {
    if (vistaActual === 'calendario') {
      setMesAño(getCurrentMonthLocal());
    }
  }, [vistaActual]);

  const showResumen = resumen || contratoActivo;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── Franja superior azul oscuro ── */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-1">
              Panel de control
            </p>
            <h1 className="text-3xl font-bold text-white leading-tight tracking-tight">
              Gestión de Visitas
            </h1>
            <p className="text-blue-200 text-sm mt-1">
              Programa, controla y ejecuta las visitas contractuales
            </p>
          </div>

          <button
            onClick={handleNuevaVisita}
            disabled={!filtros.empresaId}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-800 rounded-lg font-semibold text-sm shadow-lg hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <IconPlus />
            Nueva Visita
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">

        {/* ── Panel de Filtros ── */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Cabecera del panel */}
          <div className="flex items-center gap-2 px-6 py-3.5 bg-slate-50 border-b border-slate-100">
            <IconFilter />
            <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              Filtros de búsqueda
            </span>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
              {/* Empresa */}
              <div className="lg:col-span-2">
                <StyledSelect
                  label="Empresa"
                  required
                  value={filtros.empresaId || ''}
                  onChange={(e: any) => handleFiltroChange('empresaId', e.target.value)}
                >
                  <option value="">Seleccionar empresa...</option>
                  {empresas.map((emp, index) => {
                    const empId = String(emp?._id ?? emp?.id ?? '');
                    const empNombre = emp?.nombre ?? emp?.razonSocial ?? 'Empresa';
                    return (
                      <option key={empId || `emp-${index}`} value={empId}>
                        {empNombre}
                      </option>
                    );
                  })}
                </StyledSelect>
              </div>

              {/* Mes */}
              <StyledSelect
                label="Mes"
                value={mesAño.split('-')[1] || ''}
                onChange={(e: any) => {
                  const año = mesAño.split('-')[0] || new Date().getFullYear();
                  setMesAño(`${año}-${e.target.value}`);
                }}
              >
                {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                  <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
                ))}
              </StyledSelect>

              {/* Año */}
              <StyledSelect
                label="Año"
                value={mesAño.split('-')[0] || ''}
                onChange={(e: any) => {
                  const mes = mesAño.split('-')[1] || '01';
                  setMesAño(`${e.target.value}-${mes}`);
                }}
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </StyledSelect>

              {/* Estado */}
              <StyledSelect
                label="Estado"
                value={filtros.estado || ''}
                onChange={(e: any) => handleFiltroChange('estado', e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="PENDIENTE_PROGRAMACION">Pendiente Programación</option>
                <option value="PROGRAMADA">Programada</option>
                <option value="EN_PROCESO">En Proceso</option>
                <option value="FINALIZADA">Finalizada</option>
                <option value="CANCELADA">Cancelada</option>
              </StyledSelect>

              {/* Tipo + Limpiar */}
              <div className="flex flex-col gap-1.5">
                <StyledSelect
                  label="Tipo de Visita"
                  value={filtros.tipoVisita || ''}
                  onChange={(e: any) => handleFiltroChange('tipoVisita', e.target.value)}
                >
                  <option value="">Todos los tipos</option>
                  <option value="PROGRAMADA">Programada</option>
                  <option value="POR_TICKET">Por Ticket</option>
                  <option value="PREVENTIVO">Preventivo</option>
                </StyledSelect>
              </div>
            </div>

            {/* Botón limpiar alineado al final */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleLimpiarFiltros}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                <IconRefresh />
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {/* ── Resumen Contractual ── */}
        {showResumen && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-3.5 bg-blue-900 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-semibold text-white uppercase tracking-wider">
                Resumen Contractual
              </span>
            </div>

            <div className="p-6 space-y-4">
              {/* Fila 1: datos del contrato + estados principales */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  label="Frecuencia"
                  value={resumen?.visitaFrecuencia ?? contratoActivo?.visitaFrecuencia ?? '—'}
                  accent="border-l-blue-600"
                  textColor="text-blue-900"
                  bgColor="bg-blue-50"
                />
                <StatCard
                  label="Visitas incluidas"
                  value={resumen?.cantidadVisitas ?? contratoActivo?.cantidadVisitas ?? '—'}
                  accent="border-l-indigo-500"
                  textColor="text-indigo-900"
                  bgColor="bg-indigo-50"
                />
                <StatCard
                  label="Finalizadas"
                  value={resumenEstados.FINALIZADA}
                  accent="border-l-emerald-500"
                  textColor="text-emerald-900"
                  bgColor="bg-emerald-50"
                />
                <StatCard
                  label="En Proceso"
                  value={resumenEstados.EN_PROCESO}
                  accent="border-l-amber-500"
                  textColor="text-amber-900"
                  bgColor="bg-amber-50"
                />
              </div>

              {/* Divisor */}
              <div className="border-t border-slate-100" />

              {/* Fila 2: otros estados */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard
                  label="Pendiente Programación"
                  value={resumenEstados.PENDIENTE_PROGRAMACION}
                  accent="border-l-slate-400"
                  textColor="text-slate-800"
                  bgColor="bg-slate-50"
                />
                <StatCard
                  label="Programadas"
                  value={resumenEstados.PROGRAMADA}
                  accent="border-l-sky-500"
                  textColor="text-sky-900"
                  bgColor="bg-sky-50"
                />
                <StatCard
                  label="Canceladas"
                  value={resumenEstados.CANCELADA}
                  accent="border-l-red-400"
                  textColor="text-red-900"
                  bgColor="bg-red-50"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Barra de vista + contenido ── */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50">
            {/* Switcher de vista */}
            <div className="flex items-center bg-slate-200 rounded-lg p-1 gap-1">
              <button
                onClick={() => setVistaActual('tabla')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  vistaActual === 'tabla'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <IconTable />
                Tabla
              </button>
              <button
                onClick={() => {
                  setMesAño(getCurrentMonthLocal());
                  setVistaActual('calendario');
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  vistaActual === 'calendario'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <IconCalendar />
                Calendario
              </button>
            </div>

            {/* Contador de visitas */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                {loading ? 'Cargando…' : (
                  <span>
                    <span className="font-semibold text-slate-800">{visitas.length}</span>
                    {' '}visita{visitas.length !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm text-slate-500 font-medium">Cargando visitas…</p>
              </div>
            ) : vistaActual === 'tabla' ? (
              <VisitasTableView
                visitas={visitas}
                onFinalizarVisita={handleFinalizarVisita}
                onEditarVisita={handleEditarVisita}
                estadoColor={estadoColor}
                onRefresh={cargarVisitas}
              />
            ) : (
              <VisitasCalendarView
                visitas={visitas}
                mes={mesAño}
                onFinalizarVisita={handleFinalizarVisita}
                onEditarVisita={handleEditarVisita}
                estadoColor={estadoColor}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Modales ── */}
      {showNewVisitaModal && (
        <NewVisitaModal
          empresaId={editingVisita?.empresaId || filtros.empresaId!}
          contratoId={String(contratoActivo?.id ?? '')}
          onClose={() => {
            setShowNewVisitaModal(false);
            setPrefilledVisitaData(null);
            setEditingVisita(null);
          }}
          onVisitaCreada={handleVisitaCreada}
          onVisitaActualizada={handleVisitaActualizada}
          onError={(error) => mostrarToast(error, 'error')}
          prefilledData={prefilledVisitaData}
          editingVisita={editingVisita ?? undefined}
        />
      )}

      {showFinalizarModal && visitaSeleccionada && (
        <FinalizarVisitaModal
          visita={visitaSeleccionada}
          onClose={() => setShowFinalizarModal(false)}
          onVisitaFinalizada={handleVisitaFinalizada}
          onError={(error) => mostrarToast(error, 'error')}
          onAbrirModalEditarActivo={handleAbrirModalEditarActivo}
        />
      )}

      {showRegisterAssetModal && activoSeleccionadoParaEditar && (
        <RegisterAssetModal
          key={`edit-asset-${activoSeleccionadoParaEditar.id}-${Date.now()}`}
          isOpen={showRegisterAssetModal}
          onClose={() => {
            setShowRegisterAssetModal(false);
            setActivoSeleccionadoParaEditar(null);
          }}
          empresaId={String(activoSeleccionadoParaEditar.empresaId || activoSeleccionadoParaEditar.empresa_id || '')}
          sedeId={String(activoSeleccionadoParaEditar.sedeId || activoSeleccionadoParaEditar.sede_id || '')}
          empresaNombre={activoSeleccionadoParaEditar.empresaNombre || activoSeleccionadoParaEditar.empresa_nombre}
          sedeNombre={activoSeleccionadoParaEditar.sedeNombre || activoSeleccionadoParaEditar.sede_nombre}
          empresa={empresas.find(e => String(e._id || e.id) === String(activoSeleccionadoParaEditar.empresaId || activoSeleccionadoParaEditar.empresa_id))}
          sedes={sedes}
          areas={areas}
          categories={categories}
          editingAsset={activoSeleccionadoParaEditar}
          onSuccess={() => {
            mostrarToast('Activo actualizado exitosamente', 'success');
            setShowRegisterAssetModal(false);
            setActivoSeleccionadoParaEditar(null);
          }}
        />
      )}

      {/* Toast */}
      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, visible: false })}
        />
      )}
    </div>
  );
}
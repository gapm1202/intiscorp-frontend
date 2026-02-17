import { useState, useEffect, useMemo } from 'react';
import type { Visita, FiltrosVisitas, EstadoVisita, TipoVisita, ResumenContractualVisitas } from '../types';
import { 
  getVisitas, 
  getResumenContractualVisitas
} from '../services/visitasService';
import { getEmpresas } from '../services/empresasService';
import { getContratoActivo } from '@/modules/empresas/services/contratosService';
import Toast from '@/components/ui/Toast';
import NewVisitaModal from "../components/NewVisitaModal";
import VisitasCalendarView from "../components/VisitasCalendarView";
import VisitasTableView from "../components/VisitasTableView";
import FinalizarVisitaModal from "../components/FinalizarVisitaModal";


interface Toast_Props {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

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
  
  // Vistas
  const [vistaActual, setVistaActual] = useState<'calendario' | 'tabla'>('tabla');
  
  // Resumen contractual
  const [resumen, setResumen] = useState<ResumenContractualVisitas | null>(null);
  
  // Modales
  const [showNewVisitaModal, setShowNewVisitaModal] = useState(false);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<Visita | null>(null);
  
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
      EN_CURSO: 0,
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
    setShowNewVisitaModal(true);
  };

  const handleFinalizarVisita = (visita: Visita) => {
    setVisitaSeleccionada(visita);
    setShowFinalizarModal(true);
  };

  const handleVisitaCreada = async (nuevaVisita: Visita) => {
    setShowNewVisitaModal(false);
    mostrarToast('Visita creada exitosamente', 'success');
    cargarVisitas();
  };

  const handleVisitaFinalizada = async (visitaFinalizada: Visita) => {
    setShowFinalizarModal(false);
    setVisitaSeleccionada(null);
    mostrarToast('Visita finalizada exitosamente', 'success');
    cargarVisitas();
  };

  const handleFiltroChange = (key: keyof FiltrosVisitas, value: string) => {
    setFiltros(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const handleLimpiarFiltros = () => {
    setFiltros({});
    setMesAño(getCurrentMonthLocal());
  };

  const estadoColor: Record<EstadoVisita, string> = {
    PENDIENTE_PROGRAMACION: 'bg-gray-100 text-gray-800',
    PROGRAMADA: 'bg-blue-100 text-blue-800',
    EN_CURSO: 'bg-yellow-100 text-yellow-800',
    FINALIZADA: 'bg-green-100 text-green-800',
    CANCELADA: 'bg-red-100 text-red-800',
  };

  useEffect(() => {
    if (vistaActual === 'calendario') {
      setMesAño(getCurrentMonthLocal());
    }
  }, [vistaActual]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Gestión de Visitas</h1>
          <p className="text-gray-600 mt-2">Programar, controlar y ejecutar visitas presenciales contractuales</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
            {/* Empresa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Empresa *</label>
              <select
                value={filtros.empresaId || ''}
                onChange={(e) => handleFiltroChange('empresaId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              </select>
            </div>

            {/* Mes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mes</label>
              <select
                value={mesAño.split('-')[1] || ''}
                onChange={(e) => {
                  const año = mesAño.split('-')[0] || new Date().getFullYear();
                  setMesAño(`${año}-${e.target.value}`);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="01">Enero</option>
                <option value="02">Febrero</option>
                <option value="03">Marzo</option>
                <option value="04">Abril</option>
                <option value="05">Mayo</option>
                <option value="06">Junio</option>
                <option value="07">Julio</option>
                <option value="08">Agosto</option>
                <option value="09">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
            </div>

            {/* Año */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Año</label>
              <select
                value={mesAño.split('-')[0] || ''}
                onChange={(e) => {
                  const mes = mesAño.split('-')[1] || '01';
                  setMesAño(`${e.target.value}-${mes}`);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={filtros.estado || ''}
                onChange={(e) => handleFiltroChange('estado', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos los estados</option>
                <option value="PENDIENTE_PROGRAMACION">Pendiente Programación</option>
                <option value="PROGRAMADA">Programada</option>
                <option value="EN_CURSO">En Curso</option>
                <option value="FINALIZADA">Finalizada</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>

            {/* Tipo Visita */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select
                value={filtros.tipoVisita || ''}
                onChange={(e) => handleFiltroChange('tipoVisita', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos los tipos</option>
                <option value="PROGRAMADA">Programada</option>
                <option value="POR_TICKET">Por Ticket</option>
                <option value="PREVENTIVO">Preventivo</option>
              </select>
            </div>

            {/* Botones */}
            <div className="flex items-end gap-2">
              <button
                onClick={handleLimpiarFiltros}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Resumen Contractual */}
          {(resumen || contratoActivo) && (
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium uppercase">Frecuencia</p>
                  <p className="text-2xl font-bold text-blue-900 mt-2">
                    {resumen?.visitaFrecuencia ?? contratoActivo?.visitaFrecuencia ?? '-'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg">
                  <p className="text-xs text-indigo-600 font-medium uppercase">Visitas Incluidas</p>
                  <p className="text-2xl font-bold text-indigo-900 mt-2">
                    {resumen?.cantidadVisitas ?? contratoActivo?.cantidadVisitas ?? '-'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                  <p className="text-xs text-green-600 font-medium uppercase">Finalizadas</p>
                  <p className="text-2xl font-bold text-green-900 mt-2">{resumenEstados.FINALIZADA}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg">
                  <p className="text-xs text-amber-600 font-medium uppercase">En Curso</p>
                  <p className="text-2xl font-bold text-amber-900 mt-2">{resumenEstados.EN_CURSO}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 font-medium uppercase">Pendiente Programacion</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{resumenEstados.PENDIENTE_PROGRAMACION}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium uppercase">Programadas</p>
                  <p className="text-2xl font-bold text-blue-900 mt-2">{resumenEstados.PROGRAMADA}</p>
                </div>
                <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-4 rounded-lg">
                  <p className="text-xs text-rose-600 font-medium uppercase">Canceladas</p>
                  <p className="text-2xl font-bold text-rose-900 mt-2">{resumenEstados.CANCELADA}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controles de Vista y Botón Nueva Visita */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setVistaActual('tabla')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                vistaActual === 'tabla'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              Tabla
            </button>
            <button
              onClick={() => {
                setMesAño(getCurrentMonthLocal());
                setVistaActual('calendario');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                vistaActual === 'calendario'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Calendario
            </button>
          </div>

          <button
            onClick={handleNuevaVisita}
            disabled={!filtros.empresaId}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nueva Visita
          </button>
        </div>

        {/* Contenido de Vistas */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : vistaActual === 'tabla' ? (
          <VisitasTableView
            visitas={visitas}
            onFinalizarVisita={handleFinalizarVisita}
            estadoColor={estadoColor}
            onRefresh={cargarVisitas}
          />
        ) : (
          <VisitasCalendarView
            visitas={visitas}
            mes={mesAño}
            onFinalizarVisita={handleFinalizarVisita}
            estadoColor={estadoColor}
          />
        )}
      </div>

      {/* Modales */}
      {showNewVisitaModal && (
        <NewVisitaModal
          empresaId={filtros.empresaId!}
          contratoId={String(contratoActivo?.id ?? '')}
          onClose={() => setShowNewVisitaModal(false)}
          onVisitaCreada={handleVisitaCreada}
          onError={(error) => mostrarToast(error, 'error')}
        />
      )}

      {showFinalizarModal && visitaSeleccionada && (
        <FinalizarVisitaModal
          visita={visitaSeleccionada}
          onClose={() => setShowFinalizarModal(false)}
          onVisitaFinalizada={handleVisitaFinalizada}
          onError={(error) => mostrarToast(error, 'error')}
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

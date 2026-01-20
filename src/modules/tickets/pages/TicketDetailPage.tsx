import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTicketById, cogerTicket, cambiarEstado, asignarTecnico, pausarSLA, reanudarSLA, editarTicket } from '../services/ticketsService';
import type { Ticket } from '../types';
import { useAuth } from '@/hooks/useAuth';
import AsignarTecnicoModal from '../components/AsignarTecnicoModal';
import PausarSLAModal from '../components/PausarSLAModal';
import HistorialModal from '../components/HistorialModal';
import EditarTicketModal from '../components/EditarTicketModal';
import CancelarTicketModal from '../components/CancelarTicketModal';
import CreateTicketModal from '../components/CreateTicketModal';
import SLATimer from '../components/SLATimer';
import Toast from '@/components/ui/Toast';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Estados para toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  
  // Estados para los modales
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [showPausarSLAModal, setShowPausarSLAModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [showConfigurarModal, setShowConfigurarModal] = useState(false);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);

  

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setToastType('success');
    setShowToast(true);
  };

  const showErrorToast = (message: string) => {
    setToastMessage(message);
    setToastType('error');
    setShowToast(true);
  };

  const loadTicketDetail = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await getTicketById(Number(id));
      console.log('📋 Detalle del ticket:', data);
      setTicket(data);
    } catch (err: any) {
      console.error('Error cargando detalle del ticket:', err);
      setError(err.response?.data?.message || 'Error al cargar el ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTicketDetail();
  }, [loadTicketDetail]);
  const getEstadoColor = (estado: string) => {
    const colors: Record<string, string> = {
      'ABIERTO': 'bg-sky-50 text-sky-700 border-sky-300',
      'EN_PROCESO': 'bg-amber-50 text-amber-700 border-amber-300',
      'PENDIENTE_CLIENTE': 'bg-orange-50 text-orange-700 border-orange-300',
      'RESUELTO': 'bg-emerald-50 text-emerald-700 border-emerald-300',
      'CERRADO': 'bg-slate-50 text-slate-700 border-slate-300'
    };
    return colors[estado] || 'bg-slate-50 text-slate-700 border-slate-300';
  };

  const getPrioridadColor = (prioridad: string) => {
    const colors: Record<string, string> = {
      'CRITICA': 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-red-700 shadow-lg shadow-red-200',
      'ALTA': 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-600 shadow-lg shadow-orange-200',
      'MEDIA': 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-600 shadow-lg shadow-blue-200',
      'BAJA': 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-600 shadow-lg shadow-emerald-200',
      'urgente': 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-red-700 shadow-lg shadow-red-200',
      'alta': 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-600 shadow-lg shadow-orange-200',
      'media': 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-600 shadow-lg shadow-blue-200',
      'baja': 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-600 shadow-lg shadow-emerald-200'
    };
    return colors[prioridad] || 'bg-gradient-to-r from-slate-500 to-gray-500 text-white border-slate-600';
  };

  const getEstadoSLAInfo = (estadoSLA: string) => {
    const info: Record<string, { color: string; bg: string; label: string; icon: string }> = {
      'en_tiempo': { 
        color: 'text-emerald-800', 
        bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300', 
        label: '✓ En Tiempo',
        icon: '✓'
      },
      'EN_TIEMPO': { 
        color: 'text-emerald-800', 
        bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300', 
        label: '✓ En Tiempo',
        icon: '✓'
      },
      'por_vencer': { 
        color: 'text-amber-800', 
        bg: 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300', 
        label: '⚠ Por Vencer',
        icon: '⚠'
      },
      'vencido': { 
        color: 'text-rose-800', 
        bg: 'bg-gradient-to-br from-rose-50 to-red-50 border-rose-300', 
        label: '✕ Vencido',
        icon: '✕'
      },
      'pausado': { 
        color: 'text-slate-800', 
        bg: 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-300', 
        label: '⏸ Pausado',
        icon: '⏸'
      }
    };
    return info[estadoSLA] || info['en_tiempo'];
  };

  const formatMinutes = (minutes: number | null | undefined) => {
    if (minutes === null || minutes === undefined) return 'N/A';
    
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    }
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const calculateSLAProgress = () => {
    if (!ticket?.tiempo_transcurrido_minutos || !ticket?.tiempo_total_sla_minutos) {
      const total = (ticket?.tiempo_transcurrido_minutos || 0) + (ticket?.tiempo_restante_minutos || 0);
      if (total === 0) return 0;
      return Math.min(100, ((ticket?.tiempo_transcurrido_minutos || 0) / total) * 100);
    }
    return Math.min(100, (ticket.tiempo_transcurrido_minutos / ticket.tiempo_total_sla_minutos) * 100);
  };

  const getSLAProgressColor = () => {
    const progress = calculateSLAProgress();
    if (progress >= 90) return 'bg-gradient-to-r from-rose-500 to-red-500';
    if (progress >= 70) return 'bg-gradient-to-r from-amber-500 to-orange-500';
    return 'bg-gradient-to-r from-emerald-500 to-teal-500';
  };

  // Verificar si estamos en horario laboral
  const isEnHorarioLaboral = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
    const hour = now.getHours();
    
    // TODO: Obtener estos valores desde la configuración de la empresa
    // Por ahora, hardcodeamos: Lunes a Viernes, 8:00 - 18:00
    const diaLaboral = dayOfWeek >= 1 && dayOfWeek <= 5; // Lunes a viernes
    const horarioLaboral = hour >= 8 && hour < 18; // 8am a 6pm
    
    return diaLaboral && horarioLaboral;
  };

  // Handlers para los modales
  const handleAsignarTecnico = async (tecnicoId: number) => {
    try {
      await asignarTecnico(ticket!.id, tecnicoId);
      await loadTicketDetail();
      setShowAsignarModal(false);
      showSuccessToast('Técnico asignado correctamente');
    } catch (error: any) {
      console.error('Error al asignar técnico:', error);
      showErrorToast(error.response?.data?.message || 'Error al asignar técnico');
    }
  };

  const handlePausarSLA = async (motivo: string) => {
    try {
      if (motivo) {
        await pausarSLA(ticket!.id, motivo);
        showSuccessToast('SLA pausado correctamente');
      } else {
        await reanudarSLA(ticket!.id);
        showSuccessToast('SLA reanudado correctamente');
      }
      await loadTicketDetail();
      setShowPausarSLAModal(false);
    } catch (error: any) {
      console.error('Error al pausar/reanudar SLA:', error);
      showErrorToast(error.response?.data?.message || 'Error al pausar/reanudar SLA');
    }
  };

  const handleEditarTicket = () => {
    // Abrir modal de edición
    setShowEditarModal(true);
  };

  const handleSubmitEditar = async (payload: any, motivo: string) => {
    if (!ticket) return;

    try {
      setActionLoading(true);
      await editarTicket(ticket.id, payload, motivo);
      await loadTicketDetail();
      setShowEditarModal(false);
      showSuccessToast('Ticket actualizado correctamente');
    } catch (error: any) {
      console.error('Error editando ticket:', error);
      showErrorToast(error.response?.data?.message || 'Error al editar ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelarTicket = async (motivo: string) => {
    if (!ticket) return;

    try {
      setActionLoading(true);
      await cambiarEstado(ticket.id, 'CANCELADO', motivo);
      await loadTicketDetail();
      setShowCancelarModal(false);
      showSuccessToast('Ticket cancelado correctamente');
    } catch (error: any) {
      console.error('Error al cancelar ticket:', error);
      showErrorToast(error.response?.data?.message || 'Error al cancelar ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCogerTicket = async () => {
    if (!ticket || actionLoading) return;
    
    if (!confirm('¿Estás seguro que deseas tomar este ticket? Cambiará a estado EN PROCESO y comenzará el conteo de tiempo de atención.')) {
      return;
    }

    try {
      setActionLoading(true);
      await cogerTicket(ticket.id);
      await loadTicketDetail();
      showSuccessToast('Ticket tomado correctamente. Ahora está EN PROCESO.');
    } catch (error: any) {
      console.error('Error al coger ticket:', error);
      showErrorToast(error.response?.data?.message || 'Error al coger ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarcarResuelto = async () => {
    if (!ticket || actionLoading) return;
    
    const resumen = prompt('Ingresa un breve resumen de la solución aplicada:');
    if (!resumen || !resumen.trim()) {
      showErrorToast('Debe ingresar un resumen de la solución');
      return;
    }

    try {
      setActionLoading(true);
      await cambiarEstado(ticket.id, 'RESUELTO', resumen.trim());
      await loadTicketDetail();
      showSuccessToast('Ticket marcado como RESUELTO correctamente');
    } catch (error: any) {
      console.error('Error al marcar como resuelto:', error);
      showErrorToast(error.response?.data?.message || 'Error al marcar como resuelto');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Cargando detalle del ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-red-800 font-semibold text-lg">Error al cargar el ticket</h3>
          </div>
          <p className="text-red-600 mb-4">{error || 'Ticket no encontrado'}</p>
          <button
            onClick={() => navigate('/admin/tickets')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a la lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header con botones de acción */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/tickets')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Volver a tickets</span>
          </button>
          
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {ticket.codigo_ticket || `Ticket #${ticket.id}`}
                </h1>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Creado el {new Date(ticket.fecha_creacion).toLocaleString('es-PE', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                <div className="flex gap-2 mt-3">
                  <span className={`px-3 py-1 rounded text-sm font-medium ${getEstadoColor(ticket.estado)}`}>
                    {ticket.estado.replace('_', ' ')}
                  </span>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${getPrioridadColor(ticket.prioridad)}`}>
                    {ticket.prioridad}
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2 ml-6 flex-wrap">
                {/* Botón "Asignar Técnico" - Solo para admins cuando NO hay técnico asignado */}
                {!ticket.tecnico_asignado && user && user.rol && user.rol.toLowerCase().includes('admin') && (
                  <button 
                    onClick={() => setShowAsignarModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Asignar Técnico
                  </button>
                )}

                {/* Botón "Coger ticket / Pasar a proceso" - Solo si tiene técnico asignado y está ABIERTO */}
                {ticket.estado === 'ABIERTO' && ticket.tecnico_asignado && user && ticket.tecnico_asignado.id === user.id && (
                  <button 
                    onClick={handleCogerTicket}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {actionLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    Coger ticket / Pasar a proceso
                  </button>
                )}

                {/* Botón "Culminar ticket" - Solo si está EN_PROCESO y es el técnico asignado */}
                {ticket.estado === 'EN_PROCESO' && 
                 ticket.tecnico_asignado && 
                 user && 
                 ticket.tecnico_asignado.id === user.id && (
                  <button 
                    onClick={handleMarcarResuelto}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {actionLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    Culminar ticket
                  </button>
                )}

                {/* Botón Reasignar - Solo para admins cuando YA hay técnico asignado */}
                {ticket.tecnico_asignado && user && user.rol && user.rol.toLowerCase().includes('admin') && (
                  <button 
                    onClick={() => setShowAsignarModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Reasignar Técnico
                  </button>
                )}

                {/* Botón Editar - Para admins y técnico asignado */}
                {user && (
                  (user.rol && user.rol.toLowerCase().includes('admin')) ||
                  (ticket.tecnico_asignado && ticket.tecnico_asignado.id === user.id)
                ) && (
                  <button 
                    onClick={handleEditarTicket}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Editar
                  </button>
                )}

                {/* Botón Pausar/Reanudar SLA */}
                {ticket.estado_sla && ticket.estado_sla !== 'NO_APLICA' && user && (
                  (user.rol && user.rol.toLowerCase().includes('admin')) ||
                  (ticket.tecnico_asignado && ticket.tecnico_asignado.id === user.id)
                ) && (
                  <button 
                    onClick={() => setShowPausarSLAModal(true)}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    {ticket.estado_sla === 'pausado' ? 'Reanudar SLA' : 'Pausar SLA'}
                  </button>
                )}

                {/* Botón Historial - Todos pueden ver */}
                <button 
                  onClick={() => setShowHistorialModal(true)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Historial
                </button>
                {/* Botón Configurar - solo si vino del portal */}
                {ticket.origen === 'PORTAL_PUBLICO' && (
                  <button
                    onClick={() => setShowConfigurarModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    Configurar
                  </button>
                )}

                {/* Botón Cancelar Ticket - Solo si NO está cerrado o cancelado */}
                {ticket.estado !== 'CERRADO' && ticket.estado !== 'CANCELADO' && user && (
                  (user.rol && user.rol.toLowerCase().includes('admin')) ||
                  (ticket.tecnico_asignado && ticket.tecnico_asignado.id === user.id)
                ) && (
                  <button 
                    onClick={() => setShowCancelarModal(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Cancelar Ticket
                  </button>
                )}
              </div>
            </div>

            {/* SLA Timer */}
            {ticket.estado_sla && ticket.estado_sla !== 'NO_APLICA' && (
              <div className="mt-6">
                <SLATimer
                  estadoSLA={ticket.estado_sla}
                  tiempoTotalMinutos={(ticket.tiempo_transcurrido_minutos || 0) + (ticket.tiempo_restante_minutos || 0)}
                  tiempoTranscurridoMinutos={ticket.tiempo_transcurrido_minutos || 0}
                  tiempoRestanteMinutos={ticket.tiempo_restante_minutos || 0}
                  fechaCreacion={ticket.fecha_creacion}
                  enHorarioLaboral={isEnHorarioLaboral()}
                  motivoPausa={undefined} // TODO: Obtener del backend si está pausado
                />
              </div>
            )}
          </div>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Información General */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-base font-semibold text-gray-900">Información General</h2>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Empresa</label>
                  <p className="text-sm text-gray-900 mt-1">{ticket.empresa_nombre || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Sede</label>
                  <p className="text-sm text-gray-900 mt-1">{ticket.sede_nombre || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Título</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">{ticket.titulo || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Descripción</label>
                  <p className="text-sm text-gray-700 mt-1 bg-gray-50 rounded p-3 border border-gray-200">
                    {ticket.descripcion || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Clasificación */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-base font-semibold text-gray-900">Clasificación</h2>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Tipo de Soporte</label>
                  <p className="text-sm text-gray-900 mt-1 capitalize">
                    {ticket.tipo_soporte === 'gestion-ti' ? 'Gestión TI' : ticket.tipo_soporte || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tipo de Servicio</label>
                  <p className="text-sm text-gray-900 mt-1 capitalize">{ticket.tipo_servicio || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Categoría</label>
                  <p className="text-sm text-gray-900 mt-1">{ticket.categoria_nombre || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Subcategoría</label>
                  <p className="text-sm text-gray-900 mt-1">{ticket.subcategoria_nombre || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Servicio</label>
                  <p className="text-sm text-gray-900 mt-1">{ticket.servicio_nombre || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Priorización */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-base font-semibold text-gray-900">Priorización ITIL</h2>
              </div>
              <div className="p-6 grid grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Impacto</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">{ticket.impacto || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Urgencia</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">{ticket.urgencia || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Prioridad</label>
                  <span className={`inline-block px-3 py-1 rounded text-sm font-medium mt-1 ${getPrioridadColor(ticket.prioridad)}`}>
                    {ticket.prioridad}
                  </span>
                </div>
              </div>
            </div>

            {/* Activos */}
            {ticket.activos && ticket.activos.length > 0 && (
              <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-base font-semibold text-gray-900">Activos Asociados ({ticket.activos.length})</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {ticket.activos.map((activo: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activo.activo_nombre || activo.nombre || 'Activo'}</p>
                          <p className="text-xs text-gray-500 font-mono">{activo.activo_codigo || activo.codigo}</p>
                        </div>
                        {activo.activo_tipo && (
                          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                            {activo.activo_tipo}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Usuarios Reportan */}
            {ticket.usuarios_reporta && ticket.usuarios_reporta.length > 0 && (
              <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-base font-semibold text-gray-900">Usuarios Afectados ({ticket.usuarios_reporta.length})</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {ticket.usuarios_reporta.map((usuario: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-semibold text-sm">
                            {(usuario.usuario_nombre || usuario.nombre)?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{usuario.usuario_nombre || usuario.nombre}</p>
                          {(usuario.usuario_correo || usuario.email) && (
                            <p className="text-xs text-gray-500">{usuario.usuario_correo || usuario.email}</p>
                          )}
                          {usuario.usuario_dni && (
                            <p className="text-xs text-gray-500">DNI: {usuario.usuario_dni}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Adjuntos */}
            {ticket.adjuntos && ticket.adjuntos.length > 0 && (
              <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-base font-semibold text-gray-900">Adjuntos ({ticket.adjuntos.length})</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ticket.adjuntos.map((adjunto: any, index: number) => {
                    let fileName = `Adjunto ${index + 1}`;
                    let extension = '';
                    let isImage = false;
                    let href = '#';
                    let src = undefined;

                    const isObj = typeof adjunto === 'object' && adjunto !== null;
                    if (isObj) {
                      fileName = adjunto.nombre || adjunto.name || fileName;
                      extension = (fileName.split('.').pop() || '').toLowerCase();
                      isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension);
                      href = adjunto.id ? `/api/tickets/${ticket.id}/adjuntos/${adjunto.id}/download` : (adjunto.url || '#');
                      src = adjunto.url || adjunto.path || href;
                    } else if (typeof adjunto === 'string') {
                      fileName = adjunto.split('/').pop() || fileName;
                      extension = fileName.split('.').pop()?.toLowerCase() || '';
                      isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension);
                      href = adjunto;
                      src = adjunto;
                    }

                    return (
                      <div
                        key={index}
                        className="group relative bg-gray-50 rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all"
                      >
                        {isImage ? (
                          <>
                            {/* Preview de imagen */}
                            <div 
                              className="aspect-video bg-gray-100 cursor-pointer relative overflow-hidden"
                              onClick={() => setImagenPreview(src)}
                            >
                              <img 
                                src={src} 
                                alt={fileName} 
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em"%3EImagen%3C/text%3E%3C/svg%3E';
                                }}
                              />
                              {/* Overlay con icono de zoom */}
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                                <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                              </div>
                            </div>
                            {/* Info y botones */}
                            <div className="p-3">
                              <p className="text-sm font-medium text-gray-900 truncate mb-2">{fileName}</p>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setImagenPreview(src)}
                                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Ver
                                </button>
                                <a
                                  href={href}
                                  download={fileName}
                                  className="flex-1 px-3 py-1.5 bg-gray-600 text-white text-xs font-semibold rounded hover:bg-gray-700 transition-colors flex items-center justify-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Descargar
                                </a>
                              </div>
                            </div>
                          </>
                        ) : (
                          /* Archivos no-imagen */
                          <div className="p-4 flex items-center gap-3">
                            <div className="w-12 h-12 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                              <p className="text-xs text-gray-500 uppercase">{extension || 'archivo'}</p>
                            </div>
                            <a
                                href={href}
                                download={fileName}
                                className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                              >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Descargar
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha */}
          <div className="space-y-6">
            
            {/* Asignación */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-base font-semibold text-gray-900">Asignación y Seguimiento</h3>
              </div>
              <div className="p-6 space-y-4">
                {ticket.modalidad_servicio && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Modalidad de Servicio</label>
                    <p className="text-sm text-gray-900 mt-1">{ticket.modalidad_servicio}</p>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4">
                  <label className="text-sm font-medium text-gray-500 mb-3 block">Técnico Asignado</label>
                  {ticket.tecnico_asignado ? (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded border border-blue-200">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                          {ticket.tecnico_asignado.nombre?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{ticket.tecnico_asignado.nombre}</p>
                        {ticket.tecnico_asignado.email && (
                          <p className="text-xs text-gray-600 truncate">{ticket.tecnico_asignado.email}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded border border-dashed border-gray-300 text-center">
                      <p className="text-sm text-gray-400">Sin asignar</p>
                    </div>
                  )}
                </div>

                {ticket.creado_por && (
                  <div className="border-t border-gray-200 pt-4">
                    <label className="text-sm font-medium text-gray-500 mb-3 block">Creado Por</label>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-700 font-semibold text-xs">
                          {ticket.creado_por.nombre?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 font-medium truncate">{ticket.creado_por.nombre}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      <AsignarTecnicoModal
        isOpen={showAsignarModal}
        onClose={() => setShowAsignarModal(false)}
        onConfirm={handleAsignarTecnico}
        ticketId={ticket.id}
        tecnicoActual={ticket.tecnico_asignado || null}
      />

      <PausarSLAModal
        isOpen={showPausarSLAModal}
        onClose={() => setShowPausarSLAModal(false)}
        onConfirm={handlePausarSLA}
        ticketCodigo={ticket.codigo_ticket}
        slaPausado={ticket.estado_sla === 'pausado'}
      />

      <HistorialModal
        isOpen={showHistorialModal}
        onClose={() => setShowHistorialModal(false)}
        ticketId={ticket.id}
        ticketCodigo={ticket.codigo_ticket}
      />

      <EditarTicketModal
        isOpen={showEditarModal}
        onClose={() => setShowEditarModal(false)}
        ticket={ticket}
        onSubmit={handleSubmitEditar}
      />

      <CreateTicketModal
        isOpen={showConfigurarModal}
        onClose={() => setShowConfigurarModal(false)}
        isConfigurar
        initialData={ticket}
        initialAdjuntos={ticket.adjuntos}
        onUpdated={async () => { await loadTicketDetail(); setShowConfigurarModal(false); showSuccessToast('Ticket configurado correctamente'); }}
        onSubmit={async () => { /* no-op: en modo configurar usamos editarTicket internamente */ }}
      />

      <CancelarTicketModal
        isOpen={showCancelarModal}
        onClose={() => setShowCancelarModal(false)}
        onConfirm={handleCancelarTicket}
        ticketCodigo={ticket.codigo_ticket}
      />

      {/* Modal de Preview de Imagen */}
      {imagenPreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setImagenPreview(null)}
        >
          <button
            onClick={() => setImagenPreview(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="max-w-7xl max-h-full flex flex-col items-center gap-4">
            <img 
              src={imagenPreview} 
              alt="Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <a
              href={imagenPreview}
              download
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar Imagen
            </a>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}

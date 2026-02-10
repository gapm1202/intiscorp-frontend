import { useEffect, useState, useCallback, useRef } from 'react';
// removed API_BASE import; asset detail is shown inline now
import { useParams, useNavigate } from 'react-router-dom';
import { getTicketById, cogerTicket, cambiarEstado, pausarSLA, reanudarSLA, editarTicket, getMensajes, postMensaje, asignarTecnico } from '../services/ticketsService';
import { getInventarioBySede } from '@/modules/inventario/services/inventarioService';
import type { Ticket } from '../types';
import { useAuth } from '@/hooks/useAuth';
import PausarSLAModal from '../components/PausarSLAModal';
import HistorialModal from '../components/HistorialModal';
import EditarTicketModal from '../components/EditarTicketModal';
import CancelarTicketModal from '../components/CancelarTicketModal';
import CreateTicketModal from '../components/CreateTicketModal';
import AsignarTecnicoModal from '../components/AsignarTecnicoModal';
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
  const [showPausarSLAModal, setShowPausarSLAModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [showConfigurarModal, setShowConfigurarModal] = useState(false);
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [asignando, setAsignando] = useState(false);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  // Mapa temporal de detalles del inventario por activo_id
  const [assetMap, setAssetMap] = useState<Record<string, any>>({});
  const [chatDisabled, setChatDisabled] = useState(false);
  const [chatDisabledMessage, setChatDisabledMessage] = useState<string | null>(null);
  // Chat interno (proviene del backend): { emisor_tipo, emisor_nombre, mensaje, created_at }
  const [chatMessages, setChatMessages] = useState<Array<{ emisor_tipo: string; emisor_nombre?: string; mensaje: string; created_at: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  

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
      console.log('🎯 Campos SLA recibidos:', {
        fase_sla_actual: data.fase_sla_actual,
        porcentaje_tiempo_respuesta: data.porcentaje_tiempo_respuesta,
        porcentaje_tiempo_resolucion: data.porcentaje_tiempo_resolucion,
        tiempo_respuesta_transcurrido_minutos: data.tiempo_respuesta_transcurrido_minutos,
        tiempo_resolucion_transcurrido_minutos: data.tiempo_resolucion_transcurrido_minutos,
        tiempo_respuesta_minutos: data.tiempo_respuesta_minutos,
        tiempo_resolucion_minutos: data.tiempo_resolucion_minutos,
        fecha_limite_respuesta: data.fecha_limite_respuesta,
        fecha_limite_resolucion: data.fecha_limite_resolucion
      });
      setTicket(data);
      // Reset any chat-disabled flags when reloading ticket details
      setChatDisabled(false);
      setChatDisabledMessage(null);
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

  // Polling para refrescar detalle del ticket (SLA, porcentajes) cada 30s
  useEffect(() => {
    const idNum = id ? Number(id) : null;
    if (!idNum) return;
    const interval = setInterval(() => {
      loadTicketDetail();
    }, 30000);
    return () => clearInterval(interval);
  }, [id, loadTicketDetail]);

  // Normalize estado helper (local)
  const normalizeEstadoLocal = (raw?: string | null) => {
    if (!raw) return '';
    return String(raw).toUpperCase().replace(/[_\s]+/g, ' ').trim();
  };

  // Inicializar chat interno: obtener mensajes desde backend y habilitar polling
  useEffect(() => {
    if (!ticket) return;
    let cancelled = false;
    const fetchMsgs = async () => {
      try {
        const msgs = await getMensajes(ticket.id);
        if (cancelled) return;
        setChatMessages(Array.isArray(msgs) ? msgs : []);
      } catch (err) {
        console.error('Error cargando mensajes del ticket:', err);
        if (!cancelled) setChatMessages([]);
      }
    };

    // primera carga inmediata
    fetchMsgs();
    // polling cada 3 segundos
    const intervalId = setInterval(fetchMsgs, 3000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [ticket]);

  // Cargar detalles del inventario (solo para los activos asociados al ticket)
  useEffect(() => {
    if (!ticket || !ticket.activos || ticket.activos.length === 0) return;
    const empresaId = ticket.empresa_id;
    const sedeId = ticket.sede_id;
    let cancelled = false;

    (async () => {
      try {
        const inv = await getInventarioBySede(empresaId, sedeId, true);
        const map: Record<string, any> = {};

        const items = Array.isArray(inv) ? inv : (inv && (inv as any).data && Array.isArray((inv as any).data) ? (inv as any).data : []);
        for (const a of items) {
          if (!a) continue;
          const key = String(a.id ?? a.activo_id ?? a.activoId ?? a.activoId);
          if (key) map[key] = a;
        }
        if (!cancelled) setAssetMap(map);
      } catch (e) {
        console.error('Error cargando inventario para activos:', e);
        // no interrumpir la vista; mostrar toast opcional
        try { showErrorToast('No se pudo cargar detalles de inventario'); } catch(e){}
      }
    })();

    return () => { cancelled = true; };
  }, [ticket]);

  // scroll to bottom when new messages arrive
  useEffect(() => {
    if (!chatContainerRef.current) return;
    // small timeout to let DOM update
    const t = setTimeout(() => {
      try {
        chatContainerRef.current!.scrollTop = chatContainerRef.current!.scrollHeight;
      } catch (e) {
        /* ignore */
      }
    }, 50);
    return () => clearTimeout(t);
  }, [chatMessages]);

  // Send chat message (used by button and Enter key)
  const handleSendChat = async () => {
    if (!ticket) return;
    if (!chatInput.trim()) return;
    const estadoEnProceso = normalizeEstadoLocal(ticket.estado as any) === 'EN PROCESO';
    const isCreator = !!(user && ticket.creado_por && user.id === ticket.creado_por.id);
    const isAssignedTech = !!(user && ticket.tecnico_asignado_id != null && user.id === ticket.tecnico_asignado_id);
    const canSend = estadoEnProceso && (isAssignedTech || isCreator) && !chatDisabled && normalizeEstadoLocal(ticket.estado as any) !== 'RESUELTO';
    if (!canSend) return;

    try {
      await postMensaje(ticket.id, { mensaje: chatInput.trim() });
      const msgs = await getMensajes(ticket.id);
      setChatMessages(Array.isArray(msgs) ? msgs : []);
      setChatInput('');
    } catch (err: any) {
      console.error('Error enviando mensaje:', err);
      const status = err?.response?.status;
      if (status === 403) {
        setChatDisabled(true);
        setChatDisabledMessage('Este ticket fue reasignado a otro técnico y ya no puedes enviar mensajes.');
        showErrorToast('No autorizado: ya no puedes enviar mensajes en este ticket');
      } else {
        showErrorToast(err?.response?.data?.message || 'Error al enviar mensaje');
      }
    }
  };
  const getEstadoColor = (estado: string) => {
    const colors: Record<string, string> = {
      'ESPERA': 'bg-purple-50 text-purple-700 border-purple-300',
      'ABIERTO': 'bg-sky-50 text-sky-700 border-sky-300',
      'EN_PROCESO': 'bg-amber-50 text-amber-700 border-amber-300',
      'PENDIENTE_CLIENTE': 'bg-orange-50 text-orange-700 border-orange-300',
      'RESUELTO': 'bg-emerald-50 text-emerald-700 border-emerald-300',
      'CERRADO': 'bg-slate-50 text-slate-700 border-slate-300'
    };
    return colors[estado] || 'bg-slate-50 text-slate-700 border-slate-300';
  };

  const getSLAColorClass = (pct?: number, paused?: boolean) => {
    if (paused) return 'bg-gray-400';
    const raw = typeof pct === 'number' ? pct : 0;
    if (raw < 70) return 'bg-emerald-500';
    if (raw >= 70 && raw < 90) return 'bg-amber-500';
    if (raw >= 90 && raw < 100) return 'bg-orange-500';
    return 'bg-rose-600';
  };

  const getPrioridadColor = (prioridad: string) => {
    const colors: Record<string, string> = {
      'CRITICA': 'bg-linear-to-r from-rose-600 to-red-600 text-white border-red-700 shadow-lg shadow-red-200',
      'ALTA': 'bg-linear-to-r from-orange-500 to-amber-500 text-white border-orange-600 shadow-lg shadow-orange-200',
      'MEDIA': 'bg-linear-to-r from-blue-500 to-cyan-500 text-white border-blue-600 shadow-lg shadow-blue-200',
      'BAJA': 'bg-linear-to-r from-emerald-500 to-teal-500 text-white border-emerald-600 shadow-lg shadow-emerald-200',
      'urgente': 'bg-linear-to-r from-rose-600 to-red-600 text-white border-red-700 shadow-lg shadow-red-200',
      'alta': 'bg-linear-to-r from-orange-500 to-amber-500 text-white border-orange-600 shadow-lg shadow-orange-200',
      'media': 'bg-linear-to-r from-blue-500 to-cyan-500 text-white border-blue-600 shadow-lg shadow-blue-200',
      'baja': 'bg-linear-to-r from-emerald-500 to-teal-500 text-white border-emerald-600 shadow-lg shadow-emerald-200'
    };
    return colors[prioridad] || 'bg-linear-to-r from-slate-500 to-gray-500 text-white border-slate-600';
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
    if (progress >= 90) return 'bg-linear-to-r from-rose-500 to-red-500';
    if (progress >= 70) return 'bg-linear-to-r from-amber-500 to-orange-500';
    return 'bg-linear-to-r from-emerald-500 to-teal-500';
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

    if (!confirm('¿Estás seguro que deseas tomar este ticket? Cambiará a estado EN_PROCESO y comenzará el conteo de tiempo de atención.')) {
      return;
    }

    try {
      setActionLoading(true);
      // Llamar únicamente al endpoint `cogerTicket`; el backend controla la transición ESPERA -> EN_PROCESO.
      await cogerTicket(ticket.id);

      await loadTicketDetail();
      showSuccessToast('Ticket tomado correctamente. Ahora está EN_PROCESO.');
    } catch (error: any) {
      console.error('Error al coger ticket:', error);
      showErrorToast(error.response?.data?.message || 'Error al coger ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarcarResuelto = async () => {
    if (!ticket || actionLoading) return;
    // Si es ticket público, requerir que haya sido configurado con el botón "Configurar"
    if (ticket.origen === 'PORTAL_PUBLICO' && !(ticket.configurado_por || ticket.configurado_at)) {
      showErrorToast('Debe usar el botón "Configurar" y guardar la configuración antes de culminar este ticket.');
      return;
    }

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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
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
                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${getEstadoColor(ticket.estado)}`}>
                      {ticket.estado.replace('_', ' ')}
                    </span>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${getPrioridadColor(ticket.prioridad)}`}>
                      {ticket.prioridad}
                    </span>
                  </div>

                  {/* Compact SLA bar inside detail header (follows same rules) */}
                  <div className="flex-1 flex items-center">
                    {(ticket.estado === 'ESPERA' || ticket.estado === 'ABIERTO') && (
                      <div className="ml-2 w-full max-w-md">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">Tiempo de Respuesta</div>
                          <div className="text-xs text-gray-600">{typeof ticket.porcentaje_tiempo_respuesta === 'number' ? `${ticket.porcentaje_tiempo_respuesta.toFixed(1)}%` : 'N/A'}</div>
                        </div>
                        <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                          <div className={`${getSLAColorClass(ticket.porcentaje_tiempo_respuesta, ticket.pausado)} absolute top-0 left-0 h-full`} style={{ width: `${Math.max(0, Math.min(100, ticket.porcentaje_tiempo_respuesta ?? 0))}%` }} />
                        </div>
                      </div>
                    )}

                    {ticket.estado === 'EN_PROCESO' && (
                      <div className="ml-2 w-full max-w-md">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">Tiempo de Resolución</div>
                          <div className="text-xs text-gray-600">{typeof ticket.porcentaje_tiempo_resolucion === 'number' ? `${ticket.porcentaje_tiempo_resolucion.toFixed(1)}%` : 'N/A'}</div>
                        </div>
                        <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                          <div className={`${getSLAColorClass(ticket.porcentaje_tiempo_resolucion, ticket.pausado)} absolute top-0 left-0 h-full`} style={{ width: `${Math.max(0, Math.min(100, ticket.porcentaje_tiempo_resolucion ?? 0))}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="mt-4 sm:mt-0 sm:ml-6 flex flex-wrap gap-2">
                {/* Asignación de técnico ahora se hace desde la tabla de tickets */}

                {/* Botón "Coger ticket / Pasar a proceso" - Visible si es ticket público en ESPERA con técnico asignado, o si está ABIERTO */}
                {((ticket.origen === 'PORTAL_PUBLICO' && ticket.estado === 'ESPERA') || ticket.estado === 'ABIERTO') && ticket.tecnico_asignado && user && ticket.tecnico_asignado.id === user.id && (
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
                 ticket.tecnico_asignado.id === user.id &&
                 (ticket.origen !== 'PORTAL_PUBLICO' || ticket.configurado_por || ticket.configurado_at) && (
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

                {/* Reasignación ahora se hace desde la tabla de tickets */}

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
                {/* Botón Ver Chat/Seguimiento público (eliminado) */}
                {/* Botón Configurar - disponible para tickets del portal público cuando NO está RESUELTO */}
                {ticket.origen === 'PORTAL_PUBLICO' && ticket.estado !== 'RESUELTO' && (
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
                {/* Mostrar Reasignar solo si tecnico_asignado_id tiene valor */}
                {user && user.rol && user.rol.toLowerCase().includes('admin') && ticket.tecnico_asignado_id != null && (
                  <button
                    onClick={() => {
                      setShowAsignarModal(true);
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm font-medium"
                  >
                    Reasignar técnico
                  </button>
                )}
              </div>
            </div>

            {/* SLA Timer - Sistema de Fases */}
            {ticket.fase_sla_actual && ticket.fase_sla_actual !== 'SIN_SLA' && (
              <div className="mt-6">
                {/* Fase de Respuesta: Desde ABIERTO hasta EN_PROCESO */}
                {ticket.fase_sla_actual === 'RESPUESTA' && (
                  <SLATimer
                    estadoSLA={ticket.estado_sla}
                    label="Tiempo de Respuesta"
                    porcentajeConsumido={ticket.porcentaje_tiempo_respuesta}
                    tiempoTranscurridoMinutos={ticket.tiempo_respuesta_transcurrido_minutos}
                    tiempoRestanteMinutos={ticket.tiempo_respuesta_restante_minutos}
                    fechaLimite={ticket.fecha_limite_respuesta}
                    slaPausado={ticket.pausado || ticket.estado_sla === 'PAUSADO'}
                    motivoPausa={ticket.motivo_pausa}
                    alertas={ticket.sla_alertas}
                  />
                )}

                {/* Fase de Resolución: Desde EN_PROCESO hasta RESUELTO */}
                {ticket.fase_sla_actual === 'RESOLUCION' && (
                  <SLATimer
                    estadoSLA={ticket.estado_sla}
                    label="Tiempo de Resolución"
                    porcentajeConsumido={ticket.porcentaje_tiempo_resolucion}
                    tiempoTranscurridoMinutos={ticket.tiempo_resolucion_transcurrido_minutos}
                    tiempoRestanteMinutos={ticket.tiempo_resolucion_restante_minutos}
                    fechaLimite={ticket.fecha_limite_resolucion}
                    slaPausado={ticket.pausado || ticket.estado_sla === 'PAUSADO'}
                    motivoPausa={ticket.motivo_pausa}
                    alertas={ticket.sla_alertas}
                  />
                )}

                {/* Ticket Completado: Mostrar resumen de ambas fases */}
                {ticket.fase_sla_actual === 'COMPLETADO' && (
                  <div className="space-y-4">
                    <div className="bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-emerald-800 mb-3">✓ SLA Completado - Resumen de Fases</h3>
                      
                      {/* Resumen Fase de Respuesta */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Fase de Respuesta</span>
                          <span className={`text-sm font-semibold ${
                            (ticket.porcentaje_tiempo_respuesta ?? 0) <= 100 ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {ticket.porcentaje_tiempo_respuesta?.toFixed(1)}%
                            {(ticket.porcentaje_tiempo_respuesta ?? 0) <= 100 ? ' ✓ Cumplido' : ' ✕ Excedido'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Tiempo transcurrido: {formatMinutes(ticket.tiempo_respuesta_transcurrido_minutos)} 
                          {ticket.tiempo_respuesta_minutos && ` de ${formatMinutes(ticket.tiempo_respuesta_minutos)}`}
                        </div>
                      </div>

                      {/* Resumen Fase de Resolución */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Fase de Resolución</span>
                          <span className={`text-sm font-semibold ${
                            (ticket.porcentaje_tiempo_resolucion ?? 0) <= 100 ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {ticket.porcentaje_tiempo_resolucion?.toFixed(1)}%
                            {(ticket.porcentaje_tiempo_resolucion ?? 0) <= 100 ? ' ✓ Cumplido' : ' ✕ Excedido'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Tiempo transcurrido: {formatMinutes(ticket.tiempo_resolucion_transcurrido_minutos)}
                          {ticket.tiempo_resolucion_minutos && ` de ${formatMinutes(ticket.tiempo_resolucion_minutos)}`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                    {ticket.activos.map((activo: any, index: number) => {
                      const getFirst = (...vals: any[]) => {
                        for (const v of vals) {
                          if (v === null || v === undefined) continue;
                          try {
                            const s = String(v).trim();
                            if (s) return s;
                          } catch (e) {
                            // ignore
                          }
                        }
                        return '';
                      };

                      const assetDetail = (() => {
                        const key = String(activo.activo_id ?? activo.activoId ?? activo.id ?? '');
                        return assetMap && key && assetMap[key] ? assetMap[key] : null;
                      })();

                      const code = getFirst(
                        activo.codigo_acceso_remoto,
                        activo.codigoAccesoRemoto,
                        activo.anydesk,
                        activo.any_desk,
                        activo.anyDesk,
                        activo.activo?.codigo_acceso_remoto,
                        activo.propiedades?.codigo_acceso_remoto,
                        activo.detalles?.codigo_acceso_remoto,
                        assetDetail?.codigo_acceso_remoto,
                        assetDetail?.codigoAccesoRemoto,
                        assetDetail?.anydesk,
                        assetDetail?.any_desk,
                        assetDetail?.anyDesk
                      );
                      const usuario = ticket.usuario_nombre || '';
                      const telefono = ticket.usuario_telefono || '';
                      const avatarInitial = (usuario && usuario.charAt(0).toUpperCase()) || 'U';

                      const handleCopy = async (text: string, label?: string) => {
                        if (!text) return;
                        try {
                          await navigator.clipboard.writeText(text);
                          showSuccessToast(`${label || 'Texto'} copiado al portapapeles`);
                        } catch (e) {
                          console.error('copy error', e);
                          showErrorToast('No se pudo copiar al portapapeles');
                        }
                      };

                      return (
                        <div key={index} className="flex items-start gap-3 p-3 bg-white rounded border border-gray-200 shadow-sm">
                          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                            <span className="text-blue-600 font-semibold">{avatarInitial}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{activo.activo_nombre || activo.nombre || 'Activo'}</p>
                                <p className="text-xs text-gray-500 font-mono truncate">{activo.activo_codigo || activo.codigo}</p>

                                <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:gap-4 text-sm text-gray-600">
                                  {usuario && (
                                    <div className="flex items-center gap-2 truncate">
                                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A10 10 0 1118.88 6.196 10 10 0 015.12 17.804zM15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                      <span className="truncate">{usuario}</span>
                                    </div>
                                  )}

                                  {telefono && (
                                    <a href={`tel:${telefono}`} className="flex items-center gap-2 text-sky-600 hover:text-sky-800 truncate">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2.18a2 2 0 011.72.894l1.24 1.86a2 2 0 01-.45 2.48l-1.27 1.08a11.03 11.03 0 005.516 5.516l1.08-1.27a2 2 0 012.48-.45l1.86 1.24A2 2 0 0121 18.82V21a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"/></svg>
                                      <span className="truncate">{telefono}</span>
                                    </a>
                                  )}
                                </div>
                              </div>

                              <div className="ml-2 sm:ml-4 shrink-0 text-right">
                                {code ? (
                                  <div className="w-full sm:w-auto flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded bg-sky-50">
                                      <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.657 1.343-3 3-3s3 1.343 3 3M6 11c0-3.866 3.582-7 8-7s8 3.134 8 7v3a2 2 0 01-2 2h-1"/></svg>
                                    </div>

                                    <div className="flex-1 text-left sm:text-right min-w-0">
                                      <div className="text-xs text-gray-500">Código Acceso Remoto</div>
                                      <div className="mt-1 text-sm font-mono text-gray-900 truncate wrap-break-word">{code}</div>
                                    </div>

                                    <div className="flex items-center">
                                      <button onClick={() => handleCopy(code, 'Código')} className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors text-xs">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V9H3v10a2 2 0 002 2z"/></svg>
                                        Copiar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400 italic">Sin código de acceso</div>
                                )}
                              </div>
                            </div>

                            {activo.activo_tipo && (
                              <div className="mt-2 text-xs text-gray-500">{activo.activo_tipo}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
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
                            <div className="w-12 h-12 rounded bg-blue-100 flex items-center justify-center shrink-0">
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
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
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
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
                        <span className="text-gray-700 font-semibold text-xs">
                          {ticket.creado_por.nombre?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 font-medium truncate">{ticket.creado_por.nombre}</p>
                    </div>
                  </div>
                )}
                {(ticket.configurado_por || ticket.configurado_at) && (
                  <div className="border-t border-gray-200 pt-4">
                    <label className="text-sm font-medium text-gray-500 mb-3 block">Configuración</label>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                      {ticket.configurado_por && (
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
                            <span className="text-gray-700 font-semibold text-xs">
                              {ticket.configurado_por.nombre?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 font-medium truncate">{ticket.configurado_por.nombre}</p>
                            {ticket.configurado_at && (
                              <p className="text-xs text-gray-600 truncate">{new Date(ticket.configurado_at).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {!ticket.configurado_por && ticket.configurado_at && (
                        <p className="text-sm text-gray-600">{new Date(ticket.configurado_at).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                )}
                {/* Chat interno - sección para que admins/técnicos escriban al usuario */}
                <div className="border-t border-gray-200 pt-4">
                  <label className="text-sm font-medium text-gray-500 mb-3 block">Chat con el usuario</label>
                  <div className="bg-white rounded p-3 border border-gray-200">
                    <div ref={chatContainerRef} className="h-[56vh] overflow-y-auto flex flex-col gap-3 p-2">
                      {chatMessages.map((m, idx) => {
                        const tipo = String(m.emisor_tipo || '').toUpperCase();
                        const isSistema = tipo === 'SISTEMA';
                        const isCliente = tipo === 'CLIENTE';
                        const isTecnico = tipo === 'TECNICO';

                        const displayName = m.emisor_nombre || (isCliente ? ticket.creado_por?.nombre : isTecnico ? ticket.tecnico_asignado?.nombre : undefined) || '';
                        const initial = displayName ? displayName.charAt(0).toUpperCase() : (isSistema ? 'I' : '?');

                        if (isSistema) {
                          return (
                            <div key={idx} className="flex justify-center">
                              <div className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm max-w-prose text-center">
                                {m.mensaje}
                                <div className="text-xs text-gray-500 mt-1">{new Date(m.created_at).toLocaleString()}</div>
                              </div>
                            </div>
                          );
                        }

                        const isRight = isCliente;
                        return (
                          <div key={idx} className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex items-end gap-3 max-w-[80%] ${isRight ? 'flex-row-reverse' : 'flex-row'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${isRight ? 'bg-sky-100 text-sky-800' : 'bg-blue-600 text-white'}`}>
                                {initial}
                              </div>
                              <div className="flex flex-col">
                                <div className="text-xs font-semibold text-gray-700">{displayName}</div>
                                <div className={`mt-1 px-3 py-2 rounded-lg ${isTecnico ? 'bg-linear-to-r from-blue-600 to-sky-500 text-white' : 'bg-sky-50 border border-sky-100 text-sky-800'}`}>{m.mensaje}</div>
                                <div className="text-xs text-gray-500 mt-1">{new Date(m.created_at).toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const estadoEnProceso = normalizeEstadoLocal(ticket.estado as any) === 'EN PROCESO';
                          const isCreator = !!(user && ticket.creado_por && user.id === ticket.creado_por.id);
                          const isAssignedTech = !!(user && ticket.tecnico_asignado_id != null && user.id === ticket.tecnico_asignado_id);
                          const canSend = estadoEnProceso && (isAssignedTech || isCreator) && !chatDisabled && normalizeEstadoLocal(ticket.estado as any) !== 'RESUELTO';
                          return (
                            <>
                              <input
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    await handleSendChat();
                                  }
                                }}
                                disabled={!canSend}
                                placeholder={chatDisabledMessage || (canSend ? 'Escribe un mensaje al usuario...' : (estadoEnProceso ? 'No estás autorizado para enviar mensajes en este ticket' : 'Chat solo lectura en este estado'))}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300"
                              />
                              <button
                                onClick={handleSendChat}
                                disabled={!canSend || !chatInput.trim()}
                                className={`px-4 py-2 rounded-md text-sm font-medium ${canSend ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                              >
                                Enviar
                              </button>
                            </>
                          );
                        })()}
                      </div>
                      {chatDisabledMessage && (
                        <div className="mt-2 text-sm text-red-600">{chatDisabledMessage}</div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">Los mensajes se cargan desde el backend. El frontend no decide el emisor; renderiza según `emisor_tipo`.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AsignarTecnicoModal
        isOpen={showAsignarModal}
        onClose={() => setShowAsignarModal(false)}
        onConfirm={async (tecnicoId: number) => {
          if (!ticket) return;
          try {
            setAsignando(true);
            await asignarTecnico(ticket.id, tecnicoId);
            await loadTicketDetail();
            showSuccessToast('Técnico asignado correctamente');
            setShowAsignarModal(false);
            // notify other pages (e.g., TicketsPage) that assignment changed
            try { window.dispatchEvent(new CustomEvent('ticketAssigned', { detail: { ticketId: ticket.id } })); } catch (e) { /* ignore */ }
          } catch (err: any) {
            console.error('Error reasignando técnico:', err);
            showErrorToast(err?.response?.data?.message || 'Error al reasignar técnico');
          } finally {
            setAsignando(false);
          }
        }}
        ticketId={ticket?.id ?? 0}
        tecnicoActual={ticket?.tecnico_asignado ? { id: ticket.tecnico_asignado.id, nombre: ticket.tecnico_asignado.nombre } : null}
      />

      {/* Modales */}
      {/* La asignación de técnicos se realiza desde la tabla de tickets. */}

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

      {/* Asset detail modal removed — asset info now shown inline beside each activo */}

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

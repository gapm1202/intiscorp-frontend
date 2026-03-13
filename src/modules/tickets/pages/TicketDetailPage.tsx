import { useEffect, useState, useCallback, useRef } from 'react';
// removed API_BASE import; asset detail is shown inline now
import { useParams, useNavigate } from 'react-router-dom';
import { getTicketById, getTickets, cogerTicket, cambiarEstado, pausarSLA, reanudarSLA, editarTicket, getMensajes, postMensaje, asignarTecnico } from '../services/ticketsService';
import { getInventarioBySede } from '@/modules/inventario/services/inventarioService';
import { getContratoActivo } from '@/modules/empresas/services/contratosService';
import { getSedesByEmpresa } from '@/modules/empresas/services/sedesService';
import { getAreasByEmpresa } from '@/modules/inventario/services/areasService';
import { getCategorias, type Category } from '@/modules/inventario/services/categoriasService';
import axiosClient from '@/api/axiosClient';
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
import NewVisitaModal from '@/modules/visitas/components/NewVisitaModal';
import type { Visita } from '@/modules/visitas/types';
import FinalizarVisitaModal from '@/modules/visitas/components/FinalizarVisitaModal';
import { getVisitas } from '@/modules/visitas/services/visitasService';
import RegisterAssetModal from '@/modules/inventario/components/RegisterAssetModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import TicketKnowledgePanel, { type KBEntry } from '../components/TicketKnowledgePanel';

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
  const [confirmTakeOpen, setConfirmTakeOpen] = useState(false);
  const [showPasarPresencialModal, setShowPasarPresencialModal] = useState(false);
  const [showFinalizarVisitaModal, setShowFinalizarVisitaModal] = useState(false);
  const [visitaToFinalizar, setVisitaToFinalizar] = useState<Visita | null>(null);
  const [showEditAssetModal, setShowEditAssetModal] = useState(false);
  const [showCulminarModal, setShowCulminarModal] = useState(false);
  const [diagCierre, setDiagCierre] = useState('');
  const [resCierre, setResCierre] = useState('');
  const [recCierre, setRecCierre] = useState('');
  const [editingAsset, setEditingAsset] = useState<any | null>(null);
  const [editAssetSedes, setEditAssetSedes] = useState<any[]>([]);
  const [editAssetAreas, setEditAssetAreas] = useState<any[]>([]);
  const [editAssetCategories, setEditAssetCategories] = useState<Category[]>([]);
  const [editAssetGroups, setEditAssetGroups] = useState<Array<{ id?: string; nombre?: string; codigo?: string }>>([]);
  const editAssetKeyRef = useRef(0);
  const [contratoActivo, setContratoActivo] = useState<any>(null);
  const [asignando, setAsignando] = useState(false);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  // Mapa temporal de detalles del inventario por activo_id
  const [assetMap, setAssetMap] = useState<Record<string, any>>({});
  const [chatDisabled, setChatDisabled] = useState(false);
  const [chatDisabledMessage, setChatDisabledMessage] = useState<string | null>(null);
  const [selectedKbEntry, setSelectedKbEntry] = useState<KBEntry | null>(null);
  // Chat interno (proviene del backend): { emisor_tipo, emisor_nombre, mensaje, created_at }
  const [chatMessages, setChatMessages] = useState<Array<{ emisor_tipo: string; emisor_nombre?: string; mensaje: string; created_at: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setToastType('success');
    setShowToast(true);
  };

  const handleCulminarTicket = async () => {
    if (!ticket || actionLoading) return;

    const currentTicketId = String(ticket.id);

    // Detecta si el ticket tiene una visita activa (EN_PROCESO) creada
    // desde el flujo "Pasar a presencial" (tipoVisita = POR_TICKET).
    // Solo ese flujo debe abrir el modal FinalizarVisita.
    try {
      setActionLoading(true);
      const rawVisitas = await getVisitas({
        ticketId: currentTicketId,
        tipoVisita: 'POR_TICKET',
        estado: 'EN_PROCESO',
        limite: 50,
      });

      console.log('[Culminar] ticketId buscado:', currentTicketId);
      console.log('[Culminar] rawVisitas response:', JSON.stringify(rawVisitas, null, 2));

      const visitas: any[] = Array.isArray(rawVisitas)
        ? rawVisitas
        : Array.isArray(rawVisitas?.data)
          ? rawVisitas.data
          : Array.isArray(rawVisitas?.visitas)
            ? rawVisitas.visitas
            : [];

      console.log('[Culminar] visitas array length:', visitas.length);
      visitas.forEach((v: any, i: number) => {
        console.log(`[Culminar] visita[${i}]:`, {
          _id: v?._id,
          id: v?.id,
          ticketId: v?.ticketId,
          ticket_id: v?.ticket_id,
          tipoVisita: v?.tipoVisita,
          tipo_visita: v?.tipo_visita,
          estado: v?.estado,
        });
      });

      // Filtro estricto client-side: verifica estado + tipoVisita + ticketId
      // El backend puede ignorar los filtros y devolver TODAS las visitas.
      const visitaEnProceso = visitas.find((v: any) => {
        const est = String(v?.estado || '').toUpperCase().replace(/[_\s]+/g, '_').trim();
        const tipo = String(v?.tipoVisita || v?.tipo_visita || '').toUpperCase().replace(/[_\s]+/g, '_').trim();
        const vTicketId = String(v?.ticketId ?? v?.ticket_id ?? '');
        const matchEstado = est === 'EN_PROCESO';
        const matchTipo = tipo === 'POR_TICKET';
        const matchTicket = vTicketId === currentTicketId;
        console.log('[Culminar] evaluando visita:', { id: v?._id ?? v?.id, matchEstado, matchTipo, matchTicket, vTicketId, currentTicketId });
        return matchEstado && matchTipo && matchTicket;
      });

      if (visitaEnProceso) {
        const visita = visitaEnProceso as Record<string, unknown>;
        const visitaId = Number(visita['_id'] ?? visita['id']);
        console.log('[Culminar] ✅ Visita válida encontrada, abriendo FinalizarVisitaModal. id:', visitaId);
        if (!Number.isInteger(visitaId) || visitaId <= 0) {
          showErrorToast('No se encontró el ID de la visita a finalizar');
          return;
        }

        setVisitaToFinalizar({
          ...(visita as Partial<Visita>),
          _id: String(visitaId),
        } as Visita);
        setShowFinalizarVisitaModal(true);
        return;
      }

      console.log('[Culminar] ❌ No se encontró visita POR_TICKET + EN_PROCESO para este ticket → formulario simple');
    } catch (err: any) {
      console.warn('[Culminar] Error al verificar visitas, usando formulario simple:', err.message);
    } finally {
      setActionLoading(false);
    }

    // Por defecto: formulario simple (Diagnóstico / Resolución / Recomendación)
    setDiagCierre('');
    setResCierre('');
    setRecCierre('');
    setShowCulminarModal(true);
  };

  const handleSubmitCulminarRemoto = async () => {
    if (!ticket || actionLoading) return;
    if (!diagCierre.trim() || !resCierre.trim() || !recCierre.trim()) {
      showErrorToast('Completa Diagnóstico, Resolución y Recomendación para culminar el ticket');
      return;
    }

    try {
      setActionLoading(true);
      const resumen = [
        `Diagnóstico: ${diagCierre.trim()}`,
        `Resolución: ${resCierre.trim()}`,
        `Recomendación: ${recCierre.trim()}`,
      ].join('\n\n');
      await cambiarEstado(ticket.id, 'RESUELTO', {
        motivo: resumen,
        diagnostico: diagCierre.trim(),
        resolucion: resCierre.trim(),
        recomendacion: recCierre.trim(),
      });
      await loadTicketDetail();
      setShowCulminarModal(false);
      showSuccessToast('Ticket culminado correctamente');
    } catch (error: any) {
      console.error('Error al culminar ticket remoto:', error);
      showErrorToast(error.response?.data?.message || 'Error al culminar ticket');
    } finally {
      setActionLoading(false);
    }
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

  // Cargar contrato activo de la empresa del ticket
  useEffect(() => {
    if (!ticket?.empresa_id) {
      setContratoActivo(null);
      return;
    }

    const cargarContrato = async () => {
      try {
        const contrato = await getContratoActivo(String(ticket.empresa_id));
        setContratoActivo(contrato);
      } catch (error) {
        console.error('Error loading contrato:', error);
        setContratoActivo(null);
      }
    };

    cargarContrato();
  }, [ticket?.empresa_id]);

  // Polling para refrescar detalle del ticket (SLA, porcentajes) cada 30s
  useEffect(() => {
    const idNum = id ? Number(id) : null;
    if (!idNum) return;
    // Suspend polling while modals are open to avoid re-renders
    if (showPasarPresencialModal || showFinalizarVisitaModal || showEditAssetModal) return;

    const interval = setInterval(() => {
      loadTicketDetail();
    }, 30000);
    return () => clearInterval(interval);
  }, [id, loadTicketDetail, showPasarPresencialModal, showFinalizarVisitaModal, showEditAssetModal]);

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

    // Suspend chat polling while modals are open to avoid re-renders
    if (showPasarPresencialModal || showFinalizarVisitaModal || showEditAssetModal) return () => { cancelled = true; };

    // polling cada 3 segundos
    const intervalId = setInterval(fetchMsgs, 3000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [ticket, showPasarPresencialModal, showFinalizarVisitaModal, showEditAssetModal]);

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
    const estadoNormalizado = normalizeEstadoLocal(ticket.estado as any);
    const chatHabilitado = estadoNormalizado === 'EN TRIAGE' || estadoNormalizado === 'EN PROCESO';
    const isCreator = !!(user && ticket.creado_por && user.id === ticket.creado_por.id);
    const isAssignedTech = !!(user && ticket.tecnico_asignado_id != null && user.id === ticket.tecnico_asignado_id);
    const isAdmin = user?.rol && user.rol.toLowerCase().includes('admin');
    const canSend = chatHabilitado && (isAssignedTech || isCreator || isAdmin) && !chatDisabled;
    if (!canSend) return;

    try {
      await postMensaje(ticket.id, { mensaje: chatInput.trim() });
      const msgs = await getMensajes(ticket.id);
      setChatMessages(Array.isArray(msgs) ? msgs : []);
      setChatInput('');
    } catch (err: any) {
      console.error('Error enviando mensaje:', err);
      // Mostrar el mensaje real del backend
      const errorMessage = err?.response?.data?.message || 'Error al enviar mensaje';
      const status = err?.response?.status;
      
      if (status === 403) {
        setChatDisabled(true);
        setChatDisabledMessage(errorMessage);
      }
      
      showErrorToast(errorMessage);
    }
  };

  const getEstadoColor = (estado: string) => {
    const colors: Record<string, string> = {
      'ESPERA': 'bg-amber-100 text-amber-800 border border-amber-300 font-semibold',
      'EN_TRIAGE': 'bg-blue-100 text-blue-800 border border-blue-300 font-semibold',
      'ABIERTO': 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold',
      'EN_PROCESO': 'bg-sky-100 text-sky-800 border border-sky-300 font-semibold',
      'PENDIENTE': 'bg-orange-100 text-orange-800 border border-orange-300 font-semibold',
      'PENDIENTE_CLIENTE': 'bg-orange-100 text-orange-800 border border-orange-300 font-semibold',
      'RESUELTO': 'bg-teal-100 text-teal-800 border border-teal-300 font-semibold',
      'CERRADO': 'bg-slate-100 text-slate-700 border border-slate-300 font-semibold',
      'CANCELADO': 'bg-red-100 text-red-800 border border-red-300 font-semibold'
    };
    return colors[estado] || 'bg-slate-100 text-slate-700 border border-slate-300 font-semibold';
  };

  const getSLAColorClass = (pct?: number, paused?: boolean) => {
    if (paused) return 'bg-slate-400';
    const raw = typeof pct === 'number' ? pct : 0;
    if (raw < 70) return 'bg-emerald-500';
    if (raw >= 70 && raw < 90) return 'bg-amber-500';
    if (raw >= 90 && raw < 100) return 'bg-orange-500';
    return 'bg-rose-600';
  };

  const getPrioridadColor = (prioridad: string) => {
    const colors: Record<string, string> = {
      'CRITICA': 'bg-rose-600 text-white border border-rose-700 font-bold',
      'ALTA': 'bg-orange-500 text-white border border-orange-600 font-bold',
      'MEDIA': 'bg-blue-600 text-white border border-blue-700 font-bold',
      'BAJA': 'bg-emerald-600 text-white border border-emerald-700 font-bold',
      'urgente': 'bg-rose-600 text-white border border-rose-700 font-bold',
      'alta': 'bg-orange-500 text-white border border-orange-600 font-bold',
      'media': 'bg-blue-600 text-white border border-blue-700 font-bold',
      'baja': 'bg-emerald-600 text-white border border-emerald-700 font-bold'
    };
    return colors[prioridad] || 'bg-slate-600 text-white border border-slate-700 font-bold';
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
    // Open confirm modal instead of native confirm
    setConfirmTakeOpen(true);
  };

  const confirmTake = async () => {
    if (!ticket) return;
    try {
      setConfirmTakeOpen(false);
      setActionLoading(true);
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

  if (loading && !ticket) {
    return (
      <div className="flex justify-center items-center min-h-[400px] bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
          <p className="text-blue-700 font-medium">Cargando detalle del ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen">
        <div className="bg-white border-2 border-red-200 rounded-xl p-6 shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-red-800 font-bold text-lg">Error al cargar el ticket</h3>
          </div>
          <p className="text-red-700 mb-4 font-medium">{error || 'Ticket no encontrado'}</p>
          <button
            onClick={() => navigate('/admin/tickets')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2 font-semibold"
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
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 50%, #f0f9ff 100%)' }}>
      <div className="p-6 max-w-7xl mx-auto">

        {/* Header con botones de acción */}
       <div className="mb-6">
  <button
    onClick={() => navigate('/admin/tickets')}
    className="text-sky-600 hover:text-sky-800 mb-5 flex items-center gap-2 transition-colors font-semibold text-sm group"
  >
    <span className="w-7 h-7 rounded-full bg-sky-100 group-hover:bg-sky-200 flex items-center justify-center transition-colors">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
      </svg>
    </span>
    Volver a tickets
  </button>

  {/* Card principal del ticket */}
  <div className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden">
    {/* Franja superior */}
    <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400" />

    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

        {/* Info principal */}
        <div className="flex-1">
          <span className="text-xs font-bold tracking-widest text-sky-400 uppercase">Ticket</span>
          <h1 className="text-2xl font-extrabold text-sky-900 mt-0.5 mb-1 tracking-tight">
            {ticket.codigo_ticket || `#${ticket.id}`}
          </h1>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-4">
            <svg className="w-3.5 h-3.5 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Creado el {new Date(ticket.fecha_creacion).toLocaleString('es-PE', {
              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>

          {/* Badges + SLA bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoColor(ticket.estado)}`}>
                {ticket.estado.replace('_', ' ')}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPrioridadColor(ticket.prioridad)}`}>
                {ticket.prioridad}
              </span>
            </div>

            <div className="flex-1 flex items-center">
              {ticket.aplica_sla && ticket.estado === 'ABIERTO' && (
                <div className="ml-2 w-full max-w-md">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-sky-600">Tiempo de Respuesta</span>
                    <span className="text-xs font-bold text-sky-800">
                      {typeof ticket.porcentaje_tiempo_respuesta === 'number' ? `${ticket.porcentaje_tiempo_respuesta.toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="relative w-full h-1.5 bg-sky-100 rounded-full overflow-hidden">
                    <div
                      className={`${getSLAColorClass(ticket.porcentaje_tiempo_respuesta, ticket.pausado)} absolute top-0 left-0 h-full rounded-full transition-all`}
                      style={{ width: `${Math.max(0, Math.min(100, ticket.porcentaje_tiempo_respuesta ?? 0))}%` }}
                    />
                  </div>
                </div>
              )}
              {ticket.aplica_sla && ticket.estado === 'EN_PROCESO' && (
                <div className="ml-2 w-full max-w-md">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-sky-600">Tiempo de Resolución</span>
                    <span className="text-xs font-bold text-sky-800">
                      {typeof ticket.porcentaje_tiempo_resolucion === 'number' ? `${ticket.porcentaje_tiempo_resolucion.toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="relative w-full h-1.5 bg-sky-100 rounded-full overflow-hidden">
                    <div
                      className={`${getSLAColorClass(ticket.porcentaje_tiempo_resolucion, ticket.pausado)} absolute top-0 left-0 h-full rounded-full transition-all`}
                      style={{ width: `${Math.max(0, Math.min(100, ticket.porcentaje_tiempo_resolucion ?? 0))}%` }}
                    />
                  </div>
                </div>
              )}
              {!ticket.aplica_sla && ['ESPERA', 'EN_TRIAGE'].includes(ticket.estado) && (
                <div className="ml-2">
                  <span className="text-xs text-sky-400 italic">⏳ Sin SLA — Esperando configuración</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-wrap gap-2 sm:ml-4">
          {ticket.origen === 'PORTAL_PUBLICO' && ticket.estado === 'ESPERA' && (
            <button
              onClick={handleCogerTicket}
              disabled={actionLoading}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 active:bg-sky-800 transition-all text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {actionLoading
                ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              }
              Iniciar Triaje
            </button>
          )}

          {ticket.origen === 'PORTAL_PUBLICO' && ['ESPERA', 'EN_TRIAGE'].includes(ticket.estado) && (
            <button
              onClick={() => setShowConfigurarModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-bold shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {ticket.estado === 'EN_TRIAGE' ? 'Guardar Configuración' : 'Configurar'}
            </button>
          )}

          {ticket.estado === 'ABIERTO' && ticket.tecnico_asignado && user && ticket.tecnico_asignado.id === user.id && (
            <button
              onClick={handleCogerTicket}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {actionLoading
                ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              }
              Iniciar Atención
            </button>
          )}

          {ticket.estado === 'EN_PROCESO' && ticket.tecnico_asignado && user && ticket.tecnico_asignado.id === user.id &&
            (ticket.origen !== 'PORTAL_PUBLICO' || ticket.configurado_por || ticket.configurado_at) && (
            <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <button
                onClick={handleCulminarTicket}
                disabled={actionLoading || !selectedKbEntry}
                title={!selectedKbEntry ? 'Selecciona una entrada de la Base de Conocimiento para habilitar este botón' : undefined}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {actionLoading
                  ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                }
                Culminar ticket
              </button>
              {!selectedKbEntry && (
                <span style={{ fontSize: '.68rem', color: '#0f766e', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  Requiere entrada KB seleccionada
                </span>
              )}
            </div>
          )}

          {ticket.estado === 'EN_PROCESO' && ticket.modalidad === 'REMOTO' && ticket.tecnico_asignado && user && ticket.tecnico_asignado.id === user.id && (
            <button
              onClick={() => setShowPasarPresencialModal(true)}
              disabled={!contratoActivo}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-all text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={!contratoActivo ? 'No hay contrato activo para esta empresa' : 'Programar visita presencial'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Pasar a Presencial
            </button>
          )}

          {/* Botones secundarios (outline) */}
          {user && ((user.rol && user.rol.toLowerCase().includes('admin')) || (ticket.tecnico_asignado && ticket.tecnico_asignado.id === user.id)) && (
            <button
              onClick={handleEditarTicket}
              className="px-4 py-2 bg-white border border-sky-200 text-sky-700 rounded-lg hover:bg-sky-50 hover:border-sky-400 transition-all text-sm font-semibold"
            >
              Editar
            </button>
          )}

          {ticket.aplica_sla && user && ((user.rol && user.rol.toLowerCase().includes('admin')) || (ticket.tecnico_asignado && ticket.tecnico_asignado.id === user.id)) && (
            <button
              onClick={() => setShowPausarSLAModal(true)}
              className="px-4 py-2 bg-white border border-sky-200 text-sky-700 rounded-lg hover:bg-sky-50 hover:border-sky-400 transition-all text-sm font-semibold"
            >
              {ticket.pausado ? 'Reanudar SLA' : 'Pausar SLA'}
            </button>
          )}

          <button
            onClick={() => setShowHistorialModal(true)}
            className="px-4 py-2 bg-white border border-sky-200 text-sky-700 rounded-lg hover:bg-sky-50 hover:border-sky-400 transition-all text-sm font-semibold"
          >
            Historial
          </button>

          {ticket.estado !== 'CERRADO' && ticket.estado !== 'CANCELADO' && user && ((user.rol && user.rol.toLowerCase().includes('admin')) || (ticket.tecnico_asignado && ticket.tecnico_asignado.id === user.id)) && (
            <button
              onClick={() => setShowCancelarModal(true)}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all text-sm font-bold shadow-sm"
            >
              Cancelar Ticket
            </button>
          )}

          {user && user.rol && user.rol.toLowerCase().includes('admin') && ticket.tecnico_asignado_id != null && (
            <button
              onClick={() => setShowAsignarModal(true)}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all text-sm font-bold shadow-sm"
            >
              Reasignar técnico
            </button>
          )}
        </div>
      </div>

      {/* SLA Timer */}
      {ticket.aplica_sla && (
        <div className="mt-6 pt-5 border-t border-sky-50">
          {ticket.fase_sla_actual && ticket.fase_sla_actual !== 'SIN_SLA' ? (
            <>
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

              {ticket.fase_sla_actual === 'COMPLETADO' && (
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-2 pb-2 border-b border-sky-100">
                    <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xs font-semibold tracking-widest uppercase text-sky-700">
                      SLA Completado — Resumen de Fases
                    </h3>
                  </div>

                  {/* Fase Respuesta */}
                  <div className="bg-white border border-sky-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold tracking-wide uppercase text-slate-400">Fase de Respuesta</span>
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                        (ticket.porcentaje_tiempo_respuesta ?? 0) <= 100
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {(ticket.porcentaje_tiempo_respuesta ?? 0) <= 100 ? '✓' : '✕'}
                        {' '}{ticket.porcentaje_tiempo_respuesta?.toFixed(1)}%
                        {(ticket.porcentaje_tiempo_respuesta ?? 0) <= 100 ? ' Cumplido' : ' Excedido'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Tiempo transcurrido:{' '}
                      <span className="font-semibold text-slate-700">{formatMinutes(ticket.tiempo_respuesta_transcurrido_minutos)}</span>
                      {ticket.tiempo_respuesta_minutos && (
                        <span className="text-slate-400"> de {formatMinutes(ticket.tiempo_respuesta_minutos)}</span>
                      )}
                    </p>
                  </div>

                  {/* Fase Resolución */}
                  <div className="bg-white border border-sky-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold tracking-wide uppercase text-slate-400">Fase de Resolución</span>
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                        (ticket.porcentaje_tiempo_resolucion ?? 0) <= 100
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {(ticket.porcentaje_tiempo_resolucion ?? 0) <= 100 ? '✓' : '✕'}
                        {' '}{ticket.porcentaje_tiempo_resolucion?.toFixed(1)}%
                        {(ticket.porcentaje_tiempo_resolucion ?? 0) <= 100 ? ' Cumplido' : ' Excedido'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Tiempo transcurrido:{' '}
                      <span className="font-semibold text-slate-700">{formatMinutes(ticket.tiempo_resolucion_transcurrido_minutos)}</span>
                      {ticket.tiempo_resolucion_minutos && (
                        <span className="text-slate-400"> de {formatMinutes(ticket.tiempo_resolucion_minutos)}</span>
                      )}
                    </p>
                  </div>

                  {/* Cierre del Ticket */}
                  {ticket && ticket.estado === 'RESUELTO' && (
                    <div className="bg-white rounded-xl border border-sky-100 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-sky-50 border-b border-sky-100 flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full bg-sky-500 flex-shrink-0" />
                        <h3 className="text-xs font-semibold tracking-widest uppercase text-sky-700">Cierre del Ticket</h3>
                      </div>
                      <div className="divide-y divide-sky-50">
                        <div className="px-4 py-3">
                          <p className="text-xs font-semibold tracking-wide uppercase text-slate-400 mb-1">Diagnóstico</p>
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                            {ticket.diagnostico || ticket.notas_finalizacion || ticket.observaciones_clausura || 'N/A'}
                          </p>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-xs font-semibold tracking-wide uppercase text-slate-400 mb-1">Resolución</p>
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                            {ticket.resolucion || ticket.notas_finalizacion || ticket.observaciones_clausura || 'N/A'}
                          </p>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-xs font-semibold tracking-wide uppercase text-slate-400 mb-1">Recomendación</p>
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                            {ticket.recomendacion || ticket.notas_finalizacion || ticket.observaciones_clausura || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-sky-400 text-base leading-none mt-0.5">⏳</span>
                <p className="text-sm text-sky-800">
                  <span className="font-semibold">Preparando SLA:</span>{' '}
                  Este ticket tiene SLA aplicable pero aún está siendo configurado. Los datos se actualizarán cuando el ticket avance de estado.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
</div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Columna izquierda */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Información General */}
            <div className="bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-sky-500 flex items-center gap-2">
                <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <h2 className="text-sm font-bold text-white tracking-wide uppercase">Información General</h2>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-blue-500 uppercase tracking-wider">Empresa</label>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{ticket.empresa_nombre || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-blue-500 uppercase tracking-wider">Sede</label>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{ticket.sede_nombre || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-blue-500 uppercase tracking-wider">Título</label>
                  <p className="text-base font-bold text-blue-900 mt-1">{ticket.titulo || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-blue-500 uppercase tracking-wider">Descripción</label>
                  <p className="text-sm font-medium text-slate-700 mt-2 bg-blue-50 rounded-xl p-4 border border-blue-100 leading-relaxed">
                    {ticket.descripcion || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Clasificación */}
            <div className="bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-sky-500 to-cyan-500 flex items-center gap-2">
                <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
                <h2 className="text-sm font-bold text-white tracking-wide uppercase">Clasificación</h2>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-sky-500 uppercase tracking-wider">Tipo de Soporte</label>
                  <p className="text-sm font-semibold text-slate-800 mt-1 capitalize">
                    {ticket.tipo_soporte === 'gestion-ti' ? 'Gestión TI' : ticket.tipo_soporte || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-sky-500 uppercase tracking-wider">Tipo de Servicio</label>
                  <p className="text-sm font-semibold text-slate-800 mt-1 capitalize">{ticket.tipo_servicio || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-sky-500 uppercase tracking-wider">Categoría</label>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{ticket.categoria_nombre || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-sky-500 uppercase tracking-wider">Subcategoría</label>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{ticket.subcategoria_nombre || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-sky-500 uppercase tracking-wider">Servicio</label>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{ticket.servicio_nombre || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Priorización */}
            <div className="bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-blue-500 flex items-center gap-2">
                <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/></svg>
                <h2 className="text-sm font-bold text-white tracking-wide uppercase">Priorización ITIL</h2>
              </div>
              <div className="p-6 grid grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <label className="text-xs font-bold text-blue-500 uppercase tracking-wider block mb-1">Impacto</label>
                  <p className="text-sm font-bold text-blue-900">{ticket.impacto || 'N/A'}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <label className="text-xs font-bold text-blue-500 uppercase tracking-wider block mb-1">Urgencia</label>
                  <p className="text-sm font-bold text-blue-900">{ticket.urgencia || 'N/A'}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <label className="text-xs font-bold text-blue-500 uppercase tracking-wider block mb-2">Prioridad</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs ${getPrioridadColor(ticket.prioridad)}`}>
                    {ticket.prioridad}
                  </span>
                </div>
              </div>
            </div>

            {/* Activos */}
            {ticket.activos && ticket.activos.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-cyan-600 to-sky-500 flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2"/></svg>
                  <h2 className="text-sm font-bold text-white tracking-wide uppercase">Activos Asociados</h2>
                  <span className="ml-auto bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{ticket.activos.length}</span>
                </div>
                <div className="p-5">
                  <div className="space-y-3">
                    {ticket.activos.map((activo: any, index: number) => {
                      const getFirst = (...vals: any[]) => {
                        for (const v of vals) {
                          if (v === null || v === undefined) continue;
                          try { const s = String(v).trim(); if (s) return s; } catch (e) {}
                        }
                        return '';
                      };

                      const assetDetail = (() => {
                        const key = String(activo.activo_id ?? activo.activoId ?? activo.id ?? '');
                        return assetMap && key && assetMap[key] ? assetMap[key] : null;
                      })();

                      const code = getFirst(
                        activo.codigo_acceso_remoto, activo.codigoAccesoRemoto, activo.anydesk, activo.any_desk, activo.anyDesk,
                        activo.activo?.codigo_acceso_remoto, activo.propiedades?.codigo_acceso_remoto, activo.detalles?.codigo_acceso_remoto,
                        assetDetail?.codigo_acceso_remoto, assetDetail?.codigoAccesoRemoto, assetDetail?.anydesk, assetDetail?.any_desk, assetDetail?.anyDesk
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
                          showErrorToast('No se pudo copiar al portapapeles');
                        }
                      };

                      return (
                        <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center shrink-0 shadow">
                            <span className="text-white font-bold text-sm">{avatarInitial}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-blue-900 truncate">{activo.activo_nombre || activo.nombre || 'Activo'}</p>
                                <p className="text-xs font-mono text-blue-500 truncate">{activo.activo_codigo || activo.codigo}</p>
                                <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:gap-4 text-sm">
                                  {usuario && (
                                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A10 10 0 1118.88 6.196 10 10 0 015.12 17.804zM15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                      <span className="truncate">{usuario}</span>
                                    </div>
                                  )}
                                  {telefono && (
                                    <a href={`tel:${telefono}`} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2.18a2 2 0 011.72.894l1.24 1.86a2 2 0 01-.45 2.48l-1.27 1.08a11.03 11.03 0 005.516 5.516l1.08-1.27a2 2 0 012.48-.45l1.86 1.24A2 2 0 0121 18.82V21a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"/></svg>
                                      <span>{telefono}</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                              <div className="shrink-0">
                                {code ? (
                                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-blue-200 shadow-sm">
                                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.657 1.343-3 3-3s3 1.343 3 3M6 11c0-3.866 3.582-7 8-7s8 3.134 8 7v3a2 2 0 01-2 2h-1"/></svg>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-xs font-semibold text-blue-500">Acceso Remoto</div>
                                      <div className="text-sm font-bold font-mono text-blue-900">{code}</div>
                                    </div>
                                    <button onClick={() => handleCopy(code, 'Código')} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-bold flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                                      Copiar
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">Sin código de acceso</span>
                                )}
                              </div>
                            </div>
                            {activo.activo_tipo && (
                              <div className="mt-2 text-xs font-medium text-blue-500">{activo.activo_tipo}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Usuarios Afectados */}
            {ticket.usuarios_reporta && ticket.usuarios_reporta.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-sky-600 to-blue-500 flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  <h2 className="text-sm font-bold text-white tracking-wide uppercase">Usuarios Afectados</h2>
                  <span className="ml-auto bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{ticket.usuarios_reporta.length}</span>
                </div>
                <div className="p-5">
                  <div className="space-y-3">
                    {ticket.usuarios_reporta.map((usuario: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shrink-0">
                          <span className="text-white font-bold text-sm">
                            {(usuario.usuario_nombre || usuario.nombre)?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-blue-900">{usuario.usuario_nombre || usuario.nombre}</p>
                          {(usuario.usuario_correo || usuario.email) && (
                            <p className="text-xs font-medium text-blue-500">{usuario.usuario_correo || usuario.email}</p>
                          )}
                          {usuario.usuario_dni && (
                            <p className="text-xs font-medium text-slate-500">DNI: {usuario.usuario_dni}</p>
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
              <div className="bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                  <h2 className="text-sm font-bold text-white tracking-wide uppercase">Adjuntos</h2>
                  <span className="ml-auto bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{ticket.adjuntos.length}</span>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      <div key={index} className="group relative bg-blue-50 rounded-xl border border-blue-100 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all">
                        {isImage ? (
                          <>
                            <div className="aspect-video bg-blue-100 cursor-pointer relative overflow-hidden" onClick={() => setImagenPreview(src)}>
                              <img src={src} alt={fileName} className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23dbeafe" width="100" height="100"/%3E%3Ctext fill="%2393c5fd" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em"%3EImagen%3C/text%3E%3C/svg%3E'; }} />
                              <div className="absolute inset-0 bg-blue-900 bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                                <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                              </div>
                            </div>
                            <div className="p-3">
                              <p className="text-sm font-bold text-blue-900 truncate mb-2">{fileName}</p>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setImagenPreview(src)} className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                  Ver
                                </button>
                                <a href={href} download={fileName} className="flex-1 px-3 py-1.5 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                  Descargar
                                </a>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="p-4 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-blue-900 truncate">{fileName}</p>
                              <p className="text-xs font-semibold text-blue-400 uppercase">{extension || 'archivo'}</p>
                            </div>
                            <a href={href} download={fileName} className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
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
          <div className="space-y-5">

            {/* Base de Conocimiento */}
            {ticket.estado === 'EN_PROCESO' && ticket.tecnico_asignado && user && ticket.tecnico_asignado.id === user.id && (
              <TicketKnowledgePanel
                selectedEntry={selectedKbEntry}
                onEntrySelected={setSelectedKbEntry}
              />
            )}
            
            {/* Asignación */}
            <div className="bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-sky-500 flex items-center gap-2">
                <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">Asignación y Seguimiento</h3>
              </div>
              <div className="p-5 space-y-5">
                {ticket.modalidad_servicio && (
                  <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <label className="text-xs font-bold text-blue-500 uppercase tracking-wider">Modalidad de Servicio</label>
                    <p className="text-sm font-bold text-blue-900 mt-1">{ticket.modalidad_servicio}</p>
                  </div>
                )}

                {/* Técnico Asignado */}
                <div>
                  <label className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2 block">Técnico Asignado</label>
                  {ticket.tecnico_asignado ? (
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl border border-blue-200">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center shrink-0 shadow">
                        <span className="text-white font-bold">
                          {ticket.tecnico_asignado.nombre?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-blue-900 truncate">{ticket.tecnico_asignado.nombre}</p>
                        {ticket.tecnico_asignado.email && (
                          <p className="text-xs font-medium text-blue-500 truncate">{ticket.tecnico_asignado.email}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center">
                      <p className="text-sm font-medium text-slate-400">Sin asignar</p>
                    </div>
                  )}
                </div>

                {/* Creado Por */}
                {ticket.creado_por && (
                  <div>
                    <label className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2 block">Creado Por</label>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-9 h-9 rounded-full bg-slate-300 flex items-center justify-center shrink-0">
                        <span className="text-slate-700 font-bold text-xs">
                          {ticket.creado_por.nombre?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-700 truncate">{ticket.creado_por.nombre}</p>
                    </div>
                  </div>
                )}

                {/* Configuración */}
                {(ticket.configurado_por || ticket.configurado_at) && (
                  <div>
                    <label className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2 block">Configuración</label>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                      {ticket.configurado_por && (
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center shrink-0">
                            <span className="text-blue-800 font-bold text-xs">
                              {ticket.configurado_por.nombre?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-blue-900 truncate">{ticket.configurado_por.nombre}</p>
                            {ticket.configurado_at && (
                              <p className="text-xs font-medium text-blue-500">{new Date(ticket.configurado_at).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {!ticket.configurado_por && ticket.configurado_at && (
                        <p className="text-sm font-medium text-blue-700">{new Date(ticket.configurado_at).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Chat interno */}
                <div className="border-t border-blue-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-blue-500 uppercase tracking-wider">Chat con el usuario</label>
                    {ticket.estado === 'EN_TRIAGE' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        Chat Activo
                      </span>
                    )}
                    {ticket.estado === 'EN_PROCESO' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        Chat Activo
                      </span>
                    )}
                    {['ESPERA', 'ABIERTO'].includes(ticket.estado) && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        🔒 Deshabilitado
                      </span>
                    )}
                    {['RESUELTO', 'CERRADO', 'CANCELADO'].includes(ticket.estado) && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        🔒 Cerrado
                      </span>
                    )}
                  </div>

                  {/* Área de mensajes */}
                  <div className="bg-gradient-to-b from-blue-50 to-sky-50 rounded-xl border border-blue-100 overflow-hidden">
                    <div ref={chatContainerRef} className="h-[56vh] overflow-y-auto flex flex-col gap-3 p-3">
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
                              <div className="bg-white/80 text-slate-600 px-3 py-2 rounded-lg text-xs max-w-prose text-center border border-blue-100 font-medium shadow-sm">
                                {m.mensaje}
                                <div className="text-xs text-slate-400 mt-1">{new Date(m.created_at).toLocaleString()}</div>
                              </div>
                            </div>
                          );
                        }

                        const isRight = isCliente;
                        return (
                          <div key={idx} className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex items-end gap-2 max-w-[82%] ${isRight ? 'flex-row-reverse' : 'flex-row'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow ${isRight ? 'bg-sky-100 text-sky-800' : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'}`}>
                                {initial}
                              </div>
                              <div className="flex flex-col">
                                <div className="text-xs font-bold text-slate-600 mb-1 px-1">{displayName}</div>
                                <div className={`px-3 py-2 rounded-2xl text-sm font-medium shadow-sm ${isTecnico ? 'bg-gradient-to-br from-blue-600 to-sky-500 text-white rounded-bl-sm' : 'bg-white border border-sky-200 text-slate-800 rounded-br-sm'}`}>
                                  {m.mensaje}
                                </div>
                                <div className="text-xs text-slate-400 mt-1 px-1">{new Date(m.created_at).toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Input del chat */}
                    <div className="p-3 bg-white border-t border-blue-100">
                      {(() => {
                        const estadoNormalizado = normalizeEstadoLocal(ticket.estado as any);
                        const chatHabilitado = estadoNormalizado === 'EN TRIAGE' || estadoNormalizado === 'EN PROCESO';
                        const isCreator = !!(user && ticket.creado_por && user.id === ticket.creado_por.id);
                        const isAssignedTech = !!(user && ticket.tecnico_asignado_id != null && user.id === ticket.tecnico_asignado_id);
                        const isAdmin = user?.rol && user.rol.toLowerCase().includes('admin');
                        const canSend = chatHabilitado && (isAssignedTech || isCreator || isAdmin) && !chatDisabled;

                        const getPlaceholder = () => {
                          if (chatDisabledMessage) return chatDisabledMessage;
                          switch (ticket.estado) {
                            case 'ESPERA': return 'Chat disponible cuando el técnico inicie triaje...';
                            case 'EN_TRIAGE': return canSend ? (isAssignedTech ? 'Solicitar información del incidente...' : 'Escribe para proporcionar información...') : 'Sin permisos para enviar mensajes';
                            case 'ABIERTO': return 'Chat no disponible en este momento...';
                            case 'EN_PROCESO': return canSend ? (isAssignedTech ? 'Escribe al usuario...' : 'Escribe al técnico...') : 'Sin permisos para enviar mensajes';
                            case 'RESUELTO': case 'CERRADO': case 'CANCELADO': return 'Este ticket ya no acepta mensajes.';
                            default: return 'Escribe tu mensaje...';
                          }
                        };

                        return (
                          <>
                            <div className="flex items-center gap-2">
                              <input
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={async (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); await handleSendChat(); } }}
                                disabled={!canSend}
                                placeholder={getPlaceholder()}
                                className="flex-1 px-3 py-2 text-sm font-medium border-2 border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-blue-50 placeholder-slate-400 text-slate-800 disabled:opacity-60 disabled:bg-slate-50"
                              />
                              <button
                                onClick={handleSendChat}
                                disabled={!canSend || !chatInput.trim()}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all font-bold shadow ${canSend && chatInput.trim() ? 'bg-gradient-to-br from-blue-600 to-sky-500 text-white hover:from-blue-700 hover:to-sky-600 shadow-blue-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                              </button>
                            </div>
                            {chatDisabledMessage && (
                              <div className="mt-2 text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">{chatDisabledMessage}</div>
                            )}
                            <p className="text-xs text-slate-400 mt-2 font-medium">Los mensajes se cargan desde el backend. El frontend renderiza según `emisor_tipo`.</p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal culminación remota */}
      {showCulminarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15, 30, 60, 0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-blue-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">Cierre de Ticket</p>
                <h3 className="text-white text-lg font-extrabold tracking-tight">Culminar Ticket</h3>
              </div>
              <button
                onClick={() => setShowCulminarModal(false)}
                disabled={actionLoading}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors border border-white/20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4" style={{ background: 'linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%)' }}>
              <div>
                <label className="text-xs font-bold text-blue-500 uppercase tracking-wider">Diagnóstico</label>
                <textarea
                  value={diagCierre}
                  onChange={(e) => setDiagCierre(e.target.value)}
                  rows={3}
                  className="mt-1 w-full px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 border-2 border-blue-100 rounded-xl bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 resize-none"
                  placeholder="Describe el diagnóstico identificado..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-blue-500 uppercase tracking-wider">Resolución</label>
                <textarea
                  value={resCierre}
                  onChange={(e) => setResCierre(e.target.value)}
                  rows={3}
                  className="mt-1 w-full px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 border-2 border-blue-100 rounded-xl bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 resize-none"
                  placeholder="Describe la resolución aplicada..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-blue-500 uppercase tracking-wider">Recomendación</label>
                <textarea
                  value={recCierre}
                  onChange={(e) => setRecCierre(e.target.value)}
                  rows={3}
                  className="mt-1 w-full px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 border-2 border-blue-100 rounded-xl bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 resize-none"
                  placeholder="Agrega recomendaciones para evitar recurrencia..."
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-white border-t border-blue-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCulminarModal(false)}
                disabled={actionLoading}
                className="px-5 py-2.5 border-2 border-blue-200 text-blue-700 rounded-xl hover:bg-blue-50 hover:border-blue-400 font-bold text-sm transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitCulminarRemoto}
                disabled={actionLoading}
                className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-500 text-white rounded-xl hover:from-teal-700 hover:to-cyan-600 font-bold text-sm transition-all shadow-md shadow-teal-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {actionLoading && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                )}
                {actionLoading ? 'Culminando...' : 'Culminar ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales — sin cambios en lógica */}
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
        onSubmit={async () => { /* no-op */ }}
      />

      <CancelarTicketModal
        isOpen={showCancelarModal}
        onClose={() => setShowCancelarModal(false)}
        onConfirm={handleCancelarTicket}
        ticketCodigo={ticket.codigo_ticket}
      />
      <ConfirmModal
        open={confirmTakeOpen}
        title="¿Estás seguro que deseas tomar este ticket?"
        message="Cambiará a estado EN_PROCESO y comenzará el conteo de tiempo de atención."
        onConfirm={confirmTake}
        onCancel={() => setConfirmTakeOpen(false)}
        loading={actionLoading}
      />

      {showPasarPresencialModal && contratoActivo && (
        <NewVisitaModal
          empresaId={String(ticket.empresa_id)}
          contratoId={String(contratoActivo.id)}
          onClose={() => setShowPasarPresencialModal(false)}
          onVisitaCreada={async (visita: Visita) => {
            setShowPasarPresencialModal(false);
            showSuccessToast('Visita presencial programada exitosamente. El ticket ha cambiado a estado PROGRAMADO.');
            await loadTicketDetail();
          }}
          onError={(error) => showErrorToast(error)}
          prefilledData={{
            sedeId: String(ticket.sede_id),
            tipoVisita: 'POR_TICKET',
            ticketId: String(ticket.id),
            ticketCodigo: ticket.codigo_ticket
          }}
        />
      )}

      {showFinalizarVisitaModal && visitaToFinalizar && (
        <FinalizarVisitaModal
          visita={visitaToFinalizar}
          onClose={() => setShowFinalizarVisitaModal(false)}
          onVisitaFinalizada={async (v: Visita) => {
            setShowFinalizarVisitaModal(false);
            showSuccessToast('Visita finalizada correctamente');
            await loadTicketDetail();
          }}
          onError={(err) => showErrorToast(err)}
          onAbrirModalEditarActivo={async (activo: any) => {
            try {
              const empresaId = activo.empresa_id;
              const sedeId = activo.sede_id;
              if (!empresaId || !sedeId) return;

              const empresaNombre = ticket?.empresa_nombre || '';
              const [sedesRes, areasRes, categoriasRes, gruposRes] = await Promise.all([
                getSedesByEmpresa(String(empresaId)),
                getAreasByEmpresa(String(empresaId)),
                getCategorias(),
                axiosClient.get('/api/gestion-grupos-categorias'),
              ]);
              const sedesArray = Array.isArray(sedesRes) ? sedesRes : ((sedesRes as any)?.data || []);
              const areasArray = Array.isArray(areasRes) ? areasRes : ((areasRes as any)?.data || []);
              const categoriasArray = Array.isArray(categoriasRes) ? categoriasRes : ((categoriasRes as any)?.data || []);
              // Parse groups response
              let gruposData: any = gruposRes.data;
              if (gruposData && typeof gruposData === 'object' && !Array.isArray(gruposData)) {
                if (Array.isArray(gruposData.data)) gruposData = gruposData.data;
                else if (Array.isArray(gruposData.results)) gruposData = gruposData.results;
              }
              const gruposArray = Array.isArray(gruposData)
                ? gruposData.filter((g: any) => g.activo !== false).map((g: any) => ({
                    id: String(g.id ?? g._id ?? g.uuid ?? ''), nombre: g.nombre, codigo: g.codigo,
                  }))
                : [];

              // Find sede matching by _id or id
              const sede = sedesArray.find((s: any) =>
                String(s._id) === String(sedeId) || String(s.id) === String(sedeId)
              );
              const sedeNombre = sede?.nombre || ticket?.sede_nombre || '';

              setEditAssetSedes(sedesArray);
              setEditAssetAreas(areasArray);
              setEditAssetCategories(categoriasArray);
              setEditAssetGroups(gruposArray);

              // Fetch full inventory to find complete asset data
              const inventario = await getInventarioBySede(empresaId, sedeId);
              const activosList = Array.isArray(inventario) ? inventario : (inventario?.data || []);
              const activoCompleto = activosList.find((item: any) =>
                String(item.id) === String(activo.activo_id) ||
                String(item.codigo) === String(activo.activo_codigo) ||
                String(item.assetId) === String(activo.activo_codigo)
              );

              const base = activoCompleto || activo;
              const activoEnriquecido = {
                ...base,
                // Always preserve snake_case IDs from the original activo (ticket context)
                // because activoCompleto from inventory may only have camelCase variants
                empresa_id: activo.empresa_id,
                sede_id: activo.sede_id,
                empresa_nombre: empresaNombre,
                empresaNombre,
                sede_nombre: sedeNombre,
                sedeNombre,
                _areasDisponibles: areasArray,
              };

              editAssetKeyRef.current += 1;
              setEditingAsset(activoEnriquecido);
              setShowEditAssetModal(true);
            } catch (err) {
              console.error('Error al cargar activo para edición:', err);
            }
          }}
        />
      )}

      {showEditAssetModal && editingAsset && (
        <RegisterAssetModal
          key={`edit-asset-${editAssetKeyRef.current}`}
          isOpen={showEditAssetModal}
          onClose={() => { setShowEditAssetModal(false); setEditingAsset(null); }}
          editingAsset={editingAsset}
          empresaId={String(editingAsset.empresa_id || editingAsset.empresaId || '')}
          sedeId={String(editingAsset.sede_id || editingAsset.sedeId || '')}
          empresaNombre={editingAsset.empresaNombre || editingAsset.empresa_nombre}
          sedeNombre={editingAsset.sedeNombre || editingAsset.sede_nombre || ticket?.sede_nombre}
          sedes={editAssetSedes}
          areas={editAssetAreas}
          categories={editAssetCategories}
          groups={editAssetGroups}
          onSuccess={async () => {
            setShowEditAssetModal(false);
            setEditingAsset(null);
            showSuccessToast('Activo actualizado correctamente');
            await loadTicketDetail();
          }}
        />
      )}

      {/* Modal preview imagen */}
      {imagenPreview && (
        <div 
          className="fixed inset-0 bg-blue-950/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setImagenPreview(null)}
        >
          <button
            onClick={() => setImagenPreview(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="max-w-7xl max-h-full flex flex-col items-center gap-4">
            <img 
              src={imagenPreview} 
              alt="Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/20"
              onClick={(e) => e.stopPropagation()}
            />
            <a
              href={imagenPreview}
              download
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-sky-400 text-white rounded-xl hover:from-blue-600 hover:to-sky-500 transition-all flex items-center gap-2 font-bold shadow-lg"
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
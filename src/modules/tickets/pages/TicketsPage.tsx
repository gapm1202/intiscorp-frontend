import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTickets, createTicket, cogerTicket, asignarTecnico } from '../services/ticketsService';
import { getEmpresas } from '@/modules/empresas/services/empresasService';
import { getSedesByEmpresa } from '@/modules/empresas/services/sedesService';
import { getCategorias } from '@/modules/inventario/services/categoriasService';
import { getUsuariosAdministrativos } from '@/modules/auth/services/userService';
import { useAuth } from '@/hooks/useAuth';
import CreateTicketModal from '../components/CreateTicketModal';
import AsignarTecnicoModal from '../components/AsignarTecnicoModal';
import type { Ticket, TicketFilter } from '../types';

const TicketsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [cogiendoTicket, setCogiendoTicket] = useState<number | null>(null);

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Asignar técnico desde la tabla
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [asignarTicketId, setAsignarTicketId] = useState<number | null>(null);
  const [asignarTecnicoActual, setAsignarTecnicoActual] = useState<{ id: number; nombre: string } | null>(null);
  const [asignando, setAsignando] = useState(false);

  // Datos para filtros
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [sedes, setSedesDisponibles] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);

  // Filtros
  const [filters, setFilters] = useState<TicketFilter>({});
  const [showFilters, setShowFilters] = useState(false);

  // Estados disponibles (como arrays de strings)
  const estados = ['ESPERA', 'EN_TRIAGE', 'ABIERTO', 'EN_PROCESO', 'PENDIENTE_CLIENTE', 'RESUELTO', 'CERRADO', 'CANCELADO'];
  const prioridades = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
  const estadosSLA = ['EN_TIEMPO', 'PROXIMO_VENCER', 'VENCIDO', 'NO_APLICA'];
  const tiposTicket = ['SOPORTE', 'INCIDENTE', 'REQUERIMIENTO', 'CONSULTA'];

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
    const onAssigned = () => {
      loadTickets();
    };
    window.addEventListener('ticketAssigned', onAssigned as EventListener);
    return () => window.removeEventListener('ticketAssigned', onAssigned as EventListener);
  }, []);

  useEffect(() => {
    loadTickets();
  }, [filters, page]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        loadTickets();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [loading, filters, page]);

  useEffect(() => {
    if (filters.empresaId) {
      loadSedes(filters.empresaId);
    } else {
      setSedesDisponibles([]);
      setFilters(prev => ({ ...prev, sedeId: undefined }));
    }
  }, [filters.empresaId]);

  const loadInitialData = async () => {
    try {
      const [empData, catData, tecData] = await Promise.all([
        getEmpresas(),
        getCategorias(),
        getUsuariosAdministrativos()
      ]);
      setEmpresas(empData);
      setCategorias(catData);
      setTecnicos(tecData.filter((u: any) => u.rol === 'tecnico' || u.rol === 'administrador'));
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    }
  };

  const loadSedes = async (empresaId: number) => {
    try {
      const sedesData = await getSedesByEmpresa(empresaId);
      setSedesDisponibles(sedesData);
    } catch (error) {
      console.error('Error cargando sedes:', error);
    }
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      const response = await getTickets(filters, page, pageSize);
      setTickets(response.tickets || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error cargando tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCogerTicket = async (ticketId: number) => {
    if (!confirm('¿Estás seguro de que deseas coger este ticket? Se te asignará automáticamente y cambiará a estado EN PROCESO.')) {
      return;
    }
    try {
      setCogiendoTicket(ticketId);
      await cogerTicket(ticketId);
      await loadTickets();
      alert('✅ Ticket tomado correctamente. Ahora está asignado a ti y EN PROCESO.');
    } catch (error: any) {
      console.error('Error cogiendo ticket:', error);
      alert(error.response?.data?.message || '❌ Error al tomar el ticket');
    } finally {
      setCogiendoTicket(null);
    }
  };

  const openAsignarModal = (ticket: Ticket) => {
    setAsignarTicketId(ticket.id);
    setAsignarTecnicoActual(ticket.tecnico_asignado ? { id: ticket.tecnico_asignado.id, nombre: ticket.tecnico_asignado.nombre } : null);
    setShowAsignarModal(true);
  };

  const showSuccessToast = (message: string) => { alert(message); };
  const showErrorToast = (message: string) => { alert(message); };

  const handleAsignarTecnico = async (tecnicoId: number) => {
    if (!asignarTicketId) return;
    try {
      setAsignando(true);
      await asignarTecnico(asignarTicketId, tecnicoId);
      setShowAsignarModal(false);
      await loadTickets();
      showSuccessToast('Técnico asignado correctamente');
    } catch (error: any) {
      console.error('Error al asignar técnico:', error);
      showErrorToast(error?.response?.data?.message || 'Error al asignar técnico');
    } finally {
      setAsignando(false);
    }
  };

  const handleFilterChange = (key: keyof TicketFilter, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const activeFilterCount = Object.keys(filters).filter(k => filters[k as keyof TicketFilter] !== undefined).length;

  const getEstadoBadgeClass = (estado: string): string => {
    const classes: Record<string, string> = {
      ESPERA:            'bg-amber-100 text-amber-800 border border-amber-300',
      EN_TRIAGE:         'bg-blue-100 text-blue-800 border border-blue-300',
      ABIERTO:           'bg-emerald-100 text-emerald-800 border border-emerald-300',
      EN_PROCESO:        'bg-sky-100 text-sky-800 border border-sky-300',
      PENDIENTE_CLIENTE: 'bg-orange-100 text-orange-800 border border-orange-300',
      RESUELTO:          'bg-teal-100 text-teal-800 border border-teal-300',
      CERRADO:           'bg-slate-100 text-slate-700 border border-slate-300',
      CANCELADO:         'bg-red-100 text-red-800 border border-red-300',
    };
    return classes[estado] || 'bg-slate-100 text-slate-700 border border-slate-300';
  };

  const getPrioridadBadgeClass = (prioridad: string): string => {
    const classes: Record<string, string> = {
      BAJA:   'bg-slate-100 text-slate-700 border border-slate-300',
      MEDIA:  'bg-blue-100 text-blue-800 border border-blue-300',
      ALTA:   'bg-orange-100 text-orange-800 border border-orange-300',
      CRITICA:'bg-rose-100 text-rose-800 border border-rose-300',
    };
    return classes[prioridad] || 'bg-slate-100 text-slate-700';
  };

  const getSLABadgeClass = (estadoSLA: string): string => {
    const classes: Record<string, string> = {
      EN_TIEMPO:      'bg-emerald-100 text-emerald-800 border border-emerald-300',
      PROXIMO_VENCER: 'bg-amber-100 text-amber-800 border border-amber-300',
      VENCIDO:        'bg-rose-100 text-rose-800 border border-rose-300',
      NO_APLICA:      'bg-slate-100 text-slate-500 border border-slate-200',
    };
    return classes[estadoSLA] || 'bg-slate-100 text-slate-500';
  };

  const getSLALabel = (estadoSLA: string): string => {
    const labels: Record<string, string> = {
      EN_TIEMPO:      'En tiempo',
      PROXIMO_VENCER: 'Próx. a vencer',
      VENCIDO:        'Vencido',
      NO_APLICA:      'N/A',
    };
    return labels[estadoSLA] || estadoSLA;
  };

  const getSLAColorClass = (pct?: number, paused?: boolean) => {
    if (paused) return 'bg-slate-400';
    const raw = typeof pct === 'number' ? pct : 0;
    if (raw < 70)  return 'bg-emerald-500';
    if (raw < 90)  return 'bg-amber-500';
    if (raw < 100) return 'bg-orange-500';
    return 'bg-rose-600';
  };

  const totalPages = Math.ceil(total / pageSize);

  const inputClass =
    'w-full px-3 py-2 text-sm font-medium border-2 border-blue-100 rounded-xl bg-blue-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50';

  const labelClass = 'block text-xs font-bold text-blue-600 uppercase tracking-wider mb-1.5';

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 50%, #f0f9ff 100%)' }}>
      <div className="p-6 max-w-screen-2xl mx-auto">

        {/* ── PAGE HEADER ── */}
        <div className="mb-6">
          <div className="bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-sky-400 to-cyan-400" />
            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-blue-900 tracking-tight">Tickets de Soporte</h1>
                <p className="text-sm font-medium text-slate-500 mt-0.5">Gestión centralizada de tickets y servicios</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-xl hover:from-blue-700 hover:to-sky-600 transition-all font-bold text-sm shadow-md shadow-blue-200 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Ticket
              </button>
            </div>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Total Tickets',
              value: total,
              icon: (
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              ),
              valueClass: 'text-blue-900',
              bg: 'from-blue-50 to-sky-50 border-blue-200',
            },
            {
              label: 'Abiertos',
              value: tickets.filter(t => t.estado === 'ABIERTO').length,
              icon: (
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              ),
              valueClass: 'text-emerald-700',
              bg: 'from-emerald-50 to-teal-50 border-emerald-200',
            },
            {
              label: 'En Proceso',
              value: tickets.filter(t => t.estado === 'EN_PROCESO').length,
              icon: (
                <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              ),
              valueClass: 'text-sky-700',
              bg: 'from-sky-50 to-blue-50 border-sky-200',
            },
            {
              label: 'SLA Vencido',
              value: tickets.filter(t => t.estadoSLA === 'VENCIDO').length,
              icon: (
                <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              ),
              valueClass: 'text-rose-700',
              bg: 'from-rose-50 to-red-50 border-rose-200',
            },
          ].map((stat, i) => (
            <div key={i} className={`bg-gradient-to-br ${stat.bg} border rounded-2xl p-4 shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center shadow-sm">
                  {stat.icon}
                </div>
              </div>
              <div className={`text-3xl font-extrabold ${stat.valueClass}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* ── FILTER TOGGLE BAR ── */}
        <div className="mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
              showFilters
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                : 'bg-white text-blue-700 border-blue-200 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {showFilters ? 'Ocultar Filtros' : 'Filtros'}
            {activeFilterCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${showFilters ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'}`}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ── FILTER PANEL ── */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden mb-5">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-sky-500 flex items-center gap-2">
              <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">Filtros de búsqueda</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Búsqueda */}
              <div className="lg:col-span-2">
                <label className={labelClass}>Búsqueda</label>
                <input
                  type="text"
                  placeholder="Buscar por código, título..."
                  value={filters.busqueda || ''}
                  onChange={(e) => handleFilterChange('busqueda', e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Empresa */}
              <div>
                <label className={labelClass}>Empresa</label>
                <select
                  value={filters.empresaId || ''}
                  onChange={(e) => handleFilterChange('empresaId', e.target.value ? Number(e.target.value) : undefined)}
                  className={inputClass}
                >
                  <option value="">Todas las empresas</option>
                  {empresas.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Sede */}
              <div>
                <label className={labelClass}>Sede</label>
                <select
                  value={filters.sedeId || ''}
                  onChange={(e) => handleFilterChange('sedeId', e.target.value ? Number(e.target.value) : undefined)}
                  disabled={!filters.empresaId}
                  className={inputClass}
                >
                  <option value="">Todas las sedes</option>
                  {sedes.map(sede => (
                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Estado */}
              <div>
                <label className={labelClass}>Estado</label>
                <select
                  value={filters.estado || ''}
                  onChange={(e) => handleFilterChange('estado', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Todos los estados</option>
                  {estados.map(estado => (
                    <option key={estado} value={estado}>{estado.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Prioridad */}
              <div>
                <label className={labelClass}>Prioridad</label>
                <select
                  value={filters.prioridad || ''}
                  onChange={(e) => handleFilterChange('prioridad', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Todas las prioridades</option>
                  {prioridades.map(prioridad => (
                    <option key={prioridad} value={prioridad}>{prioridad}</option>
                  ))}
                </select>
              </div>

              {/* Tipo */}
              <div>
                <label className={labelClass}>Tipo de Ticket</label>
                <select
                  value={filters.tipoTicket || ''}
                  onChange={(e) => handleFilterChange('tipoTicket', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Todos los tipos</option>
                  {tiposTicket.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>

              {/* Categoría */}
              <div>
                <label className={labelClass}>Categoría</label>
                <select
                  value={filters.categoriaId || ''}
                  onChange={(e) => handleFilterChange('categoriaId', e.target.value ? Number(e.target.value) : undefined)}
                  className={inputClass}
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Estado SLA */}
              <div>
                <label className={labelClass}>Estado SLA</label>
                <select
                  value={filters.estadoSLA || ''}
                  onChange={(e) => handleFilterChange('estadoSLA', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Todos</option>
                  {estadosSLA.map(sla => (
                    <option key={sla} value={sla}>{getSLALabel(sla)}</option>
                  ))}
                </select>
              </div>

              {/* Técnico */}
              <div>
                <label className={labelClass}>Técnico Asignado</label>
                <select
                  value={filters.tecnicoId || ''}
                  onChange={(e) => handleFilterChange('tecnicoId', e.target.value ? Number(e.target.value) : undefined)}
                  className={inputClass}
                >
                  <option value="">Todos los técnicos</option>
                  {tecnicos.map(tec => (
                    <option key={tec.id} value={tec.id}>{tec.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Fecha Desde */}
              <div>
                <label className={labelClass}>Desde</label>
                <input
                  type="date"
                  value={filters.fechaDesde || ''}
                  onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Fecha Hasta */}
              <div>
                <label className={labelClass}>Hasta</label>
                <input
                  type="date"
                  value={filters.fechaHasta || ''}
                  onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="px-6 pb-5 flex items-center gap-3">
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                Limpiar filtros
              </button>
              {activeFilterCount > 0 && (
                <span className="text-xs font-semibold text-blue-600">{activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} activo{activeFilterCount > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        )}

        {/* ── TICKETS TABLE ── */}
        <div className="bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden">

          {/* Table header strip */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-sky-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">Lista de Tickets</h2>
            </div>
            <span className="text-xs font-bold text-white/80 bg-white/20 px-3 py-1 rounded-full">
              {total} resultado{total !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-t-blue-600"></div>
              <p className="text-sm font-semibold text-blue-600">Cargando tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-blue-900 mb-1">Sin resultados</h3>
              <p className="text-sm font-medium text-slate-500">Ajusta los filtros o crea un nuevo ticket.</p>
            </div>
          ) : (
            <>
              {/* ── MOBILE CARDS ── */}
              <div className="md:hidden divide-y divide-blue-50">
                {tickets.map(ticket => (
                  <div key={ticket.id} className="p-4 hover:bg-blue-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="text-sm font-bold text-blue-900">{ticket.codigo_ticket}</span>
                        <span className="ml-2 text-xs font-medium text-slate-400">{ticket.tipo_ticket}</span>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5 leading-snug">{ticket.titulo}</p>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">{ticket.empresa_nombre}{ticket.sede_nombre ? ` · ${ticket.sede_nombre}` : ''}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-1 text-xs font-bold rounded-full ${getEstadoBadgeClass(ticket.estado)}`}>
                        {ticket.estado.replace('_', ' ')}
                      </span>
                    </div>

                    {/* SLA mini bar */}
                    {ticket.fase_sla_actual === 'RESPUESTA' && (
                      <div className="mb-3">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-semibold text-blue-600">Respuesta</span>
                          <span className="text-xs font-bold text-slate-700">{typeof ticket.porcentaje_tiempo_respuesta === 'number' ? `${ticket.porcentaje_tiempo_respuesta.toFixed(1)}%` : 'N/A'}</span>
                        </div>
                        <div className="relative w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                          <div className={`absolute inset-y-0 left-0 rounded-full ${getSLAColorClass(ticket.porcentaje_tiempo_respuesta, ticket.pausado)}`} style={{ width: `${Math.max(0, Math.min(100, ticket.porcentaje_tiempo_respuesta ?? 0))}%` }} />
                        </div>
                      </div>
                    )}
                    {ticket.fase_sla_actual === 'RESOLUCION' && (
                      <div className="mb-3">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-semibold text-blue-600">Resolución</span>
                          <span className="text-xs font-bold text-slate-700">{typeof ticket.porcentaje_tiempo_resolucion === 'number' ? `${ticket.porcentaje_tiempo_resolucion.toFixed(1)}%` : 'N/A'}</span>
                        </div>
                        <div className="relative w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                          <div className={`absolute inset-y-0 left-0 rounded-full ${getSLAColorClass(ticket.porcentaje_tiempo_resolucion, ticket.pausado)}`} style={{ width: `${Math.max(0, Math.min(100, ticket.porcentaje_tiempo_resolucion ?? 0))}%` }} />
                        </div>
                      </div>
                    )}
                    {ticket.fase_sla_actual === 'COMPLETADO' && (
                      <p className="text-xs font-bold text-emerald-700 mb-3">✓ SLA Completado</p>
                    )}

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getPrioridadBadgeClass(ticket.prioridad)}`}>{ticket.prioridad}</span>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getSLABadgeClass(ticket.estado_sla)}`}>{getSLALabel(ticket.estado_sla)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {(Object.prototype.hasOwnProperty.call(ticket, 'tecnico_asignado_id') && ticket.tecnico_asignado_id === null) && ticket.estado === 'ABIERTO' && (
                          <button onClick={() => handleCogerTicket(ticket.id)} disabled={cogiendoTicket === ticket.id}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                            {cogiendoTicket === ticket.id ? 'Tomando...' : 'Coger ticket'}
                          </button>
                        )}
                        {!ticket.tecnico_asignado && !ticket.tecnico_asignado_id && (
                          <button onClick={() => openAsignarModal(ticket)}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            Asignar
                          </button>
                        )}
                        <button onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors">
                          Ver detalle
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── DESKTOP TABLE ── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-blue-50 border-b-2 border-blue-100">
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Código</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Título / Categoría</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Empresa / Sede</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Estado & SLA</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Prioridad</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">SLA</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Técnico</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Fecha</th>
                      <th className="px-5 py-3.5 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-50">
                    {tickets.map((ticket, idx) => (
                      <tr
                        key={ticket.id}
                        className={`group transition-colors hover:bg-blue-50/60 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                      >
                        {/* Código */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-blue-900">{ticket.codigo_ticket}</div>
                          <div className="text-xs font-medium text-slate-400 mt-0.5">{ticket.tipo_ticket}</div>
                        </td>

                        {/* Título */}
                        <td className="px-5 py-4 max-w-[220px]">
                          <div className="text-sm font-semibold text-slate-800 truncate">{ticket.titulo}</div>
                          {ticket.categoria_nombre && (
                            <div className="text-xs font-medium text-slate-400 mt-0.5 truncate">{ticket.categoria_nombre}</div>
                          )}
                        </td>

                        {/* Empresa */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-slate-800">{ticket.empresa_nombre}</div>
                          {ticket.sede_nombre && (
                            <div className="text-xs font-medium text-slate-400 mt-0.5">{ticket.sede_nombre}</div>
                          )}
                        </td>

                        {/* Estado + SLA bar */}
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-full ${getEstadoBadgeClass(ticket.estado)}`}>
                            {ticket.estado.replace('_', ' ')}
                          </span>
                          {ticket.fase_sla_actual === 'RESPUESTA' && (
                            <div className="mt-2 w-36">
                              <div className="flex justify-between mb-1">
                                <span className="text-[10px] font-semibold text-blue-600">Respuesta</span>
                                <span className="text-[10px] font-bold text-slate-700">{typeof ticket.porcentaje_tiempo_respuesta === 'number' ? `${ticket.porcentaje_tiempo_respuesta.toFixed(1)}%` : 'N/A'}</span>
                              </div>
                              <div className="relative w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                                <div className={`absolute inset-y-0 left-0 rounded-full ${getSLAColorClass(ticket.porcentaje_tiempo_respuesta, ticket.pausado)}`} style={{ width: `${Math.max(0, Math.min(100, ticket.porcentaje_tiempo_respuesta ?? 0))}%` }} />
                              </div>
                            </div>
                          )}
                          {ticket.fase_sla_actual === 'RESOLUCION' && (
                            <div className="mt-2 w-36">
                              <div className="flex justify-between mb-1">
                                <span className="text-[10px] font-semibold text-blue-600">Resolución</span>
                                <span className="text-[10px] font-bold text-slate-700">{typeof ticket.porcentaje_tiempo_resolucion === 'number' ? `${ticket.porcentaje_tiempo_resolucion.toFixed(1)}%` : 'N/A'}</span>
                              </div>
                              <div className="relative w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                                <div className={`absolute inset-y-0 left-0 rounded-full ${getSLAColorClass(ticket.porcentaje_tiempo_resolucion, ticket.pausado)}`} style={{ width: `${Math.max(0, Math.min(100, ticket.porcentaje_tiempo_resolucion ?? 0))}%` }} />
                              </div>
                            </div>
                          )}
                          {ticket.fase_sla_actual === 'COMPLETADO' && (
                            <div className="mt-2 text-[10px] font-bold text-emerald-700">✓ Completado</div>
                          )}
                        </td>

                        {/* Prioridad */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getPrioridadBadgeClass(ticket.prioridad)}`}>
                            {ticket.prioridad}
                          </span>
                        </td>

                        {/* SLA badge */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getSLABadgeClass(ticket.estado_sla)}`}>
                            {getSLALabel(ticket.estado_sla)}
                          </span>
                        </td>

                        {/* Técnico */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {ticket.tecnico_asignado?.nombre ? (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center shrink-0">
                                <span className="text-white text-xs font-bold">{ticket.tecnico_asignado.nombre.charAt(0).toUpperCase()}</span>
                              </div>
                              <span className="text-sm font-semibold text-slate-700">{ticket.tecnico_asignado.nombre}</span>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400 italic">Sin asignar</span>
                          )}
                        </td>

                        {/* Fecha */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-slate-600">
                            {new Date(ticket.fecha_creacion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(Object.prototype.hasOwnProperty.call(ticket, 'tecnico_asignado_id') && ticket.tecnico_asignado_id === null) && ticket.estado === 'ABIERTO' && (
                              <button
                                onClick={() => handleCogerTicket(ticket.id)}
                                disabled={cogiendoTicket === ticket.id}
                                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                {cogiendoTicket === ticket.id ? (
                                  <>
                                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                    </svg>
                                    Tomando...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Coger ticket
                                  </>
                                )}
                              </button>
                            )}

                            {!ticket.tecnico_asignado && !ticket.tecnico_asignado_id && (
                              <button
                                onClick={() => openAsignarModal(ticket)}
                                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                Asignar
                              </button>
                            )}

                            <button
                              onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Ver detalle
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── PAGINATION ── */}
              {totalPages > 1 && (
                <div className="bg-blue-50/50 border-t border-blue-100 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-600">
                    Mostrando <span className="font-bold text-blue-800">{(page - 1) * pageSize + 1}</span>–<span className="font-bold text-blue-800">{Math.min(page * pageSize, total)}</span> de <span className="font-bold text-blue-800">{total}</span> resultados
                  </p>
                  <nav className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-9 h-9 flex items-center justify-center rounded-xl border-2 border-blue-200 bg-white text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (page <= 3) pageNum = i + 1;
                      else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = page - 2 + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all border-2 ${
                            page === pageNum
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                              : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50 hover:border-blue-400'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="w-9 h-9 flex items-center justify-center rounded-xl border-2 border-blue-200 bg-white text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    </button>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── MODALES ── */}
      <AsignarTecnicoModal
        isOpen={showAsignarModal}
        onClose={() => setShowAsignarModal(false)}
        onConfirm={handleAsignarTecnico}
        ticketId={asignarTicketId ?? 0}
        tecnicoActual={asignarTecnicoActual}
      />
      <CreateTicketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={async (ticketData) => {
          await createTicket(ticketData);
          await loadTickets();
        }}
      />
    </div>
  );
};

export default TicketsPage;
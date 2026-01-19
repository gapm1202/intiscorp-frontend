import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTickets, createTicket, cogerTicket } from '../services/ticketsService';
import { getEmpresas } from '@/modules/empresas/services/empresasService';
import { getSedesByEmpresa } from '@/modules/empresas/services/sedesService';
import { getCategorias } from '@/modules/inventario/services/categoriasService';
import { getUsuariosAdministrativos } from '@/modules/auth/services/userService';
import { useAuth } from '@/hooks/useAuth';
import CreateTicketModal from '../components/CreateTicketModal';
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

  // Datos para filtros
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [sedes, setSedesDisponibles] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);

  // Filtros
  const [filters, setFilters] = useState<TicketFilter>({});
  const [showFilters, setShowFilters] = useState(false);

  // Estados disponibles (como arrays de strings)
  const estados = ['ABIERTO', 'EN_PROCESO', 'PENDIENTE_CLIENTE', 'RESUELTO', 'CERRADO', 'CANCELADO'];
  const prioridades = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
  const estadosSLA = ['EN_TIEMPO', 'PROXIMO_VENCER', 'VENCIDO', 'NO_APLICA'];
  const tiposTicket = ['SOPORTE', 'INCIDENTE', 'REQUERIMIENTO', 'CONSULTA'];

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);

  // Cargar tickets cuando cambian filtros o página
  useEffect(() => {
    loadTickets();
  }, [filters, page]);

  // Cargar sedes cuando cambia empresa seleccionada
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
    // Mostrar confirmación antes de coger el ticket
    if (!confirm('¿Estás seguro de que deseas coger este ticket? Se te asignará automáticamente y cambiará a estado EN PROCESO.')) {
      return;
    }

    try {
      setCogiendoTicket(ticketId);
      await cogerTicket(ticketId);
      // Recargar tickets para mostrar el cambio
      await loadTickets();
      alert('✅ Ticket tomado correctamente. Ahora está asignado a ti y EN PROCESO.');
    } catch (error: any) {
      console.error('Error cogiendo ticket:', error);
      alert(error.response?.data?.message || '❌ Error al tomar el ticket');
    } finally {
      setCogiendoTicket(null);
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

  const getEstadoBadgeClass = (estado: string): string => {
    const classes: Record<string, string> = {
      ABIERTO: 'bg-blue-100 text-blue-800',
      EN_PROCESO: 'bg-yellow-100 text-yellow-800',
      PENDIENTE_CLIENTE: 'bg-orange-100 text-orange-800',
      RESUELTO: 'bg-green-100 text-green-800',
      CERRADO: 'bg-gray-100 text-gray-800',
      CANCELADO: 'bg-red-100 text-red-800'
    };
    return classes[estado] || 'bg-gray-100 text-gray-800';
  };

  const getPrioridadBadgeClass = (prioridad: string): string => {
    const classes: Record<string, string> = {
      BAJA: 'bg-gray-100 text-gray-700',
      MEDIA: 'bg-blue-100 text-blue-700',
      ALTA: 'bg-orange-100 text-orange-700',
      CRITICA: 'bg-red-100 text-red-700'
    };
    return classes[prioridad] || 'bg-gray-100 text-gray-700';
  };

  const getSLABadgeClass = (estadoSLA: string): string => {
    const classes: Record<string, string> = {
      EN_TIEMPO: 'bg-green-100 text-green-700',
      PROXIMO_VENCER: 'bg-yellow-100 text-yellow-700',
      VENCIDO: 'bg-red-100 text-red-700',
      NO_APLICA: 'bg-gray-100 text-gray-500'
    };
    return classes[estadoSLA] || 'bg-gray-100 text-gray-500';
  };

  const getSLALabel = (estadoSLA: string): string => {
    const labels: Record<string, string> = {
      EN_TIEMPO: 'En tiempo',
      PROXIMO_VENCER: 'Próximo a vencer',
      VENCIDO: 'Vencido',
      NO_APLICA: 'N/A'
    };
    return labels[estadoSLA] || estadoSLA;
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tickets</h1>
            <p className="text-gray-600 mt-1">Gestión de tickets de soporte y servicios</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Ticket
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600">Total Tickets</div>
            <div className="text-2xl font-bold text-gray-900">{total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600">Abiertos</div>
            <div className="text-2xl font-bold text-blue-600">
              {tickets.filter(t => t.estado === 'ABIERTO').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600">En Proceso</div>
            <div className="text-2xl font-bold text-yellow-600">
              {tickets.filter(t => t.estado === 'EN_PROCESO').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600">SLA Vencido</div>
            <div className="text-2xl font-bold text-red-600">
              {tickets.filter(t => t.estadoSLA === 'VENCIDO').length}
            </div>
          </div>
        </div>

        {/* Filtros Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full md:w-auto px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          {Object.keys(filters).filter(k => filters[k as keyof TicketFilter] !== undefined).length > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {Object.keys(filters).filter(k => filters[k as keyof TicketFilter] !== undefined).length}
            </span>
          )}
        </button>
      </div>

      {/* Panel de Filtros */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Búsqueda</label>
              <input
                type="text"
                placeholder="Buscar por código, título..."
                value={filters.busqueda || ''}
                onChange={(e) => handleFilterChange('busqueda', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Empresa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
              <select
                value={filters.empresaId || ''}
                onChange={(e) => handleFilterChange('empresaId', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas</option>
                {empresas.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                ))}
              </select>
            </div>

            {/* Sede */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sede</label>
              <select
                value={filters.sedeId || ''}
                onChange={(e) => handleFilterChange('sedeId', e.target.value ? Number(e.target.value) : undefined)}
                disabled={!filters.empresaId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Todas</option>
                {sedesDisponibles.map(sede => (
                  <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={filters.estado || ''}
                onChange={(e) => handleFilterChange('estado', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {estados.map(estado => (
                  <option key={estado} value={estado}>{estado.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
              <select
                value={filters.prioridad || ''}
                onChange={(e) => handleFilterChange('prioridad', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas</option>
                {prioridades.map(prioridad => (
                  <option key={prioridad} value={prioridad}>{prioridad}</option>
                ))}
              </select>
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Ticket</label>
              <select
                value={filters.tipoTicket || ''}
                onChange={(e) => handleFilterChange('tipoTicket', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {tiposTicket.map(tipo => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={filters.categoriaId || ''}
                onChange={(e) => handleFilterChange('categoriaId', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>

            {/* Estado SLA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado SLA</label>
              <select
                value={filters.estadoSLA || ''}
                onChange={(e) => handleFilterChange('estadoSLA', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {estadosSLA.map(sla => (
                  <option key={sla} value={sla}>{getSLALabel(sla)}</option>
                ))}
              </select>
            </div>

            {/* Técnico */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Técnico Asignado</label>
              <select
                value={filters.tecnicoId || ''}
                onChange={(e) => handleFilterChange('tecnicoId', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {tecnicos.map(tec => (
                  <option key={tec.id} value={tec.id}>{tec.nombre}</option>
                ))}
              </select>
            </div>

            {/* Fecha Desde */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
              <input
                type="date"
                value={filters.fechaDesde || ''}
                onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Fecha Hasta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
              <input
                type="date"
                value={filters.fechaHasta || ''}
                onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      )}

      {/* Tabla de Tickets */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay tickets</h3>
            <p className="mt-1 text-sm text-gray-500">Intenta ajustar los filtros o crea un nuevo ticket.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa / Sede</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SLA</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Técnico</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{ticket.codigo_ticket}</div>
                        <div className="text-xs text-gray-500">{ticket.tipo_ticket}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">{ticket.titulo}</div>
                        {ticket.categoria_nombre && (
                          <div className="text-xs text-gray-500">{ticket.categoria_nombre}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{ticket.empresa_nombre}</div>
                        {ticket.sede_nombre && (
                          <div className="text-xs text-gray-500">{ticket.sede_nombre}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadgeClass(ticket.estado)}`}>
                          {ticket.estado.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPrioridadBadgeClass(ticket.prioridad)}`}>
                          {ticket.prioridad}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSLABadgeClass(ticket.estado_sla)}`}>
                          {getSLALabel(ticket.estado_sla)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {ticket.tecnico_asignado?.nombre || (
                            <span className="text-gray-400 italic">Sin asignar</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(ticket.fecha_creacion).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {/* Botón Coger ticket - solo si NO está asignado */}
                          {!ticket.tecnico_asignado && ticket.estado === 'ABIERTO' && (
                            <button
                              onClick={() => handleCogerTicket(ticket.id)}
                              disabled={cogiendoTicket === ticket.id}
                              className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              {cogiendoTicket === ticket.id ? (
                                <>
                                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span>Tomando...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>Coger ticket</span>
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                            className="text-blue-600 hover:text-blue-900 transition-colors font-medium"
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

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando <span className="font-medium">{(page - 1) * pageSize + 1}</span> a{' '}
                      <span className="font-medium">{Math.min(page * pageSize, total)}</span> de{' '}
                      <span className="font-medium">{total}</span> resultados
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Anterior</span>
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === pageNum
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Siguiente</span>
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Crear Ticket */}
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

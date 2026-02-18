import { useState, useEffect } from 'react';
import type { Visita, CrearVisitaPayload, TecnicoAsignado } from '../types';
import { crearVisita } from '../services/visitasService';
import { getTicketById } from '@/modules/tickets/services/ticketsService';

interface NewVisitaModalProps {
  empresaId: string;
  contratoId: string;
  onClose: () => void;
  onVisitaCreada: (visita: Visita) => void;
  onError: (error: string) => void;
  prefilledData?: {
    sedeId?: string;
    tipoVisita?: 'PROGRAMADA' | 'POR_TICKET' | 'PREVENTIVO';
    ticketId?: string;
    ticketCodigo?: string;
  };
}

interface FormData {
  sedeId: string;
  tipoVisita: 'PROGRAMADA' | 'POR_TICKET' | 'PREVENTIVO';
  ticketId?: string;
  activoId?: string;
  fechaProgramada: string;
  tecnicos: TecnicoAsignado[];
  observaciones: string;
}

export default function NewVisitaModal({ empresaId, contratoId, onClose, onVisitaCreada, onError, prefilledData }: NewVisitaModalProps) {
  const [formData, setFormData] = useState<FormData>({
    sedeId: prefilledData?.sedeId || '',
    tipoVisita: prefilledData?.tipoVisita || 'PROGRAMADA',
    ticketId: prefilledData?.ticketId,
    fechaProgramada: '',
    tecnicos: [],
    observaciones: '',
  });

  const [sedes, setSedes] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketDetalle, setTicketDetalle] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTecnico, setSelectedTecnico] = useState('');
  const [tecnicoEncargado, setTecnicoEncargado] = useState('');
  const [validacionError, setValidacionError] = useState('');
  const isFromTicket = Boolean(prefilledData?.ticketId);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
    // Si viene con ticketId prellenado, cargar su detalle
    if (prefilledData?.ticketId) {
      cargarDetalleTicket(prefilledData.ticketId);
    }
  }, [empresaId]);

  const cargarDatos = async () => {
    try {
      // Cargar sedes de la empresa
      const sedesResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/empresas/${empresaId}/sedes`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (sedesResponse.ok) {
        const sedesData = await sedesResponse.json();
        setSedes(sedesData.data || sedesData || []);
      }

      // Cargar técnicos
      const tecnicosResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/usuarios-internos?rol=tecnico,administrador`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (tecnicosResponse.ok) {
        const tecnicosData = await tecnicosResponse.json();
        setTecnicos(tecnicosData.data || tecnicosData || []);
      }

      // Cargar tickets EN_PROCESO de la empresa
      const ticketsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets/gestion/lista?empresa_id=${empresaId}&estado=EN_PROCESO&limit=100`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json();
        const ticketsList = ticketsData.data?.tickets || ticketsData.tickets || [];
        console.log('🎫 Tickets EN_PROCESO cargados:', ticketsList);
        setTickets(ticketsList);
      }
    } catch (error) {
      console.error('Error loading datos:', error);
      onError('Error al cargar datos del formulario');
    }
  };

  const cargarDetalleTicket = async (ticketId: string) => {
    if (!ticketId) {
      setTicketDetalle(null);
      return;
    }

    try {
      const ticket = await getTicketById(Number(ticketId));
      console.log('🎫 Detalle del ticket cargado:', ticket);
      console.log('📋 Título:', ticket?.titulo);
      console.log('🖥️ Activos Array:', ticket?.activos);
      console.log('🖥️ Primer Activo:', ticket?.activos?.[0]);
      console.log('👤 Usuario datos:', {
        nombre: ticket?.usuario_nombre,
        correo: ticket?.usuario_correo,
        cargo: ticket?.usuario_cargo,
        telefono: ticket?.usuario_telefono
      });
      setTicketDetalle(ticket);
    } catch (error) {
      console.error('Error loading ticket detail:', error);
      setTicketDetalle(null);
    }
  };

  useEffect(() => {
    if (formData.fechaProgramada && formData.sedeId) {
      validarFormulario();
    }
  }, [formData.fechaProgramada, formData.sedeId]);

  const validarFormulario = async () => {
    setValidacionError('');

    // Validar que no exista otro técnico mismo día
    if (formData.tecnicos.length > 0) {
      try {
        const tecnicosEnFecha = formData.tecnicos.map((t) =>
          fetch(
            `${import.meta.env.VITE_API_URL}/api/visitas/tecnico/${t.tecnicoId}/fecha/${formData.fechaProgramada}`,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            }
          ).then(async (res) => {
            if (!res.ok) {
              return null;
            }
            return await res.json();
          })
        );

        const resultados = await Promise.all(tecnicosEnFecha);
        const conVisitas = resultados.filter((r) => r?.data && r.data.length > 0);

        if (conVisitas.length > 0) {
          setValidacionError('Uno o más técnicos ya tienen una visita programada para esa fecha');
        }
      } catch (error) {
        console.error('Error checking tecnico disponibilidad:', error);
      }
    }
  };

  const agregarTecnico = () => {
    if (!selectedTecnico) {
      onError('Selecciona un técnico');
      return;
    }

    const tecnicoYaAgregado = formData.tecnicos.some((t) => t.tecnicoId === selectedTecnico);
    if (tecnicoYaAgregado) {
      onError('Este técnico ya está agregado');
      return;
    }

    const tecnicoData = tecnicos.find((t) => String(t?._id ?? t?.id ?? '') === selectedTecnico);
    const nuevoTecnico: TecnicoAsignado = {
      tecnicoId: selectedTecnico,
      tecnicoNombre: tecnicoData?.nombre_completo || tecnicoData?.nombreCompleto || tecnicoData?.nombre || tecnicoData?.nombres || 'Desconocido',
      esEncargado: formData.tecnicos.length === 0, // El primero es encargado por defecto
    };

    setFormData((prev) => ({
      ...prev,
      tecnicos: [...prev.tecnicos, nuevoTecnico],
    }));

    if (formData.tecnicos.length === 0) {
      setTecnicoEncargado(selectedTecnico);
    }

    setSelectedTecnico('');
  };

  const removerTecnico = (tecnicoId: string) => {
    setFormData((prev) => ({
      ...prev,
      tecnicos: prev.tecnicos.filter((t) => t.tecnicoId !== tecnicoId),
    }));

    if (tecnicoEncargado === tecnicoId) {
      const nuevoEncargado = formData.tecnicos.find((t) => t.tecnicoId !== tecnicoId);
      if (nuevoEncargado) {
        setTecnicoEncargado(nuevoEncargado.tecnicoId);
        setFormData((prev) => ({
          ...prev,
          tecnicos: prev.tecnicos.map((t) =>
            t.tecnicoId === nuevoEncargado.tecnicoId
              ? { ...t, esEncargado: true }
              : { ...t, esEncargado: false }
          ),
        }));
      } else {
        setTecnicoEncargado('');
      }
    }
  };

  const cambiarEncargado = (tecnicoId: string) => {
    setTecnicoEncargado(tecnicoId);
    setFormData((prev) => ({
      ...prev,
      tecnicos: prev.tecnicos.map((t) => ({
        ...t,
        esEncargado: t.tecnicoId === tecnicoId,
      })),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.sedeId) {
      onError('Selecciona una sede');
      return;
    }
    if (!contratoId) {
      onError('No se encontró un contrato activo para la empresa');
      return;
    }
    if (!formData.fechaProgramada) {
      onError('Selecciona una fecha');
      return;
    }
    if (formData.tecnicos.length === 0) {
      onError('Debes agregar al menos un técnico');
      return;
    }
    if (validacionError) {
      onError(validacionError);
      return;
    }

    setLoading(true);
    try {
      const mes = formData.fechaProgramada.slice(0, 7);
      const [anio, mesNumero] = mes.split('-');
      const payload: CrearVisitaPayload = {
        empresaId,
        contratoId,
        sedeId: formData.sedeId,
        tipoVisita: formData.tipoVisita,
        ticketId: formData.tipoVisita === 'POR_TICKET' ? formData.ticketId : undefined,
        activoId: formData.activoId,
        fechaProgramada: formData.fechaProgramada,
        tecnicosAsignados: formData.tecnicos,
        mes: mesNumero,
        anio,
        observaciones: formData.observaciones,
      };

      const response = await crearVisita(payload);
      onVisitaCreada(response.data || response);
    } catch (error: any) {
      console.error('Error creating visita:', error);
      onError(error.message || 'Error al crear la visita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Nueva Visita</h2>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Contenido */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Fila 1: Sede y Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sede *</label>
              <select
                value={formData.sedeId}
                onChange={(e) => setFormData({ ...formData, sedeId: e.target.value })}
                required
                disabled={isFromTicket}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Seleccionar sede...</option>
                {sedes.map((sede, index) => {
                  const sedeId = String(sede?._id ?? sede?.id ?? index);
                  return (
                    <option key={sedeId} value={sedeId}>
                      {sede?.nombre ?? 'Sede'}
                    </option>
                  );
                })}
              </select>
              {isFromTicket && <p className="mt-1 text-xs text-gray-500">✓ Sede del ticket seleccionado</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Visita *</label>
              <select
                value={formData.tipoVisita}
                onChange={(e) => setFormData({ ...formData, tipoVisita: e.target.value as any })}
                disabled={isFromTicket}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="PROGRAMADA">Programada</option>
                <option value="POR_TICKET">Por Ticket</option>
                <option value="PREVENTIVO">Preventivo</option>
              </select>
              {isFromTicket && <p className="mt-1 text-xs text-gray-500">✓ Tipo establecido automáticamente</p>}
            </div>
          </div>

          {/* Fila 2: Ticket (si es por ticket) */}
          {formData.tipoVisita === 'POR_TICKET' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ticket {isFromTicket && <span className="text-green-600 text-xs">(Prellenado)</span>}
              </label>
              <select
                value={formData.ticketId || ''}
                onChange={(e) => {
                  setFormData({ ...formData, ticketId: e.target.value });
                  cargarDetalleTicket(e.target.value);
                }}
                disabled={isFromTicket}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Seleccionar ticket...</option>
                {tickets.map((ticket, index) => {
                  const ticketId = String(ticket?._id ?? ticket?.id ?? '');
                  const codigoTicket = ticket?.codigo_ticket ?? ticket?.numero ?? ticket?.codigo ?? `TKT-${index}`;
                  return (
                    <option key={ticketId || `ticket-${index}`} value={ticketId}>
                      {codigoTicket}
                    </option>
                  );
                })}
              </select>
              {isFromTicket && prefilledData?.ticketCodigo && (
                <p className="mt-1 text-xs text-green-600 font-medium">✓ Ticket {prefilledData.ticketCodigo} seleccionado</p>
              )}
            </div>
          )}

          {/* Resumen del Ticket Seleccionado */}
          {formData.tipoVisita === 'POR_TICKET' && ticketDetalle && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-blue-200 pb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h4 className="font-bold text-blue-900 text-lg">Resumen del Ticket</h4>
              </div>
              
              {/* Título del Ticket */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs font-semibold text-blue-600 uppercase mb-2">📋 Título</p>
                <p className="font-bold text-gray-900 text-base">{ticketDetalle.titulo || '-'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Info Activo */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-xs font-semibold text-indigo-600 uppercase mb-2">🖥️ Activo Afectado</p>
                  {ticketDetalle.activos && ticketDetalle.activos.length > 0 ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Código de Activo:</p>
                        <p className="font-bold text-gray-900 text-sm">
                          {ticketDetalle.activos[0]?.activo_codigo || 
                           ticketDetalle.activos[0]?.codigo || 
                           ticketDetalle.activos[0]?.assetId ||
                           '-'}
                        </p>
                      </div>
                      {ticketDetalle.activos[0]?.categoria && (
                        <div>
                          <p className="text-xs text-gray-500">Categoría:</p>
                          <p className="font-semibold text-gray-800 text-sm">
                            {ticketDetalle.activos[0]?.categoria}
                          </p>
                        </div>
                      )}
                      {ticketDetalle.activos[0]?.area && (
                        <div>
                          <p className="text-xs text-gray-500">Área:</p>
                          <p className="font-semibold text-gray-800 text-sm">
                            {ticketDetalle.activos[0]?.area}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Sin información de activo</p>
                  )}
                </div>

                {/* Info Usuario */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-xs font-semibold text-purple-600 uppercase mb-2">👤 Usuario Asignado</p>
                  {ticketDetalle.usuario_nombre || ticketDetalle.usuario_correo ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Nombre:</p>
                        <p className="font-bold text-gray-900 text-sm">
                          {ticketDetalle.usuario_nombre || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Correo:</p>
                        <p className="font-semibold text-gray-800 text-sm">
                          {ticketDetalle.usuario_correo || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Cargo:</p>
                        <p className="font-semibold text-gray-800 text-sm">
                          {ticketDetalle.usuario_cargo || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Teléfono:</p>
                        <p className="font-semibold text-gray-800 text-sm">
                          {ticketDetalle.usuario_telefono || '-'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Sin información de usuario</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fila 3: Fecha programada */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Programada *</label>
            <input
              type="date"
              value={formData.fechaProgramada}
              onChange={(e) => setFormData({ ...formData, fechaProgramada: e.target.value })}
              required
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Validación Error */}
          {validacionError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              ⚠️ {validacionError}
            </div>
          )}

          {/* Fila 4: Técnicos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Técnicos Asignados *</label>

            {/* Select + Agregar */}
            <div className="flex gap-2 mb-4">
              <select
                value={selectedTecnico}
                onChange={(e) => setSelectedTecnico(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar técnico...</option>
                {tecnicos.map((tecnico, index) => {
                  const tecnicoId = String(tecnico?._id ?? tecnico?.id ?? index);
                  const tecnicoNombre = tecnico?.nombre_completo || tecnico?.nombreCompleto || tecnico?.nombre || 'Tecnico';
                  return (
                    <option key={tecnicoId} value={tecnicoId}>
                      {tecnicoNombre}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                onClick={agregarTecnico}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
              >
                Agregar
              </button>
            </div>

            {/* Lista de técnicos agregados */}
            {formData.tecnicos.length > 0 && (
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                {formData.tecnicos.map((tecnico) => (
                  <div key={tecnico.tecnicoId} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="radio"
                        name="encargado"
                        value={tecnico.tecnicoId}
                        checked={tecnico.esEncargado}
                        onChange={() => cambiarEncargado(tecnico.tecnicoId)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="font-medium text-gray-900">{tecnico.tecnicoNombre}</span>
                      {tecnico.esEncargado && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                          Encargado
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removerTecnico(tecnico.tecnicoId)}
                      className="text-red-600 hover:text-red-700 font-medium text-sm"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fila 5: Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              placeholder="Notas adicionales para la visita..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !!validacionError}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              Crear Visita
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

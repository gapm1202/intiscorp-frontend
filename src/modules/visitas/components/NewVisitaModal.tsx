import { useState, useEffect } from 'react';
import type { Visita, CrearVisitaPayload, TecnicoAsignado } from '../types';
import { crearVisita } from '../services/visitasService';
import { getTicketById, asignarTecnico } from '@/modules/tickets/services/ticketsService';

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

// ── Helpers de estilo ────────────────────────────────────────────────────────
const labelCls = "block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5";
const inputCls =
  "w-full px-3.5 py-2.5 bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-lg " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition placeholder-slate-400";
const selectCls =
  "w-full appearance-none px-3.5 py-2.5 bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-lg " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition cursor-pointer " +
  "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";

const SelectWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="relative">
    {children}
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
);

const SectionTitle = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="flex items-center justify-center w-7 h-7 bg-blue-100 rounded-lg text-blue-600">
      {icon}
    </div>
    <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">{label}</span>
    <div className="flex-1 h-px bg-slate-100 ml-1" />
  </div>
);

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

  useEffect(() => {
    cargarDatos();
    if (prefilledData?.ticketId) {
      cargarDetalleTicket(prefilledData.ticketId);
    }
  }, [empresaId]);

  const cargarDatos = async () => {
    try {
      const sedesResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/empresas/${empresaId}/sedes`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (sedesResponse.ok) {
        const sedesData = await sedesResponse.json();
        setSedes(sedesData.data || sedesData || []);
      }

      const tecnicosResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/usuarios-internos?rol=tecnico,administrador`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (tecnicosResponse.ok) {
        const tecnicosData = await tecnicosResponse.json();
        setTecnicos(tecnicosData.data || tecnicosData || []);
      }

      const ticketsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets/gestion/lista?empresa_id=${empresaId}&estado=EN_PROCESO&limit=100`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
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
    if (!ticketId) { setTicketDetalle(null); return; }
    try {
      const ticket = await getTicketById(Number(ticketId));
      console.log('🎫 Detalle del ticket cargado:', ticket);
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

  const getLocalDateKey = (d: Date = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const minDateLocal = getLocalDateKey();

  const validarFormulario = async () => {
    setValidacionError('');
    if (formData.tecnicos.length > 0) {
      try {
        const tecnicosEnFecha = formData.tecnicos.map((t) =>
          fetch(`${import.meta.env.VITE_API_URL}/api/visitas/tecnico/${t.tecnicoId}/fecha/${formData.fechaProgramada}`, {
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          }).then(async (res) => { if (!res.ok) return null; return await res.json(); })
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
    if (!selectedTecnico) { onError('Selecciona un técnico'); return; }
    const tecnicoYaAgregado = formData.tecnicos.some((t) => t.tecnicoId === selectedTecnico);
    if (tecnicoYaAgregado) { onError('Este técnico ya está agregado'); return; }
    const tecnicoData = tecnicos.find((t) => String(t?._id ?? t?.id ?? '') === selectedTecnico);
    const nuevoTecnico: TecnicoAsignado = {
      tecnicoId: selectedTecnico,
      tecnicoNombre: tecnicoData?.nombre_completo || tecnicoData?.nombreCompleto || tecnicoData?.nombre || tecnicoData?.nombres || 'Desconocido',
      esEncargado: formData.tecnicos.length === 0,
    };
    setFormData((prev) => ({ ...prev, tecnicos: [...prev.tecnicos, nuevoTecnico] }));
    if (formData.tecnicos.length === 0) setTecnicoEncargado(selectedTecnico);
    setSelectedTecnico('');
  };

  const removerTecnico = (tecnicoId: string) => {
    setFormData((prev) => ({ ...prev, tecnicos: prev.tecnicos.filter((t) => t.tecnicoId !== tecnicoId) }));
    if (tecnicoEncargado === tecnicoId) {
      const nuevoEncargado = formData.tecnicos.find((t) => t.tecnicoId !== tecnicoId);
      if (nuevoEncargado) {
        setTecnicoEncargado(nuevoEncargado.tecnicoId);
        setFormData((prev) => ({
          ...prev,
          tecnicos: prev.tecnicos.map((t) =>
            t.tecnicoId === nuevoEncargado.tecnicoId ? { ...t, esEncargado: true } : { ...t, esEncargado: false }
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
      tecnicos: prev.tecnicos.map((t) => ({ ...t, esEncargado: t.tecnicoId === tecnicoId })),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sedeId) { onError('Selecciona una sede'); return; }
    if (!contratoId) { onError('No se encontró un contrato activo para la empresa'); return; }
    if (!formData.fechaProgramada) { onError('Selecciona una fecha'); return; }
    if (formData.tecnicos.length === 0) { onError('Debes agregar al menos un técnico'); return; }
    if (validacionError) { onError(validacionError); return; }

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
      const visitaCreada = response.data || response;
      try {
        if (formData.ticketId && tecnicoEncargado) {
          const ticketIdNum = Number(formData.ticketId);
          const tecnicoIdNum = Number(tecnicoEncargado);
          if (!Number.isNaN(ticketIdNum) && !Number.isNaN(tecnicoIdNum)) {
            await asignarTecnico(ticketIdNum, tecnicoIdNum, 'Asignado como encargado de visita presencial');
          }
        }
      } catch (err) {
        console.error('Error asignando técnico al ticket tras crear visita:', err);
      }
      onVisitaCreada(visitaCreada);
    } catch (error: any) {
      console.error('Error creating visita:', error);
      onError(error.message || 'Error al crear la visita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-7 py-5 flex items-center justify-between shrink-0">
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-0.5">Visitas</p>
            <h2 className="text-xl font-bold text-white tracking-tight">Nueva Visita</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-200 hover:bg-white/20 hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Formulario ── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-7 py-6 space-y-7">

            {/* ── Sección 1: Información de la visita ── */}
            <div>
              <SectionTitle
                label="Información de la Visita"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sede */}
                <div>
                  <label className={labelCls}>
                    Sede <span className="text-blue-500">*</span>
                  </label>
                  <SelectWrapper>
                    <select
                      value={formData.sedeId}
                      onChange={(e) => setFormData({ ...formData, sedeId: e.target.value })}
                      required
                      disabled={isFromTicket}
                      className={selectCls}
                    >
                      <option value="">Seleccionar sede...</option>
                      {sedes.map((sede, index) => {
                        const sedeId = String(sede?._id ?? sede?.id ?? index);
                        return <option key={sedeId} value={sedeId}>{sede?.nombre ?? 'Sede'}</option>;
                      })}
                    </select>
                  </SelectWrapper>
                  {isFromTicket && (
                    <p className="mt-1.5 text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Sede del ticket seleccionado
                    </p>
                  )}
                </div>

                {/* Tipo Visita */}
                <div>
                  <label className={labelCls}>
                    Tipo de Visita <span className="text-blue-500">*</span>
                  </label>
                  <SelectWrapper>
                    <select
                      value={formData.tipoVisita}
                      onChange={(e) => setFormData({ ...formData, tipoVisita: e.target.value as any })}
                      disabled={isFromTicket}
                      className={selectCls}
                    >
                      <option value="PROGRAMADA">Programada</option>
                      <option value="POR_TICKET">Por Ticket</option>
                      <option value="PREVENTIVO">Preventivo</option>
                    </select>
                  </SelectWrapper>
                  {isFromTicket && (
                    <p className="mt-1.5 text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Tipo establecido automáticamente
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Sección 2: Ticket (condicional) ── */}
            {formData.tipoVisita === 'POR_TICKET' && (
              <div>
                <SectionTitle
                  label="Ticket Relacionado"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  }
                />

                <div>
                  <label className={labelCls}>
                    Ticket{' '}
                    {isFromTicket && (
                      <span className="ml-1 text-emerald-600 normal-case font-semibold">(Prellenado)</span>
                    )}
                  </label>
                  <SelectWrapper>
                    <select
                      value={formData.ticketId || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, ticketId: e.target.value });
                        cargarDetalleTicket(e.target.value);
                      }}
                      disabled={isFromTicket}
                      className={selectCls}
                    >
                      <option value="">Seleccionar ticket...</option>
                      {tickets.map((ticket, index) => {
                        const ticketId = String(ticket?._id ?? ticket?.id ?? '');
                        const codigoTicket = ticket?.codigo_ticket ?? ticket?.numero ?? ticket?.codigo ?? `TKT-${index}`;
                        return <option key={ticketId || `ticket-${index}`} value={ticketId}>{codigoTicket}</option>;
                      })}
                    </select>
                  </SelectWrapper>
                  {isFromTicket && prefilledData?.ticketCodigo && (
                    <p className="mt-1.5 text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Ticket {prefilledData.ticketCodigo} seleccionado
                    </p>
                  )}
                </div>

                {/* Resumen del Ticket */}
                {ticketDetalle && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
                    {/* Header del resumen */}
                    <div className="bg-blue-100 px-4 py-2.5 flex items-center gap-2 border-b border-blue-200">
                      <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Detalle del Ticket</span>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Título */}
                      <div className="bg-white rounded-lg px-4 py-3 border border-blue-100">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Título</p>
                        <p className="font-semibold text-slate-800 text-sm">{ticketDetalle.titulo || '—'}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Activo */}
                        <div className="bg-white rounded-lg px-4 py-3 border border-blue-100">
                          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Activo Afectado</p>
                          {ticketDetalle.activos && ticketDetalle.activos.length > 0 ? (
                            <div className="space-y-1.5">
                              <div>
                                <p className="text-xs text-slate-400 font-medium">Código</p>
                                <p className="font-bold text-slate-800 text-sm">
                                  {ticketDetalle.activos[0]?.activo_codigo || ticketDetalle.activos[0]?.codigo || ticketDetalle.activos[0]?.assetId || '—'}
                                </p>
                              </div>
                              {ticketDetalle.activos[0]?.categoria && (
                                <div>
                                  <p className="text-xs text-slate-400 font-medium">Categoría</p>
                                  <p className="font-semibold text-slate-700 text-sm">{ticketDetalle.activos[0].categoria}</p>
                                </div>
                              )}
                              {ticketDetalle.activos[0]?.area && (
                                <div>
                                  <p className="text-xs text-slate-400 font-medium">Área</p>
                                  <p className="font-semibold text-slate-700 text-sm">{ticketDetalle.activos[0].area}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 italic">Sin información de activo</p>
                          )}
                        </div>

                        {/* Usuario */}
                        <div className="bg-white rounded-lg px-4 py-3 border border-blue-100">
                          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider mb-2">Usuario Asignado</p>
                          {ticketDetalle.usuario_nombre || ticketDetalle.usuario_correo ? (
                            <div className="space-y-1.5">
                              <div>
                                <p className="text-xs text-slate-400 font-medium">Nombre</p>
                                <p className="font-bold text-slate-800 text-sm">{ticketDetalle.usuario_nombre || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400 font-medium">Correo</p>
                                <p className="font-semibold text-slate-700 text-sm">{ticketDetalle.usuario_correo || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400 font-medium">Cargo</p>
                                <p className="font-semibold text-slate-700 text-sm">{ticketDetalle.usuario_cargo || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400 font-medium">Teléfono</p>
                                <p className="font-semibold text-slate-700 text-sm">{ticketDetalle.usuario_telefono || '—'}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 italic">Sin información de usuario</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Sección 3: Fecha ── */}
            <div>
              <SectionTitle
                label="Programación"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
              <div>
                <label className={labelCls}>
                  Fecha Programada <span className="text-blue-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fechaProgramada}
                  onChange={(e) => setFormData({ ...formData, fechaProgramada: e.target.value })}
                  required
                  min={minDateLocal}
                  className={inputCls + " max-w-xs"}
                />
              </div>

              {/* Error de validación */}
              {validacionError && (
                <div className="mt-3 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  {validacionError}
                </div>
              )}
            </div>

            {/* ── Sección 4: Técnicos ── */}
            <div>
              <SectionTitle
                label="Técnicos Asignados"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />

              {/* Agregar técnico */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <SelectWrapper>
                    <select
                      value={selectedTecnico}
                      onChange={(e) => setSelectedTecnico(e.target.value)}
                      className={selectCls}
                    >
                      <option value="">Seleccionar técnico...</option>
                      {tecnicos.map((tecnico, index) => {
                        const tecnicoId = String(tecnico?._id ?? tecnico?.id ?? index);
                        const tecnicoNombre = tecnico?.nombre_completo || tecnico?.nombreCompleto || tecnico?.nombre || 'Tecnico';
                        return <option key={tecnicoId} value={tecnicoId}>{tecnicoNombre}</option>;
                      })}
                    </select>
                  </SelectWrapper>
                </div>
                <button
                  type="button"
                  onClick={agregarTecnico}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar
                </button>
              </div>

              {/* Lista técnicos */}
              {formData.tecnicos.length > 0 ? (
                <div className="space-y-2 bg-slate-50 rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 pb-1">
                    {formData.tecnicos.length} técnico{formData.tecnicos.length !== 1 ? 's' : ''} — selecciona el encargado
                  </p>
                  {formData.tecnicos.map((tecnico) => (
                    <div
                      key={tecnico.tecnicoId}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border transition ${
                        tecnico.esEncargado
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="encargado"
                          value={tecnico.tecnicoId}
                          checked={tecnico.esEncargado}
                          onChange={() => cambiarEncargado(tecnico.tecnicoId)}
                          className="w-4 h-4 text-blue-600 cursor-pointer"
                        />
                        <div>
                          <span className="font-semibold text-slate-800 text-sm">{tecnico.tecnicoNombre}</span>
                          {tecnico.esEncargado && (
                            <span className="ml-2 inline-flex items-center text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">
                              Encargado
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerTecnico(tecnico.tecnicoId)}
                        className="text-slate-400 hover:text-red-500 transition p-1 rounded"
                        title="Remover técnico"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl px-4 py-4">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agrega al menos un técnico para la visita
                </div>
              )}
            </div>

            {/* ── Sección 5: Observaciones ── */}
            <div>
              <SectionTitle
                label="Observaciones"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                }
              />
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Notas adicionales para la visita..."
                rows={3}
                className={inputCls + " resize-none"}
              />
            </div>
          </div>

          {/* ── Footer con botones ── */}
          <div className="sticky bottom-0 bg-white border-t border-slate-100 px-7 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !!validacionError}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-200"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creando…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Crear Visita
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
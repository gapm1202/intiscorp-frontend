import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Ticket, PrioridadTicket, ImpactoTicket, UrgenciaTicket, ModalidadTicket } from '../types';
import { getTecnicos, configurarTicket } from '../services/ticketsService';
import { useAuth } from '@/hooks/useAuth';
import { getCatalogCategories, getCatalogSubcategories } from '@/modules/catalogo/services/catalogoService';
import { catalogoServiciosService } from '@/modules/catalogo/services/catalogoAPI';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket;
  onUpdated: () => void;
}

export default function ConfigurarTicketModal({ isOpen, onClose, ticket, onUpdated }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [subcategorias, setSubcategorias] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);

  const [servicios, setServicios] = useState<any[]>([]);

  const [form, setForm] = useState({
    categoria_id: ticket?.categoria_id || '',
    subcategoria_id: ticket?.subcategoria_id || '',
    servicio_id: ticket?.servicio_id || '',
    tipo_ticket: ticket?.tipo_ticket || '',
    impacto: (ticket?.impacto || '') as ImpactoTicket | '',
    urgencia: (ticket?.urgencia || '') as UrgenciaTicket | '',
    prioridad: (ticket?.prioridad || '') as PrioridadTicket | '',
    modalidad: (ticket?.modalidad || '') as ModalidadTicket | '',
    tecnico_id: ticket?.tecnico_asignado?.id || '',
    activos: ticket?.activos_codigos || []
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        categoria_id: ticket?.categoria_id || '',
        subcategoria_id: ticket?.subcategoria_id || '',
        servicio_id: ticket?.servicio_id || '',
        tipo_ticket: ticket?.tipo_ticket || '',
        impacto: (ticket?.impacto || '') as ImpactoTicket | '',
        urgencia: (ticket?.urgencia || '') as UrgenciaTicket | '',
        prioridad: (ticket?.prioridad || '') as PrioridadTicket | '',
        modalidad: (ticket?.modalidad || '') as ModalidadTicket | '',
        tecnico_id: ticket?.tecnico_asignado?.id || '',
        activos: ticket?.activos_codigos || []
      });
      setMotivo('');
      
      // Cargar datos necesarios
      Promise.all([
        getTecnicos().then(setTecnicos).catch(() => setTecnicos([])),
        getCatalogCategories().then(setCategorias).catch(() => setCategorias([])),
        catalogoServiciosService.getServicios().then(setServicios).catch(() => setServicios([]))
      ]);
    }
  }, [isOpen, ticket]);

  // Cargar subcategorías cuando cambia la categoría
  useEffect(() => {
    if (form.categoria_id) {
      getCatalogSubcategories()
        .then((subs) => {
          // Filtrar subcategorías por categoría seleccionada
          const filtered = subs.filter((sub: any) => 
            String(sub.categoriaId) === String(form.categoria_id) || 
            String(sub.categoria_id) === String(form.categoria_id)
          );
          setSubcategorias(filtered);
        })
        .catch(() => setSubcategorias([]));
    } else {
      setSubcategorias([]);
    }
  }, [form.categoria_id]);

  if (!isOpen) return null;

  const handleChange = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos requeridos
    if (!form.categoria_id) return alert('Seleccione una categoría');
    if (!form.subcategoria_id) return alert('Seleccione una subcategoría');
    if (!form.servicio_id) return alert('Seleccione un servicio');
    if (!form.tipo_ticket) return alert('Ingrese el tipo de ticket');
    if (!form.impacto) return alert('Seleccione el impacto');
    if (!form.urgencia) return alert('Seleccione la urgencia');
    if (!form.prioridad) return alert('Seleccione la prioridad');
    if (!form.modalidad) return alert('Seleccione la modalidad');

    try {
      setLoading(true);
      
      // Construir payload según especificación del backend
      const payload: any = {
        categoria_id: Number(form.categoria_id),
        subcategoria_id: Number(form.subcategoria_id),
        servicio_id: Number(form.servicio_id),
        tipo_ticket: form.tipo_ticket,
        impacto: form.impacto,
        urgencia: form.urgencia,
        prioridad: form.prioridad,
        modalidad: form.modalidad,
        configurado_por_id: user?.id
      };

      if (form.tecnico_id) {
        payload.tecnico_id = Number(form.tecnico_id);
      }

      if (form.activos && form.activos.length > 0) {
        payload.activos = form.activos.map((codigo: string) => ({ codigo }));
      }

      if (motivo.trim()) {
        payload.motivo = motivo.trim();
      }

      await configurarTicket(ticket.id, payload);
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error('Error configurando ticket:', err);
      alert(err.response?.data?.message || 'Error al configurar ticket');
    } finally {
      setLoading(false);
    }
  };

  const renderAdjuntos = () => {
    const adjuntos: any[] = ticket.adjuntos || [];
    if (adjuntos.length === 0) return <p className="text-sm text-gray-500">Sin adjuntos</p>;

    return (
      <div className="space-y-2">
        {adjuntos.map((a: any, i: number) => {
          // Soporta string URL o objeto con id/nombre/tipo/tamanio
          const isObj = typeof a === 'object' && a !== null;
          const nombre = isObj ? (a.nombre || a.name || `Adjunto ${i+1}`) : String(a).split('/').pop();
          const tipo = isObj ? a.tipo || a.mime : undefined;
          const tamanio = isObj ? a.tamanio || a.size : undefined;
          const href = isObj && a.id ? `/api/tickets/${ticket.id}/adjuntos/${a.id}/download` : (typeof a === 'string' ? a : '#');

          return (
            <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
              <div className="flex-1">
                <div className="text-sm font-medium">{nombre}</div>
                <div className="text-xs text-gray-500">{tipo || (tamanio ? `${tamanio} bytes` : '')}</div>
              </div>
              <div className="flex items-center gap-2">
                <a href={href} target="_blank" rel="noopener" className="text-sm px-3 py-1 bg-blue-600 text-white rounded">Ver</a>
                <a href={href} download className="text-sm px-3 py-1 bg-gray-600 text-white rounded">Descargar</a>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {ticket.origen === 'PORTAL_PUBLICO' ? 'Configurar Ticket de Portal Público' : 'Configurar Ticket'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {ticket.codigo_ticket} • Estado: {ticket.estado}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información del ticket */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">Información del Ticket</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">Empresa</label>
                <div className="mt-1 text-sm text-gray-900">{ticket.empresa_nombre || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Sede</label>
                <div className="mt-1 text-sm text-gray-900">{ticket.sede_nombre || 'N/A'}</div>
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-600">Título</label>
                <div className="mt-1 text-sm text-gray-900 font-medium">{ticket.titulo}</div>
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-600">Descripción</label>
                <div className="mt-1 text-sm text-gray-700 bg-white p-3 rounded border border-gray-200 max-h-32 overflow-y-auto">
                  {ticket.descripcion}
                </div>
              </div>
            </div>
          </div>

          {/* Adjuntos */}
          {ticket.adjuntos && ticket.adjuntos.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Adjuntos</h3>
              {renderAdjuntos()}
            </div>
          )}

          {/* Clasificación del Ticket */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-amber-900 mb-3">Clasificación del Ticket</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.categoria_id}
                  onChange={(e) => handleChange('categoria_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Seleccionar categoría...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subcategoría <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.subcategoria_id}
                  onChange={(e) => handleChange('subcategoria_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={!form.categoria_id}
                >
                  <option value="">Seleccionar subcategoría...</option>
                  {subcategorias.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Servicio <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.servicio_id}
                  onChange={(e) => handleChange('servicio_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Seleccionar servicio...</option>
                  {servicios.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Ticket <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.tipo_ticket}
                  onChange={(e) => handleChange('tipo_ticket', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Seleccionar tipo...</option>
                  <option value="INCIDENTE">Incidente</option>
                  <option value="SOLICITUD">Solicitud</option>
                  <option value="CAMBIO">Cambio</option>
                  <option value="PROBLEMA">Problema</option>
                </select>
              </div>
            </div>
          </div>

          {/* Priorización */}
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-rose-900 mb-3">Priorización</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Impacto <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.impacto}
                  onChange={(e) => handleChange('impacto', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="CRITICO">Crítico</option>
                  <option value="ALTO">Alto</option>
                  <option value="MEDIO">Medio</option>
                  <option value="BAJO">Bajo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Urgencia <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.urgencia}
                  onChange={(e) => handleChange('urgencia', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="CRITICA">Crítica</option>
                  <option value="ALTA">Alta</option>
                  <option value="MEDIA">Media</option>
                  <option value="BAJA">Baja</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridad <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.prioridad}
                  onChange={(e) => handleChange('prioridad', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="CRITICA">Crítica</option>
                  <option value="ALTA">Alta</option>
                  <option value="MEDIA">Media</option>
                  <option value="BAJA">Baja</option>
                </select>
              </div>
            </div>
          </div>

          {/* Asignación */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-green-900 mb-3">Asignación y Modalidad</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modalidad <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.modalidad}
                  onChange={(e) => handleChange('modalidad', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="PRESENCIAL">Presencial</option>
                  <option value="REMOTO">Remoto</option>
                  <option value="HIBRIDO">Híbrido</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Técnico Asignado (Opcional)
                </label>
                <select
                  value={String(form.tecnico_id)}
                  onChange={(e) => handleChange('tecnico_id', e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sin asignar</option>
                  {tecnicos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre || t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo / Observaciones (Opcional)
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Agregue observaciones sobre la configuración del ticket..."
            />
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                'Guardar Configuración'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

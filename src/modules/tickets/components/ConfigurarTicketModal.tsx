import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Ticket, PrioridadTicket } from '../types';
import { getTecnicos, editarTicket } from '../services/ticketsService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket;
  onUpdated: () => void;
}

export default function ConfigurarTicketModal({ isOpen, onClose, ticket, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [tecnicos, setTecnicos] = useState<any[]>([]);

  const [form, setForm] = useState({
    servicio_nombre: ticket?.servicio_nombre || '',
    tipo_servicio: ticket?.tipo_servicio || '',
    modalidad: ticket?.modalidad_servicio || ticket?.modalidad || '',
    prioridad: ticket?.prioridad || '' as PrioridadTicket | '',
    tecnico_id: ticket?.tecnico_asignado?.id || ''
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        servicio_nombre: ticket?.servicio_nombre || '',
        tipo_servicio: ticket?.tipo_servicio || '',
        modalidad: ticket?.modalidad_servicio || ticket?.modalidad || '',
        prioridad: ticket?.prioridad || '' as PrioridadTicket | '',
        tecnico_id: ticket?.tecnico_asignado?.id || ''
      });
      setMotivo('');
      // cargar tecnicos
      getTecnicos().then(setTecnicos).catch(() => setTecnicos([]));
    }
  }, [isOpen, ticket]);

  if (!isOpen) return null;

  const handleChange = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const buildCambios = () => {
    const cambios: Record<string, { valorAnterior: any; valorNuevo: any }> = {};
    if (form.servicio_nombre !== ticket.servicio_nombre) cambios.servicio_nombre = { valorAnterior: ticket.servicio_nombre, valorNuevo: form.servicio_nombre };
    if (form.tipo_servicio !== ticket.tipo_servicio) cambios.tipo_servicio = { valorAnterior: ticket.tipo_servicio, valorNuevo: form.tipo_servicio };
    if (form.modalidad !== (ticket.modalidad_servicio || ticket.modalidad)) cambios.modalidad = { valorAnterior: ticket.modalidad_servicio || ticket.modalidad, valorNuevo: form.modalidad };
    if (form.prioridad !== ticket.prioridad) cambios.prioridad = { valorAnterior: ticket.prioridad, valorNuevo: form.prioridad };
    const anteriorTecnico = ticket.tecnico_asignado?.id || null;
    if ((form.tecnico_id || null) !== anteriorTecnico) cambios.tecnico_asignado_id = { valorAnterior: anteriorTecnico, valorNuevo: form.tecnico_id || null };
    return cambios;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) return alert('Ingrese un motivo');
    const cambios = buildCambios();
    if (Object.keys(cambios).length === 0) return alert('No se detectaron cambios');

    try {
      setLoading(true);
      await editarTicket(ticket.id, cambios, motivo);
      onUpdated();
      onClose();
    } catch (err) {
      console.error('Error configurando ticket:', err);
      alert('Error al configurar ticket');
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
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Configurar ticket</h2>
            <p className="text-sm text-gray-500 mt-1">Ticket {ticket.codigo_ticket}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Empresa</label>
              <div className="mt-1 text-sm text-gray-900">{ticket.empresa_nombre || 'N/A'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Sede</label>
              <div className="mt-1 text-sm text-gray-900">{ticket.sede_nombre || 'N/A'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Tipo de Soporte</label>
              <div className="mt-1 text-sm text-gray-900">{ticket.tipo_soporte || 'N/A'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Título</label>
              <div className="mt-1 text-sm text-gray-900 font-medium">{ticket.titulo}</div>
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-500">Descripción detallada</label>
              <div className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">{ticket.descripcion}</div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Adjuntos</h3>
            {renderAdjuntos()}
          </div>

          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <h3 className="text-sm font-semibold mb-2">Clasificación y Asignación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-500">Servicio</label>
                <input value={form.servicio_nombre} onChange={(e) => handleChange('servicio_nombre', e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="text-sm text-gray-500">Tipo Servicio</label>
                <input value={form.tipo_servicio} onChange={(e) => handleChange('tipo_servicio', e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="text-sm text-gray-500">Modalidad</label>
                <input value={form.modalidad} onChange={(e) => handleChange('modalidad', e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="text-sm text-gray-500">Prioridad</label>
                <select value={form.prioridad} onChange={(e) => handleChange('prioridad', e.target.value)} className="w-full px-3 py-2 border rounded">
                  <option value="">Seleccionar...</option>
                  <option value="CRITICA">CRITICA</option>
                  <option value="ALTA">ALTA</option>
                  <option value="MEDIA">MEDIA</option>
                  <option value="BAJA">BAJA</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500">Técnico</label>
                <select value={String(form.tecnico_id)} onChange={(e) => handleChange('tecnico_id', Number(e.target.value) || '')} className="w-full px-3 py-2 border rounded">
                  <option value="">Sin asignar</option>
                  {tecnicos.map(t => (<option key={t.id} value={t.id}>{t.nombre || t.name}</option>))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500">Motivo</label>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded" />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

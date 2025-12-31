import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const PublicTicketStatusPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTicket = async () => {
      if (!ticketId) return;
      setLoading(true);
      setError(null);
      
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const response = await fetch(`${API_BASE}/public/ticket/${ticketId}`);
        
        if (!response.ok) {
          throw new Error('No se pudo cargar el ticket');
        }
        
        const result = await response.json();
        // El backend retorna { ok: true, data: {...} }
        setTicket(result.data || result);
      } catch (e: any) {
        setError(e?.message || 'Error al cargar el ticket');
      } finally {
        setLoading(false);
      }
    };
    
    loadTicket();
  }, [ticketId]);

  const getStatusStep = () => {
    if (!ticket) return 0;
    // Mapear estados a pasos: Enviado=0, En proceso=1, Finalizado=2
    const status = ticket.status?.toLowerCase() || '';
    if (status.includes('finalizado') || status.includes('cerrado')) return 2;
    if (status.includes('proceso') || status.includes('asignado')) return 1;
    return 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">
                Estado de tu Ticket
              </h1>
              {ticketId && (
                <p className="text-lg text-slate-600 mt-2">
                  Ticket <span className="font-bold text-sky-600">#{ticketId}</span>
                </p>
              )}
            </div>
            <img src="/logo.png" alt="logo" className="w-16 h-16 object-contain rounded" />
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-500 border-r-transparent"></div>
            <p className="mt-4 text-slate-600">Cargando información del ticket...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-red-500 text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Error</h2>
            <p className="text-slate-600">{error}</p>
          </div>
        ) : ticket ? (
          <>
            {/* Status Progress Bar */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Estado del Ticket</h2>
              <div className="relative py-8">
                {/* Background line */}
                <div className="absolute left-8 right-8 top-1/2 translate-y-2 h-1 rounded bg-sky-100" />
                
                {/* Animated progress fill */}
                <div className="absolute left-8 right-8 top-1/2 translate-y-2 h-1 rounded overflow-hidden">
                  <div 
                    className="h-1 bg-sky-500 transition-all duration-500" 
                    style={{ width: `${Math.round((getStatusStep() / 2) * 100)}%` }} 
                  />
                </div>

                {/* Steps */}
                <div className="flex items-center justify-between relative">
                  {['Enviado', 'En proceso', 'Finalizado'].map((label, i) => {
                    const currentStep = getStatusStep();
                    const completed = i < currentStep;
                    const active = i === currentStep;
                    
                    return (
                      <div key={label} className="flex-1 flex flex-col items-center z-20">
                        <div className="relative w-full flex items-center justify-center -translate-y-8">
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 border ${
                            completed ? 'bg-sky-500 border-sky-500' : 
                            active ? 'bg-white border-sky-300 border-2' : 
                            'bg-gray-50 border-gray-200'
                          }`}>
                            {completed ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.071 7.071a1 1 0 01-1.414 0L3.293 9.95a1 1 0 011.414-1.414L9 12.828l6.293-6.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                            ) : (
                              <span className={`${active ? 'text-sky-500' : 'text-gray-500'} font-medium`}>{i + 1}</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 text-center">
                          <div className={`font-medium ${active || completed ? 'text-sky-600' : 'text-gray-500'}`}>
                            {label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Ticket Details */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Detalles del Ticket</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-slate-600">Activo</label>
                  <p className="text-slate-900 font-semibold">{ticket.asset_id || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-600">Reportado por</label>
                  <p className="text-slate-900 font-semibold">{ticket.reporter_name || ticket.reporter_email || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-600">Correo</label>
                  <p className="text-slate-900">{ticket.reporter_email || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-600">AnyDesk</label>
                  <p className="text-slate-900 font-mono">{ticket.anydesk || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-600">Operacional</label>
                  <p className="text-slate-900">{ticket.operational || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-600">Fecha de Reporte</label>
                  <p className="text-slate-900">
                    {ticket.created_at ? new Date(ticket.created_at).toLocaleString('es-ES') : 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="text-sm font-medium text-slate-600">Descripción del Problema</label>
                <p className="text-slate-900 mt-1 p-4 bg-slate-50 rounded-lg">{ticket.description || 'N/A'}</p>
              </div>

              {ticket.attachments && ticket.attachments.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-2 block">
                    Archivos Adjuntos ({ticket.attachments.length})
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {ticket.attachments.map((att: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-2 text-center">
                        <div className="text-2xl mb-1">
                          {att.file_type?.startsWith('image/') ? '🖼️' : '🎥'}
                        </div>
                        <p className="text-xs text-slate-600 truncate">{att.file_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Help Text */}
            <div className="mt-6 text-center text-slate-500 text-sm">
              <p>Recibirás actualizaciones por correo cuando tu ticket cambie de estado.</p>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-slate-600">No se encontró información del ticket.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicTicketStatusPage;

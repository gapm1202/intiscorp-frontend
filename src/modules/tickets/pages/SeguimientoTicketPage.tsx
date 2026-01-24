import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getTicketByCodigo, getMensajes, postMensajePortal } from '../services/ticketsService';
import type { Ticket } from '../types';

const STEPS = ['EN ESPERA', 'ABIERTO', 'EN PROCESO', 'RESUELTO'];

function normalizeEstado(raw: string | undefined | null) {
  if (!raw) return '';
  return String(raw).toUpperCase().replace(/[_\s]+/g, ' ').trim();
}

export default function SeguimientoTicketPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chat messages loaded from backend
  const [messages, setMessages] = useState<Array<{ emisor_tipo: string; emisor_nombre?: string; mensaje: string; created_at: string }>>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!codigo) return;
    (async () => {
      try {
        setLoading(true);
        const t = await getTicketByCodigo(codigo);
        setTicket(t as any);
      } catch (err: any) {
        console.error('Error cargando ticket por código:', err);
        setError(err?.response?.data?.message || 'No se encontró el ticket');
      } finally {
        setLoading(false);
      }
    })();
  }, [codigo]);

  // load messages after ticket is fetched and enable polling so messages arrive without reload
  useEffect(() => {
    if (!ticket) return;
    let cancelled = false;
    const fetchMsgs = async () => {
      try {
        const msgs = await getMensajes(ticket.id);
        if (cancelled) return;
        setMessages(Array.isArray(msgs) ? msgs : []);
      } catch (err) {
        console.error('Error cargando mensajes:', err);
        if (!cancelled) setMessages([]);
      }
    };

    fetchMsgs();
    const id = setInterval(fetchMsgs, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, [ticket]);

  // send handler for portal follow-up chat (used by button and Enter key)
  const handleSendPortal = async () => {
    if (!input.trim() || !ticket) return;
    if (!chatEnabled) return;
    try {
      await postMensajePortal(ticket.id, { mensaje: input.trim() });
      const msgs = await getMensajes(ticket.id);
      setMessages(Array.isArray(msgs) ? msgs : []);
      setInput('');
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
    }
  };

  const estado = useMemo(() => normalizeEstado(ticket?.estado || ticket?.estado), [ticket]);

  // Determine active step index
  const activeIndex = useMemo(() => {
    // Map certain backend names to our display steps
    if (!ticket) return 0;
    const raw = normalizeEstado(ticket.estado as any);
    if (raw === 'EN ESPERA' || raw === 'ESPERA' || raw === 'CREADO') return 0;
    if (raw === 'ABIERTO') return 1;
    if (raw === 'EN PROCESO' || raw === 'EN_PROCESO' || raw === 'ENPROCESO') return 2;
    if (raw === 'RESUELTO' || raw === 'FINALIZADO') return 3;
    // fallback: try to find in STEPS
    const idx = STEPS.findIndex(s => s === raw);
    return idx >= 0 ? idx : 0;
  }, [ticket]);

  // System timeline message per spec
  const systemMessage = useMemo(() => {
    if (!ticket) return '';
    const raw = normalizeEstado(ticket.estado as any);
    if (raw === 'EN ESPERA' || raw === 'ESPERA' || raw === 'CREADO') {
      return 'Tu ticket está en espera de atención.';
    }
    if (raw === 'ABIERTO') {
      if (ticket.tecnico_asignado && (ticket.tecnico_asignado as any).nombre) {
        return `Tu ticket ha sido configurado y fue asignado a ${(ticket.tecnico_asignado as any).nombre}. Ten listo tu código de acceso(ej. anydesk,rundesk,etc.)`;
      }
      return 'Tu ticket está siendo visualizado, en breve se te asignará un técnico. Ten listo tu código de acceso(ej. anydesk,rundesk,etc.)';
    }
    if (raw === 'EN PROCESO' || raw === 'EN_PROCESO') {
      return 'Tu ticket esta en Proceso. Escríbenos si olvidaste comentar algo adicional.';
    }
    if (raw === 'RESUELTO') {
      return 'Tu ticket ha sido resuelto. Gracias por contactarnos.';
    }
    return '';
  }, [ticket]);

  // Chat rules
  const chatEnabled = useMemo(() => {
    if (!ticket) return false;
    const raw = normalizeEstado(ticket.estado as any);
    if (raw === 'EN PROCESO') return true;
    return false;
  }, [ticket]);

  const chatReadOnly = useMemo(() => {
    if (!ticket) return true;
    const raw = normalizeEstado(ticket.estado as any);
    if (raw === 'RESUELTO') return true;
    if (raw === 'EN PROCESO') return false;
    return true; // EN ESPERA, ABIERTO -> disabled
  }, [ticket]);

  // Initialize messages with the system/support message when ticket loads.
  useEffect(() => {
    if (!ticket) return;
    // If there are no messages yet, seed with a SISTEMA message (backend-shaped)
    setMessages(prev => {
      if (prev.length === 0) {
        return [{ emisor_tipo: 'SISTEMA', emisor_nombre: 'INTISOFT', mensaje: systemMessage, created_at: new Date().toISOString() }];
      }
      // If the first message is a SISTEMA message, keep it in sync
      if (prev[0] && String(prev[0].emisor_tipo || '').toUpperCase() === 'SISTEMA') {
        const copy = [...prev];
        copy[0] = { ...copy[0], mensaje: systemMessage };
        return copy;
      }
      return prev;
    });
  }, [ticket, systemMessage]);

  const handleSend = () => {
    if (!input.trim()) return;
    if (!chatEnabled) return;
    const msg = { from: 'client' as const, text: input.trim(), at: new Date().toISOString() };
    setMessages(prev => [...prev, msg]);
    setInput('');
    // NOTE: integration with backend can be added here later
  };

  if (loading) return <div className="p-6">Cargando ticket...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!ticket) return <div className="p-6">Ticket no encontrado</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-sky-500 p-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Seguimiento de ticket</h1>
          <p className="text-sm text-blue-100 mt-1">Código: <span className="font-medium">{ticket.codigo_ticket || codigo}</span></p>
        </div>

        <div className="p-6 space-y-6">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between gap-4 relative">
              {STEPS.map((s, idx) => {
                const isActive = idx === activeIndex;
                const isDone = idx < activeIndex;
                return (
                  <div key={s} className="flex-1 z-10 text-center">
                    <div className="relative">
                      <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-500 ${isActive ? 'bg-white text-blue-600 shadow-lg scale-105' : isDone ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                        <span className={`font-semibold ${isActive ? 'text-xl' : 'text-sm'}`}>{idx + 1}</span>
                      </div>
                    </div>
                    <div className={`text-sm ${isActive ? 'text-sky-700 font-semibold' : isDone ? 'text-sky-600' : 'text-gray-500'}`}>{s}</div>
                  </div>
                );
              })}
            </div>

            {/* connector line */}
            <div className="relative h-2 mt-4">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full h-1 bg-gray-200 rounded" />
                <div className="absolute left-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-blue-600 rounded transition-all duration-700" style={{ width: `${(activeIndex) / (STEPS.length - 1) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* System timeline message */}
          <div>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
              <p className="text-gray-800 text-sm whitespace-pre-line">{systemMessage}</p>
            </div>
          </div>

          {/* Chat area */}
          <div>
            <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
              <h2 className="text-lg font-medium text-slate-700 mb-3">Mensajes</h2>

              <div className="h-[70vh] overflow-y-auto mb-3 flex flex-col gap-3 px-1">
                {messages.map((m, i) => {
                  const tipo = String(m.emisor_tipo || '').toUpperCase();
                  const isSistema = tipo === 'SISTEMA';
                  const isCliente = tipo === 'CLIENTE';
                  const isTecnico = tipo === 'TECNICO';
                  // Render rules: SISTEMA centered, TECNICO left, CLIENTE right
                  const align = isSistema ? 'self-center' : isTecnico ? 'self-start' : 'self-end';
                  const bubble = isSistema ? 'bg-gray-100 text-gray-700' : isTecnico ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white' : 'bg-sky-50 border border-sky-100 text-sky-800';
                  return (
                    <div key={i} className={`max-w-xl p-3 rounded-lg ${align} ${bubble}`}>
                      {m.emisor_nombre && <strong className="block text-sm">{m.emisor_nombre}</strong>}
                      <div className="text-sm mt-1 whitespace-pre-line">{m.mensaje}</div>
                      <div className={`text-xs mt-2 ${isSistema ? 'text-gray-500 text-center' : isTecnico ? 'text-white/70 text-left' : 'text-gray-500 text-right'}`}>{new Date(m.created_at).toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      await handleSendPortal();
                    }
                  }}
                  disabled={!chatEnabled}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300"
                  placeholder={!chatEnabled ? 'Chat deshabilitado en este estado' : 'Escribe tu mensaje...'}
                />
                <button type="button" onClick={handleSendPortal} disabled={!chatEnabled || !input.trim()} className={`px-4 py-2 rounded-md text-sm font-medium transition ${chatEnabled ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Enviar</button>
              </div>

              <p className="text-xs text-gray-500 mt-3">Reglas: El chat está habilitado solo cuando el ticket está en estado <strong>EN PROCESO</strong>. En otros estados está deshabilitado o solo lectura.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

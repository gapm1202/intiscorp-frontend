interface HistorialItem {
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  motivo?: string;
  fecha: string;
  usuario: string;
  tipoAccion?: string;
  contractId?: string;
}

interface Props {
  historial: HistorialItem[];
  onVerDetalles?: (contratoId: string) => void;
}

function formatDate(d?: string): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
}

const TIPO_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  CREACION: { label: 'Creación', color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  RENOVACION: { label: 'Renovación', color: 'bg-sky-100 text-sky-800', dot: 'bg-sky-500' },
  EDICION: { label: 'Edición', color: 'bg-blue-100 text-blue-800', dot: 'bg-blue-400' },
  ELIMINACION: { label: 'Eliminación', color: 'bg-red-100 text-red-800', dot: 'bg-red-400' },
};

export default function ContratoHistorialVersiones({ historial, onVerDetalles }: Props) {
  if (historial.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">📜</p>
        <p className="text-slate-500 font-medium text-sm">No hay registros en el historial aún.</p>
        <p className="text-xs text-slate-400 mt-1">Los cambios y renovaciones aparecerán aquí automáticamente.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

      <div className="space-y-4 pl-14">
        {historial.map((item, idx) => {
          const tipo = item.tipoAccion || 'EDICION';
          const cfg = TIPO_CONFIG[tipo] || TIPO_CONFIG['EDICION'];
          const isCreationOrRenewal = tipo === 'CREACION' || tipo === 'RENOVACION';

          return (
            <div key={idx} className="relative">
              {/* Timeline dot */}
              <div className={`absolute -left-[42px] top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm ${cfg.dot}`} />

              <div className={`bg-white rounded-xl border shadow-sm p-4 transition-all hover:shadow-md ${isCreationOrRenewal ? 'border-sky-200' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-sm font-semibold text-slate-800 truncate">{item.campo}</span>
                    </div>

                    {(item.valorAnterior || item.valorNuevo) && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                        {item.valorAnterior && item.valorAnterior !== '—' && (
                          <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded line-through">{item.valorAnterior}</span>
                        )}
                        {item.valorAnterior && item.valorAnterior !== '—' && item.valorNuevo && item.valorNuevo !== '—' && (
                          <span className="text-slate-400">→</span>
                        )}
                        {item.valorNuevo && item.valorNuevo !== '—' && (
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">{item.valorNuevo}</span>
                        )}
                      </div>
                    )}

                    {item.motivo && (
                      <p className="text-xs text-slate-400 italic">"{item.motivo}"</p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span>🕐 {formatDate(item.fecha)}</span>
                      {item.usuario && <span>👤 {item.usuario}</span>}
                    </div>
                  </div>

                  {isCreationOrRenewal && item.contractId && onVerDetalles && (
                    <button
                      onClick={() => onVerDetalles(item.contractId!)}
                      className="flex-shrink-0 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors border border-blue-200 flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ver detalles
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

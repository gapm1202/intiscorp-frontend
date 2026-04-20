import { useState } from 'react';

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
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const TIPO_CONFIG: Record<string, { label: string; color: string; dot: string; border: string }> = {
  CREACION:   { label: 'Creación',   color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  RENOVACION: { label: 'Renovación', color: 'bg-sky-100 text-sky-800',         dot: 'bg-sky-500',     border: 'border-sky-200' },
  EDICION:    { label: 'Edición',    color: 'bg-blue-100 text-blue-700',        dot: 'bg-blue-400',    border: 'border-slate-200' },
  ELIMINACION:{ label: 'Eliminación',color: 'bg-red-100 text-red-800',          dot: 'bg-red-400',     border: 'border-red-200' },
};

// ─── Group items: CREACION/RENOVACION are standalone; EDICION grouped by motivo ───
interface HistorialGroup {
  tipo: string;
  titulo: string;
  motivo?: string;
  fecha: string;
  usuario: string;
  contractId?: string;
  /** Null for CREACION/RENOVACION, array for EDICION groups */
  campos: HistorialItem[] | null;
  valorAnterior?: string;
  valorNuevo?: string;
}

function buildGroups(items: HistorialItem[]): HistorialGroup[] {
  const groups: HistorialGroup[] = [];
  const edicionByMotivo = new Map<string, HistorialItem[]>();

  for (const item of items) {
    const tipo = (item.tipoAccion || 'EDICION').toUpperCase();
    if (tipo === 'CREACION' || tipo === 'RENOVACION') {
      groups.push({
        tipo,
        titulo: item.campo || (tipo === 'CREACION' ? 'Creación del Contrato' : 'Renovación del Contrato'),
        motivo: item.motivo,
        fecha: item.fecha,
        usuario: item.usuario,
        contractId: item.contractId,
        campos: null,
        valorAnterior: item.valorAnterior,
        valorNuevo: item.valorNuevo,
      });
    } else {
      // Group EDICION by motivo (fall back to 'sin motivo')
      const key = item.motivo || 'sin motivo';
      if (!edicionByMotivo.has(key)) edicionByMotivo.set(key, []);
      edicionByMotivo.get(key)!.push(item);
    }
  }

  // Append EDICION groups sorted by first item date descending
  for (const [motivo, campos] of edicionByMotivo.entries()) {
    groups.push({
      tipo: 'EDICION',
      titulo: `${campos.length} campo${campos.length > 1 ? 's' : ''} modificado${campos.length > 1 ? 's' : ''}`,
      motivo,
      fecha: campos[0].fecha,
      usuario: campos[0].usuario,
      campos,
    });
  }

  return groups;
}


export default function ContratoHistorialVersiones({ historial, onVerDetalles }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const groups = buildGroups(historial);

  if (groups.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">📜</p>
        <p className="text-slate-500 font-medium text-sm">No hay registros en el historial aún.</p>
        <p className="text-xs text-slate-400 mt-1">Los cambios y renovaciones aparecerán aquí automáticamente.</p>
      </div>
    );
  }

  const toggle = (idx: number) =>
    setExpanded((prev) => { const s = new Set(prev); s.has(idx) ? s.delete(idx) : s.add(idx); return s; });

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

      <div className="space-y-4 pl-14">
        {groups.map((group, idx) => {
          const cfg = TIPO_CONFIG[group.tipo] || TIPO_CONFIG['EDICION'];
          const isMain = group.tipo === 'CREACION' || group.tipo === 'RENOVACION';
          const isOpen = expanded.has(idx);

          return (
            <div key={idx} className="relative">
              {/* Timeline dot */}
              <div className={`absolute -left-[42px] top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm ${cfg.dot}`} />

              <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${isMain ? cfg.border : 'border-slate-100'}`}>
                {/* Header row */}
                <div
                  className={`flex items-start justify-between gap-3 p-4 ${group.campos ? 'cursor-pointer select-none' : ''}`}
                  onClick={() => group.campos && toggle(idx)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-sm font-semibold text-slate-800">{group.titulo}</span>
                    </div>

                    {/* CREACION/RENOVACION: show valorNuevo as description */}
                    {isMain && group.valorNuevo && group.valorNuevo !== '—' && (
                      <p className="text-xs text-slate-500 mb-1">{group.valorNuevo}</p>
                    )}

                    {group.motivo && (
                      <p className="text-xs text-slate-400 italic mb-1">"{group.motivo}"</p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>🕐 {formatDate(group.fecha)}</span>
                      <span>👤 {group.usuario}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isMain && group.contractId && onVerDetalles && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onVerDetalles(group.contractId!); }}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors border border-blue-200 flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver detalles
                      </button>
                    )}
                    {group.campos && (
                      <span className="text-slate-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                    )}
                  </div>
                </div>

                {/* Expandable field changes */}
                {group.campos && isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                    {group.campos.map((c, ci) => (
                      <div key={ci} className="flex items-start gap-3 text-xs py-1.5 border-b border-slate-100 last:border-0">
                        <span className="font-semibold text-slate-600 min-w-[140px] shrink-0">{c.campo}</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {c.valorAnterior && c.valorAnterior !== '—' && (
                            <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded line-through">{c.valorAnterior}</span>
                          )}
                          {c.valorAnterior && c.valorAnterior !== '—' && c.valorNuevo && c.valorNuevo !== '—' && (
                            <span className="text-slate-400">→</span>
                          )}
                          {c.valorNuevo && c.valorNuevo !== '—' && (
                            <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium">{c.valorNuevo}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

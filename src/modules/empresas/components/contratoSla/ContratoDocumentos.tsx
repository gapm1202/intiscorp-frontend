import type { DocumentoContrato } from './types';

interface Props {
  documentos: DocumentoContrato[];
  contratoId?: string;
  onUpload: (files: File[], tipo: string) => Promise<void>;
  onDelete?: (docId: string) => Promise<void>;
  uploading?: boolean;
}

function formatDate(d?: string): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
}

const TIPO_LABELS: Record<string, { label: string; icon: string }> = {
  auto: { label: 'Generado', icon: '🤖' },
  contrato_principal: { label: 'Contrato Principal', icon: '📄' },
  contrato_firmado: { label: 'Contrato Firmado', icon: '✍️' },
  anexo: { label: 'Anexo', icon: '📎' },
  addenda: { label: 'Addenda', icon: '✏️' },
  manual: { label: 'Manual', icon: '📁' },
  otro: { label: 'Otro', icon: '📋' },
};

export default function ContratoDocumentos({ documentos, onUpload, onDelete, uploading = false }: Props) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await onUpload(Array.from(files), 'manual');
    e.target.value = '';
  };

  const autoDocs = documentos.filter(d => d.tipo === 'auto' || d.tipo === 'contrato_principal');
  const manualDocs = documentos.filter(d => d.tipo !== 'auto' && d.tipo !== 'contrato_principal');

  const DocCard = ({ doc }: { doc: DocumentoContrato }) => {
    const t = TIPO_LABELS[doc.tipo] || TIPO_LABELS['otro'];
    return (
      <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
        <div className="text-2xl flex-shrink-0">{t.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{doc.nombre || doc.archivo || 'Documento'}</p>
          <p className="text-xs text-slate-400 mt-0.5">{formatDate(doc.fecha)}</p>
          {doc.usuario && <p className="text-xs text-slate-400">Por: {doc.usuario}</p>}
          {doc.hash && (
            <p className="text-[10px] text-slate-300 font-mono mt-1 truncate" title={doc.hash}>
              SHA: {doc.hash.substring(0, 20)}...
            </p>
          )}
          <span className="inline-block mt-1.5 text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{t.label}</span>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          {doc.url && (
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1"
            >
              ⬇️ Descargar
            </a>
          )}
          {onDelete && doc.tipo !== 'auto' && doc.tipo !== 'contrato_principal' && (
            <button
              onClick={() => onDelete(String(doc._id || doc.id))}
              className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
            >
              🗑️ Eliminar
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Auto-generated documents */}
      <div>
        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          🤖 Documentos Generados Automáticamente
          <span className="text-xs font-normal text-slate-400">({autoDocs.length})</span>
        </h4>
        {autoDocs.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
            <p className="text-sm text-slate-400">No hay documentos generados automáticamente.</p>
            <p className="text-xs text-slate-300 mt-1">Se generarán al guardar el contrato.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {autoDocs.map(d => <DocCard key={d._id || d.id || d.nombre} doc={d} />)}
          </div>
        )}
      </div>

      {/* Manual documents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            📁 Documentos Subidos Manualmente
            <span className="text-xs font-normal text-slate-400">({manualDocs.length})</span>
          </h4>
          <label className="cursor-pointer">
            <input type="file" multiple accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange} disabled={uploading} />
            <span className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              uploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
            }`}>
              {uploading ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Subiendo...
                </>
              ) : (
                <>+ Subir documento</>
              )}
            </span>
          </label>
        </div>

        {manualDocs.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
            <p className="text-2xl mb-2">📄</p>
            <p className="text-sm text-slate-500 font-medium">No hay documentos subidos manualmente</p>
            <p className="text-xs text-slate-400 mt-1">Suba contratos firmados, addendas o anexos adicionales.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {manualDocs.map(d => <DocCard key={d._id || d.id || d.nombre} doc={d} />)}
          </div>
        )}
      </div>
    </div>
  );
}

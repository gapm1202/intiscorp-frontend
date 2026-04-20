import { useState } from 'react';
import type { ContratoVersion, DocumentoContrato } from './types';
import ContratoVersionActiva from './ContratoVersionActiva';
import ContratoHistorialVersiones from './ContratoHistorialVersiones';
import ContratoDocumentos from './ContratoDocumentos';

type InnerTab = 'activa' | 'historial' | 'documentos';

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
  contratoActivo: ContratoVersion;
  historial: HistorialItem[];
  documentos: DocumentoContrato[];
  mostrarBotonRenovar: boolean;
  onRenovar: () => void;
  onUploadDoc: (files: File[], tipo: string) => Promise<void>;
  onDeleteDoc?: (docId: string) => Promise<void>;
  onVerDetalles?: (contratoId: string) => void;
  uploadingDoc?: boolean;
}

const INNER_TABS: Array<{ id: InnerTab; label: string; icon: string }> = [
  { id: 'activa', label: 'Versión Activa', icon: '🟢' },
  { id: 'historial', label: 'Historial de Versiones', icon: '🕘' },
  { id: 'documentos', label: 'Documentos', icon: '📂' },
];

export default function ContratoSlaView({
  contratoActivo,
  historial,
  documentos,
  mostrarBotonRenovar,
  onRenovar,
  onUploadDoc,
  onDeleteDoc,
  onVerDetalles,
  uploadingDoc = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<InnerTab>('activa');

  return (
    <div className="space-y-0">
      {/* Inner tab navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-5">
        <div className="flex items-center gap-1 p-2 overflow-x-auto">
          {INNER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.id === 'historial' && historial.length > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-600'
                }`}>{historial.length}</span>
              )}
              {tab.id === 'documentos' && documentos.length > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-600'
                }`}>{documentos.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'activa' && (
          <ContratoVersionActiva
            contrato={contratoActivo}
            onRenovar={onRenovar}
            mostrarBotonRenovar={mostrarBotonRenovar}
          />
        )}
        {activeTab === 'historial' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <span className="text-xl">🕘</span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Historial de Versiones</h3>
                <p className="text-xs text-slate-400 mt-0.5">Registro de cambios y renovaciones del contrato</p>
              </div>
            </div>
            <ContratoHistorialVersiones historial={historial} onVerDetalles={onVerDetalles} />
          </div>
        )}
        {activeTab === 'documentos' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <span className="text-xl">📂</span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Documentos del Contrato</h3>
                <p className="text-xs text-slate-400 mt-0.5">Documentos generados y subidos manualmente</p>
              </div>
            </div>
            <ContratoDocumentos
              documentos={documentos}
              contratoId={contratoActivo.id}
              onUpload={onUploadDoc}
              onDelete={onDeleteDoc}
              uploading={uploadingDoc}
            />
          </div>
        )}
      </div>
    </div>
  );
}

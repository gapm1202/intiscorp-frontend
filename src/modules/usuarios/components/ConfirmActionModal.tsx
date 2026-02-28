import { useState } from 'react';

interface ConfirmActionModalProps {
  isOpen: boolean;
  usuarioNombre: string;
  willActivate: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => Promise<void>;
}

export default function ConfirmActionModal({ isOpen, usuarioNombre, willActivate, onClose, onConfirm }: ConfirmActionModalProps) {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const title = willActivate ? 'Activar usuario' : 'Desactivar usuario';
  const accent = willActivate ? 'from-green-400 to-emerald-600' : 'from-red-400 to-rose-600';

  const submit = async () => {
    if (!motivo.trim()) return alert('Por favor ingresa el motivo');
    setLoading(true);
    try {
      await onConfirm(motivo.trim());
      setMotivo('');
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error realizando la acción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(2,6,23,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        <div className={`px-6 py-4 bg-gradient-to-r ${accent} text-white`}> 
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
              {willActivate ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="text-sm opacity-90">¿Estás seguro de {willActivate ? 'activar' : 'desactivar'} a <span className="font-semibold">{usuarioNombre}</span>?</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Motivo</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
            placeholder="Describe brevemente el motivo de la acción"
          />

          <div className="mt-4 text-sm text-slate-600">Esta acción quedará registrada en el historial del usuario.</div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button onClick={() => { setMotivo(''); onClose(); }} disabled={loading} className="px-4 py-2 border rounded-lg hover:bg-slate-50">Cancelar</button>
            <button onClick={submit} disabled={loading} className={`px-5 py-2 rounded-lg text-white font-semibold ${willActivate ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
              {loading ? 'Procesando...' : willActivate ? 'Activar' : 'Desactivar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

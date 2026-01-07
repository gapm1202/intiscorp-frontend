import { useState, useEffect } from 'react';

interface Protocolo {
  id?: string;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

interface ProtocoloFormProps {
  protocolo?: Protocolo | null;
  onSave: (data: Partial<Protocolo>) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function ProtocoloForm({ protocolo, onSave, onCancel, isSaving }: ProtocoloFormProps) {
  const [formData, setFormData] = useState<Partial<Protocolo>>({
    nombre: '',
    descripcion: '',
    activo: true,
  });

  useEffect(() => {
    if (protocolo) {
      setFormData({
        nombre: protocolo.nombre,
        descripcion: protocolo.descripcion || '',
        activo: protocolo.activo,
      });
    }
  }, [protocolo]);

  // Autogenerar código desde el nombre
  useEffect(() => {
    if (formData.nombre && formData.nombre.trim() && !protocolo) {
      const firstWord = formData.nombre.trim().split(' ')[0];
      const abbreviation = firstWord.substring(0, 5).toUpperCase();
      const generatedCode = `PROT-${abbreviation}`;
      
      setFormData(prev => ({ ...prev, codigo: generatedCode }));
    }
  }, [formData.nombre, protocolo]);

  const handleChange = (field: keyof Protocolo, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre?.trim()) {
      alert('Por favor ingrese el nombre del protocolo');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6 border-b border-blue-500">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {protocolo ? 'Editar Protocolo' : 'Nuevo Protocolo'}
          </h2>
          <p className="text-blue-100 text-sm mt-1">Configure los protocolos de acceso al correo electrónico</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Código autogenerado */}
          {!protocolo && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Código
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.codigo || 'PROT-'}
                  disabled
                  className="w-full px-4 py-3 pr-24 border-2 border-blue-300 rounded-lg bg-blue-50 text-blue-900 font-mono font-bold cursor-not-allowed"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-bold">
                  AUTO
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Se genera automáticamente desde el nombre del protocolo
              </p>
            </div>
          )}

          {/* Nombre del protocolo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre del protocolo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Ej. Exchange"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nombre del protocolo de acceso o autenticación
            </p>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => handleChange('descripcion', e.target.value)}
              placeholder="Ej. Protocolo de sincronización de correo Microsoft Exchange"
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Descripción técnica del protocolo y su funcionalidad
            </p>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Estado
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-3 px-5 py-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
                style={{
                  borderColor: formData.activo ? '#10b981' : '#d1d5db',
                  backgroundColor: formData.activo ? '#f0fdf4' : 'transparent'
                }}>
                <input
                  type="radio"
                  name="activo"
                  checked={formData.activo === true}
                  onChange={() => handleChange('activo', true)}
                  className="w-4 h-4 text-green-600 focus:ring-green-500"
                />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="font-medium text-gray-700">Activo</span>
                </div>
              </label>

              <label className="flex items-center gap-3 px-5 py-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
                style={{
                  borderColor: formData.activo === false ? '#ef4444' : '#d1d5db',
                  backgroundColor: formData.activo === false ? '#fef2f2' : 'transparent'
                }}>
                <input
                  type="radio"
                  name="activo"
                  checked={formData.activo === false}
                  onChange={() => handleChange('activo', false)}
                  className="w-4 h-4 text-red-600 focus:ring-red-500"
                />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="font-medium text-gray-700">Inactivo</span>
                </div>
              </label>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

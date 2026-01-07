import { useState, useEffect } from 'react';

interface TipoCorreo {
  id?: string;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

interface TipoCorreoFormProps {
  tipo?: TipoCorreo | null;
  onSave: (data: Partial<TipoCorreo>) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function TipoCorreoForm({ tipo, onSave, onCancel, isSaving }: TipoCorreoFormProps) {
  const [formData, setFormData] = useState<Partial<TipoCorreo>>({
    nombre: '',
    descripcion: '',
    activo: true,
  });

  useEffect(() => {
    if (tipo) {
      setFormData({
        nombre: tipo.nombre,
        descripcion: tipo.descripcion || '',
        activo: tipo.activo,
      });
    }
  }, [tipo]);

  // Autogenerar código desde el nombre
  useEffect(() => {
    if (formData.nombre && formData.nombre.trim() && !tipo) {
      const firstWord = formData.nombre.trim().split(' ')[0];
      const abbreviation = firstWord.substring(0, 5).toUpperCase();
      const generatedCode = `TP-${abbreviation}`;
      
      setFormData(prev => ({ ...prev, codigo: generatedCode }));
    }
  }, [formData.nombre, tipo]);

  const handleChange = (field: keyof TipoCorreo, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre?.trim()) {
      alert('Por favor ingrese el nombre del tipo de correo');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-6 border-b border-purple-500">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            {tipo ? 'Editar Tipo de Correo' : 'Nuevo Tipo de Correo'}
          </h2>
          <p className="text-purple-100 text-sm mt-1">Define las categorías para clasificar los correos electrónicos</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Código autogenerado */}
          {!tipo && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Código
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.codigo || 'TP-'}
                  disabled
                  className="w-full px-4 py-3 pr-24 border-2 border-purple-300 rounded-lg bg-purple-50 text-purple-900 font-mono font-bold cursor-not-allowed"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-purple-600 text-white px-3 py-1 rounded-md text-xs font-bold">
                  AUTO
                </span>
              </div>
              <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Se genera automáticamente desde el nombre del tipo
              </p>
            </div>
          )}

          {/* Nombre del tipo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre del tipo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Ej. Corporativo"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nombre identificativo del tipo de correo
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
              placeholder="Ej. Uso laboral"
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Describe el propósito o uso de este tipo de correo
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
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
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

import { useState, useEffect } from 'react';

interface PlataformaCorreo {
  id?: string;
  codigo?: string;
  nombre: string;
  tipoPlataforma: string;
  tipoPlataformaPersonalizado?: string;
  permiteReasignar: boolean;
  permiteConservar: boolean;
  observaciones?: string;
  activo: boolean;
}

interface PlataformaCorreoFormProps {
  plataforma?: PlataformaCorreo | null;
  onSave: (data: Partial<PlataformaCorreo>) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function PlataformaCorreoForm({ plataforma, onSave, onCancel, isSaving }: PlataformaCorreoFormProps) {
  const [formData, setFormData] = useState<Partial<PlataformaCorreo>>({
    nombre: '',
    tipoPlataforma: 'Cloud',
    tipoPlataformaPersonalizado: '',
    permiteReasignar: true,
    permiteConservar: true,
    observaciones: '',
    activo: true,
  });

  useEffect(() => {
    if (plataforma) {
      setFormData({
        nombre: plataforma.nombre,
        tipoPlataforma: plataforma.tipoPlataforma,
        tipoPlataformaPersonalizado: plataforma.tipoPlataformaPersonalizado || '',
        permiteReasignar: plataforma.permiteReasignar,
        permiteConservar: plataforma.permiteConservar,
        observaciones: plataforma.observaciones || '',
        activo: plataforma.activo,
      });
    }
  }, [plataforma]);

  // Autogenerar código desde el nombre
  useEffect(() => {
    if (formData.nombre && formData.nombre.trim() && !plataforma) {
      const firstWord = formData.nombre.trim().split(' ')[0];
      const abbreviation = firstWord.substring(0, 5).toUpperCase();
      const generatedCode = `PLAT-${abbreviation}`;
      
      setFormData(prev => ({ ...prev, codigo: generatedCode }));
    }
  }, [formData.nombre, plataforma]);

  const handleChange = (field: keyof PlataformaCorreo, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre?.trim()) {
      alert('Por favor ingrese el nombre de la plataforma');
      return;
    }

    if (formData.tipoPlataforma === 'Otro' && !formData.tipoPlataformaPersonalizado?.trim()) {
      alert('Por favor especifique el tipo de plataforma');
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            {plataforma ? 'Editar Plataforma' : 'Nueva Plataforma'}
          </h2>
          <p className="text-purple-100 text-sm mt-1">Configure las plataformas de correo electrónico del sistema</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Código autogenerado */}
          {!plataforma && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Código
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.codigo || 'PLAT-'}
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
                Se genera automáticamente desde el nombre de la plataforma
              </p>
            </div>
          )}

          {/* Nombre de la plataforma */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre de la Plataforma <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Ej. Microsoft 365"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nombre de la plataforma de correo electrónico
            </p>
          </div>

          {/* Tipo de plataforma */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo de Plataforma <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.tipoPlataforma}
              onChange={(e) => {
                handleChange('tipoPlataforma', e.target.value);
                if (e.target.value !== 'Otro') {
                  handleChange('tipoPlataformaPersonalizado', '');
                }
              }}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            >
              <option value="Cloud">Cloud</option>
              <option value="On-Premise">On-Premise</option>
              <option value="Otro">Otro</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Seleccione el tipo de infraestructura de la plataforma
            </p>
          </div>

          {/* Campo para tipo personalizado */}
          {formData.tipoPlataforma === 'Otro' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Especificar Tipo de Plataforma <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.tipoPlataformaPersonalizado}
                onChange={(e) => handleChange('tipoPlataformaPersonalizado', e.target.value)}
                placeholder="Ej. Híbrido, Local, etc."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              />
              <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Especifique el tipo de plataforma personalizado
              </p>
            </div>
          )}

          {/* Permisos */}
          <div className="space-y-4">
            {/* ¿Permite reasignar buzón? */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                ¿Permite reasignar buzón?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-3 px-5 py-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
                  style={{
                    borderColor: formData.permiteReasignar ? '#10b981' : '#d1d5db',
                    backgroundColor: formData.permiteReasignar ? '#f0fdf4' : 'transparent'
                  }}>
                  <input
                    type="radio"
                    name="permiteReasignar"
                    checked={formData.permiteReasignar === true}
                    onChange={() => handleChange('permiteReasignar', true)}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-medium text-gray-700">Sí</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 px-5 py-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
                  style={{
                    borderColor: formData.permiteReasignar === false ? '#ef4444' : '#d1d5db',
                    backgroundColor: formData.permiteReasignar === false ? '#fef2f2' : 'transparent'
                  }}>
                  <input
                    type="radio"
                    name="permiteReasignar"
                    checked={formData.permiteReasignar === false}
                    onChange={() => handleChange('permiteReasignar', false)}
                    className="w-4 h-4 text-red-600 focus:ring-red-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="font-medium text-gray-700">No</span>
                  </div>
                </label>
              </div>
            </div>

            {/* ¿Permite conservar correos? */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                ¿Permite conservar correos al reasignar?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-3 px-5 py-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
                  style={{
                    borderColor: formData.permiteConservar ? '#10b981' : '#d1d5db',
                    backgroundColor: formData.permiteConservar ? '#f0fdf4' : 'transparent'
                  }}>
                  <input
                    type="radio"
                    name="permiteConservar"
                    checked={formData.permiteConservar === true}
                    onChange={() => handleChange('permiteConservar', true)}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-medium text-gray-700">Sí</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 px-5 py-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
                  style={{
                    borderColor: formData.permiteConservar === false ? '#ef4444' : '#d1d5db',
                    backgroundColor: formData.permiteConservar === false ? '#fef2f2' : 'transparent'
                  }}>
                  <input
                    type="radio"
                    name="permiteConservar"
                    checked={formData.permiteConservar === false}
                    onChange={() => handleChange('permiteConservar', false)}
                    className="w-4 h-4 text-red-600 focus:ring-red-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="font-medium text-gray-700">No</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              placeholder="Notas adicionales sobre la plataforma..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Información adicional o comentarios relevantes
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

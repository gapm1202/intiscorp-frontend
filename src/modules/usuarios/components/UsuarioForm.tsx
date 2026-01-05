import { useState, useEffect } from 'react';
import type { Usuario } from '../services/usuariosService';
import { getSedesByEmpresa } from '@/modules/empresas/services/sedesService';
import { getInventarioByEmpresa, getInventarioBySede } from '@/modules/inventario/services/inventarioService';

interface UsuarioFormProps {
  empresaId: string;
  empresaNombre: string;
  usuario?: Usuario | null;
  onSave: (data: Partial<Usuario>) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function UsuarioForm({ empresaId, empresaNombre, usuario, onSave, onCancel, isSaving }: UsuarioFormProps) {
  const [formData, setFormData] = useState<Partial<Usuario>>({
    empresaId,
    sedeId: '',
    nombreCompleto: '',
    correo: '',
    cargo: '',
    telefono: '',
    observaciones: '',
    activoAsignadoId: '',
  });

  const [motivo, setMotivo] = useState<string>('');  // Campo separado para motivo de edición
  const [sinActivo, setSinActivo] = useState(false);
  const [activosSeleccionados, setActivosSeleccionados] = useState<string[]>([]);  // Array para múltiples activos

  const [sedes, setSedes] = useState<any[]>([]);
  const [activos, setActivos] = useState<any[]>([]);
  const [loadingSedes, setLoadingSedes] = useState(false);
  const [loadingActivos, setLoadingActivos] = useState(false);

  useEffect(() => {
    if (usuario) {
      setFormData({
        empresaId: usuario.empresaId,
        sedeId: usuario.sedeId,
        nombreCompleto: usuario.nombreCompleto,
        correo: usuario.correo,
        cargo: usuario.cargo || '',
        telefono: usuario.telefono || '',
        observaciones: usuario.observaciones || '',
        activoAsignadoId: usuario.activoAsignadoId || '',
      });
      // Si el usuario no tiene activo asignado, marcar "sin activo"
      setSinActivo(!usuario.activoAsignadoId);
    }
  }, [usuario]);

  useEffect(() => {
    const loadSedes = async () => {
      setLoadingSedes(true);
      try {
        const data = await getSedesByEmpresa(empresaId);
        const sedesArray = Array.isArray(data) ? data : data?.data || [];
        setSedes(sedesArray.filter((s: any) => s.activo !== false));
      } catch (error) {
        console.error('Error cargando sedes:', error);
      } finally {
        setLoadingSedes(false);
      }
    };

    loadSedes();
  }, [empresaId]);

  // Cargar activos cuando cambie la sede seleccionada
  useEffect(() => {
    const loadActivos = async () => {
      if (!formData.sedeId) {
        // Si no hay sede seleccionada, cargar todos los activos de la empresa
        setLoadingActivos(true);
        try {
          const data = await getInventarioByEmpresa(empresaId);
          const activosArray = Array.isArray(data) ? data : data?.data || [];
          // Filtrar solo activos sin asignar o el activo actual del usuario
          const activosDisponibles = activosArray.filter((a: any) => 
            !a.usuarioAsignado || a.id === usuario?.activoAsignadoId || a._id === usuario?.activoAsignadoId
          );
          setActivos(activosDisponibles);
        } catch (error) {
          console.error('Error cargando activos:', error);
          setActivos([]);
        } finally {
          setLoadingActivos(false);
        }
        return;
      }

      // Si hay sede seleccionada, cargar solo activos de esa sede
      setLoadingActivos(true);
      try {
        const data = await getInventarioBySede(empresaId, formData.sedeId);
        const activosArray = Array.isArray(data) ? data : data?.data || [];
        // Filtrar solo activos sin asignar o el activo actual del usuario
        const activosDisponibles = activosArray.filter((a: any) => 
          !a.usuarioAsignado || a.id === usuario?.activoAsignadoId || a._id === usuario?.activoAsignadoId
        );
        setActivos(activosDisponibles);
      } catch (error) {
        console.error('Error cargando activos de la sede:', error);
        setActivos([]);
      } finally {
        setLoadingActivos(false);
      }
    };

    loadActivos();
  }, [empresaId, formData.sedeId, usuario]);

  const handleChange = (field: keyof Usuario, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.sedeId) {
      alert('Por favor seleccione una sede');
      return;
    }
    if (!formData.nombreCompleto?.trim()) {
      alert('Por favor ingrese el nombre completo');
      return;
    }
    if (!formData.correo?.trim()) {
      alert('Por favor ingrese el correo electrónico');
      return;
    }
    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.correo)) {
      alert('Por favor ingrese un correo electrónico válido');
      return;
    }

    // Si es edición, validar que haya motivo
    if (usuario && (!motivo || motivo.trim().length < 10)) {
      alert('Por favor ingrese el motivo de la edición (mínimo 10 caracteres)');
      return;
    }

    // Preparar datos: si es nuevo usuario y tiene múltiples activos seleccionados, enviarlos
    const dataToSave = {
      ...formData,
      // Si no es edición y tiene activos seleccionados, enviarlos como array
      ...((!usuario && activosSeleccionados.length > 0) ? { activosIds: activosSeleccionados } : {}),
      // Mantener compatibilidad: si solo seleccionó 1, también enviarlo en activoAsignadoId
      activoAsignadoId: sinActivo ? null : (activosSeleccionados.length === 1 ? activosSeleccionados[0] : (formData.activoAsignadoId || null)),
      ...(usuario && { motivo })  // Solo incluir motivo en ediciones
    };

    console.log('📤 [USUARIO FORM] Datos a enviar:', dataToSave);
    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-linear-to-r from-blue-600 to-indigo-600 px-8 py-6 border-b border-blue-500">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">{usuario ? '✏️' : '➕'}</span>
            {usuario ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <p className="text-blue-100 text-sm mt-1">Complete los datos del usuario</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Datos del usuario */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
              <span className="text-2xl">🧩</span>
              <h3 className="text-lg font-bold text-gray-900">Datos del usuario</h3>
            </div>

            {/* Empresa (bloqueada) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Empresa
              </label>
              <input
                type="text"
                value={empresaNombre}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">La empresa está asignada automáticamente</p>
            </div>

            {/* Sede */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sede <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.sedeId}
                onChange={(e) => {
                  handleChange('sedeId', e.target.value);
                  // Limpiar el activo asignado cuando cambie la sede
                  handleChange('activoAsignadoId', '');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Seleccione una sede</option>
                {loadingSedes ? (
                  <option disabled>Cargando sedes...</option>
                ) : sedes.length === 0 ? (
                  <option disabled>No hay sedes disponibles</option>
                ) : (
                  sedes.map((sede) => (
                    <option key={sede.id || sede._id} value={sede.id || sede._id}>
                      {sede.nombre}
                    </option>
                  ))
                )}
              </select>
              {formData.sedeId && (
                <p className="text-xs text-blue-600 mt-1">
                  💡 Los activos se filtrarán automáticamente por esta sede
                </p>
              )}
            </div>

            {/* Nombre completo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nombreCompleto}
                onChange={(e) => handleChange('nombreCompleto', e.target.value)}
                placeholder="Ej: Juan Pérez García"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Correo electrónico */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Correo electrónico <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.correo}
                onChange={(e) => handleChange('correo', e.target.value)}
                placeholder="Ej: juan.perez@empresa.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Cargo / Rol */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cargo / Rol
              </label>
              <input
                type="text"
                value={formData.cargo}
                onChange={(e) => handleChange('cargo', e.target.value)}
                placeholder="Ej: Analista de sistemas"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Teléfono (opcional)
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                placeholder="Ej: +51 999 999 999"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Observaciones (opcional)
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => handleChange('observaciones', e.target.value)}
                placeholder="Notas adicionales sobre el usuario..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Motivo de edición - Solo mostrar al editar */}
            {usuario && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Motivo de la edición <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Actualización de datos por cambio de cargo"
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                  minLength={10}
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo 10 caracteres</p>
              </div>
            )}
          </div>

          {/* Asignación de activo - Solo mostrar al crear nuevo usuario */}
          {!usuario && (
            <div className="space-y-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                <span className="text-2xl">🖥️</span>
                <h3 className="text-lg font-bold text-gray-900">Asignación de activo (opcional)</h3>
              </div>

              {/* Opción: Sin activo */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <input
                  type="checkbox"
                  id="sinActivo"
                  checked={sinActivo}
                  onChange={(e) => {
                    setSinActivo(e.target.checked);
                    if (e.target.checked) {
                      setActivosSeleccionados([]);
                      handleChange('activoAsignadoId', '');
                    }
                  }}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="sinActivo" className="text-sm font-semibold text-gray-700 cursor-pointer flex-1">
                  Sin activo asignado
                </label>
              </div>

              {/* Selector de activos múltiples (solo si NO está marcado "sin activo") */}
              {!sinActivo && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Activos asignados (puede seleccionar varios)
                  </label>
                  
                  {/* Lista de activos disponibles con checkboxes */}
                  <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                    {loadingActivos ? (
                      <div className="p-4 text-center text-gray-500">
                        ⏳ Cargando activos de la sede...
                      </div>
                    ) : !formData.sedeId ? (
                      <div className="p-4 text-center text-gray-500">
                        ⚠️ Primero seleccione una sede
                      </div>
                    ) : activos.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        ❌ No hay activos disponibles en esta sede
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {activos.map((activo) => {
                          const activoId = activo.id || activo._id;
                          const codigo = activo.asset_id || activo.assetId || activo.codigo || activo.codigoActivo || 'Sin código';
                          const isSelected = activosSeleccionados.includes(String(activoId));
                          
                          return (
                            <label
                              key={activoId}
                              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setActivosSeleccionados(prev => [...prev, String(activoId)]);
                                  } else {
                                    setActivosSeleccionados(prev => prev.filter(id => id !== String(activoId)));
                                  }
                                }}
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="flex-1 font-medium text-gray-900">{codigo}</span>
                              {isSelected && <span className="text-blue-600 text-sm font-semibold">✓ Seleccionado</span>}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* Contador de activos seleccionados */}
                  {activosSeleccionados.length > 0 && (
                    <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 font-semibold">
                      ✅ {activosSeleccionados.length} activo{activosSeleccionados.length !== 1 ? 's' : ''} seleccionado{activosSeleccionados.length !== 1 ? 's' : ''}
                    </p>
                  )}
                  
                  {formData.sedeId && activos.length > 0 && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      📋 Mostrando {activos.length} activo{activos.length !== 1 ? 's' : ''} disponible{activos.length !== 1 ? 's' : ''} de esta sede
                    </p>
                  )}
                </div>
              )}

              <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 flex items-start gap-2">
                  <span className="text-lg">📌</span>
                  <span>
                    <strong>Reglas importantes:</strong><br />
                    • Marque "Sin activo asignado" si el usuario no tiene equipo<br />
                    • Puede seleccionar múltiples activos marcando las casillas<br />
                    • Primero seleccione la sede para ver los activos disponibles<br />
                    • Un mismo activo puede estar asignado a varios usuarios<br />
                    • Puede agregar o cambiar activos después desde las acciones
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors disabled:opacity-50"
            >
              ↩️ Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>💾 Guardar</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

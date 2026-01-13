import { useState, useEffect } from 'react';
import type { Usuario } from '../services/usuariosService';
import { getSedesByEmpresa } from '@/modules/empresas/services/sedesService';
import { getInventarioByEmpresa, getInventarioBySede } from '@/modules/inventario/services/inventarioService';
import { getAreasByEmpresa } from '@/modules/inventario/services/areasService';

interface UsuarioFormProps {
  empresaId: string;
  empresaNombre: string;
  usuario?: Usuario | null;
  onSave: (data: Partial<Usuario>) => void;
  onCancel: () => void;
  isSaving?: boolean;
  correosSecundarios?: string[];
}

export function UsuarioForm({ empresaId, empresaNombre, usuario, onSave, onCancel, isSaving, correosSecundarios }: UsuarioFormProps) {
  const [formData, setFormData] = useState<Partial<Usuario>>({
    empresaId,
    sedeId: '',
    nombreCompleto: '',
    correo: '',
    cargo: '',
    telefono: '',
    observaciones: '',
    activoAsignadoId: '',
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    areaId: '',
    tipoDocumentoPersonalizado: '',
  });

  const [motivo, setMotivo] = useState<string>('');  // Campo separado para motivo de edición
  const [sinActivo, setSinActivo] = useState(false);
  const [activosSeleccionados, setActivosSeleccionados] = useState<string[]>([]);  // Array para múltiples activos
  const [modoCorreo, setModoCorreo] = useState<'nuevo' | 'existente'>('nuevo'); // Control para correos

  const [sedes, setSedes] = useState<any[]>([]);
  const [activos, setActivos] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loadingSedes, setLoadingSedes] = useState(false);
  const [loadingActivos, setLoadingActivos] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [otroTipoDocumento, setOtroTipoDocumento] = useState('');

  useEffect(() => {
    if (usuario) {
      setFormData({
        empresaId: usuario.empresaId,
        sedeId: usuario.sedeId,
        nombreCompleto: usuario.nombreCompleto,
        correo: usuario.correo || '',
        cargo: usuario.cargo || '',
        telefono: usuario.telefono || '',
        observaciones: usuario.observaciones || '',
        activoAsignadoId: usuario.activoAsignadoId || '',
        tipoDocumento: (usuario as any).tipoDocumento || 'DNI',
        numeroDocumento: (usuario as any).numeroDocumento || '',
        areaId: (usuario as any).areaId || '',
        tipoDocumentoPersonalizado: (usuario as any).tipoDocumentoPersonalizado || '',
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

  // Cargar áreas de la empresa
  useEffect(() => {
    const loadAreas = async () => {
      setLoadingAreas(true);
      try {
        const data = await getAreasByEmpresa(empresaId);
        const areasArray = Array.isArray(data) ? data : data?.data || [];
        setAreas(areasArray);
      } catch (error) {
        console.error('Error cargando áreas:', error);
      } finally {
        setLoadingAreas(false);
      }
    };

    loadAreas();
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
    if (!formData.numeroDocumento?.trim()) {
      alert('Por favor ingrese el número de documento');
      return;
    }
    if (formData.tipoDocumento === 'Otro' && !formData.tipoDocumentoPersonalizado?.trim()) {
      alert('Por favor especifique el tipo de documento');
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
            {/* Código de usuario - Solo mostrar en creación */}
            {!usuario && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Código de Usuario
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value="HUA-USR-0001"
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
                  Se generará automáticamente al crear el usuario (siempre inicia en 0001)
                </p>
              </div>
            )}

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
              
              {/* Si el usuario NO tiene correo (fue reasignado), mostrar mensaje de ayuda */}
              {(() => {
                console.log('🔍 DEBUG - Usuario correo en Form:', usuario?.correo, 'tipo:', typeof usuario?.correo);
                if (usuario && !usuario.correo) {
                  return (
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                          <p className="text-sm font-semibold text-amber-900 mb-1">
                            Este usuario no tiene correo principal
                          </p>
                          <p className="text-xs text-amber-700">
                            Vaya a la pestaña <strong>Gestión de Correos</strong> y agregue un nuevo correo marcándolo como principal.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                } else if (correosSecundarios && correosSecundarios.length > 0) {
                  return (
                    /* Si hay correos secundarios, mostrar opciones */
                    <div className="space-y-3">
                      {/* Botones de opción */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setModoCorreo('nuevo')}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                            modoCorreo === 'nuevo'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                    >
                      ✍️ Escribir nuevo correo
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoCorreo('existente')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        modoCorreo === 'existente'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      🔽 Seleccionar existente
                    </button>
                  </div>

                  {/* Campo según la opción elegida */}
                  {modoCorreo === 'nuevo' ? (
                    <input
                      type="email"
                      value={formData.correo}
                      onChange={(e) => handleChange('correo', e.target.value)}
                      placeholder="Ej: juan.perez@empresa.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  ) : (
                    <select
                      value={formData.correo}
                      onChange={(e) => handleChange('correo', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Seleccione un correo secundario</option>
                      {correosSecundarios.map((correo, index) => (
                        <option key={index} value={correo}>
                          {correo}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                  );
                } else {
                  return (
                    /* Si NO hay correos secundarios, solo input normal */
                    <input
                      type="email"
                      value={formData.correo}
                      onChange={(e) => handleChange('correo', e.target.value)}
                      placeholder="Ej: juan.perez@empresa.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  );
                }
              })()}
            </div>

            {/* Tipo de Documento */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo de Documento <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.tipoDocumento}
                onChange={(e) => {
                  handleChange('tipoDocumento', e.target.value);
                  // Limpiar campo personalizado si no es "Otro"
                  if (e.target.value !== 'Otro') {
                    handleChange('tipoDocumentoPersonalizado', '');
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="DNI">DNI</option>
                <option value="CE">Carnet de Extranjería (CE)</option>
                <option value="Pasaporte">Pasaporte</option>
                <option value="RUC">RUC</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* Campo condicional para tipo de documento personalizado */}
            {formData.tipoDocumento === 'Otro' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Especificar Tipo de Documento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.tipoDocumentoPersonalizado}
                  onChange={(e) => handleChange('tipoDocumentoPersonalizado', e.target.value)}
                  placeholder="Ej: Cédula, Licencia de Conducir, etc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Ingrese el tipo de documento que no está en la lista
                </p>
              </div>
            )}

            {/* Número de Documento */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Número de Documento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.numeroDocumento}
                onChange={(e) => handleChange('numeroDocumento', e.target.value)}
                placeholder={
                  formData.tipoDocumento === 'DNI' ? 'Ej: 12345678' :
                  formData.tipoDocumento === 'CE' ? 'Ej: 001234567' :
                  formData.tipoDocumento === 'Pasaporte' ? 'Ej: ABC123456' :
                  formData.tipoDocumento === 'RUC' ? 'Ej: 20123456789' :
                  'Ingrese el número de documento'
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                maxLength={
                  formData.tipoDocumento === 'DNI' ? 8 : 
                  formData.tipoDocumento === 'RUC' ? 11 : 
                  undefined
                }
              />
              {formData.tipoDocumento === 'DNI' && (
                <p className="text-xs text-gray-500 mt-1">DNI debe tener 8 dígitos</p>
              )}
              {formData.tipoDocumento === 'RUC' && (
                <p className="text-xs text-gray-500 mt-1">RUC debe tener 11 dígitos</p>
              )}
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

            {/* Área */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                Área
                <span className="text-xs text-gray-500 font-normal">(Opcional)</span>
              </label>
              <select
                value={formData.areaId}
                onChange={(e) => handleChange('areaId', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar área</option>
                {loadingAreas ? (
                  <option disabled>Cargando áreas...</option>
                ) : areas.length === 0 ? (
                  <option disabled>No hay áreas disponibles</option>
                ) : (
                  areas.map((area) => (
                    <option key={area.id || area._id} value={area.id || area._id}>
                      {area.nombre}
                    </option>
                  ))
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                El área ayuda a organizar a los usuarios por departamento
              </p>
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

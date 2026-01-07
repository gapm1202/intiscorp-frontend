import { useState, useEffect } from "react";
import { PlataformaCorreoForm } from "../components/PlataformaCorreoForm";
import { TipoCorreoForm } from "../components/TipoCorreoForm";
import { ProtocoloForm } from "../components/ProtocoloForm";
import AlertModal from "../components/AlertModal";
import { plataformasService } from "../services/plataformasService";
import { tiposCorreoService } from "../services/tiposCorreoService";
import { protocolosService } from "../services/protocolosService";

interface PlataformaCorreo {
  id?: number;
  codigo?: string;
  nombre: string;
  tipoPlataforma: string;
  tipoPlataformaPersonalizado?: string;
  permiteReasignar: boolean;
  permiteConservar: boolean;
  observaciones?: string;
  activo: boolean;
}

interface TipoCorreo {
  id?: number;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

interface Protocolo {
  id?: number;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

const CatalogoCorreosPage = () => {
  const [activeTab, setActiveTab] = useState<'plataformas' | 'tipos' | 'protocolos'>('plataformas');
  const [showPlataformaForm, setShowPlataformaForm] = useState(false);
  const [showTipoForm, setShowTipoForm] = useState(false);
  const [showProtocoloForm, setShowProtocoloForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado para AlertModal
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'error' | 'success' | 'warning' | 'info'
  });
  
  // Listas de datos
  const [plataformas, setPlataformas] = useState<PlataformaCorreo[]>([]);
  const [tipos, setTipos] = useState<TipoCorreo[]>([]);
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);

  // Items seleccionados para edición
  const [selectedPlataforma, setSelectedPlataforma] = useState<PlataformaCorreo | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<TipoCorreo | null>(null);
  const [selectedProtocolo, setSelectedProtocolo] = useState<Protocolo | null>(null);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadPlataformas();
    loadTipos();
    loadProtocolos();
  }, []);

  const loadPlataformas = async () => {
    try {
      setIsLoading(true);
      const data = await plataformasService.getAll();
      setPlataformas(data);
    } catch (error) {
      console.error('Error al cargar plataformas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTipos = async () => {
    try {
      const data = await tiposCorreoService.getAll();
      setTipos(data);
    } catch (error) {
      console.error('Error al cargar tipos:', error);
    }
  };

  const loadProtocolos = async () => {
    try {
      const data = await protocolosService.getAll();
      setProtocolos(data);
    } catch (error) {
      console.error('Error al cargar protocolos:', error);
    }
  };

  const handleSavePlataforma = async (data: any) => {
    try {
      setIsSaving(true);
      
      // Validar duplicados por nombre
      const nombreExistente = plataformas.find(
        p => p.nombre.toLowerCase() === data.nombre.toLowerCase() && p.id !== selectedPlataforma?.id
      );
      
      if (nombreExistente) {
        setAlertModal({
          isOpen: true,
          title: 'Plataforma Duplicada',
          message: `Ya existe una plataforma con el nombre "${data.nombre}"`,
          type: 'warning'
        });
        setIsSaving(false);
        return;
      }
      
      if (selectedPlataforma?.id) {
        await plataformasService.update(selectedPlataforma.id, data);
      } else {
        await plataformasService.create(data);
      }
      await loadPlataformas();
      setShowPlataformaForm(false);
      setSelectedPlataforma(null);
    } catch (error) {
      console.error('Error al guardar plataforma:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error al guardar la plataforma',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTipo = async (data: any) => {
    try {
      setIsSaving(true);
      
      // Validar duplicados por nombre
      const nombreExistente = tipos.find(
        t => t.nombre.toLowerCase() === data.nombre.toLowerCase() && t.id !== selectedTipo?.id
      );
      
      if (nombreExistente) {
        setAlertModal({
          isOpen: true,
          title: 'Tipo Duplicado',
          message: `Ya existe un tipo de correo con el nombre "${data.nombre}"`,
          type: 'warning'
        });
        setIsSaving(false);
        return;
      }
      
      if (selectedTipo?.id) {
        await tiposCorreoService.update(selectedTipo.id, data);
      } else {
        await tiposCorreoService.create(data);
      }
      await loadTipos();
      setShowTipoForm(false);
      setSelectedTipo(null);
    } catch (error) {
      console.error('Error al guardar tipo:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error al guardar el tipo de correo',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProtocolo = async (data: any) => {
    try {
      setIsSaving(true);
      
      // Validar duplicados por nombre
      const nombreExistente = protocolos.find(
        p => p.nombre.toLowerCase() === data.nombre.toLowerCase() && p.id !== selectedProtocolo?.id
      );
      
      if (nombreExistente) {
        setAlertModal({
          isOpen: true,
          title: 'Protocolo Duplicado',
          message: `Ya existe un protocolo con el nombre "${data.nombre}"`,
          type: 'warning'
        });
        setIsSaving(false);
        return;
      }
      
      if (selectedProtocolo?.id) {
        await protocolosService.update(selectedProtocolo.id, data);
      } else {
        await protocolosService.create(data);
      }
      await loadProtocolos();
      setShowProtocoloForm(false);
      setSelectedProtocolo(null);
    } catch (error) {
      console.error('Error al guardar protocolo:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error al guardar el protocolo',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPlataforma = (plataforma: PlataformaCorreo) => {
    setSelectedPlataforma(plataforma);
    setShowPlataformaForm(true);
  };

  const handleEditTipo = (tipo: TipoCorreo) => {
    setSelectedTipo(tipo);
    setShowTipoForm(true);
  };

  const handleEditProtocolo = (protocolo: Protocolo) => {
    setSelectedProtocolo(protocolo);
    setShowProtocoloForm(true);
  };

  const handleDeletePlataforma = async (id: number) => {
    if (!confirm('¿Está seguro de desactivar esta plataforma?')) return;
    try {
      await plataformasService.update(id, { activo: false });
      await loadPlataformas();
    } catch (error) {
      console.error('Error al desactivar plataforma:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error al desactivar la plataforma',
        type: 'error'
      });
    }
  };

  const handleDeleteTipo = async (id: number) => {
    if (!confirm('¿Está seguro de desactivar este tipo de correo?')) return;
    try {
      await tiposCorreoService.update(id, { activo: false });
      await loadTipos();
    } catch (error) {
      console.error('Error al desactivar tipo:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error al desactivar el tipo',
        type: 'error'
      });
    }
  };

  const handleDeleteProtocolo = async (id: number) => {
    if (!confirm('¿Está seguro de desactivar este protocolo?')) return;
    try {
      await protocolosService.update(id, { activo: false });
      await loadProtocolos();
    } catch (error) {
      console.error('Error al desactivar protocolo:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error al desactivar el protocolo',
        type: 'error'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {/* Header Hero */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 rounded-2xl shadow-2xl p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-1">
                  Catálogo de Correos
                </h1>
                <p className="text-indigo-100 text-lg">
                  Gestione las plantillas de correos del sistema
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 inline-flex gap-2">
          <button
            onClick={() => setActiveTab('plataformas')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'plataformas'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            Plataformas de Correo
          </button>
          <button
            onClick={() => setActiveTab('tipos')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'tipos'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Tipos de Correo
          </button>
          <button
            onClick={() => setActiveTab('protocolos')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'protocolos'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Protocolos / Acceso
          </button>
        </div>
      </div>

      {/* Contenido de Pestañas */}
      {activeTab === 'plataformas' && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {/* Header con botón */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Plataformas de Correo</h2>
              <p className="text-slate-500 text-sm mt-1">Gestione las plataformas de correo disponibles</p>
            </div>
            <button
              onClick={() => setShowPlataformaForm(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Plataforma
            </button>
          </div>

          {/* Tabla o Empty State */}
          {plataformas.length === 0 ? (
            <div className="text-center py-16">
              <div className="mb-6">
                <svg className="w-24 h-24 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <p className="text-slate-500 text-lg">No hay plataformas registradas</p>
              <p className="text-slate-400 text-sm mt-2">Haga clic en "Nueva Plataforma" para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Plataforma</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">¿Reasignable?</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">¿Conserva historial?</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {plataformas.map((plataforma) => (
                    <tr key={plataforma.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <span className="font-mono text-sm font-semibold text-indigo-600">{plataforma.codigo}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium text-slate-900">{plataforma.nombre}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600">{plataforma.tipoPlataformaPersonalizado || plataforma.tipoPlataforma}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {plataforma.permiteReasignar ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {plataforma.permiteConservar ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {plataforma.activo ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditPlataforma(plataforma)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => plataforma.id && handleDeletePlataforma(plataforma.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Desactivar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tipos' && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {/* Header con botón */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Tipos de Correo</h2>
                <p className="text-slate-500 text-sm">Gestiona las categorías de correos electrónicos</p>
              </div>
            </div>
            <button
              onClick={() => setShowTipoForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/30 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Tipo de Correo
            </button>
          </div>

          {/* Tabla o Empty State */}
          {tipos.length === 0 ? (
            <div className="text-center py-16">
              <div className="mb-6">
                <svg className="w-24 h-24 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No hay tipos de correo registrados</h3>
              <p className="text-slate-400 text-sm mt-2">Haga clic en "Nuevo Tipo de Correo" para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Tipo de correo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Descripción</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {tipos.map((tipo) => (
                    <tr key={tipo.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <span className="font-mono text-sm font-semibold text-purple-600">{tipo.codigo}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium text-slate-900">{tipo.nombre}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600">{tipo.descripcion || '-'}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {tipo.activo ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditTipo(tipo)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => tipo.id && handleDeleteTipo(tipo.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Desactivar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'protocolos' && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {/* Header con botón */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Protocolos / Acceso</h2>
                <p className="text-slate-500 text-sm">Configure los protocolos de acceso y autenticación</p>
              </div>
            </div>
            <button
              onClick={() => setShowProtocoloForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Protocolo
            </button>
          </div>

          {/* Tabla o Empty State */}
          {protocolos.length === 0 ? (
            <div className="text-center py-16">
              <div className="mb-6">
                <svg className="w-24 h-24 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No hay protocolos registrados</h3>
              <p className="text-slate-400 text-sm mt-2">Haga clic en "Nuevo Protocolo" para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Protocolo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Descripción</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {protocolos.map((protocolo) => (
                    <tr key={protocolo.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <span className="font-mono text-sm font-semibold text-blue-600">{protocolo.codigo}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium text-slate-900">{protocolo.nombre}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600">{protocolo.descripcion || '-'}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {protocolo.activo ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditProtocolo(protocolo)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => protocolo.id && handleDeleteProtocolo(protocolo.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Desactivar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* Modal de Plataforma */}
      {showPlataformaForm && (
        <PlataformaCorreoForm
          plataforma={selectedPlataforma}
          onSave={handleSavePlataforma}
          onCancel={() => {
            setShowPlataformaForm(false);
            setSelectedPlataforma(null);
          }}
          isSaving={isSaving}
        />
      )}

      {/* Modal de Tipo */}
      {showTipoForm && (
        <TipoCorreoForm
          tipo={selectedTipo}
          onSave={handleSaveTipo}
          onCancel={() => {
            setShowTipoForm(false);
            setSelectedTipo(null);
          }}
          isSaving={isSaving}
        />
      )}

      {/* Modal de Protocolo */}
      {showProtocoloForm && (
        <ProtocoloForm
          protocolo={selectedProtocolo}
          onSave={handleSaveProtocolo}
          onCancel={() => {
            setShowProtocoloForm(false);
            setSelectedProtocolo(null);
          }}
          isSaving={isSaving}
        />
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
};

export default CatalogoCorreosPage;

import { useState, useEffect } from 'react';
import { X, Upload, AlertCircle, Building2, Tag, Wrench, Clock, User, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getEmpresas, getEmpresaById } from '@/modules/empresas/services/empresasService';
import { getSedesByEmpresa } from '@/modules/empresas/services/sedesService';
import { getCategorias } from '@/modules/inventario/services/categoriasService';
import { getInventarioBySede } from '@/modules/inventario/services/inventarioService';
import { getUsuariosAdministrativos } from '@/modules/auth/services/userService';
import { getSLAByEmpresa } from '@/modules/sla/services/slaService';
import { getContratoActivo } from '@/modules/empresas/services/contratosService';
import { getCatalogCategories, getCatalogSubcategories, getTicketTypes } from '@/modules/catalogo/services/catalogoService';
import type { PrioridadTicket } from '../types';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ticketData: any) => Promise<void>;
}

type Impacto = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';
type Urgencia = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

const CreateTicketModal = ({ isOpen, onClose, onSubmit }: CreateTicketModalProps) => {
  // Estados del formulario
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [activos, setActivos] = useState<any[]>([]);
  const [usuariosActivo, setUsuariosActivo] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [subcategorias, setSubcategorias] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [slaActivo, setSlaActivo] = useState<any>(null);
  const [contratoActivo, setContratoActivo] = useState<any>(null);
  const [slaStatus, setSlaStatus] = useState<'loading' | 'sin-configurar' | 'contrato-inactivo' | 'activo' | null>(null);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [searchActivos, setSearchActivos] = useState('');
  const [searchUsuarios, setSearchUsuarios] = useState('');
  const [tiposTicket, setTiposTicket] = useState<any[]>([]);
  const [catalogoCategorias, setCatalogoCategorias] = useState<any[]>([]);
  const [catalogoSubcategorias, setCatalogoSubcategorias] = useState<any[]>([]);
  const navigate = useNavigate();

  // Datos del ticket
  const [formData, setFormData] = useState({
    // Identificación
    empresa_id: '',
    sede_id: '',
    
    // Clasificación
    tipo_ticket: '',
    categoria_id: '',
    subcategoria_id: '',
    
    // Descripción
    titulo: '',
    descripcion: '',
    activos_codigos: [] as string[], // Array de códigos de activos seleccionados
    ubicacion: '',
    usuarios_reporta_ids: [] as string[], // Array de IDs de usuarios que reportan
    
    // ITIL
    impacto: '' as Impacto | '',
    urgencia: '' as Urgencia | '',
    prioridad: '' as PrioridadTicket | '',
    
    // Servicio
    modalidad: '',
    
    // SLA
    aplica_sla: true,
    
    // Gestión
    tecnico_asignado_id: '',
    
    // Control
    estado: 'ABIERTO' as const
  });

  // Cargar datos iniciales
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // Al cambiar empresa, cargar sus datos relacionados
  useEffect(() => {
    const empresaIdNum = Number(formData.empresa_id);
    
    if (formData.empresa_id && !isNaN(empresaIdNum) && empresaIdNum > 0) {
      console.log('🏢 Cargando datos para empresa ID:', empresaIdNum);
      loadEmpresaRelatedData(empresaIdNum);
    } else {
      console.log('🏢 Limpiando datos de empresa');
      setSedes([]);
      setActivos([]);
      setUsuariosActivo([]);
      setSlaActivo(null);
      setFormData(prev => ({ ...prev, sede_id: '', activos_codigos: [], usuarios_reporta_ids: [], aplica_sla: true }));
    }
  }, [formData.empresa_id]);

  // Al cambiar sede, cargar activos
  useEffect(() => {
    const empresaIdNum = Number(formData.empresa_id);
    const sedeIdNum = Number(formData.sede_id);
    
    console.log('🔄 useEffect sede_id ejecutado:', { 
      empresa_id: formData.empresa_id, 
      sede_id: formData.sede_id,
      empresaIdNum,
      sedeIdNum,
      isEmpresaValid: !isNaN(empresaIdNum) && empresaIdNum > 0,
      isSedeValid: !isNaN(sedeIdNum) && sedeIdNum > 0
    });
    
    if (formData.empresa_id && formData.sede_id && !isNaN(empresaIdNum) && !isNaN(sedeIdNum) && empresaIdNum > 0 && sedeIdNum > 0) {
      console.log('📦 Cargando activos para sede:', sedeIdNum, 'de empresa:', empresaIdNum);
      loadActivosBySede(empresaIdNum, sedeIdNum);
    } else {
      console.log('❌ No se pueden cargar activos - condiciones no cumplidas');
      setActivos([]);
      setUsuariosActivo([]);
      setFormData(prev => ({ ...prev, activos_codigos: [], usuarios_reporta_ids: [] }));
    }
  }, [formData.sede_id, formData.empresa_id]);

  // Al cambiar activos seleccionados, cargar usuarios asignados de todos los activos
  useEffect(() => {
    if (formData.activos_codigos.length > 0 && activos.length > 0) {
      // Recolectar todos los usuarios de todos los activos seleccionados
      const todosLosUsuarios: any[] = [];
      const usuariosUnicos = new Map();
      
      formData.activos_codigos.forEach(codigoActivo => {
        const activoSeleccionado = activos.find(a => (a.assetId || a.id) === codigoActivo);
        
        console.log('🔍 Activo seleccionado:', activoSeleccionado);
        console.log('🔍 usuariosAsignados:', activoSeleccionado?.usuariosAsignados);
        console.log('🔍 area:', activoSeleccionado?.area);
        
        // Usar usuariosAsignados (camelCase) que es como viene del backend
        if (activoSeleccionado && activoSeleccionado.usuariosAsignados) {
          activoSeleccionado.usuariosAsignados.forEach((usuario: any) => {
            // Usar correo como clave única (los usuarios tienen: cargo, correo, nombre)
            const key = usuario.correo || usuario.email || usuario.nombre;
            
            if (key && !usuariosUnicos.has(key)) {
              // Agregar información del activo al usuario
              const usuarioConActivo = {
                ...usuario,
                activo_codigo: activoSeleccionado.assetId || activoSeleccionado.id,
                activo_area: activoSeleccionado.area || 'Sin área'
              };
              usuariosUnicos.set(key, usuarioConActivo);
              todosLosUsuarios.push(usuarioConActivo);
            }
          });
        }
      });
      
      console.log('👥 Usuarios asignados a los activos seleccionados:', todosLosUsuarios);
      
      setUsuariosActivo(todosLosUsuarios);
      
      // Mantener los usuarios ya seleccionados si siguen estando disponibles
      setFormData(prev => {
        const usuariosDisponibles = todosLosUsuarios.map(u => u.correo);
        const usuariosAMantener = prev.usuarios_reporta_ids.filter(id => 
          usuariosDisponibles.includes(id)
        );
        return { 
          ...prev, 
          usuarios_reporta_ids: usuariosAMantener
        };
      });
    } else {
      setUsuariosActivo([]);
    }
  }, [formData.activos_codigos, activos]);

  // Al cambiar tipo de ticket, resetear categoría si había una seleccionada
  useEffect(() => {
    if (formData.tipo_ticket) {
      setFormData(prev => ({ ...prev, categoria_id: '', subcategoria_id: '' }));
    }
  }, [formData.tipo_ticket]);

  // Al cambiar categoría, cargar subcategorías del catálogo
  useEffect(() => {
    console.log('🔍 categoria_id seleccionado:', formData.categoria_id);
    console.log('🔍 Tipo de categoria_id:', typeof formData.categoria_id);
    console.log('🔍 Total subcategorías del catálogo:', catalogoSubcategorias.length);
    
    if (catalogoSubcategorias.length > 0) {
      console.log('🔍 Primera subcategoría:', catalogoSubcategorias[0]);
      console.log('🔍 categoriaId de primera subcategoría:', catalogoSubcategorias[0]?.categoriaId);
      console.log('🔍 Tipo de categoriaId:', typeof catalogoSubcategorias[0]?.categoriaId);
    }
    
    if (formData.categoria_id && catalogoSubcategorias.length > 0) {
      // Convertir categoria_id a número para comparar
      const categoriaIdNum = Number(formData.categoria_id);
      const subcategoriasFiltradas = catalogoSubcategorias.filter(sub => {
        console.log(`🔍 Comparando: sub.categoriaId (${sub.categoriaId}) === categoriaIdNum (${categoriaIdNum})`);
        return sub.categoriaId === categoriaIdNum;
      });
      console.log('📋 Subcategorías filtradas para categoría:', formData.categoria_id, subcategoriasFiltradas);
      setSubcategorias(subcategoriasFiltradas);
    } else {
      setSubcategorias([]);
      setFormData(prev => ({ ...prev, subcategoria_id: '' }));
    }
  }, [formData.categoria_id, catalogoSubcategorias]);

  // Calcular prioridad automáticamente (ITIL)
  useEffect(() => {
    if (formData.impacto && formData.urgencia) {
      const prioridad = calcularPrioridad(formData.impacto, formData.urgencia);
      setFormData(prev => ({ ...prev, prioridad }));
    }
  }, [formData.impacto, formData.urgencia]);

  const loadInitialData = async () => {
    try {
      const [empData, catData, tecData, catalogoData, subcatalogoData, tiposData] = await Promise.all([
        getEmpresas(),
        getCategorias(),
        getUsuariosAdministrativos(),
        getCatalogCategories(),
        getCatalogSubcategories(),
        getTicketTypes()
      ]);
      
      console.log('📊 Empresas cargadas:', empData);
      console.log('📊 Primera empresa completa:', empData[0]);
      console.log('📊 Cantidad de empresas:', Array.isArray(empData) ? empData.length : 'No es array');
      console.log('📊 Catálogo cargado (raw):', catalogoData);
      console.log('📊 Total categorías en catálogo:', catalogoData.length);
      console.log('📊 Subcategorías del catálogo:', subcatalogoData);
      console.log('📊 Tipos de ticket cargados:', tiposData);
      console.log('📊 Usuarios cargados (raw):', tecData);
      
      setEmpresas(empData);
      setCategorias(catData);
      
      // Filtrar solo tipos activos
      const tiposActivos = tiposData.filter((tipo: any) => tipo.activo === true);
      console.log('📊 Tipos de ticket activos:', tiposActivos);
      setTiposTicket(tiposActivos);
      
      // Filtrar técnicos y administradores (case-insensitive)
      const tecnicosFiltrados = tecData.filter((u: any) => {
        const rol = String(u.rol || '').toLowerCase();
        return rol === 'tecnico' || rol === 'administrador';
      });
      console.log('📊 Técnicos y administradores filtrados:', tecnicosFiltrados);
      setTecnicos(tecnicosFiltrados);
      
      // Guardar categorías del catálogo activas
      const categoriasActivas = catalogoData.filter((cat: any) => cat.activo);
      console.log('📊 Categorías del catálogo (activas):', categoriasActivas);
      setCatalogoCategorias(categoriasActivas);
      
      // Guardar subcategorías del catálogo activas
      const subcategoriasActivas = subcatalogoData.filter((sub: any) => sub.activo);
      setCatalogoSubcategorias(subcategoriasActivas);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    }
  };

  const loadEmpresaRelatedData = async (empresaId: number) => {
    try {
      setSlaStatus('loading');
      
      const [sedesData, slaData, empresaData] = await Promise.all([
        getSedesByEmpresa(empresaId),
        getSLAByEmpresa(empresaId).catch(() => null),
        getEmpresaById(empresaId).catch(() => null)
      ]);
      
      console.log('📍 Sedes recibidas (raw):', sedesData);
      console.log('📋 SLA recibido:', slaData);
      console.log('🏢 Empresa recibida:', empresaData);
      console.log('📄 Contrato de empresa:', empresaData?.contrato);
      console.log('📄 Estado contrato (campo contrato):', empresaData?.contrato?.estadoContrato);
      console.log('📄 Estado contrato (campo estado_contrato):', empresaData?.contrato?.estado_contrato);
      console.log('📄 Estado contrato directo en empresa:', empresaData?.estadoContrato);
      console.log('📄 Estado contrato snake_case en empresa:', empresaData?.estado_contrato);
      
      // Normalizar sedes: puede venir como array directo o como { data: [...] }
      const sedesArray = Array.isArray(sedesData) ? sedesData : (sedesData?.data || []);
      
      console.log('📍 Sedes normalizadas:', sedesArray);
      console.log('📍 Cantidad de sedes:', sedesArray.length);
      if (sedesArray[0]) {
        console.log('📍 Primera sede completa:', JSON.stringify(sedesArray[0], null, 2));
        console.log('📍 Campos de primera sede:', Object.keys(sedesArray[0]));
        console.log('📍 sede_id de primera sede:', sedesArray[0].sede_id);
        console.log('📍 id de primera sede:', sedesArray[0].id);
      }
      
      setSedes(sedesArray);
      setSlaActivo(slaData);
      setContratoActivo(empresaData?.contrato || null);
      
      // Evaluar estado del SLA usando el contrato de la empresa
      evaluateSLAStatus(slaData, empresaData?.contrato);
      
    } catch (error) {
      console.error('Error cargando datos de empresa:', error);
      setSedes([]);
      setSlaActivo(null);
      setContratoActivo(null);
      setSlaStatus(null);
    }
  };

  const evaluateSLAStatus = (sla: any, contrato: any) => {
    console.log('🔍 Evaluando SLA Status - SLA:', sla);
    console.log('🔍 Evaluando SLA Status - Contrato:', contrato);
    
    // 1️⃣ Sin SLA configurado (debe tener las 6 secciones guardadas)
    // Verificar que existan las 6 secciones: alcance, tiempos, horarios, requisitos, exclusiones, alertas
    const seccionesRequeridas = ['alcance', 'tiempos', 'horarios', 'requisitos', 'exclusiones', 'alertas'];
    const isEmptyObject = (obj: any) => !obj || typeof obj !== 'object' || Object.keys(obj).length === 0;
    
    const seccionesConfiguraDas = seccionesRequeridas.filter(seccion => !isEmptyObject(sla?.[seccion]));
    const slaCompleto = seccionesConfiguraDas.length === 6;
    
    if (!sla || !slaCompleto) {
      console.log('⚠️ SLA no configurado - Secciones encontradas:', seccionesConfiguraDas.length, '/ 6');
      setSlaStatus('sin-configurar');
      setFormData(prev => ({ ...prev, aplica_sla: false }));
      return;
    }

    // 2️⃣ Verificar estado del contrato (buscar en múltiples ubicaciones posibles)
    const estadoContratoRaw = contrato?.estado_contrato || contrato?.estadoContrato || contrato?.estado || null;
    const estadoContrato = estadoContratoRaw ? String(estadoContratoRaw).toUpperCase() : null;
    
    console.log('🔍 Estado del contrato detectado:', estadoContrato);
    console.log('🔍 Contrato completo para debug:', JSON.stringify(contrato, null, 2));
    
    // Si no hay contrato o estado es null/vacío, vencido o suspendido → bloquear
    if (!contrato || !estadoContrato || estadoContrato === 'VENCIDO' || estadoContrato === 'SUSPENDIDO') {
      console.log('🔴 Contrato inactivo - Estado:', estadoContrato || 'SIN CONFIGURAR');
      setSlaStatus('contrato-inactivo');
      setFormData(prev => ({ ...prev, aplica_sla: false }));
      return;
    }

    // 3️⃣ SLA configurado y contrato ACTIVO
    if (estadoContrato === 'ACTIVO') {
      console.log('🟢 SLA activo');
      setSlaStatus('activo');
      setFormData(prev => ({ ...prev, aplica_sla: true }));
      return;
    }

    // Caso por defecto (no debería llegar aquí)
    console.log('⚠️ Estado del contrato no reconocido:', estadoContrato);
    setSlaStatus('contrato-inactivo');
    setFormData(prev => ({ ...prev, aplica_sla: false }));
  };

  const loadActivosBySede = async (empresaId: number, sedeId: number) => {
    try {
      const activosData = await getInventarioBySede(empresaId, sedeId, true);
      console.log('📦 Activos recibidos:', activosData);
      
      // Normalizar activos - el backend puede devolver {ok, data} o directo el array
      let activosArray = [];
      if (activosData?.ok && activosData?.data) {
        activosArray = activosData.data;
      } else if (Array.isArray(activosData)) {
        activosArray = activosData;
      } else if (activosData?.data) {
        activosArray = activosData.data;
      }
      
      console.log('📦 Activos normalizados:', activosArray);
      console.log('📦 Cantidad de activos:', activosArray.length);
      if (activosArray[0]) {
        console.log('📦 Primer activo:', activosArray[0]);
        console.log('📦 Campos del activo:', Object.keys(activosArray[0]));
        console.log('📦 assetId:', activosArray[0].assetId);
        console.log('📦 categoria:', activosArray[0].categoria);
        console.log('📦 fabricante:', activosArray[0].fabricante);
        console.log('📦 modelo:', activosArray[0].modelo);
      }
      
      setActivos(activosArray);
    } catch (error) {
      console.error('Error cargando activos:', error);
      setActivos([]);
    }
  };

  // Matriz de Prioridad ITIL (Impacto x Urgencia)
  const calcularPrioridad = (impacto: Impacto, urgencia: Urgencia): PrioridadTicket => {
    const matriz: Record<Impacto, Record<Urgencia, PrioridadTicket>> = {
      CRITICO: { CRITICA: 'CRITICA', ALTA: 'CRITICA', MEDIA: 'ALTA', BAJA: 'MEDIA' },
      ALTO: { CRITICA: 'CRITICA', ALTA: 'ALTA', MEDIA: 'ALTA', BAJA: 'MEDIA' },
      MEDIO: { CRITICA: 'ALTA', ALTA: 'ALTA', MEDIA: 'MEDIA', BAJA: 'BAJA' },
      BAJO: { CRITICA: 'MEDIA', ALTA: 'MEDIA', MEDIA: 'BAJA', BAJA: 'BAJA' }
    };
    
    return matriz[impacto][urgencia];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setArchivos(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setArchivos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.empresa_id) {
      alert('Debe seleccionar una empresa');
      return;
    }
    
    if (!formData.titulo || !formData.descripcion) {
      alert('Título y descripción son obligatorios');
      return;
    }
    
    setLoading(true);
    try {
      const ticketData = {
        ...formData,
        empresa_id: Number(formData.empresa_id),
        sede_id: formData.sede_id ? Number(formData.sede_id) : undefined,
        categoria_id: formData.categoria_id ? Number(formData.categoria_id) : undefined,
        subcategoria_id: formData.subcategoria_id ? Number(formData.subcategoria_id) : undefined,
        tecnico_asignado_id: formData.tecnico_asignado_id ? Number(formData.tecnico_asignado_id) : undefined,
        archivos: archivos.length > 0 ? archivos : undefined
      };
      
      await onSubmit(ticketData);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creando ticket:', error);
      alert('Error al crear ticket');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      empresa_id: '',
      sede_id: '',
      tipo_ticket: '',
      categoria_id: '',
      subcategoria_id: '',
      titulo: '',
      descripcion: '',
      activos_codigos: [],
      ubicacion: '',
      usuarios_reporta_ids: [],
      impacto: '',
      urgencia: '',
      prioridad: '',
      modalidad: '',
      aplica_sla: true,
      tecnico_asignado_id: '',
      estado: 'ABIERTO'
    });
    setArchivos([]);
    setSedes([]);
    setSubcategorias([]);
    setSlaActivo(null);
    setShowCustomTipoInput(false);
    setCustomTipoValue('');
  };

  const getPrioridadColor = (prioridad: PrioridadTicket | '') => {
    if (!prioridad) return 'text-gray-400';
    const colors = {
      BAJA: 'text-blue-600',
      MEDIA: 'text-yellow-600',
      ALTA: 'text-orange-600',
      CRITICA: 'text-red-600'
    };
    return colors[prioridad];
  };

  if (!isOpen) return null;

  // Determinar si el formulario debe estar bloqueado
  const isFormBlocked = Boolean(formData.empresa_id && (slaStatus === 'sin-configurar' || slaStatus === 'contrato-inactivo'));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Crear Nuevo Ticket</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            
            {/* 🔹 IDENTIFICACIÓN */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="text-blue-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">Identificación</h3>
                <span className="text-red-500 text-sm">* Obligatorio</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Empresa - OBLIGATORIO */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empresa <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.empresa_id}
                    onChange={(e) => {
                      console.log('📝 Select onChange - Valor seleccionado:', e.target.value);
                      setFormData({ ...formData, empresa_id: e.target.value });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar empresa...</option>
                    {empresas.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre}
                      </option>
                    ))}
                  </select>
                  
                  {/* Estado del SLA */}
                  {formData.empresa_id && (
                    <div className="mt-3">
                      {slaStatus === 'loading' && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm text-blue-700">Verificando SLA...</span>
                        </div>
                      )}
                      
                      {slaStatus === 'sin-configurar' && (
                        <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-yellow-800">
                                ⚠️ SLA no ha sido configurado
                              </p>
                              <p className="text-xs text-yellow-700 mt-1">
                                Por favor complete la configuración del SLA para esta empresa.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              navigate(`/admin/empresas/${formData.empresa_id}?tab=sla`);
                            }}
                            className="mt-2 w-full px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
                          >
                            Revisar SLA
                          </button>
                        </div>
                      )}
                      
                      {slaStatus === 'contrato-inactivo' && (
                        <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
                          <div className="flex items-start gap-2">
                            <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-red-800">
                                🔴 SLA no aplica — contrato suspendido o vencido
                              </p>
                              <p className="text-xs text-red-700 mt-1">
                                No se pueden crear tickets para esta empresa debido al estado del contrato.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              navigate(`/admin/empresas/${formData.empresa_id}?tab=contrato`);
                            }}
                            className="mt-2 w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Revisar Contrato
                          </button>
                        </div>
                      )}
                      
                      {slaStatus === 'activo' && (
                        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-300 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-green-800">
                              🟢 SLA Activo
                            </p>
                            <p className="text-xs text-green-700 mt-1">
                              El ticket se asociará automáticamente al SLA configurado.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sede */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sede
                  </label>
                  <select
                    value={formData.sede_id}
                    onChange={(e) => setFormData({ ...formData, sede_id: e.target.value })}
                    disabled={isFormBlocked || !formData.empresa_id || sedes.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!formData.empresa_id 
                        ? 'Seleccione primero una empresa...' 
                        : sedes.length === 0 
                          ? 'Esta empresa no tiene sedes registradas' 
                          : 'Seleccionar sede...'}
                    </option>
                    {sedes.map(sede => (
                      <option key={sede.id} value={sede.id}>
                        {sede.nombre}
                      </option>
                    ))}
                  </select>
                  {formData.empresa_id && sedes.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Esta empresa aún no tiene sedes registradas
                    </p>
                  )}
                </div>
              </div>

              {/* SLA Info */}
              {slaActivo?.activo && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Clock size={16} />
                    <span className="text-sm font-medium">SLA Activo para esta empresa</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Los tiempos de respuesta y resolución se calcularán automáticamente
                  </p>
                </div>
              )}
            </div>

            {/* 📝 DESCRIPCIÓN */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="text-purple-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">Descripción del Problema</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Ej: Impresora no funciona en área de contabilidad"
                    disabled={isFormBlocked}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción detallada <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Describa el problema con el mayor detalle posible..."
                    rows={4}
                    disabled={isFormBlocked}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Activos relacionados (Opcional - Múltiple selección)
                    </label>
                    
                    {/* Chips de activos seleccionados */}
                    {formData.activos_codigos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        {formData.activos_codigos.map(codigo => {
                          const activo = activos.find(a => (a.assetId || a.id) === codigo);
                          return (
                            <div
                              key={codigo}
                              className="inline-flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 rounded-lg text-xs border-2 border-blue-200 shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                {/* Información del activo */}
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm">{activo ? (activo.assetId || activo.id) : codigo}</span>
                                  {activo && (
                                    <>
                                      <span className="text-blue-700">{activo.categoria} - {activo.fabricante} {activo.modelo}</span>
                                      <span className="text-blue-600 italic flex items-center gap-1 mt-0.5">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                        </svg>
                                        {activo.area || 'Sin área'}
                                      </span>
                                    </>
                                  )}
                                </div>
                                
                                {/* Código de Acceso Remoto - Destacado al costado */}
                                {activo?.codigoAccesoRemoto && (
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md border border-indigo-700 shadow-md">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                      <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                                    </svg>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-90">Acceso Remoto</span>
                                      <span className="font-bold text-sm">{activo.codigoAccesoRemoto}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    activos_codigos: formData.activos_codigos.filter(c => c !== codigo)
                                  });
                                }}
                                className="ml-2 hover:bg-red-100 hover:text-red-600 rounded-full p-1.5 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Buscador de activos */}
                    {formData.sede_id && activos.length > 0 && (
                      <div className="mb-2 space-y-2">
                        <input
                          type="text"
                          placeholder="Buscar activo por código, categoría, fabricante o modelo..."
                          value={searchActivos}
                          onChange={(e) => setSearchActivos(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const activosFiltrados = activos.filter(activo => {
                                if (!searchActivos) return true;
                                const searchLower = searchActivos.toLowerCase();
                                const codigoActivo = (activo.assetId || activo.id || '').toString().toLowerCase();
                                const categoria = (activo.categoria || '').toLowerCase();
                                const fabricante = (activo.fabricante || '').toLowerCase();
                                const modelo = (activo.modelo || '').toLowerCase();
                                return codigoActivo.includes(searchLower) || 
                                       categoria.includes(searchLower) || 
                                       fabricante.includes(searchLower) || 
                                       modelo.includes(searchLower);
                              });
                              const todosLosCodigos = activosFiltrados.map(a => a.assetId || a.id);
                              setFormData({
                                ...formData,
                                activos_codigos: todosLosCodigos
                              });
                            }}
                            disabled={isFormBlocked}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Seleccionar todos
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                activos_codigos: []
                              });
                            }}
                            disabled={isFormBlocked}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Limpiar selección
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Lista con checkboxes */}
                    <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                      {!formData.sede_id ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Primero seleccione una sede
                        </div>
                      ) : activos.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Esta sede no tiene activos registrados
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {activos.filter(activo => {
                            if (!searchActivos) return true;
                            const searchLower = searchActivos.toLowerCase();
                            const codigoActivo = (activo.assetId || activo.id || '').toString().toLowerCase();
                            const categoria = (activo.categoria || '').toLowerCase();
                            const fabricante = (activo.fabricante || '').toLowerCase();
                            const modelo = (activo.modelo || '').toLowerCase();
                            return codigoActivo.includes(searchLower) || 
                                   categoria.includes(searchLower) || 
                                   fabricante.includes(searchLower) || 
                                   modelo.includes(searchLower);
                          }).map(activo => {
                            const codigoActivo = activo.assetId || activo.id;
                            const isSelected = formData.activos_codigos.includes(codigoActivo);
                            return (
                              <label
                                key={codigoActivo}
                                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({
                                        ...formData,
                                        activos_codigos: [...formData.activos_codigos, codigoActivo]
                                      });
                                    } else {
                                      setFormData({
                                        ...formData,
                                        activos_codigos: formData.activos_codigos.filter(c => c !== codigoActivo)
                                      });
                                    }
                                  }}
                                  disabled={isFormBlocked}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {codigoActivo}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {activo.categoria} - {activo.fabricante} {activo.modelo}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                          {activos.filter(activo => {
                            if (!searchActivos) return true;
                            const searchLower = searchActivos.toLowerCase();
                            const codigoActivo = (activo.assetId || activo.id || '').toString().toLowerCase();
                            const categoria = (activo.categoria || '').toLowerCase();
                            const fabricante = (activo.fabricante || '').toLowerCase();
                            const modelo = (activo.modelo || '').toLowerCase();
                            return codigoActivo.includes(searchLower) || 
                                   categoria.includes(searchLower) || 
                                   fabricante.includes(searchLower) || 
                                   modelo.includes(searchLower);
                          }).length === 0 && searchActivos && (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              No se encontraron activos que coincidan con "{searchActivos}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {formData.sede_id && activos.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Esta sede aún no tiene activos registrados
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Usuarios que reportan (Opcional - Múltiple selección)
                    </label>
                    
                    {/* Chips de usuarios seleccionados */}
                    {formData.usuarios_reporta_ids.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        {formData.usuarios_reporta_ids.map(usuarioCorreo => {
                          const usuario = usuariosActivo.find(u => u.correo === usuarioCorreo);
                          return (
                            <div
                              key={usuarioCorreo}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg text-xs border border-green-200"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold">{usuario ? usuario.nombre : usuarioCorreo}</span>
                                {usuario && (
                                  <>
                                    <span className="text-green-700">{usuario.correo}</span>
                                    <span className="text-green-600 italic">{usuario.cargo}</span>
                                    <span className="text-blue-700 font-semibold flex items-center gap-1 mt-0.5">
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                                      </svg>
                                      {usuario.activo_codigo}
                                    </span>
                                  </>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    usuarios_reporta_ids: formData.usuarios_reporta_ids.filter(c => c !== usuarioCorreo)
                                  });
                                }}
                                className="ml-1 hover:bg-green-200 rounded-full p-1 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Buscador de usuarios */}
                    {formData.activos_codigos.length > 0 && usuariosActivo.length > 0 && (
                      <div className="mb-2 space-y-2">
                        <input
                          type="text"
                          placeholder="Buscar usuario por nombre, correo o cargo..."
                          value={searchUsuarios}
                          onChange={(e) => setSearchUsuarios(e.target.value)}
                          disabled={isFormBlocked}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const usuariosFiltrados = usuariosActivo.filter(usuario => {
                                if (!searchUsuarios) return true;
                                const searchLower = searchUsuarios.toLowerCase();
                                const nombre = (usuario.nombre || '').toLowerCase();
                                const correo = (usuario.correo || '').toLowerCase();
                                const cargo = (usuario.cargo || '').toLowerCase();
                                return nombre.includes(searchLower) || 
                                       correo.includes(searchLower) || 
                                       cargo.includes(searchLower);
                              });
                              const todosLosCorreos = usuariosFiltrados.map(u => u.correo);
                              setFormData({
                                ...formData,
                                usuarios_reporta_ids: todosLosCorreos
                              });
                            }}
                            disabled={isFormBlocked}
                            className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Seleccionar todos
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                usuarios_reporta_ids: []
                              });
                            }}
                            disabled={isFormBlocked}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Limpiar selección
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Lista con checkboxes */}
                    <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                      {formData.activos_codigos.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Primero seleccione al menos un activo
                        </div>
                      ) : usuariosActivo.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Los activos seleccionados no tienen usuarios asignados
                        </div>
                      ) : (
                        <>
                          {/* Lista de usuarios individuales */}
                          <div className="divide-y divide-gray-200">
                            {usuariosActivo.filter(usuario => {
                              if (!searchUsuarios) return true;
                              const searchLower = searchUsuarios.toLowerCase();
                              const nombre = (usuario.nombre || '').toLowerCase();
                              const correo = (usuario.correo || '').toLowerCase();
                              const cargo = (usuario.cargo || '').toLowerCase();
                              return nombre.includes(searchLower) || 
                                     correo.includes(searchLower) || 
                                     cargo.includes(searchLower);
                            }).map(usuario => {
                              const usuarioCorreo = usuario.correo;
                              const isSelected = formData.usuarios_reporta_ids.includes(usuarioCorreo);
                              return (
                                <label
                                  key={usuarioCorreo}
                                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                  <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({
                                        ...formData,
                                        usuarios_reporta_ids: [...formData.usuarios_reporta_ids, usuarioCorreo]
                                      });
                                    } else {
                                      setFormData({
                                        ...formData,
                                        usuarios_reporta_ids: formData.usuarios_reporta_ids.filter(c => c !== usuarioCorreo)
                                      });
                                    }
                                  }}
                                  disabled={isFormBlocked}
                                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {usuario.nombre}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {usuario.correo} • {usuario.cargo}
                                  </div>
                                  <div className="text-xs text-blue-700 font-semibold flex items-center gap-1 mt-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                                    </svg>
                                    {usuario.activo_codigo} ({usuario.activo_area})
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                          {usuariosActivo.filter(usuario => {
                            if (!searchUsuarios) return true;
                            const searchLower = searchUsuarios.toLowerCase();
                            const nombre = (usuario.nombre || '').toLowerCase();
                            const correo = (usuario.correo || '').toLowerCase();
                            const cargo = (usuario.cargo || '').toLowerCase();
                            return nombre.includes(searchLower) || 
                                   correo.includes(searchLower) || 
                                   cargo.includes(searchLower);
                          }).length === 0 && searchUsuarios && (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              No se encontraron usuarios que coincidan con "{searchUsuarios}"
                            </div>
                          )}
                          </div>
                        </>
                      )}
                    </div>
                    
                    {formData.activos_codigos.length > 0 && usuariosActivo.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Los activos seleccionados no tienen usuarios asignados
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 🏷️ CLASIFICACIÓN */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="text-green-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">Clasificación</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Ticket *
                  </label>
                  <select
                    value={formData.tipo_ticket}
                    onChange={(e) => setFormData({ ...formData, tipo_ticket: e.target.value })}
                    disabled={isFormBlocked}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccionar tipo...</option>
                    {tiposTicket.map(tipo => (
                      <option key={tipo.id} value={tipo.nombre}>
                        {tipo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.categoria_id}
                    onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                    disabled={isFormBlocked}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccionar categoría...</option>
                    {catalogoCategorias.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subcategoría
                  </label>
                  <select
                    value={formData.subcategoria_id}
                    onChange={(e) => setFormData({ ...formData, subcategoria_id: e.target.value })}
                    disabled={isFormBlocked || !formData.categoria_id}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccionar subcategoría...</option>
                    {subcategorias.map((sub: any) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ⚡ ITIL - PRIORIZACIÓN */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="text-orange-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">Priorización ITIL</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Impacto
                  </label>
                  <select
                    value={formData.impacto}
                    onChange={(e) => setFormData({ ...formData, impacto: e.target.value as Impacto })}
                    disabled={isFormBlocked}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccionar impacto...</option>
                    <option value="BAJO">Bajo - Afecta a un usuario</option>
                    <option value="MEDIO">Medio - Afecta a un área</option>
                    <option value="ALTO">Alto - Afecta a múltiples áreas</option>
                    <option value="CRITICO">Crítico - Afecta a toda la organización</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Urgencia
                  </label>
                  <select
                    value={formData.urgencia}
                    onChange={(e) => setFormData({ ...formData, urgencia: e.target.value as Urgencia })}
                    disabled={isFormBlocked}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccionar urgencia...</option>
                    <option value="BAJA">Baja - Puede esperar</option>
                    <option value="MEDIA">Media - Resolver en días</option>
                    <option value="ALTA">Alta - Resolver en horas</option>
                    <option value="CRITICA">Crítica - Inmediata</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad (Calculada)
                  </label>
                  <div className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold ${getPrioridadColor(formData.prioridad)}`}>
                    {formData.prioridad || 'Seleccione Impacto y Urgencia'}
                  </div>
                </div>
              </div>

              {formData.prioridad && (
                <div className="mt-3 text-xs text-gray-600 bg-white p-2 rounded border border-gray-200">
                  💡 <strong>Matriz ITIL:</strong> La prioridad se calcula automáticamente combinando Impacto y Urgencia
                </div>
              )}
            </div>

            {/* 🔧 SERVICIO Y GESTIÓN */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <User className="text-indigo-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">Servicio y Asignación</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modalidad de Servicio
                  </label>
                  <select
                    value={formData.modalidad}
                    onChange={(e) => setFormData({ ...formData, modalidad: e.target.value })}
                    disabled={isFormBlocked}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccionar modalidad...</option>
                    <option value="REMOTO">Remoto</option>
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="HIBRIDO">Híbrido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asignar Técnico (Opcional)
                  </label>
                  <select
                    value={formData.tecnico_asignado_id}
                    onChange={(e) => setFormData({ ...formData, tecnico_asignado_id: e.target.value })}
                    disabled={isFormBlocked}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Sin asignar</option>
                    {tecnicos.map(tec => (
                      <option key={tec.usuario_id} value={tec.usuario_id}>
                        {tec.nombre} ({tec.rol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.aplica_sla}
                    onChange={(e) => setFormData({ ...formData, aplica_sla: e.target.checked })}
                    disabled={isFormBlocked || !slaActivo?.activo}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Aplicar SLA {!slaActivo?.activo && '(No disponible para esta empresa)'}
                  </span>
                </label>
              </div>
            </div>

            {/* 📎 ADJUNTOS */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Upload className="text-gray-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-800">Adjuntos (Opcional)</h3>
              </div>
              
              <div>
                <label className="block">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    disabled={isFormBlocked}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      cursor-pointer
                      disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>
                
                {archivos.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {archivos.map((file, index) => (
                      <li key={index} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Eliminar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || isFormBlocked}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? 'Creando...' : 'Crear Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;

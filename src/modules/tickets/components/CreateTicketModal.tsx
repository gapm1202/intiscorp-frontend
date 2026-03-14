import { useState, useEffect } from 'react';
import { X, Upload, AlertCircle, Building2, Tag, Wrench, Clock, User, CheckCircle2, XCircle, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getEmpresas, getEmpresaById } from '@/modules/empresas/services/empresasService';
import { getSedesByEmpresa } from '@/modules/empresas/services/sedesService';
import { getCategorias } from '@/modules/inventario/services/categoriasService';
import { getInventarioBySede } from '@/modules/inventario/services/inventarioService';
import { getUsuariosInternos } from '@/modules/auth/services/userService';
import { slaService } from '@/modules/sla/services/slaService';
import { getContratoActivo } from '@/modules/empresas/services/contratosService';
import { getCatalogCategories, getCatalogSubcategories, getTicketTypes } from '@/modules/catalogo/services/catalogoService';
import { getServicios } from '@/modules/catalogo/services/servicioApi';
import { portalService, type UsuarioDetalle } from '@/modules/public/services/portalService';
import type { PrioridadTicket } from '../types';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ticketData: any) => Promise<void>;
  isConfigurar?: boolean;
  initialData?: Partial<any>;
  initialAdjuntos?: any[];
  onUpdated?: () => Promise<void> | void;
}

type Impacto = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';
type Urgencia = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

import { editarTicket, configurarTicket } from '@/modules/tickets/services/ticketsService';

const CreateTicketModal = ({ isOpen, onClose, onSubmit, isConfigurar, initialData, initialAdjuntos, onUpdated }: CreateTicketModalProps) => {
  const isConfigMode = Boolean(isConfigurar);
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
  const [serviciosDisponibles, setServiciosDisponibles] = useState<any[]>([]);
  const [tipoSoporte, setTipoSoporte] = useState<'activos' | 'gestion-ti' | ''>('');
  const [dniBuscado, setDniBuscado] = useState('');
  const [usuarioEncontrado, setUsuarioEncontrado] = useState<UsuarioDetalle | null>(null);
  const [buscandoUsuario, setBuscandoUsuario] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    empresa_id: '',
    sede_id: '',
    tipo_ticket: '',
    categoria_id: '',
    subcategoria_id: '',
    titulo: '',
    descripcion: '',
    activos_codigos: [] as string[],
    usuarios_reporta_ids: [] as string[],
    servicio_id: '',
    tipo_servicio: '',
    impacto: '' as Impacto | '',
    urgencia: '' as Urgencia | '',
    prioridad: '' as PrioridadTicket | '',
    modalidad: '',
    aplica_sla: true,
    tecnico_asignado_id: '',
    estado: 'ABIERTO' as const,
    origen: 'INTERNO' as const,
  });

  const handleSelectActivoObject = (activoObj: any) => {
    if (!activoObj) return;
    const codigo = String(activoObj.asset_id ?? activoObj.assetId ?? activoObj.codigo ?? activoObj.id);
    setFormData(prev => {
      const exists = (prev.activos_codigos || []).some((c: any) => String(c) === codigo);
      return exists ? prev : { ...prev, activos_codigos: [...(prev.activos_codigos || []), codigo] };
    });

    try {
      const users = activoObj.usuariosAsignados || activoObj.usuarios_asignados || activoObj.usuarios || (activoObj.usuarioAsignado ? [activoObj.usuarioAsignado] : []) || [];
      if (Array.isArray(users) && users.length > 0) {
        const normalized = users.map((u: any) => ({
          id: u?.id ?? u?.usuario_id ?? u?.userId ?? null,
          nombre: u?.nombre ?? u?.nombreCompleto ?? u?.fullName ?? u?.usuario_nombre ?? u?.name ?? '',
          correo: u?.correo ?? u?.email ?? u?.usuario_correo ?? '' ,
          telefono: u?.telefono ?? u?.phone ?? u?.celular ?? u?.mobile ?? '',
          cargo: u?.cargo ?? u?.puesto ?? '',
          activo_codigo: codigo,
          activo_area: activoObj?.area ?? activoObj?.sede ?? activoObj?.ubicacion ?? ''
        }));

        setUsuariosActivo(prev => {
          const mapa = new Map<string, any>();
          (prev || []).forEach((p: any) => mapa.set(p.correo || String(p.id), p));
          normalized.forEach((n: any) => mapa.set(n.correo || String(n.id), { ...(mapa.get(n.correo || String(n.id)) || {}), ...n }));
          return Array.from(mapa.values());
        });

        setFormData(prev => {
          const existing = prev.usuarios_reporta_ids || [];
          const nuevos = normalized.map((u: any) => (u.correo || (u.id ? String(u.id) : null))).filter(Boolean);
          const merged = [...new Set([...existing, ...nuevos])];
          return { ...prev, usuarios_reporta_ids: merged };
        });
      }
    } catch (err) {
      console.warn('⚠️ Error al seleccionar activo objeto:', err);
    }
  };

  const [initialAdjuntosLocal, setInitialAdjuntosLocal] = useState<any[]>([]);
  const [prefilledActivosDetails, setPrefilledActivosDetails] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && isConfigMode) {
      const init = initialData || {};
      setFormData(prev => ({ ...prev,
        empresa_id: init.empresa_id ?? prev.empresa_id,
        sede_id: init.sede_id ?? prev.sede_id,
        tipo_ticket: init.tipo_ticket ?? prev.tipo_ticket,
        categoria_id: init.categoria_id ?? prev.categoria_id,
        subcategoria_id: init.subcategoria_id ?? prev.subcategoria_id,
        titulo: init.titulo ?? prev.titulo,
        descripcion: init.descripcion ?? prev.descripcion,
        activos_codigos: init.activos_codigos ?? prev.activos_codigos,
        usuarios_reporta_ids: init.usuarios_reporta_ids ?? prev.usuarios_reporta_ids,
        servicio_id: init.servicio_id ?? prev.servicio_id,
        tipo_servicio: init.tipo_servicio ?? prev.tipo_servicio,
        modalidad: init.modalidad ?? prev.modalidad,
        prioridad: init.prioridad ?? prev.prioridad,
        tecnico_asignado_id: init.tecnico_asignado_id ?? prev.tecnico_asignado_id,
      }));

      setInitialAdjuntosLocal(initialAdjuntos || []);
      const ticketActivos = init.ticket_activos || init.ticketActivos || undefined;
      if (Array.isArray(ticketActivos) && ticketActivos.length > 0) {
        const fromTicketActivos = ticketActivos.map((t: any) => (
          t.activo_codigo ?? t.activoCodigo ?? t.asset_id ?? t.assetId ?? t.codigo ?? t.id
        )).filter(Boolean).map(String);
        if (fromTicketActivos.length > 0) {
          setFormData(prev => ({ ...prev, activos_codigos: fromTicketActivos }));
          setPrefilledActivosDetails(ticketActivos);
        }
      }

      const activosDesdeTicket = init.activos || init.assets || init.activos_detalle || init.activos_detalles || init.activosInfo || init.activos_codigos || init.activos_ids || (init.data && init.data.activos) || undefined;
      let mappedActivosList: string[] = [];
      if (Array.isArray(activosDesdeTicket) && activosDesdeTicket.length > 0) {
        if (typeof activosDesdeTicket[0] === 'string' || typeof activosDesdeTicket[0] === 'number') {
          mappedActivosList = activosDesdeTicket.map(String);
        } else if (typeof activosDesdeTicket[0] === 'object') {
          mappedActivosList = activosDesdeTicket.map((a: any) => (
            a.activo_codigo ?? a.activoCodigo ?? a.asset_id ?? a.assetId ?? a.codigo ?? a.codigo_activo ?? a.codigoActivo ?? a.code ?? a.codeId ?? a.id ?? ''
          )).filter(Boolean).map(String);
        }
      }

      if (mappedActivosList.length > 0) {
        setFormData(prev => ({ ...prev, activos_codigos: mappedActivosList }));
        setPrefilledActivosDetails(Array.isArray(activosDesdeTicket) ? activosDesdeTicket : []);

        try {
          if (isConfigMode && Array.isArray(activosDesdeTicket) && activosDesdeTicket.length > 0) {
            const prefillAssets = activosDesdeTicket as any[];
            const selectedFromPrefill = prefillAssets.map(a => (a?.activo_codigo ?? a?.activoCodigo ?? a?.asset_id ?? a?.assetId ?? a?.codigo ?? a?.id)).filter(Boolean).map(String);
            if (selectedFromPrefill.length > 0) {
              selectedFromPrefill.forEach(c => {
                const foundObj = activos.find((a: any) => {
                  const candidates = [a.activo_codigo, a.activoCodigo, a.assetId, a.asset_id, a.codigo, a.codigo_activo, a.codigoActivo, a.id, a.serial, a.serie].filter(Boolean).map(String);
                  return candidates.some((x: string) => String(x).toLowerCase() === String(c).toLowerCase());
                });
                if (foundObj) handleSelectActivoObject(foundObj);
                else selectActivo(c);
              });
            }

            const normalizedUsers: any[] = [];
            prefillAssets.forEach((a: any) => {
              const assetCode = a?.activo_codigo ?? a?.activoCodigo ?? a?.asset_id ?? a?.assetId ?? a?.codigo ?? a?.id ?? null;
              const users = a?.usuariosAsignados || a?.usuarios_asignados || a?.usuarios || a?.usuarioAsignado || a?.usuario_asignado || [];
              if (Array.isArray(users) && users.length > 0) {
                users.forEach((u: any) => {
                  normalizedUsers.push({
                    id: u?.id ?? u?.usuario_id ?? u?.userId ?? null,
                    nombre: u?.nombre ?? u?.nombreCompleto ?? u?.fullName ?? u?.usuario_nombre ?? u?.name ?? '',
                    correo: u?.correo ?? u?.email ?? u?.usuario_correo ?? '' ,
                    telefono: u?.telefono ?? u?.phone ?? u?.celular ?? u?.mobile ?? '',
                    cargo: u?.cargo ?? u?.puesto ?? '',
                    activo_codigo: assetCode ? String(assetCode) : undefined,
                    activo_area: a?.area ?? a?.sede ?? a?.ubicacion ?? ''
                  });
                });
              }
            });

            if (normalizedUsers.length > 0) {
              setUsuariosActivo(normalizedUsers);
              const preselected = [...new Set(normalizedUsers.map(u => (u.correo || (u.id ? String(u.id) : null))).filter(Boolean))];
              if (preselected.length > 0) {
                setFormData(prev => ({ ...prev, usuarios_reporta_ids: preselected }));
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ Error forzando prefill desde activos completos:', err);
        }

        try {
          if (Array.isArray(activosDesdeTicket) && activosDesdeTicket.length > 0) {
            const normalizedUsers: any[] = [];
            activosDesdeTicket.forEach((a: any) => {
              const assetCode = a?.asset_id ?? a?.assetId ?? a?.codigo ?? a?.id ? String(a?.asset_id ?? a?.assetId ?? a?.codigo ?? a?.id) : null;
              const assetArea = a?.area || a?.sede || a?.ubicacion || a?.area_nombre || '';
              const users = a.usuariosAsignados || a.usuarios_asignados || a.usuarios || a.usuarioAsignado || a.usuario_asignado || [];
              if (Array.isArray(users) && users.length > 0) {
                users.forEach((u: any) => {
                  const userCorreo = u?.correo ?? u?.email ?? u?.usuario_correo ?? u?.mail ?? '';
                  const userNombre = u?.nombre ?? u?.nombreCompleto ?? u?.fullName ?? u?.usuario_nombre ?? u?.name ?? '';
                  const userCargo = u?.cargo ?? u?.puesto ?? '';
                  const userId = u?.id ?? u?.usuario_id ?? u?.userId ?? null;
                  normalizedUsers.push({
                    id: userId,
                    nombre: userNombre,
                    correo: userCorreo,
                    telefono: u?.telefono ?? u?.phone ?? u?.celular ?? u?.mobile ?? '',
                    cargo: userCargo,
                    activo_codigo: assetCode,
                    activo_area: assetArea
                  });
                });
              }
            });

            if (normalizedUsers.length > 0) {
              setUsuariosActivo(normalizedUsers);
              const preselected = [...new Set(normalizedUsers.map(u => (u.correo || (u.id ? String(u.id) : null))).filter(Boolean))];
              if (preselected.length > 0) {
                setFormData(prev => ({ ...prev, usuarios_reporta_ids: preselected }));
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ Error prellenando usuarios desde activos prefill:', err);
        }
      }

      const posibleDniRaw = init.usuario_dni || init.numero_documento || init.dni || init.documento || init.numeroDocumento || init.usuario?.numero_documento || init.usuario?.dni || init.usuario?.documento || undefined;
      const posibleDniStr = posibleDniRaw ? String(posibleDniRaw).replace(/\D/g, '') : '';
      const hasDni = posibleDniStr.length === 8;
      const hasActivos = mappedActivosList.length > 0;

      if (hasActivos) {
        setTipoSoporte('activos');
      } else if (hasDni) {
        setTipoSoporte('gestion-ti');
        setDniBuscado(posibleDniStr);
      } else {
        const rawTipoSoporte = init.tipo_soporte ?? init.tipoSoporte ?? init.tipo ?? '';
        if (rawTipoSoporte) {
          const t = String(rawTipoSoporte).toLowerCase().trim();
          if (t.includes('activo')) {
            setTipoSoporte('activos');
          } else if (t.includes('gestion') || t.includes('gestion-ti') || t.includes('gestion_ti') || t.includes('ti') || t.includes('gestionti')) {
            setTipoSoporte('gestion-ti');
          } else if (t === 'activos' || t === 'gestion-ti') {
            setTipoSoporte(t as any);
          } else {
            setTipoSoporte('');
          }
        }
      }

      const posibleUsuarioData = init.usuario_dni_data || init.usuario || init.usuario_data || init.usuarioDetalle || init.usuario_detalle || init.usuario_data_detail || init.usuario_detalles;
      if (posibleUsuarioData) {
        const u = posibleUsuarioData as any;
        const normalized = {
          id: u?.id ?? u?.usuarioId ?? u?._id ?? null,
          nombre: u?.nombre ?? u?.fullName ?? u?.usuario_nombre ?? u?.usuarioNombre ?? u?.name ?? '',
          dni: u?.dni ?? u?.numero_documento ?? u?.usuario_dni ?? u?.numeroDocumento ?? u?.documento ?? '',
          cargo: u?.cargo ?? u?.puesto ?? u?.position ?? '',
          telefono: u?.telefono ?? u?.phone ?? u?.celular ?? u?.mobile ?? u?.usuario_telefono ?? '',
          correoPrincipal: u?.correoPrincipal ?? u?.correo ?? u?.email ?? u?.usuario_correo ?? ''
        };
        setUsuarioEncontrado(normalized as any);
      } else if (init.usuario_nombre || init.usuario_correo || init.usuario_telefono || init.usuario_dni) {
        const normalizedTop = {
          id: init.usuario_id ?? init.usuario?.id ?? null,
          nombre: init.usuario_nombre ?? init.usuario?.nombre ?? '',
          dni: init.usuario_dni ?? init.usuario?.dni ?? init.numero_documento ?? '',
          cargo: init.usuario_cargo ?? init.usuario?.cargo ?? '',
          telefono: init.usuario_telefono ?? init.usuario?.telefono ?? '',
          correoPrincipal: init.usuario_correo ?? init.usuario?.correo ?? init.usuario?.email ?? ''
        };
        setUsuarioEncontrado(normalizedTop as any);
      }

      if (Array.isArray(init.usuarios_reportan) && init.usuarios_reportan.length > 0) {
        const userIds = init.usuarios_reportan.map((u: any) => u.id || u.usuario_id || u.userId || u.uid || u.email || u.usuario_correo || u.usuario || '').filter(Boolean).map(String);
        if (userIds.length > 0) {
          setFormData(prev => ({ ...prev, usuarios_reporta_ids: userIds }));
        }
        const u0 = init.usuarios_reportan[0];
        if (u0) {
          const normalized = {
            id: u0?.id ?? u0?.usuario_id ?? u0?.userId ?? null,
            nombre: u0?.usuario_nombre ?? u0?.usuarioNombre ?? u0?.nombre ?? u0?.name ?? '',
            dni: u0?.usuario_dni ?? u0?.dni ?? u0?.numero_documento ?? u0?.documento ?? '',
            cargo: u0?.cargo ?? u0?.puesto ?? '',
            telefono: u0?.usuario_telefono ?? u0?.telefono ?? u0?.phone ?? '',
            correoPrincipal: u0?.usuario_correo ?? u0?.email ?? ''
          };
          setUsuarioEncontrado(normalized as any);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isConfigMode]);

  useEffect(() => {
    if (!isOpen || !isConfigMode) return;
    if (tipoSoporte !== 'gestion-ti') return;
    if (usuarioEncontrado) return;
    if (!dniBuscado || dniBuscado.length !== 8) return;
    if (!formData.empresa_id) return;
    buscarUsuarioPorDNI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isConfigMode, tipoSoporte, dniBuscado, formData.empresa_id]);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    const empresaIdNum = Number(formData.empresa_id);
    if (formData.empresa_id && !isNaN(empresaIdNum) && empresaIdNum > 0) {
      loadEmpresaRelatedData(empresaIdNum);
    } else {
      setSedes([]);
      setActivos([]);
      setUsuariosActivo([]);
      setSlaActivo(null);
      setFormData(prev => ({ ...prev, sede_id: '', activos_codigos: [], usuarios_reporta_ids: [], aplica_sla: true }));
    }
  }, [formData.empresa_id]);

  useEffect(() => {
    const empresaIdNum = Number(formData.empresa_id);
    const sedeIdNum = Number(formData.sede_id);
    if (formData.empresa_id && formData.sede_id && !isNaN(empresaIdNum) && !isNaN(sedeIdNum) && empresaIdNum > 0 && sedeIdNum > 0) {
      loadActivosBySede(empresaIdNum, sedeIdNum);
    } else {
      setActivos([]);
      setUsuariosActivo([]);
      setFormData(prev => ({ ...prev, activos_codigos: [], usuarios_reporta_ids: [] }));
    }
  }, [formData.sede_id, formData.empresa_id]);

  useEffect(() => {
    if (formData.activos_codigos.length > 0 && activos.length > 0) {
      const todosLosUsuarios: any[] = [];
      const usuariosUnicos = new Map();
      
      formData.activos_codigos.forEach(codigoActivo => {
        const codigoStr = String(codigoActivo);
        const activoSeleccionado = activos.find(a => String(a.asset_id ?? a.assetId ?? a.id) === codigoStr);
        
        if (activoSeleccionado?.usuariosAsignados?.length) {
          activoSeleccionado.usuariosAsignados.forEach((usuario: any) => {
            const key = usuario.correo || usuario.email || usuario.nombre;
            if (key && !usuariosUnicos.has(key)) {
              const usuarioConActivo = {
                ...usuario,
                activo_codigo: activoSeleccionado.asset_id ?? activoSeleccionado.assetId ?? activoSeleccionado.id,
                activo_area: activoSeleccionado.area || 'Sin área'
              };
              usuariosUnicos.set(key, usuarioConActivo);
              todosLosUsuarios.push(usuarioConActivo);
            }
          });
        }
      });
      
      setUsuariosActivo(todosLosUsuarios);
      setFormData(prev => {
        const nuevosCorreos = todosLosUsuarios.map(u => u.correo);
        const correosUnicos = [...new Set([...prev.usuarios_reporta_ids, ...nuevosCorreos])];
        const usuariosDisponibles = todosLosUsuarios.map(u => u.correo);
        const correosFinales = correosUnicos.filter(correo => usuariosDisponibles.includes(correo));
        return { ...prev, usuarios_reporta_ids: correosFinales };
      });
    } else {
      const hasPrefilledUsers = isConfigMode && Array.isArray(prefilledActivosDetails) && prefilledActivosDetails.some((a: any) => {
        const users = a?.usuariosAsignados || a?.usuarios_asignados || a?.usuarios || a?.usuarioAsignado || a?.usuario_asignado;
        return Array.isArray(users) && users.length > 0;
      });
      if (!hasPrefilledUsers) {
        setUsuariosActivo([]);
      }
    }
  }, [formData.activos_codigos, activos]);

  useEffect(() => {
    if (formData.tipo_ticket) {
      setFormData(prev => ({ ...prev, categoria_id: '', subcategoria_id: '' }));
    }
  }, [formData.tipo_ticket]);

  useEffect(() => {
    if (tipoSoporte === 'activos') {
      setDniBuscado('');
      setUsuarioEncontrado(null);
      setFormData(prev => ({ ...prev, usuarios_reporta_ids: [] }));
    } else if (tipoSoporte === 'gestion-ti') {
      setFormData(prev => ({ ...prev, activos_codigos: [], usuarios_reporta_ids: [] }));
      setUsuariosActivo([]);
    }
  }, [tipoSoporte]);

  useEffect(() => {
    if (formData.categoria_id && catalogoSubcategorias.length > 0) {
      const categoriaIdNum = Number(formData.categoria_id);
      const subcategoriasFiltradas = catalogoSubcategorias.filter(sub => sub.categoriaId === categoriaIdNum);
      setSubcategorias(subcategoriasFiltradas);
    } else {
      setSubcategorias([]);
      setFormData(prev => ({ ...prev, subcategoria_id: '' }));
    }
  }, [formData.categoria_id, catalogoSubcategorias]);

  useEffect(() => {
    if (formData.servicio_id && serviciosDisponibles.length > 0) {
      const servicioSeleccionado = serviciosDisponibles.find(s => String(s.id) === String(formData.servicio_id));
      if (servicioSeleccionado) {
        const tipoServicio = servicioSeleccionado.tipoServicio || servicioSeleccionado.tipo_servicio || '';
        setFormData(prev => ({ ...prev, tipo_servicio: tipoServicio }));
      }
    } else {
      setFormData(prev => ({ ...prev, tipo_servicio: '' }));
    }
  }, [formData.servicio_id, serviciosDisponibles]);

  useEffect(() => {
    if (formData.impacto && formData.urgencia) {
      const prioridad = calcularPrioridad(formData.impacto, formData.urgencia);
      setFormData(prev => ({ ...prev, prioridad }));
    }
  }, [formData.impacto, formData.urgencia]);

  const loadInitialData = async () => {
    try {
      const [empData, catData, tecData, catalogoData, subcatalogoData, tiposData, serviciosData] = await Promise.all([
        getEmpresas(),
        getCategorias(),
        getUsuariosInternos(),
        getCatalogCategories(),
        getCatalogSubcategories(),
        getTicketTypes(),
        getServicios()
      ]);
      
      let usuariosArray = [];
      if (Array.isArray(tecData)) {
        usuariosArray = tecData;
      } else if (tecData?.usuarios && Array.isArray(tecData.usuarios)) {
        usuariosArray = tecData.usuarios;
      } else if (tecData?.data && Array.isArray(tecData.data)) {
        usuariosArray = tecData.data;
      } else if (typeof tecData === 'object' && tecData !== null) {
        const valores = Object.values(tecData);
        const primerArray = valores.find(v => Array.isArray(v));
        if (primerArray) usuariosArray = primerArray as any[];
      }
      
      setEmpresas(empData);
      setCategorias(catData);
      
      const tiposActivos = tiposData.filter((tipo: any) => tipo.activo === true);
      setTiposTicket(tiposActivos);
      
      const tecnicosFiltrados = usuariosArray.filter((u: any) => {
        const rol = String(u.rol || '').toLowerCase().trim();
        return (rol === 'tecnico' || rol === 'técnico' || rol === 'administrador');
      });
      setTecnicos(tecnicosFiltrados);
      
      const categoriasActivas = catalogoData.filter((cat: any) => cat.activo);
      setCatalogoCategorias(categoriasActivas);
      
      const subcategoriasActivas = subcatalogoData.filter((sub: any) => sub.activo);
      setCatalogoSubcategorias(subcategoriasActivas);
      
      const serviciosFiltrados = serviciosData.filter((serv: any) => serv.activo === true && serv.visibleEnTickets === true);
      setServiciosDisponibles(serviciosFiltrados);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    }
  };

  const loadEmpresaRelatedData = async (empresaId: number) => {
    try {
      setSlaStatus('loading');
      const [sedesData, slaData, empresaData] = await Promise.all([
        getSedesByEmpresa(empresaId),
        slaService.getResumen(String(empresaId)).catch(() => null),
        getEmpresaById(empresaId).catch(() => null)
      ]);
      
      const sedesArray = Array.isArray(sedesData) ? sedesData : (sedesData?.data || []);
      setSedes(sedesArray);
      setSlaActivo(slaData);
      setContratoActivo(empresaData?.contrato || null);
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
    const isEmptyObject = (obj: any) => !obj || typeof obj !== 'object' || Object.keys(obj).length === 0;
    const hasResumenFlags =
      typeof sla?.alcance_configurado === 'boolean' ||
      typeof sla?.tiempos_configurados === 'number' ||
      typeof sla?.horarios_configurados === 'number' ||
      typeof sla?.configurado === 'boolean';

    const alcanceConfigurado = hasResumenFlags ? Boolean(sla?.alcance_configurado) : !isEmptyObject(sla?.alcance);
    const tiemposConfigurados = hasResumenFlags ? Number(sla?.tiempos_configurados || 0) > 0 : !isEmptyObject(sla?.tiempos);
    const horariosConfigurados = hasResumenFlags ? Number(sla?.horarios_configurados || 0) > 0 : !isEmptyObject(sla?.horarios);
    const slaCompleto = alcanceConfigurado && tiemposConfigurados && horariosConfigurados;

    if (!sla || !slaCompleto) {
      setSlaStatus('sin-configurar');
      setFormData(prev => ({ ...prev, aplica_sla: false }));
      return;
    }

    const estadoContratoRaw = contrato?.estado_contrato || contrato?.estadoContrato || contrato?.estado || null;
    const estadoContrato = estadoContratoRaw ? String(estadoContratoRaw).toUpperCase() : null;
    
    if (!contrato || !estadoContrato || estadoContrato === 'VENCIDO' || estadoContrato === 'SUSPENDIDO') {
      setSlaStatus('contrato-inactivo');
      setFormData(prev => ({ ...prev, aplica_sla: false }));
      return;
    }

    if (estadoContrato === 'ACTIVO') {
      setSlaStatus('activo');
      setFormData(prev => ({ ...prev, aplica_sla: true }));
      return;
    }

    setSlaStatus('contrato-inactivo');
    setFormData(prev => ({ ...prev, aplica_sla: false }));
  };

  const loadActivosBySede = async (empresaId: number, sedeId: number) => {
    try {
      const activosData = await getInventarioBySede(empresaId, sedeId, true);
      
      let activosArray = [];
      if (activosData?.ok && activosData?.data) {
        activosArray = activosData.data;
      } else if (Array.isArray(activosData)) {
        activosArray = activosData;
      } else if (activosData?.data) {
        activosArray = activosData.data;
      }
      
      setActivos(activosArray);
      try {
        if (isConfigMode && Array.isArray(prefilledActivosDetails) && prefilledActivosDetails.length > 0) {
          prefilledActivosDetails.forEach((pref: any) => {
            const prefCandidates = [pref.activo_codigo, pref.activoCodigo, pref.asset_id, pref.assetId, pref.codigo, pref.codigo_activo, pref.codigoActivo, pref.id, pref.serial, pref.serie].filter(Boolean).map(String);
            if (prefCandidates.length === 0) return;
            const found = activosArray.find((act: any) => {
              const actCandidates = [act.activo_codigo, act.activoCodigo, act.asset_id, act.assetId, act.codigo, act.codigo_activo, act.codigoActivo, act.id, act.serial, act.serie].filter(Boolean).map(String);
              return prefCandidates.some(pc => actCandidates.some(ac => ac && ac.toLowerCase() === pc.toLowerCase()));
            });
            if (found) handleSelectActivoObject(found);
          });
        }
      } catch (err) {
        console.warn('⚠️ Error simulando selección desde prefilledActivosDetails:', err);
      }
      try {
        if (isConfigMode && Array.isArray(formData.activos_codigos) && formData.activos_codigos.length > 0) {
          const reconciled: string[] = [];
          formData.activos_codigos.forEach((code) => {
            const codeStr = String(code).toLowerCase();
            const found = activosArray.find((a: any) => {
              const candidates = [a.id, a.asset_id, a.assetId, a.codigo, a.codigoActivo, a.codigo_activo, a.code, a.serial, a.serie, a.asset_id_local].filter(Boolean).map(String);
              return candidates.some((c: string) => c.toLowerCase() === codeStr);
            });
            if (found) {
              reconciled.push(found.asset_id ? String(found.asset_id) : (found.assetId ? String(found.assetId) : String(found.id)));
            } else {
              reconciled.push(String(code));
            }
          });
          setFormData(prev => ({ ...prev, activos_codigos: reconciled }));

          if (isConfigMode && Array.isArray(prefilledActivosDetails) && prefilledActivosDetails.length > 0) {
            const reconciledFromPrefill: string[] = [];
            prefilledActivosDetails.forEach((a: any) => {
              const candidates = [a.activo_codigo, a.activoCodigo, a.codigo, a.codigo_activo, a.codigoActivo, a.asset_id, a.assetId, a.id, a.serial, a.serie].filter(Boolean).map(String);
              if (candidates.length === 0) return;
              const found = activosArray.find((act: any) => {
                const actCandidates = [act.activo_codigo, act.activoCodigo, act.codigo, act.codigo_activo, act.codigoActivo, act.asset_id, act.assetId, act.id, act.serial, act.serie].filter(Boolean).map(String);
                return candidates.some(c => actCandidates.some(ac => ac && ac.toLowerCase() === c.toLowerCase()));
              });
              if (found) {
                reconciledFromPrefill.push(found.asset_id ? String(found.asset_id) : (found.assetId ? String(found.assetId) : String(found.id)));
              } else {
                const prefer = a.activo_codigo ?? a.activoCodigo ?? a.codigo ?? a.asset_id ?? a.assetId ?? a.id;
                if (prefer) reconciledFromPrefill.push(String(prefer));
              }
            });
            if (reconciledFromPrefill.length > 0) {
              setFormData(prev => ({ ...prev, activos_codigos: reconciledFromPrefill }));
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ Error al reconciliar activos prefill:', err);
      }
    } catch (error) {
      console.error('Error cargando activos:', error);
      setActivos([]);
    }
  };

  const buscarUsuarioPorDNI = async () => {
    if (!dniBuscado.trim() || !formData.empresa_id) return;
    setBuscandoUsuario(true);
    try {
      const usuario = await portalService.buscarUsuarioPorDNI(Number(formData.empresa_id), dniBuscado);
      const normalized = {
        id: usuario?.id ?? usuario?.usuarioId ?? usuario?.userId ?? usuario?._id ?? null,
        nombre: usuario?.nombre ?? usuario?.fullName ?? usuario?.nombre_completo ?? usuario?.name ?? usuario?.usuario_nombre ?? '',
        dni: usuario?.dni ?? usuario?.numero_documento ?? usuario?.numeroDocumento ?? usuario?.documento ?? '',
        cargo: usuario?.cargo ?? usuario?.puesto ?? usuario?.position ?? '',
        telefono: usuario?.telefono ?? usuario?.phone ?? usuario?.celular ?? usuario?.mobile ?? '',
        correoPrincipal: usuario?.correoPrincipal ?? usuario?.correo ?? usuario?.email ?? usuario?.usuario_correo ?? ''
      };
      setUsuarioEncontrado(normalized as any);
      if (normalized.correoPrincipal) {
        setFormData(prev => ({ ...prev, usuarios_reporta_ids: [normalized.correoPrincipal] }));
      } else if (normalized.id) {
        setFormData(prev => ({ ...prev, usuarios_reporta_ids: [String(normalized.id)] }));
      }
    } catch (error: any) {
      console.error('Error buscando usuario por DNI:', error);
      setErrorBusqueda({ show: true, message: error?.response?.data?.message || 'No se encontró usuario con ese DNI en la empresa' });
      setUsuarioEncontrado(null);
    } finally {
      setBuscandoUsuario(false);
    }
  };

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
    if (isConfigMode) {
      const ticketId = Number(initialData?.id || initialData?.ticketId);
      if (!ticketId) { alert('ID del ticket no disponible para configuración'); return; }
      if (tipoSoporte === 'activos' && (!formData.usuarios_reporta_ids || formData.usuarios_reporta_ids.length === 0)) {
        alert('No se puede guardar: debe quedar al menos un usuario que reporta para los activos seleccionados.');
        return;
      }
      const payload: any = {
        servicio_id: formData.servicio_id ? Number(formData.servicio_id) : null,
        tipo_servicio: formData.tipo_servicio || null,
        tipo_ticket: formData.tipo_ticket || null,
        categoria_id: formData.categoria_id ? Number(formData.categoria_id) : null,
        subcategoria_id: formData.subcategoria_id ? Number(formData.subcategoria_id) : null,
        impacto: formData.impacto || null,
        urgencia: formData.urgencia || null,
        prioridad: formData.prioridad || null,
        modalidad: formData.modalidad || null,
        tecnico_asignado_id: formData.tecnico_asignado_id ? Number(formData.tecnico_asignado_id) : null
      };
      setLoading(true);
      try {
        await configurarTicket(ticketId, payload);
        if (onUpdated) await onUpdated();
        onClose();
      } catch (error: any) {
        console.error('❌ Error configurando ticket:', error);
        alert(error?.response?.data?.message || 'Error al configurar ticket');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isFormBlocked) { alert('SLA no ha sido configurado\n\nPor favor complete la configuración del SLA para esta empresa.'); return; }
    if (!formData.empresa_id) { alert('Debe seleccionar una empresa'); return; }
    if (!formData.sede_id) { alert('Debe seleccionar una sede'); return; }
    if (!tipoSoporte) { alert('Debe seleccionar el tipo de soporte'); return; }
    if (!formData.titulo || !formData.descripcion) { alert('Título y descripción son obligatorios'); return; }
    if (formData.usuarios_reporta_ids.length === 0) { alert('Debe haber al menos un usuario que reporta el incidente'); return; }
    if (!formData.tipo_ticket || !formData.categoria_id || !formData.subcategoria_id) { alert('Debe completar la clasificación del ticket'); return; }
    if (!formData.impacto || !formData.urgencia) { alert('Debe completar los datos ITIL'); return; }
    if (!formData.servicio_id || !formData.modalidad) { alert('Debe seleccionar el servicio y la modalidad'); return; }
    if (tipoSoporte === 'activos' && formData.activos_codigos.length === 0) { alert('Para Soporte Técnico a Activos debe seleccionar al menos un activo'); return; }

    setLoading(true);
    try {
      const selectedServicio = serviciosDisponibles.find(s => String(s.id) === String(formData.servicio_id));
      const tipoServicioFinal = formData.tipo_servicio || selectedServicio?.tipoServicio || selectedServicio?.tipo_servicio || '';
      const normalizePrioridad = (p: any) => {
        if (!p && p !== 0) return undefined;
        const raw = String(p).trim();
        const up = raw.toUpperCase();
        if (['BAJA', 'MEDIA', 'ALTA', 'CRITICA'].includes(up)) return up;
        const map: Record<string, string> = {
          'baja': 'BAJA',
          'media': 'MEDIA',
          'alta': 'ALTA',
          'critica': 'CRITICA',
          'crítica': 'CRITICA',
          'crítico': 'CRITICA',
          'critico': 'CRITICA',
          'critical': 'CRITICA',
          'high': 'ALTA',
          'medium': 'MEDIA',
          'low': 'BAJA'
        };
        const lower = raw.toLowerCase();
        return map[lower] || up;
      };
      const ticketData: Record<string, any> = {
        empresa_id: Number(formData.empresa_id),
        sede_id: Number(formData.sede_id),
        tipo_soporte: tipoSoporte,
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        activos_codigos: formData.activos_codigos,
        usuarios_reporta_ids: formData.usuarios_reporta_ids,
        categoria_id: Number(formData.categoria_id),
        subcategoria_id: Number(formData.subcategoria_id),
        impacto: formData.impacto,
        urgencia: formData.urgencia,
        prioridad: normalizePrioridad(formData.prioridad),
        servicio_id: Number(formData.servicio_id),
        tipo_servicio: tipoServicioFinal,
        modalidad: formData.modalidad,
        aplica_sla: formData.aplica_sla,
        tecnico_asignado_id: formData.tecnico_asignado_id ? Number(formData.tecnico_asignado_id) : undefined,
        estado: formData.estado,
        origen: formData.origen,
        archivos: archivos.length > 0 ? archivos : undefined
      };
      // Ensure prioridad is one of allowed values; if not, fallback to 'BAJA'
      const allowedPrioridades = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
      if (!allowedPrioridades.includes(String(ticketData.prioridad))) {
        console.warn('[CreateTicketModal] prioridad inválida, aplicando fallback BAJA:', ticketData.prioridad);
        ticketData.prioridad = 'BAJA';
      }

      ticketData.prioridad = String(ticketData.prioridad).toUpperCase();
      console.log('[CreateTicketModal] prioridad final a enviar:', ticketData.prioridad, 'typeof:', typeof ticketData.prioridad);
      console.log('[CreateTicketModal] Ticket payload previo a onSubmit:', ticketData);
      if (formData.tipo_ticket) ticketData.tipo_ticket = formData.tipo_ticket;
      await onSubmit(ticketData);
      resetForm();
      onClose();
    } catch (error: any) {
      console.error('❌ Error creando ticket:', error);
      const errorMessage = error?.response?.data?.message || error?.response?.data?.errors?.join(', ') || 'Error al crear ticket';
      alert(`Error al crear ticket:\n${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      empresa_id: '', sede_id: '', tipo_ticket: '', categoria_id: '', subcategoria_id: '',
      titulo: '', descripcion: '', activos_codigos: [], ubicacion: '', usuarios_reporta_ids: [],
      servicio_id: '', tipo_servicio: '', impacto: '', urgencia: '', prioridad: '',
      modalidad: '', aplica_sla: true, tecnico_asignado_id: '', estado: 'ABIERTO', origen: 'INTERNO'
    });
    setTipoSoporte(''); setDniBuscado(''); setUsuarioEncontrado(null); setArchivos([]);
    setSedes([]); setActivos([]); setUsuariosActivo([]); setSubcategorias([]);
    setSlaActivo(null); setSearchActivos(''); setSearchUsuarios('');
  };

  const getPrioridadColor = (prioridad: PrioridadTicket | '') => {
    if (!prioridad) return 'text-slate-400';
    const colors = { BAJA: 'text-sky-600', MEDIA: 'text-amber-600', ALTA: 'text-orange-600', CRITICA: 'text-red-600' };
    return colors[prioridad];
  };

  const getPrioridadBg = (prioridad: PrioridadTicket | '') => {
    if (!prioridad) return 'bg-slate-50 border-slate-200 text-slate-400';
    const colors = {
      BAJA: 'bg-sky-50 border-sky-200 text-sky-700',
      MEDIA: 'bg-amber-50 border-amber-200 text-amber-700',
      ALTA: 'bg-orange-50 border-orange-200 text-orange-700',
      CRITICA: 'bg-red-50 border-red-200 text-red-700'
    };
    return colors[prioridad];
  };

  if (!isOpen) return null;
  const isFormBlocked = Boolean(formData.empresa_id && (slaStatus === 'sin-configurar' || slaStatus === 'contrato-inactivo'));

  // Shared input classes
  const inputCls = "w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white text-slate-800 placeholder-slate-400 text-sm font-medium transition-all outline-none";
  const inputDisabledCls = "w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-sm font-medium cursor-not-allowed";
  const selectCls = "w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white text-slate-800 text-sm font-medium transition-all outline-none appearance-none";
  const selectDisabledCls = "w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-400 text-sm font-medium cursor-not-allowed appearance-none";
  const labelCls = "block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5";
  const sectionCls = "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden";
  const sectionHeaderCls = "flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-700";
  const sectionBodyCls = "p-5";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200">
        
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <Tag size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">
                {isConfigMode ? 'Configurar Ticket' : 'Crear Nuevo Ticket'}
              </h2>
              <p className="text-blue-100 text-xs">
                {isConfigMode ? 'Edite los datos de clasificación del ticket' : 'Complete todos los campos obligatorios'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-slate-50">
          <div className="p-5 space-y-4">

            {/* 🔹 IDENTIFICACIÓN */}
            <div className={sectionCls}>
              <div className={sectionHeaderCls}>
                <Building2 size={17} className="text-white" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Identificación</h3>
                <span className="ml-auto text-blue-200 text-xs font-medium">* Campos obligatorios</span>
              </div>
              <div className={sectionBodyCls}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Empresa */}
                  <div>
                    <label className={labelCls}>Empresa <span className="text-red-500 normal-case tracking-normal">*</span></label>
                    <select
                      required
                      value={formData.empresa_id}
                      onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}
                      disabled={isFormBlocked || isConfigMode}
                      className={isFormBlocked || isConfigMode ? selectDisabledCls : selectCls}
                    >
                      <option value="">Seleccionar empresa...</option>
                      {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                    </select>

                    {/* SLA Status */}
                    {formData.empresa_id && (
                      <div className="mt-3">
                        {slaStatus === 'loading' && (
                          <div className="flex items-center gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent shrink-0"></div>
                            <span className="text-sm font-medium text-blue-700">Verificando SLA...</span>
                          </div>
                        )}
                        {slaStatus === 'sin-configurar' && (
                          <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg">
                            <div className="flex items-start gap-2.5">
                              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-bold text-amber-800">SLA no configurado</p>
                                <p className="text-xs text-amber-700 mt-0.5">Complete la configuración del SLA para esta empresa.</p>
                              </div>
                            </div>
                            <button type="button" onClick={() => { onClose(); navigate(`/admin/empresas/${formData.empresa_id}?tab=sla`); }}
                              className="mt-2.5 w-full px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors uppercase tracking-wide">
                              Revisar SLA
                            </button>
                          </div>
                        )}
                        {slaStatus === 'contrato-inactivo' && (
                          <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
                            <div className="flex items-start gap-2.5">
                              <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-bold text-red-800">Contrato suspendido o vencido</p>
                                <p className="text-xs text-red-700 mt-0.5">No se pueden crear tickets mientras el contrato esté inactivo.</p>
                              </div>
                            </div>
                            <button type="button" onClick={() => { onClose(); navigate(`/admin/empresas/${formData.empresa_id}?tab=contrato`); }}
                              className="mt-2.5 w-full px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors uppercase tracking-wide">
                              Revisar Contrato
                            </button>
                          </div>
                        )}
                        {slaStatus === 'activo' && (
                          <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-300 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div>
                              <p className="text-sm font-bold text-emerald-800">SLA Activo</p>
                              <p className="text-xs text-emerald-700">Los tiempos de respuesta se calcularán automáticamente.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sede */}
                  <div>
                    <label className={labelCls}>Sede <span className="text-red-500 normal-case tracking-normal">*</span></label>
                    <select
                      value={formData.sede_id}
                      onChange={(e) => setFormData({ ...formData, sede_id: e.target.value })}
                      disabled={(isFormBlocked || isConfigMode) || !formData.empresa_id || sedes.length === 0}
                      className={((isFormBlocked || isConfigMode) || !formData.empresa_id || sedes.length === 0) ? selectDisabledCls : selectCls}
                    >
                      <option value="">
                        {!formData.empresa_id ? 'Seleccione primero una empresa...' : sedes.length === 0 ? 'Sin sedes registradas' : 'Seleccionar sede...'}
                      </option>
                      {sedes.map(sede => <option key={sede.id} value={sede.id}>{sede.nombre}</option>)}
                    </select>
                    {formData.empresa_id && sedes.length === 0 && (
                      <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                        <span className="text-amber-500">⚠</span> Esta empresa no tiene sedes registradas
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 🎯 TIPO DE SOPORTE */}
            <div className={sectionCls}>
              <div className={sectionHeaderCls}>
                <Wrench size={17} className="text-white" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Tipo de Soporte</h3>
                <span className="ml-auto text-blue-200 text-xs font-medium">* Obligatorio</span>
              </div>
              <div className={sectionBodyCls}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button type="button" onClick={() => setTipoSoporte('activos')}
                    disabled={isFormBlocked || isConfigMode}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${tipoSoporte === 'activos'
                      ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${tipoSoporte === 'activos' ? 'border-blue-500' : 'border-slate-300'}`}>
                        {tipoSoporte === 'activos' && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                      </div>
                      <span className="font-bold text-slate-800 text-sm">Soporte Técnico a Activos</span>
                    </div>
                    <p className="text-xs text-slate-500 ml-6.5">Seleccione uno o más activos con sus usuarios asignados</p>
                  </button>

                  <button type="button" onClick={() => setTipoSoporte('gestion-ti')}
                    disabled={isFormBlocked || isConfigMode}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${tipoSoporte === 'gestion-ti'
                      ? 'border-sky-500 bg-sky-50 shadow-md shadow-sky-100'
                      : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${tipoSoporte === 'gestion-ti' ? 'border-sky-500' : 'border-slate-300'}`}>
                        {tipoSoporte === 'gestion-ti' && <div className="w-2 h-2 rounded-full bg-sky-500"></div>}
                      </div>
                      <span className="font-bold text-slate-800 text-sm">Gestión TI / Seguridad</span>
                    </div>
                    <p className="text-xs text-slate-500 ml-6.5">Busque usuario por DNI para reportes generales</p>
                  </button>
                </div>
              </div>
            </div>

            {/* Soporte a Activos */}
            {tipoSoporte === 'activos' && (
              <div className={sectionCls}>
                <div className={sectionHeaderCls}>
                  <Package size={17} className="text-white" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide">Activos y Usuarios</h3>
                </div>
                <div className={sectionBodyCls}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Activos */}
                    <div>
                      <label className={labelCls}>Activos relacionados <span className="normal-case tracking-normal font-normal text-slate-400">(Múltiple selección)</span></label>

                      {isConfigMode && prefilledActivosDetails && prefilledActivosDetails.length > 0 && (
                        <div className="mb-3 space-y-2">
                          {prefilledActivosDetails.map((a: any, i: number) => (
                            <div key={`prefill-${i}`} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                                <Package size={16} className="text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800">{a.assetId || a.codigo || a.asset_id || a.codigo_activo || a.nombre || `Activo ${i+1}`}</p>
                                <p className="text-xs text-slate-500">{(a.categoria || a.categoria_nombre) ? `${a.categoria || a.categoria_nombre} · ${a.fabricante || a.marca || a.modelo || ''}` : (a.usuarioAsignado || a.usuario_asignado || '')}</p>
                              </div>
                              {a.usuariosAsignados?.length ? <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">{a.usuariosAsignados.length} usuarios</span> : null}
                            </div>
                          ))}
                        </div>
                      )}

                      {formData.activos_codigos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          {formData.activos_codigos.map(codigo => {
                            const activo = activos.find(a => String(a.asset_id ?? a.assetId ?? a.id) === String(codigo));
                            return (
                              <div key={codigo} className="flex items-start gap-2.5 px-3 py-2 bg-white text-slate-800 rounded-lg text-xs border border-blue-200 shadow-sm">
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-blue-700">{activo ? (activo.asset_id ?? activo.assetId ?? activo.codigo ?? activo.id) : codigo}</span>
                                  {activo && (
                                    <>
                                      <span className="text-slate-600">{activo.categoria} — {activo.fabricante} {activo.modelo}</span>
                                      <span className="text-slate-500 flex items-center gap-1 mt-0.5">
                                        <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                        {activo.area || 'Sin área'}
                                      </span>
                                    </>
                                  )}
                                </div>
                                {activo?.codigoAccesoRemoto && (
                                  <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-700 text-white rounded-md text-[10px] shrink-0">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" /><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" /></svg>
                                    <span className="font-bold">{activo.codigoAccesoRemoto}</span>
                                  </div>
                                )}
                                <button type="button" onClick={() => deselectActivo(codigo)}
                                  className="ml-1 hover:bg-red-100 hover:text-red-600 rounded-full p-1 transition-colors shrink-0">
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {formData.sede_id && activos.length > 0 && (
                        <div className="mb-2 space-y-2">
                          <input type="text" placeholder="Buscar activo por código, categoría, fabricante o modelo..."
                            value={searchActivos} onChange={(e) => setSearchActivos(e.target.value)}
                            className={inputCls} />
                          <div className="flex gap-2">
                            <button type="button" disabled={isFormBlocked || (isConfigMode && usuariosActivo.length <= 1)}
                              onClick={() => {
                                const activosFiltrados = activos.filter(activo => {
                                  if (!searchActivos) return true;
                                  const s = searchActivos.toLowerCase();
                                  return (activo.assetId || activo.id || '').toString().toLowerCase().includes(s) ||
                                    (activo.categoria || '').toLowerCase().includes(s) ||
                                    (activo.fabricante || '').toLowerCase().includes(s) ||
                                    (activo.modelo || '').toLowerCase().includes(s);
                                });
                                activosFiltrados.forEach(act => handleSelectActivoObject(act));
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wide">
                              Seleccionar todos
                            </button>
                            <button type="button" disabled={isFormBlocked || (isConfigMode && usuariosActivo.length <= 1)}
                              onClick={() => { const actuales = [...(formData.activos_codigos || [])]; actuales.forEach(c => deselectActivo(c)); }}
                              className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wide">
                              Limpiar
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto bg-white">
                        {!formData.sede_id ? (
                          <div className="p-5 text-center text-slate-400 text-sm">
                            <Package size={24} className="mx-auto mb-2 text-slate-300" />
                            Primero seleccione una sede
                          </div>
                        ) : activos.length === 0 ? (
                          <div className="p-5 text-center text-slate-400 text-sm">
                            <Package size={24} className="mx-auto mb-2 text-slate-300" />
                            Esta sede no tiene activos registrados
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {activos.filter(activo => {
                              if (!searchActivos) return true;
                              const s = searchActivos.toLowerCase();
                              return (activo.assetId || activo.id || '').toString().toLowerCase().includes(s) ||
                                (activo.categoria || '').toLowerCase().includes(s) ||
                                (activo.fabricante || '').toLowerCase().includes(s) ||
                                (activo.modelo || '').toLowerCase().includes(s);
                            }).map(activo => {
                              const codigoActivo = activo.assetId || activo.id;
                              const isSelected = formData.activos_codigos.includes(codigoActivo);
                              return (
                                <label key={codigoActivo} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                                  <input type="checkbox" checked={isSelected}
                                    onChange={(e) => { if (e.target.checked) handleSelectActivoObject(activo); else deselectActivo(codigoActivo); }}
                                    disabled={isFormBlocked || isConfigMode}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-400 disabled:cursor-not-allowed" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-800">{codigoActivo}</div>
                                    <div className="text-xs text-slate-500">{activo.categoria} — {activo.fabricante} {activo.modelo}</div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Usuarios */}
                    <div>
                      <label className={labelCls}>Usuarios que reportan <span className="normal-case tracking-normal font-normal text-slate-400">(Múltiple selección)</span></label>

                      {formData.usuarios_reporta_ids.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3 p-3 bg-sky-50 rounded-lg border border-sky-200">
                          {formData.usuarios_reporta_ids.map(usuarioCorreo => {
                            const usuario = usuariosActivo.find(u => u.correo === usuarioCorreo);
                            return (
                              <div key={usuarioCorreo} className="flex items-start gap-2 px-3 py-2 bg-white text-slate-800 rounded-lg text-xs border border-sky-200 shadow-sm">
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-sky-700">{usuario ? usuario.nombre : usuarioCorreo}</span>
                                  {usuario && (
                                    <>
                                      <span className="text-slate-600">{usuario.correo}</span>
                                      <span className="text-slate-500 italic">{usuario.cargo}</span>
                                      <span className="text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                                        {usuario.activo_codigo}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <button type="button"
                                  onClick={() => {
                                    if (isConfigMode && tipoSoporte === 'activos') {
                                      const actuales = formData.usuarios_reporta_ids || [];
                                      if (actuales.length <= 1) return;
                                      const nuevos = actuales.filter(c => c !== usuarioCorreo);
                                      if (nuevos.length === 0 && usuariosActivo.length > 0) {
                                        setFormData({ ...formData, usuarios_reporta_ids: [usuariosActivo[0].correo] });
                                      } else {
                                        setFormData({ ...formData, usuarios_reporta_ids: nuevos });
                                      }
                                      return;
                                    }
                                    setFormData({ ...formData, usuarios_reporta_ids: formData.usuarios_reporta_ids.filter(c => c !== usuarioCorreo) });
                                  }}
                                  disabled={isConfigMode && tipoSoporte === 'activos' && usuariosActivo.length <= 1}
                                  className="ml-1 hover:bg-red-100 hover:text-red-600 rounded-full p-1 transition-colors disabled:opacity-50 shrink-0">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {formData.activos_codigos.length > 0 && usuariosActivo.length > 0 && (
                        <div className="mb-2 space-y-2">
                          <input type="text" placeholder="Buscar usuario por nombre, correo o cargo..."
                            value={searchUsuarios} onChange={(e) => setSearchUsuarios(e.target.value)}
                            disabled={isFormBlocked || isConfigMode}
                            className={isFormBlocked || isConfigMode ? inputDisabledCls : inputCls} />
                          <div className="flex gap-2">
                            <button type="button"
                              disabled={isFormBlocked || (isConfigMode && usuariosActivo.length <= 1)}
                              onClick={() => {
                                const usuariosFiltrados = usuariosActivo.filter(u => {
                                  if (!searchUsuarios) return true;
                                  const s = searchUsuarios.toLowerCase();
                                  return (u.nombre || '').toLowerCase().includes(s) || (u.correo || '').toLowerCase().includes(s) || (u.cargo || '').toLowerCase().includes(s);
                                });
                                const todos = usuariosFiltrados.map(u => u.correo);
                                if (isConfigMode && usuariosActivo.length > 1) {
                                  setFormData({ ...formData, usuarios_reporta_ids: todos });
                                } else if (!isConfigMode) {
                                  setFormData({ ...formData, usuarios_reporta_ids: todos });
                                }
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wide">
                              Seleccionar todos
                            </button>
                            <button type="button"
                              disabled={isFormBlocked || (isConfigMode && usuariosActivo.length <= 1)}
                              onClick={() => {
                                if (isConfigMode) {
                                  if (usuariosActivo.length === 1) return;
                                  const primera = usuariosActivo[0]?.correo;
                                  if (primera) setFormData({ ...formData, usuarios_reporta_ids: [primera] });
                                  return;
                                }
                                setFormData({ ...formData, usuarios_reporta_ids: [] });
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wide">
                              Limpiar
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto bg-white">
                        {formData.activos_codigos.length === 0 ? (
                          <div className="p-5 text-center text-slate-400 text-sm">
                            <User size={24} className="mx-auto mb-2 text-slate-300" />
                            Primero seleccione al menos un activo
                          </div>
                        ) : usuariosActivo.length === 0 ? (
                          <div className="p-5 text-center text-slate-400 text-sm">
                            <User size={24} className="mx-auto mb-2 text-slate-300" />
                            Los activos seleccionados no tienen usuarios asignados
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {usuariosActivo.filter(usuario => {
                              if (!searchUsuarios) return true;
                              const s = searchUsuarios.toLowerCase();
                              return (usuario.nombre || '').toLowerCase().includes(s) || (usuario.correo || '').toLowerCase().includes(s) || (usuario.cargo || '').toLowerCase().includes(s);
                            }).map(usuario => {
                              const usuarioCorreo = usuario.correo;
                              const isSelected = formData.usuarios_reporta_ids.includes(usuarioCorreo);
                              const esUnicoUsuario = usuariosActivo.length === 1;
                              return (
                                <label key={usuarioCorreo} className={`flex items-center gap-3 px-4 py-3 transition-colors ${esUnicoUsuario ? 'bg-sky-50 border-l-4 border-sky-500' : `cursor-pointer ${isSelected ? 'bg-sky-50' : 'hover:bg-slate-50'}`}`}>
                                  <input type="checkbox" checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormData({ ...formData, usuarios_reporta_ids: [...formData.usuarios_reporta_ids, usuarioCorreo] });
                                      } else {
                                        if (isConfigMode && tipoSoporte === 'activos') {
                                          const actuales = formData.usuarios_reporta_ids || [];
                                          if (actuales.length <= 1) { alert('Debe quedar al menos un usuario seleccionado.'); return; }
                                        }
                                        setFormData({ ...formData, usuarios_reporta_ids: formData.usuarios_reporta_ids.filter(c => c !== usuarioCorreo) });
                                      }
                                    }}
                                    disabled={isFormBlocked || (isConfigMode && esUnicoUsuario)}
                                    className="w-4 h-4 text-sky-600 border-slate-300 rounded focus:ring-sky-400 disabled:cursor-not-allowed" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                      {usuario.nombre}
                                      {esUnicoUsuario && <span className="text-[10px] bg-sky-600 text-white px-2 py-0.5 rounded-full font-bold uppercase">Requerido</span>}
                                    </div>
                                    <div className="text-xs text-slate-500">{usuario.correo} · {usuario.cargo}</div>
                                    <div className="text-xs text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                                      {usuario.activo_codigo} ({usuario.activo_area})
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gestión TI/Seguridad */}
            {tipoSoporte === 'gestion-ti' && (
              <div className={sectionCls}>
                <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-sky-600 to-sky-500 border-b border-sky-700">
                  <User size={17} className="text-white" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide">Búsqueda de Usuario</h3>
                </div>
                <div className={sectionBodyCls}>
                  <label className={labelCls}>Buscar usuario por DNI</label>
                  <div className="flex gap-2 mb-4">
                    <input type="text" value={dniBuscado}
                      onChange={(e) => setDniBuscado(e.target.value.replace(/\D/g, ''))}
                      maxLength={8} placeholder="Ingrese DNI (8 dígitos)"
                      disabled={(isFormBlocked || isConfigMode) || !formData.empresa_id}
                      className={((isFormBlocked || isConfigMode) || !formData.empresa_id) ? `flex-1 ${inputDisabledCls}` : `flex-1 ${inputCls}`} />
                    <button type="button" onClick={buscarUsuarioPorDNI}
                      disabled={(isFormBlocked || isConfigMode) || buscandoUsuario || !dniBuscado.trim() || !formData.empresa_id || dniBuscado.length !== 8}
                      className="px-5 py-2.5 bg-sky-600 text-white text-sm font-bold rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-wide">
                      {buscandoUsuario ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>

                  {usuarioEncontrado && (
                    <div className="bg-gradient-to-br from-emerald-50 to-sky-50 border-2 border-emerald-300 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-emerald-600" />
                          Usuario Encontrado
                        </h4>
                        <button type="button" disabled={isFormBlocked || isConfigMode}
                          onClick={() => { setUsuarioEncontrado(null); setDniBuscado(''); setFormData(prev => ({ ...prev, usuarios_reporta_ids: [] })); }}
                          className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50">
                          <X size={18} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { label: 'Nombre Completo', value: usuarioEncontrado.nombre },
                          { label: 'DNI', value: usuarioEncontrado.dni, mono: true },
                          { label: 'Correo', value: usuarioEncontrado.correoPrincipal },
                          { label: 'Teléfono', value: usuarioEncontrado.telefono },
                          ...(usuarioEncontrado.cargo ? [{ label: 'Cargo', value: usuarioEncontrado.cargo, full: true }] : [])
                        ].map((field: any) => (
                          <div key={field.label} className={`bg-white rounded-lg p-3 border border-white/60 shadow-sm ${field.full ? 'col-span-2' : ''}`}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">{field.label}</p>
                            <p className={`font-bold text-slate-800 text-sm ${field.mono ? 'font-mono text-emerald-700' : ''}`}>{field.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!formData.empresa_id && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
                      <AlertCircle size={13} /> Primero seleccione una empresa para buscar usuarios
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 📝 DESCRIPCIÓN */}
            <div className={sectionCls}>
              <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-violet-600 to-blue-600 border-b border-violet-700">
                <Tag size={17} className="text-white" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Descripción del Incidente</h3>
              </div>
              <div className={sectionBodyCls}>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Título <span className="text-red-500 normal-case tracking-normal">*</span></label>
                    <input type="text" required value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      placeholder="Ej: Impresora no funciona en área de contabilidad"
                      disabled={isFormBlocked || isConfigMode}
                      className={isFormBlocked || isConfigMode ? inputDisabledCls : inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Descripción detallada <span className="text-red-500 normal-case tracking-normal">*</span></label>
                    <textarea required value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Describa el evento/incidente con el mayor detalle posible..."
                      rows={4} disabled={isFormBlocked || isConfigMode}
                      className={`${isFormBlocked || isConfigMode ? inputDisabledCls : inputCls} resize-none`} />
                  </div>
                </div>
              </div>
            </div>

            {/* 🏷️ CLASIFICACIÓN */}
            <div className={sectionCls}>
              <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-blue-600 to-sky-500 border-b border-blue-700">
                <Wrench size={17} className="text-white" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Clasificación</h3>
              </div>
              <div className={sectionBodyCls}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Tipo de Ticket <span className="text-red-500 normal-case tracking-normal">*</span></label>
                    <select value={formData.tipo_ticket} onChange={(e) => setFormData({ ...formData, tipo_ticket: e.target.value })}
                      disabled={isFormBlocked} className={isFormBlocked ? selectDisabledCls : selectCls}>
                      <option value="">Seleccionar tipo...</option>
                      {tiposTicket.map(tipo => <option key={tipo.id} value={tipo.nombre}>{tipo.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Categoría</label>
                    <select value={formData.categoria_id} onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                      disabled={isFormBlocked} className={isFormBlocked ? selectDisabledCls : selectCls}>
                      <option value="">Seleccionar categoría...</option>
                      {catalogoCategorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Subcategoría</label>
                    <select value={formData.subcategoria_id} onChange={(e) => setFormData({ ...formData, subcategoria_id: e.target.value })}
                      disabled={isFormBlocked || !formData.categoria_id} className={isFormBlocked || !formData.categoria_id ? selectDisabledCls : selectCls}>
                      <option value="">Seleccionar subcategoría...</option>
                      {subcategorias.map((sub: any) => <option key={sub.id} value={sub.id}>{sub.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className={labelCls}>Servicio</label>
                    <select value={formData.servicio_id} onChange={(e) => setFormData({ ...formData, servicio_id: e.target.value })}
                      disabled={isFormBlocked} className={isFormBlocked ? selectDisabledCls : selectCls}>
                      <option value="">Seleccionar servicio...</option>
                      {serviciosDisponibles.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Tipo de Servicio <span className="normal-case tracking-normal font-normal text-slate-400">(Automático)</span></label>
                    <input type="text" value={formData.tipo_servicio} disabled
                      placeholder="Se asigna automáticamente"
                      className={inputDisabledCls} />
                  </div>
                </div>
              </div>
            </div>

            {/* ⚡ PRIORIZACIÓN ITIL */}
            <div className={sectionCls}>
              <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 border-b border-orange-600">
                <AlertCircle size={17} className="text-white" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Priorización ITIL</h3>
              </div>
              <div className={sectionBodyCls}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Impacto <span className="text-red-500 normal-case tracking-normal">*</span></label>
                    <select value={formData.impacto} onChange={(e) => setFormData({ ...formData, impacto: e.target.value as Impacto })}
                      disabled={isFormBlocked} className={isFormBlocked ? selectDisabledCls : selectCls}>
                      <option value="">Seleccionar impacto...</option>
                      <option value="BAJO">Bajo — Afecta a un usuario</option>
                      <option value="MEDIO">Medio — Afecta a un área</option>
                      <option value="ALTO">Alto — Afecta a múltiples áreas</option>
                      <option value="CRITICO">Crítico — Toda la organización</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Urgencia <span className="text-red-500 normal-case tracking-normal">*</span></label>
                    <select value={formData.urgencia} onChange={(e) => setFormData({ ...formData, urgencia: e.target.value as Urgencia })}
                      disabled={isFormBlocked} className={isFormBlocked ? selectDisabledCls : selectCls}>
                      <option value="">Seleccionar urgencia...</option>
                      <option value="BAJA">Baja — Puede esperar</option>
                      <option value="MEDIA">Media — Resolver en días</option>
                      <option value="ALTA">Alta — Resolver en horas</option>
                      <option value="CRITICA">Crítica — Inmediata</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Prioridad <span className="normal-case tracking-normal font-normal text-slate-400">(Calculada)</span></label>
                    <div className={`w-full px-3 py-2.5 border rounded-lg font-bold text-sm ${getPrioridadBg(formData.prioridad)}`}>
                      {formData.prioridad || <span className="font-normal text-slate-400">Seleccione impacto y urgencia</span>}
                    </div>
                  </div>
                </div>
                {formData.prioridad && (
                  <div className="mt-3 text-xs text-slate-600 bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-center gap-2">
                    <span className="text-blue-500 font-bold">ℹ</span>
                    <span><strong>Matriz ITIL:</strong> La prioridad se calcula automáticamente combinando Impacto y Urgencia.</span>
                  </div>
                )}
              </div>
            </div>

            {/* 🔧 SERVICIO Y ASIGNACIÓN */}
            <div className={sectionCls}>
              <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-blue-700 to-blue-600 border-b border-blue-800">
                <User size={17} className="text-white" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Servicio y Asignación</h3>
              </div>
              <div className={sectionBodyCls}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Modalidad de Servicio</label>
                    <select value={formData.modalidad} onChange={(e) => setFormData({ ...formData, modalidad: e.target.value })}
                      disabled={isFormBlocked} className={isFormBlocked ? selectDisabledCls : selectCls}>
                      <option value="">Seleccionar modalidad...</option>
                      <option value="REMOTO">Remoto</option>
                      <option value="PRESENCIAL">Presencial</option>
                      <option value="HIBRIDO">Híbrido</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Asignar Técnico <span className="normal-case tracking-normal font-normal text-slate-400">(Opcional)</span></label>
                    <select value={formData.tecnico_asignado_id} onChange={(e) => setFormData({ ...formData, tecnico_asignado_id: e.target.value })}
                      disabled={isFormBlocked} className={isFormBlocked ? selectDisabledCls : selectCls}>
                      <option value="">Sin asignar</option>
                      {tecnicos.length === 0 ? (
                        <option disabled>No hay técnicos disponibles</option>
                      ) : tecnicos.map(tec => {
                        const nombre = tec.nombre || tec.nombreCompleto || tec.usuario || tec.username || tec.email || 'Sin nombre';
                        const rol = tec.rol || 'Sin rol';
                        return <option key={tec.usuario_id || tec.id} value={tec.usuario_id || tec.id}>{nombre} — {rol}</option>;
                      })}
                    </select>
                    {tecnicos.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                        <span className="text-blue-400">ℹ</span> Solo usuarios con rol Administrador o Técnico
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 📎 ADJUNTOS */}
            <div className={sectionCls}>
              <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-slate-600 to-slate-500 border-b border-slate-700">
                <Upload size={17} className="text-white" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Adjuntos <span className="normal-case tracking-normal font-normal text-slate-300">(Opcional)</span></h3>
              </div>
              <div className={sectionBodyCls}>
                <label className="block">
                  <input type="file" multiple onChange={handleFileChange}
                    disabled={isFormBlocked || isConfigMode}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                      file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50" />
                </label>

                {archivos.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {archivos.map((file, index) => (
                      <li key={index} className="flex items-center justify-between bg-blue-50 border border-blue-200 px-4 py-2.5 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">{file.name}</span>
                        <button type="button" onClick={() => removeFile(index)}
                          className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-wide">
                          Eliminar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {isConfigMode && initialAdjuntosLocal && initialAdjuntosLocal.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Adjuntos del ticket</h4>
                    <div className="space-y-2">
                      {initialAdjuntosLocal.map((adj: any, idx: number) => {
                        let fileName = `Adjunto ${idx + 1}`;
                        let href = '#';
                        const isObj = typeof adj === 'object' && adj !== null;
                        if (isObj) {
                          fileName = adj.nombre || adj.name || fileName;
                          href = adj.id && initialData?.id ? `/api/tickets/${initialData.id}/adjuntos/${adj.id}/download` : (adj.url || '#');
                        } else if (typeof adj === 'string') {
                          fileName = adj.split('/').pop() || fileName;
                          href = adj;
                        }
                        return (
                          <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                            <div className="text-sm font-medium text-slate-700 truncate">{fileName}</div>
                            <a href={href} download className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-wide">Ver / Descargar</a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ── Footer ── */}
          <div className="bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} disabled={loading}
              className="px-5 py-2.5 border-2 border-slate-200 rounded-lg text-slate-700 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 uppercase tracking-wide">
              Cancelar
            </button>
            <button type="submit" disabled={loading || (!isConfigMode && isFormBlocked)}
              className="px-7 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold text-sm hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-200 uppercase tracking-wide">
              {loading
                ? (isConfigMode ? 'Guardando...' : 'Creando...')
                : (isConfigMode ? 'Guardar cambios' : 'Crear Ticket')}
            </button>
          </div>
        </form>
      </div>

      {/* ── Modal Error DNI ── */}
      {errorBusqueda.show && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                  <AlertCircle size={18} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">Usuario No Encontrado</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <X size={22} className="text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-slate-700 text-sm leading-relaxed">{errorBusqueda.message}</p>
                  <div className="mt-3 bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                    <p className="text-sm font-bold text-amber-800">DNI buscado: <span className="font-mono">{dniBuscado}</span></p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">Sugerencias</p>
                <ul className="text-sm text-blue-700 space-y-1 ml-3 list-disc">
                  <li>Verifique que el DNI sea correcto (8 dígitos)</li>
                  <li>Asegúrese que el usuario esté registrado en esta empresa</li>
                  <li>Contacte al administrador si el problema persiste</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setErrorBusqueda({ show: false, message: '' }); setDniBuscado(''); }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold text-sm hover:from-blue-700 hover:to-blue-800 transition-all shadow-md uppercase tracking-wide">
                  Intentar de nuevo
                </button>
                <button onClick={() => setErrorBusqueda({ show: false, message: '' })}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors uppercase tracking-wide">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTicketModal;
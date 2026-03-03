import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { getWarrantyInfo } from "@/modules/inventario/utils/warranty";
import { formatAssetCode, getCompanyPrefix, getCategoryPrefix } from "@/utils/helpers";
import type { Category, FieldOption, SubField } from "@/modules/inventario/services/categoriasService";
import { createActivo, updateActivo } from "@/modules/inventario/services/inventarioService";
import { getUsuariosByEmpresa, type Usuario } from "@/modules/usuarios/services/usuariosService";
import { getMarcas, type MarcaItemAPI } from '@/modules/inventario/services/marcasService';

interface AreaItem {
  id?: string | number;
  _id?: string;
  name?: string;
  nombre?: string;
  responsable?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresaId?: string;
  sedeId?: string;
  onSuccess?: (item: Record<string, unknown>) => void;
  empresaNombre?: string;
  sedeNombre?: string;
  empresa?: { id?: number; _id?: string; nombre?: string } | null;
  sedes?: Array<{ id?: number; _id?: string; nombre?: string }>;
  areas?: AreaItem[];
  categories?: Category[];
  groups?: Array<{ id?: string; nombre?: string; codigo?: string }>;
  editingAsset?: Record<string, unknown> | null;
}

type StorageEntry = { tipo: string; capacidad: string };
type RAMEntry = { tipo: string; capacidad: string };

const RegisterAssetModal = ({
  isOpen,
  onClose,
  empresaId,
  sedeId,
  onSuccess,
  empresaNombre,
  sedeNombre,
  empresa,
  sedes,
  areas,
  categories = [],
  groups = [],
  editingAsset = null,
}: Props) => {
  const navigate = useNavigate();
  // Props monitoring disabled to reduce console noise
  
  // Basic fields
  const [categoria, setCategoria] = useState<string>("");
  const [fabricante, setFabricante] = useState<string>("");
  const [modelo, setModelo] = useState<string>("");
  const [serie, setSerie] = useState<string>("");
  const [assetId, setAssetId] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [responsable, setResponsable] = useState<string>("");
  const [selectedSedeId, setSelectedSedeId] = useState<string | undefined>(sedeId);

  // Sincronizar selectedSedeId cuando cambia sedeId de props
  useEffect(() => {
    if (sedeId) {
      setSelectedSedeId(sedeId);
    }
  }, [sedeId]);

  // Laptop fields
  const [lapCpu, setLapCpu] = useState<string>("");
  const [lapCpuSerie, setLapCpuSerie] = useState<string>("");
  const [lapRams, setLapRams] = useState<RAMEntry[]>([]);
  const [lapStorages, setLapStorages] = useState<StorageEntry[]>([]);
  const [lapGpuIntegrada, setLapGpuIntegrada] = useState<string>("");
  const [lapGpuDedicada, setLapGpuDedicada] = useState<string>("");

  // PC fields
  const [pcCpu, setPcCpu] = useState<string>("");
  const [pcCpuGen, setPcCpuGen] = useState<string>("");
  const [pcCooler, setPcCooler] = useState<string>("");
  const [pcPlacaBase, setPcPlacaBase] = useState<string>("");
  const [pcChipset, setPcChipset] = useState<string>("");
  const [pcRams, setPcRams] = useState<RAMEntry[]>([]);
  const [pcStorages, setPcStorages] = useState<StorageEntry[]>([]);
  const [pcGpuIntegrada, setPcGpuIntegrada] = useState<string>("");
  const [pcGpuDedicada, setPcGpuDedicada] = useState<string>("");
  const [pcFuente, setPcFuente] = useState<string>("");

  // Servidor fields
  const [srvCpuModelo, setSrvCpuModelo] = useState<string>("");
  const [srvCpuCantidad, setSrvCpuCantidad] = useState<string>("");
  const [srvCpuGen, setSrvCpuGen] = useState<string>("");
  const [srvRams, setSrvRams] = useState<RAMEntry[]>([]);
  const [srvStorages, setSrvStorages] = useState<StorageEntry[]>([]);
  const [srvRaidControladora, setSrvRaidControladora] = useState<string>("");
  const [srvTipo, setSrvTipo] = useState<string>("");
  const [srvSO, setSrvSO] = useState<string>("");
  const [srvSOVer, setSrvSOVer] = useState<string>("");
  const [srvVirtualizacion, setSrvVirtualizacion] = useState<string>("");
  const [srvRoles, setSrvRoles] = useState<string>("");
  const [srvBackup, setSrvBackup] = useState<string>("No");

  // Common fields
  const [estadoActivo, setEstadoActivo] = useState<string>("activo");
  const [estadoOperativo, setEstadoOperativo] = useState<string>("operativo");
  const [fechaCompra, setFechaCompra] = useState<string>("");
  const [fechaFinGarantia, setFechaFinGarantia] = useState<string>("");
  const [proveedor, setProveedor] = useState<string>("");
  const [tipoDocumentoCompra, setTipoDocumentoCompra] = useState<string>("Desconocido");
  const [numeroDocumentoCompra, setNumeroDocumentoCompra] = useState<string>("");
  const [fechaCompraUnknown, setFechaCompraUnknown] = useState<boolean>(false);
  const [fechaCompraAprox, setFechaCompraAprox] = useState<string>("");
  const [purchaseDocumentFile, setPurchaseDocumentFile] = useState<File | null>(null);
  const [purchaseDocumentExisting, setPurchaseDocumentExisting] = useState<string>("");
  const [purchaseDocumentDescription, setPurchaseDocumentDescription] = useState<string>("");

  // Warranty / files
  const [garantiaDuracion, setGarantiaDuracion] = useState<string>("");
  const [warrantyDocumentFile, setWarrantyDocumentFile] = useState<File | null>(null);
  const [warrantyDocumentExisting, setWarrantyDocumentExisting] = useState<string>("");
  const [warrantyDocumentDescription, setWarrantyDocumentDescription] = useState<string>("");

  const [condicionFisica, setCondicionFisica] = useState<string>("");
  const [antiguedadCalculada, setAntiguedadCalculada] = useState<string>("");
  const [ip, setIp] = useState<string>("");
  const [mac, setMac] = useState<string>("");
  const [codigoAccesoRemoto, setCodigoAccesoRemoto] = useState<string>("");
  const [usuariosAsignadosIds, setUsuariosAsignadosIds] = useState<string[]>([]);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [observaciones, setObservaciones] = useState<string>("");
  const [fotos, setFotos] = useState<Array<{ file: File; description: string }>>([]);
  const [fotosExistentes, setFotosExistentes] = useState<Array<{ url: string; name: string; description: string }>>([]);
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});
  const [dynamicArrayFields, setDynamicArrayFields] = useState<Record<string, Array<Record<string, string>>>>({});
  const [showMotivoModal, setShowMotivoModal] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [marcasList, setMarcasList] = useState<MarcaItemAPI[]>([]);

  // Helper para generar una clave interna estable (sin espacios) a partir de la etiqueta
  const getFieldKey = (label: string) => String(label || '').trim().replace(/\s+/g, '_');
  // Cargar usuarios cuando cambia la empresa o sede
  useEffect(() => {
    const loadUsuarios = async () => {
      setLoadingUsuarios(true);
      try {
        if (empresaId) {
          const res = await getUsuariosByEmpresa(empresaId);
          const list = res?.data || res || [];
          setUsuariosDisponibles(Array.isArray(list) ? list : []);
        } else {
          setUsuariosDisponibles([]);
        }
      } catch (err) {
        console.error('Error cargando usuarios:', err);
        setUsuariosDisponibles([]);
      } finally {
        setLoadingUsuarios(false);
      }
    };
    loadUsuarios();
  }, [empresaId, sedeId]);

  // Calcular fechaFinGarantia automáticamente cuando cambien fechaCompra/fechaCompraAprox o garantiaDuracion
  useEffect(() => {
    try {
      const inputFecha = tipoDocumentoCompra === 'Desconocido' ? (fechaCompraAprox || fechaCompra) : (fechaCompra || fechaCompraAprox);
      const info = getWarrantyInfo({
        fechaCompra: inputFecha,
        garantiaDuracion: garantiaDuracion,
        garantia: garantiaDuracion
      });
      if (info && info.expiresAt) {
        // Guardar como YYYY-MM-DD para inputs y payload
        const d = new Date(info.expiresAt);
        if (!isNaN(d.getTime())) {
          const iso = d.toISOString().split('T')[0];
          Promise.resolve().then(() => setFechaFinGarantia(iso));
          return;
        }
      }
      // Si no hay expiración calculada, limpiar
      Promise.resolve().then(() => setFechaFinGarantia(''));
    } catch (e) {
      console.error('Error calculando fechaFinGarantia automáticamente:', e);
      Promise.resolve().then(() => setFechaFinGarantia(''));
    }
  }, [fechaCompra, fechaCompraAprox, garantiaDuracion, tipoDocumentoCompra]);

  // Calcular antigüedad (años/meses) automáticamente a partir de fechaCompra/fechaCompraAprox
  useEffect(() => {
    try {
      const inputFecha = tipoDocumentoCompra === 'Desconocido' ? (fechaCompraAprox || fechaCompra) : (fechaCompra || fechaCompraAprox);
      if (!inputFecha) {
        Promise.resolve().then(() => setAntiguedadCalculada(''));
        return;
      }
      const maybeYear = Number(String(inputFecha).slice(0, 4));
      const now = new Date();
      if (!Number.isNaN(maybeYear) && String(inputFecha).length <= 4) {
        const years = now.getFullYear() - maybeYear;
        const v = years > 0 ? `${years} año${years > 1 ? 's' : ''}` : '0 años';
        Promise.resolve().then(() => setAntiguedadCalculada(v));
        return;
      }
      const d = new Date(String(inputFecha));
      if (isNaN(d.getTime())) {
        Promise.resolve().then(() => setAntiguedadCalculada(''));
        return;
      }
      let years = now.getFullYear() - d.getFullYear();
      let months = now.getMonth() - d.getMonth();
      if (months < 0) { years -= 1; months += 12; }
      if (years <= 0 && months <= 0) {
        Promise.resolve().then(() => setAntiguedadCalculada('0 meses'));
        return;
      }
      if (years <= 0) {
        const v = `${months} mes${months > 1 ? 'es' : ''}`;
        Promise.resolve().then(() => setAntiguedadCalculada(v));
        return;
      }
      if (months <= 0) {
        const v = `${years} año${years > 1 ? 's' : ''}`;
        Promise.resolve().then(() => setAntiguedadCalculada(v));
        return;
      }
      const v = `${years} año${years > 1 ? 's' : ''} ${months} mes${months > 1 ? 'es' : ''}`;
      Promise.resolve().then(() => setAntiguedadCalculada(v));
    } catch (e) {
      Promise.resolve().then(() => setAntiguedadCalculada(''));
    }
  }, [fechaCompra, fechaCompraAprox, tipoDocumentoCompra]);

  // Cargar datos cuando se está editando
  useEffect(() => {
    if (isOpen && editingAsset) {
      Promise.resolve().then(() => {
        const asset = editingAsset as Record<string, unknown>;
        
        setCategoria(String(asset['categoria'] ?? ''));
        setFabricante(String(asset['fabricante'] ?? ''));
        setModelo(String(asset['modelo'] ?? ''));
        setSerie(String(asset['serie'] ?? ''));
        setAssetId(String(asset['assetId'] ?? asset['codigo'] ?? ''));
        
        const areaValue = String(asset['area'] ?? '');
        setArea(areaValue);
        setProveedor(String(asset['proveedor'] ?? ''));

        // intentar obtener responsable desde el área si no viene en el activo
        const areaNameFromAsset = areaValue;
        // Usar las áreas que vienen en el activo o las que vienen como prop
        const areasToUse = Array.isArray(areas) ? areas : (asset['_areasDisponibles'] as any[] || []);
        if (!String(asset['responsable'] ?? '').trim() && areaNameFromAsset && Array.isArray(areasToUse) && areasToUse.length > 0) {
          const found = areasToUse.find(a => String(a.name ?? a.nombre ?? '') === areaNameFromAsset);
          if (found) {
            const responsableValue = String(found.responsable ?? '');
            setResponsable(responsableValue);
          } else {
            setResponsable('');
          }
        } else {
          const responsableValue = String(asset['responsable'] ?? asset['responsable_name'] ?? '');
          setResponsable(responsableValue);
        }

        // Convertir fechas ISO a formato YYYY-MM-DD para input[type="date"]
        if (asset['fechaCompra']) {
          const fecha = new Date(String(asset['fechaCompra']));
          setFechaCompra(fecha.toISOString().split('T')[0]);
        }
        if (asset['fechaFinGarantia']) {
          const fecha = new Date(String(asset['fechaFinGarantia']));
          setFechaFinGarantia(fecha.toISOString().split('T')[0]);
        }

        setIp(String(asset['ip'] ?? ''));
        setMac(String(asset['mac'] ?? ''));
        setCodigoAccesoRemoto(String(asset['codigoAccesoRemoto'] ?? ''));
        setObservaciones(String(asset['observaciones'] ?? ''));

      // Cargar información contable/compra y garantía si existe
          try {
            setTipoDocumentoCompra(String(asset['tipoDocumentoCompra'] ?? asset['tipo_documento_compra'] ?? 'Desconocido'));
            setNumeroDocumentoCompra(String(asset['numeroDocumentoCompra'] ?? asset['numero_documento_compra'] ?? asset['numero_documento'] ?? ''));

          if (asset['fechaCompra'] || asset['fecha_compra']) {
            const f = new Date(String(asset['fechaCompra'] ?? asset['fecha_compra']));
            setFechaCompra(f.toISOString().split('T')[0]);
            setFechaCompraUnknown(false);
          } else if (asset['fechaCompraAprox'] || asset['fecha_compra_aprox'] || asset['fechaCompraAproxYear'] || asset['fecha_compra_aprox_year']) {
            const rawAprox = String(asset['fechaCompraAprox'] ?? asset['fecha_compra_aprox'] ?? asset['fechaCompraAproxYear'] ?? asset['fecha_compra_aprox_year'] ?? '');
            if (/^\d{4}$/.test(rawAprox)) {
              setFechaCompraAprox(rawAprox);
            } else {
              const fa = new Date(rawAprox);
              if (!isNaN(fa.getTime())) setFechaCompraAprox(fa.toISOString().split('T')[0]);
            }
            setFechaCompraUnknown(true);
          }

          // Calcular antigüedad inicial al abrir el modal (si el activo ya trae fecha)
          try {
            const rawFecha = asset['fechaCompra'] ?? asset['fecha_compra'] ?? asset['fechaCompraAprox'] ?? asset['fecha_compra_aprox'] ?? asset['fechaCompraAproxYear'] ?? asset['fecha_compra_aprox_year'] ?? '';
            const s = String(rawFecha || '').trim();
            if (!s) {
              Promise.resolve().then(() => setAntiguedadCalculada(''));
            } else {
              const maybeYear = Number(s.slice(0, 4));
              const now = new Date();
              let v = '';
              if (!Number.isNaN(maybeYear) && s.length <= 4) {
                const years = now.getFullYear() - maybeYear;
                v = years > 0 ? `${years} año${years > 1 ? 's' : ''}` : '0 años';
              } else {
                const d = new Date(s);
                if (!isNaN(d.getTime())) {
                  let years = now.getFullYear() - d.getFullYear();
                  let months = now.getMonth() - d.getMonth();
                  if (months < 0) { years -= 1; months += 12; }
                  if (years <= 0 && months <= 0) v = '0 meses';
                  else if (years <= 0) v = `${months} mes${months > 1 ? 'es' : ''}`;
                  else if (months <= 0) v = `${years} año${years > 1 ? 's' : ''}`;
                  else v = `${years} año${years > 1 ? 's' : ''} ${months} mes${months > 1 ? 'es' : ''}`;
                }
              }
              Promise.resolve().then(() => setAntiguedadCalculada(v));
            }
          } catch (err) {
            Promise.resolve().then(() => setAntiguedadCalculada(''));
          }

          setPurchaseDocumentExisting(String(asset['purchaseDocumentUrl'] ?? asset['purchase_document_url'] ?? asset['purchaseDocument'] ?? asset['purchase_document'] ?? ''));
          setPurchaseDocumentDescription(String(asset['purchaseDocumentDescription'] ?? asset['purchase_document_description'] ?? asset['purchase_document_desc'] ?? ''));
          setWarrantyDocumentExisting(String(asset['warrantyDocumentUrl'] ?? asset['warranty_document_url'] ?? asset['warrantyDocument'] ?? asset['warranty_document'] ?? ''));
          setWarrantyDocumentDescription(String(asset['warrantyDocumentDescription'] ?? asset['warranty_document_description'] ?? asset['warranty_document_desc'] ?? ''));

        // Preferir el campo único `garantia` (string) si existe; si no, intentar inferir desde fechas antiguas
        const rawGarantia = String(asset['garantia'] ?? asset['garantiaDuracion'] ?? asset['garantia_duracion'] ?? '');
        if (rawGarantia) {
          setGarantiaDuracion(rawGarantia);
        } else if (asset['garantiaFechaInicio'] || asset['garantia_fecha_inicio'] || asset['fechaFinGarantia'] || asset['fecha_fin_garantia']) {
          try {
            const startRaw = String(asset['garantiaFechaInicio'] ?? asset['garantia_fecha_inicio'] ?? '');
            const endRaw = String(asset['fechaFinGarantia'] ?? asset['fecha_fin_garantia'] ?? '');
            if (startRaw && endRaw) {
              const s = new Date(startRaw);
              const e = new Date(endRaw);
              if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
                const months = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30));
                if (months <= 9) setGarantiaDuracion('6 meses');
                else if (months <= 18) setGarantiaDuracion('1 año');
                else if (months <= 30) setGarantiaDuracion('2 años');
                else setGarantiaDuracion('3 años');
              }
            }
          } catch {
            // ignore
          }
        }

        const condicionValue = String(asset['condicionFisica'] ?? asset['condicion_fisica'] ?? '');
        setCondicionFisica(condicionValue);
      } catch (e) {
        console.error('Error parsing información contable/garantía:', e);
      }
      
      // Cargar usuarios asignados (sistema M:N)
      // Backend devuelve: usuarios_asignados_m2n (nuevo) o usuarios_asignados (legacy)
      const usuariosAsignados = asset['usuarios_asignados_m2n'] ?? asset['usuariosAsignados'] ?? asset['usuarios_asignados'] ?? [];
      if (Array.isArray(usuariosAsignados) && usuariosAsignados.length > 0) {
        const ids = usuariosAsignados.map((u: any) => {
          const extractedId = String(u.usuarioId ?? u.usuario_id ?? u.id ?? '');
          return extractedId;
        }).filter(Boolean);
        setUsuariosAsignadosIds(ids);
      } else {
        const usuarioId = asset['usuarioAsignadoId'] ?? asset['usuario_asignado_id'] ?? '';
        if (usuarioId) {
          setUsuariosAsignadosIds([String(usuarioId)]);
        } else {
          setUsuariosAsignadosIds([]);
        }
      }

      // Cargar campos personalizados desde campos_personalizados_array
      // Backend guarda todo en campos_personalizados_array (estructura flat + arrays)
      const camposRaw = asset['campos_personalizados_array'] ?? asset['camposPersonalizadosArray'] ?? asset['campos_personalizados'] ?? asset['campos_array'];
      
      if (camposRaw) {
        try {
          const campos = typeof camposRaw === 'string' ? JSON.parse(String(camposRaw)) : camposRaw as unknown;
          const mappedFlat: Record<string, string> = {};
          const mappedArr: Record<string, Array<Record<string, string>>> = {};
          const cat = String(asset['categoria'] ?? '');
          const selectedCat = categories.find(c => c.nombre === cat);
          Object.keys(campos || {}).forEach((origKey) => {
            const k = getFieldKey(origKey);
            const value = (campos as Record<string, unknown>)[origKey];
            if (Array.isArray(value)) {
              mappedArr[k] = value as Array<Record<string, string>>;
            } else if (typeof value === 'object' && value !== null) {
              mappedArr[k] = [value as Record<string, string>];
            } else if (typeof value === 'string' || typeof value === 'number') {
              let shouldBeArray = false;
              if (selectedCat && selectedCat.campos) {
                const field = selectedCat.campos.find(f => getFieldKey(f.nombre) === k);
                if (field) {
                  const firstOpt = field.opciones && field.opciones[0];
                  const hasOptionSubcampos = firstOpt && typeof firstOpt !== 'string' && 
                    (field.opciones as FieldOption[]).some(opt => 
                      typeof opt !== 'string' && opt.subcampos && opt.subcampos.length > 0
                    );
                  if (hasOptionSubcampos) {
                    mappedArr[k] = [{ _opcion: String(value) }];
                  } else {
                    mappedFlat[k] = String(value);
                  }
                } else {
                  mappedFlat[k] = String(value);
                }
              } else {
                mappedFlat[k] = String(value);
              }
            }
          });
          setDynamicFields(mappedFlat);
          setDynamicArrayFields(mappedArr);
        } catch (err) {
          console.error('❌ Error parsing campos_personalizados_array:', err);
          setDynamicFields({});
          setDynamicArrayFields({});
        }
      } else {
        setDynamicFields({});
        setDynamicArrayFields({});
      }

      // Cargar campos específicos de categoría
      const cat = String(asset['categoria'] ?? '');
      
      // Laptop
      if (cat === 'Laptop') {
        setLapCpu(String(asset['lapCpu'] ?? ''));
        setLapCpuSerie(String(asset['lapCpuSerie'] ?? ''));
        setLapGpuIntegrada(String(asset['lapGpuIntegrada'] ?? ''));
        setLapGpuDedicada(String(asset['lapGpuDedicada'] ?? ''));
        
        if (asset['lapRams']) {
          try {
            const rams = typeof asset['lapRams'] === 'string' ? JSON.parse(String(asset['lapRams'])) : asset['lapRams'];
            setLapRams(Array.isArray(rams) ? (rams as unknown as RAMEntry[]) : []);
          } catch (e) {
            console.error('Error parsing lapRams:', e);
          }
        }
        
        if (asset['lapStorages']) {
          try {
            const storages = typeof asset['lapStorages'] === 'string' ? JSON.parse(String(asset['lapStorages'])) : asset['lapStorages'];
            setLapStorages(Array.isArray(storages) ? (storages as unknown as StorageEntry[]) : []);
          } catch (e) {
            console.error('Error parsing lapStorages:', e);
          }
        }
      }
      
      // PC
      if (cat === 'PC') {
        setPcCpu(String(asset['pcCpu'] ?? ''));
        setPcCpuGen(String(asset['pcCpuGen'] ?? ''));
        setPcCooler(String(asset['pcCooler'] ?? ''));
        setPcPlacaBase(String(asset['pcPlacaBase'] ?? ''));
        setPcChipset(String(asset['pcChipset'] ?? ''));
        setPcGpuIntegrada(String(asset['pcGpuIntegrada'] ?? ''));
        setPcGpuDedicada(String(asset['pcGpuDedicada'] ?? ''));
        setPcFuente(String(asset['pcFuente'] ?? ''));
        
        if (asset['pcRams']) {
          try {
            const rams = typeof asset['pcRams'] === 'string' ? JSON.parse(String(asset['pcRams'])) : asset['pcRams'];
            setPcRams(Array.isArray(rams) ? (rams as unknown as RAMEntry[]) : []);
          } catch (e) {
            console.error('Error parsing pcRams:', e);
          }
        }
        
        if (asset['pcStorages']) {
          try {
            const storages = typeof asset['pcStorages'] === 'string' ? JSON.parse(String(asset['pcStorages'])) : asset['pcStorages'];
            setPcStorages(Array.isArray(storages) ? (storages as unknown as StorageEntry[]) : []);
          } catch (e) {
            console.error('Error parsing pcStorages:', e);
          }
        }
      }
      
      // Servidor
      if (cat === 'Servidor') {
        setSrvCpuModelo(String(asset['srvCpuModelo'] ?? ''));
        setSrvCpuCantidad(String(asset['srvCpuCantidad'] ?? ''));
        setSrvCpuGen(String(asset['srvCpuGen'] ?? ''));
        setSrvRaidControladora(String(asset['srvRaidControladora'] ?? ''));
        setSrvTipo(String(asset['srvTipo'] ?? ''));
        setSrvSO(String(asset['srvSO'] ?? ''));
        setSrvSOVer(String(asset['srvSOVer'] ?? ''));
        setSrvVirtualizacion(String(asset['srvVirtualizacion'] ?? ''));
        setSrvRoles(String(asset['srvRoles'] ?? ''));
        setSrvBackup(String(asset['srvBackup'] ?? 'No'));
        
        if (asset['srvRams']) {
          try {
            const rams = typeof asset['srvRams'] === 'string' ? JSON.parse(String(asset['srvRams'])) : asset['srvRams'];
            setSrvRams(Array.isArray(rams) ? (rams as unknown as RAMEntry[]) : []);
          } catch (e) {
            console.error('Error parsing srvRams:', e);
          }
        }
        
        if (asset['srvStorages']) {
          try {
            const storages = typeof asset['srvStorages'] === 'string' ? JSON.parse(String(asset['srvStorages'])) : asset['srvStorages'];
            setSrvStorages(Array.isArray(storages) ? (storages as unknown as StorageEntry[]) : []);
          } catch (e) {
            console.error('Error parsing srvStorages:', e);
          }
        }
      }

        // Cargar fotos existentes para preview
        if (asset['fotos']) {
          try {
            const fotosData = typeof asset['fotos'] === 'string' ? JSON.parse(String(asset['fotos'])) : asset['fotos'];
            if (Array.isArray(fotosData)) {
              const fotosNormalizadas = (fotosData as Array<Record<string, unknown>>).map((foto) => {
                const f = foto as Record<string, unknown>;
                let url = String(f['url'] ?? '');
                if (url) {
                  if (String(url).startsWith('http')) {
                    const match = String(url).match(/\/uploads\/(.+)$/);
                    if (match) {
                      const filename = match[1];
                      const decodedFilename = decodeURIComponent(filename);
                      const encodedFilename = encodeURIComponent(decodedFilename);
                      const apiBase = (import.meta.env.VITE_API_URL as string) || '';
                      url = `${apiBase}/uploads/${encodedFilename}`;
                    }
                  } else {
                    const decodedFilename = decodeURIComponent(String(url));
                    const encodedFilename = encodeURIComponent(decodedFilename);
                    const apiBase = (import.meta.env.VITE_API_URL as string) || '';
                    url = `${apiBase}/uploads/${encodedFilename}`;
                  }
                }
                return {
                  url,
                  name: String(f['name'] ?? f['url'] ?? ''),
                  description: String(f['description'] ?? f['descripcion'] ?? ''),
                };
              });
              setFotosExistentes(fotosNormalizadas);
            }
          } catch (err) {
            console.error('Error parsing fotos:', err);
          }
        }

      });
    }
  }, [isOpen, editingAsset, areas]);

  useEffect(() => {
    // cuando cambia el grupo seleccionado, limpiar tipo/fabricante/campos dinámicos
    setCategoria('');
    setDynamicFields({});
    setAssetId('');
    setFabricante('');
  }, [selectedGroupId]);

  useEffect(() => {
    // Cargar marcas cuando se abre el modal para poder filtrar fabricantes por categoría/tipo
    let mounted = true;
    const load = async () => {
      try {
        const list = await getMarcas();
        if (mounted) {
          const normalized = (Array.isArray(list) ? list : []).map((m: any) => ({
            id: String(m.id ?? m._id ?? ''),
            nombre: String(m.nombre ?? m.name ?? ''),
            activo: Boolean(m.activo ?? true),
            categorias: Array.isArray(m.categorias) ? m.categorias.flatMap((c: any) => {
              if (!c && c !== 0) return [];
              if (typeof c === 'object') {
                const out: string[] = [];
                if (c.id !== undefined && c.id !== null) out.push(String(c.id));
                if (c._id !== undefined && c._id !== null) out.push(String(c._id));
                if (c.nombre !== undefined && c.nombre !== null) out.push(String(c.nombre));
                if (c.name !== undefined && c.name !== null) out.push(String(c.name));
                return out.filter(Boolean);
              }
              return [String(c)];
            }) : [],
          } as MarcaItemAPI));
          setMarcasList(normalized);
        }
      } catch (e) {
        if (mounted) setMarcasList([]);
      }
    };
    if (isOpen) load();
    return () => { mounted = false; };
  }, [isOpen]);

  // (Removed unused RAM/Storage helper functions to avoid lint warnings)

  const handleConfirmUpdate = async () => {
    if (!motivo || motivo.trim().length < 10) {
      alert('❌ El motivo debe tener al menos 10 caracteres');
      return;
    }
    setShowMotivoModal(false);
    await procesarActualizacion(motivo.trim());
    setMotivo('');
  };

  const handleCancelUpdate = () => {
    setShowMotivoModal(false);
    setMotivo('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevenir double-submit
    if (isSubmitting) {
      console.warn('⚠️ Ya se está procesando un submit, ignorando...');
      return;
    }

    const targetSedeId = sedeId ?? selectedSedeId;
    if (!empresaId || !targetSedeId) {
      alert('Error: No se puede crear activo sin empresa o sede');
      return;
    }

    // Si está editando, mostrar modal de confirmación con motivo
    if (editingAsset) {
      setShowMotivoModal(true);
      return;
    }

    // Si no está editando, crear normalmente
    await procesarCreacion(empresaId, targetSedeId);
  };

  // Crear activo (procesarCreacion)
  const procesarCreacion = async (empresaId: string, sedeId: string) => {
    setIsSubmitting(true);
    try {
      // Construir datos para creación
      let categoryData: Record<string, unknown> = {};
      if (categoria === "Laptop") {
        categoryData = {
          lapCpu,
          lapCpuSerie,
          lapRams,
          lapStorages,
          lapGpuIntegrada,
          lapGpuDedicada,
        };
      } else if (categoria === "PC") {
        categoryData = {
          pcCpu,
          pcCpuGen,
          pcCooler,
          pcPlacaBase,
          pcChipset,
          pcRams,
          pcStorages,
          pcGpuIntegrada,
          pcGpuDedicada,
          pcFuente,
        };
      } else if (categoria === "Servidor") {
        categoryData = {
          srvCpuModelo,
          srvCpuCantidad,
          srvCpuGen,
          srvRams,
          srvStorages,
          srvRaidControladora,
          srvTipo,
          srvSO,
          srvSOVer,
          srvVirtualizacion,
          srvRoles,
          srvBackup,
        };
      }

      // Reconstruir payloads
      const camposPersonalizados = (() => {
        const payload: Record<string, unknown> = {};
        const selectedCat = categories.find(c => c.nombre === categoria);
        if (selectedCat && selectedCat.campos && selectedCat.campos.length > 0) {
          selectedCat.campos.forEach(f => {
            const firstOpt = f.opciones && f.opciones[0];
            const hasOptionSubcampos = firstOpt && typeof firstOpt !== 'string' &&
              (f.opciones as FieldOption[]).some(opt => typeof opt !== 'string' && opt.subcampos && opt.subcampos.length > 0);
            if (!hasOptionSubcampos && !f.subcampos) {
              const fk = getFieldKey(f.nombre);
              payload[fk] = dynamicFields[fk] ?? "";
            }
          });
        }
        return payload;
      })();

      const camposPersonalizadosArray = (() => {
        const payloadArr: Record<string, unknown> = {};
        const selectedCat = categories.find(c => c.nombre === categoria);
        if (selectedCat && selectedCat.campos && selectedCat.campos.length > 0) {
          selectedCat.campos.forEach(f => {
            const fk = getFieldKey(f.nombre);
            if (f.subcampos && f.subcampos.length > 0) {
              payloadArr[fk] = dynamicArrayFields[fk] || [];
            }
            const firstOpt = f.opciones && f.opciones[0];
            const hasOptionSubcampos = firstOpt && typeof firstOpt !== 'string' &&
              (f.opciones as FieldOption[]).some(opt => typeof opt !== 'string' && opt.subcampos && opt.subcampos.length > 0);
            if (hasOptionSubcampos) {
              payloadArr[fk] = dynamicArrayFields[fk] || [];
            }
          });
        } else {
          Object.keys(dynamicArrayFields).forEach(k => {
            payloadArr[k] = dynamicArrayFields[k];
          });
        }
        return payloadArr;
      })();

      const fotosExistentesPayload = fotosExistentes.map(f => ({ url: f.url, name: f.name, description: f.description }));
      const fotosNuevasPayload = fotos.map(f => ({ name: f.file.name, description: f.description }));
      const fotosFilesPayload = fotos.length > 0 ? fotos : undefined;

      const datosCreacion = {
        categoria,
        fabricante,
        modelo,
        serie,
        assetId,
        area,
        estadoActivo,
        estadoOperativo,
        fechaCompra,
        fechaFinGarantia,
        proveedor,
        tipoDocumentoCompra,
        numeroDocumentoCompra,
        fechaCompraAprox,
        fechaCompraUnknown,
        purchaseDocumentExisting,
        purchaseDocumentFile: purchaseDocumentFile ? purchaseDocumentFile : undefined,
        purchaseDocumentDescription,
        garantia: garantiaDuracion,
        warrantyDocumentExisting,
        warrantyDocumentFile: warrantyDocumentFile ? warrantyDocumentFile : undefined,
        warrantyDocumentDescription,
        condicionFisica,
        antiguedadCalculada,
        ip,
        mac,
        codigoAccesoRemoto: codigoAccesoRemoto || undefined,
        usuariosAsignadosIds: usuariosAsignadosIds.length > 0 ? usuariosAsignadosIds : undefined,
        observaciones,
        ...categoryData,
        camposPersonalizados,
        camposPersonalizadosArray,
        fotosExistentes: fotosExistentesPayload,
        fotosNuevas: fotosNuevasPayload,
        fotosFiles: fotosFilesPayload,
      };

      console.log('🟢 [DEBUG] Payload enviado al backend (CREATE):', datosCreacion);
      const response = await createActivo(empresaId, sedeId, datosCreacion);
      const activoCreado = response?.data || response;
      if (activoCreado.fotos && typeof activoCreado.fotos === 'string') {
        activoCreado.fotos = JSON.parse(activoCreado.fotos);
      }
      onSuccess?.(activoCreado);
      onClose();
    } catch (error) {
      console.error('❌ Error creando activo:', error);
      alert('Error al crear el activo. Revisa la consola para más detalles.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const procesarActualizacion = async (motivo: string) => {
    if (!editingAsset || !empresaId || !sedeId) return;

    const activoId = String((editingAsset as Record<string, unknown>)['id'] ?? (editingAsset as Record<string, unknown>)['_id'] ?? '');

    // Construir datos actuales (categoría específica)
    let categoryData: Record<string, unknown> = {};
    if (categoria === "Laptop") {
      categoryData = {
        lapCpu,
        lapCpuSerie,
        lapRams,
        lapStorages,
        lapGpuIntegrada,
        lapGpuDedicada,
      };
    } else if (categoria === "PC") {
      categoryData = {
        pcCpu,
        pcCpuGen,
        pcCooler,
        pcPlacaBase,
        pcChipset,
        pcRams,
        pcStorages,
        pcGpuIntegrada,
        pcGpuDedicada,
        pcFuente,
      };
    } else if (categoria === "Servidor") {
      categoryData = {
        srvCpuModelo,
        srvCpuCantidad,
        srvCpuGen,
        srvRams,
        srvStorages,
        srvRaidControladora,
        srvTipo,
        srvSO,
        srvSOVer,
        srvVirtualizacion,
        srvRoles,
        srvBackup,
      };
    }

    // Reconstruir payload de campos personalizados (flat)
    const camposPersonalizados = (() => {
      const payload: Record<string, unknown> = {};
      const selectedCat = categories.find(c => c.nombre === categoria);
      if (selectedCat && selectedCat.campos && selectedCat.campos.length > 0) {
        selectedCat.campos.forEach(f => {
          const firstOpt = f.opciones && f.opciones[0];
          const hasOptionSubcampos = firstOpt && typeof firstOpt !== 'string' &&
            (f.opciones as FieldOption[]).some(opt => typeof opt !== 'string' && opt.subcampos && opt.subcampos.length > 0);
          if (!hasOptionSubcampos && !f.subcampos) {
            const fk = getFieldKey(f.nombre);
            (payload as Record<string, unknown>)[fk] = dynamicFields[fk] ?? "";
          }
        });
      }
      return payload;
    })();

    // Reconstruir payload de campos personalizados (arrays / subcampos)
    const camposPersonalizadosArray = (() => {
      const payloadArr: Record<string, unknown> = {};
      const selectedCat = categories.find(c => c.nombre === categoria);
      if (selectedCat && selectedCat.campos && selectedCat.campos.length > 0) {
        selectedCat.campos.forEach(f => {
          const fk = getFieldKey(f.nombre);
          if (f.subcampos && f.subcampos.length > 0) {
            payloadArr[fk] = dynamicArrayFields[fk] || [];
          }
          const firstOpt = f.opciones && f.opciones[0];
          const hasOptionSubcampos = firstOpt && typeof firstOpt !== 'string' &&
            (f.opciones as FieldOption[]).some(opt => typeof opt !== 'string' && opt.subcampos && opt.subcampos.length > 0);
          if (hasOptionSubcampos) {
            payloadArr[fk] = dynamicArrayFields[fk] || [];
          }
        });
      } else {
        Object.keys(dynamicArrayFields).forEach(k => {
          payloadArr[k] = dynamicArrayFields[k];
        });
      }
      return payloadArr;
    })();

    const fotosExistentesPayload = fotosExistentes.map(f => ({ url: f.url, name: f.name, description: f.description }));
    const fotosNuevasPayload = fotos.map(f => ({ name: f.file.name, description: f.description }));
    const fotosFilesPayload = fotos.length > 0 ? fotos : undefined;

    const datosActualizados = {
      categoria,
      fabricante,
      modelo,
      serie,
      assetId,
      area,
      estadoActivo,
      estadoOperativo,
      fechaCompra,
      fechaFinGarantia,
      proveedor,
      tipoDocumentoCompra,
      numeroDocumentoCompra,
      fechaCompraAprox,
      fechaCompraUnknown,
      purchaseDocumentExisting,
      purchaseDocumentFile: purchaseDocumentFile ? purchaseDocumentFile : undefined,
      purchaseDocumentDescription,
      garantia: garantiaDuracion,
      warrantyDocumentExisting,
      warrantyDocumentFile: warrantyDocumentFile ? warrantyDocumentFile : undefined,
      warrantyDocumentDescription,
      condicionFisica,
      antiguedadCalculada,
      ip,
      mac,
      codigoAccesoRemoto: codigoAccesoRemoto || undefined,
      usuariosAsignadosIds: usuariosAsignadosIds.length > 0 ? usuariosAsignadosIds : undefined,
      observaciones,
      ...categoryData,
      camposPersonalizados,
      camposPersonalizadosArray,
      fotosExistentes: fotosExistentesPayload,
      fotosNuevas: fotosNuevasPayload,
      fotosFiles: fotosFilesPayload,
    };

    try {
      // Agregar el motivo al objeto
      const payload = {
        ...datosActualizados,
        motivo: motivo,
      };
      console.log('🟣 [DEBUG] Payload enviado al backend (UPDATE):', payload);
      const response = await updateActivo(empresaId, sedeId, activoId, payload);
      
      const activoActualizado = response?.data || response;
      
      if (activoActualizado.fotos && typeof activoActualizado.fotos === 'string') {
        activoActualizado.fotos = JSON.parse(activoActualizado.fotos);
      }
      
      onSuccess?.(activoActualizado);
      onClose();
    } catch (error) {
      console.error('❌ Error guardando activo:', error);
      alert('Error al guardar el activo. Revisa la consola para más detalles.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ...existing code...

  if (!isOpen) {
    return null;
  }

  const editingAssetId = editingAsset ? String((editingAsset as Record<string, unknown>)['asset_id'] ?? (editingAsset as Record<string, unknown>)['id'] ?? (editingAsset as Record<string, unknown>)['_id'] ?? '') : '';

  const sedeDisplay =
    sedeNombre ??
    (sedes ? sedes.find(s => String(s._id ?? s.id) === String(sedeId))?.nombre : undefined) ??
    sedeId ??
    "";

  // Computar estado de garantía en vivo usando los valores del formulario primero,
  // y caer en los datos del activo editado si no hay valores de formulario.
  const editing = (editingAsset ?? null) as Record<string, unknown> | null;
  const computedWarranty = getWarrantyInfo({
    estado_garantia: editing?.['estado_garantia'] ?? editing?.['estadoGarantia'],
    warranty_expires_at: editing?.['warranty_expires_at'] ?? editing?.['warrantyExpiresAt'],
    fechaFinGarantia: editing?.['fechaFinGarantia'] ?? editing?.['fecha_fin_garantia'],
    garantiaDuracion: garantiaDuracion || (editing?.['garantia'] ?? editing?.['garantiaDuracion']),
    garantia: editing?.['garantia'],
    // usar fechaCompraAprox si el documento es 'Desconocido'
    fechaCompra: tipoDocumentoCompra === 'Desconocido'
      ? (fechaCompraAprox || (editing?.['fechaCompra'] ?? editing?.['fecha_compra']))
      : (fechaCompra || (editing?.['fechaCompra'] ?? editing?.['fecha_compra']))
  });

  // Categoría seleccionada (si existe) — usaremos sus `subcategorias` para popular el select de fabricante
  const selectedCategory = categories.find(c => String(c.nombre) === String(categoria));
  const filteredCategories = categories.filter(c => {
    const gid = String(
      (c as any).grupo_id ??
      (c as any).grupoId ??
      (c as any).groupId ??
      (c as any).grupo ??
      (c as any).group_id ??
      ''
    );
    return !selectedGroupId ? true : gid === selectedGroupId;
  });
  const fabricantesFromMarcas = Array.isArray(marcasList) && selectedCategory ? marcasList.filter(m => {
    const cats = Array.isArray(m.categorias) ? m.categorias.map(String) : [];
    const catId = String((selectedCategory as any).id ?? (selectedCategory as any)._id ?? (selectedCategory as any).codigo ?? '');
    const catName = String(selectedCategory.nombre ?? '');
    const catNameLower = catName.toLowerCase();
    return cats.some(c => {
      const cStr = String(c);
      if (!cStr) return false;
      if (cStr === catId) return true;
      if (cStr.toLowerCase() === catNameLower) return true;
      // sometimes backend stores numeric ids as numbers in string form
      if (Number(cStr) && String(Number(cStr)) === String(Number(catId))) return true;
      return false;
    });
  }) : [];


  return (
    <div className="fixed inset-0 flex items-start justify-center pt-20 bg-black/40" style={{ zIndex: 99999 }} role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg w-full max-w-4xl p-6 max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            {editingAsset ? '✏️ Editar Activo' : '➕ Registrar Activo'}
          </h3>
          <button onClick={onClose} className="text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header row: Empresa / Sede / Área / Categoría */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b">
            <div>
              <label className="block text-xs font-semibold text-gray-600">Empresa</label>
              <input value={empresaNombre ?? empresa?.nombre ?? empresaId ?? ""} readOnly className="w-full mt-1 p-2 border rounded bg-gray-50 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600">Sede</label>
              {sedeId ? (
                <input value={sedeDisplay} readOnly className="w-full mt-1 p-2 border rounded bg-gray-50 text-sm" />
              ) : (
                <select value={selectedSedeId ?? ''} onChange={e => setSelectedSedeId(e.target.value || undefined)} className="w-full mt-1 p-2 border rounded text-sm">
                  <option value="">-- Seleccionar sede --</option>
                  {sedes && sedes.length > 0 ? sedes.map((s, idx) => (
                    <option key={s._id ?? s.id ?? idx} value={String(s._id ?? s.id)}>{String(s.nombre ?? s.nombre ?? s.id ?? '')}</option>
                  )) : <option disabled>No hay sedes disponibles</option>}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600">Área</label>
              <select value={area} onChange={e => { const val = e.target.value; setArea(val); const found = areas ? areas.find(a => String(a.name ?? a.nombre ?? '') === String(val)) : undefined; setResponsable(found ? String(found.responsable ?? '') : ''); }} className="w-full mt-1 p-2 border rounded text-sm">
                <option value="">-- Seleccionar área --</option>
                {areas && areas.length > 0 ? (
                  areas.map((a, idx) => (
                    <option key={a._id ?? a.id ?? idx} value={String(a.name ?? a.nombre ?? '')}>{String(a.name ?? a.nombre ?? '')}</option>
                  ))
                ) : (
                  <option disabled>No hay áreas registradas</option>
                )}
              </select>
              <label className="block text-xs font-semibold text-gray-600 mt-2">Responsable</label>
              <input value={responsable} readOnly className="w-full mt-1 p-2 border rounded bg-gray-50 text-sm" />
            </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600">Grupo de Activo</label>
              <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm">
                <option value="">-- Seleccionar grupo --</option>
                {Array.isArray(groups) && groups.length > 0 ? (
                  groups.map((g, idx) => (
                    <option key={String((g as any).id ?? (g as any)._id ?? idx)} value={String((g as any).id ?? (g as any)._id ?? '')}>{String((g as any).nombre ?? (g as any).codigo ?? (g as any).id ?? '')}</option>
                  ) )
                ) : (
                  <option disabled>No hay grupos registrados</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600">Tipo de Activo *</label>
              <select
                value={categoria}
                onChange={e => { const newCategory = e.target.value; setCategoria(newCategory); setDynamicFields({}); setAssetId(''); setFabricante(''); }}
                className="w-full mt-1 p-2 border rounded text-sm"
                required
                disabled={!!editingAsset || categories.length === 0 || !selectedGroupId}
                style={!!editingAsset || categories.length === 0 || !selectedGroupId ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
              >
                <option value="">-- Seleccionar --</option>
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((cat, idx) => (<option key={cat.nombre ?? idx} value={cat.nombre}>{cat.nombre}</option>))
                ) : (
                  <option disabled>No hay tipos registrados</option>
                )}
              </select>
              {categories.length === 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  No hay categorías. {empresaId ? (
                    <button type="button" onClick={() => { onClose(); navigate(`/admin/empresas/${empresaId}/inventario?view=categories`); }} className="text-indigo-600 font-semibold underline">Crear categoría</button>
                  ) : (
                    <button type="button" onClick={() => { onClose(); navigate('/admin/empresas'); }} className="text-indigo-600 font-semibold underline">Crear categoría</button>
                  )}
                </div>
              )}
              {!selectedGroupId && !editingAsset && (
                <div className="mt-2 text-xs text-yellow-600">Seleccione primero un Grupo de Activo para ver los Tipos disponibles.</div>
              )}
              {editingAsset && <p className="text-xs text-gray-500 mt-1">La categoría no puede modificarse</p>}
            </div>

          {/* Identification: Marcas / Modelo / Serie / Código */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b">
            <div>
              <label className="block text-xs font-semibold text-gray-600">Marcas</label>
              <div className="text-xs text-gray-500 mb-1">Marcas cargadas: {marcasList.length} — relacionadas: {fabricantesFromMarcas.length}</div>
              {fabricantesFromMarcas && fabricantesFromMarcas.length > 0 ? (
                <select value={fabricante} onChange={e => setFabricante(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm">
                  <option value="">-- Seleccionar marca --</option>
                  {fabricantesFromMarcas.map((m) => (
                    <option key={m.id} value={m.nombre ?? m.id}>{m.nombre ?? m.id}</option>
                  ))}
                </select>
              ) : (
                <select className="w-full mt-1 p-2 border rounded text-sm" disabled>
                  <option value="">No hay marcas relacionadas</option>
                </select>
              )}
              {!categoria && !editingAsset && (
                <div className="mt-2 text-xs text-yellow-600">Seleccione primero un Tipo de Activo para habilitar Marcas.</div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600">Modelo</label>
              <input value={modelo} onChange={e => setModelo(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600">Número de serie</label>
              <input value={serie} onChange={e => setSerie(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600">Código</label>
              <input
                value={categoria ? `${getCompanyPrefix(empresaNombre ?? empresa?.nombre ?? String(empresaId ?? ''))}-${getCategoryPrefix(categoria)}XXXX` : ''}
                readOnly
                className="w-full mt-1 p-2 border rounded bg-gray-50 text-sm italic text-gray-500"
                placeholder="Se asignará automáticamente"
              />
            </div>
          </section>

          {/* Purchase / Accounting (ordenado, estilo similar a Asignaciones y Multimedia) */}
          <section className="space-y-4 py-4 border-b">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg">Información de Compra</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600">Tipo de documento</label>
                  <select value={tipoDocumentoCompra} onChange={e => {
                    const val = e.target.value;
                    setTipoDocumentoCompra(val);
                    if (val === 'Desconocido') {
                      setFechaCompraUnknown(true);
                      setFechaCompra('');
                      setFechaCompraAprox('');
                      setNumeroDocumentoCompra('');
                      setPurchaseDocumentFile(null);
                    } else {
                      setFechaCompraUnknown(false);
                      setFechaCompraAprox('');
                    }
                  }} className="w-full mt-1 p-2 border rounded text-sm">
                    <option value="Factura">Factura</option>
                    <option value="Boleta">Boleta</option>
                    <option value="Guía">Guía</option>
                    <option value="Desconocido">Desconocido</option>
                  </select>
                </div>

                {tipoDocumentoCompra !== 'Desconocido' && (
                  <div>
                    <label className="block text-xs text-gray-600">Número de documento</label>
                    <input type="text" value={numeroDocumentoCompra} onChange={e => setNumeroDocumentoCompra(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm" placeholder="Ej: F001-12345" />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-600">Proveedor</label>
                  <input value={proveedor} onChange={e => setProveedor(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm" />
                </div>

                <div>
                  <label className="block text-xs text-gray-600">Fecha de compra</label>
                  {tipoDocumentoCompra !== 'Desconocido' ? (
                    <input type="date" value={fechaCompra} onChange={e => setFechaCompra(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm" />
                  ) : (
                    <input type="number" min={1900} max={new Date().getFullYear()} value={fechaCompraAprox} onChange={e => setFechaCompraAprox(e.target.value)} placeholder="Año aproximado (Ej: 2022)" className="w-full mt-1 p-2 border rounded text-sm" />
                  )}
                </div>

                {/* Purchase document box */}
                <div className="border border-dashed rounded p-3 bg-gray-50">
                  <label className="block text-xs text-gray-600 font-medium">Documento de compra</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input type="file" accept="application/pdf,image/png,image/jpeg" onChange={e => { const f = e.target.files ? e.target.files[0] : null; setPurchaseDocumentFile(f); if (!f) setPurchaseDocumentDescription(''); }} className="text-sm" />
                    {purchaseDocumentExisting && <a className="text-xs text-blue-600 underline" href={purchaseDocumentExisting} target="_blank" rel="noreferrer">Ver existente</a>}
                  </div>
                  {(purchaseDocumentFile || purchaseDocumentExisting) && (
                    <div className="mt-3">
                      <label className="block text-xs text-gray-600">Descripción</label>
                      <input type="text" value={purchaseDocumentDescription} onChange={e => setPurchaseDocumentDescription(e.target.value)} placeholder="Ej: Factura proveedor X" className="w-full mt-1 p-2 border rounded text-sm" />
                      <div className="text-xs text-gray-500 mt-1">Describe brevemente qué contiene este documento.</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600">Garantía</label>
                  <select value={garantiaDuracion} onChange={e => setGarantiaDuracion(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm">
                    <option value="">-- Seleccionar duración --</option>
                    <option value="6 meses">6 meses</option>
                    <option value="1 año">1 año</option>
                    <option value="2 años">2 años</option>
                    <option value="3 años">3 años</option>
                  </select>

                  {/* Warranty status badge + expiry (se actualiza en vivo según el formulario) */}
                  {computedWarranty && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${computedWarranty.estado === 'Vigente' ? 'bg-green-100 text-green-800' : computedWarranty.estado === 'No vigente' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>{computedWarranty.estado}</span>
                      {computedWarranty.expiresAt && (
                        <span className="text-xs text-gray-500">{computedWarranty.estado === 'No vigente' ? 'Venció:' : 'Vence:'} {new Date(computedWarranty.expiresAt).toLocaleDateString('es-ES')}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="border border-dashed rounded p-3 bg-gray-50">
                  <label className="block text-xs text-gray-600 font-medium">Documento de garantía</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input type="file" accept="application/pdf,image/png,image/jpeg" onChange={e => { const f = e.target.files ? e.target.files[0] : null; setWarrantyDocumentFile(f); if (!f) setWarrantyDocumentDescription(''); }} className="text-sm" />
                    {warrantyDocumentExisting && <a className="text-xs text-blue-600 underline" href={warrantyDocumentExisting} target="_blank" rel="noreferrer">Ver existente</a>}
                  </div>
                  {(warrantyDocumentFile || warrantyDocumentExisting) && (
                    <div className="mt-3">
                      <label className="block text-xs text-gray-600">Descripción</label>
                      <input type="text" value={warrantyDocumentDescription} onChange={e => setWarrantyDocumentDescription(e.target.value)} placeholder="Ej: Certificado de garantía - 2 años" className="w-full mt-1 p-2 border rounded text-sm" />
                      <div className="text-xs text-gray-500 mt-1">Describe brevemente qué contiene este documento.</div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mt-3">Condición física</label>
                  <select value={condicionFisica} onChange={e => setCondicionFisica(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm">
                    <option value="">-- Seleccionar --</option>
                    <option value="Excelente">Excelente</option>
                    <option value="Bueno">Bueno</option>
                    <option value="Regular">Regular</option>
                    <option value="Malo">Malo</option>
                    <option value="EXCELENTE">EXCELENTE</option>
                    <option value="BUENO">BUENO</option>
                    <option value="REGULAR">REGULAR</option>
                    <option value="MALO">MALO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mt-3">Antigüedad (años)</label>
                  <input type="text" value={antiguedadCalculada} readOnly className="w-full mt-1 p-2 border rounded bg-gray-50 text-sm text-slate-900" placeholder="-" />
                </div>
              </div>
            </div>
          </section>

          {/* Assignment / Network */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b">
            <div>
              <label className="block text-xs font-semibold text-gray-600">Dirección IP</label>
              <input value={ip} onChange={e => setIp(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600">MAC Address</label>
              <input value={mac} onChange={e => setMac(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600">Código Acceso Remoto</label>
              <input 
                value={codigoAccesoRemoto} 
                onChange={e => setCodigoAccesoRemoto(e.target.value)} 
                className="w-full mt-1 p-2 border rounded text-sm" 
                placeholder="Ej: AnyDesk, TeamViewer, etc."
              />
            </div>
          </section>

          {/* Estado */}
          <section className="grid grid-cols-1 gap-4 py-4 border-b">
            <div>
              <label className="block text-xs font-semibold text-gray-600">Estado</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <select value={estadoActivo} onChange={e => setEstadoActivo(e.target.value)} className="p-2 border rounded text-sm">
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="dado_de_baja">Dado de baja</option>
                </select>
                <select value={estadoOperativo} onChange={e => setEstadoOperativo(e.target.value)} className="p-2 border rounded text-sm">
                  <option value="operativo">Operativo</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="fuera_servicio">Fuera de servicio</option>
                </select>
              </div>
            </div>
          </section>

          {/* Dynamic Category Fields (keep existing logic) */}
          {selectedCategory && selectedCategory.campos && selectedCategory.campos.length > 0 && (
            <div className="space-y-4 pb-4 border-b bg-yellow-50 p-4 rounded">
              <h4 className="font-semibold text-lg">Campos personalizados - {selectedCategory.nombre}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedCategory.campos.map((field, idx) => (
                  <div key={idx} className={field.subcampos && field.subcampos.length > 0 ? "col-span-full" : ""}>
                    <label className="block text-sm text-gray-700 font-medium mb-1">{field.nombre}{field.requerido && <span className="text-red-500 ml-1">*</span>}</label>
                    {field.subcampos && field.subcampos.length > 0 ? (
                      <div className="border-l-4 border-blue-400 pl-4 bg-blue-50 p-3 rounded">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">Entradas</span>
                          <button type="button" onClick={() => {
                            const fieldKey = getFieldKey(field.nombre);
                            setDynamicArrayFields(prev => {
                              const current = prev[fieldKey] || [];
                              const newEntry: Record<string, string> = {};
                              field.subcampos?.forEach(sf => { newEntry[sf.nombre] = ''; });
                              return { ...prev, [fieldKey]: [...current, newEntry] };
                            });
                          }} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">+ Añadir {field.nombre}</button>
                        </div>

                        <div className="space-y-3">
                          {(dynamicArrayFields[getFieldKey(field.nombre)] || []).map((entry, entryIdx) => (
                            <div key={entryIdx} className="bg-white border border-gray-200 p-3 rounded">
                              <div className="flex items-start gap-2">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {field.subcampos!.map((subfield, subIdx) => (
                                    <div key={subIdx}>
                                      <label className="block text-xs text-gray-600 font-medium mb-1">{subfield.nombre}</label>
                                      {subfield.tipo === 'select' && subfield.opciones ? (
                                        <select value={entry[subfield.nombre] || ''} onChange={e => { setDynamicArrayFields(prev => { const key = getFieldKey(field.nombre); const updated = [...(prev[key] || [])]; updated[entryIdx] = { ...updated[entryIdx], [subfield.nombre]: e.target.value }; return { ...prev, [key]: updated }; }); }} className="w-full p-2 border rounded text-sm">
                                          <option value="">-- Seleccionar --</option>
                                          {subfield.opciones.map((opt, optIdx) => (<option key={optIdx} value={opt}>{opt}</option>))}
                                        </select>
                                      ) : subfield.tipo === 'number' ? (
                                        <input type="number" value={entry[subfield.nombre] || ''} onChange={e => { setDynamicArrayFields(prev => { const key = getFieldKey(field.nombre); const updated = [...(prev[key] || [])]; updated[entryIdx] = { ...updated[entryIdx], [subfield.nombre]: e.target.value }; return { ...prev, [key]: updated }; }); }} className="w-full p-2 border rounded text-sm" />
                                      ) : (
                                        <input type="text" value={entry[subfield.nombre] || ''} onChange={e => { setDynamicArrayFields(prev => { const key = getFieldKey(field.nombre); const updated = [...(prev[key] || [])]; updated[entryIdx] = { ...updated[entryIdx], [subfield.nombre]: e.target.value }; return { ...prev, [key]: updated }; }); }} className="w-full p-2 border rounded text-sm" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <button type="button" onClick={() => { setDynamicArrayFields(prev => { const key = getFieldKey(field.nombre); const updated = (prev[key] || []).filter((_, i) => i !== entryIdx); return { ...prev, [key]: updated }; }); }} className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 text-xs">X</button>
                              </div>
                            </div>
                          ))}

                          {(!dynamicArrayFields[getFieldKey(field.nombre)] || dynamicArrayFields[getFieldKey(field.nombre)].length === 0) && (
                            <div className="text-center text-gray-500 text-sm py-2">No hay entradas. Haz clic en "+ Añadir {field.nombre}" para agregar.</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      // normal field
                      <>
                        {field.tipo === 'select' && field.opciones ? (
                          (() => {
                            const firstOpt = field.opciones[0];
                            const hasOptionSubcampos = firstOpt && typeof firstOpt !== 'string' && (field.opciones as FieldOption[]).some(opt => typeof opt !== 'string' && opt.subcampos && opt.subcampos.length > 0);
                            if (hasOptionSubcampos) {
                              const fieldKey = getFieldKey(field.nombre);
                              const instances = dynamicArrayFields[fieldKey] || [];
                              return (
                                <div className="border-l-4 border-purple-400 pl-4 bg-purple-50 p-3 rounded">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-gray-700">Instancias</span>
                                    <button type="button" onClick={() => { setDynamicArrayFields(prev => { const current = prev[fieldKey] || []; const newEntry: Record<string, string> = { _opcion: '' }; return { ...prev, [fieldKey]: [...current, newEntry] }; }); }} className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">+ Añadir {field.nombre}</button>
                                  </div>

                                  <div className="space-y-3">
                                    {instances.map((entry, entryIdx) => {
                                      const selectedValue = entry._opcion || '';
                                      const selectedOption = selectedValue ? (field.opciones as FieldOption[]).find(opt => typeof opt !== 'string' && opt.value === selectedValue) : null;
                                      return (
                                        <div key={entryIdx} className="bg-white border border-gray-200 p-3 rounded">
                                          <div className="flex items-start gap-2">
                                            <div className="flex-1 space-y-3">
                                              <div>
                                                <label className="block text-xs text-gray-600 font-medium mb-1">Opción</label>
                                                <select value={selectedValue} onChange={e => { const newOpcion = e.target.value; setDynamicArrayFields(prev => { const updated = [...(prev[fieldKey] || [])]; updated[entryIdx] = { _opcion: newOpcion }; return { ...prev, [fieldKey]: updated }; }); }} className="w-full p-2 border rounded text-sm">
                                                  <option value="">-- Seleccionar --</option>
                                                  {field.opciones.map((opt, optIdx) => { const optValue = typeof opt === 'string' ? opt : opt.value; return <option key={optIdx} value={optValue}>{optValue}</option>; })}
                                                </select>
                                              </div>

                                              {selectedOption && typeof selectedOption !== 'string' && selectedOption.subcampos && selectedOption.subcampos.length > 0 && (
                                                <div className="ml-2 pl-3 border-l-2 border-purple-300 space-y-2">
                                                  <p className="text-xs font-semibold text-purple-700">Campos para "{selectedValue}"</p>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {selectedOption.subcampos.map((subfield, subIdx) => (
                                                      <div key={subIdx}>
                                                        <label className="block text-xs text-gray-600 font-medium mb-1">{subfield.nombre}</label>
                                                        {subfield.tipo === 'select' && subfield.opciones ? (
                                                          <select value={entry[subfield.nombre] || ''} onChange={e => { setDynamicArrayFields(prev => { const updated = [...(prev[fieldKey] || [])]; updated[entryIdx] = { ...updated[entryIdx], [subfield.nombre]: e.target.value }; return { ...prev, [fieldKey]: updated }; }); }} className="w-full p-2 border rounded text-sm">
                                                            <option value="">-- Seleccionar --</option>
                                                            {subfield.opciones.map((sopt, soptIdx) => (<option key={soptIdx} value={sopt}>{sopt}</option>))}
                                                          </select>
                                                        ) : subfield.tipo === 'number' ? (
                                                          <input type="number" value={entry[subfield.nombre] || ''} onChange={e => { setDynamicArrayFields(prev => { const updated = [...(prev[fieldKey] || [])]; updated[entryIdx] = { ...updated[entryIdx], [subfield.nombre]: e.target.value }; return { ...prev, [fieldKey]: updated }; }); }} className="w-full p-2 border rounded text-sm" />
                                                        ) : (
                                                          <input type="text" value={entry[subfield.nombre] || ''} onChange={e => { setDynamicArrayFields(prev => { const updated = [...(prev[fieldKey] || [])]; updated[entryIdx] = { ...updated[entryIdx], [subfield.nombre]: e.target.value }; return { ...prev, [fieldKey]: updated }; }); }} className="w-full p-2 border rounded text-sm" />
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>

                                            <button type="button" onClick={() => { setDynamicArrayFields(prev => { const updated = (prev[fieldKey] || []).filter((_, i) => i !== entryIdx); return { ...prev, [fieldKey]: updated }; }); }} className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 text-xs">X</button>
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {instances.length === 0 && (
                                      <div className="text-center text-gray-500 text-sm py-2">No hay entradas. Haz clic en "+ Añadir {field.nombre}" para agregar.</div>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <select value={dynamicFields[getFieldKey(field.nombre)] || ''} onChange={e => setDynamicFields(prev => ({ ...prev, [getFieldKey(field.nombre)]: e.target.value }))} className="w-full p-2 border rounded" required={field.requerido}>
                                <option value="">-- Seleccionar --</option>
                                {field.opciones.map((opt, optIdx) => { const optValue = typeof opt === 'string' ? opt : opt.value; return <option key={optIdx} value={optValue}>{optValue}</option>; })}
                              </select>
                            );
                          })()
                        ) : field.tipo === 'textarea' ? (
                          <textarea value={dynamicFields[getFieldKey(field.nombre)] || ''} onChange={e => setDynamicFields(prev => ({ ...prev, [getFieldKey(field.nombre)]: e.target.value }))} className="w-full p-2 border rounded" rows={3} required={field.requerido} />
                        ) : field.tipo === 'number' ? (
                          <input type="number" value={dynamicFields[getFieldKey(field.nombre)] || ''} onChange={e => setDynamicFields(prev => ({ ...prev, [getFieldKey(field.nombre)]: e.target.value }))} className="w-full p-2 border rounded" required={field.requerido} />
                        ) : (
                          <input type="text" value={dynamicFields[getFieldKey(field.nombre)] || ''} onChange={e => setDynamicFields(prev => ({ ...prev, [getFieldKey(field.nombre)]: e.target.value }))} className="w-full p-2 border rounded" required={field.requerido} />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users, Photos, Observations */}
          <section className="space-y-4 py-4">
            <h4 className="font-semibold text-lg">Asignaciones y Multimedia</h4>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                👥 Usuarios Asignados ({usuariosAsignadosIds.length})
              </label>
              
              {loadingUsuarios ? (
                <div className="bg-gray-50 p-3 rounded border text-sm text-gray-500">
                  Cargando usuarios...
                </div>
              ) : !empresaId ? (
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm text-yellow-700">
                  No se pudo cargar la empresa
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Usuarios ya asignados */}
                  {usuariosAsignadosIds.length > 0 && (
                    <div 
                      className="bg-linear-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4"
                      style={{ border: '3px solid red' }} // DEBUG: Borde rojo visible
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-semibold text-purple-800">
                          ✅ Asignados ({usuariosAsignadosIds.length})
                        </h5>
                        {usuariosAsignadosIds.length > 1 && (
                          <span className="text-xs bg-linear-to-r from-purple-500 to-pink-600 text-white px-3 py-1 rounded-full font-semibold">
                            Compartido
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                        {usuariosAsignadosIds.map((userId) => {
                          // Buscar usuario con comparación flexible (string vs number)
                          const usuario = usuariosDisponibles.find(u => 
                            String(u.id || u._id || '') === String(userId)
                          );
                          
                          // Debug: mostrar si no se encuentra el usuario
                          if (!usuario) {
                            return (
                              <div key={userId} className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-xs text-yellow-700">
                                Usuario ID {userId} no encontrado en la lista
                              </div>
                            );
                          }
                          
                          return (
                            <div
                              key={userId}
                              className="flex items-center justify-between bg-white border border-purple-300 rounded-lg p-3 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center gap-3">
                                {/* Avatar con inicial */}
                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold shadow-md">
                                  {usuario.nombreCompleto?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">
                                    {usuario.nombreCompleto || 'Sin nombre'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {usuario.correo || usuario.email || '—'}
                                  </p>
                                  <p className="text-xs text-purple-600 font-medium">
                                    {usuario.cargo || 'Sin cargo'}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setUsuariosAsignadosIds(prev => prev.filter(id => id !== userId));
                                }}
                                className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Quitar usuario"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Selector para agregar más usuarios */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-blue-800 mb-2">
                      ➕ Agregar Usuario
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        const userId = e.target.value;
                        if (userId && !usuariosAsignadosIds.includes(userId)) {
                          console.log('✅ Agregando usuario:', userId);
                          console.log('Usuarios disponibles:', usuariosDisponibles.length);
                          const usuarioSeleccionado = usuariosDisponibles.find(u => 
                            String(u.id || u._id) === String(userId)
                          );
                          console.log('Usuario encontrado:', usuarioSeleccionado);
                          setUsuariosAsignadosIds(prev => [...prev, userId]);
                        }
                        e.target.value = '';
                      }}
                      className="w-full p-2.5 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      disabled={!empresaId || (!selectedSedeId && !sedeId)}
                    >
                      <option value="">Seleccionar usuario...</option>
                      {usuariosDisponibles
                        .filter(u => !usuariosAsignadosIds.includes(String(u.id || u._id || '')))
                        .map(u => (
                          <option key={u.id || u._id} value={u.id || u._id}>
                            {u.nombreCompleto} - {u.cargo || 'Sin cargo'}
                          </option>
                        ))
                      }
                    </select>
                    {usuariosDisponibles.filter(u => !usuariosAsignadosIds.includes(u.id || u._id || '')).length === 0 && (
                      <p className="text-xs text-blue-600 mt-2">
                        ✓ Todos los usuarios disponibles ya están asignados
                      </p>
                    )}
                  </div>

                  {usuariosDisponibles.length === 0 && (
                    <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded border">
                      ⚠️ No hay usuarios registrados en esta sede
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600">Fotos del activo</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 mt-2 bg-gray-50 text-center">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const files = e.target.files; if (!files) return; const arr = Array.from(files).map(f => ({ file: f, description: "" })); setFotos(prev => [...prev, ...arr]); e.currentTarget.value = ""; }} />
                    <div className="text-blue-600 font-medium">📷 Agregar fotos</div>
                    <div className="text-xs text-gray-500 mt-1">Puedes seleccionar varias imágenes</div>
                  </label>
                </div>
                {fotosExistentes.length > 0 && (<div className="mt-2 text-xs text-gray-600">Fotos guardadas: {fotosExistentes.length}</div>)}

                {/* Mostrar previsualización y campo de descripción para fotos nuevas */}
                {fotos.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {fotos.map((f, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-white border border-gray-200 p-3 rounded">
                        <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                          <img src={URL.createObjectURL(f.file)} alt={f.file.name} className="object-cover w-full h-full" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">{f.file.name}</div>
                            <button type="button" onClick={() => { setFotos(prev => prev.filter((_, i) => i !== idx)); }} className="text-xs text-red-600">Eliminar</button>
                          </div>
                          <input type="text" value={f.description} onChange={e => { const val = e.target.value; setFotos(prev => { const copy = [...prev]; copy[idx] = { ...copy[idx], description: val }; return copy; }); }} placeholder="Descripción de la foto" className="mt-2 w-full p-2 border rounded text-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600">Observaciones</label>
                <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm" rows={5} />
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-sm" disabled={isSubmitting}>Cancelar</button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </>
              ) : (
                editingAsset ? '✅ Actualizar Activo' : '➕ Registrar Activo'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Confirmación para Actualización */}
      {showMotivoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60" style={{ backdropFilter: 'blur(2px)' }}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4 animate-fadeIn">
            {/* Header */}
            <div className="bg-linear-to-r from-blue-500 to-cyan-500 text-white px-6 py-4 rounded-t-lg">
              <div className="flex items-center gap-3">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <h3 className="text-xl font-bold">Confirmar Actualización de Activo</h3>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {/* Alert Info */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-5 rounded">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Estás a punto de modificar el activo <span className="font-bold">{editingAssetId}</span>
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Esta acción quedará registrada en el historial de cambios del sistema.
                    </p>
                  </div>
                </div>
              </div>

              {/* Motivo Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Motivo del Cambio <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Describe el motivo de esta actualización (mínimo 10 caracteres)..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                  rows={4}
                  autoFocus
                />
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs font-medium ${motivo.trim().length < 10 ? 'text-red-500' : 'text-green-600'}`}>
                    {motivo.trim().length < 10 
                      ? `Faltan ${10 - motivo.trim().length} caracteres` 
                      : '✓ Motivo válido'
                    }
                  </span>
                  <span className="text-xs text-gray-500">
                    {motivo.trim().length} / 500
                  </span>
                </div>
              </div>

              {/* Warning */}
              {motivo.trim().length > 0 && motivo.trim().length < 10 && (
                <div className="mt-3 text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>El motivo debe ser descriptivo y tener al menos 10 caracteres</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelUpdate}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmUpdate}
                disabled={motivo.trim().length < 10}
                className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  motivo.trim().length < 10
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirmar Actualización
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterAssetModal;

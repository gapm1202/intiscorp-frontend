import { useState, useEffect } from "react";
import { formatAssetCode } from "@/utils/helpers";

interface Sede {
  id?: number;
  _id?: string;
  nombre?: string;
}

interface Area {
  id?: number;
  _id?: string;
  nombre?: string;
  sede_id?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  asset: Record<string, unknown> | null;
  empresaId?: string;
  empresaNombre?: string;
  sedeOrigenId?: string;
  sedeOrigenNombre?: string;
  sedes?: Sede[];
  onSuccess?: () => void;
}

const TrasladarAssetModal = ({
  isOpen,
  onClose,
  asset,
  empresaId,
  empresaNombre,
  sedeOrigenId,
  sedeOrigenNombre,
  sedes = [],
  onSuccess,
}: Props) => {
  const [sedeDestino, setSedeDestino] = useState<string>("");
  const [areaDestino, setAreaDestino] = useState<string>("");
  const [areasDestino, setAreasDestino] = useState<Area[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [motivo, setMotivo] = useState<string>("");
  const [responsableEnvia, setResponsableEnvia] = useState<string>("");
  const [responsableRecibe, setResponsableRecibe] = useState<string>("");
  const [fechaTraslado, setFechaTraslado] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [estadoEquipo, setEstadoEquipo] = useState<string>("bueno");
  const [especificarFalla, setEspecificarFalla] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");
  const [fotos, setFotos] = useState<Array<{ file: File; description: string }>>([]);
  const [confirmar, setConfirmar] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [codigoConflicto, setCodigoConflicto] = useState<{existe: boolean; sugerencia: string} | null>(null);
  const [nuevoCodigoAsignado, setNuevoCodigoAsignado] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setSedeDestino("");
      setAreaDestino("");
      setAreasDestino([]);
      setMotivo("");
      setResponsableEnvia("");
      setResponsableRecibe("");
      setFechaTraslado(new Date().toISOString().split("T")[0]);
      setEstadoEquipo("bueno");
      setEspecificarFalla("");
      setObservaciones("");
      setFotos([]);
      setConfirmar(false);
      setSubmitting(false);
      setCodigoConflicto(null);
      setNuevoCodigoAsignado("");
    }
  }, [isOpen]);

  // Verificar si el código ya existe en la sede destino
  useEffect(() => {
    const verificarCodigo = async () => {
      if (!sedeDestino || !asset || !empresaId) {
        setCodigoConflicto(null);
        return;
      }

      const codigoActual = formatAssetCode(String(asset.assetId || asset.codigo || ""));

      try {
        const token = localStorage.getItem("token");
        const apiBase = (import.meta.env.VITE_API_URL as string) || '';
        const response = await fetch(
          `${apiBase}/api/empresas/${empresaId}/sedes/${sedeDestino}/inventario?soloSedeActual=true`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const inventario = Array.isArray(data) ? data : data?.data ?? [];
          
          // Buscar si ya existe un activo con el mismo código
          const existe = inventario.some((item: unknown) => {
            const it = item as Record<string, unknown>;
            const code = String(it['assetId'] ?? it['codigo'] ?? "");
            return formatAssetCode(code) === codigoActual;
          });

          if (existe) {
            // Extraer prefijo y número del código actual (ej: LPT-001 -> prefijo: LPT, numero: 001)
            const match = codigoActual.match(/^([A-Z]+)-(\d+)$/);
            if (match) {
              const prefijo = match[1];
              const numeroActual = parseInt(match[2], 10);
              
              // Buscar el número más alto con el mismo prefijo en la sede destino
              let numeroMaximo = numeroActual;
              inventario.forEach((item: unknown) => {
                const it = item as Record<string, unknown>;
                const codigo = formatAssetCode(String(it['assetId'] ?? it['codigo'] ?? ""));
                const itemMatch = codigo.match(/^([A-Z]+)-(\d+)$/);
                if (itemMatch && itemMatch[1] === prefijo) {
                  const itemNumero = parseInt(itemMatch[2], 10);
                  if (itemNumero > numeroMaximo) {
                    numeroMaximo = itemNumero;
                  }
                }
              });
              
              // Sugerir el siguiente número disponible
              const numeroSugerido = numeroMaximo + 1;
              const codigoSugerido = `${prefijo}-${String(numeroSugerido).padStart(4, "0")}`;
              setCodigoConflicto({ existe: true, sugerencia: codigoSugerido });
            } else {
              // Si el código no tiene formato estándar, solo notificar conflicto
              setCodigoConflicto({ existe: true, sugerencia: codigoActual + "-NEW" });
            }
          } else {
            setCodigoConflicto(null);
          }
        }
      } catch (error: unknown) {
        console.error("❌ Error verificando código:", error);
        setCodigoConflicto(null);
      }
    };

    verificarCodigo();
  }, [sedeDestino, asset, empresaId]);

  // Cargar todas las áreas de la empresa (disponibles para cualquier sede)
  useEffect(() => {
    const fetchAreas = async () => {
      if (!empresaId || !isOpen) {
        setAreasDestino([]);
        return;
      }
      setLoadingAreas(true);
      try {
        const token = localStorage.getItem("token");
        const apiBase = (import.meta.env.VITE_API_URL as string) || '';
        const url = `${apiBase}/api/empresas/${empresaId}/areas`;
        
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          const areas = Array.isArray(data) ? data : data?.data ?? [];
          
          // Cargar TODAS las áreas de la empresa (no filtrar por sede)
          setAreasDestino(areas);
        } else {
          const errorText = await response.text();
          console.error("🔴 TrasladarModal: Error response:", response.status, errorText);
          setAreasDestino([]);
        }
      } catch (error: unknown) {
        console.error("🔴 TrasladarModal: Error cargando áreas:", error);
        setAreasDestino([]);
      } finally {
        setLoadingAreas(false);
      }
    };

    fetchAreas();
  }, [empresaId, isOpen]);

  const handleAddPhoto = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setFotos([...fotos, { file, description: "" }]);
      }
    };
    input.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!confirmar) {
      alert("Debes confirmar que la información del traslado es correcta");
      return;
    }

    setSubmitting(true);

    try {
      const activoId = asset?.id || asset?._id;
      if (!activoId) {
        throw new Error("No se pudo identificar el activo");
      }

      const token = localStorage.getItem("token");
      const formData = new FormData();

      // Agregar todos los campos al FormData
      formData.append("empresaId", empresaId || "");
      formData.append("sedeOrigenId", sedeOrigenId || "");
      formData.append("sedeDestinoId", sedeDestino);
      
      // Si hay conflicto de código y el usuario aceptó un nuevo código
      if (codigoConflicto?.existe && nuevoCodigoAsignado) {
        formData.append("nuevoCodigoAsignado", nuevoCodigoAsignado);
      }
      if (areaDestino) {
        formData.append("areaDestinoId", areaDestino);
      }
      formData.append("motivo", motivo);
      formData.append("responsableEnvia", responsableEnvia);
      formData.append("responsableRecibe", responsableRecibe);
      formData.append("fechaTraslado", fechaTraslado);
      formData.append("estadoEquipo", estadoEquipo);
      if (especificarFalla) {
        formData.append("especificarFalla", especificarFalla);
      }
      if (observaciones) {
        formData.append("observaciones", observaciones);
      }

      // Agregar fotos
      fotos.forEach((foto, index) => {
        formData.append(`fotos`, foto.file);
        formData.append(`fotoDescriptions[${index}]`, foto.description || "");
      });

      const apiBase = (import.meta.env.VITE_API_URL as string) || '';
      const response = await fetch(
        `${apiBase}/api/activos/${activoId}/trasladar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error del servidor:", errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      alert(
        `✅ Traslado registrado exitosamente\n\nEl activo ha sido trasladado a ${sedes?.find((s) => String(s._id ?? s.id) === sedeDestino)?.nombre || "la nueva sede"}`
      );
      
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      console.error("❌ Error al trasladar activo:", error);
      const e = error as { message?: string };
      alert(`Error al registrar el traslado:\n${e.message ?? "Error desconocido"}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const usuarioActual = (() => {
    const usuarios = asset?.usuariosAsignados ?? asset?.usuario_asignado;
    const usuariosArray = Array.isArray(usuarios)
      ? usuarios
      : typeof usuarios === "string"
      ? JSON.parse(usuarios || "[]")
      : [];
    const first = usuariosArray.length > 0 ? (usuariosArray[0] as Record<string, unknown>) : null;
    return first && first['nombre'] ? String(first['nombre']) : "No asignado";
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-4xl my-8 mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold">Trasladar Activo</h3>
                <p className="text-indigo-100 text-sm">
                  {formatAssetCode(String(asset?.assetId ?? asset?.codigo ?? ""))} - {String(asset?.categoria)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información Autocompletada */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
            <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Información del Activo
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Empresa</label>
                <p className="font-bold text-gray-900">{empresaNombre || "-"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Sede Origen</label>
                <p className="font-bold text-gray-900">{sedeOrigenNombre || "-"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Código</label>
                <p className="font-bold text-gray-900">{formatAssetCode(String(asset?.assetId ?? asset?.codigo ?? ""))}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Categoría</label>
                <p className="font-bold text-gray-900">{String(asset?.categoria)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Usuario Actual</label>
                <p className="font-bold text-gray-900">{usuarioActual}</p>
              </div>
            </div>
          </div>

          {/* Campos a Completar */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Datos del Traslado
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sede de Destino */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sede de Destino <span className="text-red-500">*</span>
                </label>
                <select
                  value={sedeDestino}
                  onChange={(e) => {
                    setSedeDestino(e.target.value);
                    setNuevoCodigoAsignado(""); // Reset nuevo código al cambiar sede
                  }}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">-- Seleccionar Sede --</option>
                  {sedes
                    .filter((s) => String(s._id ?? s.id) !== sedeOrigenId)
                    .map((sede) => (
                      <option key={sede._id ?? sede.id} value={String(sede._id ?? sede.id)}>
                        {sede.nombre}
                      </option>
                    ))}
                </select>
                
                {/* Alerta de código duplicado */}
                {codigoConflicto?.existe && (
                  <div className="mt-3 bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex-1">
                        <h4 className="font-bold text-amber-900 mb-1">⚠️ Código Duplicado Detectado</h4>
                        <p className="text-sm text-amber-800 mb-3">
                          El código <strong>{formatAssetCode(String(asset?.assetId ?? asset?.codigo ?? ""))}</strong> ya existe en la sede destino.
                          El sistema asignará automáticamente el código: <strong className="text-amber-900">{codigoConflicto.sugerencia}</strong>
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="aceptarNuevoCodigo"
                            checked={nuevoCodigoAsignado === codigoConflicto.sugerencia}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNuevoCodigoAsignado(codigoConflicto.sugerencia);
                              } else {
                                setNuevoCodigoAsignado("");
                              }
                            }}
                            className="w-4 h-4 text-amber-600 focus:ring-amber-500 rounded"
                          />
                          <label htmlFor="aceptarNuevoCodigo" className="text-sm font-medium text-amber-900 cursor-pointer">
                            Acepto que se asigne el nuevo código {codigoConflicto.sugerencia}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Área de Destino */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Área de Destino <span className="text-gray-500 text-xs">(opcional)</span>
                </label>
                <select
                  value={areaDestino}
                  onChange={(e) => setAreaDestino(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={loadingAreas}
                >
                  <option value="">
                    {loadingAreas
                      ? "Cargando áreas..."
                      : areasDestino.length === 0
                      ? "-- Sin áreas registradas --"
                      : "-- Seleccionar Área (opcional) --"}
                  </option>
                  {areasDestino.map((area) => (
                    <option key={area._id ?? area.id} value={String(area._id ?? area.id)}>
                      {area.nombre}
                    </option>
                  ))}
                </select>
                {areasDestino.length > 0 && !loadingAreas && (
                  <p className="text-xs text-gray-500 mt-1">
                    {areasDestino.length} {areasDestino.length === 1 ? "área disponible" : "áreas disponibles"} de la empresa
                  </p>
                )}
              </div>

              {/* Fecha del Traslado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha del Traslado <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={fechaTraslado}
                  onChange={(e) => setFechaTraslado(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Permite cambiarla si el traslado ocurrió antes</p>
              </div>

              {/* Responsable que Envía */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsable que Envía <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={responsableEnvia}
                  onChange={(e) => setResponsableEnvia(e.target.value)}
                  placeholder="Nombre del técnico o persona de TI"
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Responsable que Recibe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsable que Recibe <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={responsableRecibe}
                  onChange={(e) => setResponsableRecibe(e.target.value)}
                  placeholder="Nombre de quien recibe el equipo"
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Motivo de Traslado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo de Traslado <span className="text-red-500">*</span>
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Describe el motivo del traslado..."
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
                required
              />
            </div>

            {/* Estado del Equipo al Salir */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado del Equipo al Salir
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="estadoEquipo"
                    value="bueno"
                    checked={estadoEquipo === "bueno"}
                    onChange={(e) => setEstadoEquipo(e.target.value)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Bueno</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="estadoEquipo"
                    value="regular"
                    checked={estadoEquipo === "regular"}
                    onChange={(e) => setEstadoEquipo(e.target.value)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Regular</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="estadoEquipo"
                    value="con_falla"
                    checked={estadoEquipo === "con_falla"}
                    onChange={(e) => setEstadoEquipo(e.target.value)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Con falla (especificar)</span>
                </label>
                {estadoEquipo === "con_falla" && (
                  <input
                    type="text"
                    value={especificarFalla}
                    onChange={(e) => setEspecificarFalla(e.target.value)}
                    placeholder="Especificar la falla..."
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ml-6"
                  />
                )}
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones adicionales sobre el traslado..."
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
              />
            </div>

            {/* Fotos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Adjuntar Fotos</label>
              <button
                type="button"
                onClick={handleAddPhoto}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg border border-indigo-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar Foto
              </button>
              {fotos.length > 0 && (
                <div className="mt-3 space-y-3">
                  {fotos.map((foto, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border">
                      <img
                        src={URL.createObjectURL(foto.file)}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <input
                          type="text"
                          value={foto.description}
                          onChange={(e) => {
                            const newFotos = [...fotos];
                            newFotos[idx].description = e.target.value;
                            setFotos(newFotos);
                          }}
                          placeholder="Descripción de la foto..."
                          className="w-full p-2 border rounded text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setFotos(fotos.filter((_, i) => i !== idx))}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkbox de Confirmación */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmar}
                  onChange={(e) => setConfirmar(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 mt-0.5 flex-shrink-0"
                  required
                />
                <span className="text-sm font-medium text-gray-800">
                  Confirmo que la información del traslado es correcta y he verificado todos los datos antes de proceder.
                </span>
              </label>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!confirmar || submitting || (codigoConflicto?.existe && !nuevoCodigoAsignado)}
              className={`px-6 py-2.5 font-medium rounded-lg transition-all shadow-lg flex items-center gap-2 ${
                confirmar && !submitting && (!codigoConflicto?.existe || nuevoCodigoAsignado)
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </>
              ) : (
                "Trasladar Activo"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrasladarAssetModal;

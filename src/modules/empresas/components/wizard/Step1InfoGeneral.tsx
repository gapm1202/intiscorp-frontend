import { useState } from "react";
import type { EmpresaGeneralData } from "./wizardTypes";

interface Step1Props {
  data: EmpresaGeneralData;
  onChange: (data: EmpresaGeneralData) => void;
  onNext: () => void;
  loadingCodigo: boolean;
}

const Step1InfoGeneral = ({ data, onChange, onNext, loadingCodigo }: Step1Props) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
    if (errors[name]) {
      setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!data.nombre.trim()) newErrors.nombre = "El nombre es obligatorio";
    if (!data.ruc.trim()) newErrors.ruc = "El RUC es obligatorio";
    if (!data.ciudad.trim()) newErrors.ciudad = "La ciudad es obligatoria";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-sm font-bold">1</span>
          Información general de la empresa
        </h3>
        <p className="text-sm text-gray-500 ml-10">Datos esenciales para identificar al cliente.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la empresa *</label>
          <input
            type="text"
            name="nombre"
            value={data.nombre}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.nombre ? "border-red-400" : "border-gray-300"}`}
            placeholder="Ej: TechCorp S.A."
          />
          {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
        </div>

        {/* RUC */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">RUC *</label>
          <input
            type="text"
            name="ruc"
            value={data.ruc}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.ruc ? "border-red-400" : "border-gray-300"}`}
            placeholder="Ej: 20123456789"
          />
          {errors.ruc && <p className="text-xs text-red-500 mt-1">{errors.ruc}</p>}
        </div>

        {/* Código cliente */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Código interno de cliente</label>
          <input
            type="text"
            name="codigoCliente"
            value={data.codigoCliente}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
            placeholder="Se genera automáticamente"
          />
          {loadingCodigo && <p className="text-xs text-gray-500 mt-1">Generando código...</p>}
        </div>

        {/* Nombre comercial */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre comercial</label>
          <input
            type="text"
            name="direccionFiscal"
            value={data.direccionFiscal}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre comercial de la empresa"
          />
        </div>

        {/* Dirección operativa */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección operativa</label>
          <input
            type="text"
            name="direccionOperativa"
            value={data.direccionOperativa}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Calle, número, piso"
          />
        </div>

        {/* Ciudad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
          <input
            type="text"
            name="ciudad"
            value={data.ciudad}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.ciudad ? "border-red-400" : "border-gray-300"}`}
            placeholder="Ej: Lima"
          />
          {errors.ciudad && <p className="text-xs text-red-500 mt-1">{errors.ciudad}</p>}
        </div>

        {/* Provincia */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
          <input
            type="text"
            name="provincia"
            value={data.provincia}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: Lima"
          />
        </div>

        {/* Sector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sector empresarial (opcional)</label>
          <input
            type="text"
            name="sector"
            value={data.sector}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: Tecnología, Finanzas, etc."
          />
        </div>

        {/* Página web */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Página web (opcional)</label>
          <input
            type="url"
            name="paginaWeb"
            value={data.paginaWeb}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: https://www.empresa.com"
          />
        </div>

        {/* Observaciones generales */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones generales</label>
          <textarea
            name="observacionesGenerales"
            value={data.observacionesGenerales}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Notas o comentarios generales de la empresa"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4 border-t">
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          Siguiente
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Step1InfoGeneral;

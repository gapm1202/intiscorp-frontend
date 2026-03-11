import { useState } from "react";

interface Step5Props {
  ruc: string;
  contrasena: string;
  onContrasenaChange: (value: string) => void;
  onPrev: () => void;
  onSubmit: () => void;
  loading: boolean;
}

const Step5Portal = ({ ruc, contrasena, onContrasenaChange, onPrev, onSubmit, loading }: Step5Props) => {
  const [mostrar, setMostrar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): boolean => {
    if (contrasena.trim().length < 12) {
      setError("La contraseña debe tener al menos 12 caracteres.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = () => {
    if (validate()) onSubmit();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-sm font-bold">5</span>
          Acceso al Portal de Soporte
        </h3>
        <p className="text-sm text-gray-500 ml-10">Configura las credenciales para el portal de soporte.</p>
      </div>

      <div className="max-w-lg mx-auto space-y-5">
        {/* Usuario (RUC) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Usuario del portal</label>
          <input
            type="text"
            value={ruc || "(RUC de la empresa)"}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">El usuario será automáticamente el RUC de la empresa.</p>
        </div>

        {/* Contraseña */}
        <div>
          <label className="text-sm font-semibold text-indigo-700 mb-1 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Contraseña Portal de Soporte *
          </label>
          <div className="relative">
            <input
              type={mostrar ? "text" : "password"}
              value={contrasena}
              onChange={e => { onContrasenaChange(e.target.value); if (error) setError(null); }}
              autoComplete="new-password"
              className={`w-full px-3 py-2 pr-10 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${error ? "border-red-400" : "border-indigo-300"}`}
              placeholder="Ingrese una contraseña segura (mín. 12 caracteres)"
              minLength={12}
            />
            <button
              type="button"
              onClick={() => setMostrar(!mostrar)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {mostrar ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

          {/* Strength indicator */}
          <div className="mt-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    contrasena.length >= i * 4
                      ? contrasena.length >= 16
                        ? "bg-green-500"
                        : contrasena.length >= 12
                        ? "bg-yellow-500"
                        : "bg-red-400"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">{contrasena.length}/12 caracteres mínimos</p>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-indigo-800">
              <p className="font-medium mb-1">Información importante</p>
              <p>Esta contraseña permitirá a la empresa acceder al portal de soporte. Se encriptará automáticamente y podrá modificarse posteriormente desde el módulo de Usuarios.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <button
          type="button"
          onClick={onPrev}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Anterior
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="px-8 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creando empresa...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Crear Empresa
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Step5Portal;

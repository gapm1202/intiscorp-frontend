import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEmpresas } from "@/modules/empresas/services/empresasService";
import CreateEmpresaModal from "../components/CreateEmpresaModal";

interface Empresa {
  id?: number;
  _id?: string;
  nombre?: string;
  ruc?: string;
  direccion?: string;
  [key: string]: unknown;
}

const EmpresasList = () => {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterName, setFilterName] = useState<string>("");
  const [filterRuc, setFilterRuc] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // fetch with optional filters
  const fetchEmpresas = async (name?: string, ruc?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEmpresas({ nombre: name, ruc });
      const items = Array.isArray(data) ? data : data?.data ?? [];
      setEmpresas(items);
    } catch (err: unknown) {
      console.error(err);
      const e = err as { message?: string };
      setError(e.message || "Error al cargar empresas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
    <div className="max-w-7xl mx-auto">
      {/* Header profesional con diseño mejorado */}
      <div className="mb-8 bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-1">
                Gestión de Empresas
              </h1>
              <p className="text-slate-600 text-sm font-medium">Administra y visualiza todas las empresas registradas en el sistema</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold py-3.5 px-7 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="tracking-wide">Nueva Empresa</span>
          </button>
        </div>
      </div>

      {/* Barra de filtros profesional mejorada */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-7 mb-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800">Filtros de Búsqueda</h3>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchEmpresas(filterName, filterRuc);
          }}
          className="flex flex-col md:flex-row gap-5 md:items-end"
        >
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2.5">Nombre de Empresa</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-slate-50 hover:bg-white font-medium"
                placeholder="Buscar por nombre de empresa..."
              />
            </div>
          </div>

          <div className="w-full md:w-72">
            <label className="block text-sm font-semibold text-slate-700 mb-2.5">RUC</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              </div>
              <input
                value={filterRuc}
                onChange={(e) => setFilterRuc(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-slate-50 hover:bg-white font-medium"
                placeholder="Buscar por RUC..."
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-7 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Buscar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterName("");
                setFilterRuc("");
                fetchEmpresas();
              }}
              className="flex items-center gap-2 px-7 py-3 border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-300 transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Limpiar</span>
            </button>
          </div>
        </form>
      </div>

      {/* Contenido principal - Grid de tarjetas mejorado */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-100 rounded-full mx-auto mb-6"></div>
              <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto absolute top-0 left-1/2 -ml-10"></div>
            </div>
            <p className="text-slate-700 font-semibold text-lg">Cargando empresas...</p>
            <p className="text-slate-500 text-sm mt-2">Por favor espere un momento</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 p-7 rounded-2xl shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-red-900 font-bold text-lg">Error al cargar datos</p>
              <p className="text-red-700 font-medium mt-1">{error}</p>
            </div>
          </div>
        </div>
      ) : empresas.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-16 text-center shadow-lg">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-3">No hay empresas registradas</h3>
          <p className="text-slate-600 mb-8 max-w-md mx-auto">Comienza agregando tu primera empresa al sistema para empezar a gestionar tu información</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="tracking-wide">Agregar Primera Empresa</span>
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6 bg-white rounded-xl shadow-md border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-700">
                Mostrando <span className="text-blue-700 text-lg font-bold">{empresas.length}</span> empresa{empresas.length !== 1 ? 's' : ''} registrada{empresas.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {empresas.map((e) => (
              <div
                key={e.id ?? e._id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-slate-200 p-7 transition-all duration-300 transform hover:-translate-y-2 group relative overflow-hidden"
              >
                {/* Efecto de fondo decorativo */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Activo</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-blue-700 transition-colors duration-300 leading-tight">
                        {String(e.nombre ?? e.name ?? "-")}
                      </h3>
                      <div className="space-y-3">
                        {Boolean(e.ruc ?? e.RUC) && (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">RUC</p>
                              <p className="font-bold text-slate-800">{String(e.ruc ?? e.RUC)}</p>
                            </div>
                          </div>
                        )}
                        {Boolean(e.direccion ?? e.address) && (
                          <div className="flex items-start gap-3 text-sm">
                            <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Dirección</p>
                              <p className="font-medium text-slate-700 leading-relaxed">{String(e.direccion ?? e.address)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-shadow duration-300 group-hover:scale-110 transform transition-transform">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-5 border-t border-slate-200">
                    <button
                      onClick={() => navigate(`/admin/empresas/${e.id ?? e._id}`)}
                      className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3.5 px-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 group-hover:shadow-xl"
                    >
                      <span className="tracking-wide">Ver Detalles</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    <CreateEmpresaModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      onSuccess={() => fetchEmpresas(filterName, filterRuc)}
    />
  </div>
);
};

export default EmpresasList;

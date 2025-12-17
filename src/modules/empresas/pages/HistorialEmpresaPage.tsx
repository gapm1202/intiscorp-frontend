import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { HistorialEntry } from "@/modules/empresas/services/historialService";
import { getHistorialEmpresa } from "@/modules/empresas/services/historialService";
import { getEmpresaById } from "@/modules/empresas/services/empresasService";

interface Empresa {
  id?: number;
  _id?: string;
  nombre?: string;
  [key: string]: unknown;
}

const HistorialEmpresaPage = () => {
  const { empresaId } = useParams<{ empresaId: string }>();
  const navigate = useNavigate();
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [empresaData, historialData] = await Promise.all([
          getEmpresaById(empresaId),
          getHistorialEmpresa(empresaId),
        ]);
        setEmpresa(empresaData);
        setHistorial(historialData);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Error al cargar datos";
        console.error(err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [empresaId]);

  const formatearFecha = (fechaStr?: string): string => {
    if (!fechaStr) return "-";
    try {
      const fecha = new Date(fechaStr);
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, "0");
      const dia = String(fecha.getDate()).padStart(2, "0");
      const hora = String(fecha.getHours()).padStart(2, "0");
      const minuto = String(fecha.getMinutes()).padStart(2, "0");
      return `${año}-${mes}-${dia} ${hora}:${minuto}`;
    } catch {
      return fechaStr;
    }
  };

  const getNombreUsuario = (entry: HistorialEntry): string => {
    return (entry.nombreUsuario || entry.userName || entry.usuario || "-") as string;
  };

  const getMotivo = (entry: HistorialEntry): string => {
    return (entry.motivo || entry.accion || "-") as string;
  };

  const getDestino = (entry: HistorialEntry): string => {
    const tipo = (entry.tipo || "").toString().toLowerCase();
    if (tipo.includes("sede") || (entry.accion || "").toString().toLowerCase().includes("sede")) {
      return "Sede";
    }
    if (tipo.includes("empresa") || (entry.accion || "").toString().toLowerCase().includes("empresa")) {
      return "Empresa";
    }
    const motivo = (entry.motivo || "").toString().toLowerCase();
    if (motivo.includes("sede")) return "Sede";
    return "Empresa";
  };

  const getAccionBadge = (entry: HistorialEntry): { text: string; color: string } => {
    const accion = (entry.accion || "").toString().toLowerCase();
    if (accion.includes("desactivar_sede")) {
      return { text: "DESACTIVADO", color: "bg-red-100 text-red-800" };
    } else if (accion.includes("activar_sede")) {
      return { text: "ACTIVADO", color: "bg-green-100 text-green-800" };
    } else if (accion.includes("editar_empresa")) {
      return { text: "EDITADO", color: "bg-yellow-100 text-yellow-800" };
    } else if (accion.includes("eliminar")) {
      return { text: "ELIMINAR", color: "bg-red-100 text-red-800" };
    } else if (accion.includes("editar")) {
      return { text: "EDITAR", color: "bg-yellow-100 text-yellow-800" };
    } else if (accion.includes("crear")) {
      return { text: "CREAR", color: "bg-green-100 text-green-800" };
    }
    return { text: "CAMBIO", color: "bg-blue-100 text-blue-800" };
  };

  // Export helpers
  const exportToCSV = (rows: HistorialEntry[], empresa?: Empresa | null) => {
    if (!rows || rows.length === 0) return;
    const headers = ["Fecha", "Usuario", "Destino", "Acción", "Motivo"];
    const csvRows = [headers.join(",")];
    for (const r of rows) {
      const fecha = formatearFecha(r.fecha as string).replace(/,/g, " ");
      const usuario = (r.nombreUsuario || r.userName || r.usuario || "-").toString().replace(/,/g, " ");
      const destino = getDestino(r).replace(/,/g, " ");
      const accion = (r.accion || "").toString().replace(/,/g, " ");
      const motivo = (r.motivo || "").toString().replace(/,/g, " ");
      csvRows.push([fecha, usuario, destino, accion, motivo].map(v => `"${v}"`).join(","));
    }

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const name = empresa?.nombre ? empresa.nombre.replace(/\s+/g, "_") : "historial";
    a.download = `${name}_historial_${empresaId || ""}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = (rows: HistorialEntry[], empresa?: Empresa | null) => {
    if (!rows) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const styles = `
      <style>
        * { margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; padding: 20px; background: white; }
        h2 { margin-bottom: 20px; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        tr:nth-child(even) { background-color: #fafafa; }
        @media print {
          body { margin: 0; padding: 10px; }
          table { font-size: 12px; }
        }
      </style>
    `;
    
    const title = `<h2>Historial de Cambios - ${empresa?.nombre || "Reporte"}</h2>`;
    const tableHeader = `<tr><th>Fecha</th><th>Usuario</th><th>Destino</th><th>Acción</th><th>Motivo</th></tr>`;
    const tableRows = rows.map(r => {
      return `<tr><td>${formatearFecha(r.fecha as string)}</td><td>${getNombreUsuario(r)}</td><td>${getDestino(r)}</td><td>${(r.accion||"")}</td><td>${(r.motivo||"")}</td></tr>`;
    }).join("");

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Historial - ${empresa?.nombre || "Reporte"}</title>
  ${styles}
</head>
<body>
  ${title}
  <table>
    <thead>${tableHeader}</thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => navigate(`/admin/empresas/${empresaId}`)} className="text-blue-600 hover:text-blue-800 font-medium mb-6">← Volver a Empresa</button>
          <div className="text-center text-gray-600 py-12">Cargando historial...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button onClick={() => navigate(`/admin/empresas/${empresaId}`)} className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-flex items-center gap-2">← Volver a Empresa</button>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Historial de Cambios</h1>
                <p className="text-gray-600 mt-2">Empresa: <span className="font-semibold">{empresa?.nombre || "Cargando..."}</span></p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportToCSV(historial, empresa)}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded text-sm"
                >
                  📥 Exportar Excel
                </button>
                <button
                  onClick={() => exportToPDF(historial, empresa)}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded text-sm"
                >
                  📄 Exportar PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg"><p><strong>Error:</strong> {error}</p></div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {historial.length === 0 ? (
            <div className="p-12 text-center text-gray-500"><p className="text-lg">No hay registros en el historial</p><p className="text-sm mt-2">Los cambios realizados aparecerán aquí</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Fecha</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Usuario</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Destino</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Acción</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Motivo / Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((entry, index) => {
                    const badge = getAccionBadge(entry);
                    return (
                      <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-800 font-medium">{formatearFecha(entry.fecha as string)}</td>
                        <td className="px-6 py-4 text-sm text-gray-800">{getNombreUsuario(entry)}</td>
                        <td className="px-6 py-4 text-sm text-gray-800">{getDestino(entry)}</td>
                        <td className="px-6 py-4 text-sm"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>{badge.text}</span></td>
                        <td className="px-6 py-4 text-sm text-gray-700">{getMotivo(entry)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {historial.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t text-sm text-gray-600">Total de registros: <span className="font-semibold text-gray-800">{historial.length}</span></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistorialEmpresaPage;

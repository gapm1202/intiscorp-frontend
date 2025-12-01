import { useAuth } from "@/context/authHelpers";

const Dashboard = () => {
  const { user } = useAuth();

  // Contenido dinámico por rol
  const cardsByRole: Record<string, Array<{ title: string; value: string; icon: string; colorClass?: string }>> = {
    administrador: [
      { title: "Usuarios", value: "128", icon: "👥", colorClass: "bg-purple-100" },
      { title: "Tickets Activos", value: "12", icon: "🎫", colorClass: "bg-blue-100" },
      { title: "Activos", value: "48", icon: "📦", colorClass: "bg-green-100" },
      { title: "Empresas", value: "8", icon: "🏢", colorClass: "bg-indigo-100" },
    ],
    tecnico: [
      { title: "Mis Tickets", value: "6", icon: "🛠️", colorClass: "bg-yellow-100" },
      { title: "Tareas", value: "3", icon: "📋", colorClass: "bg-blue-100" },
      { title: "Próx. Mantenimientos", value: "2", icon: "🔧", colorClass: "bg-orange-100" },
      { title: "Inventario", value: "21", icon: "📦", colorClass: "bg-green-100" },
    ],
    cliente: [
      { title: "Mis Tickets", value: "4", icon: "📨", colorClass: "bg-blue-100" },
      { title: "Solicitudes Abiertas", value: "2", icon: "⏳", colorClass: "bg-yellow-100" },
      { title: "SLA Promedio", value: "24h", icon: "⏱️", colorClass: "bg-purple-100" },
      { title: "Empresas", value: "1", icon: "🏢", colorClass: "bg-indigo-100" },
    ],
  };

  const cards = user ? cardsByRole[user.rol] ?? cardsByRole["cliente"] : cardsByRole["cliente"];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Top metrics - compact cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.title} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted text-xs font-medium">{c.title}</p>
                <p className="text-xl font-semibold text-slate-800 mt-1">{c.value}</p>
              </div>
              <div className={`w-10 h-10 ${c.colorClass ?? "bg-gray-100"} rounded-md flex items-center justify-center text-lg`}>
                {c.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-slate-800">Delivery Statistics</h3>
            <div className="text-sm text-muted">Monthly</div>
          </div>
          <div className="h-72 bg-subtle rounded flex items-center justify-center">
            <p className="text-muted">Gráfico principal</p>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="text-base font-semibold text-slate-800 mb-3">Tracking Delivery</h3>
          <div className="h-72 bg-subtle rounded flex items-start flex-col p-3 gap-2 overflow-auto">
            <p className="text-sm text-muted">Últimas entregas</p>
            <div className="mt-auto text-xs text-muted"># tracking info</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

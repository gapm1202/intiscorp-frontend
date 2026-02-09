const _metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
export const API_BASE = _metaEnv?.VITE_API_URL || "http://localhost:4000";

function getToken(): string | null {
  return localStorage.getItem("token");
}

export interface DashboardStats {
  totalEquipment: number;
  totalCompanies: number;
  totalAssets: number;
  totalTickets: number;
  ticketsByStatus: Array<{
    label: string;
    value: number;
  }>;
  recentAssets: Array<{
    id: string | number;
    nombre: string;
    tag?: string;
    categoria?: string;
    createdAt: string;
  }>;
  equipmentByMonth: number[];
  categoryStats: Array<{
    label: string;
    value: number;
  }>;
  locationStats: Array<{
    label: string;
    value: number;
  }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const token = getToken();
  
  try {
    // Obtener empresas
    const empresasRes = await fetch(`${API_BASE}/api/empresas/`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { "Authorization": `Bearer ${token}` })
      },
    });
    
    let totalCompanies = 0;
    let empresas: Array<Record<string, unknown>> = [];
    if (empresasRes.ok) {
      empresas = await empresasRes.json();
      totalCompanies = empresas.length;
    }

    // Obtener tickets
    let totalTickets = 0;
    let ticketsByStatus: Array<{ label: string; value: number }> = [];
    
    try {
      const ticketsRes = await fetch(`${API_BASE}/api/tickets/gestion/lista?page=1&limit=1000`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
      });
      
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        const tickets = ticketsData.data?.tickets || ticketsData.tickets || [];
        totalTickets = ticketsData.data?.pagination?.total || tickets.length || 0;
        
        // Agrupar por estado
        const statusMap: Record<string, number> = {};
        tickets.forEach((ticket: Record<string, unknown>) => {
          const status = (ticket.estado as string) || 'Desconocido';
          statusMap[status] = (statusMap[status] || 0) + 1;
        });
        
        ticketsByStatus = Object.entries(statusMap)
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value);
      }
    } catch (err) {
      console.warn("Error fetching tickets:", err);
    }

    // Obtener inventario de todas las empresas
    const allAssets: Array<Record<string, unknown>> = [];
    let recentAssets: Array<Record<string, unknown>> = [];
    
    for (const empresa of empresas.slice(0, 10)) { // Limitamos a 10 empresas para no saturar
      try {
        const inventarioRes = await fetch(`${API_BASE}/api/empresas/${empresa.id}/inventario`, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { "Authorization": `Bearer ${token}` })
          },
        });
        
        if (inventarioRes.ok) {
          const inventario = await inventarioRes.json();
          if (Array.isArray(inventario)) {
            allAssets.push(...inventario);
          }
        }
      } catch (err) {
        console.warn(`Error fetching inventario for empresa ${empresa.id}:`, err);
      }
    }

    // Ordenar por fecha de creación (más recientes primero)
    const sortedAssets = [...allAssets].sort((a, b) => {
      const dateA = new Date((a.createdAt as string) || (a.created_at as string) || 0).getTime();
      const dateB = new Date((b.createdAt as string) || (b.created_at as string) || 0).getTime();
      return dateB - dateA;
    });

    // Tomar los 5 más recientes
    recentAssets = sortedAssets.slice(0, 5).map(asset => ({
      id: asset.id as string | number,
      nombre: (asset.nombre as string) || (asset.name as string) || 'Sin nombre',
      tag: (asset.tag as string) || (asset.codigo as string),
      categoria: (asset.categoria as string) || (asset.tipo as string),
      createdAt: (asset.createdAt as string) || (asset.created_at as string) || new Date().toISOString(),
    }));

    // Estadísticas por categoría
    const categoryMap: Record<string, number> = {};
    allAssets.forEach(asset => {
      const cat = (asset.categoria as string) || (asset.tipo as string) || 'Otros';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    const categoryStats = Object.entries(categoryMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4); // Top 4 categorías

    // Estadísticas por ubicación (sedes)
    const locationMap: Record<string, number> = {};
    allAssets.forEach(asset => {
      const loc = (asset.sedeName as string) || (asset.ubicacion as string) || 'Sin ubicación';
      locationMap[loc] = (locationMap[loc] || 0) + 1;
    });

    const locationStats = Object.entries(locationMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 ubicaciones

    // Equipos por mes (últimos 12 meses)
    const now = new Date();
    const equipmentByMonth = Array(12).fill(0);
    
    allAssets.forEach(asset => {
      const createdDate = new Date((asset.createdAt as string) || (asset.created_at as string) || 0);
      const monthDiff = (now.getFullYear() - createdDate.getFullYear()) * 12 + (now.getMonth() - createdDate.getMonth());
      
      if (monthDiff >= 0 && monthDiff < 12) {
        equipmentByMonth[11 - monthDiff]++;
      }
    });

    return {
      totalEquipment: allAssets.length,
      totalCompanies,
      totalAssets: allAssets.length,
      totalTickets,
      ticketsByStatus,
      recentAssets: recentAssets as DashboardStats['recentAssets'],
      equipmentByMonth,
      categoryStats,
      locationStats,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    
    // Retornar datos de respaldo en caso de error
    return {
      totalEquipment: 0,
      totalCompanies: 0,
      totalAssets: 0,
      totalTickets: 0,
      ticketsByStatus: [],
      recentAssets: [],
      equipmentByMonth: Array(12).fill(0),
      categoryStats: [],
      locationStats: [],
    };
  }
}

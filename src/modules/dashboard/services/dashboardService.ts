const _metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
export const API_BASE = _metaEnv?.VITE_API_URL || "";

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
    codigo?: string;
    modelo?: string;
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
  
  console.log("🔍 [DASHBOARD] Iniciando carga de estadísticas...");
  console.log("🔑 [DASHBOARD] Token:", token ? "✅ Presente" : "❌ No encontrado");
  console.log("🌐 [DASHBOARD] API_BASE:", API_BASE);
  
  try {
    // Obtener empresas
    console.log("📊 [DASHBOARD] Obteniendo empresas...");
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
      console.log(`✅ [DASHBOARD] Empresas obtenidas: ${totalCompanies}`, empresas);
    } else {
      console.error("❌ [DASHBOARD] Error al obtener empresas:", empresasRes.status, await empresasRes.text());
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

    // Obtener inventario de TODAS las empresas (sin límite)
    const allAssets: Array<Record<string, unknown>> = [];
    let recentAssets: Array<Record<string, unknown>> = [];
    
    console.log("📦 [DASHBOARD] Obteniendo inventario de todas las empresas...");
    
    // Procesar todas las empresas en paralelo para mejor rendimiento
    const inventarioPromises = empresas.map(async (empresa) => {
      try {
        const empresaId = (empresa.id ?? empresa._id ?? empresa._id) as string | number;
        const url = `${API_BASE}/api/empresas/${empresaId}/inventario`;
        console.log(`  📍 [DASHBOARD] Consultando inventario para empresaId=${empresaId}: ${url}`);
        
        const inventarioRes = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { "Authorization": `Bearer ${token}` })
          },
        });
        
        if (inventarioRes.ok) {
          const inventario = await inventarioRes.json();
          console.log(`  ✅ [DASHBOARD] Inventario empresa ${empresa.id}:`, inventario);
          
          // Manejar tanto array directo como objeto con { ok, data }
          if (Array.isArray(inventario)) {
            return inventario;
          } else if (inventario && inventario.data && Array.isArray(inventario.data)) {
            console.log(`  ✅ [DASHBOARD] Extrayendo ${inventario.data.length} activos de empresa ${empresa.id}`);
            return inventario.data;
          } else {
            console.warn(`  ⚠️ [DASHBOARD] Formato inesperado para empresa ${empresa.id}:`, inventario);
          }
        } else {
          const errorText = await inventarioRes.text();
          console.error(`  ❌ [DASHBOARD] Error empresa ${empresa.id} (${inventarioRes.status}):`, errorText);
        }
        return [];
      } catch (err) {
        console.error(`  💥 [DASHBOARD] Excepción empresa ${empresa.id}:`, err);
        return [];
      }
    });

    const inventarioResults = await Promise.all(inventarioPromises);
    inventarioResults.forEach(inv => {
      allAssets.push(...inv);
    });
    
    console.log(`📊 [DASHBOARD] Total activos recolectados: ${allAssets.length}`, allAssets);
    // Log resumido de campos de fecha para depuración
    try {
      const resumenFechas = allAssets.map(a => ({
        id: a.id ?? a._id ?? null,
        createdAt: a.createdAt ?? null,
        created_at: a.created_at ?? null,
        fecha_creacion: a.fecha_creacion ?? null,
        created_at_iso: a.created_at_iso ?? null,
      }));
      console.log('🔎 [DASHBOARD] Resumen campos fecha por activo:', resumenFechas);
    } catch (e) {
      console.warn('⚠️ [DASHBOARD] Error creando resumen de fechas:', e);
    }

    // Ordenar por fecha de creación (más recientes primero)
    const sortedAssets = [...allAssets].sort((a, b) => {
      const dateA = new Date((a.createdAt as string) || (a.created_at as string) || (a.fecha_creacion as string) || 0).getTime();
      const dateB = new Date((b.createdAt as string) || (b.created_at as string) || (b.fecha_creacion as string) || 0).getTime();
      return dateB - dateA;
    });

    // Tomar los 5 más recientes
    const pickCodigo = (asset: Record<string, any>) => {
      return (
        (asset.codigo as string) ||
        (asset.codigo_activo as string) ||
        (asset.codigoActivo as string) ||
        (asset.assetId as string) ||
        (asset.asset_id as string) ||
        (asset.activo_codigo as string) ||
        (asset.activoCodigo as string) ||
        (asset.tag as string) ||
        (asset.codigoActivo as string) ||
        (asset.serial as string) ||
        (asset.serie as string) ||
        (asset.id ? String(asset.id) : '') ||
        ''
      );
    };

    recentAssets = sortedAssets.slice(0, 5).map(asset => {
      const codigoVal = pickCodigo(asset);
      return {
        id: asset.id as string | number,
        nombre: (asset.nombre as string) || (asset.name as string) || '',
        codigo: codigoVal,
        modelo: (asset.modelo as string) || (asset.modeloEquipo as string) || '',
        tag: (asset.tag as string) || '',
        categoria: (asset.categoria as string) || (asset.tipo as string),
        createdAt: (asset.createdAt as string) || (asset.created_at as string) || new Date().toISOString(),
      };
    });

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
    
    console.log("📈 [DASHBOARD] Estadísticas por categoría:", categoryStats);

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
    
    console.log("📍 [DASHBOARD] Estadísticas por ubicación:", locationStats);

    // Equipos por mes para el año actual (Ene..Dic)
    const now = new Date();
    const currentYear = now.getFullYear();
    const equipmentByMonth = Array(12).fill(0);

    allAssets.forEach(asset => {
      const rawDate = (asset.createdAt as string) || (asset.created_at as string) || (asset.fecha_creacion as string) || (asset.created_at_iso as string) || '';
      if (!rawDate) {
        console.warn(`📌 [DASHBOARD] asset id=${asset.id ?? asset._id} no tiene fecha rawDate`);
        return;
      }
      const createdDate = new Date(rawDate);
      if (isNaN(createdDate.getTime())) {
        console.warn(`📌 [DASHBOARD] asset id=${asset.id ?? asset._id} fecha inválida:`, rawDate);
        return;
      }
      const counted = createdDate.getFullYear() === currentYear;
      console.log(`📍 [DASHBOARD] asset id=${asset.id ?? asset._id} rawDate=${rawDate} parsed=${createdDate.toISOString()} year=${createdDate.getFullYear()} counted=${counted}`);
      if (counted) {
        const m = createdDate.getMonth(); // 0..11
        equipmentByMonth[m] = (equipmentByMonth[m] || 0) + 1;
      }
    });

    // Asegurar que los valores para el gráfico sean números primitivos
    for (let i = 0; i < equipmentByMonth.length; i++) {
      equipmentByMonth[i] = Number(equipmentByMonth[i]) || 0;
    }

    const result = {
      totalEquipment: allAssets.length,
      totalCompanies,
      totalAssets: allAssets.length,
      totalTickets,
      ticketsByStatus,
      recentAssets: recentAssets as DashboardStats['recentAssets'],
      equipmentByMonth,
      totalNewEquipment: equipmentByMonth.reduce((a, b) => a + (Number(b) || 0), 0),
      categoryStats,
      locationStats,
    };
    
    console.log("✅ [DASHBOARD] Resultado final:", result);
    console.log("🔢 [DASHBOARD] equipmentByMonth (detalle):", equipmentByMonth);
    
    return result;
  } catch (error) {
    console.error("💥 [DASHBOARD] Error general:", error);
    
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

/**
 * Mock para testing del sistema de notificaciones de contratos próximos a vencer
 * 
 * Instrucciones:
 * 1. Importar este mock en el Header temporalmente
 * 2. Descomentar la línea que llama a getMockContratosProximos()
 * 3. Una vez que el backend implemente el endpoint real, eliminar esta referencia
 */

export const getMockContratosProximos = () => {
  const hoy = new Date();
  
  return [
    {
      empresaId: "1",
      empresaNombre: "Empresa ABC S.A.C.",
      fechaFin: new Date(hoy.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 días
      diasRestantes: 5,
      renovacionAutomatica: false
    },
    {
      empresaId: "2",
      empresaNombre: "Tech Solutions Corp.",
      fechaFin: new Date(hoy.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 días
      diasRestantes: 15,
      renovacionAutomatica: true
    },
    {
      empresaId: "3",
      empresaNombre: "Inversiones Digitales SAC",
      fechaFin: new Date(hoy.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 día
      diasRestantes: 1,
      renovacionAutomatica: false
    },
    {
      empresaId: "4",
      empresaNombre: "Grupo Empresarial XYZ",
      fechaFin: hoy.toISOString().split('T')[0], // Hoy
      diasRestantes: 0,
      renovacionAutomatica: true
    },
    {
      empresaId: "5",
      empresaNombre: "Servicios Integrales del Perú",
      fechaFin: new Date(hoy.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 28 días
      diasRestantes: 28,
      renovacionAutomatica: false
    }
  ];
};

/**
 * Para usar el mock en Header.tsx:
 * 
 * import { getMockContratosProximos } from '@/mocks/contratosMock';
 * 
 * Luego en el useEffect:
 * 
 * const cargarContratosProximos = async () => {
 *   try {
 *     // Para testing, usar el mock:
 *     const contratos = getMockContratosProximos();
 *     
 *     // Cuando el backend esté listo, usar:
 *     // const contratos = await getContratosProximosAVencer(30);
 *     
 *     setContratosProximos(contratos || []);
 *   } catch (error) {
 *     console.error('Error al cargar contratos próximos a vencer:', error);
 *   }
 * };
 */

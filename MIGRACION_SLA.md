# 🔄 Migración SLA - Nuevos Endpoints Backend

## 🎯 **ACTUALIZACIÓN: Sistema de Fases SLA (Febrero 2026)**

### Resumen de Cambios

El sistema de SLA ahora calcula el progreso en **dos fases independientes**:

1. **Fase de Respuesta**: Desde que se abre el ticket (`ABIERTO`) hasta que un técnico lo toma (`EN_PROCESO`)
2. **Fase de Resolución**: Desde que está `EN_PROCESO` hasta que se marca como `RESUELTO`

### 📊 Nuevos Campos en la API

Cuando se consulta un ticket (`GET /api/tickets` o `/api/tickets/:id`), ahora se reciben estos campos adicionales:

```typescript
interface Ticket {
  // ... campos existentes ...
  
  // Identificador de fase actual
  fase_sla_actual?: 'RESPUESTA' | 'RESOLUCION' | 'COMPLETADO' | 'SIN_SLA';
  
  // Porcentajes de consumo (0-100+)
  porcentaje_tiempo_respuesta?: number;     // % consumido de tiempo de respuesta
  porcentaje_tiempo_resolucion?: number;    // % consumido de tiempo de resolución
  
  // Tiempos transcurridos en minutos
  tiempo_respuesta_transcurrido_minutos?: number;   // Minutos desde ABIERTO hasta EN_PROCESO
  tiempo_resolucion_transcurrido_minutos?: number;  // Minutos desde EN_PROCESO hasta ahora/RESUELTO
  
  // Fechas límite para cada fase
  fecha_limite_respuesta?: string;
  fecha_limite_resolucion?: string;
  
  // Tiempos esperados (desde SLA configurado)
  tiempo_respuesta_minutos?: number;        // Límite configurado para respuesta
  tiempo_resolucion_minutos?: number;       // Límite configurado para resolución
}
```

### 🎨 Implementación en el Frontend

#### Componentes Actualizados

1. **`TicketDetailPage.tsx`**: Muestra la barra de progreso correspondiente según `fase_sla_actual`
   - `RESPUESTA`: Muestra barra de "Tiempo de Respuesta"
   - `RESOLUCION`: Muestra barra de "Tiempo de Resolución"
   - `COMPLETADO`: Muestra resumen de ambas fases con indicador de cumplimiento

2. **`TicketsPage.tsx`**: Muestra mini barras de progreso en la tabla de tickets
   - Usa `fase_sla_actual` para determinar qué barra mostrar

3. **`SLATimer.tsx`**: Componente reutilizable que muestra el progreso de una fase
   - Acepta el porcentaje, tiempos y fechas límite
   - Colores automáticos: verde (<70%), amarillo (70-90%), naranja (90-100%), rojo (>100%)

#### Lógica de Visualización

```typescript
switch (ticket.fase_sla_actual) {
  case 'RESPUESTA':
    // Mostrar progreso de fase de respuesta
    mostrarBarra({
      titulo: 'Tiempo de Respuesta',
      porcentaje: ticket.porcentaje_tiempo_respuesta,
      transcurrido: ticket.tiempo_respuesta_transcurrido_minutos,
      limite: ticket.tiempo_respuesta_minutos,
      fechaLimite: ticket.fecha_limite_respuesta
    });
    break;
    
  case 'RESOLUCION':
    // Mostrar progreso de fase de resolución
    mostrarBarra({
      titulo: 'Tiempo de Resolución',
      porcentaje: ticket.porcentaje_tiempo_resolucion,
      transcurrido: ticket.tiempo_resolucion_transcurrido_minutos,
      limite: ticket.tiempo_resolucion_minutos,
      fechaLimite: ticket.fecha_limite_resolucion
    });
    break;
    
  case 'COMPLETADO':
    // Mostrar resumen de ambas fases
    mostrarResumen({
      respuesta: {
        cumplido: ticket.porcentaje_tiempo_respuesta <= 100,
        porcentaje: ticket.porcentaje_tiempo_respuesta
      },
      resolucion: {
        cumplido: ticket.porcentaje_tiempo_resolucion <= 100,
        porcentaje: ticket.porcentaje_tiempo_resolucion
      }
    });
    break;
    
  case 'SIN_SLA':
    // No aplica SLA para este ticket
    ocultarBarra();
    break;
}
```

### ⚠️ Notas Importantes

- Los porcentajes pueden superar el 100% si se excede el tiempo límite
- Los campos tendrán valores `null` o `0` si el ticket no tiene SLA aplicable
- Las pausas de SLA ya están descontadas automáticamente de los tiempos transcurridos
- Los cálculos se actualizan en tiempo real en cada petición
- El polling automático refresca los datos cada 30 segundos

---

## ✅ Cambios Implementados

### 1. Servicio SLA Actualizado

**Archivo:** `src/modules/sla/services/slaService.ts`

Se ha actualizado completamente el servicio SLA para usar los **nuevos endpoints independientes** del backend.

---

## 📋 Nuevos Métodos Disponibles

### 🎯 **ALCANCE** - Define qué tickets tienen SLA

```typescript
// Obtener configuración de alcance
await slaService.getAlcance(empresaId: string): Promise<AlcanceData | null>

// Guardar configuración de alcance
await slaService.guardarAlcance(empresaId: string, data: AlcanceData)
```

**Estructura de Datos:**
```typescript
interface AlcanceData {
  tiposTicket: string[];  // UUID[] - OBLIGATORIO (al menos 1)
  servicios?: number[];   // Solo si aplica_todos_servicios = false
  categorias?: number[];  // Solo si aplica_todas_categorias = false
  sedes?: number[];       // Solo si aplica_todas_sedes = false
  aplica_todos_servicios: boolean;
  aplica_todas_categorias: boolean;
  aplica_todas_sedes: boolean;
  observaciones?: string;
}
```

⚠️ **IMPORTANTE:** `tiposTicket` usa **UUID**, no INTEGER

---

### ⏱️ **TIEMPOS** - Tiempos de respuesta/resolución por prioridad

```typescript
// Obtener tiempos configurados
await slaService.getTiempos(empresaId: string): Promise<TiemposData | null>

// Guardar tiempos
await slaService.guardarTiempos(empresaId: string, data: TiemposData)
```

**Estructura de Datos:**
```typescript
interface TiemposData {
  tiempos: TiempoData[];
}

interface TiempoData {
  prioridad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';  // Enum tipo_prioridad
  tiempo_respuesta_minutos: number;
  tiempo_resolucion_minutos: number;
  escalamiento: boolean;
  tiempo_escalamiento_minutos?: number;  // Requerido si escalamiento = true
}
```

⚠️ **Validación:** Si `escalamiento = true`, `tiempo_escalamiento_minutos` debe ser > 0

---

### 🕒 **HORARIOS** - Ventanas de atención

```typescript
// Obtener horarios configurados
await slaService.getHorarios(empresaId: string): Promise<HorariosData | null>

// Guardar horarios
await slaService.guardarHorarios(empresaId: string, data: HorariosData)
```

**Estructura de Datos:**
```typescript
interface HorariosData {
  horarios: HorarioData[];
}

interface HorarioData {
  day_of_week: number;     // 0-6 (0 = Domingo, 6 = Sábado)
  atiende: boolean;
  hora_inicio?: string;    // 'HH:MM:SS' - requerido si atiende = true
  hora_fin?: string;       // 'HH:MM:SS' - requerido si atiende = true
  es_feriado: boolean;     // Informativo (no afecta cálculos)
}
```

📌 **Nota:** Los feriados son informativos, **NO detienen el cálculo SLA** automáticamente.

---

### 📊 **RESUMEN** - Estado general del SLA

```typescript
// Obtener resumen del SLA
await slaService.getResumen(empresaId: string): Promise<ResumenSLA | null>
```

**Respuesta:**
```typescript
interface ResumenSLA {
  configurado: boolean;
  activo: boolean;
  nombre: string;
  alcance_configurado: boolean;
  tiempos_configurados: number;    // Cantidad de prioridades configuradas
  horarios_configurados: number;   // Cantidad de días configurados
}
```

---

### 🔄 **TOGGLE** - Activar/Desactivar SLA

```typescript
// Activar o desactivar SLA
await slaService.toggleActivo(empresaId: string, activo: boolean)
```

---

## 🗂️ Mapeo de Endpoints

| Método Antiguo | Nuevo Método | Endpoint |
|---------------|-------------|----------|
| `getConfiguracion(empresaId)` | ❌ **Deprecado** → Usar `getResumen()` | `/api/sla/:empresaId/resumen` |
| `guardarSeccion(empresaId, 'alcance', data)` | `guardarAlcance(empresaId, data)` | `/api/sla/:empresaId/alcance` |
| `guardarSeccion(empresaId, 'tiempos', data)` | `guardarTiempos(empresaId, data)` | `/api/sla/:empresaId/tiempos` |
| `guardarSeccion(empresaId, 'horarios', data)` | `guardarHorarios(empresaId, data)` | `/api/sla/:empresaId/horarios` |
| `limpiarSeccion()` | ❌ **NO SOPORTADO** | N/A |
| `limpiarSecciones()` | ❌ **NO SOPORTADO** | N/A |

---

## ⚠️ Métodos Deprecados

Los siguientes métodos están marcados como **deprecados** pero siguen disponibles temporalmente:

```typescript
// ❌ NO USAR - Mantienen compatibilidad temporal
slaService.getConfiguracion(empresaId)      // → Usar getResumen()
slaService.guardarSeccion(...)              // → Usar métodos específicos
slaService.limpiarSeccion(...)              // → No soportado
slaService.limpiarSecciones(...)            // → No soportado
getSLAByEmpresa(empresaId)                  // → Usar slaService.getResumen()
```

---

## 🔄 Guía de Migración

### Antes (Código Antiguo)

```typescript
// ❌ Antiguo sistema
const config = await slaService.getConfiguracion(empresaId);

await slaService.guardarSeccion(empresaId, 'alcance', {
  // ... datos
}, 'motivo');

await slaService.limpiarSeccion(empresaId, 'tiempos');
```

### Después (Código Nuevo)

```typescript
// ✅ Nuevo sistema

// 1. Obtener resumen general
const resumen = await slaService.getResumen(empresaId);

// 2. Obtener configuraciones específicas
const alcance = await slaService.getAlcance(empresaId);
const tiempos = await slaService.getTiempos(empresaId);
const horarios = await slaService.getHorarios(empresaId);

// 3. Guardar configuraciones
await slaService.guardarAlcance(empresaId, {
  tiposTicket: ['uuid-1', 'uuid-2'],  // ⚠️ Usar UUIDs, no IDs numéricos
  aplica_todos_servicios: true,
  aplica_todas_categorias: false,
  categorias: [1, 2, 3],
  aplica_todas_sedes: true,
  observaciones: 'Configuración inicial'
});

await slaService.guardarTiempos(empresaId, {
  tiempos: [
    {
      prioridad: 'CRITICA',
      tiempo_respuesta_minutos: 60,
      tiempo_resolucion_minutos: 240,
      escalamiento: true,
      tiempo_escalamiento_minutos: 60
    },
    // ... más prioridades
  ]
});

await slaService.guardarHorarios(empresaId, {
  horarios: [
    {
      day_of_week: 1,  // Lunes
      atiende: true,
      hora_inicio: '08:00:00',
      hora_fin: '18:00:00',
      es_feriado: false
    },
    // ... más días
  ]
});

// 4. Activar/Desactivar SLA
await slaService.toggleActivo(empresaId, true);
```

---

## 🛠️ Cambios en Componentes

### Formularios a Actualizar

1. **AlcanceSLAForm.tsx**
   - ✅ Actualizar para enviar `tiposTicket` como UUID[]
   - ✅ Usar `guardarAlcance()` en lugar de `guardarSeccion()`
   - ⚠️ Mapear IDs de tipos de ticket a UUIDs antes de guardar

2. **GestionTiemposForm.tsx**
   - ✅ Convertir tiempos de formato "1 hora" a minutos (número)
   - ✅ Usar prioridades: `CRITICA`, `ALTA`, `MEDIA`, `BAJA`
   - ✅ Validar escalamiento

3. **GestionHorariosForm.tsx**
   - ✅ Usar formato de hora `HH:MM:SS`
   - ✅ day_of_week como número (0-6)

---

## 📝 Tareas Pendientes

- [ ] Actualizar `EmpresaDetailPage.tsx` para usar `getResumen()` en carga inicial
- [ ] Modificar `AlcanceSLAForm` para obtener y enviar UUIDs de tipos de ticket
- [ ] Actualizar `GestionTiemposForm` para convertir tiempos a minutos
- [ ] Verificar que `GestionHorariosForm` use formato correcto
- [ ] Actualizar `CreateTicketModal` para verificar SLA con `getResumen()`
- [ ] Revisar todos los lugares que llaman a `getSLAByEmpresa()` y migrarlos
- [ ] Eliminar llamadas a `limpiarSeccion()` o reemplazar con lógica alternativa

---

## 🐛 Problemas Conocidos

1. **UUIDs vs IDs:** Los tipos de ticket ahora usan UUID. El componente debe mapear correctamente.
2. **Historial:** El endpoint de historial puede seguir funcionando, pero verificarlo con backend.
3. **Motivos de edición:** El nuevo sistema no tiene endpoint de `registrarEdicion()` separado.

---

## 📞 Soporte

Si encuentras problemas durante la migración, consulta:
- Documentación del backend
- Archivo `slaService.ts` para tipos y ejemplos
- Logs de consola (los métodos deprecated muestran warnings)

---

**Última actualización:** 8 de febrero de 2026

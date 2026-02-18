# Mensaje para el Equipo de Backend - Funcionalidad de Visitas Presenciales

## 📋 Resumen del Requerimiento

Se ha implementado en el frontend la funcionalidad para convertir tickets remotos a presenciales mediante la creación de visitas programadas. El backend necesita implementar la lógica correspondiente para que ambos sistemas funcionen correctamente.

---

## 🎯 Flujo Completo del Proceso

### 1. **Desde el Detalle del Ticket (Estado: EN_PROCESO)**

#### Frontend:
- **Ubicación**: Módulo de Tickets → Ver Detalle
- **Condición**: El ticket debe estar en estado `EN_PROCESO` y modalidad `REMOTO`
- **Acción**: Aparece un botón **"Pasar a Presencial"**
- **Al hacer click**: Se abre el formulario de nueva visita con campos prellenados:
  - **Sede**: La sede del ticket
  - **Tipo Visita**: `POR_TICKET` (automático)
  - **Ticket**: El código del ticket actual (prellenado y bloqueado)

#### Backend Requerido:
**Cuando se crea la visita desde un ticket EN_PROCESO:**

```
POST /api/visitas
```

**Payload esperado:**
```json
{
  "empresaId": "...",
  "contratoId": "...",
  "sedeId": "...",
  "tipoVisita": "POR_TICKET",
  "ticketId": "...",
  "fechaProgramada": "YYYY-MM-DD",
  "tecnicosAsignados": [...],
  "mes": "MM",
  "anio": "YYYY",
  "observaciones": "..."
}
```

**Lógica Backend Requerida:**

1. **Al crear la visita exitosamente, automáticamente hacer:**
   
   a) **FINALIZAR/TERMINAR el SLA del ticket:**
   - ⚠️ **NO es pausar, es FINALIZAR el SLA**
   - El SLA se da por terminado y solo queda registro histórico
   - Guardar el tiempo que transcurrió hasta ese momento
   - Calcular si estuvo EN_TIEMPO o FUERA_DE_TIEMPO
   - El campo `aplica_sla` debe cambiar a `false`
   - El frontend NO debe seguir mostrando las barritas de progreso del SLA

   b) **Actualizar el estado del ticket:**
   - Cambiar de `EN_PROCESO` → `PROGRAMADO`

   c) **Actualizar la modalidad del ticket:**
   - Cambiar de `REMOTO` → `PRESENCIAL`

2. **Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "visita": { ... },
    "ticket": {
      "id": "...",
      "estado": "PROGRAMADO",
      "modalidad": "PRESENCIAL",
      "aplica_sla": false,
      "estado_sla_final": "EN_TIEMPO",
      "tiempo_sla_registrado_minutos": 45,
      "fecha_cambio_a_presencial": "..."
    }
  },
  "message": "Visita creada y ticket actualizado a modo presencial"
}
```

---

### 2. **En el Módulo de Visitas (Tabla de Visitas)**

#### Frontend:
- **Ubicación**: Módulo de Visitas → Vista de Tabla
- **Condición**: La visita debe estar en estado `PROGRAMADA`
- **Acción día programado**: El día de la fecha programada (o después), aparece el botón **"Iniciar atención"**
  - **Antes del día**: Solo muestra texto "Programada" (botón deshabilitado)
  - **El día o después**: Botón habilitado "Iniciar atención" con ícono de play

#### Backend Requerido:
**Cuando se inicia la atención de una visita:**

```
PATCH /api/visitas/{visitaId}
```

**Payload:**
```json
{
  "estado": "EN_PROCESO"
}
```

**⚠️ IMPORTANTE - Lógica Backend Requerida:**

**SI la visita está asociada a un ticket (tipoVisita === 'POR_TICKET'):**

1. **El SLA ya NO existe para este ticket**
   - El SLA se finalizó cuando se creó la visita presencial
   - NO calcular ni mostrar SLA en ningún momento
   - NO mostrar barras de progreso de tiempo de respuesta ni resolución
   - Solo existe el registro histórico del SLA de la fase remota
   - El ticket permanece con `aplica_sla: false`

2. **El estado del ticket cambia de `PROGRAMADO` → `EN_PROCESO`**
   - El ticket vuelve a EN_PROCESO pero sin SLA
   - Modalidad sigue siendo `PRESENCIAL`

3. **Solo cuando la visita se finaliza (estado → `FINALIZADA`):**
   - Cambiar el estado del ticket a `RESUELTO`
   - Registrar el tiempo total de atención (tiempo remoto registrado + tiempo presencial)

**Respuesta esperada al iniciar atención:**
```json
{
  "success": true,
  "data": {
    "visita": {
      "id": "...",
      "estado": "EN_PROCESO",
      "fecha_inicio_atencion": "...",
      "ticketId": "..."
    },
    "ticket": {
      "id": "...",
      "estado": "EN_PROCESO",
      "modalidad": "PRESENCIAL",
      "aplica_sla": false,
      "estado_sla_final": "EN_TIEMPO"
    }
  },
  "message": "Atención presencial iniciada"
}
```

---

### 3. **Al Finalizar la Visita**

#### Frontend:
- **Acción**: Desde la visita EN_CURSO, botón "Finalizar visita"
- Se abre un modal para registrar observaciones/informe

#### Backend Requerido:
```
PATCH /api/visitas/{visitaId}/finalizar
```

**Payload:**
```json
{
  "observaciones": "...",
  "informeFinal": "...",
  "estado": "FINALIZADA"
}
```

**Lógica Backend Requerida:**

1. **Marcar la visita como finalizada**
2. **Si tiene ticket asociado:**
   - Cambiar estado del ticket a `RESUELTO`
   - Registrar resumen de la solución
   - Calcular tiempo total de atención (tiempo SLA fase remota + tiempo presencial real)
   - El ticket ya tiene `aplica_sla: false` desde que pasó a presencial
   - Solo queda el registro histórico del SLA de la fase remota

---

## 📊 Cambios en el Modelo de Datos

### Tabla `tickets`:
```sql
-- Agregar o verificar estos campos:
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS modalidad VARCHAR(20) DEFAULT 'REMOTO';
  -- Valores posibles: 'REMOTO', 'PRESENCIAL'

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS fecha_cambio_a_presencial TIMESTAMP;
  -- Fecha en que se convirtió a presencial

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS visita_asociada_id VARCHAR(50);
  -- ID de la visita creada para este ticket

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS estado_sla_final VARCHAR(20);
  -- Estado final del SLA cuando se finalizó (EN_TIEMPO, FUERA_DE_TIEMPO)

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS tiempo_sla_registrado_minutos INTEGER;
  -- Tiempo de SLA registrado antes de pasar a presencial

-- Agregar estado 'PROGRAMADO' si no existe
-- Estados: ESPERA, EN_TRIAGE, ABIERTO, EN_PROCESO, PROGRAMADO, RESUELTO, CERRADO, CANCELADO
```

### Tabla `visitas`:
```sql
-- Verificar que exista la relación con tickets
ALTER TABLE visitas ADD COLUMN IF NOT EXISTS ticket_id VARCHAR(50);
  -- ID del ticket asociado (solo si tipoVisita === 'POR_TICKET')

-- Estados de visita:
-- PENDIENTE_PROGRAMACION, PROGRAMADA, EN_PROCESO, FINALIZADA, CANCELADA
```

---

## 🔄 Endpoints Necesarios

### 1. Crear Visita desde Ticket
```
POST /api/visitas
```
- **Debe detectar** si viene con `ticketId` y `tipoVisita === 'POR_TICKET'`
- **Debe ejecutar** las actualizaciones automáticas del ticket

### 2. Iniciar Atención de Visita
```
PATCH /api/visitas/{visitaId}
{ "estado": "EN_PROCESO" }
```
- **Debe verificar** si la visita tiene ticket asociado
- **Debe actualizar** el ticket de PROGRAMADO a EN_PROCESO
- El SLA ya no existe (se finalizó al crear la visita)

### 3. Finalizar Visita
```
PATCH /api/visitas/{visitaId}/finalizar
```
- **Debe actualizar** el ticket asociado a `RESUELTO`

---

## ✅ Checklist de Implementación Backend

- [ ] Endpoint POST /api/visitas detecta tickets EN_PROCESO y actualiza estado a PROGRAMADO
- [ ] Endpoint POST /api/visitas actualiza modalidad de REMOTO a PRESENCIAL
- [ ] Al crear visita desde ticket, se FINALIZA el SLA (no pausar, TERMINAR)
- [ ] Se guarda estado_sla_final (EN_TIEMPO o FUERA_DE_TIEMPO) al finalizar SLA
- [ ] Se guarda tiempo_sla_registrado_minutos con el tiempo transcurrido
- [ ] Campo `aplica_sla` se setea a `false` cuando el ticket pasa a presencial
- [ ] Endpoint PATCH /api/visitas/{id} cambia visita a EN_PROCESO
- [ ] Al iniciar visita EN_PROCESO, el ticket cambia de PROGRAMADO a EN_PROCESO
- [ ] El ticket EN_PROCESO presencial NO tiene SLA (aplica_sla = false)
- [ ] Al finalizar visita, el ticket cambia a RESUELTO
- [ ] Se registra `fecha_cambio_a_presencial` en el ticket
- [ ] Se guarda `visita_asociada_id` en el ticket
- [ ] Respuestas JSON incluyen tanto la visita como el ticket actualizado

---

## 🧪 Casos de Prueba Sugeridos

1. **Crear visita desde ticket EN_PROCESO:**
   - Verificar que el ticket cambia a PROGRAMADO
   - Verificar que modalidad cambia a PRESENCIAL
   - Verificar que el SLA se FINALIZA (aplica_sla = false)
   - Verificar que se guarda estado_sla_final y tiempo_sla_registrado_minutos

2. **Iniciar atención el día programado:**
   - Verificar que la visita pasa a EN_PROCESO
   - Verificar que el ticket pasa de PROGRAMADO a EN_PROCESO
   - Verificar que NO se muestra SLA en el frontend (aplica_sla = false)

3. **Finalizar visita:**
   - Verificar que la visita pasa a FINALIZADA
   - Verificar que el ticket pasa a RESUELTO
   - Verificar que se registran los tiempos correctamente

---

## 📞 Contacto

Si tienen dudas o necesitan más información sobre algún punto específico, por favor contactar al equipo de frontend.

**Fecha de implementación frontend:** Febrero 17, 2026
**Prioridad:** Alta
**Módulos afectados:** Tickets, Visitas

---

## 🔍 ACLARACIÓN IMPORTANTE SOBRE LA IMPLEMENTACIÓN

### ✅ IMPLEMENTACIÓN BACKEND COMPLETADA Y VALIDADA (v2.0)

**Fecha de confirmación:** 17 de febrero de 2026  
**Estado:** ✅ 100% COMPLETADO - Backend y Frontend alineados

1. **Migración de BD (146_add_presencial_fields_tickets.sql)**: ✅ COMPLETADO
   - Campo `modalidad` (REMOTO/PRESENCIAL)
   - Campo `estado_sla_final` (EN_TIEMPO/FUERA_DE_TIEMPO)
   - Campo `tiempo_sla_registrado_minutos`
   - Campo `fecha_cambio_a_presencial`
   - Campo `visita_asociada_id`
   - Estado `PROGRAMADO` agregado

2. **Creación de visita (POST /api/visitas)**: ✅ COMPLETADO
   - Actualiza ticket a PROGRAMADO + PRESENCIAL
   - **FINALIZA el SLA** (no pausa)
   - Guarda `estado_sla_final` y `tiempo_sla_registrado_minutos`
   - Setea `aplica_sla = false`

3. **Iniciar atención (PATCH /api/visitas/:id)**: ✅ COMPLETADO
   - La visita pasa de PROGRAMADA a **EN_PROCESO**
   - El ticket pasa de PROGRAMADO a **EN_PROCESO**
   - SLA permanece finalizado (`aplica_sla = false`)

4. **Finalizar visita (PATCH /api/visitas/:id/finalizar)**: ✅ COMPLETADO
   - Ticket pasa a RESUELTO
   - Calcula tiempo total (SLA remoto + tiempo presencial)

5. **Calculadora SLA**: ✅ COMPLETADO
   - Excluye tickets con `aplica_sla = false`
   - Devuelve `NO_APLICA` para presenciales

### ⚠️ IMPORTANTE - Verificación del Endpoint de Iniciar Atención:

**El frontend está llamando a:**
```javascript
PATCH /api/visitas/{visitaId}
Body: { "estado": "EN_PROCESO" }
```

**Verificar que el endpoint NO sea:**
```
PATCH /api/visitas/:id/estado → EN_PROCESO  // ❌ Esto es incorrecto
```

**Debe ser:**
```
PATCH /api/visitas/:id
Body: { "estado": "EN_PROCESO" }  // ✅ Esto es correcto
```

### 📋 Frontend Endpoints Esperados:

```javascript
// Desde: VisitasTableView.tsx
actualizarVisita(visita._id, { estado: 'EN_PROCESO' })

// Esto se traduce a:
PATCH /api/visitas/{visitaId}
Content-Type: application/json
Body: { "estado": "EN_PROCESO" }
```

### ⚠️ Si el backend implementó `/api/visitas/:id/estado`:

Por favor ajustar a `/api/visitas/:id` con el estado en el body, O comunicarnos para ajustar el frontend al endpoint que prefieran.

### 🔄 Confirmación de Comportamiento Requerido:

**Cuando se hace PATCH /api/visitas/{visitaId} con { "estado": "EN_PROCESO" }:**

1. ✅ La visita cambia a estado `EN_PROCESO`
2. ✅ Si la visita tiene `ticketId` (tipoVisita === 'POR_TICKET'):
   - El ticket cambia de `PROGRAMADO` a `EN_PROCESO`
   - El SLA NO corre (ya se finalizó al crear la visita)
   - Campo `aplica_sla` = `false` (ya estaba así desde que pasó a presencial)
   - Solo existe el registro histórico del SLA de la fase remota

3. ✅ Respuesta esperada:
```json
{
  "success": true,
  "data": {
    "visita": {
      "id": "...",
      "estado": "EN_PROCESO",
      "fecha_inicio_atencion": "2026-02-20T09:00:00Z",
      "ticketId": "123"
    },
    "ticket": {
      "id": "123",
      "estado": "EN_PROCESO",  // ← Cambia de PROGRAMADO a EN_PROCESO
      "modalidad": "PRESENCIAL",
      "aplica_sla": false,
      "estado_sla_final": "EN_TIEMPO"
    }
  }
}
```

### 🎯 Resumen de Estados del Ticket en el Flujo:

```
1. Inicio: EN_PROCESO + REMOTO (con SLA corriendo)
     ↓ POST /api/visitas con ticketId
2. Programado: PROGRAMADO + PRESENCIAL (SLA FINALIZADO, aplica_sla=false) ←
     ↓ PATCH /api/visitas/{id} → EN_PROCESO
3. En Proceso Presencial: EN_PROCESO + PRESENCIAL (sin SLA) ←
     ↓ PATCH /api/visitas/{id}/finalizar
4. Resuelto: RESUELTO + PRESENCIAL (sin SLA)
```

**El ticket pasa de PROGRAMADO a EN_PROCESO cuando se inicia la visita.**
**El SLA se finalizó al crear la visita - solo queda registro histórico.**
**Desde que es PRESENCIAL, ya no aplica SLA (aplica_sla = false).**

---

## 🎨 Comportamiento Visual Frontend (Referencia)

### En Ticket Detail (estado EN_PROCESO + REMOTO):
```
┌─────────────────────────────────────────────┐
│  Ticket #TKT-001                            │
│  Estado: EN_PROCESO │ Modalidad: REMOTO     │
│                                             │
│  [Culminar ticket] [Pasar a Presencial] ← NUEVO
└─────────────────────────────────────────────┘
```

### Después de crear visita:
```
┌─────────────────────────────────────────────┐
│  Ticket #TKT-001                            │
│  Estado: PROGRAMADO │ Modalidad: PRESENCIAL │
│                                             │
│  ⚠️ SLA FINALIZADO (registro: 45 min - EN_TIEMPO)
│  Sin barras de progreso                     │
└─────────────────────────────────────────────┘
```

### En tabla de visitas (día programado):
```
┌────────────────────────────────────────────────┐
│ Fecha      │ Tipo       │ Estado    │ Acciones│
├────────────────────────────────────────────────┤
│ 2026-02-20 │ POR_TICKET │ PROGRAMADA│ [▶ Iniciar atención] ← NUEVO (solo ese día)
└────────────────────────────────────────────────┘
```

### Antes del día programado:
```
┌────────────────────────────────────────────────┐
│ Fecha      │ Tipo       │ Estado    │ Acciones│
├────────────────────────────────────────────────┤
│ 2026-02-25 │ POR_TICKET │ PROGRAMADA│ Programada (texto gris)
└────────────────────────────────────────────────┘
```

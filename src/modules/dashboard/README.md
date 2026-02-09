# Dashboard Module

Dashboard profesional con estadísticas y gráficos en tiempo real del sistema INTISCORP.

## 🎨 Características

### Indicadores Principales
- **Equipos Totales**: Número total de equipos en inventario
- **Empresas**: Cantidad de empresas cliente
- **Tickets**: Total de tickets de soporte
- **Activos Recientes**: Últimos equipos registrados

### Gráficos Estadísticos

#### 1. Tendencia de Equipos (Línea de Área)
- Muestra equipos agregados en los últimos 12 meses
- Visualiza tendencias de crecimiento del inventario

#### 2. Distribución por Categoría (Dona)
- Top 4 categorías de equipos
- Proporción de cada tipo (Cámaras, Servidores, Switches, etc.)

#### 3. Estados de Tickets (Dona)
- Distribución de tickets por estado
- Monitoreo de carga de trabajo

#### 4. Inventario por Ubicación (Barras)
- Top 5 sedes con más equipos
- Comparación de distribución geográfica

#### 5. Activos Recientes (Lista)
- Últimos 5 equipos registrados
- Información de tag, categoría y fecha

## 📁 Estructura

```
dashboard/
├── components/
│   └── Charts.tsx          # Componentes reutilizables de gráficos
├── pages/
│   └── Dashboard.tsx       # Página principal del dashboard
├── services/
│   └── dashboardService.ts # Servicio de datos y estadísticas
└── README.md              # Esta documentación
```

## 🔧 Tecnologías

- **Chart.js + react-chartjs-2**: Librería de gráficos
- **Lucide React**: Iconos modernos
- **Tailwind CSS**: Estilos y gradientes
- **TypeScript**: Tipado fuerte

## 🚀 Uso

El dashboard se carga automáticamente al acceder al módulo. Los datos se obtienen desde:
- `/api/empresas/` - Listado de empresas
- `/api/empresas/{id}/inventario` - Inventario por empresa
- `/api/tickets/gestion/lista` - Listado de tickets

## 🎯 Componentes Reutilizables

### AreaLineChart
```tsx
<Charts.AreaLineChart 
  labels={months} 
  data={values} 
  label="Descripción" 
/>
```

### CategoryDoughnut
```tsx
<Charts.CategoryDoughnut 
  labels={categories} 
  values={counts} 
/>
```

### VerticalBar
```tsx
<Charts.VerticalBar 
  labels={locations} 
  values={counts} 
  label="Equipos" 
/>
```

## 📊 Estadísticas Calculadas

- **Equipos por mes**: Agrupación automática por fecha de creación
- **Categorías**: Top 4 más frecuentes
- **Ubicaciones**: Top 5 sedes
- **Estados de tickets**: Distribución completa
- **Activos recientes**: Ordenados por fecha descendente

## 🔄 Actualización de Datos

Los datos se cargan al montar el componente. Para refrescar:
- Recargar la página
- El estado se gestiona con React hooks (`useState`, `useEffect`)

## 🎨 Diseño Visual

- **Gradientes**: Cada tarjeta tiene un gradiente sutil de color
- **Iconos contextuales**: Lucide React para mejor UX
- **Bordes de color**: Identificación visual rápida
- **Sombras suaves**: Efecto hover en las tarjetas
- **Responsive**: Grid adaptativo para todos los dispositivos

## 💡 Extensiones Futuras

- Filtros por fechas personalizadas
- Exportación a PDF/Excel
- Comparativas temporales
- Alertas y notificaciones
- Dashboard por rol de usuario

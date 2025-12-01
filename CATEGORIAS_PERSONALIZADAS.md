# Categorías Personalizadas - Documentación

## Cambios Implementados

### 1. Vista de Interfaz Completa (No Pop-up)
- **Antes**: Los paneles de áreas y categorías se mostraban como modales emergentes
- **Ahora**: Se muestran como vistas completas que reemplazan temporalmente el inventario
- Los botones "Visualizar áreas" y "Visualizar categorías" cambian la vista principal
- Cada vista tiene un botón "← Volver al inventario" para regresar

### 2. Sistema de Categorías con Campos Personalizados

#### Crear una Categoría con Campos Personalizados
1. Click en "Visualizar categorías"
2. Click en "+ Añadir categoría"
3. Completa:
   - **Nombre de categoría**: Ej: "Laptop", "Monitor", "Impresora"
   - **Subcategorías** (opcional): Separadas por coma
   - **Campos personalizados**: Define los campos que aparecerán en el formulario de registro

#### Tipos de Campos Disponibles
- **Texto**: Para valores de texto libre (ej: Procesador, Modelo)
- **Número**: Para valores numéricos (ej: Cantidad de puertos, Velocidad)
- **Texto largo**: Para descripciones extensas (ej: Especificaciones adicionales)
- **Selección**: Lista desplegable con opciones predefinidas (ej: Intel/AMD/Apple)

#### Configuración de Campos
Para cada campo puedes definir:
- **Nombre del campo**: Lo que el usuario verá en el formulario
- **Tipo de dato**: text, number, textarea, select
- **Requerido**: Si es obligatorio completarlo (marcado con *)
- **Opciones**: Si es tipo "selección", define las opciones separadas por coma

### 3. Ejemplo: Categoría "Laptop"

```
Nombre: Laptop
Subcategorías: Gaming, Ultrabook, Workstation

Campos personalizados:
1. Procesador (CPU) - Tipo: select - Requerido: Sí
   Opciones: Intel, AMD, Apple
   
2. Serie CPU - Tipo: text - Requerido: Sí

3. Memoria RAM - Tipo: text - Requerido: Sí
   
4. Almacenamiento - Tipo: text - Requerido: Sí

5. GPU Integrada - Tipo: text - Requerido: No

6. GPU Dedicada - Tipo: text - Requerido: No
```

### 4. Flujo de Uso

#### Paso 1: Crear Categoría
1. Ir a "Visualizar categorías"
2. Click "+ Añadir categoría"
3. Llenar formulario con campos personalizados
4. Click "Previsualizar" para revisar
5. Click "Confirmar y crear"

#### Paso 2: Registrar Activo
1. Click "+ Registrar activo"
2. Seleccionar la categoría creada
3. Los campos personalizados aparecerán automáticamente en el formulario
4. Completar todos los campos requeridos (marcados con *)
5. Guardar el activo

### 5. Almacenamiento de Datos

Los campos personalizados se guardan en el objeto del activo bajo la propiedad `camposPersonalizados`:

```json
{
  "assetId": "LAP-001",
  "categoria": "Laptop",
  "fabricante": "Dell",
  "modelo": "XPS 15",
  "camposPersonalizados": {
    "Procesador (CPU)": "Intel",
    "Serie CPU": "i7-12700H",
    "Memoria RAM": "32GB DDR5",
    "Almacenamiento": "1TB NVMe",
    "GPU Dedicada": "NVIDIA RTX 3050 Ti"
  }
}
```

### 6. Visualización de Categorías

En la tabla de categorías se muestra:
- Nombre de la categoría
- Subcategorías (separadas por coma)
- Campos personalizados con:
  - Nombre del campo
  - Tipo de dato
  - Indicador si es requerido (*)

### 7. Compatibilidad

- Las categorías hardcoded (Laptop, PC, Servidor) siguen funcionando con sus campos originales
- Las nuevas categorías personalizadas se agregan dinámicamente
- Si no hay categorías personalizadas, se muestran las categorías por defecto

## Ventajas del Sistema

1. **Flexibilidad**: Cada empresa puede definir sus propias categorías y campos
2. **Escalabilidad**: No requiere cambios en el código para agregar nuevas categorías
3. **Validación**: Los campos requeridos garantizan la captura de datos importantes
4. **Organización**: Las categorías ayudan a estructurar mejor el inventario
5. **Usabilidad**: Interfaz completa sin distracciones de modales

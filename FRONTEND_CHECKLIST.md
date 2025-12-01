# Checklist Frontend - Sistema de Categorías

## ✅ Acciones Rápidas

### 1. Verificar Respuesta del Backend
```javascript
// Abrir DevTools → Network → ver GET /api/categorias
// Opción A: Backend devuelve array directo
[{ _id: "...", nombre: "Laptop", campos: [...] }]

// Opción B: Backend devuelve objeto con data
{ ok: true, data: [{ _id: "...", nombre: "Laptop" }] }
```

### 2. Ajustar el Servicio según Respuesta

**Si backend devuelve array directo:**
```typescript
// src/modules/inventario/services/categoriasService.ts
export const getCategorias = async (): Promise<Category[]> => {
  const response = await axiosClient.get('/api/categorias');
  return response.data; // ✅ Ya es el array
};
```

**Si backend devuelve { ok, data }:**
```typescript
// src/modules/inventario/services/categoriasService.ts
export const getCategorias = async (): Promise<Category[]> => {
  const response = await axiosClient.get('/api/categorias');
  return response.data.data; // ✅ Extraer el array interno
};
```

### 3. Proteger el .map en el Componente

```typescript
// Ya está protegido en InventarioPage.tsx ✅
try {
  const cats = await getCategorias();
  setCategories(cats); // cats ya es el array correcto
} catch (catErr) {
  console.warn('Could not fetch categories:', catErr);
  setCategories([]); // ✅ Array vacío en caso de error
}
```

### 4. Token de Autenticación

```typescript
// Ya está configurado en axiosClient.ts ✅
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 5. Manejo de Errores al Crear Categoría

```typescript
// Ya está implementado en InventarioPage.tsx ✅
try {
  const created = await createCategoria({
    nombre: categoryPreview.nombre,
    subcategorias: categoryPreview.subcategorias,
    campos: categoryPreview.campos
  });
  setCategories(prev => [created, ...prev]);
  alert('Categoría creada exitosamente');
} catch (err) {
  console.error('Error al crear categoría:', err);
  alert('Error al crear la categoría. Por favor intenta de nuevo.');
}
```

## 🔍 Verificaciones Inmediatas

### Paso 1: Abrir DevTools
1. F12 → Pestaña **Network**
2. Ir a la página de inventario
3. Buscar la petición **GET /api/categorias**
4. Ver la respuesta JSON en la pestaña **Response**

### Paso 2: Identificar Formato de Respuesta

**Formato A - Array directo:**
```json
[
  {
    "_id": "673abc...",
    "nombre": "Laptop",
    "subcategorias": ["Gaming"],
    "campos": [...]
  }
]
```
➡️ **Acción:** El servicio ya está correcto, no cambiar nada.

**Formato B - Objeto con data:**
```json
{
  "ok": true,
  "data": [
    {
      "_id": "673abc...",
      "nombre": "Laptop",
      "campos": [...]
    }
  ]
}
```
➡️ **Acción:** Cambiar `return response.data;` a `return response.data.data;`

### Paso 3: Verificar Token

En la pestaña **Headers** de la petición, buscar:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ Si está presente → Todo bien
❌ Si no está → Verificar que el token existe en localStorage

### Paso 4: Probar Crear Categoría

1. Click en "Visualizar categorías"
2. Click en "+ Añadir categoría"
3. Llenar formulario básico
4. Click en "Previsualizar"
5. Click en "Confirmar y crear"
6. Verificar en Network que la petición **POST /api/categorias** se envió
7. Verificar que la respuesta es **201 Created**

## 🐛 Solución de Problemas Comunes

### Error: "categories.map is not a function"
```typescript
// Verificar que categories sea siempre un array
const [categories, setCategories] = useState<Category[]>([]);

// Al cargar, siempre asignar array
setCategories(Array.isArray(cats) ? cats : []);
```

### Error: 401 Unauthorized
```bash
# Verificar token en localStorage
localStorage.getItem('token')

# Si no hay token, hacer login primero
```

### Error: Network Error / CORS
```bash
# Verificar que el backend esté corriendo en puerto 4000
# Verificar CORS en backend:
app.use(cors({
  origin: 'http://localhost:5173', // puerto del frontend
  credentials: true
}));
```

### Backend devuelve { data: [...] } pero el frontend espera [...]
```typescript
// Opción 1: Cambiar el servicio
return response.data.data;

// Opción 2: Cambiar backend para devolver array directo
res.json(categorias); // no res.json({ data: categorias })
```

## 📋 Estado Actual del Frontend

### ✅ Implementado
- Servicio `categoriasService.ts` con tipos TypeScript
- Interceptor de axios para token automático
- Manejo de errores en todas las operaciones
- Protección contra arrays undefined/null
- Vista completa de categorías (no pop-up)
- Formulario de campos personalizados
- Preview antes de crear

### 🔄 Ajustar según Backend
- [ ] Verificar formato de respuesta (array vs objeto)
- [ ] Ajustar `getCategorias()` si es necesario
- [ ] Confirmar que el backend está en puerto 4000
- [ ] Probar crear una categoría de prueba

## 🚀 Test Rápido (5 minutos)

```bash
# 1. Verificar backend corriendo
curl http://localhost:4000/api/categorias

# 2. Si requiere auth, agregar token
curl -H "Authorization: Bearer TU_TOKEN" http://localhost:4000/api/categorias

# 3. Crear categoría de prueba
curl -X POST http://localhost:4000/api/categorias \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test",
    "subcategorias": ["Sub1"],
    "campos": [{"nombre": "Campo1", "tipo": "text", "requerido": false}]
  }'
```

Si estos comandos funcionan → El backend está OK
Si fallan → Revisar configuración del backend

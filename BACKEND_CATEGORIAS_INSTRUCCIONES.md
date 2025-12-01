# Instrucciones para el Backend - Sistema de Categorías Personalizadas

## 1. Modelo de Base de Datos (MongoDB/Mongoose)

```javascript
// models/Categoria.js
const mongoose = require('mongoose');

const categoryFieldSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  tipo: {
    type: String,
    enum: ['text', 'number', 'select', 'textarea'],
    required: true
  },
  opciones: [{
    type: String
  }],
  requerido: {
    type: Boolean,
    default: false
  }
});

const categoriaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  subcategorias: [{
    type: String,
    trim: true
  }],
  campos: [categoryFieldSchema],
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    // Opcional: si quieres categorías por empresa
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Categoria', categoriaSchema);
```

## 2. Rutas del API

```javascript
// routes/categorias.js
const express = require('express');
const router = express.Router();
const { 
  getCategorias, 
  createCategoria, 
  updateCategoria, 
  deleteCategoria 
} = require('../controllers/categoriasController');
const { authenticate } = require('../middleware/auth'); // Tu middleware de auth

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/categorias - Obtener todas las categorías
router.get('/', getCategorias);

// POST /api/categorias - Crear nueva categoría
router.post('/', createCategoria);

// PUT /api/categorias/:id - Actualizar categoría
router.put('/:id', updateCategoria);

// DELETE /api/categorias/:id - Eliminar categoría
router.delete('/:id', deleteCategoria);

module.exports = router;
```

## 3. Controlador

```javascript
// controllers/categoriasController.js
const Categoria = require('../models/Categoria');

// GET /api/categorias
exports.getCategorias = async (req, res) => {
  try {
    const categorias = await Categoria.find().sort({ nombre: 1 });
    
    // OPCIÓN A: Devolver array directo (RECOMENDADO para frontend actual)
    res.json(categorias);
    
    // OPCIÓN B: Si prefieres devolver { ok, data }
    // res.json({ ok: true, data: categorias });
    
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ message: 'Error al obtener categorías' });
  }
};

// POST /api/categorias
exports.createCategoria = async (req, res) => {
  try {
    const { nombre, subcategorias, campos } = req.body;

    // LOG para debug - verificar que campos llega correctamente
    console.log('Received campos:', JSON.stringify(campos, null, 2));

    // Validar que el nombre no exista
    const existente = await Categoria.findOne({ nombre });
    if (existente) {
      return res.status(400).json({ message: 'Ya existe una categoría con ese nombre' });
    }

    // Crear nueva categoría
    const nuevaCategoria = new Categoria({
      nombre,
      subcategorias: subcategorias || [],
      campos: campos || []
    });

    await nuevaCategoria.save();
    
    // LOG para verificar que se guardó correctamente
    console.log('Saved category:', JSON.stringify(nuevaCategoria, null, 2));
    
    // OPCIÓN A: Devolver objeto directo (RECOMENDADO para frontend actual)
    res.status(201).json(nuevaCategoria);
    
    // OPCIÓN B: Si prefieres devolver { ok, data } (frontend ya soporta ambos)
    // res.status(201).json({ ok: true, data: nuevaCategoria });
    
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ message: 'Error al crear categoría' });
  }
};

// PUT /api/categorias/:id
exports.updateCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, subcategorias, campos } = req.body;

    const categoria = await Categoria.findByIdAndUpdate(
      id,
      { nombre, subcategorias, campos },
      { new: true, runValidators: true }
    );

    if (!categoria) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    res.json(categoria);
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({ message: 'Error al actualizar categoría' });
  }
};

// DELETE /api/categorias/:id
exports.deleteCategoria = async (req, res) => {
  try {
    const { id } = req.params;

    const categoria = await Categoria.findByIdAndDelete(id);

    if (!categoria) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    res.json({ message: 'Categoría eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ message: 'Error al eliminar categoría' });
  }
};
```

## 4. Registrar las rutas en tu app principal

```javascript
// app.js o server.js
const categoriasRoutes = require('./routes/categorias');

// ... otras configuraciones

app.use('/api/categorias', categoriasRoutes);
```

## 5. Actualizar el Modelo de Activos (Opcional pero recomendado)

```javascript
// models/Activo.js
const activoSchema = new mongoose.Schema({
  // ... campos existentes
  categoria: {
    type: String,
    required: true
  },
  camposPersonalizados: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
  // ... resto de campos
});
```

## 6. Probar los endpoints

### Crear una categoría (POST /api/categorias)
```json
{
  "nombre": "Laptop",
  "subcategorias": ["Gaming", "Ultrabook", "Workstation"],
  "campos": [
    {
      "nombre": "Procesador (CPU)",
      "tipo": "select",
      "opciones": ["Intel", "AMD", "Apple"],
      "requerido": true
    },
    {
      "nombre": "Serie CPU",
      "tipo": "text",
      "requerido": true
    },
    {
      "nombre": "Memoria RAM",
      "tipo": "text",
      "requerido": true
    },
    {
      "nombre": "Almacenamiento",
      "tipo": "text",
      "requerido": true
    },
    {
      "nombre": "GPU Integrada",
      "tipo": "text",
      "requerido": false
    },
    {
      "nombre": "GPU Dedicada",
      "tipo": "text",
      "requerido": false
    }
  ]
}
```

## 7. Estructura de Respuesta Esperada

### GET /api/categorias
```json
[
  {
    "_id": "673a1234567890abcdef1234",
    "nombre": "Laptop",
    "subcategorias": ["Gaming", "Ultrabook"],
    "campos": [
      {
        "nombre": "Procesador (CPU)",
        "tipo": "select",
        "opciones": ["Intel", "AMD", "Apple"],
        "requerido": true
      }
    ],
    "createdAt": "2025-11-17T12:00:00.000Z",
    "updatedAt": "2025-11-17T12:00:00.000Z"
  }
]
```

## 8. Verificación

Una vez implementado, verifica:
1. ✅ El endpoint GET `/api/categorias` devuelve un array vacío o con categorías
2. ✅ Puedes crear una categoría con POST `/api/categorias`
3. ✅ El frontend carga las categorías al entrar a inventario
4. ✅ Al crear una categoría en el frontend, se guarda en la BD
5. ✅ Los campos personalizados aparecen en el formulario de registro

## Notas Importantes

- Asegúrate de tener CORS configurado para permitir peticiones desde el frontend
- El token JWT debe estar en el header Authorization: Bearer <token>
- El puerto del backend debe ser 4000 (según axiosClient.ts)
- Todas las rutas requieren autenticación

## 9. Solución al Problema Actual

**⚠️ PROBLEMA DETECTADO**: Tu backend está devolviendo `{ ok: true, data: {...} }` en lugar del objeto directo.

### Solución Rápida (sin cambiar backend):
✅ **El frontend ya fue actualizado** para soportar ambos formatos. Ya funciona con tu respuesta actual.

### Solución Recomendada (cambiar backend):
Si prefieres usar el formato estándar, cambia en el controlador:

```javascript
// ANTES (tu formato actual)
res.status(201).json({ ok: true, data: nuevaCategoria });

// DESPUÉS (formato estándar REST)
res.status(201).json(nuevaCategoria);
```

**Para GET:**
```javascript
// ANTES
res.json({ ok: true, data: categorias });

// DESPUÉS  
res.json(categorias);
```

### Verificar que los campos se guarden

1. Después de crear una categoría, verifica en MongoDB:
```javascript
db.categorias.find().pretty()
```

2. Deberías ver:
```json
{
  "_id": ObjectId("..."),
  "nombre": "TestLaptop",
  "subcategorias": ["Gaming"],
  "campos": [
    {
      "nombre": "Procesador",
      "tipo": "select",
      "opciones": ["Intel", "AMD"],
      "requerido": true
    }
  ],
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

3. Si el campo `campos` está vacío `[]`, el problema está en el modelo Mongoose o en cómo se recibe el body.

### Debug en Backend

Agrega estos logs en el controlador `createCategoria`:

```javascript
console.log('Request body:', req.body);
console.log('Campos received:', req.body.campos);
console.log('Categoria antes de guardar:', nuevaCategoria);
console.log('Categoria después de guardar:', nuevaCategoria.toObject());
```

Si `campos` llega vacío al backend, verifica el modelo Mongoose y que el frontend esté enviando correctamente el array.

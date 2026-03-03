import { useEffect, useState } from 'react';
import axiosClient from '@/api/axiosClient';

interface Grupo {
  id?: string;
  nombre: string;
  codigo?: string;
  descripcion?: string;
  activo?: boolean;
}

const generateGroupCode = (rawName: string): string => {
  if (!rawName) return '';
  const withoutAccents = rawName.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const cleaned = withoutAccents.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  const stopWords = new Set(['de','del','la','las','los','el','y','e','en','para','por','con','a','al']);
  const words = cleaned.split(/\s+/).map(w => w.toLowerCase()).filter(Boolean).filter(w => !stopWords.has(w));
  if (words.length === 0) return '';
  const take = (s: string, n: number) => s.substring(0, Math.min(n, s.length)).toUpperCase();
  let part1 = take(words[0], 4);
  let part2 = '';
  if (words.length >= 2) {
    part2 = take(words[1], 5);
  } else {
    const single = words[0];
    if (single.length <= 4) part1 = take(single, 4);
    else {
      part1 = take(single, 4);
      part2 = take(single.substring(4), 5);
    }
  }
  return part2 ? `${part1}-${part2}` : part1;
};

const GruposPage = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [activo, setActivo] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGrupos = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/api/gestion-grupos-categorias');
      let data: any = res.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (Array.isArray(data.data)) data = data.data;
        else if (Array.isArray(data.results)) data = data.results;
      }
      if (!Array.isArray(data)) data = [];
      setGrupos(data.map((g: any) => ({ id: String(g.id ?? g._id ?? g.uuid ?? ''), nombre: g.nombre, codigo: g.codigo, descripcion: g.descripcion, activo: g.activo })));
    } catch (err) {
      console.error('Error fetching grupos', err);
      setGrupos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGrupos(); }, []);

  const openNew = () => {
    setEditingId(null);
    setNombre('');
    setCodigo('');
    setDescripcion('');
    setActivo(true);
    setShowModal(true);
  };

  const openEdit = (g: Grupo) => {
    setEditingId(g.id ?? null);
    setNombre(g.nombre);
    setCodigo(g.codigo || generateGroupCode(g.nombre));
    setDescripcion(g.descripcion || '');
    setActivo(g.activo ?? true);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = { nombre: nombre.trim(), codigo: codigo || undefined, descripcion, activo } as any;
      if (editingId) {
        const res = await axiosClient.put(`/api/gestion-grupos-categorias/${editingId}`, payload);
        // update
        setGrupos(prev => prev.map(p => p.id === editingId ? { ...p, ...res.data } : p));
      } else {
        const res = await axiosClient.post('/api/gestion-grupos-categorias', payload);
        const created = res.data && res.data.data ? res.data.data : res.data;
        setGrupos(prev => [created, ...prev]);
      }
      setShowModal(false);
    } catch (err: any) {
      console.error('Error saving grupo', err);
      setError(err?.response?.data?.message || err?.message || 'Error al guardar');
    }
  };

  

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Grupos de Activos</h2>
          <div className="flex items-center gap-2">
            <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded">Añadir grupo</button>
            <button onClick={fetchGrupos} className="px-3 py-2 border rounded">Refrescar</button>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          {loading ? (
            <p>Cargando...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="py-2">Nombre</th>
                  <th className="py-2">Código</th>
                  <th className="py-2">Descripción</th>
                  <th className="py-2">Activo</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map(g => (
                  <tr key={g.id} className="border-t">
                    <td className="py-2">{g.nombre}</td>
                    <td className="py-2">{g.codigo}</td>
                    <td className="py-2">{g.descripcion}</td>
                    <td className="py-2">{g.activo ? 'Sí' : 'No'}</td>
                    <td className="py-2">
                      <button onClick={() => openEdit(g)} className="text-sm text-blue-600">Editar</button>
                    </td>
                  </tr>
                ))}
                {grupos.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-slate-400">No hay grupos registrados</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg w-full max-w-xl p-6">
            <h3 className="text-lg font-semibold mb-4">{editingId ? 'Editar grupo' : 'Nuevo grupo'}</h3>
            {error && <div className="text-red-600 mb-3">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium">Nombre</label>
                  <input value={nombre} onChange={(e) => { setNombre(e.target.value); if (!editingId) setCodigo(generateGroupCode(e.target.value)); }} className="w-full border p-2 rounded" required />
                </div>
                <div>
                  <label className="block text-sm font-medium">Código</label>
                  <input value={codigo} readOnly className="w-full border p-2 rounded bg-gray-50" placeholder="Se generará automáticamente" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Descripción</label>
                  <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full border p-2 rounded" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> Activo</label>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Guardar</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GruposPage;

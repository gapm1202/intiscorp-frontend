import { useEffect, useState } from 'react';
import { getCategorias, createCategoria, updateCategoria, getCategoriaById } from '@/modules/inventario/services/categoriasService';
import axiosClient from '@/api/axiosClient';
import type { Category, CategoryField } from '@/modules/inventario/services/categoriasService';

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
  if (words.length >= 2) part2 = take(words[1], 5);
  else {
    const single = words[0];
    if (single.length <= 4) part1 = take(single, 4);
    else { part1 = take(single, 4); part2 = take(single.substring(4), 5); }
  }
  return part2 ? `${part1}-${part2}` : part1;
};

const generateCategoryCode = (rawName: string): string => {
  if (!rawName) return '';
  const withoutAccents = rawName.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const cleaned = withoutAccents.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  const words = cleaned.split(/\s+/).map(w => w.trim()).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0].toUpperCase();
  let second = '';
  if (words.length >= 2) second = words[1].substring(0, Math.min(4, words[1].length)).toUpperCase();
  return second ? `${first}-${second}` : first;
};

const normalizeCampos = (campos: any[] = []): CategoryField[] => {
  return (campos || []).map((f: any) => {
    const opcionesRaw = f.opciones || f.options || [];
    const opciones: string[] = Array.isArray(opcionesRaw)
      ? opcionesRaw.map((o: any) => (typeof o === 'string' ? o : String(o?.value ?? ''))).map((s: string) => s.trim()).filter(Boolean)
      : (typeof opcionesRaw === 'string' ? opcionesRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    return { nombre: String(f.nombre || f.name || '').trim(), tipo: f.tipo || 'text', requerido: Boolean(f.requerido), opciones } as CategoryField;
  });
};

const TiposActivosPage = () => {
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [categoryCodeInput, setCategoryCodeInput] = useState('');
  const [categoryGroupId, setCategoryGroupId] = useState('');
  const [groups, setGroups] = useState<Array<{ id: string; nombre: string }>>([]);
  const [brandInput, setBrandInput] = useState('');
  const [marcas, setMarcas] = useState<string[]>([]);
  const [subcategoriesInput, setSubcategoriesInput] = useState('');
  const [newCategoryFields, setNewCategoryFields] = useState<CategoryField[] & any[]>([]);
  const [copyFromCategoryId, setCopyFromCategoryId] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [categoryPreview, setCategoryPreview] = useState<any>(null);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupCodeInput, setGroupCodeInput] = useState('');
  const [groupDescriptionInput, setGroupDescriptionInput] = useState('');
  const [groupActiveInput, setGroupActiveInput] = useState(true);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchCategorias = async () => {
    setLoading(true);
    try { const data = await getCategorias(); setCategorias(Array.isArray(data) ? data : []); }
    catch (err) { console.error('Error fetching categorias', err); setCategorias([]); }
    finally { setLoading(false); }
  };

  const fetchGroups = async () => {
    try {
      const res = await axiosClient.get('/api/gestion-grupos-categorias');
      let data: any = res.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (Array.isArray(data.data)) data = data.data;
        else if (Array.isArray(data.results)) data = data.results;
      }
      if (!Array.isArray(data)) data = [];
      setGroups(data.map((g: any) => ({ id: String(g.id ?? g._id ?? ''), nombre: g.nombre })));
    } catch (err) { setGroups([]); }
  };

  useEffect(() => { fetchCategorias(); fetchGroups(); }, []);

  const openNew = () => {
    setEditingCategoryId(null); setCategoryNameInput(''); setCategoryCodeInput(''); setCategoryGroupId(''); setNewCategoryFields([]); setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategoryId(cat.id ?? null);
    setCategoryNameInput(cat.nombre || '');
    setCategoryCodeInput(cat.codigo || generateCategoryCode(cat.nombre || ''));
    setCategoryGroupId((cat as any).grupoId || '');
    const mapped = normalizeCampos((cat as any).campos || []).map(f => ({ ...f, opcionesRaw: Array.isArray(f.opciones) ? f.opciones.join(', ') : (typeof f.opciones === 'string' ? f.opciones : '') }));
    setNewCategoryFields(mapped as any[]);
    setShowModal(true);
  };

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = String(categoryNameInput || '').trim();
    if (!cat) { setErrorMessage('El nombre de la categoría es obligatorio'); setShowErrorToast(true); setTimeout(()=>setShowErrorToast(false),3000); return; }
    const cleanedCampos: CategoryField[] = (newCategoryFields || []).map((f) => {
      const rawOpts = (f as any).opciones || (f as any).options || (f as any).opcionesRaw || [];
      const opciones: string[] = Array.isArray(rawOpts)
        ? rawOpts.map((o: any) => (typeof o === 'string' ? o : String(o?.value ?? ''))).map((s: string) => s.trim()).filter(Boolean)
        : (typeof rawOpts === 'string' ? rawOpts.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      return { nombre: String(f.nombre || '').trim(), tipo: f.tipo || 'text', requerido: Boolean(f.requerido), opciones } as CategoryField;
    });
    setCategoryPreview({ nombre: cat, grupoId: categoryGroupId || undefined, campos: cleanedCampos, createdAt: new Date().toLocaleString(), subcategorias: subcategoriesInput.split(',').map(s=>s.trim()).filter(Boolean) });
    setShowPreview(true);
  };

  const handleSavePreview = async () => {
    try {
      if (editingCategoryId) {
        const finalCampos: CategoryField[] = (categoryPreview.campos || []).map((f: any) => ({ nombre: String(f.nombre || '').trim(), tipo: f.tipo || 'text', requerido: Boolean(f.requerido), opciones: Array.isArray(f.opciones) ? f.opciones.map((o:any)=> String(o).trim()) : (typeof f.opciones === 'string' ? f.opciones.split(',').map((s:string)=>s.trim()) : []) }));
        const updated = await updateCategoria(editingCategoryId, { ...(categoryPreview.grupoId ? { grupoId: categoryPreview.grupoId } : {}), campos: finalCampos });
        setCategorias(prev => prev.map(c => c.id === editingCategoryId ? updated : c));
        setSuccessMessage('Categoría actualizada exitosamente'); setShowSuccessToast(true); setTimeout(()=>setShowSuccessToast(false),3000);
      } else {
        const finalCampos: CategoryField[] = (categoryPreview.campos || []).filter((f:any)=>f.nombre && String(f.nombre).trim().length>0).map((f: any) => ({ nombre: String(f.nombre || '').trim(), tipo: f.tipo || 'text', requerido: Boolean(f.requerido), opciones: Array.isArray(f.opciones) ? f.opciones.map((o:any)=> String(o).trim()) : (typeof f.opciones === 'string' ? f.opciones.split(',').map((s:string)=>s.trim()) : []) }));
        const payload: any = { nombre: categoryPreview.nombre.trim(), ...(categoryPreview.grupoId ? { grupoId: categoryPreview.grupoId } : {}), ...(finalCampos.length > 0 && { campos: finalCampos }) };
        const created = await createCategoria(payload);
        setCategorias(prev => [created, ...prev]);
        setSuccessMessage('Categoría creada exitosamente'); setShowSuccessToast(true); setTimeout(()=>setShowSuccessToast(false),3000);
      }
      setCategoryPreview(null); setShowPreview(false); setShowModal(false); setNewCategoryFields([]); setEditingCategoryId(null); setCategoryNameInput(''); setSubcategoriesInput('');
    } catch (err: any) {
      console.error('❌ Error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Error al guardar la categoría';
      setErrorMessage(errorMsg); setShowErrorToast(true); setTimeout(()=>setShowErrorToast(false),4000);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Tipos de Activo</h2>
          <div className="flex items-center gap-2">
            <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded">Añadir tipo</button>
            <button onClick={fetchCategorias} className="px-3 py-2 border rounded">Refrescar</button>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          {loading ? <p>Cargando...</p> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="py-2">Nombre</th>
                  <th className="py-2">Código</th>
                  <th className="py-2">Grupo</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map(c => (
                  <tr key={String(c.id ?? c.nombre)} className="border-t">
                    <td className="py-2">{c.nombre}</td>
                    <td className="py-2">{c.codigo}</td>
                    <td className="py-2">{(c as any).grupoId || '-'}</td>
                    <td className="py-2"><button onClick={() => openEdit(c)} className="text-sm text-blue-600 mr-2">Editar</button></td>
                  </tr>
                ))}
                {categorias.length === 0 && (<tr><td colSpan={4} className="py-6 text-center text-slate-400">No hay tipos registrados</td></tr>)}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm overflow-y-auto p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-2xl border border-slate-200 overflow-hidden">

            {/* Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-blue-600 to-sky-500 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white/5" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2.5 rounded-xl">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white leading-tight">{editingCategoryId ? 'Editar categoría' : 'Nueva categoría'}</h3>
                    <p className="text-sky-100 text-sm mt-0.5">{editingCategoryId ? 'Actualiza subcategorías y campos personalizados.' : 'Define la categoría y sus campos para el formulario.'}</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setShowModal(false); setNewCategoryFields([]); setCategoryPreview(null); setShowPreview(false); setEditingCategoryId(null); setCategoryNameInput(''); setSubcategoriesInput(''); }} className="text-white/70 hover:text-white hover:bg-white/20 transition-all p-1.5 rounded-lg" aria-label="Cerrar modal">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-8 py-6 overflow-y-auto max-h-[calc(90vh-88px)]">
              <form onSubmit={handlePreview}>
                <div className="space-y-6">

                  {/* Info tip */}
                  <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                    <svg className="w-4 h-4 mt-0.5 shrink-0 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span><strong className="font-semibold">Recomendación:</strong> usa un nombre claro y agrega marcas sólo si realmente ayudan al usuario a elegir mejor.</span>
                  </div>

                  {/* Section: Información básica */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                      <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Información básica</h4>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Grupo de Activo</label>
                      <select value={categoryGroupId} onChange={(e) => setCategoryGroupId(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white text-slate-800">
                        <option value="">— Seleccionar grupo —</option>
                        {groups.map(g => (<option key={g.id} value={g.id}>{g.nombre}</option>))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de categoría <span className="text-red-500">*</span></label>
                        <input name="categoria" value={categoryNameInput} onChange={(e) => setCategoryNameInput(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm" placeholder="ej: Laptop" readOnly={!!editingCategoryId} style={editingCategoryId ? { backgroundColor: '#f8fafc', cursor: 'not-allowed', color: '#94a3b8' } : {}} required />
                        {editingCategoryId && (<p className="text-xs text-slate-400 mt-1.5">El nombre no se edita para mantener consistencia.</p>)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Código <span className="text-red-500">*</span></label>
                        <input name="codigo" value={categoryCodeInput} onChange={(e) => setCategoryCodeInput(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm" placeholder="ej: LAP-001" required />
                        <p className="text-xs text-slate-400 mt-1.5">Código único corto para la categoría.</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* Section: Marcas */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                      <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Marcas</h4>
                    </div>

                    <div className="flex gap-2">
                      <input value={brandInput} onChange={(e) => setBrandInput(e.target.value)} className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl text-sm" placeholder="Escribe una marca y pulsa Agregar" />
                      <button type="button" onClick={() => { const v = String(brandInput || '').trim(); if (v && !marcas.includes(v)) { setMarcas(prev => [...prev, v]); setBrandInput(''); } }} className="px-4 py-2.5 bg-blue-600 text-white rounded">Agregar</button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 min-h-[32px]">
                      {marcas.length === 0 ? (<span className="text-xs text-slate-400 italic self-center">No hay marcas agregadas</span>) : marcas.map((m,i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">{m}<button type="button" onClick={() => setMarcas(prev => prev.filter(x => x !== m))} className="text-blue-400 hover:text-red-500 transition-colors leading-none">✕</button></span>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* Section: Campos personalizados */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Campos personalizados</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Aparecerán al registrar un activo de este tipo.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="min-w-[220px]">
                          <label className="block text-xs text-slate-500 mb-1">Copiar campos desde categoría existente (opcional)</label>
                          <select value={copyFromCategoryId} onChange={async (e) => {
                            const id = e.target.value; setCopyFromCategoryId(id); if (!id) return;
                            try { const cat = await getCategoriaById(id); const source = cat ?? (categorias || []).find(c => String(c.id ?? c._id ?? '') === String(id)); if (!source) return; const mapped = normalizeCampos((source as any).campos || []).map(f => ({ ...f, opcionesRaw: Array.isArray(f.opciones) ? f.opciones.join(', ') : (typeof f.opciones === 'string' ? f.opciones : '') })); setNewCategoryFields(mapped as any); } catch (err) { console.error('Error fetching category for copy:', err); }
                          }} className="w-full p-2.5 border rounded text-sm"><option value="">-- No copiar --</option>{(categorias || []).map(c => (<option key={String(c.id ?? c._id ?? '')} value={String(c.id ?? c._id ?? '')}>{c.nombre}</option>))}</select>
                        </div>
                        <button type="button" onClick={() => setNewCategoryFields([...newCategoryFields, { nombre: '', tipo: 'text', requerido: false, opcionesRaw: '' }])} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl">➕ Agregar campo</button>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Nombre</th><th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Tipo</th><th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Req.</th><th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Opciones</th><th className="px-4 py-3" /></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {newCategoryFields.map((field, idx) => (
                            <tr key={idx} className="hover:bg-sky-50/50">
                              <td className="px-4 py-3"><input type="text" value={field.nombre} onChange={(e)=>{ const updated = [...newCategoryFields]; updated[idx] = { ...updated[idx], nombre: e.target.value }; setNewCategoryFields(updated); }} className="w-full px-2.5 py-1.5 border rounded-lg text-sm" placeholder="Ej: Procesador" /></td>
                              <td className="px-4 py-3"><select value={field.tipo} onChange={(e)=>{ const updated = [...newCategoryFields]; updated[idx] = { ...updated[idx], tipo: e.target.value as CategoryField['tipo'] }; if (e.target.value !== 'select') updated[idx].opciones = []; else (updated[idx] as any).opcionesRaw = ((updated[idx] as any).opciones || []).join(', '); setNewCategoryFields(updated); }} className="w-full px-2.5 py-1.5 border rounded-lg text-sm bg-white"><option value="text">Texto</option><option value="number">Número</option><option value="select">Selección</option><option value="textarea">Texto largo</option></select></td>
                              <td className="px-4 py-3 text-center"><input type="checkbox" checked={Boolean(field.requerido)} onChange={(e)=>{ const updated = [...newCategoryFields]; updated[idx] = { ...updated[idx], requerido: e.target.checked }; setNewCategoryFields(updated); }} className="w-4 h-4 rounded accent-blue-600" /></td>
                              <td className="px-4 py-3">{field.tipo === 'select' ? (<input type="text" value={((field as any).opcionesRaw ?? (field.opciones || []).join(', '))} onChange={(e)=>{ const updated = [...newCategoryFields]; updated[idx] = { ...updated[idx], opcionesRaw: e.target.value } as any; setNewCategoryFields(updated); }} onBlur={()=>{ const updated = [...newCategoryFields]; const raw = String((updated[idx] as any).opcionesRaw || ''); updated[idx] = { ...updated[idx], opciones: raw.split(',').map((s:string)=>s.trim()).filter(Boolean), opcionesRaw: raw } as any; setNewCategoryFields(updated); }} className="w-full px-2.5 py-1.5 border rounded-lg text-sm" placeholder="Ej: Intel, AMD" />) : (<span className="text-slate-300 text-sm">—</span>)}</td>
                              <td className="px-4 py-3"><button type="button" onClick={() => setNewCategoryFields(newCategoryFields.filter((_, i) => i !== idx))} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600">Eliminar</button></td>
                            </tr>
                          ))}
                          {newCategoryFields.length === 0 && (<tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400 italic">No hay campos personalizados. Pulsa "+ Agregar campo" para comenzar.</td></tr>)}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => { setShowModal(false); setNewCategoryFields([]); setCategoryPreview(null); setShowPreview(false); setEditingCategoryId(null); setCategoryNameInput(''); setSubcategoriesInput(''); }} className="px-5 py-2.5 rounded-xl border text-slate-600">Cancelar</button>
                    <button type="submit" className="px-5 py-2.5 rounded-xl bg-blue-600 text-white">Previsualizar</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {showPreview && categoryPreview && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-gradient-to-r from-blue-600 to-sky-500 px-7 py-5 relative overflow-hidden">
              <div className="relative flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-xl"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                <div>
                  <h3 className="text-xl font-bold text-white">Vista previa</h3>
                  <p className="text-sky-100 text-sm">Revise la información antes de confirmar</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100 px-5 py-4"><p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Nombre de categoría</p><p className="text-2xl font-bold text-slate-900">{categoryPreview.nombre}</p></div>
              {categoryPreview.campos.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Campos Personalizados <span className="ml-auto bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">{categoryPreview.campos.length}</span></p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryPreview.campos.map((campo:any, idx:number) => (
                      <div key={idx} className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                        <div className="flex items-start justify-between mb-2"><span className="font-semibold text-slate-800 text-sm">{campo.nombre}</span>{campo.requerido && <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-0.5 rounded-lg border border-red-100">Req.</span>}</div>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200 capitalize">{campo.tipo}</span>
                        {campo.opciones && campo.opciones.length > 0 && (<div className="mt-2.5 pt-2.5 border-t border-slate-200"><p className="text-xs text-slate-400 mb-1.5">Opciones:</p><div className="flex flex-wrap gap-1">{campo.opciones.map((opt:any, oidx:number) => <span key={oidx} className="px-2 py-0.5 rounded-lg text-xs text-slate-700 bg-white border border-slate-300">{typeof opt === 'string' ? opt : opt.value}</span>)}</div></div>)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-slate-50 border-t border-slate-200 px-7 py-4 flex justify-between items-center gap-3">
              <button onClick={() => { setCategoryPreview(null); setShowPreview(false); }} className="px-5 py-2.5 border rounded-xl">Volver</button>
              <button onClick={handleSavePreview} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-xl">Confirmar y guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Group modal (same as Inventario) */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-md p-0 my-8 max-h-[90vh] overflow-hidden shadow-2xl border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{editingGroupId ? 'Editar Grupo' : 'Crear Grupo'}</h3>
                  <p className="text-sm text-gray-600 mt-1">Define un grupo que agrupará tipos de activo relacionados.</p>
                </div>
                <button type="button" onClick={() => { setShowGroupModal(false); setEditingGroupId(null); setGroupNameInput(''); setGroupCodeInput(''); setGroupDescriptionInput(''); setGroupActiveInput(true); }} className="text-gray-500 hover:text-gray-700" aria-label="Cerrar modal">✕</button>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Grupo *</label>
                  <input value={groupNameInput} onChange={e => { const val = e.target.value; setGroupNameInput(val); const generated = generateGroupCode(val); setGroupCodeInput(generated); }} className="w-full p-2.5 border rounded" placeholder="Ej: Equipos de Computo" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código (se genera automáticamente)</label>
                  <input value={groupCodeInput} readOnly className="w-full p-2.5 border rounded bg-gray-50" placeholder="Se generará automáticamente" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea value={groupDescriptionInput} onChange={e => setGroupDescriptionInput(e.target.value)} className="w-full p-2.5 border rounded" placeholder="Descripción del grupo (opcional)" rows={3}></textarea>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={groupActiveInput} onChange={e => setGroupActiveInput(e.target.checked)} className="w-4 h-4" /><span className="text-sm text-gray-700">Activo</span></label>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setShowGroupModal(false); setEditingGroupId(null); setGroupNameInput(''); setGroupCodeInput(''); setGroupDescriptionInput(''); setGroupActiveInput(true); }} className="px-4 py-2 rounded border hover:bg-gray-50">Cancelar</button>
                  <button onClick={async () => {
                    const name = String(groupNameInput || '').trim();
                    if (!name) { setErrorMessage('El nombre del grupo es obligatorio'); setShowErrorToast(true); setTimeout(() => setShowErrorToast(false),3000); return; }
                    const descripcion = String(groupDescriptionInput || '').trim();
                    const activo = Boolean(groupActiveInput);
                    const payload: any = { nombre: name, descripcion, activo };
                    if (String(groupCodeInput || '').trim() !== '') payload.codigo = String(groupCodeInput || '').trim();
                    try {
                      if (editingGroupId) { await axiosClient.put(`/api/gestion-grupos-categorias/${editingGroupId}`, payload); setSuccessMessage('Grupo actualizado'); setShowSuccessToast(true); setTimeout(()=>setShowSuccessToast(false),3000); }
                      else { await axiosClient.post('/api/gestion-grupos-categorias', payload); setSuccessMessage('Grupo creado'); setShowSuccessToast(true); setTimeout(()=>setShowSuccessToast(false),3000); }
                      await fetchGroups(); setShowGroupModal(false); setEditingGroupId(null); setGroupNameInput(''); setGroupCodeInput(''); setGroupDescriptionInput(''); setGroupActiveInput(true);
                    } catch (err: any) {
                      const status = err?.response?.status; const serverMsg = err?.response?.data?.message || err?.response?.data || err?.message || 'Error';
                      if (status === 409) setErrorMessage(typeof serverMsg === 'string' ? serverMsg : 'El código ya existe');
                      else if (status === 400) setErrorMessage(typeof serverMsg === 'string' ? serverMsg : 'Datos inválidos');
                      else setErrorMessage('Error al guardar grupo'); setShowErrorToast(true); setTimeout(()=>setShowErrorToast(false),5000);
                    }
                  }} className="px-4 py-2 rounded bg-indigo-600 text-white">{editingGroupId ? 'Actualizar' : 'Crear'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TiposActivosPage;

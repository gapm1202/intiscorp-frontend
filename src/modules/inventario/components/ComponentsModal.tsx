import React, { useEffect, useState, useRef } from 'react';
import type { Category } from '@/modules/inventario/services/categoriasService';
import {
  getComponentes,
  createComponente,
  updateComponente,
  deleteComponente,
} from '@/modules/inventario/services/componentesService';


// ─── Types ──────────────────────────────────────────────────────────────────

type FieldType = 'text' | 'number' | 'select' | 'textarea';

type ComponentField = {
  id?: number;
  tempId?: string;          // for new unsaved fields
  nombre: string;
  tipo: FieldType;
  requerido: boolean;
  opciones: string[];
  opcionesRaw?: string;
};

type Componente = {
  id?: number;
  nombre: string;
  icono?: string;
  categorias: number[];
  campos: ComponentField[];
  createdAt?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const tempId = () => `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const emptyField = (): ComponentField => ({
  tempId: tempId(),
  nombre: '',
  tipo: 'text',
  requerido: false,
  opciones: [],
  opcionesRaw: '',
});

const fieldKey = (f: ComponentField) => f.id != null ? `db-${f.id}` : f.tempId ?? tempId();

const ICONOS = ['⚙️', '💾', '🖨️', '📡', '🔋', '🖥️', '📱', '🔌', '🎛️', '📷'];

const TIPO_META: Record<FieldType, { label: string; color: string; bg: string; border: string }> = {
  text:     { label: 'Texto',       color: '#1050a8', bg: '#e4effc', border: '#b8d4f8' },
  number:   { label: 'Número',      color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
  select:   { label: 'Selección',   color: '#5b21b6', bg: '#ede9fe', border: '#c4b5fd' },
  textarea: { label: 'Texto largo', color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
};

// ─── Component ──────────────────────────────────────────────────────────────

const ComponentsModal: React.FC<Props> = ({ visible, onClose, categories }) => {
  const [components, setComponents] = useState<Componente[]>([]);
  const [activeId, setActiveId]     = useState<number | null>(null);
  const [editing, setEditing]       = useState<Componente | null>(null);
  const [isNew, setIsNew]           = useState(false);
  const [searchQ, setSearchQ]       = useState('');
  const [previewVals, setPreviewVals] = useState<Record<string, string>>({});
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [saving, setSaving]         = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // ── Load from API ──
  const fetchComponents = async () => {
    try {
      const list = await getComponentes();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalized: Componente[] = list.map((c: any) => ({
        id: c.id,
        nombre: c.nombre ?? '',
        icono: c.icono ?? '⚙️',
        categorias: Array.isArray(c.categorias) ? c.categorias.map(Number) : [],
        campos: Array.isArray(c.campos)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? c.campos.map((f: any) => ({
              id: f.id,
              nombre: f.nombre ?? '',
              tipo: f.tipo ?? 'text',
              requerido: Boolean(f.requerido),
              opciones: Array.isArray(f.opciones) ? f.opciones : [],
              opcionesRaw: Array.isArray(f.opciones) ? f.opciones.join(', ') : '',
            }))
          : [],
        createdAt: c.createdAt ?? c.created_at,
      }));
      setComponents(normalized);
      if (normalized.length > 0 && !activeId) setActiveId(normalized[0].id!);
    } catch (err) {
      console.error('Error cargando componentes:', err);
      setComponents([]);
    } finally { /* loaded */ }
  };

  useEffect(() => {
    if (visible) fetchComponents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── CRUD ──
  const openNew = () => {
    const fresh: Componente = {
      nombre: '', icono: '⚙️',
      categorias: [], campos: [],
    };
    setEditing(fresh);
    setIsNew(true);
    setActiveId(null);
    setTimeout(() => nameRef.current?.focus(), 80);
  };

  const startEdit = (c: Componente) => {
    setEditing(JSON.parse(JSON.stringify(c)));
    setIsNew(false);
    setActiveId(c.id!);
  };

  const cancelEdit = () => {
    setEditing(null);
    setIsNew(false);
    if (components.length) setActiveId(components[0].id!);
  };

  const save = async () => {
    if (!editing || !editing.nombre.trim() || saving) return;
    setSaving(true);
    try {
      const payload = {
        nombre: editing.nombre,
        icono: editing.icono,
        categorias: editing.categorias,
        campos: editing.campos.map(f => ({
          ...(f.id != null ? { id: f.id } : {}),
          nombre: f.nombre,
          tipo: f.tipo,
          requerido: f.requerido,
          opciones: f.tipo === 'select' ? f.opciones : [],
        })),
      };
      if (isNew) {
        const created = await createComponente(payload);
        setActiveId(created.id!);
      } else {
        await updateComponente(editing.id!, payload);
        setActiveId(editing.id!);
      }
      setEditing(null);
      setIsNew(false);
      await fetchComponents();
    } catch (err) {
      console.error('Error guardando componente:', err);
      alert('Error al guardar el componente. Verifique la conexión.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (saving) return;
    setSaving(true);
    try {
      await deleteComponente(id);
      if (activeId === id) setActiveId(null);
      if (editing?.id === id) { setEditing(null); setIsNew(false); }
      await fetchComponents();
    } catch (err) {
      console.error('Error eliminando componente:', err);
      alert('Error al eliminar el componente.');
    } finally {
      setSaving(false);
    }
  };

  // ── Field helpers ──
  const addField = () => {
    if (!editing) return;
    setEditing({ ...editing, campos: [...editing.campos, emptyField()] });
  };

  const updateField = (idx: number, patch: Partial<ComponentField>) => {
    if (!editing) return;
    const copy = [...editing.campos];
    copy[idx] = { ...copy[idx], ...patch };
    setEditing({ ...editing, campos: copy });
  };

  const removeField = (idx: number) => {
    if (!editing) return;
    const copy = [...editing.campos];
    copy.splice(idx, 1);
    setEditing({ ...editing, campos: copy });
  };

  const toggleCategory = (catId: number) => {
    if (!editing) return;
    const s = new Set(editing.categorias);
    if (s.has(catId)) s.delete(catId); else s.add(catId);
    setEditing({ ...editing, categorias: Array.from(s) });
  };

  // ── Derived ──
  const filtered = components.filter(c =>
    !searchQ || c.nombre.toLowerCase().includes(searchQ.toLowerCase())
  );

  const activeComp = editing ? editing : components.find(c => c.id === activeId) ?? null;

  const getCatName = (id: number) =>
    categories.find(x => Number(x.id) === id)?.nombre ?? String(id);

  if (!visible) return null;

  // ═══════════════════════════════════════════════════════════════
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=DM+Mono:wght@400;500&display=swap');

        .cm-root *, .cm-root *::before, .cm-root *::after { box-sizing: border-box; }
        .cm-root { font-family: 'DM Sans', sans-serif; }

        @keyframes cm-fadeIn  { from { opacity:0 }                               to { opacity:1 } }
        @keyframes cm-slideIn { from { opacity:0; transform:translateY(14px) scale(.98) } to { opacity:1; transform:none } }
        @keyframes cm-popIn   { from { opacity:0; transform:scale(.92) }        to { opacity:1; transform:scale(1) } }

        /* Overlay */
        .cm-overlay {
          position: fixed; inset: 0; z-index: 70;
          background: rgba(5,15,40,.55);
          backdrop-filter: blur(6px) saturate(1.4);
          display: flex; align-items: center; justify-content: center;
          padding: 1.25rem;
          animation: cm-fadeIn .18s ease;
        }

        /* Shell */
        .cm-shell {
          background: #fff;
          border-radius: 20px;
          width: 100%; max-width: 1060px;
          height: min(88vh, 740px);
          display: flex; flex-direction: column;
          overflow: hidden;
          box-shadow: 0 32px 96px rgba(5,15,40,.28), 0 0 0 1px rgba(20,88,184,.12);
          animation: cm-slideIn .28s cubic-bezier(.32,1.2,.64,1);
        }

        /* Header */
        .cm-header {
          background: linear-gradient(130deg, #071e42 0%, #0e3a8c 60%, #1a5cc8 100%);
          padding: 1.4rem 2rem;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
          position: relative; overflow: hidden;
        }
        .cm-header::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 80% at 80% 50%, rgba(255,255,255,.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .cm-header-icon {
          width: 40px; height: 40px;
          background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.22);
          border-radius: 12px; display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; backdrop-filter: blur(4px);
        }
        .cm-header-title { font-size: 1.15rem; font-weight: 800; color: #fff; letter-spacing: -.025em; }
        .cm-header-sub   { font-size: .78rem; color: rgba(255,255,255,.55); margin-top: .15rem; }
        .cm-header-close {
          width: 34px; height: 34px;
          background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2);
          border-radius: 9px; color: #fff; font-size: 1rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background .15s; flex-shrink: 0;
        }
        .cm-header-close:hover { background: rgba(255,255,255,.24); }

        /* Body: two-panel */
        .cm-body { display: flex; flex: 1; overflow: hidden; }

        /* ── LEFT PANEL ── */
        .cm-left {
          width: 280px; flex-shrink: 0;
          border-right: 1.5px solid #e8f0fb;
          display: flex; flex-direction: column;
          background: #f7faff;
        }
        .cm-left-top {
          padding: 1rem 1rem .75rem;
          border-bottom: 1px solid #e8f0fb; flex-shrink: 0;
        }
        .cm-search {
          width: 100%;
          padding: .58rem .85rem .58rem 2.4rem;
          border: 1.5px solid #d4e5f9; border-radius: 9px;
          font-size: .85rem; font-family: 'DM Sans', sans-serif;
          color: #0d2d5e; font-weight: 500;
          background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%237da0c4' stroke-width='2' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='M21 21l-4.35-4.35'/%3E%3C/svg%3E") no-repeat .75rem center;
          outline: none; transition: border-color .15s, box-shadow .15s;
        }
        .cm-search:focus { border-color: #1458b8; box-shadow: 0 0 0 3px rgba(20,88,184,.11); }
        .cm-search::placeholder { color: #aac0d8; }

        .cm-left-list { flex: 1; overflow-y: auto; padding: .5rem; }
        .cm-list-item {
          display: flex; align-items: center; gap: .65rem;
          padding: .7rem .85rem; border-radius: 11px;
          cursor: pointer; transition: background .12s, box-shadow .12s;
          margin-bottom: .25rem; position: relative;
          border: 1.5px solid transparent;
        }
        .cm-list-item:hover { background: #eef5ff; }
        .cm-list-item.active {
          background: #fff; border-color: #b8d4f8;
          box-shadow: 0 2px 12px rgba(20,88,184,.1);
        }
        .cm-list-item.active::before {
          content: ''; position: absolute; left: 0; top: 20%; bottom: 20%;
          width: 3px; background: #1458b8; border-radius: 0 3px 3px 0;
        }
        .cm-list-icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: #e4effc; display: flex; align-items: center; justify-content: center;
          font-size: 1rem; flex-shrink: 0;
        }
        .cm-list-item.active .cm-list-icon { background: #d8ecff; }
        .cm-list-name { font-weight: 700; font-size: .88rem; color: #0a2550; line-height: 1.2; }
        .cm-list-meta { font-size: .73rem; color: #7da0c4; margin-top: .1rem; font-weight: 400; }

        .cm-left-footer { padding: .85rem; border-top: 1px solid #e8f0fb; flex-shrink: 0; }
        .cm-btn-new {
          width: 100%; padding: .72rem;
          background: #1458b8; color: #fff;
          border: none; border-radius: 10px;
          font-weight: 700; font-size: .875rem;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background .15s, box-shadow .15s, transform .1s;
          box-shadow: 0 2px 10px rgba(20,88,184,.3);
          display: flex; align-items: center; justify-content: center; gap: .5rem;
        }
        .cm-btn-new:hover { background: #0d45a0; box-shadow: 0 5px 18px rgba(20,88,184,.38); transform: translateY(-1px); }

        /* ── RIGHT PANEL ── */
        .cm-right { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

        /* View */
        .cm-view { flex: 1; overflow-y: auto; padding: 2rem 2.25rem; }
        .cm-view-hero {
          display: flex; align-items: flex-start; gap: 1.1rem;
          padding: 1.5rem 1.75rem;
          background: linear-gradient(135deg, #f2f7fd 0%, #e8f2ff 100%);
          border: 1.5px solid #c8ddf5; border-radius: 16px; margin-bottom: 1.75rem;
        }
        .cm-view-hero-icon {
          width: 52px; height: 52px; background: #fff;
          border: 1.5px solid #c8ddf5; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.6rem; flex-shrink: 0;
          box-shadow: 0 2px 10px rgba(20,88,184,.08);
        }
        .cm-view-hero-name { font-size: 1.6rem; font-weight: 800; color: #0a2550; letter-spacing: -.03em; line-height: 1.1; }
        .cm-view-hero-sub  { font-size: .82rem; color: #5a7fa8; margin-top: .35rem; }

        .cm-section-label {
          font-size: .68rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: .12em; color: #2e6db4; margin-bottom: .85rem;
          display: flex; align-items: center; gap: .5rem;
        }
        .cm-section-label::after { content: ''; flex: 1; height: 1px; background: #e4effc; }

        .cm-cat-pills { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: 1.75rem; }
        .cm-cat-pill {
          display: inline-flex; align-items: center; gap: .4rem;
          padding: .32rem .75rem; background: #eef5ff; color: #1050a8;
          border: 1.5px solid #c8ddf5; border-radius: 99px;
          font-size: .8rem; font-weight: 700;
        }
        .cm-cat-pill-dot { width: 6px; height: 6px; border-radius: 50%; background: #1458b8; }

        .cm-fields-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: .85rem; margin-bottom: 1.75rem;
        }
        .cm-field-card {
          background: #fff; border: 1.5px solid #d4e5f9; border-radius: 12px;
          padding: .95rem 1.1rem;
          transition: box-shadow .15s, transform .12s, border-color .15s;
          animation: cm-popIn .22s ease;
        }
        .cm-field-card:hover { box-shadow: 0 4px 16px rgba(20,88,184,.1); transform: translateY(-2px); border-color: #a0c4f0; }
        .cm-field-card-name { font-weight: 700; font-size: .9rem; color: #0a2550; margin-bottom: .55rem; }
        .cm-field-card-row  { display: flex; align-items: center; gap: .4rem; margin-bottom: .35rem; flex-wrap: wrap; }

        .cm-type-chip {
          display: inline-flex; align-items: center; gap: .28rem;
          padding: .2rem .6rem; border-radius: 99px;
          font-size: .71rem; font-weight: 700; letter-spacing: .03em; border: 1px solid;
        }
        .cm-req-chip {
          display: inline-flex; align-items: center; gap: .25rem;
          padding: .2rem .55rem; border-radius: 99px;
          font-size: .69rem; font-weight: 700;
          background: #fff5f5; color: #c53030; border: 1px solid #fecaca;
        }
        .cm-opt-pills { display: flex; flex-wrap: wrap; gap: .28rem; margin-top: .55rem; padding-top: .55rem; border-top: 1px solid #eaf1fb; }
        .cm-opt-pill {
          padding: .15rem .5rem; border-radius: 5px; font-size: .72rem; font-weight: 600;
          color: '#0a2550'; background: #f2f7fd; border: 1px solid #c8ddf5;
          font-family: 'DM Mono', monospace;
        }

        .cm-preview-box {
          background: #f7faff; border: 1.5px solid #c8ddf5;
          border-radius: 13px; padding: 1.4rem 1.5rem;
        }
        .cm-preview-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem; margin-top: 1rem;
        }

        .cm-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          flex: 1; padding: 3rem; text-align: center;
        }
        .cm-empty-icon {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, #eef5ff, #ddeeff);
          border-radius: 18px; border: 1.5px solid #c8ddf5;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.8rem; margin-bottom: 1.1rem;
        }

        /* Edit mode */
        .cm-edit { flex: 1; overflow-y: auto; padding: 1.75rem 2.25rem; }
        .cm-edit-section {
          background: #fff; border: 1.5px solid #d4e5f9;
          border-radius: 14px; margin-bottom: 1.25rem; overflow: hidden;
        }
        .cm-edit-section-header {
          padding: .85rem 1.25rem; background: #f5f9ff;
          border-bottom: 1.5px solid #e4effc;
          display: flex; align-items: center; gap: .65rem;
        }
        .cm-edit-section-num {
          width: 22px; height: 22px;
          background: linear-gradient(135deg, #1458b8, #2575d0);
          color: #fff; border-radius: 50%;
          font-size: .65rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(20,88,184,.3);
        }
        .cm-edit-section-title { font-size: .73rem; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: #1458b8; }
        .cm-edit-section-body  { padding: 1.2rem 1.25rem; }

        .cm-input {
          width: 100%; padding: .7rem 1rem;
          border: 1.5px solid #c8ddf5; border-radius: 9px;
          font-size: .915rem; font-family: 'DM Sans', sans-serif;
          color: #0d2d5e; font-weight: 600; background: #fff; outline: none;
          transition: border-color .15s, box-shadow .15s; line-height: 1.4;
        }
        .cm-input:focus { border-color: #1458b8; box-shadow: 0 0 0 3.5px rgba(20,88,184,.12); }
        .cm-input::placeholder { color: #a8c0d8; font-weight: 400; }
        .cm-input:disabled { background: #f5f8fc; color: #8aaac8; cursor: default; border-color: #dce9f5; }

        .cm-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7' viewBox='0 0 11 7'%3E%3Cpath d='M1 1l4.5 4.5L10 1' stroke='%231458b8' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right .85rem center;
          padding-right: 2.5rem !important;
        }
        .cm-label {
          display: block; font-size: .68rem; font-weight: 800;
          text-transform: uppercase; letter-spacing: .07em; color: #2e6db4; margin-bottom: .45rem;
        }
        .cm-hint { font-size: .73rem; color: #7da0c4; margin-top: .3rem; font-weight: 400; }

        /* Icon picker */
        .cm-icon-picker {
          position: absolute; z-index: 10; top: calc(100% + 6px); left: 0;
          background: #fff; border: 1.5px solid #c8ddf5; border-radius: 12px; padding: .6rem;
          box-shadow: 0 8px 32px rgba(13,45,94,.18);
          display: flex; flex-wrap: wrap; gap: .35rem; width: 200px;
          animation: cm-popIn .15s ease;
        }
        .cm-icon-opt {
          width: 36px; height: 36px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.15rem; cursor: pointer;
          transition: background .1s, transform .1s; border: 1.5px solid transparent;
        }
        .cm-icon-opt:hover { background: #eef5ff; transform: scale(1.15); border-color: #b8d4f8; }
        .cm-icon-opt.sel   { background: #ddeeff; border-color: #1458b8; }

        /* Category checkboxes */
        .cm-cat-grid { display: flex; flex-wrap: wrap; gap: .55rem; }
        .cm-cat-check {
          display: flex; align-items: center; gap: .45rem;
          padding: .45rem .85rem; border-radius: 9px; cursor: pointer;
          border: 1.5px solid #d4e5f9; background: #fff;
          transition: background .12s, border-color .12s; user-select: none;
        }
        .cm-cat-check.checked { background: #eef5ff; border-color: #1458b8; }

        /* Field editor cards */
        .cm-field-edit-card {
          background: #fff; border: 1.5px solid #c8ddf5; border-radius: 12px;
          overflow: hidden; margin-bottom: .65rem;
          transition: border-color .15s, box-shadow .15s;
          animation: cm-popIn .2s ease;
        }
        .cm-field-edit-card:hover { border-color: #94bef0; box-shadow: 0 3px 14px rgba(20,88,184,.09); }
        .cm-field-edit-header {
          padding: .65rem .9rem .65rem 0; background: #f5f9ff;
          border-bottom: 1.5px solid #e4effc;
          display: flex; align-items: center; gap: .6rem;
        }
        .cm-field-edit-stripe {
          display: flex; align-items: center; gap: .6rem; flex: 1; min-width: 0;
          padding-left: .9rem; border-left: 3px solid #1458b8;
        }
        .cm-field-edit-body { padding: .9rem 1rem; display: flex; flex-direction: column; gap: .75rem; }
        .cm-field-toggles {
          display: flex; align-items: center; gap: 1.25rem;
          padding: .55rem .85rem; background: #f0f6ff;
          border: 1.5px solid #dce9f5; border-radius: 8px;
        }
        .cm-opts-zone {
          background: #faf7ff; border: 1.5px dashed #c4b5fd;
          border-radius: 9px; padding: .8rem 1rem;
        }

        /* Buttons */
        .cm-btn {
          display: inline-flex; align-items: center; gap: .4rem;
          padding: .62rem 1.2rem; border-radius: 9px;
          font-weight: 700; font-size: .86rem;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background .15s, box-shadow .15s, transform .1s;
          border: none; white-space: nowrap;
        }
        .cm-btn-primary   { background: #1458b8; color: #fff; box-shadow: 0 2px 10px rgba(20,88,184,.28); }
        .cm-btn-primary:hover   { background: #0d45a0; box-shadow: 0 5px 18px rgba(20,88,184,.36); transform: translateY(-1px); }
        .cm-btn-secondary { background: #fff; color: #1458b8; border: 1.5px solid #b8d4f8; }
        .cm-btn-secondary:hover { background: #eef5ff; border-color: #1458b8; transform: translateY(-1px); }
        .cm-btn-ghost  { background: #eef5ff; color: #1458b8; border: 1.5px solid #c8ddf5; padding: .35rem .7rem; font-size: .8rem; }
        .cm-btn-ghost:hover  { background: #ddeeff; border-color: #1458b8; }
        .cm-btn-danger { background: #fff7f7; color: #c53030; border: 1.5px solid #fcd4d4; padding: .35rem .7rem; font-size: .8rem; }
        .cm-btn-danger:hover { background: #fff0f0; border-color: #fca5a5; }
        .cm-btn:disabled { opacity: .5; cursor: not-allowed; transform: none !important; }

        /* Edit footer */
        .cm-edit-footer {
          background: #f5f9ff; border-top: 1.5px solid #e4effc;
          padding: 1rem 2.25rem;
          display: flex; justify-content: space-between; align-items: center;
          flex-shrink: 0; gap: .75rem;
        }

        /* Scrollbars */
        .cm-left-list::-webkit-scrollbar,
        .cm-view::-webkit-scrollbar,
        .cm-edit::-webkit-scrollbar { width: 4px; }
        .cm-left-list::-webkit-scrollbar-track,
        .cm-view::-webkit-scrollbar-track,
        .cm-edit::-webkit-scrollbar-track { background: transparent; }
        .cm-left-list::-webkit-scrollbar-thumb,
        .cm-view::-webkit-scrollbar-thumb,
        .cm-edit::-webkit-scrollbar-thumb { background: #c8ddf5; border-radius: 4px; }
      `}</style>

      <div className="cm-overlay cm-root">
        <div className="cm-shell">

          {/* ── HEADER ── */}
          <div className="cm-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '.9rem', position: 'relative', zIndex: 1 }}>
              <div className="cm-header-icon">⚙️</div>
              <div>
                <div className="cm-header-title">Componentes dinámicos</div>
                <div className="cm-header-sub">Bloques reutilizables de campos por categoría de activo</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', position: 'relative', zIndex: 1 }}>
              <span style={{
                background: 'rgba(255,255,255,.15)', color: '#fff',
                fontSize: '.75rem', fontWeight: 700, padding: '.22rem .7rem',
                borderRadius: '99px', border: '1px solid rgba(255,255,255,.2)',
              }}>
                {components.length} {components.length === 1 ? 'componente' : 'componentes'}
              </span>
              <button className="cm-header-close" onClick={() => { onClose(); setEditing(null); setIsNew(false); }}>✕</button>
            </div>
          </div>

          {/* ── BODY ── */}
          <div className="cm-body">

            {/* ════ LEFT PANEL ════ */}
            <div className="cm-left">
              <div className="cm-left-top">
                <input
                  className="cm-search"
                  placeholder="Buscar componente..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                />
              </div>

              <div className="cm-left-list">
                {filtered.length === 0 && (
                  <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: '#9bbcd4', fontSize: '.83rem' }}>
                    {searchQ ? 'Sin resultados' : 'Sin componentes aún'}
                  </div>
                )}
                {filtered.map(c => (
                  <div
                    key={c.id}
                    className={`cm-list-item ${activeId === c.id && !editing ? 'active' : ''}`}
                    onClick={() => {
                      if (editing && editing.id !== c.id) return;
                      setActiveId(c.id!); setEditing(null); setIsNew(false);
                    }}
                  >
                    <div className="cm-list-icon">{c.icono || '⚙️'}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="cm-list-name">{c.nombre}</div>
                      <div className="cm-list-meta">
                        {c.campos.length} campo{c.campos.length !== 1 ? 's' : ''} · {c.categorias.length} categoría{c.categorias.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cm-left-footer">
                <button className="cm-btn-new" onClick={openNew}>
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                  Nuevo componente
                </button>
              </div>
            </div>

            {/* ════ RIGHT PANEL ════ */}
            <div className="cm-right">

              {/* ── EDIT MODE ── */}
              {editing ? (
                <>
                  <div className="cm-edit">

                    {/* Section 1: Identidad */}
                    <div className="cm-edit-section">
                      <div className="cm-edit-section-header">
                        <span className="cm-edit-section-num">1</span>
                        <span className="cm-edit-section-title">Identidad del componente</span>
                      </div>
                      <div className="cm-edit-section-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1rem', alignItems: 'end' }}>
                          {/* Icon picker */}
                          <div style={{ position: 'relative' }}>
                            <label className="cm-label">Ícono</label>
                            <button
                              type="button"
                              onClick={() => setShowIconPicker(v => !v)}
                              style={{
                                width: '52px', height: '46px',
                                background: '#f0f6ff', border: '1.5px solid #c8ddf5',
                                borderRadius: '10px', fontSize: '1.4rem',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'border-color .15s',
                              }}
                            >
                              {editing.icono || '⚙️'}
                            </button>
                            {showIconPicker && (
                              <div className="cm-icon-picker">
                                {ICONOS.map(ic => (
                                  <div
                                    key={ic}
                                    className={`cm-icon-opt ${editing.icono === ic ? 'sel' : ''}`}
                                    onClick={() => { setEditing({ ...editing, icono: ic }); setShowIconPicker(false); }}
                                  >
                                    {ic}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Name */}
                          <div>
                            <label className="cm-label">
                              Nombre del componente <span style={{ color: '#e53e3e' }}>*</span>
                            </label>
                            <input
                              ref={nameRef}
                              className="cm-input"
                              value={editing.nombre}
                              onChange={e => setEditing({ ...editing, nombre: e.target.value })}
                              placeholder="Ej: Procesador, RAM, Almacenamiento..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Categorías */}
                    <div className="cm-edit-section">
                      <div className="cm-edit-section-header">
                        <span className="cm-edit-section-num">2</span>
                        <span className="cm-edit-section-title">Categorías donde aplica</span>
                      </div>
                      <div className="cm-edit-section-body">
                        {categories.length === 0 ? (
                          <p style={{ fontSize: '.84rem', color: '#9bbcd4', margin: 0 }}>No hay categorías disponibles.</p>
                        ) : (
                          <div className="cm-cat-grid">
                            {categories.map(cat => {
                              const catId = Number(cat.id);
                              const checked = editing.categorias.includes(catId);
                              return (
                                <label
                                  key={catId}
                                  className={`cm-cat-check ${checked ? 'checked' : ''}`}
                                  onClick={() => toggleCategory(catId)}
                                >
                                  <input
                                    type="checkbox" checked={checked} onChange={() => {}}
                                    style={{ width: '15px', height: '15px', accentColor: '#1458b8', cursor: 'pointer' }}
                                  />
                                  <span style={{ fontSize: '.84rem', fontWeight: 600, color: checked ? '#0a2550' : '#5a7fa8' }}>
                                    {cat.nombre}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                        {editing.categorias.length > 0 && (
                          <p className="cm-hint" style={{ marginTop: '.65rem' }}>
                            Aplica a: <strong style={{ color: '#1458b8' }}>{editing.categorias.map(getCatName).join(' · ')}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Section 3: Campos */}
                    <div className="cm-edit-section">
                      <div className="cm-edit-section-header" style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                          <span className="cm-edit-section-num">3</span>
                          <span className="cm-edit-section-title">Campos del componente</span>
                          <span style={{
                            background: '#d8ecff', color: '#1050a8',
                            fontSize: '.7rem', fontWeight: 700,
                            padding: '.15rem .55rem', borderRadius: '99px', border: '1px solid #b8d4f8',
                          }}>
                            {editing.campos.length}
                          </span>
                        </div>
                        <button type="button" className="cm-btn cm-btn-ghost" onClick={addField}>
                          <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                          Agregar campo
                        </button>
                      </div>

                      <div className="cm-edit-section-body" style={{ paddingTop: '.9rem' }}>
                        {editing.campos.length === 0 && (
                          <div style={{
                            textAlign: 'center', padding: '1.5rem',
                            border: '2px dashed #d4e5f9', borderRadius: '11px', background: '#f9fbff',
                          }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: '.4rem' }}>📋</div>
                            <p style={{ color: '#9bbcd4', fontSize: '.84rem', fontWeight: 500, margin: 0 }}>Sin campos aún</p>
                            <p style={{ color: '#b8d0e8', fontSize: '.78rem', margin: '.2rem 0 0' }}>Pulsa "Agregar campo" para comenzar</p>
                          </div>
                        )}

                        {editing.campos.map((f, idx) => {
                          const meta = TIPO_META[f.tipo];
                          return (
                            <div key={fieldKey(f)} className="cm-field-edit-card">
                              <div className="cm-field-edit-header">
                                <div className="cm-field-edit-stripe" style={{ borderLeftColor: meta.color }}>
                                  <span style={{
                                    width: '20px', height: '20px',
                                    background: meta.bg, color: meta.color,
                                    border: `1px solid ${meta.border}`, borderRadius: '50%',
                                    fontSize: '.62rem', fontWeight: 800,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                  }}>{idx + 1}</span>
                                  <input
                                    type="text" value={f.nombre}
                                    onChange={e => updateField(idx, { nombre: e.target.value })}
                                    className="cm-input"
                                    placeholder="Nombre del campo"
                                    style={{ fontWeight: 700, fontSize: '.9rem', flex: 1 }}
                                  />
                                  <span className="cm-type-chip" style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}>
                                    {meta.label}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className="cm-btn cm-btn-danger"
                                  style={{ marginRight: '.75rem', flexShrink: 0 }}
                                  onClick={() => removeField(idx)}
                                >
                                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                  Quitar
                                </button>
                              </div>

                              <div className="cm-field-edit-body">
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                  <div style={{ minWidth: '180px', flex: '0 0 180px' }}>
                                    <label className="cm-label">Tipo</label>
                                    <select
                                      className="cm-input cm-select" value={f.tipo}
                                      onChange={e => {
                                        const tipo = e.target.value as FieldType;
                                        updateField(idx, { tipo, opciones: tipo !== 'select' ? [] : f.opciones, opcionesRaw: tipo !== 'select' ? '' : f.opcionesRaw });
                                      }}
                                    >
                                      <option value="text">Texto</option>
                                      <option value="number">Número</option>
                                      <option value="select">Selección</option>
                                      <option value="textarea">Texto largo</option>
                                    </select>
                                  </div>
                                  <div className="cm-field-toggles" style={{ flex: 1 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '.45rem', cursor: 'pointer' }}>
                                      <input
                                        type="checkbox" checked={Boolean(f.requerido)}
                                        onChange={e => updateField(idx, { requerido: e.target.checked })}
                                        style={{ width: '15px', height: '15px', accentColor: '#1458b8', cursor: 'pointer' }}
                                      />
                                      <span style={{ fontSize: '.82rem', fontWeight: 600, color: '#1a3f6e' }}>Obligatorio</span>
                                    </label>
                                  </div>
                                </div>

                                {f.tipo === 'select' && (
                                  <div className="cm-opts-zone">
                                    <label style={{
                                      fontSize: '.68rem', fontWeight: 800,
                                      textTransform: 'uppercase' as const, letterSpacing: '.07em',
                                      color: '#6d28d9', marginBottom: '.55rem', display: 'block',
                                    }}>
                                      Opciones (separadas por coma)
                                    </label>
                                    <input
                                      className="cm-input"
                                      value={f.opcionesRaw ?? (f.opciones || []).join(', ')}
                                      onChange={e => updateField(idx, { opcionesRaw: e.target.value })}
                                      onBlur={e => {
                                        const raw = e.target.value;
                                        updateField(idx, {
                                          opciones: raw.split(',').map(s => s.trim()).filter(Boolean),
                                          opcionesRaw: raw,
                                        });
                                      }}
                                      placeholder="Ej: Intel, AMD, Qualcomm"
                                    />
                                    {(() => {
                                      const raw = f.opcionesRaw ?? (f.opciones || []).join(', ');
                                      const pills = raw.split(',').map(s => s.trim()).filter(Boolean);
                                      if (!pills.length) return null;
                                      return (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginTop: '.55rem' }}>
                                          {pills.map((p, pi) => (
                                            <span key={pi} style={{
                                              padding: '.18rem .55rem', borderRadius: '6px',
                                              fontSize: '.73rem', fontWeight: 600,
                                              color: '#5b21b6', background: '#ede9fe',
                                              border: '1px solid #c4b5fd',
                                              fontFamily: "'DM Mono', monospace",
                                            }}>{p}</span>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                    <p style={{ fontSize: '.71rem', color: '#a8c0d8', margin: '.4rem 0 0' }}>
                                      Escribe las opciones separadas por coma
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Edit footer */}
                  <div className="cm-edit-footer">
                    <div>
                      {!isNew && editing && (
                        <button type="button" className="cm-btn cm-btn-danger" onClick={() => remove(editing.id!)}>
                          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          Eliminar componente
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '.65rem' }}>
                      <button type="button" className="cm-btn cm-btn-secondary" onClick={cancelEdit}>Cancelar</button>
                      <button
                        type="button"
                        className="cm-btn cm-btn-primary"
                        onClick={save}
                        disabled={!editing.nombre.trim() || saving}
                      >
                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        {saving ? 'Guardando...' : isNew ? 'Crear componente' : 'Guardar cambios'}
                      </button>
                    </div>
                  </div>
                </>

              ) : activeComp ? (

                /* ── VIEW MODE ── */
                <div className="cm-view">

                  {/* Hero */}
                  <div className="cm-view-hero">
                    <div className="cm-view-hero-icon">{activeComp.icono || '⚙️'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                        <div>
                          <div className="cm-view-hero-name">{activeComp.nombre}</div>
                          <div className="cm-view-hero-sub">
                            {activeComp.campos.length} campo{activeComp.campos.length !== 1 ? 's' : ''}
                            {' · '}
                            {activeComp.categorias.length} categoría{activeComp.categorias.length !== 1 ? 's' : ''}
                            {activeComp.createdAt && (
                              <span style={{ marginLeft: '.5rem', color: '#b0c8e0' }}>
                                · Creado {new Date(activeComp.createdAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button className="cm-btn cm-btn-ghost" onClick={() => startEdit(activeComp)}>
                          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          Editar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Categorías */}
                  {activeComp.categorias.length > 0 && (
                    <>
                      <div className="cm-section-label">Categorías donde aplica</div>
                      <div className="cm-cat-pills">
                        {activeComp.categorias.map(id => (
                          <span key={id} className="cm-cat-pill">
                            <span className="cm-cat-pill-dot" />
                            {getCatName(id)}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Campos */}
                  {activeComp.campos.length > 0 && (
                    <>
                      <div className="cm-section-label">
                        Campos
                        <span style={{
                          background: '#d8ecff', color: '#1050a8',
                          fontSize: '.69rem', fontWeight: 700,
                          padding: '.14rem .5rem', borderRadius: '99px', border: '1px solid #b8d4f8', marginLeft: '.4rem',
                        }}>
                          {activeComp.campos.length}
                        </span>
                      </div>
                      <div className="cm-fields-grid">
                        {activeComp.campos.map((f) => {
                          const meta = TIPO_META[f.tipo];
                          return (
                            <div key={fieldKey(f)} className="cm-field-card">
                              <div className="cm-field-card-name">
                                {f.nombre || <em style={{ color: '#a8c0d8', fontWeight: 400 }}>Sin nombre</em>}
                              </div>
                              <div className="cm-field-card-row">
                                <span className="cm-type-chip" style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}>
                                  {meta.label}
                                </span>
                                {f.requerido && (
                                  <span className="cm-req-chip">
                                    <svg width="9" height="9" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01"/></svg>
                                    Obligatorio
                                  </span>
                                )}
                              </div>
                              {f.tipo === 'select' && f.opciones.length > 0 && (
                                <div className="cm-opt-pills">
                                  {f.opciones.map((o, oi) => (
                                    <span key={oi} className="cm-opt-pill">{o}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Live preview */}
                  {activeComp.campos.length > 0 && (
                    <>
                      <div className="cm-section-label">Vista previa del formulario</div>
                      <div className="cm-preview-box">
                        <div style={{ fontSize: '.78rem', color: '#7da0c4', marginBottom: '.75rem', fontWeight: 500 }}>
                          Así se verán los campos al registrar un activo con componente{' '}
                          <strong style={{ color: '#1458b8' }}>{activeComp.nombre}</strong>:
                        </div>
                        <div className="cm-preview-grid">
                          {activeComp.campos.map(f => {
                            const fk = fieldKey(f);
                            return (
                            <div key={fk} style={{ display: 'flex', flexDirection: 'column', gap: '.38rem' }}>
                              <label style={{ fontSize: '.82rem', fontWeight: 700, color: '#0a2550', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                                {f.nombre || <em style={{ color: '#a8c0d8' }}>Sin nombre</em>}
                                {f.requerido && <span style={{ color: '#e53e3e' }}>*</span>}
                              </label>
                              {f.tipo === 'text'     && <input className="cm-input" type="text"   placeholder={`Ej: ${f.nombre}`} disabled />}
                              {f.tipo === 'number'   && <input className="cm-input" type="number" placeholder="0" disabled />}
                              {f.tipo === 'textarea' && <textarea className="cm-input" rows={2} placeholder={f.nombre} disabled style={{ resize: 'none' }} />}
                              {f.tipo === 'select'   && (
                                <>
                                  <select
                                    className="cm-input cm-select"
                                    value={previewVals[fk] ?? ''}
                                    onChange={e => setPreviewVals(p => ({ ...p, [fk]: e.target.value }))}
                                  >
                                    <option value="">— Seleccionar —</option>
                                    {f.opciones.map((o, oi) => <option key={oi} value={o}>{o}</option>)}
                                  </select>
                                  {f.opciones.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.25rem' }}>
                                      {f.opciones.map((o, oi) => (
                                        <span key={oi} style={{
                                          padding: '.13rem .45rem', borderRadius: '5px',
                                          fontSize: '.7rem', fontWeight: 600,
                                          color: '#5b21b6', background: '#ede9fe',
                                          border: '1px solid #c4b5fd',
                                          fontFamily: "'DM Mono', monospace",
                                        }}>{o}</span>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                              <span style={{ fontSize: '.69rem', color: '#b0c8e0', fontWeight: 500 }}>{TIPO_META[f.tipo].label}</span>
                            </div>
                          );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                </div>

              ) : (
                /* ── EMPTY STATE ── */
                <div className="cm-empty">
                  <div className="cm-empty-icon">⚙️</div>
                  <p style={{ fontSize: '1.05rem', fontWeight: 800, color: '#4a6f98', marginBottom: '.35rem' }}>
                    Sin componentes
                  </p>
                  <p style={{ fontSize: '.84rem', color: '#9bbcd4', margin: 0, maxWidth: '280px', fontWeight: 400, lineHeight: 1.6 }}>
                    Los componentes son bloques de campos reutilizables que aparecen en el formulario según la categoría del activo.
                  </p>
                  <button className="cm-btn cm-btn-primary" style={{ marginTop: '1.25rem' }} onClick={openNew}>
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                    Crear primer componente
                  </button>
                </div>
              )}

            </div>{/* cm-right */}
          </div>{/* cm-body */}
        </div>{/* cm-shell */}
      </div>{/* cm-overlay */}
    </>
  );
};

export default ComponentsModal;
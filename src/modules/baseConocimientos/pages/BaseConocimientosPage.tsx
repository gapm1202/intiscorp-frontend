import React, { useRef, useCallback, useState, useEffect } from 'react';
import Toast from '@/components/ui/Toast';
import {
  getCategorias,
  createCategoria,
  createSubcategoria,
  createEntrada,
  getEntradas,
  getEntrada,
  updateEntrada
} from '@/modules/baseConocimientos/services/baseConocimientosService';

/* ════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════ */
type Subcategory = { id: string; name: string; raw?: any };
type Category    = { id: string; name: string; subcategories: Subcategory[]; raw?: any };

type Entry = { id: string; titulo: string; contenido_html?: string; categoria_id?: string; subcategoria_id?: string; status?: string; raw?: any };

const isUuid = (v?: string) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/* ════════════════════════════════════════════════════════════
   KNOWLEDGE EDITOR — inline component
════════════════════════════════════════════════════════════ */
const Tip = ({ label, children }: { label: string; children: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)', background: '#1e3a5f', color: '#fff',
          fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
          padding: '3px 8px', borderRadius: 5, whiteSpace: 'nowrap',
          pointerEvents: 'none', zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
        }}>{label}</span>
      )}
    </span>
  );
};

const Sep = () => (
  <div style={{ width: 1, height: 18, background: '#dbeafe', margin: '0 3px', flexShrink: 0 }} />
);

interface EditorProps {
  initialContent?: string;
  onSave: (html: string) => void;
  onCancel: () => void;
}

function KnowledgeEditor({ initialContent = '', onSave, onCancel }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount]     = useState(0);
  const [charCount, setCharCount]     = useState(0);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [fontSize, setFontSize]       = useState('14');
  const [fontFamily, setFontFamily]   = useState('DM Sans');

  // Only set content on initial mount; parent uses `key` prop to remount with fresh content
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent || '';
      setTimeout(() => updateStats(), 30);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStats = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    setCharCount(text.length);
    const f = new Set<string>();
    ['bold','italic','underline','strikeThrough','insertUnorderedList','insertOrderedList'].forEach(c => {
      if (document.queryCommandState(c)) f.add(c);
    });
    ['justifyLeft','justifyCenter','justifyRight','justifyFull'].forEach(c => {
      if (document.queryCommandState(c)) f.add(c);
    });
    setActiveFormats(f);
  }, []);

  const exec = useCallback((cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    updateStats();
  }, [updateStats]);

  const isActive = (cmd: string) => activeFormats.has(cmd);

  const tbStyle = (cmd: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 26, border: 'none', borderRadius: 5, cursor: 'pointer',
    background: isActive(cmd) ? 'linear-gradient(135deg,#1d6fd8,#38bdf8)' : 'transparent',
    color: isActive(cmd) ? '#fff' : '#334155',
    transition: 'all .12s', flexShrink: 0,
  });

  const ghost: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 26, border: 'none', borderRadius: 5, cursor: 'pointer',
    background: 'transparent', color: '#334155', transition: 'background .12s', flexShrink: 0,
  };

  const handleFontSize = (val: string) => {
    setFontSize(val);
    editorRef.current?.focus();
    document.execCommand('fontSize', false, '7');
    editorRef.current?.querySelectorAll('font[size="7"]').forEach(el => {
      (el as HTMLElement).removeAttribute('size');
      (el as HTMLElement).style.fontSize = val + 'px';
    });
    updateStats();
  };

  const insertTable = () =>
    exec('insertHTML', `<table style="border-collapse:collapse;width:100%;margin:8px 0">${
      [...Array(3)].map(() => `<tr>${[...Array(3)].map(() =>
        `<td style="border:1px solid #bfdbfe;padding:6px 10px;min-width:80px">&nbsp;</td>`
      ).join('')}</tr>`).join('')
    }</table><p><br></p>`);

  return (
    <div className="ke-wrap">
      {/* ── TOOLBAR ── */}
      <div className="ke-toolbar">
        {/* Row 1 */}
        <div className="ke-toolbar-row">
          <Tip label="Fuente">
            <select className="ke-sel" style={{ width: 112 }} value={fontFamily}
              onChange={e => { setFontFamily(e.target.value); exec('fontName', e.target.value); }}>
              {['DM Sans','Georgia','Times New Roman','Courier New','Tahoma','Verdana','Arial'].map(f =>
                <option key={f} value={f}>{f}</option>)}
            </select>
          </Tip>
          <Tip label="Tamaño">
            <select className="ke-sel" style={{ width: 52 }} value={fontSize}
              onChange={e => handleFontSize(e.target.value)}>
              {[8,9,10,11,12,14,16,18,20,24,28,32,36,48,72].map(s =>
                <option key={s} value={String(s)}>{s}</option>)}
            </select>
          </Tip>
          <Sep/>
          {(['h1','h2','h3'] as const).map((h, i) => (
            <Tip key={h} label={`Título ${i+1}`}>
              <button className="ke-hbtn" onMouseDown={e => { e.preventDefault(); exec('formatBlock', h); }}>H{i+1}</button>
            </Tip>
          ))}
          <Tip label="Párrafo">
            <button className="ke-hbtn" style={{ fontWeight: 500 }} onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'p'); }}>¶</button>
          </Tip>
          <Sep/>
          <Tip label="Negrita (Ctrl+B)">
            <button onMouseDown={e => { e.preventDefault(); exec('bold'); }} style={tbStyle('bold')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h8a4 4 0 0 1 0 8H6zm0 8h9a4 4 0 0 1 0 8H6z"/></svg>
            </button>
          </Tip>
          <Tip label="Cursiva (Ctrl+I)">
            <button onMouseDown={e => { e.preventDefault(); exec('italic'); }} style={tbStyle('italic')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
            </button>
          </Tip>
          <Tip label="Subrayado (Ctrl+U)">
            <button onMouseDown={e => { e.preventDefault(); exec('underline'); }} style={tbStyle('underline')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 3v7a6 6 0 0 0 12 0V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
            </button>
          </Tip>
          <Tip label="Tachado">
            <button onMouseDown={e => { e.preventDefault(); exec('strikeThrough'); }} style={tbStyle('strikeThrough')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="5" y1="12" x2="19" y2="12"/><path d="M16 6C16 6 14.5 4 12 4s-5 1.5-5 4c0 1.5.8 2.5 2 3"/><path d="M8 18c0 0 1.5 2 4 2s5-1.5 5-4c0-1.5-.8-2.5-2-3"/></svg>
            </button>
          </Tip>
          <Sep/>
          {/* Text color */}
          <Tip label="Color de texto">
            <div className="ke-color-wrap">
              <div className="ke-color-btn" onClick={() => (document.getElementById('ke-fc') as HTMLInputElement)?.click()}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2"><path d="M4 20h4l10-10-4-4L4 16v4z"/></svg>
                <div className="ke-color-bar" id="ke-fc-bar" style={{ background: '#1e293b' }}/>
              </div>
              <input type="color" id="ke-fc" className="ke-color-input"
                onChange={e => { exec('foreColor', e.target.value); const b = document.getElementById('ke-fc-bar'); if (b) b.style.background = e.target.value; }}/>
            </div>
          </Tip>
          {/* Highlight */}
          <Tip label="Resaltado">
            <div className="ke-color-wrap">
              <div className="ke-color-btn" onClick={() => (document.getElementById('ke-bc') as HTMLInputElement)?.click()}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2"><path d="M9 7H6l-3 10h18L18 7h-3"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
                <div className="ke-color-bar" id="ke-bc-bar" style={{ background: '#fef08a' }}/>
              </div>
              <input type="color" id="ke-bc" className="ke-color-input" defaultValue="#fef08a"
                onChange={e => { exec('hiliteColor', e.target.value); const b = document.getElementById('ke-bc-bar'); if (b) b.style.background = e.target.value; }}/>
            </div>
          </Tip>
        </div>

        {/* Row 2 */}
        <div className="ke-toolbar-row">
          <Tip label="Izquierda">
            <button onMouseDown={e => { e.preventDefault(); exec('justifyLeft'); }} style={tbStyle('justifyLeft')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
            </button>
          </Tip>
          <Tip label="Centrar">
            <button onMouseDown={e => { e.preventDefault(); exec('justifyCenter'); }} style={tbStyle('justifyCenter')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
            </button>
          </Tip>
          <Tip label="Derecha">
            <button onMouseDown={e => { e.preventDefault(); exec('justifyRight'); }} style={tbStyle('justifyRight')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
            </button>
          </Tip>
          <Tip label="Justificar">
            <button onMouseDown={e => { e.preventDefault(); exec('justifyFull'); }} style={tbStyle('justifyFull')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </Tip>
          <Sep/>
          <Tip label="Lista viñetas">
            <button onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList'); }} style={tbStyle('insertUnorderedList')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>
            </button>
          </Tip>
          <Tip label="Lista numerada">
            <button onMouseDown={e => { e.preventDefault(); exec('insertOrderedList'); }} style={tbStyle('insertOrderedList')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1V3" strokeWidth="1.8"/><path d="M3 9h3" strokeWidth="1.8"/><path d="M3 15h2a1 1 0 0 1 0 2H3a1 1 0 0 1 0 2h3" strokeWidth="1.5"/></svg>
            </button>
          </Tip>
          <Sep/>
          <Tip label="Aumentar sangría">
            <button className="ke-ghost" onMouseDown={e => { e.preventDefault(); exec('indent'); }} style={ghost}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="12" x2="21" y2="12"/><line x1="7" y1="18" x2="21" y2="18"/><polyline points="3,9 6,12 3,15"/></svg>
            </button>
          </Tip>
          <Tip label="Reducir sangría">
            <button className="ke-ghost" onMouseDown={e => { e.preventDefault(); exec('outdent'); }} style={ghost}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="12" x2="21" y2="12"/><line x1="7" y1="18" x2="21" y2="18"/><polyline points="9,9 6,12 9,15"/></svg>
            </button>
          </Tip>
          <Sep/>
          <Tip label="Cita destacada">
            <button className="ke-ghost" onMouseDown={e => { e.preventDefault(); exec('formatBlock','blockquote'); }} style={ghost}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
            </button>
          </Tip>
          <Tip label="Insertar enlace">
            <button className="ke-ghost" onMouseDown={e => { e.preventDefault(); const u = prompt('URL:'); if (u) exec('createLink', u); }} style={ghost}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </button>
          </Tip>
          <Tip label="Insertar tabla">
            <button className="ke-ghost" onMouseDown={e => { e.preventDefault(); insertTable(); }} style={ghost}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
            </button>
          </Tip>
          <Tip label="Línea separadora">
            <button className="ke-ghost" onMouseDown={e => { e.preventDefault(); exec('insertHTML','<hr style="border:none;border-top:2px solid #bfdbfe;margin:12px 0"><p><br></p>'); }} style={ghost}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="12" x2="21" y2="12"/></svg>
            </button>
          </Tip>
          <Sep/>
          <Tip label="Deshacer">
            <button className="ke-ghost" onMouseDown={e => { e.preventDefault(); exec('undo'); }} style={ghost}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
            </button>
          </Tip>
          <Tip label="Rehacer">
            <button className="ke-ghost" onMouseDown={e => { e.preventDefault(); exec('redo'); }} style={ghost}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
            </button>
          </Tip>
          <Sep/>
          <Tip label="Limpiar formato">
            <button className="ke-ghost" onMouseDown={e => { e.preventDefault(); exec('removeFormat'); exec('formatBlock','p'); }} style={{ ...ghost, color: '#ef4444' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 7l4-4 12 12-4 4z"/><line x1="2" y1="22" x2="22" y2="2" opacity="0.5"/></svg>
            </button>
          </Tip>
        </div>
      </div>

      {/* ── DOCUMENT PAGE ── */}
      <div className="ke-page-wrap">
        <div className="ke-page">
          <div
            ref={editorRef}
            className="ke-editor"
            contentEditable
            suppressContentEditableWarning
            onInput={updateStats} onKeyUp={updateStats} onMouseUp={updateStats} onSelect={updateStats}
            spellCheck={false}
          />
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div className="ke-statusbar">
        <div>
          <span className="ke-stat"><strong>{wordCount}</strong>&nbsp;palabras</span>
          <span className="ke-stat"><strong>{charCount}</strong>&nbsp;caracteres</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ke-btn ke-btn-cancel" onClick={onCancel}>Cancelar</button>
          <button className="ke-btn ke-btn-save" onClick={() => onSave(editorRef.current?.innerHTML ?? '')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Guardar entrada
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════ */
export default function BaseConocimientosPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  // Modal crear categoría
  const [showCrearCat, setShowCrearCat]   = useState(false);
  const [newCatName, setNewCatName]       = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Wizard
  const [wizardOpen, setWizardOpen]       = useState(false);
  const [wizardStep, setWizardStep]       = useState(1);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [wizardTitulo, setWizardTitulo] = useState('');   // title input in step 2
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showNewSubModal, setShowNewSubModal] = useState(false);
  const [newSubModalName, setNewSubModalName] = useState('');
  const [newSubParent, setNewSubParent] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingSub, setEditingSub] = useState<{ catId: string; subId: string; name: string } | null>(null);
  const [editingSubName, setEditingSubName] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);     // increment to force remount
  const [loadingEdit, setLoadingEdit] = useState(false);
  // tree filter
  const [filterCatId, setFilterCatId] = useState<string | null>(null);
  const [filterSubId, setFilterSubId] = useState<string | null>(null);

  // Inline add sub dentro del wizard
  const [addingSubForCat, setAddingSubForCat] = useState<string | null>(null);
  const [inlineSubName, setInlineSubName]     = useState('');

  /* ── Logic ── */
  const addCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    // prevent duplicates (case-insensitive)
    const norm = name.toLowerCase();
    if (categories.some(c => String(c.name || '').trim().toLowerCase() === norm)) {
      setToast({ message: 'Ya existe una categoría con ese nombre', type: 'error' });
      return;
    }
    (async () => {
      try {
        const resp: any = await createCategoria(name);
        const newCat = {
          id: resp.id ?? resp.uuid ?? `c_${Date.now()}`,
          name: resp.nombre ?? resp.name ?? name,
          subcategories: (resp.subcategorias || resp.subcategories || []).map((s: any) => ({ id: s.id ?? s.uuid ?? String(Date.now()), name: s.nombre ?? s.name }))
        } as Category;
        setCategories(s => [...s, newCat]);
        setNewCatName(''); setShowCrearCat(false);
      } catch (err) { console.error(err); alert('Error creando categoría'); }
    })();
  };

  const addSubcategory = (catId: string, name: string) => {
    const sname = name.trim();
    if (!sname) return;
    // prevent duplicate subcategory within the same category (case-insensitive)
    const cat = categories.find(c => c.id === catId);
    if (cat && cat.subcategories.some(s => String(s.name || '').trim().toLowerCase() === sname.toLowerCase())) {
      setToast({ message: 'Ya existe una subcategoría con ese nombre en esta categoría', type: 'error' });
      return;
    }
    (async () => {
      try {
        const resp: any = await createSubcategoria(catId, sname);
        const newSub = { id: resp.id ?? resp.uuid ?? `${catId}_s_${Date.now()}`, name: resp.nombre ?? resp.name ?? sname };
        setCategories(s => s.map(c => c.id === catId ? { ...c, subcategories: [...c.subcategories, newSub] } : c));
      } catch (err) { console.error(err); alert('Error creando subcategoría'); }
    })();
  };

  const confirmInlineSub = () => {
    if (!addingSubForCat || !inlineSubName.trim()) return;
    // use API
    addSubcategory(addingSubForCat, inlineSubName.trim());
    setSelectedSubId(`${addingSubForCat}_s_${Date.now()}`);
    setInlineSubName(''); setAddingSubForCat(null);
  };

  const startNuevaBase = () => {
    setWizardStep(1);
    setWizardTitulo('');
    setSelectedCatId(categories[0]?.id ?? null);
    setSelectedSubId(categories[0]?.subcategories?.[0]?.id ?? null);
    setWizardOpen(true);
  };

  useEffect(() => {
    (async () => {
      try {
        const data: any = await getCategorias();
        const cats: Category[] = (data || []).map((c: any) => {
          const rawId = c.id ?? c.uuid ?? (c.uuid_v4 ? c.uuid_v4 : undefined);
          return ({
            id: String(rawId ?? `c_${Date.now()}`),
            name: c.nombre ?? c.name ?? c.titulo ?? 'Sin nombre',
            raw: c,
            subcategories: (c.subcategorias || c.subcategories || []).map((s: any) => ({ id: s.id ?? s.uuid ?? String(s.id ?? Date.now()), name: s.nombre ?? s.name ?? 'Sin nombre', raw: s }))
          });
        });
        setCategories(cats);
      } catch (err) { console.error(err); /* silent fail */ }
    })();
    // load latest entries
    (async () => {
      try {
        const res: any = await getEntradas();
        const setE: Entry[] = (res || []).map((e: any) => ({ id: e.id ?? e.uuid ?? String(e.id), titulo: e.titulo ?? e.title ?? 'Sin título', contenido_html: e.contenido_html ?? e.contenidoHtml ?? '', categoria_id: e.categoria_id ?? e.categoriaId ?? null, subcategoria_id: e.subcategoria_id ?? e.subcategoriaId ?? null, status: e.status ?? 'DRAFT', raw: e }));
        setEntries(setE);
      } catch (err) { console.error('No se pudieron cargar entradas', err); }
    })();
  }, []);

  const selectedCat = categories.find(c => c.id === selectedCatId);

  return (
    <>
      {/* ══════════════════════ GLOBAL STYLES ══════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        /* ── PAGE ── */
        .kb-root { font-family:'DM Sans',sans-serif; min-height:100vh; background:#f0f6ff; padding:2rem 2.5rem; }

        /* ── HEADER ── */
        .kb-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:2rem; padding-bottom:1.25rem; border-bottom:1.5px solid #c8ddf8; }
        .kb-header-title { display:flex; align-items:center; gap:.75rem; }
        .kb-header-icon { width:2.25rem; height:2.25rem; background:linear-gradient(135deg,#1d6fd8,#38bdf8); border-radius:8px; display:flex; align-items:center; justify-content:center; }
        .kb-header-icon svg { color:#fff; }
        .kb-title-text h1 { font-size:1.125rem; font-weight:700; color:#0f2a52; margin:0; letter-spacing:-.02em; }
        .kb-title-text p { font-size:.75rem; color:#5b84b8; margin:0; }
        .kb-actions { display:flex; gap:.625rem; }

        /* ── BUTTONS ── */
        .btn { display:inline-flex; align-items:center; gap:.375rem; font-family:'DM Sans',sans-serif; font-size:.8125rem; font-weight:600; padding:.5rem 1rem; border-radius:7px; border:none; cursor:pointer; transition:all .15s; letter-spacing:.01em; }
        .btn-outline { background:#fff; color:#1d6fd8; border:1.5px solid #93c5fd; }
        .btn-outline:hover { background:#eff6ff; border-color:#1d6fd8; }
        .btn-primary { background:linear-gradient(135deg,#1d6fd8,#2563eb); color:#fff; box-shadow:0 2px 8px rgba(29,111,216,.25); }
        .btn-primary:hover { background:linear-gradient(135deg,#1a5fc0,#1d4ed8); box-shadow:0 4px 14px rgba(29,111,216,.35); transform:translateY(-1px); }
        .btn-ghost { background:transparent; color:#475569; border:1.5px solid #e2e8f0; }
        .btn-ghost:hover { background:#f8fafc; border-color:#cbd5e1; }
        .btn-sm { font-size:.75rem; padding:.3125rem .75rem; }

        /* ── EMPTY STATE ── */
        .kb-empty { grid-column:1/-1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:4rem 2rem; background:#fff; border-radius:12px; border:1.5px dashed #93c5fd; text-align:center; gap:.75rem; }
        .kb-empty-icon { width:3rem; height:3rem; background:#eff6ff; border-radius:50%; display:flex; align-items:center; justify-content:center; }
        .kb-empty h3 { font-size:.9375rem; font-weight:600; color:#1e3a5f; margin:0; }
        .kb-empty p { font-size:.8125rem; color:#64748b; margin:0; }

        /* ── CATEGORY GRID ── */
        .kb-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:1.125rem; }
        .kb-card { background:#fff; border-radius:12px; border:1px solid #dbeafe; box-shadow:0 1px 4px rgba(30,58,138,.06); overflow:hidden; transition:box-shadow .2s,transform .2s; }
        .kb-card:hover { box-shadow:0 6px 20px rgba(30,58,138,.10); transform:translateY(-2px); }
        .kb-card-header { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem .75rem; border-bottom:1px solid #eff6ff; }
        .kb-card-left { display:flex; align-items:center; gap:.625rem; }
        .kb-card-dot { width:.5rem; height:.5rem; border-radius:50%; background:linear-gradient(135deg,#1d6fd8,#38bdf8); flex-shrink:0; }
        .kb-card-name { font-size:.9rem; font-weight:700; color:#0f2a52; letter-spacing:-.01em; }
        .kb-badge { font-family:'DM Mono',monospace; font-size:.6875rem; font-weight:500; padding:.1875rem .625rem; background:#eff6ff; color:#1d6fd8; border-radius:999px; border:1px solid #bfdbfe; white-space:nowrap; }
        .kb-card-body { padding:.75rem 1.25rem 1rem; }
        .kb-sub-list { list-style:none; margin:0 0 .75rem; padding:0; display:flex; flex-direction:column; gap:.3125rem; }
        .kb-sub-item { display:flex; align-items:center; gap:.5rem; font-size:.8rem; color:#334155; padding:.3125rem .625rem; background:#f8fbff; border-radius:6px; border:1px solid #e0eeff; }
        .kb-sub-item::before { content:''; display:block; width:5px; height:5px; border-radius:50%; background:#93c5fd; flex-shrink:0; }
        .kb-sub-empty { font-size:.78rem; color:#94a3b8; font-style:italic; padding:.25rem 0; }
        .kb-card-footer { padding:0 1.25rem 1rem; display:flex; justify-content:flex-end; }

        /* ── MODAL OVERLAY ── */
        .kb-overlay { position:fixed; inset:0; z-index:50; display:flex; align-items:center; justify-content:center; padding:1rem; background:rgba(8,28,60,.48); backdrop-filter:blur(4px); }
        .kb-modal { background:#fff; border-radius:14px; box-shadow:0 24px 64px rgba(8,28,60,.22); width:100%; max-width:480px; overflow:hidden; }
        .kb-modal-wide { max-width:980px; max-height:94vh; overflow-y:auto; }
        .kb-modal-head { display:flex; align-items:center; justify-content:space-between; padding:1.125rem 1.5rem; background:linear-gradient(90deg,#1e3a8a,#1d6fd8); position:sticky; top:0; z-index:10; }
        .kb-modal-head h2 { font-size:.9375rem; font-weight:700; color:#fff; margin:0; letter-spacing:-.01em; }
        .kb-modal-close { background:rgba(255,255,255,.15); border:none; color:#fff; width:1.75rem; height:1.75rem; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1rem; transition:background .15s; }
        .kb-modal-close:hover { background:rgba(255,255,255,.28); }
        .kb-modal-body { padding:1.5rem; }
        .kb-modal-footer { padding:0 1.5rem 1.5rem; display:flex; justify-content:flex-end; gap:.625rem; }

        /* ── FORM ── */
        .kb-field { margin-bottom:1rem; }
        .kb-field label { display:block; font-size:.78rem; font-weight:600; color:#1e3a5f; margin-bottom:.375rem; text-transform:uppercase; letter-spacing:.04em; }
        .kb-input { width:100%; padding:.5625rem .875rem; border:1.5px solid #cbd5e1; border-radius:7px; font-family:'DM Sans',sans-serif; font-size:.875rem; color:#0f172a; background:#fafcff; transition:border-color .15s,box-shadow .15s; outline:none; }
        .kb-input:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.12); background:#fff; }
        .kb-select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%231d6fd8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right .75rem center; padding-right:2.5rem; }

        /* ── WIZARD STEPS ── */
        .kb-steps { display:flex; align-items:center; margin-bottom:1.75rem; }
        .kb-step { display:flex; align-items:center; gap:.5rem; }
        .kb-step-circle { width:1.75rem; height:1.75rem; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:.75rem; font-weight:700; flex-shrink:0; transition:all .2s; }
        .kb-step-circle.active { background:linear-gradient(135deg,#1d6fd8,#38bdf8); color:#fff; box-shadow:0 2px 8px rgba(29,111,216,.3); }
        .kb-step-circle.done { background:#dcfce7; color:#16a34a; }
        .kb-step-circle.inactive { background:#f1f5f9; color:#94a3b8; border:1.5px solid #e2e8f0; }
        .kb-step-label { font-size:.75rem; font-weight:600; color:#334155; }
        .kb-step-label.active-lbl { color:#1d6fd8; }
        .kb-step-connector { flex:1; height:1.5px; background:#bfdbfe; margin:0 .75rem; }

        /* ── STEP 1 CARDS ── */
        .kb-step1-grid { display:grid; grid-template-columns:1fr 1fr; gap:1.125rem; }
        .kb-cat-card { border:1.5px solid #dbeafe; border-radius:10px; overflow:hidden; background:#fafcff; transition:border-color .15s; }
        .kb-cat-card.selected { border-color:#1d6fd8; box-shadow:0 0 0 3px rgba(29,111,216,.10); }
        .kb-cat-card-head { display:flex; align-items:center; justify-content:space-between; padding:.625rem .875rem; background:#f0f6ff; border-bottom:1px solid #e0eeff; cursor:pointer; transition:background .12s; }
        .kb-cat-card-head:hover { background:#e6f0fd; }
        .kb-cat-card-head.sel-head { background:linear-gradient(90deg,#dbeafe,#e0f2fe); }
        .kb-radio-dot { width:14px; height:14px; border-radius:50%; border:2px solid #93c5fd; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .15s; }
        .kb-radio-dot.checked { border-color:#1d6fd8; background:#1d6fd8; }
        .kb-radio-dot.checked::after { content:''; width:5px; height:5px; border-radius:50%; background:#fff; display:block; }
        .kb-cat-card-name { font-size:.825rem; font-weight:700; color:#0f2a52; }
        .kb-cat-card-body { padding:.5rem .75rem .75rem; }
        .kb-sub-option { display:flex; align-items:center; gap:.5rem; padding:.3125rem .5rem; border-radius:6px; cursor:pointer; transition:background .12s; margin-bottom:2px; }
        .kb-sub-option:hover { background:#eff6ff; }
        .kb-sub-option.sub-sel { background:#dbeafe; }
        .kb-sub-radio { width:12px; height:12px; border-radius:50%; border:2px solid #93c5fd; flex-shrink:0; transition:all .15s; display:flex; align-items:center; justify-content:center; }
        .kb-sub-radio.checked { border-color:#1d6fd8; background:#1d6fd8; }
        .kb-sub-radio.checked::after { content:''; width:4px; height:4px; border-radius:50%; background:#fff; display:block; }
        .kb-sub-name { font-size:.775rem; color:#334155; }
        .kb-inline-add { display:flex; gap:.375rem; margin-top:.375rem; padding-top:.375rem; border-top:1px dashed #dbeafe; }
        .kb-inline-input { flex:1; padding:.3rem .6rem; border:1.5px solid #dbeafe; border-radius:6px; font-family:'DM Sans',sans-serif; font-size:.775rem; color:#0f172a; background:#fff; outline:none; }
        .kb-inline-input:focus { border-color:#1d6fd8; }
        .kb-inline-ok { padding:.3rem .6rem; border:none; border-radius:6px; font-family:'DM Sans',sans-serif; font-size:.75rem; font-weight:600; cursor:pointer; background:#1d6fd8; color:#fff; }
        .kb-inline-no { padding:.3rem .6rem; border:none; border-radius:6px; font-family:'DM Sans',sans-serif; font-size:.75rem; font-weight:600; cursor:pointer; background:#f1f5f9; color:#64748b; }
        .kb-add-sub-link { display:inline-flex; align-items:center; gap:3px; font-size:.75rem; color:#1d6fd8; font-weight:500; cursor:pointer; margin-top:4px; padding:2px 4px; border-radius:4px; transition:background .12s; border:none; background:transparent; font-family:'DM Sans',sans-serif; }
        .kb-add-sub-link:hover { background:#eff6ff; }
        .kb-step1-hint { font-size:.78rem; color:#64748b; margin-bottom:1rem; background:#f0f6ff; padding:.5rem .875rem; border-radius:7px; border-left:3px solid #38bdf8; }
        .kb-no-cats { grid-column:1/-1; text-align:center; padding:2rem; }

        /* ── KNOWLEDGE EDITOR ── */
        .ke-wrap { font-family:'DM Sans',sans-serif; display:flex; flex-direction:column; border-radius:10px; overflow:hidden; border:1.5px solid #bfdbfe; box-shadow:0 4px 24px rgba(29,111,216,.10); background:#f0f6ff; }
        .ke-toolbar { background:linear-gradient(180deg,#fff,#f5f9ff); border-bottom:1.5px solid #dbeafe; padding:6px 10px; display:flex; flex-direction:column; gap:5px; }
        .ke-toolbar-row { display:flex; align-items:center; gap:2px; flex-wrap:wrap; }
        .ke-sel { font-family:'DM Sans',sans-serif; font-size:12px; font-weight:500; color:#1e3a5f; background:#fff; border:1.5px solid #dbeafe; border-radius:6px; padding:2px 6px; cursor:pointer; height:26px; outline:none; transition:border-color .15s; }
        .ke-sel:hover,.ke-sel:focus { border-color:#1d6fd8; }
        .ke-hbtn { height:26px; padding:0 8px; border:1.5px solid #dbeafe; border-radius:5px; background:#fff; color:#1e3a5f; font-size:11px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; flex-shrink:0; transition:background .12s; }
        .ke-hbtn:hover { background:#eff6ff; }
        .ke-ghost:hover { background:#eff6ff !important; }
        .ke-color-wrap { position:relative; display:inline-flex; flex-direction:column; align-items:center; cursor:pointer; }
        .ke-color-btn { width:28px; height:26px; border:1.5px solid #dbeafe; border-radius:5px; background:#fff; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; transition:border-color .15s; }
        .ke-color-btn:hover { border-color:#1d6fd8; background:#eff6ff; }
        .ke-color-bar { width:14px; height:3px; border-radius:2px; }
        .ke-color-input { position:absolute; width:1px; height:1px; opacity:0; top:0; left:0; }
        .ke-page-wrap { background:#dce8fa; padding:20px; min-height:340px; max-height:400px; display:flex; justify-content:center; overflow-y:auto; }
        .ke-page { background:#fff; width:100%; max-width:740px; min-height:320px; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(29,111,216,.07),0 0 0 1px rgba(191,219,254,.6); padding:40px 52px; }
        .ke-editor { outline:none; min-height:260px; font-family:'DM Sans',sans-serif; font-size:14px; line-height:1.75; color:#1e293b; caret-color:#1d6fd8; }
        .ke-editor:empty::before { content:'Comienza a escribir aquí...'; color:#94a3b8; pointer-events:none; }
        .ke-editor p{margin:0 0 .5em} .ke-editor h1{font-size:2em;font-weight:700;color:#0f2a52;margin:.5em 0 .25em;line-height:1.2} .ke-editor h2{font-size:1.5em;font-weight:700;color:#0f2a52;margin:.5em 0 .25em} .ke-editor h3{font-size:1.17em;font-weight:700;color:#1e3a5f;margin:.5em 0 .25em}
        .ke-editor ul,.ke-editor ol{margin:.25em 0 .5em 1.5em} .ke-editor li{margin-bottom:.2em} .ke-editor table{border-collapse:collapse;width:100%;margin:8px 0} .ke-editor td,.ke-editor th{border:1px solid #bfdbfe;padding:6px 10px} .ke-editor a{color:#1d6fd8;text-decoration:underline} .ke-editor hr{border:none;border-top:2px solid #bfdbfe;margin:12px 0} .ke-editor blockquote{border-left:3px solid #38bdf8;margin:.5em 0;padding:6px 14px;color:#475569;background:#f0f9ff;border-radius:0 6px 6px 0}
        .ke-statusbar { background:linear-gradient(180deg,#f5f9ff,#eff6ff); border-top:1.5px solid #dbeafe; padding:6px 14px; display:flex; align-items:center; justify-content:space-between; }
        .ke-stat { font-size:11px; color:#5b84b8; font-weight:500; display:inline-flex; align-items:center; gap:4px; margin-right:12px; }
        .ke-stat strong { color:#1e3a5f; }
        .ke-btn { font-family:'DM Sans',sans-serif; font-size:12.5px; font-weight:600; padding:5px 14px; border-radius:6px; border:none; cursor:pointer; transition:all .15s; display:inline-flex; align-items:center; gap:5px; }
        .ke-btn-cancel { background:#fff; color:#475569; border:1.5px solid #cbd5e1; }
        .ke-btn-cancel:hover { background:#f8fafc; border-color:#94a3b8; }
        .ke-btn-save { background:linear-gradient(135deg,#1d6fd8,#2563eb); color:#fff; box-shadow:0 2px 8px rgba(29,111,216,.25); }
        .ke-btn-save:hover { background:linear-gradient(135deg,#1a5fc0,#1d4ed8); transform:translateY(-1px); }

        /* ── CONTEXT PILL ── */
        .kb-ctx-pill { display:flex; align-items:center; gap:.5rem; margin-bottom:1rem; padding:.5rem .875rem; background:#eff6ff; border-radius:8px; border:1px solid #dbeafe; }
        .kb-ctx-pill span { font-size:.775rem; color:#1e3a5f; font-weight:500; }
        .kb-ctx-pill .sep { color:#93c5fd; margin:0 4px; }
      `}</style>

      {/* Toast notifications */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* ══════════════════════════════════════════════════════
          PAGE
      ══════════════════════════════════════════════════════ */}
      <div className="kb-root">

        {/* Header */}
        <div className="kb-header">
          <div className="kb-header-title">
            <div className="kb-header-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            {/* page title removed to avoid duplicate header (global Header provides breadcrumb/title) */}
          </div>
          <div className="kb-actions">
            <button onClick={() => setShowCrearCat(true)} className="btn btn-outline">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Crear Categoría
            </button>
          </div>
        </div>

        {/* ── TWO-PANEL: tree + entry cards ── */}
        {loadingEdit && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,28,60,.35)', backdropFilter: 'blur(3px)' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem 2rem', color: '#1e3a5f', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d6fd8" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Cargando entrada…
            </div>
          </div>
        )}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

        {categories.length === 0 ? (
          /* ── Empty state ── */
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'5rem 2rem', background:'#fff', borderRadius:14, border:'1.5px dashed #93c5fd', textAlign:'center', gap:12 }}>
            <div style={{ width:52, height:52, background:'#eff6ff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d6fd8" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <div style={{ fontWeight:700, color:'#0f2a52', fontSize:'0.95rem' }}>Sin categorías registradas</div>
            <div style={{ color:'#64748b', fontSize:'.825rem' }}>Crea tu primera categoría para organizar la base de conocimientos.</div>
            <button onClick={() => setShowCrearCat(true)} className="btn btn-primary" style={{ marginTop:4 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Crear primera categoría
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', gap:0, background:'#fff', borderRadius:14, border:'1px solid #dbeafe', overflow:'hidden', minHeight:480 }}>

            {/* ─── LEFT TREE ─── */}
            <div style={{ width:240, flexShrink:0, borderRight:'1px solid #dbeafe', background:'#f8fbff', padding:'1rem 0', overflowY:'auto' }}>
              {/* All entries row */}
              <button onClick={() => { setFilterCatId(null); setFilterSubId(null); }} style={{ width:'100%', textAlign:'left', padding:'.5rem 1.125rem', border:'none', fontFamily:"'DM Sans',sans-serif", fontSize:'.8125rem', fontWeight:600, cursor:'pointer', background: !filterCatId ? '#dbeafe' : 'transparent', color: !filterCatId ? '#1d4ed8' : '#475569', display:'flex', alignItems:'center', gap:6, transition:'background .12s' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M3 14h7v7H3z"/><path d="M14 14h7v7h-7z"/></svg>
                Todas las entradas
                <span style={{ marginLeft:'auto', background:'#bfdbfe', color:'#1d4ed8', borderRadius:999, padding:'1px 7px', fontSize:'.65rem', fontFamily:"'DM Mono',monospace" }}>{entries.length}</span>
              </button>
              {categories.map(cat => {
                const cId = cat.raw?.id ?? cat.id;
                const cEntries = entries.filter(e => String(e.categoria_id) === String(cId));
                const isCatActive = filterCatId === cat.id && !filterSubId;
                return (
                  <div key={cat.id}>
                    {/* Category row */}
                    <button onClick={() => { setFilterCatId(cat.id); setFilterSubId(null); }} style={{ width:'100%', textAlign:'left', padding:'.5rem 1.125rem', border:'none', fontFamily:"'DM Sans',sans-serif", fontSize:'.8125rem', fontWeight:700, cursor:'pointer', background: isCatActive ? '#dbeafe' : 'transparent', color: isCatActive ? '#1d4ed8' : '#0f2a52', display:'flex', alignItems:'center', gap:6, transition:'background .12s' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill={isCatActive ? '#1d6fd8' : '#93c5fd'} stroke="none"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                      {cat.name}
                      <span style={{ marginLeft:'auto', background: isCatActive ? '#bfdbfe' : '#f0f6ff', color:'#1d6fd8', borderRadius:999, padding:'1px 7px', fontSize:'.65rem', fontFamily:"'DM Mono',monospace" }}>{cEntries.length}</span>
                    </button>
                    {/* Subcategory rows */}
                    {cat.subcategories.map(sub => {
                      const sId = sub.raw?.id ?? sub.id;
                      const sEntries = entries.filter(e => String(e.categoria_id) === String(cId) && String(e.subcategoria_id) === String(sId));
                      const isSubActive = filterCatId === cat.id && filterSubId === sub.id;
                      return (
                        <div key={sub.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'.375rem 1.125rem .375rem 2.375rem' }}>
                          <button onClick={() => { setFilterCatId(cat.id); setFilterSubId(sub.id); }} style={{ flex:1, textAlign:'left', border:'none', background:'transparent', fontFamily:"'DM Sans',sans-serif", fontSize:'.775rem', fontWeight:500, cursor:'pointer', color: isSubActive ? '#1d4ed8' : '#475569' }}>
                            <span style={{ color:'#bfdbfe', fontSize:'1rem', lineHeight:1, flexShrink:0, marginRight:6 }}>├</span>
                            {sub.name}
                          </button>
                          <span style={{ background: isSubActive ? '#bfdbfe' : '#f0f6ff', color:'#1d6fd8', borderRadius:999, padding:'1px 6px', fontSize:'.62rem', fontFamily:"'DM Mono',monospace" }}>{sEntries.length}</span>
                          <button title="Editar subcategoría" onClick={() => { setEditingSub({ catId: cat.id, subId: sub.id, name: sub.name }); setEditingSubName(sub.name); }} style={{ border:'none', background:'transparent', color:'#2563eb', cursor:'pointer', padding:6 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                          </button>
                        </div>
                      );
                    })}
                    {/* Add subcategory */}
                    <button onClick={() => { setNewSubParent(cat); setNewSubModalName(''); setShowNewSubModal(true); }} style={{ width:'100%', textAlign:'left', padding:'.3rem 1.125rem .3rem 2.375rem', border:'none', fontFamily:"'DM Sans',sans-serif", fontSize:'.72rem', fontWeight:500, cursor:'pointer', background:'transparent', color:'#93c5fd', display:'flex', alignItems:'center', gap:5, transition:'color .12s' }}>
                      <span style={{ color:'#bfdbfe', flexShrink:0 }}>└</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                      Añadir subcategoría
                    </button>
                    {/* edit category button */}
                    <button title="Editar categoría" onClick={() => { setEditingCategory(cat); setEditingCatName(cat.name); }} style={{ marginTop:6, width:'100%', textAlign:'left', padding:'.25rem 1.125rem .25rem 2.375rem', border:'none', fontFamily:"'DM Sans',sans-serif", fontSize:'.70rem', fontWeight:500, cursor:'pointer', background:'transparent', color:'#1d6fd8', display:'flex', alignItems:'center', gap:8 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                      Editar categoría
                    </button>
                  </div>
                );
              })}
            </div>

            {/* New Subcategory Modal */}
            {showNewSubModal && (
              <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:1200 }}>
                <div onClick={() => { setShowNewSubModal(false); setNewSubModalName(''); setNewSubParent(null); }} style={{ position:'absolute', inset:0, background:'rgba(13,42,88,0.45)' }} />
                <div style={{ position:'relative', width:480, maxWidth:'94%', background:'#ffffff', borderRadius:12, boxShadow:'0 8px 30px rgba(13,42,88,0.18)', padding:18, border:`1px solid rgba(29,111,216,0.06)` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                    <div style={{ width:44, height:44, borderRadius:10, background:'linear-gradient(180deg,#93c5fd 0%,#1d4ed8 100%)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700 }}>+</div>
                    <div>
                      <div style={{ fontSize:16, fontWeight:700, color:'#0f2a52' }}>Nueva subcategoría</div>
                      <div style={{ fontSize:12, color:'#4b6b95' }}>{newSubParent ? `en ${newSubParent.name}` : ''}</div>
                    </div>
                  </div>
                  <div style={{ marginTop:6 }}>
                    <label style={{ display:'block', fontSize:12, color:'#37558a', marginBottom:6 }}>Nombre</label>
                    <input autoFocus value={newSubModalName} onChange={e => setNewSubModalName(e.target.value)} placeholder="Nombre de la subcategoría" style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #e6f0ff', outline:'none', boxShadow:'inset 0 1px 0 rgba(13,42,88,0.02)' }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:14 }}>
                    <button onClick={() => { setShowNewSubModal(false); setNewSubModalName(''); setNewSubParent(null); }} className="btn btn-ghost">Cancelar</button>
                    <button onClick={() => {
                      if (!newSubParent) return;
                      if (!newSubModalName.trim()) { alert('Ingrese un nombre para la subcategoría'); return; }
                      addSubcategory(newSubParent.id, newSubModalName.trim());
                      setShowNewSubModal(false); setNewSubModalName(''); setNewSubParent(null);
                    }} className="btn btn-primary">Crear</button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Category Modal */}
            {editingCategory && (
              <div className="kb-overlay">
                <div className="kb-modal">
                  <div className="kb-modal-head">
                    <h2>Editar categoría</h2>
                    <button onClick={() => { setEditingCategory(null); setEditingCatName(''); }} className="kb-modal-close">✕</button>
                  </div>
                  <div className="kb-modal-body">
                    <div className="kb-field">
                      <label>Nombre</label>
                      <input value={editingCatName} onChange={e => setEditingCatName(e.target.value)} className="kb-input" />
                    </div>
                  </div>
                  <div className="kb-modal-footer">
                    <button onClick={() => { setEditingCategory(null); setEditingCatName(''); }} className="btn btn-ghost">Cancelar</button>
                    <button onClick={async () => {
                      const name = editingCatName.trim();
                      if (!name) { setToast({ message: 'Ingrese un nombre válido', type: 'error' }); return; }
                      // duplicate check
                      if (categories.some(c => c.id !== editingCategory.id && String(c.name||'').trim().toLowerCase() === name.toLowerCase())) {
                        setToast({ message: 'Ya existe una categoría con ese nombre', type: 'error' });
                        return;
                      }
                      try {
                        await (await import('@/modules/baseConocimientos/services/baseConocimientosService')).updateCategoria(String(editingCategory.raw?.id ?? editingCategory.id), name);
                        setCategories(s => s.map(c => c.id === editingCategory.id ? { ...c, name } : c));
                        setToast({ message: 'Categoría actualizada', type: 'success' });
                        setEditingCategory(null); setEditingCatName('');
                      } catch (err) { console.error(err); setToast({ message: 'Error actualizando categoría', type: 'error' }); }
                    }} className="btn btn-primary">Guardar</button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Subcategory Modal */}
            {editingSub && (
              <div className="kb-overlay">
                <div className="kb-modal">
                  <div className="kb-modal-head">
                    <h2>Editar subcategoría</h2>
                    <button onClick={() => { setEditingSub(null); setEditingSubName(''); }} className="kb-modal-close">✕</button>
                  </div>
                  <div className="kb-modal-body">
                    <div className="kb-field">
                      <label>Nombre</label>
                      <input value={editingSubName} onChange={e => setEditingSubName(e.target.value)} className="kb-input" />
                    </div>
                  </div>
                  <div className="kb-modal-footer">
                    <button onClick={() => { setEditingSub(null); setEditingSubName(''); }} className="btn btn-ghost">Cancelar</button>
                    <button onClick={async () => {
                      const name = editingSubName.trim();
                      if (!name) { setToast({ message: 'Ingrese un nombre válido', type: 'error' }); return; }
                      const cat = categories.find(c => c.id === editingSub.catId);
                      if (cat && cat.subcategories.some(s => s.id !== editingSub.subId && String(s.name||'').trim().toLowerCase() === name.toLowerCase())) {
                        setToast({ message: 'Ya existe una subcategoría con ese nombre en esta categoría', type: 'error' });
                        return;
                      }
                      try {
                        await (await import('@/modules/baseConocimientos/services/baseConocimientosService')).updateSubcategoria(String(editingSub.subId), name);
                        setCategories(s => s.map(c => c.id === editingSub.catId ? { ...c, subcategories: c.subcategories.map(sb => sb.id === editingSub.subId ? { ...sb, name } : sb) } : c));
                        setToast({ message: 'Subcategoría actualizada', type: 'success' });
                        setEditingSub(null); setEditingSubName('');
                      } catch (err) { console.error(err); setToast({ message: 'Error actualizando subcategoría', type: 'error' }); }
                    }} className="btn btn-primary">Guardar</button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── RIGHT ENTRIES ─── */}
            <div style={{ flex:1, padding:'1.25rem 1.5rem', overflowY:'auto' }}>
              {/* Breadcrumb filter label */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                <div style={{ fontSize:'.8125rem', color:'#5b84b8', fontWeight:500 }}>
                  {!filterCatId ? 'Todas las entradas' : (
                    <>
                      {categories.find(c => c.id === filterCatId)?.name}
                      {filterSubId && <> › {categories.find(c => c.id === filterCatId)?.subcategories.find(s => s.id === filterSubId)?.name}</>}
                    </>
                  )}
                </div>
                <button onClick={startNuevaBase} className="btn btn-primary" style={{ fontSize:'.75rem', padding:'.3rem .75rem' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  Nueva entrada
                </button>
              </div>
              {(() => {
                const filtered = entries.filter(en => {
                  if (!filterCatId) return true;
                  const cat = categories.find(c => c.id === filterCatId);
                  const cId = cat?.raw?.id ?? cat?.id;
                  if (String(en.categoria_id) !== String(cId)) return false;
                  if (!filterSubId) return true;
                  const sub = cat?.subcategories.find(s => s.id === filterSubId);
                  const sId = sub?.raw?.id ?? sub?.id;
                  return String(en.subcategoria_id) === String(sId);
                });
                if (filtered.length === 0) return (
                  <div style={{ textAlign:'center', padding:'3rem 1rem', color:'#94a3b8', fontSize:'.85rem' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ display:'block', margin:'0 auto .75rem' }}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    No hay entradas aquí aún.
                  </div>
                );
                return (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {filtered.map(en => {
                      const cat = categories.find(c => String(c.raw?.id ?? c.id) === String(en.categoria_id));
                      const sub = cat?.subcategories.find(s => String(s.raw?.id ?? s.id) === String(en.subcategoria_id));
                      const preview = en.contenido_html ? en.contenido_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g,' ').trim().slice(0,120) : '';
                      return (
                        <div key={en.id} style={{ background:'#fafcff', border:'1px solid #e6f0fe', borderRadius:10, padding:'14px 16px', display:'flex', gap:14, alignItems:'flex-start', transition:'box-shadow .15s, border-color .15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow='0 4px 16px rgba(29,111,216,.10)'; (e.currentTarget as HTMLElement).style.borderColor='#93c5fd'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow='none'; (e.currentTarget as HTMLElement).style.borderColor='#e6f0fe'; }}>
                          {/* File icon */}
                          <div style={{ width:36, height:40, background:'linear-gradient(135deg,#dbeafe,#e0f2fe)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:'1px solid #bfdbfe' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d6fd8" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:700, color:'#0f2a52', fontSize:'.875rem', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{en.titulo}</div>
                            <div style={{ fontSize:'.75rem', color:'#5b84b8', marginBottom:4, display:'flex', alignItems:'center', gap:4 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                              {cat?.name ?? '—'}
                              {sub && <> › {sub.name}</>}
                            </div>
                            {preview && <div style={{ fontSize:'.775rem', color:'#64748b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{preview}…</div>}
                          </div>
                          <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:'.7rem', fontWeight:600, padding:'2px 8px', borderRadius:999, background: en.status === 'PUBLISHED' ? '#dcfce7' : '#f0f6ff', color: en.status === 'PUBLISHED' ? '#16a34a' : '#1d6fd8', border: `1px solid ${en.status === 'PUBLISHED' ? '#bbf7d0' : '#bfdbfe'}`, whiteSpace:'nowrap' }}>
                              {en.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                            </span>
                            <button className="btn btn-ghost btn-sm" onClick={async () => {
                              setLoadingEdit(true);
                              try {
                                const full: any = await getEntrada(en.id);
                                setEditingEntryId(en.id);
                                setEditingContent(full.contenido_html ?? full.contenidoHtml ?? en.contenido_html ?? '');
                                setWizardTitulo(en.titulo ?? '');
                                const cat = categories.find(c => String(c.raw?.id ?? c.id) === String(en.categoria_id));
                                const sub = cat?.subcategories.find(s => String(s.raw?.id ?? s.id) === String(en.subcategoria_id));
                                setSelectedCatId(cat?.id ?? null);
                                setSelectedSubId(sub?.id ?? null);
                                setEditorKey(k => k + 1);
                                setWizardStep(2);
                                setWizardOpen(true);
                              } catch {
                                setEditingContent(en.contenido_html ?? '');
                                setEditingEntryId(en.id);
                                setWizardTitulo(en.titulo ?? '');
                                const cat = categories.find(c => String(c.raw?.id ?? c.id) === String(en.categoria_id));
                                const sub = cat?.subcategories.find(s => String(s.raw?.id ?? s.id) === String(en.subcategoria_id));
                                setSelectedCatId(cat?.id ?? null);
                                setSelectedSubId(sub?.id ?? null);
                                setEditorKey(k => k + 1);
                                setWizardStep(2);
                                setWizardOpen(true);
                              } finally { setLoadingEdit(false); }
                            }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              Editar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════
            MODAL — Crear Categoría
        ══════════════════════════════════════ */}
        {showCrearCat && (
          <div className="kb-overlay">
            <div className="kb-modal">
              <div className="kb-modal-head">
                <h2>Nueva Categoría</h2>
                <button onClick={() => setShowCrearCat(false)} className="kb-modal-close">✕</button>
              </div>
              <div className="kb-modal-body">
                <div className="kb-field">
                  <label>Nombre de la categoría</label>
                  <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                    placeholder="Ej. Recursos Humanos" className="kb-input"
                    onKeyDown={e => e.key === 'Enter' && addCategory()}/>
                </div>
                {/* Subcategoría inicial removed per request */}
              </div>
              <div className="kb-modal-footer">
                <button onClick={() => setShowCrearCat(false)} className="btn btn-ghost">Cancelar</button>
                <button onClick={addCategory} className="btn btn-primary">Crear categoría</button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            MODAL — Wizard nueva entrada
        ══════════════════════════════════════ */}
        {wizardOpen && (
          <div className="kb-overlay">
            <div className="kb-modal kb-modal-wide">

              {/* Header */}
              <div className="kb-modal-head">
                <h2>
                  {wizardStep === 1
                    ? 'Nueva entrada — Paso 1: Seleccionar categoría'
                    : 'Nueva entrada — Paso 2: Redactar contenido'}
                </h2>
                <button onClick={() => { setWizardOpen(false); setEditingEntryId(null); setEditingContent(''); setWizardTitulo(''); }} className="kb-modal-close">✕</button>
              </div>

              <div className="kb-modal-body">
                {/* Step indicator */}
                <div className="kb-steps">
                  <div className="kb-step">
                    <div className={`kb-step-circle ${wizardStep === 1 ? 'active' : 'done'}`}>
                      {wizardStep > 1 ? '✓' : '1'}
                    </div>
                    <span className={`kb-step-label ${wizardStep === 1 ? 'active-lbl' : ''}`}>Categorización</span>
                  </div>
                  <div className="kb-step-connector"/>
                  <div className="kb-step">
                    <div className={`kb-step-circle ${wizardStep === 2 ? 'active' : 'inactive'}`}>2</div>
                    <span className={`kb-step-label ${wizardStep === 2 ? 'active-lbl' : ''}`}>Contenido</span>
                  </div>
                </div>

                {/* ── PASO 1 ── */}
                {wizardStep === 1 && (
                  <>
                    <p className="kb-step1-hint">
                      Selecciona la categoría y subcategoría donde se guardará esta entrada. Puedes agregar subcategorías nuevas directamente desde aquí.
                    </p>

                    {categories.length === 0 ? (
                      <div className="kb-no-cats">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="1.5" style={{margin:'0 auto .75rem',display:'block'}}>
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                        <p style={{margin:'0 0 4px',fontWeight:600,color:'#1e3a5f'}}>No hay categorías aún</p>
                        <p style={{margin:'0 0 1rem',fontSize:'.8rem',color:'#64748b'}}>Crea una categoría primero para poder agregar entradas.</p>
                        <button onClick={() => { setWizardOpen(false); setShowCrearCat(true); }} className="btn btn-primary btn-sm">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                          Crear primera categoría
                        </button>
                      </div>
                    ) : (
                      <div className="kb-step1-grid">
                        {categories.map(c => (
                          <div key={c.id} className={`kb-cat-card ${selectedCatId === c.id ? 'selected' : ''}`}>
                            <div
                              className={`kb-cat-card-head ${selectedCatId === c.id ? 'sel-head' : ''}`}
                              onClick={() => { setSelectedCatId(c.id); setSelectedSubId(c.subcategories[0]?.id ?? null); }}
                            >
                              <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                                <div className={`kb-radio-dot ${selectedCatId === c.id ? 'checked' : ''}`}/>
                                <span className="kb-cat-card-name">{c.name}</span>
                              </div>
                              <span className="kb-badge">{c.subcategories.length}</span>
                            </div>

                            {selectedCatId === c.id && (
                              <div className="kb-cat-card-body">
                                {c.subcategories.length === 0 && addingSubForCat !== c.id && (
                                  <p style={{fontSize:'.75rem',color:'#94a3b8',margin:'4px 0',fontStyle:'italic'}}>Sin subcategorías</p>
                                )}
                                {c.subcategories.map(sc => (
                                  <div key={sc.id}
                                    className={`kb-sub-option ${selectedSubId === sc.id ? 'sub-sel' : ''}`}
                                    onClick={() => setSelectedSubId(sc.id)}>
                                    <div className={`kb-sub-radio ${selectedSubId === sc.id ? 'checked' : ''}`}/>
                                    <span className="kb-sub-name">{sc.name}</span>
                                  </div>
                                ))}

                                {addingSubForCat === c.id ? (
                                  <div className="kb-inline-add">
                                    <input autoFocus className="kb-inline-input"
                                      placeholder="Nombre subcategoría..."
                                      value={inlineSubName}
                                      onChange={e => setInlineSubName(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') confirmInlineSub();
                                        if (e.key === 'Escape') { setAddingSubForCat(null); setInlineSubName(''); }
                                      }}/>
                                    <button className="kb-inline-ok" onClick={confirmInlineSub}>✓</button>
                                    <button className="kb-inline-no" onClick={() => { setAddingSubForCat(null); setInlineSubName(''); }}>✕</button>
                                  </div>
                                ) : (
                                  <button className="kb-add-sub-link" onClick={() => setAddingSubForCat(c.id)}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                                    Añadir subcategoría
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* ── PASO 2 ── */}
                {wizardStep === 2 && (
                  <>
                    {/* Context pill */}
                    <div className="kb-ctx-pill">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1d6fd8" strokeWidth="2.2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                      </svg>
                      <span>
                        <strong>{selectedCat?.name ?? '—'}</strong>
                        {selectedSubId && selectedCat?.subcategories.find(s => s.id === selectedSubId) && (
                          <><span className="sep">›</span>{selectedCat.subcategories.find(s => s.id === selectedSubId)?.name}</>
                        )}
                      </span>
                    </div>

                    {/* — TITLE INPUT — */}
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display:'block', fontSize:'.78rem', fontWeight:600, color:'#1e3a5f', marginBottom:'.375rem', textTransform:'uppercase', letterSpacing:'.04em' }}>Título de la entrada</label>
                      <input
                        autoFocus
                        value={wizardTitulo}
                        onChange={e => setWizardTitulo(e.target.value)}
                        placeholder="Ej. Cómo configurar la impresora en red"
                        className="kb-input"
                        style={{ fontSize: '1rem', fontWeight: 600 }}
                      />
                    </div>

                    {/* ★ KNOWLEDGE EDITOR ★ */}
                    <KnowledgeEditor
                      key={editorKey}
                      initialContent={editingContent}
                      onSave={(html) => {
                        (async () => {
                          try {
                            if (!selectedCatId) { alert('Seleccione una categoría antes de guardar'); return; }
                            const titulo = wizardTitulo.trim() || 'Sin título';
                            // determine real categoria id (prefer UUID if available)
                            const selCat = categories.find(cc => cc.id === selectedCatId);
                            let maybeUuid = selCat?.raw?.uuid ?? selCat?.raw?.id ?? selCat?.id;
                            // if not a UUID, try to fetch the category from the server to resolve UUID
                            if (!isUuid(String(maybeUuid))) {
                              try {
                                const serverCat: any = await (await import('@/modules/baseConocimientos/services/baseConocimientosService')).getCategoria(String(selectedCatId));
                                maybeUuid = serverCat?.id ?? serverCat?.uuid ?? serverCat?.categoria_id ?? maybeUuid;
                              } catch (fetchErr) {
                                console.error('No se pudo resolver categoría desde el servidor', fetchErr);
                              }
                            }

                            if (!isUuid(String(maybeUuid))) {
                              console.error('Categoria id no es UUID', { selectedCatId, maybeUuid, selCat });
                              alert('No se puede crear la entrada: no se encontró un UUID válido para la categoría seleccionada. Pide al backend que devuelva UUIDs.');
                              return;
                            }

                            const payload = {
                              categoriaId: String(maybeUuid),
                              subcategoriaId: selectedSubId ?? null,
                              titulo,
                              contenidoHtml: html,
                              contenidoTexto: ''
                            };
                            if (editingEntryId) {
                              try {
                                await updateEntrada(editingEntryId, {
                                  categoria_id: payload.categoriaId,
                                  subcategoria_id: payload.subcategoriaId,
                                  titulo: payload.titulo,
                                  contenido_html: payload.contenidoHtml,
                                  contenido_texto: payload.contenidoTexto
                                });
                                setWizardOpen(false);
                                setEditingEntryId(null);
                              setEditingContent('');
                              setWizardTitulo('');
                              } catch (err) { console.error(err); alert('Error actualizando entrada'); }
                            } else {
                              await createEntrada(payload);
                              setWizardOpen(false);
                              setEditingEntryId(null);
                              setEditingContent('');
                              setWizardTitulo('');
                            }
                            // refresh list
                            try {
                              const res: any = await getEntradas();
                              const setE: Entry[] = (res || []).map((e: any) => ({ id: e.id ?? e.uuid ?? String(e.id), titulo: e.titulo ?? e.title ?? 'Sin título', contenido_html: e.contenido_html ?? e.contenidoHtml ?? '', categoria_id: e.categoria_id ?? e.categoriaId ?? null, subcategoria_id: e.subcategoria_id ?? e.subcategoriaId ?? null, raw: e }));
                              setEntries(setE);
                            } catch (err) { console.error('Error refrescando entradas', err); }
                          } catch (err: any) {
                            console.error(err);
                            const svc = err?.response?.data ?? err?.message ?? err;
                            const msg = typeof svc === 'string' ? svc : (svc?.message ?? JSON.stringify(svc));
                            alert('Error al crear la entrada: ' + msg);
                          }
                        })();
                      }}
                      onCancel={() => { setWizardOpen(false); setEditingEntryId(null); setEditingContent(''); setWizardTitulo(''); }}
                    />
                  </>
                )}
              </div>

              {/* Footer solo en paso 1 */}
              {wizardStep === 1 && categories.length > 0 && (
                <div className="kb-modal-footer">
                  <button onClick={() => { setWizardOpen(false); setEditingEntryId(null); setEditingContent(''); setWizardTitulo(''); }} className="btn btn-ghost">Cancelar</button>
                  <button
                    onClick={() => setWizardStep(2)}
                    disabled={!selectedCatId}
                    className="btn btn-primary"
                    style={{ opacity: selectedCatId ? 1 : 0.45, cursor: selectedCatId ? 'pointer' : 'not-allowed' }}>
                    Siguiente — Redactar contenido
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </>
  );
}
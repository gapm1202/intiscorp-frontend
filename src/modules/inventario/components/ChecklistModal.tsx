import React, { useEffect, useState } from 'react';
import { getCategorias } from '@/modules/inventario/services/categoriasService';

type Categoria = { id?: number; _id?: number; nombre?: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => void;
  initialData?: any;
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  .ck-overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 25, 50, 0.55);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: ck-fade-in 0.18s ease;
  }

  @keyframes ck-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @keyframes ck-slide-up {
    from { opacity: 0; transform: translateY(18px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .ck-modal {
    font-family: 'DM Sans', sans-serif;
    background: #ffffff;
    border-radius: 16px;
    width: 520px;
    max-width: calc(100vw - 32px);
    max-height: 90vh;
    overflow-y: auto;
    box-shadow:
      0 4px 6px rgba(14, 50, 120, 0.06),
      0 20px 60px rgba(14, 50, 120, 0.18),
      0 0 0 1px rgba(14, 50, 120, 0.06);
    animation: ck-slide-up 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .ck-modal::-webkit-scrollbar { width: 5px; }
  .ck-modal::-webkit-scrollbar-track { background: #f0f5ff; }
  .ck-modal::-webkit-scrollbar-thumb { background: #b8d0f0; border-radius: 99px; }

  /* ── Header ── */
  .ck-header {
    padding: 24px 28px 20px;
    border-bottom: 1px solid #e8f0fc;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%);
    border-radius: 16px 16px 0 0;
  }

  .ck-header-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, #1a6fd4, #2a9fd6);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(26, 111, 212, 0.3);
  }

  .ck-header-text { margin-left: 14px; flex: 1; }

  .ck-title {
    font-size: 17px;
    font-weight: 700;
    color: #0d2a52;
    letter-spacing: -0.3px;
    line-height: 1.2;
  }

  .ck-subtitle {
    font-size: 12px;
    color: #5b8fc7;
    margin-top: 3px;
    font-weight: 500;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }

  .ck-close-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid #d4e5f8;
    background: #fff;
    color: #5b8fc7;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .ck-close-btn:hover { background: #f0f7ff; color: #1a6fd4; border-color: #9ac2f0; }

  /* ── Body ── */
  .ck-body {
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  /* ── Field group ── */
  .ck-field { display: flex; flex-direction: column; gap: 8px; }

  .ck-label {
    font-size: 12px;
    font-weight: 700;
    color: #0d2a52;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .ck-input {
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: #0d2a52;
    background: #f5f9ff;
    border: 1.5px solid #d4e5f8;
    border-radius: 9px;
    padding: 10px 14px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    width: 100%;
    box-sizing: border-box;
  }
  .ck-input::placeholder { color: #9ab8d8; }
  .ck-input:focus {
    border-color: #1a6fd4;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(26, 111, 212, 0.12);
  }

  /* ── Categorías ── */
  .ck-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .ck-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 13px;
    border-radius: 8px;
    border: 1.5px solid #d4e5f8;
    background: #f5f9ff;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: #4070a0;
    transition: all 0.15s;
    user-select: none;
  }
  .ck-chip:hover { border-color: #6aaee8; background: #eaf3fc; color: #1a6fd4; }
  .ck-chip.active {
    background: linear-gradient(135deg, #1a6fd4, #2a9fd6);
    border-color: transparent;
    color: #fff;
    box-shadow: 0 3px 10px rgba(26, 111, 212, 0.28);
  }
  .ck-chip input[type="checkbox"] { display: none; }

  .ck-chip-check {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: 1.5px solid currentColor;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.1s;
  }
  .ck-chip.active .ck-chip-check {
    background: rgba(255,255,255,0.25);
    border-color: transparent;
  }

  .ck-empty { font-size: 13px; color: #9ab8d8; font-style: italic; }

  /* ── Tipo respuesta ── */
  .ck-radio-group { display: flex; gap: 10px; flex-wrap: wrap; }

  .ck-radio-card {
    flex: 1;
    min-width: 120px;
    border: 1.5px solid #d4e5f8;
    border-radius: 10px;
    padding: 12px 16px;
    cursor: pointer;
    background: #f5f9ff;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 10px;
    user-select: none;
  }
  .ck-radio-card:hover { border-color: #6aaee8; background: #eaf3fc; }
  .ck-radio-card.active {
    border-color: #1a6fd4;
    background: #eaf3fc;
    box-shadow: 0 0 0 3px rgba(26, 111, 212, 0.1);
  }
  .ck-radio-card input[type="radio"] { display: none; }

  .ck-radio-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid #9ab8d8;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.15s;
  }
  .ck-radio-card.active .ck-radio-dot { border-color: #1a6fd4; }
  .ck-radio-dot-inner {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #1a6fd4;
    opacity: 0;
    transform: scale(0);
    transition: all 0.15s;
  }
  .ck-radio-card.active .ck-radio-dot-inner { opacity: 1; transform: scale(1); }

  .ck-radio-label { font-size: 13px; font-weight: 600; color: #2a4a72; }
  .ck-radio-card.active .ck-radio-label { color: #1a6fd4; }

  /* ── Opciones select ── */
  .ck-options-list { display: flex; flex-direction: column; gap: 8px; }

  .ck-option-row { display: flex; gap: 8px; align-items: center; }

  .ck-option-index {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    color: #9ab8d8;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }

  .ck-remove-btn {
    width: 30px;
    height: 30px;
    border-radius: 7px;
    border: 1.5px solid #f0d4d4;
    background: #fff5f5;
    color: #c05050;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.15s;
  }
  .ck-remove-btn:hover { background: #ffe0e0; border-color: #e07070; }

  .ck-add-btn {
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: #1a6fd4;
    background: #f0f7ff;
    border: 1.5px dashed #9ac2f0;
    border-radius: 9px;
    padding: 9px 16px;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
  }
  .ck-add-btn:hover { background: #e0eeff; border-color: #5aaae0; }

  /* ── Divider ── */
  .ck-divider { height: 1px; background: #e8f0fc; margin: 0 -28px; }

  /* ── Footer ── */
  .ck-footer {
    padding: 18px 28px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    background: #f8fbff;
    border-radius: 0 0 16px 16px;
    border-top: 1px solid #e8f0fc;
  }

  .ck-btn-cancel {
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #4070a0;
    background: #fff;
    border: 1.5px solid #d4e5f8;
    border-radius: 9px;
    padding: 9px 20px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .ck-btn-cancel:hover { background: #f0f7ff; border-color: #9ac2f0; color: #1a6fd4; }

  .ck-btn-save {
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    background: linear-gradient(135deg, #1a6fd4 0%, #2a9fd6 100%);
    border: none;
    border-radius: 9px;
    padding: 9px 24px;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(26, 111, 212, 0.35);
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .ck-btn-save:hover {
    background: linear-gradient(135deg, #155db8 0%, #1a8fc6 100%);
    box-shadow: 0 6px 20px rgba(26, 111, 212, 0.45);
    transform: translateY(-1px);
  }
  .ck-btn-save:active { transform: translateY(0); }
`;

const ChecklistModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData }) => {
  const [pregunta, setPregunta] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedCategorias, setSelectedCategorias] = useState<number[]>([]);
  const [tipoRespuesta, setTipoRespuesta] = useState<'si_no' | 'texto' | 'select'>('si_no');
  const [options, setOptions] = useState<string[]>(['']);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await getCategorias();
        if (!mounted) return;
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setCategorias(list.map((c: any) => ({ id: Number(c.id ?? c._id ?? 0), nombre: c.nombre ?? c.name ?? c.label ?? '' })));
      } catch (err) { setCategorias([]); }
    };
    if (isOpen) load();
    return () => { mounted = false; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && initialData) {
      setPregunta(String(initialData.pregunta || ''));
      setSelectedCategorias(Array.isArray(initialData.categorias) ? initialData.categorias.map((v: any) => Number(v)) : []);
      if (initialData.tipo === 'si_no' || initialData.tipo === 'texto') {
        setTipoRespuesta(initialData.tipo as any);
      } else if (initialData.tipo === 'seleccion' || initialData.tipo === 'select') {
        setTipoRespuesta('select');
      }
      setOptions(Array.isArray(initialData.opciones) && initialData.opciones.length > 0 ? initialData.opciones.map(String) : ['']);
    }
    if (!isOpen) {
      setPregunta(''); setSelectedCategorias([]); setTipoRespuesta('si_no'); setOptions(['']);
    }
  }, [isOpen, initialData]);

  const toggleCategoria = (id: number) => {
    setSelectedCategorias(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const setOption = (idx: number, value: string) => {
    setOptions(prev => prev.map((o, i) => i === idx ? value : o));
  };

  const addOption = () => setOptions(prev => [...prev, '']);
  const removeOption = (idx: number) => setOptions(prev => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    if (!pregunta.trim()) return alert('La pregunta es obligatoria');
    if (tipoRespuesta === 'select') {
      const cleaned = options.map(o => o.trim()).filter(Boolean);
      if (cleaned.length === 0) return alert('Agrega al menos una opción');
      onSave({ pregunta: pregunta.trim(), categorias: selectedCategorias, tipo: 'seleccion', opciones: cleaned });
    } else if (tipoRespuesta === 'si_no') {
      onSave({ pregunta: pregunta.trim(), categorias: selectedCategorias, tipo: 'si_no' });
    } else {
      onSave({ pregunta: pregunta.trim(), categorias: selectedCategorias, tipo: 'texto' });
    }
    setPregunta(''); setSelectedCategorias([]); setTipoRespuesta('si_no'); setOptions(['']);
    onClose();
  };

  if (!isOpen) return null;

  const tipoOptions = [
    { value: 'si_no',  label: 'Sí / No',   icon: '✓✗' },
    { value: 'texto',  label: 'Texto libre', icon: '¶' },
    { value: 'select', label: 'Selección',   icon: '☰' },
  ] as const;

  return (
    <>
      <style>{styles}</style>
      <div className="ck-overlay">
        <div className="ck-modal">

          {/* Header */}
          <div className="ck-header">
            <div className="ck-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <div className="ck-header-text">
              <div className="ck-title">Crear Pregunta de Checklist</div>
              <div className="ck-subtitle">Nueva entrada · Formulario</div>
            </div>
            <button className="ck-close-btn" onClick={onClose} type="button" aria-label="Cerrar">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/>
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="ck-body">

            {/* Pregunta */}
            <div className="ck-field">
              <label className="ck-label">Pregunta</label>
              <input
                className="ck-input"
                value={pregunta}
                onChange={e => setPregunta(e.target.value)}
                placeholder="Escribe aquí la pregunta del checklist…"
              />
            </div>

            <div className="ck-divider" />

            {/* Categorías */}
            <div className="ck-field">
              <label className="ck-label">Categorías</label>
              <div className="ck-chips">
                {categorias.length === 0 ? (
                  <span className="ck-empty">Cargando categorías…</span>
                ) : categorias.map(c => {
                  const cid = Number(c.id);
                  const isActive = selectedCategorias.includes(cid);
                  return (
                    <label key={String(c.id)} className={`ck-chip${isActive ? ' active' : ''}`}>
                      <input type="checkbox" checked={isActive} onChange={() => toggleCategoria(cid)} />
                      <span className="ck-chip-check">
                        {isActive && (
                          <svg width="9" height="9" viewBox="0 0 10 8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1 4 4 7 9 1"/>
                          </svg>
                        )}
                      </span>
                      <span>{c.nombre}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="ck-divider" />

            {/* Tipo de respuesta */}
            <div className="ck-field">
              <label className="ck-label">Tipo de respuesta</label>
              <div className="ck-radio-group">
                {tipoOptions.map(opt => {
                  const isActive = tipoRespuesta === opt.value;
                  return (
                    <label key={opt.value} className={`ck-radio-card${isActive ? ' active' : ''}`}>
                      <input type="radio" name="tipoResp" checked={isActive} onChange={() => setTipoRespuesta(opt.value)} />
                      <div className="ck-radio-dot">
                        <div className="ck-radio-dot-inner" />
                      </div>
                      <span className="ck-radio-label">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Opciones de selección */}
            {tipoRespuesta === 'select' && (
              <div className="ck-field">
                <label className="ck-label">Opciones de selección</label>
                <div className="ck-options-list">
                  {options.map((opt, idx) => (
                    <div key={idx} className="ck-option-row">
                      <span className="ck-option-index">{idx + 1}</span>
                      <input
                        className="ck-input"
                        value={opt}
                        onChange={e => setOption(idx, e.target.value)}
                        placeholder={`Opción ${idx + 1}`}
                      />
                      <button className="ck-remove-btn" onClick={() => removeOption(idx)} type="button" aria-label="Eliminar opción">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button className="ck-add-btn" type="button" onClick={addOption}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="6.5" y1="1" x2="6.5" y2="12"/><line x1="1" y1="6.5" x2="12" y2="6.5"/>
                    </svg>
                    Agregar opción
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="ck-footer">
            <button className="ck-btn-cancel" onClick={onClose} type="button">Cancelar</button>
            <button className="ck-btn-save" onClick={handleSave} type="button">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11.5 8.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3"/>
                <polyline points="8 1.5 12.5 1.5 12.5 6"/>
                <line x1="5.5" y1="8.5" x2="12.5" y2="1.5"/>
              </svg>
              Guardar pregunta
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default ChecklistModal;
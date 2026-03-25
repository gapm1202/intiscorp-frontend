import React, { useEffect, useState } from "react";
import { createArea, updateArea } from "../services/areasService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresaId?: string;
  sedeId?: string;
  areaId?: string;
  initialName?: string;
  initialResponsable?: string;
  mode?: "create" | "edit";
  onSuccess?: (areaName: string) => void;
}

const AddAreaModal = ({
  isOpen,
  onClose,
  empresaId,
  sedeId,
  areaId,
  initialName,
  initialResponsable,
  mode = "create",
  onSuccess,
}: Props) => {
  const [name, setName] = useState("");
  const [responsable, setResponsable] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);

  const isEditMode = mode === "edit";

  useEffect(() => {
    if (!isOpen) return;
    setName(initialName ?? "");
    setResponsable(initialResponsable ?? "");
    setError(null);
    setLoading(false);
    setCreatedAt(null);
    setCreatedName(null);
  }, [isOpen, initialName, initialResponsable]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre del área es requerido");
      return;
    }
    if (!empresaId) {
      setError("ID de empresa no disponible");
      return;
    }

    if (isEditMode && !areaId) {
      setError("ID de área no disponible");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (isEditMode) {
        await updateArea(empresaId, areaId!, name.trim(), responsable.trim());
        onSuccess?.(name.trim());
        onClose();
        return;
      }

      const res = await createArea(empresaId, name.trim(), sedeId, responsable.trim());
      const now = new Date();
      setCreatedAt(now.toLocaleString());
      const created = res as Record<string, unknown>;
      setCreatedName(String(created?.name ?? name));
      setLoading(false);
    } catch (err: unknown) {
      const maybe = err as { body?: string; message?: string };
      const errorMsg = maybe?.body || maybe?.message || (isEditMode ? "Error al actualizar área" : "Error al crear área");
      setError(errorMsg);
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

        .area-modal-overlay {
          font-family: 'DM Sans', sans-serif;
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(10, 30, 70, 0.55);
          backdrop-filter: blur(3px);
        }

        .area-modal-card {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 24px 60px rgba(10, 40, 120, 0.18), 0 4px 16px rgba(10, 40, 120, 0.08);
          overflow: hidden;
        }

        .area-modal-header {
          background: linear-gradient(135deg, #1a4fad 0%, #2d7dd2 100%);
          padding: 24px 28px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .area-modal-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .area-modal-icon {
          width: 38px;
          height: 38px;
          background: rgba(255,255,255,0.18);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .area-modal-icon svg {
          width: 20px;
          height: 20px;
          stroke: #ffffff;
        }

        .area-modal-title {
          font-size: 17px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.2px;
          margin: 0;
        }

        .area-modal-subtitle {
          font-size: 12px;
          color: rgba(255,255,255,0.72);
          margin: 2px 0 0;
          font-weight: 400;
        }

        .area-modal-close {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255,255,255,0.15);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
          color: #ffffff;
          font-size: 16px;
          line-height: 1;
        }

        .area-modal-close:hover {
          background: rgba(255,255,255,0.28);
        }

        .area-modal-body {
          padding: 28px 28px 24px;
        }

        .area-field {
          margin-bottom: 20px;
        }

        .area-field label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: #1e3a6e;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 8px;
        }

        .area-field-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .area-field-icon {
          position: absolute;
          left: 12px;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .area-field-icon svg {
          width: 16px;
          height: 16px;
          stroke: #7bafd4;
        }

        .area-field input {
          width: 100%;
          padding: 11px 14px 11px 40px;
          border: 1.5px solid #cce0f5;
          border-radius: 10px;
          font-size: 14.5px;
          font-family: 'DM Sans', sans-serif;
          color: #0f2547;
          background: #f6faff;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          outline: none;
          box-sizing: border-box;
        }

        .area-field input::placeholder {
          color: #a8c4de;
          font-weight: 400;
        }

        .area-field input:focus {
          border-color: #2d7dd2;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(45, 125, 210, 0.12);
        }

        .area-field input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .area-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 18px;
          padding: 12px 14px;
          background: #fff3f3;
          border: 1.5px solid #f5c2c2;
          border-radius: 10px;
          font-size: 13px;
          color: #b91c1c;
          font-weight: 500;
        }

        .area-error svg {
          width: 15px;
          height: 15px;
          stroke: #b91c1c;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .area-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 0 28px 26px;
        }

        .btn-cancel {
          padding: 10px 20px;
          border: 1.5px solid #cce0f5;
          border-radius: 10px;
          background: #ffffff;
          color: #1a4fad;
          font-size: 14px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }

        .btn-cancel:hover:not(:disabled) {
          background: #f0f7ff;
          border-color: #7bafd4;
        }

        .btn-cancel:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-submit {
          padding: 10px 22px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, #1a4fad 0%, #2d7dd2 100%);
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 7px;
          transition: opacity 0.15s, box-shadow 0.15s;
          box-shadow: 0 3px 10px rgba(26, 79, 173, 0.25);
        }

        .btn-submit:hover:not(:disabled) {
          opacity: 0.92;
          box-shadow: 0 5px 16px rgba(26, 79, 173, 0.35);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Success popup */
        .area-success-overlay {
          font-family: 'DM Sans', sans-serif;
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(10, 30, 70, 0.45);
          backdrop-filter: blur(2px);
        }

        .area-success-card {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 360px;
          box-shadow: 0 20px 50px rgba(10, 40, 120, 0.2);
          overflow: hidden;
        }

        .area-success-top {
          background: linear-gradient(135deg, #1a4fad 0%, #2d7dd2 100%);
          padding: 28px 28px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .area-success-check {
          width: 52px;
          height: 52px;
          background: rgba(255,255,255,0.18);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .area-success-check svg {
          width: 26px;
          height: 26px;
          stroke: #ffffff;
          stroke-width: 2.5;
        }

        .area-success-heading {
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.2px;
        }

        .area-success-body {
          padding: 22px 28px;
        }

        .area-success-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          background: #f0f7ff;
          margin-bottom: 10px;
        }

        .area-success-row svg {
          width: 15px;
          height: 15px;
          stroke: #2d7dd2;
          flex-shrink: 0;
        }

        .area-success-row-label {
          font-size: 11.5px;
          font-weight: 600;
          color: #5a8bbf;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
        }

        .area-success-row-value {
          font-size: 14px;
          font-weight: 600;
          color: #0f2547;
          display: block;
        }

        .area-success-footer {
          display: flex;
          gap: 10px;
          padding: 0 28px 24px;
        }

        .btn-success-accept {
          flex: 1;
          padding: 11px 0;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, #1a4fad 0%, #2d7dd2 100%);
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(26, 79, 173, 0.25);
          transition: opacity 0.15s;
        }

        .btn-success-accept:hover {
          opacity: 0.9;
        }

        .btn-success-close {
          padding: 11px 18px;
          border: 1.5px solid #cce0f5;
          border-radius: 10px;
          background: #ffffff;
          color: #1a4fad;
          font-size: 14px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: background 0.15s;
        }

        .btn-success-close:hover {
          background: #f0f7ff;
        }
      `}</style>

      <div className="area-modal-overlay">
        <div className="area-modal-card">

          {/* Header */}
          <div className="area-modal-header">
            <div className="area-modal-header-left">
              <div className="area-modal-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isEditMode
                    ? <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>
                    : <><path d="M12 5v14M5 12h14"/></>
                  }
                </svg>
              </div>
              <div>
                <p className="area-modal-title">{isEditMode ? "Editar Área" : "Agregar Área"}</p>
                <p className="area-modal-subtitle">{isEditMode ? "Modifica los datos del área" : "Completa los datos para registrar el área"}</p>
              </div>
            </div>
            <button onClick={onClose} className="area-modal-close" disabled={loading}>✕</button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="area-modal-body">

              {/* Nombre */}
              <div className="area-field">
                <label>Nombre del área</label>
                <div className="area-field-wrapper">
                  <span className="area-field-icon">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8L6 7h12l-2-4z"/>
                    </svg>
                  </span>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej: Contabilidad"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Responsable */}
              <div className="area-field" style={{ marginBottom: 0 }}>
                <label>Responsable de área</label>
                <div className="area-field-wrapper">
                  <span className="area-field-icon">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <input
                    value={responsable}
                    onChange={e => setResponsable(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="area-error">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}
            </div>

            <div className="area-modal-footer">
              <button type="button" onClick={onClose} className="btn-cancel" disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading && <span className="btn-spinner" />}
                {loading
                  ? (isEditMode ? "Guardando..." : "Creando...")
                  : (isEditMode ? "Guardar cambios" : "Crear área")
                }
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success popup */}
      {!isEditMode && createdName && createdAt && (
        <div className="area-success-overlay">
          <div className="area-success-card">
            <div className="area-success-top">
              <div className="area-success-check">
                <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h4 className="area-success-heading">¡Área creada con éxito!</h4>
            </div>

            <div className="area-success-body">
              <div className="area-success-row">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8L6 7h12l-2-4z"/>
                </svg>
                <div>
                  <span className="area-success-row-label">Nombre</span>
                  <span className="area-success-row-value">{createdName}</span>
                </div>
              </div>
              <div className="area-success-row">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <div>
                  <span className="area-success-row-label">Fecha / Hora</span>
                  <span className="area-success-row-value">{createdAt}</span>
                </div>
              </div>
            </div>

            <div className="area-success-footer">
              <button
                className="btn-success-accept"
                onClick={() => {
                  onSuccess?.(createdName);
                  setName("");
                  setResponsable("");
                  setCreatedName(null);
                  setCreatedAt(null);
                  setLoading(false);
                  onClose();
                }}
              >
                Aceptar
              </button>
              <button
                className="btn-success-close"
                onClick={() => {
                  setCreatedName(null);
                  setCreatedAt(null);
                  setLoading(false);
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddAreaModal;
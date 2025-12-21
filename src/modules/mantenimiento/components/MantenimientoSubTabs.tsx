import PreventivePlanForm, { type EmpresaLite } from "@/modules/mantenimiento/components/PreventivePlanForm";
import CalendarioMantenimientos from "@/modules/mantenimiento/components/CalendarioMantenimientos";
import { useEffect, useState } from "react";
import { getContratoActivo } from "@/modules/empresas/services/contratosService";

interface Props {
  empresaId: string;
  empresa?: EmpresaLite | null;
  frecuencia?: string;
  modalidad?: string;
  contractStatus?: string | null;
}

export function MantenimientoSubTabs({ empresaId, empresa, frecuencia, modalidad, contractStatus: initialStatus }: Props) {
  const [subTab, setSubTab] = useState<"planes" | "calendario" | "ejecuciones" | "historial">("planes");
  const [contractStatus, setContractStatus] = useState<string | null>(initialStatus || null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const contrato = await getContratoActivo(empresaId);
        if (!mounted) return;
        const status = (contrato?.estadoContrato || contrato?.estado || "").toLowerCase();
        setContractStatus(status || null);
      } catch (e) {
        setContractStatus(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [empresaId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {[{ id: "planes", label: "Planes de Mantenimiento", icon: "🧩" },
          { id: "calendario", label: "Calendario", icon: "📅" },
          { id: "ejecuciones", label: "Ejecuciones", icon: "✅" },
          { id: "historial", label: "Historial", icon: "📜" }].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              subTab === t.id ? "bg-blue-600 text-white shadow" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="pt-2">
        {subTab === "planes" && (
          <PreventivePlanForm
            empresaId={empresaId}
            empresa={empresa || null}
            contractStatus={contractStatus}
            frecuencia={frecuencia}
            modalidad={modalidad}
          />
        )}
        {subTab === "calendario" && (
          <CalendarioMantenimientos
            empresaId={empresaId}
            planes={[]} // TODO: cargar planes desde API
          />
        )}
        {subTab === "ejecuciones" && (
          <div className="p-10 text-center text-slate-500">✅ Ejecuciones: próximamente</div>
        )}
        {subTab === "historial" && (
          <div className="p-10 text-center text-slate-500">📜 Historial: próximamente</div>
        )}
      </div>
    </div>
  );
}

export default MantenimientoSubTabs;

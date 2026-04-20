import type { TiemposSlaForm } from '../types';
import { GestionTiemposForm } from '@/modules/sla/components/GestionTiemposForm';

interface Props {
  data: TiemposSlaForm;
  onChange: (data: TiemposSlaForm) => void;
}

/**
 * Paso 6 – Tiempos del SLA.
 * Reutiliza GestionTiemposForm existente en modo wizard (sin guardar a backend).
 */
export default function Step6TiemposSla({ data, onChange }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Configure los tiempos de respuesta y resolución por nivel de prioridad.
      </p>
      <GestionTiemposForm
        initialData={data as any}
        onSave={(saved) => onChange(saved as unknown as TiemposSlaForm)}
        onCancel={() => {/* no-op en wizard */}}
      />
    </div>
  );
}

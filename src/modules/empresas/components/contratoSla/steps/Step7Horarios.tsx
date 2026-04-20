import type { HorariosSlaForm } from '../types';
import { GestionHorariosForm } from '@/modules/sla/components/GestionHorariosForm';

interface Props {
  data: HorariosSlaForm;
  onChange: (data: HorariosSlaForm) => void;
}

/**
 * Paso 7 – Horarios de Atención (último paso principal).
 * Reutiliza GestionHorariosForm existente en modo wizard.
 */
export default function Step7Horarios({ data, onChange }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Defina los horarios de atención del servicio para cada día de la semana.
      </p>
      <GestionHorariosForm
        initialData={data as any}
        showFueraHorarioOptions={true}
        onSave={(saved) => onChange(saved as unknown as HorariosSlaForm)}
        onCancel={() => {/* no-op en wizard */}}
      />
    </div>
  );
}

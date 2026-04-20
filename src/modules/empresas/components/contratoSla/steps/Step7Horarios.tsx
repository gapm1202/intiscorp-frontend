import { useRef } from 'react';
import type { HorariosSlaForm } from '../types';
import { GestionHorariosForm } from '@/modules/sla/components/GestionHorariosForm';

interface Props {
  data: HorariosSlaForm;
  onChange: (data: HorariosSlaForm) => void;
}

export default function Step7Horarios({ data, onChange }: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Defina los horarios de atención del servicio para cada día de la semana.
      </p>
      <GestionHorariosForm
        initialData={data as any}
        showFueraHorarioOptions={true}
        hideActions={true}
        onSave={(saved) => onChangeRef.current(saved as unknown as HorariosSlaForm)}
      />
    </div>
  );
}

import { useRef } from 'react';
import type { TiemposSlaForm } from '../types';
import { GestionTiemposForm } from '@/modules/sla/components/GestionTiemposForm';

interface Props {
  data: TiemposSlaForm;
  onChange: (data: TiemposSlaForm) => void;
}

export default function Step6TiemposSla({ data, onChange }: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Configure los tiempos de respuesta y resolución por nivel de prioridad.
      </p>
      <GestionTiemposForm
        initialData={data as any}
        hideActions={true}
        onSave={(saved) => onChangeRef.current(saved as unknown as TiemposSlaForm)}
      />
    </div>
  );
}

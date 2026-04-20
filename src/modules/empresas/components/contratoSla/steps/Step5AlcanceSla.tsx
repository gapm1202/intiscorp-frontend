import type { AlcanceSlaForm } from '../types';
import { AlcanceSLAForm } from '@/modules/sla/components/AlcanceSLAForm';

interface Props {
  data: AlcanceSlaForm;
  onChange: (data: AlcanceSlaForm) => void;
  sedes?: Array<{ id: string; nombre: string }>;
  estadoContrato?: string;
}

/**
 * Paso 5 – Alcance del SLA.
 * Reutiliza el componente AlcanceSLAForm ya existente,
 * adaptando el callback onSave para actualizar el estado del wizard.
 */
export default function Step5AlcanceSla({ data, onChange, sedes = [], estadoContrato = 'activo' }: Props) {
  // AlcanceSLAForm espera un onSave con sus propios tipos internos.
  // Lo usamos en modo "inline" (sin guardar a backend), capturando el save
  // a través del prop onSave y pasándolo a onChange.
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Define el alcance del Acuerdo de Nivel de Servicio: qué tipos de ticket, servicios y sedes cubre.
      </p>
      <AlcanceSLAForm
        initialData={data as any}
        sedes={sedes}
        estadoContrato={estadoContrato}
        contratoCompleto={true}
        slaActivoOverride={estadoContrato?.toLowerCase() === 'activo'}
        hideActions={true}
        onSave={(saved) => onChange(saved as unknown as AlcanceSlaForm)}
        onCancel={() => {/* no-op en wizard */}}
      />
    </div>
  );
}

import type { Category, CategoryField } from "@/modules/inventario/services/categoriasService";

export const sampleGroups: Array<{ id: string; nombre: string; codigo?: string; descripcion?: string; activo?: boolean }> = [
  { id: 'grp-eqp', nombre: 'Equipos de Cómputo', codigo: 'EQP', descripcion: 'Equipos personales y portátiles', activo: true },
  { id: 'grp-tel', nombre: 'Telecomunicaciones', codigo: 'TEL', descripcion: 'Equipos de red y telecomunicaciones', activo: true },
];

const laptopFields: CategoryField[] = [
  { nombre: 'Procesador', tipo: 'text', requerido: true },
  { nombre: 'RAM (GB)', tipo: 'number', requerido: true },
  { nombre: 'Almacenamiento', tipo: 'select', requerido: false, opciones: ['HDD', 'SSD'] },
];

const pcFields: CategoryField[] = [
  { nombre: 'Placa Madre', tipo: 'text', requerido: false },
  { nombre: 'Fuente (W)', tipo: 'number', requerido: false },
];

export const sampleCategories: Category[] = [
  {
    id: 'cat-laptop',
    nombre: 'Laptop',
    codigo: 'LAP',
    marcas: ['Dell', 'HP', 'Lenovo'],
    campos: laptopFields,
  },
  {
    id: 'cat-pc',
    nombre: 'PC',
    codigo: 'PC',
    marcas: ['Asus', 'Gigabyte'],
    campos: pcFields,
  },
  {
    id: 'cat-router',
    nombre: 'Router',
    codigo: 'RTR',
    marcas: ['Cisco', 'Mikrotik'],
    campos: [{ nombre: 'Puertos', tipo: 'number', requerido: false }],
  }
];

export default { sampleGroups, sampleCategories };

export type WarrantyInfo = {
  estado: 'Vigente' | 'No vigente' | '-';
  expiresAt?: string | null;
};

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  try {
    // If it's a number and looks like a year (e.g., 2022), treat as year start
    if (typeof value === 'number' && value > 1900 && value < 3000) {
      return new Date(value, 0, 1);
    }
    const s = String(value).trim();
    // If it's a 4-digit year like '2022', treat as year start
    if (/^\d{4}$/.test(s)) return new Date(Number(s), 0, 1);
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function addMonths(date: Date, months: number) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

export function getWarrantyInfo(opts: {
  estado_garantia?: unknown;
  warranty_expires_at?: unknown;
  fechaFinGarantia?: unknown;
  fecha_fin_garantia?: unknown;
  garantiaDuracion?: unknown;
  garantia?: unknown;
  fechaCompra?: unknown;
  fechaCompraAprox?: unknown;
  fechaCompraAproxYear?: unknown;
}): WarrantyInfo {
  const { estado_garantia, warranty_expires_at, fechaFinGarantia, fecha_fin_garantia, garantiaDuracion, garantia, fechaCompra } = opts;

  // Prefer explicit estado_garantia from backend if available
  if (estado_garantia !== undefined && estado_garantia !== null && String(estado_garantia).trim() !== '') {
    const raw = String(estado_garantia).toLowerCase();
    if (raw === 'vigente' || raw === 'true' || raw === '1') return { estado: 'Vigente' };
    if (raw === 'no vigente' || raw === 'novigente' || raw === 'false' || raw === '0') return { estado: 'No vigente' };
    // unknown text fallthrough
  }

  // Try explicit expiry fields
  const expiry = parseDate(warranty_expires_at) || parseDate(fechaFinGarantia) || parseDate(fecha_fin_garantia);
  if (expiry) {
    const now = new Date();
    const estado = expiry.getTime() >= now.getTime() ? 'Vigente' : 'No vigente';
    return { estado, expiresAt: expiry.toISOString() };
  }

  // Try to infer from garantiaDuracion + fechaCompra
  const durationRaw = String(garantiaDuracion ?? garantia ?? '').toLowerCase();
  // prefer explicit fechaCompra, then approximate variants passed in opts
  const start = parseDate(fechaCompra) || parseDate(opts.fechaCompraAprox) || parseDate(opts.fechaCompraAproxYear);
  if (start && durationRaw) {
    let months = 0;
    if (durationRaw.includes('6')) months = 6;
    else if (durationRaw.includes('1') && durationRaw.includes('a')) months = 12;
    else if (durationRaw.includes('2')) months = 24;
    else if (durationRaw.includes('3')) months = 36;

    if (months > 0) {
      const exp = addMonths(start, months);
      const now = new Date();
      const estado = exp.getTime() >= now.getTime() ? 'Vigente' : 'No vigente';
      return { estado, expiresAt: exp.toISOString() };
    }
  }

  return { estado: '-' };
}

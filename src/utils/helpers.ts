// Limpia y toma las primeras 3 letras de un nombre de empresa
export function getCompanyPrefix(name?: string): string {
	if (!name) return "EMP";
	const cleaned = String(name)
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[^a-zA-Z]/g, "");
	const three = cleaned.slice(0, 3).toUpperCase();
	return three || "EMP";
}

// Mapea categoría a prefijo corto
export function getCategoryPrefix(category?: string): string {
	const c = String(category || "").toLowerCase();
	if (c === "laptop") return "LPT";
	if (c === "pc") return "PC";
	if (c === "servidor") return "SRV";
	// fallback: primeras 3 letras
	const cleaned = String(category || "")
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[^a-zA-Z]/g, "");
	return cleaned.slice(0, 3).toUpperCase() || "CAT";
}

// Formatea códigos en los formatos admitidos y rellena el número a 4 dígitos
// Soporta:
//  - ABC-123  => ABC-0123
//  - ABC-PC12 => ABC-PC0012
export function formatAssetCode(code?: string | number | null): string {
	if (code === undefined || code === null || code === "") return "-";
	const str = String(code).trim();

	// Formato antiguo: PREFIX-NUM
	const m1 = str.match(/^([A-Z]+)-(\d+)$/i);
	if (m1) {
		const prefix = m1[1].toUpperCase();
		const num = m1[2];
		return `${prefix}-${num.padStart(4, "0")}`;
	}

	// Nuevo formato: COMPANY-CATEGORYNUM (ej: IME-PC12)
	const m2 = str.match(/^([A-Z]+)-([A-Z]+)(\d+)$/i);
	if (m2) {
		const company = m2[1].toUpperCase();
		const cat = m2[2].toUpperCase();
		const num = m2[3];
		return `${company}-${cat}${num.padStart(4, "0")}`;
	}

	return str.toUpperCase();
}

// Calcula el siguiente código localmente a partir de una lista de códigos existentes
// No es a prueba de concurrencia — el backend debe ser la fuente de verdad.
export function computeNextAssetCodeLocal(
	existingCodes: string[],
	companyPrefix: string,
	categoryPrefix: string
): string {
	let maxNum = 0;
	for (const raw of existingCodes) {
		const code = formatAssetCode(raw);
		const m = code.match(/^([A-Z]+)-([A-Z]+)(\d{1,})$/);
		if (m) {
			const comp = m[1];
			const cat = m[2];
			const num = parseInt(m[3], 10);
			if (comp === companyPrefix && cat === categoryPrefix && !Number.isNaN(num)) {
				if (num > maxNum) maxNum = num;
			}
		}
	}
	const next = (maxNum || 0) + 1;
	return `${companyPrefix}-${categoryPrefix}${String(next).padStart(4, "0")}`;
}
// Calcula el siguiente código de cliente (CLI-XXX) basado en códigos existentes
export function computeNextClientCodeLocal(existingCodes: string[]): string {
    let maxNum = 0;
    for (const raw of existingCodes) {
        const code = String(raw || "").trim();
        const m = code.match(/^CLI-(\d+)$/i);
        if (m) {
            const num = parseInt(m[1], 10);
            if (!Number.isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    }
    const next = (maxNum || 0) + 1;
    return `CLI-${String(next).padStart(3, "0")}`;
}
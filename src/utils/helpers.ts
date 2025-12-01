export function formatAssetCode(code?: string | number | null): string {
	if (code === undefined || code === null || code === "") return "-";
	const str = String(code).trim();
	const match = str.match(/^([A-Z]+)-(\d+)$/i);
	if (match) {
		const prefix = match[1].toUpperCase();
		const num = match[2];
		return `${prefix}-${num.padStart(4, "0")}`;
	}
	return str;
}

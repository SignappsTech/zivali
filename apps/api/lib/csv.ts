// RFC 4180 CSV → one object per row keyed by the header: quoted fields may hold commas, quotes ("") and line breaks.
export function parseCsv(text: string): Record<string, string>[] {
	const rows: string[][] = [[]];
	let field = '';
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (quoted) {
			if (c === '"' && text[i + 1] === '"') field += text[i++];
			else if (c === '"') quoted = false;
			else field += c;
		} else if (c === '"') quoted = true;
		else if (c === ',' || c === '\n') {
			rows.at(-1)!.push(field);
			field = '';
			if (c === '\n') rows.push([]);
		} else if (c !== '\r') field += c;
	}
	if (field || rows.at(-1)!.length) rows.at(-1)!.push(field);
	else rows.pop();
	const [header = [], ...body] = rows;
	return body.map((row) => Object.fromEntries(header.map((name, i) => [name, row[i] ?? ''])));
}

// Text helpers shared by the API and the clients. Every regex here runs in linear time (no nested or
// overlapping quantifiers): they see anonymous input.

const URL_RE = /(?:https?:\/\/|www\.)|[a-z0-9-]\.(?:si|com|net|org|eu|info|io|me|ly|link|app|hr|at|it|de)\b/i;
const EMAIL_RE = /[^\s@]@[^\s@]+\.[^\s@]/;
// 6+ digits split by any run of spaces, dots, slashes, brackets or dashes ("041.123.456", "(041) 123-456",
// IBAN, card). Dates are blanked out first, so "15. 10. 2026" passes.
const DIGIT_RUN_RE = /\d(?:[\s./()-]*\d){5,}/;
const DATE_RE = /\b\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4}\b/g;

/** C4 reward note rule: true when the text holds a URL, an e-mail address or a run of 6 or more digits. */
export function containsContactData(text: string): boolean {
	// NFKC folds fullwidth digits/letters and NBSP to their ASCII forms.
	const s = text.normalize('NFKC');
	return URL_RE.test(s) || EMAIL_RE.test(s) || DIGIT_RUN_RE.test(s.replace(DATE_RE, ' '));
}

/** C6 geocoder key: "Šentvid", "sentvid" and "SENTVID" all become "sentvid"; "Đurđevac" becomes "durdevac". */
export function normalisePlace(s: string): string {
	return (
		s
			.normalize('NFD')
			.replace(/\p{M}/gu, '')
			.toLowerCase()
			// letters NFD does not decompose
			.replace(/đ/g, 'd')
			.replace(/ł/g, 'l')
			.replace(/ß/g, 'ss')
			.replace(/[^a-z0-9]+/g, ' ')
			.trim()
	);
}

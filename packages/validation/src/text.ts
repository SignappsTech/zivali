// Text helpers shared by the API and the clients.

const URL_RE =
	/(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:si|com|net|org|eu|info|io|me|ly|link|app|hr|at|it|de)\b/i;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
// 6+ digits, optionally split by single spaces, dashes or slashes ("041 123 456", IBAN, card). Dots are not
// separators, so dates like 15.10.2026 pass.
const DIGIT_RUN_RE = /\d(?:[ /-]?\d){5,}/;

/** C4 reward note rule: true when the text holds a URL, an e-mail address or a run of 6 or more digits. */
export function containsContactData(text: string): boolean {
	return URL_RE.test(text) || EMAIL_RE.test(text) || DIGIT_RUN_RE.test(text);
}

/** C6 geocoder key: "Šentvid", "sentvid" and "SENTVID" all become "sentvid". */
export function normalisePlace(s: string): string {
	return s
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

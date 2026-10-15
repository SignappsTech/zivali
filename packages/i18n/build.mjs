// Merges messages/<locale>/<namespace>.json into dist/<locale>.json as { <namespace>: { … } } (contract C16).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LOCALES = ['sl', 'en'];

const here = path.dirname(fileURLToPath(import.meta.url));

/** Reads every namespace file of every locale: { sl: { common: {…}, … }, en: {…} }. */
export function load(dir = path.join(here, 'messages')) {
	const catalogues = {};
	for (const locale of LOCALES) {
		const localeDir = path.join(dir, locale);
		const files = fs.existsSync(localeDir) ? fs.readdirSync(localeDir).filter((f) => f.endsWith('.json')) : [];
		catalogues[locale] = {};
		for (const file of files.sort()) {
			try {
				catalogues[locale][path.basename(file, '.json')] = JSON.parse(
					fs.readFileSync(path.join(localeDir, file), 'utf8')
				);
			} catch (error) {
				throw new Error(`${locale}/${file}: ${error.message}`, { cause: error });
			}
		}
	}
	return catalogues;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const catalogues = load();
	fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
	for (const locale of LOCALES) {
		fs.writeFileSync(
			path.join(here, 'dist', `${locale}.json`),
			`${JSON.stringify(catalogues[locale], null, '\t')}\n`
		);
	}
	console.log(`@zivali/i18n: wrote ${LOCALES.map((l) => `dist/${l}.json`).join(', ')}`);
}

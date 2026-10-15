// Catalogue check (contract C16): keys in every locale, same ICU placeholders, SL plurals with one/two/few/other,
// EN plurals with one/other, no empty strings. Usage: node check.mjs [messagesDir]; exits 1 on any problem.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LOCALES, load } from './build.mjs';

const PLURAL_CATEGORIES = { sl: ['one', 'two', 'few', 'other'], en: ['one', 'other'] };

/**
 * Minimal ICU MessageFormat reader. Returns the argument names (rich-text tags as `<tag>`) and the selectors of
 * every plural, nested ones included. Throws a SyntaxError on unbalanced braces or an unknown argument type.
 */
export function parseIcu(message) {
	const args = new Set();
	const plurals = [];
	let i = 0;

	const fail = (why) => {
		throw new SyntaxError(why);
	};
	const expect = (char) => {
		if (i >= message.length) fail('unclosed "{"');
		if (message[i] !== char) fail(`expected "${char}" at ${i}`);
		i++;
	};
	const readUntil = (stops) => {
		const start = i;
		while (i < message.length && !stops.includes(message[i])) i++;
		return message.slice(start, i).trim();
	};
	const skipSpace = () => {
		while (/\s/.test(message[i] ?? '')) i++;
	};

	// Text up to the "}" that closes the current sub-message (or the end).
	function text(inPlural) {
		while (i < message.length && message[i] !== '}') {
			if (message[i] === '{') argument(inPlural);
			else if (message[i] === "'") quoted(inPlural);
			else {
				const tag = message[i] === '<' && /^<\/?(\w+)>/.exec(message.slice(i));
				if (tag) args.add(`<${tag[1]}>`);
				i += tag ? tag[0].length : 1;
			}
		}
	}

	// ICU apostrophes: '' is a literal ', and ' before { } < > (or # inside a plural) quotes up to the next '.
	function quoted(inPlural) {
		const next = message[i + 1] ?? '';
		const opens = next !== '' && ('{}<>'.includes(next) || (inPlural && next === '#'));
		if (!opens) {
			i += next === "'" ? 2 : 1;
			return;
		}
		i += 2;
		while (i < message.length) {
			if (message[i] === "'" && message[i + 1] !== "'") {
				i++;
				return;
			}
			i += message[i] === "'" ? 2 : 1;
		}
	}

	function argument(inPlural) {
		i++;
		const name = readUntil(',}');
		if (!/^\w+$/.test(name)) fail(`invalid argument "{${name}"`);
		args.add(name);
		if (message[i] === '}') {
			i++;
			return;
		}
		expect(',');
		const type = readUntil(',}');
		if (type === 'number' || type === 'date' || type === 'time') {
			readUntil('}');
			expect('}');
			return;
		}
		if (type !== 'plural' && type !== 'select' && type !== 'selectordinal')
			fail(`unknown type "${type}" of {${name}}`);
		expect(',');
		const selectors = new Set();
		for (;;) {
			skipSpace();
			if (i >= message.length) fail('unclosed "{"');
			if (message[i] === '}') break;
			const selector = readUntil('{}').split(/\s+/).pop();
			if (!selector || selector.startsWith('offset:')) fail(`missing selector in {${name}}`);
			expect('{');
			text(inPlural || type !== 'select');
			expect('}');
			selectors.add(selector);
		}
		i++;
		if (!selectors.has('other')) fail(`${type} {${name}} has no "other"`);
		if (type === 'plural') plurals.push({ name, selectors });
	}

	text(false);
	if (i < message.length) fail(`unmatched "}" at ${i}`);
	return { args, plurals };
}

function flatten(node, prefix, out, problems, locale) {
	for (const [key, value] of Object.entries(node)) {
		const id = prefix ? `${prefix}.${key}` : key;
		if (typeof value === 'string') out.set(id, value);
		else if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, id, out, problems, locale);
		else problems.push(`${locale}: ${id}: expected a string or an object`);
	}
}

/** Returns the list of problems in a messages directory (default: this package's messages/). */
export function check(dir) {
	const problems = [];
	const catalogues = load(dir);
	const flat = Object.fromEntries(LOCALES.map((l) => [l, new Map()]));
	for (const locale of LOCALES) flatten(catalogues[locale], '', flat[locale], problems, locale);

	const parsed = Object.fromEntries(LOCALES.map((l) => [l, new Map()]));
	for (const locale of LOCALES) {
		for (const [id, message] of flat[locale]) {
			for (const other of LOCALES) {
				if (other !== locale && !flat[other].has(id))
					problems.push(`${other}: ${id}: missing (present in ${locale})`);
			}
			if (!message.trim()) {
				problems.push(`${locale}: ${id}: empty string`);
				continue;
			}
			try {
				parsed[locale].set(id, parseIcu(message));
			} catch (error) {
				problems.push(`${locale}: ${id}: ${error.message}`);
				continue;
			}
			for (const { name, selectors } of parsed[locale].get(id).plurals) {
				const missing = PLURAL_CATEGORIES[locale].filter((c) => !selectors.has(c));
				if (missing.length) {
					problems.push(
						`${locale}: ${id}: plural {${name}} needs ${PLURAL_CATEGORIES[locale].join(', ')} (missing ${missing.join(', ')})`
					);
				}
			}
		}
	}

	// Placeholders compared with the source locale (SL).
	const [source, ...targets] = LOCALES;
	for (const [id, { args }] of parsed[source]) {
		for (const locale of targets) {
			const other = parsed[locale].get(id);
			if (!other) continue;
			const a = [...args].sort().join(', ');
			const b = [...other.args].sort().join(', ');
			if (a !== b) problems.push(`${id}: placeholders differ: ${source} {${a}}, ${locale} {${b}}`);
		}
	}
	return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const problems = check(process.argv[2] && path.resolve(process.argv[2]));
	if (problems.length) {
		console.error(`@zivali/i18n check: ${problems.length} problem(s)\n${problems.map((p) => `  ${p}`).join('\n')}`);
		process.exit(1);
	}
	console.log('@zivali/i18n check: OK');
}

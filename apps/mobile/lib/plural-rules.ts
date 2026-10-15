// Slovenian plurals need Intl.PluralRules with 'sl' data (one, two, few, other). Hermes may lack either, so this is
// checked at startup and the @formatjs polyfill (ADR-017) is evaluated only then. Imported first in app/_layout.tsx.
import { shouldPolyfill } from '@formatjs/intl-pluralrules/should-polyfill.js';

if (shouldPolyfill('sl')) {
	// Synchronous require: messages are formatted on the first render, so an async import() would be too late.
	/* eslint-disable @typescript-eslint/no-require-imports */
	require('@formatjs/intl-pluralrules/polyfill-force.js');
	require('@formatjs/intl-pluralrules/locale-data/sl.js');
	require('@formatjs/intl-pluralrules/locale-data/en.js');
	/* eslint-enable @typescript-eslint/no-require-imports */
}

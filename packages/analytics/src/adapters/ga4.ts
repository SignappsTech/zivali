import type { Adapter } from '../index.ts';

type Gtag = (...args: unknown[]) => void;
type GaWindow = Record<string, unknown> & { dataLayer?: unknown[]; gtag?: Gtag };

const DENIED = {
	analytics_storage: 'denied',
	ad_storage: 'denied',
	ad_user_data: 'denied',
	ad_personalization: 'denied',
};

/** Basic Consent Mode v2 (C12 §Web wiring): no Google script, request or cookie until `enable()`. */
export function createGa4Adapter(id: string, nonce?: string): Adapter {
	const win = () => window as unknown as GaWindow;
	const gtag: Gtag = (...args) => win().gtag?.(...args);
	let loaded = false;

	return {
		enable() {
			const w = win();
			w[`ga-disable-${id}`] = false;
			if (loaded) return gtag('consent', 'update', { analytics_storage: 'granted' });
			loaded = true;
			w.dataLayer ??= [];
			w.gtag = function () {
				// gtag.js only processes `arguments` objects, not arrays.
				// eslint-disable-next-line prefer-rest-params
				w.dataLayer!.push(arguments);
			};
			gtag('consent', 'default', DENIED);
			gtag('consent', 'update', { analytics_storage: 'granted' });
			gtag('js', new Date());
			const script = document.createElement('script');
			script.async = true;
			script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
			const cspNonce = nonce ?? document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce;
			if (cspNonce) script.nonce = cspNonce;
			document.head.appendChild(script);
			const debug = new URLSearchParams(location.search).get('debug_mode') === '1';
			gtag('config', id, debug ? { send_page_view: false, debug_mode: true } : { send_page_view: false });
		},
		disable() {
			if (typeof document === 'undefined') return; // SSR: no cookies or gtag to clear
			gtag('consent', 'update', { analytics_storage: 'denied' });
			win()[`ga-disable-${id}`] = true;
			// `_ga` and `_ga_<stream>` sit on the host or a parent domain (cookie_domain: auto).
			const hosts = location.hostname.split('.').map((_, i, parts) => `; Domain=${parts.slice(i).join('.')}`);
			for (const cookie of document.cookie.split('; ')) {
				const name = cookie.split('=')[0]!;
				if (name !== '_ga' && !name.startsWith('_ga_')) continue;
				for (const domain of ['', ...hosts]) document.cookie = `${name}=; Max-Age=0; Path=/${domain}`;
			}
		},
		event: (name, params) => gtag('event', name, params),
		screen(path) {
			// The real URL, referrer and document.title can carry short codes, search text or pet names: send the
			// template, keep only campaign (utm_*) parameters for attribution and only the referrer's origin.
			const utm = [...new URLSearchParams(location.search)].filter(([key]) => key.startsWith('utm_'));
			const query = new URLSearchParams(utm).toString();
			gtag('set', {
				page_location: `${location.origin}${path}${query ? `?${query}` : ''}`,
				page_referrer: document.referrer && new URL(document.referrer).origin,
				page_title: path,
			});
			gtag('event', 'page_view');
		},
		userRole: (role) => gtag('set', 'user_properties', { user_role: role }),
	};
}

import { defineRouting } from 'next-intl/routing';

/**
 * SL unprefixed, EN under /en (C15, C16). Keys are the internal paths, so route folders under app/[locale] use the
 * EN names (`app/[locale]/(public)/map/page.tsx` serves /zemljevid and /en/map). The proxy answers every page with
 * a `Link` header of hreflang alternates (sl, en, x-default; see alternates.ts) and keeps the NEXT_LOCALE cookie in step with the page.
 */
export const routing = defineRouting({
	locales: ['sl', 'en'],
	defaultLocale: 'sl',
	localePrefix: 'as-needed',
	// Locale comes from the path, so an English browser still gets the SL page at `/`.
	localeDetection: false,
	// next-intl would build the hreflang links from the request URL (Host); proxy.ts builds them from NEXT_PUBLIC_APP_URL.
	alternateLinks: false,
	// The C15 route table. Paths not listed here (/dev/*, admin pages without an SL URL in their slice) are the same in both locales.
	pathnames: {
		'/': '/',
		'/map': { sl: '/zemljevid', en: '/map' },
		'/report/lost': { sl: '/prijava/izgubljena-zival', en: '/report/lost' },
		'/report/found': { sl: '/prijava/najdena-zival', en: '/report/found' },
		'/r/[code]': '/r/[code]',
		'/r/[code]/matches': { sl: '/r/[code]/ujemanja', en: '/r/[code]/matches' },
		'/r/[code]/reunited': { sl: '/r/[code]/spet-doma', en: '/r/[code]/reunited' },
		// P9 owner "Uredi" (TASK-26.4), as mobile r/[code]/edit; C15 CHANGE requested.
		'/r/[code]/edit': { sl: '/r/[code]/uredi', en: '/r/[code]/edit' },
		'/m': '/m',
		'/my-pets': { sl: '/moje-zivali', en: '/my-pets' },
		// P8 pet pages (TASK-16.6); `new` before `[id]`, so it matches first.
		'/my-pets/new': { sl: '/moje-zivali/nova', en: '/my-pets/new' },
		'/my-pets/[id]': { sl: '/moje-zivali/[id]', en: '/my-pets/[id]' },
		'/my-pets/[id]/edit': { sl: '/moje-zivali/[id]/uredi', en: '/my-pets/[id]/edit' },
		'/my-reports': { sl: '/moje-prijave', en: '/my-reports' },
		'/inbox': { sl: '/nabiralnik', en: '/inbox' },
		'/inbox/[id]': { sl: '/nabiralnik/[id]', en: '/inbox/[id]' },
		'/account': { sl: '/racun', en: '/account' },
		'/account/alerts': { sl: '/racun/opozorila', en: '/account/alerts' },
		'/account/notifications': { sl: '/racun/obvestila', en: '/account/notifications' },
		'/account/payments': { sl: '/racun/placila', en: '/account/payments' },
		'/account/security': { sl: '/racun/varnost', en: '/account/security' },
		'/sign-in': { sl: '/vpis', en: '/sign-in' },
		'/sign-up': { sl: '/registracija', en: '/sign-up' },
		'/reset-password': { sl: '/pozabljeno-geslo', en: '/reset-password' },
		// Route handler for the Supabase Auth redirects (email links, Google): app/[locale]/auth/callback/route.ts.
		'/auth/callback': '/auth/callback',
		'/payments/return': { sl: '/placila/zakljucek', en: '/payments/return' },
		'/advertise': { sl: '/oglasevanje', en: '/advertise' },
		'/about': { sl: '/o-nas', en: '/about' },
		'/how-it-works': { sl: '/kako-deluje', en: '/how-it-works' },
		'/safety': { sl: '/varnost', en: '/safety' },
		'/faq': { sl: '/pogosta-vprasanja', en: '/faq' },
		'/for-shelters': { sl: '/za-zavetisca', en: '/for-shelters' },
		'/shelters': { sl: '/zavetisca', en: '/shelters' },
		'/shelters/[slug]': { sl: '/zavetisca/[slug]', en: '/shelters/[slug]' },
		'/guides/[slug]': { sl: '/nasveti/[slug]', en: '/guides/[slug]' },
		// SEO hubs: C15 names the SL parameter [lokacija]; next-intl needs one name for both locales.
		'/lost-pets/[location]': { sl: '/izgubljene-zivali/[location]', en: '/lost-pets/[location]' },
		'/lost-dogs/[location]': { sl: '/izgubljeni-psi/[location]', en: '/lost-dogs/[location]' },
		'/lost-cats/[location]': { sl: '/izgubljene-macke/[location]', en: '/lost-cats/[location]' },
		'/found-pets/[location]': { sl: '/najdene-zivali/[location]', en: '/found-pets/[location]' },
		'/found-dogs/[location]': { sl: '/najdeni-psi/[location]', en: '/found-dogs/[location]' },
		'/found-cats/[location]': { sl: '/najdene-macke/[location]', en: '/found-cats/[location]' },
		'/privacy': { sl: '/zasebnost', en: '/privacy' },
		'/cookies': { sl: '/piskotki', en: '/cookies' },
		'/terms': { sl: '/pogoji-uporabe', en: '/terms' },
		'/imprint': { sl: '/impresum', en: '/imprint' },
		'/accessibility': { sl: '/dostopnost', en: '/accessibility' },
		'/admin': '/admin',
		'/admin/abuse-reports': { sl: '/admin/prijave-zlorab', en: '/admin/abuse-reports' },
		'/admin/audit-log': { sl: '/admin/revizijska-sled', en: '/admin/audit-log' },
		'/admin/shelters': { sl: '/admin/zavetisca', en: '/admin/shelters' },
		// P19 sections not built yet ("Kmalu"); after the static admin paths, so those match first (routeTemplate).
		'/admin/[section]': '/admin/[section]',
		'/portal': '/portal',
	},
});

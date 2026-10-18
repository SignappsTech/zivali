// Old public paths, 301 to the current ones (TASK-114.17); wired in next.config.ts.
export const legacyRedirects = [
	{ source: '/impresum', destination: '/podatki-o-podjetju', statusCode: 301 },
	{ source: '/en/imprint', destination: '/en/company-information', statusCode: 301 },
] as const;

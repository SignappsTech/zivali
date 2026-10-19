import { createTranslator } from 'next-intl';
import { ImageResponse } from 'next/og';

import { ApiError, createApiClient } from '@zivali/api/client';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import { colors } from '@zivali/tokens/values';
import type { PublicReport } from '@zivali/types';
import { env } from '@/lib/env';
import { PHOTO_FOCUS } from '@/lib/photo';

const catalogues = { sl, en };
const SIZE = { width: 1200, height: 630 };

/** Photos load only from where the API serves them (C5): the media origin, or MinIO locally. */
const PHOTO_ORIGINS = new Set(
	[env.MEDIA_BASE_URL, env.R2_UPLOAD_ORIGIN].filter((url): url is string => !!url).map((url) => new URL(url).origin)
);

/** The first photo as a data URI (next/og refuses private addresses such as the local MinIO); none on any failure. */
async function photoData(report: PublicReport): Promise<string | undefined> {
	const url = report.photos[0]?.url;
	if (!url || !PHOTO_ORIGINS.has(new URL(url).origin)) return undefined;
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
		const type = response.headers.get('content-type') ?? '';
		if (!response.ok || !/^image\/(jpeg|png|webp)$/.test(type)) return undefined;
		return `data:${type};base64,${Buffer.from(await response.arrayBuffer()).toString('base64')}`;
	} catch {
		return undefined;
	}
}

/**
 * Open Graph image of a public report (C15 `/r/[code]/opengraph-image`, FR-011 R-011.3): the first photo and the type
 * label ("Izgubljen pes" and the name), never the location. `?lang=en` for the EN page. Unknown, held and gone
 * reports answer 404, so a preview never outlives the listing. When the API fails or takes over 3 s, the brand alone,
 * not cached, so the next crawl draws the report.
 */
export async function GET(request: Request, { params }: RouteContext<'/r/[code]/opengraph-image'>) {
	const { code } = await params;
	const locale = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'sl';
	let report: PublicReport | undefined;
	try {
		report = await createApiClient({ baseUrl: env.NEXT_PUBLIC_API_URL, locale }).request<PublicReport>(
			'GET',
			`/v1/reports/${encodeURIComponent(code)}`,
			{ signal: AbortSignal.timeout(3000) }
		);
	} catch (error) {
		if (error instanceof ApiError && ['NOT_FOUND', 'GONE', 'VALIDATION'].includes(error.code))
			return new Response(null, { status: 404 });
	}
	const t = createTranslator({ locale, messages: catalogues[locale], namespace: 'browse' });
	const label = report && t(`row_title_${report.type}`, { species: report.species });
	const photo = report && (await photoData(report));
	const c = colors.light;

	return new ImageResponse(
		<div style={{ width: '100%', height: '100%', display: 'flex', background: c.primary }}>
			{photo && (
				<img
					src={photo}
					alt=""
					width={630}
					height={630}
					style={{ width: 630, height: 630, objectFit: 'cover', objectPosition: PHOTO_FOCUS }}
				/>
			)}
			<div
				style={{
					flex: 1,
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					padding: 64,
					color: c['primary-foreground'],
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
					<svg width="64" height="64" viewBox="0 0 48 48">
						<g
							fill={c['primary-foreground']}
							stroke={c['primary-foreground']}
							strokeWidth="1.6"
							strokeLinejoin="round"
						>
							<path d="M24 45.5 C24 45.5 10.5 33.2 10.5 24.4 A13.5 13.5 0 0 1 37.5 24.4 C37.5 33.2 24 45.5 24 45.5 Z M24 17.9 A6.5 6.5 0 1 0 24 30.9 A6.5 6.5 0 1 0 24 17.9 Z" />
							<path d="M12.2 19.6 L11.2 5 L22.6 11.4 Z" />
							<path d="M35.8 19.6 L25.4 11.4 L36.8 5 Z" />
						</g>
						<circle cx="24" cy="24.4" r="3.6" fill={c['status-reunited']} />
					</svg>
					<div style={{ fontSize: 44, letterSpacing: '-0.03em' }}>Najdimo</div>
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					<div style={{ fontSize: photo ? 64 : 80, lineHeight: 1.1, letterSpacing: '-0.025em' }}>{label}</div>
					{report?.name && (
						<div style={{ fontSize: photo ? 48 : 60, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
							{report.name}
						</div>
					)}
				</div>
			</div>
		</div>,
		// A listing changes (photo, status), so the image is cached for an hour, not for a year.
		{ ...SIZE, headers: { 'cache-control': report ? 'public, max-age=3600' : 'no-store' } }
	);
}

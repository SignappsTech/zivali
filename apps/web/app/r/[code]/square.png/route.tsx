import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { colors } from '@zivali/tokens/values';
import { getPlace } from '@/lib/report';
import { fetchPhoto, getPublicReport, posterBand, printedLink, translator } from '@/lib/share';

const SIZE = { width: 1080, height: 1080 };
const STATUS_COLOUR = {
	lost: 'status-lost-subtle-foreground',
	found: 'status-found-subtle-foreground',
	sighted: 'status-sighted-subtle-foreground',
	reunited: 'status-reunited-subtle-foreground',
} as const;

// The brand fonts (OFL, assets/fonts), read once per server: not next/og's default.
let fonts: ReturnType<typeof loadFonts> | undefined;
function loadFonts() {
	const file = (name: string) => readFile(join(process.cwd(), 'assets/fonts', name));
	return Promise.all([
		file('BricolageGrotesque_700Bold.ttf').then((data) => ({ name: 'Display', data, weight: 700 as const })),
		file('AtkinsonHyperlegibleNext_400Regular.ttf').then((data) => ({ name: 'Sans', data, weight: 400 as const })),
		file('AtkinsonHyperlegibleNext_700Bold.ttf').then((data) => ({ name: 'Sans', data, weight: 700 as const })),
	]);
}

const fail = (status: number) => new Response(null, { status, headers: { 'cache-control': 'no-store' } });

/**
 * The Facebook kit's 1080 × 1080 image (P18 O2, `/r/[code]/square.png?lang=sl|en`): the photo, the type line in its
 * status colour, the name, the area's name and the short link as text (a QR on a phone screen cannot be scanned from
 * the same phone); never an exact or holding location. Light tokens, never themed. Unknown, held, gone and closed
 * reports answer 404; an API failure 503.
 */
export async function GET(request: Request, { params }: RouteContext<'/r/[code]/square.png'>) {
	const { code } = await params;
	const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'sl';
	const report = await getPublicReport(code, lang);
	if (report === 'missing' || (report !== 'error' && report.status === 'closed')) return fail(404);
	if (report === 'error') return fail(503);

	const [place, photo, loaded] = await Promise.all([
		getPlace(lang, report.area.lat, report.area.lng),
		fetchPhoto(report),
		(fonts ??= loadFonts()),
	]);
	if (report.photos.length > 0 && !photo) return fail(503);
	const t = translator(lang);
	const c = colors.light;
	const status = report.status === 'reunited' ? 'reunited' : report.type;

	return new ImageResponse(
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				padding: 56,
				background: c.background,
				color: c.foreground,
				fontFamily: 'Sans',
			}}
		>
			{photo && (
				// eslint-disable-next-line @next/next/no-img-element -- next/og draws <img>, it has no next/image
				<img
					src={`data:${photo.type};base64,${photo.data.toString('base64')}`}
					alt=""
					width={968}
					height={600}
					style={{ width: 968, height: 600, objectFit: 'cover', borderRadius: 32 }}
				/>
			)}
			<div
				style={{
					display: 'flex',
					marginTop: photo ? 40 : 0,
					fontFamily: 'Display',
					fontSize: 56,
					lineHeight: '64px',
					letterSpacing: '-0.02em',
					color: c[STATUS_COLOUR[status]],
				}}
			>
				{posterBand(report, lang)}
			</div>
			{report.name && (
				<div
					style={{
						display: 'flex',
						marginTop: 4,
						fontFamily: 'Display',
						fontSize: 132,
						lineHeight: '132px',
						letterSpacing: '-0.03em',
					}}
				>
					{report.name}
				</div>
			)}
			<div
				style={{
					marginTop: 'auto',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: 24,
					fontSize: 32,
					lineHeight: '40px',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 12,
						fontFamily: 'Display',
						fontSize: 40,
						letterSpacing: '-0.03em',
					}}
				>
					<svg width="52" height="52" viewBox="0 0 48 48">
						<g fill={c.foreground} stroke={c.foreground} strokeWidth="1.6" strokeLinejoin="round">
							<path
								fillRule="evenodd"
								d="M24 45.5 C24 45.5 10.5 33.2 10.5 24.4 A13.5 13.5 0 0 1 37.5 24.4 C37.5 33.2 24 45.5 24 45.5 Z M24 17.9 A6.5 6.5 0 1 0 24 30.9 A6.5 6.5 0 1 0 24 17.9 Z"
							/>
							<path d="M12.2 19.6 L11.2 5 L22.6 11.4 Z" />
							<path d="M35.8 19.6 L25.4 11.4 L36.8 5 Z" />
						</g>
						<circle cx="24" cy="24.4" r="3.6" fill={c['status-reunited']} />
					</svg>
					Najdimo
				</div>
				<div style={{ display: 'flex', gap: 12 }}>
					{place && <span>{`${t('poster.og_area', { area: place.area })} ·`}</span>}
					<span style={{ fontWeight: 700 }}>{printedLink(report.short_code)}</span>
				</div>
			</div>
		</div>,
		{
			...SIZE,
			fonts: loaded,
			headers: {
				'content-disposition': `inline; filename="najdimo-${report.short_code}.png"`,
				// Private: a shared cache must not keep a hidden or removed report's photo (C5 unpublish).
				'cache-control': 'private, max-age=300',
			},
		}
	);
}

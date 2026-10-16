import { posterContent, renderPosterPdf } from '@/lib/poster-pdf';
import { getPlace } from '@/lib/report';
import { fetchPhoto, getPublicReport, posterFileName } from '@/lib/share';

const fail = (status: number) => new Response(null, { status, headers: { 'cache-control': 'no-store' } });

/**
 * The A4 poster PDF of a public report (C15 `/r/[code]/poster.pdf?lang=sl|en`, P18, FR-011) in the poster language:
 * the photo, the key facts, the fuzzed area's name, the QR code and the short link; never a phone number or a
 * location. Unknown, held and gone reports answer 404, a closed search 410, a report without a photo 409 (the share
 * menu asks for one instead); an API or photo failure 503, so the client offers a retry. Reunited reports get the
 * "Spet doma" poster. The report (2 s), then the place and the photo (2.5 s) together keep it under 5 s.
 */
export async function GET(request: Request, { params }: RouteContext<'/r/[code]/poster.pdf'>) {
	const { code } = await params;
	const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'sl';
	const report = await getPublicReport(code, lang);
	if (report === 'missing') return fail(404);
	if (report === 'error') return fail(503);
	if (report.status === 'closed') return fail(410);
	if (report.photos.length === 0) return fail(409);

	const [place, photo] = await Promise.all([getPlace(lang, report.area.lat, report.area.lng), fetchPhoto(report)]);
	if (!photo) return fail(503);
	const pdf = await renderPosterPdf(posterContent(report, place, lang), photo.data);

	return new Response(new Uint8Array(pdf), {
		headers: {
			'content-type': 'application/pdf',
			'content-disposition': `inline; filename="${posterFileName(report.short_code)}"`,
			// A listing changes (status, photo), so a poster is kept for ten minutes; search engines index the page only.
			'cache-control': 'public, max-age=600',
			'x-robots-tag': 'noindex',
		},
	});
}

import { notFound } from 'next/navigation';

// Every shell link has a real page now (C15), so the catch-all only answers the 404 inside the locale layout, with
// the CSP nonce. A story whose page is still pending adds a placeholder entry here again.
export default function CatchAll(_props: PageProps<'/[locale]/[...rest]'>) {
	notFound();
}

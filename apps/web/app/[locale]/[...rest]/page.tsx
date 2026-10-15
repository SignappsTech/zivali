import { notFound } from 'next/navigation';

// Unknown paths under a locale land here so the 404 renders inside the locale layout and gets the CSP nonce.
export default function CatchAll() {
	notFound();
}

import { useTranslations } from 'next-intl';

// Sample page for the scaffold; the real home page is TASK-27.2.
export default function HomePage() {
	const t = useTranslations('pages.home');

	return (
		<main className="mx-auto max-w-3xl px-4 py-16">
			<h1 className="font-display text-3xl font-bold tracking-[-0.02em] text-balance lg:text-5xl">
				{t('hero_title')}
			</h1>
			<p className="mt-4 max-w-[58ch] text-lg text-muted-foreground lg:text-xl">{t('hero_lede')}</p>
		</main>
	);
}

// @vitest-environment node
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// The TASK-90.6 rule in eslint.config.mjs: no @zivali/api hook in what a public page loads first.
const eslint = new ESLint({ cwd: import.meta.dirname });
const restricted = async (filePath: string, code: string) => {
	const [result] = await eslint.lintText(code, { filePath });
	return result.messages.filter((message) => message.ruleId === 'no-restricted-imports').length;
};
const hook = "import { useGetMeQuery } from '@zivali/api/me';\n\nexport const query = useGetMeQuery;\n";

describe('no @zivali/api hooks on public pages', () => {
	it.each([
		'app/[locale]/(public)/about/page.tsx',
		'app/[locale]/page.tsx',
		'app/[locale]/layout.tsx',
		'components/shell/header.tsx',
		'components/shelters/shelter-search.tsx',
		'components/ads/ad-unit.tsx',
	])('flags a hook in %s', async (file) => {
		expect(await restricted(file, hook)).toBe(1);
	});

	it.each([
		'app/[locale]/(app)/account/page.tsx',
		'components/shelters/shelter-answer.tsx',
		'components/manage/manage-page.tsx',
	])('allows a hook in %s', async (file) => {
		expect(await restricted(file, hook)).toBe(0);
	});

	it('allows the rest of @zivali/api on a public page', async () => {
		const code = "import { ApiError } from '@zivali/api/client';\n\nexport const error = ApiError;\n";
		expect(await restricted('app/[locale]/(public)/shelters/page.tsx', code)).toBe(0);
	});

	// TASK-9.9: the public auth forms load lib/auth (supabase-js, zod, RTK Query) only when they send.
	it.each(['components/auth/sign-in.tsx', 'components/auth/provider-buttons.tsx'])(
		'flags a static lib/auth in %s, not lib/auth-light',
		async (file) => {
			const code = (from: string) => `import { signIn } from '${from}';\n\nexport const send = signIn;\n`;
			expect(await restricted(file, code('@/lib/auth'))).toBe(1);
			expect(await restricted(file, code('@/lib/auth-light'))).toBe(0);
			expect(await restricted('components/account/account-settings.tsx', code('@/lib/auth'))).toBe(0);
		}
	);
});

// The TASK-90.7 rule: the shell's client islands ship no next-intl client code.
describe('no next-intl client code in the shell islands', () => {
	const intl = async (filePath: string, code: string) => {
		const [result] = await eslint.lintText(code, { filePath });
		return result.messages.filter((message) => message.ruleId === '@typescript-eslint/no-restricted-imports')
			.length;
	};
	const hook = "import { useTranslations } from 'next-intl';\n\nexport const t = useTranslations;\n";

	it.each([
		['components/shell/parts.tsx', hook],
		['app/providers.tsx', "import { usePathname } from '@/i18n/navigation';\n\nexport const p = usePathname;\n"],
		[
			'components/consent/consent-banner.tsx',
			"import { Link } from '@/i18n/navigation';\n\nexport const L = Link;\n",
		],
	])('flags %s', async (file, code) => {
		expect(await intl(file, code)).toBe(1);
	});

	it('allows type imports there, and next-intl in the server shell and the app', async () => {
		const type = "import type { Locale } from 'next-intl';\n\nexport const locale: Locale = 'sl';\n";
		expect(await intl('components/shell/parts.tsx', type)).toBe(0);
		expect(await intl('components/shell/header.tsx', hook)).toBe(0);
		expect(await intl('components/account/account-settings.tsx', hook)).toBe(0);
	});

	it("flags next-intl's createNavigation anywhere, its types stay usable", async () => {
		const runtime =
			"import { createNavigation } from 'next-intl/navigation';\n\nexport const n = createNavigation;\n";
		const types =
			"import type { createNavigation } from 'next-intl/navigation';\n\nexport type N = typeof createNavigation;\n";
		expect(await intl('lib/seo.ts', runtime)).toBe(1);
		expect(await intl('components/shell/parts.tsx', runtime)).toBe(1);
		expect(await intl('i18n/navigation.ts', types)).toBe(0);
	});
});

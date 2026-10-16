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
});

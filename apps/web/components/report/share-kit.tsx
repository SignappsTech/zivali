'use client';

import type { Icon } from '@phosphor-icons/react';
import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/ssr/ArrowSquareOut';
import { CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import { FacebookLogoIcon } from '@phosphor-icons/react/dist/ssr/FacebookLogo';
import { RadioIcon } from '@phosphor-icons/react/dist/ssr/Radio';
import * as React from 'react';

import type { KitCopyKey } from '@/components/report/share-menu';
import { Button } from '@/components/ui/button';

export type FacebookGroup = { name: string; url: string; regions?: string[] };

const httpsUrl = (value: unknown) => {
	if (typeof value !== 'string') return undefined;
	try {
		return new URL(value).protocol === 'https:' ? value : undefined;
	} catch {
		return undefined;
	}
};

/**
 * C1 public config (admin-edited JSON): `share.facebook_groups` (`[{ name, url, regions? }]`, regions as C6 slugs) and
 * the local radio's announcement form (`share.radio_form_url`). Only https links open; a malformed entry is left out
 * rather than breaking the dialog. The report's region comes first.
 */
export function parseShareConfig(config: unknown, region: string | undefined) {
	const values = (config && typeof config === 'object' ? config : {}) as Record<string, unknown>;
	const entries = values['share.facebook_groups'];
	const groups = (Array.isArray(entries) ? entries : []).flatMap((entry: unknown): FacebookGroup[] => {
		const { name, url, regions } = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
		const href = httpsUrl(url);
		if (typeof name !== 'string' || !name || !href) return [];
		const slugs = Array.isArray(regions) ? regions.filter((slug): slug is string => typeof slug === 'string') : [];
		return [{ name, url: href, regions: slugs }];
	});
	const local = (group: FacebookGroup) => (region && group.regions?.includes(region) ? 0 : 1);
	return {
		groups: groups.sort((a, b) => local(a) - local(b)),
		radioFormUrl: httpsUrl(values['share.radio_form_url']),
	};
}

const ring = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** A 64 px external link row on `background` inside the dialog (P18 W2 group rows). */
function LinkRow({
	icon: RowIcon,
	label,
	url,
	opensNewTab,
}: {
	icon: Icon;
	label: string;
	url: string;
	opensNewTab: string;
}) {
	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			className={`flex min-h-16 items-center gap-3.5 rounded-row bg-background py-2.5 pr-4 pl-[18px] text-foreground no-underline hover:bg-[linear-gradient(hsl(var(--foreground)/0.1),hsl(var(--foreground)/0.1))] ${ring}`}
		>
			<RowIcon weight="bold" aria-hidden="true" className="size-6 shrink-0 text-primary" />
			<span className="min-w-0 flex-1 font-bold [overflow-wrap:anywhere]">{label}</span>
			<ArrowSquareOutIcon weight="bold" aria-hidden="true" className="size-5 shrink-0" />
			<span className="sr-only">{opensNewTab}</span>
		</a>
	);
}

/** A ready text, read-only and selectable, on the line field look (16/24, 2 px `input` underline). */
export const readyText = 'mt-3 border-b-2 border-input px-0.5 py-2.5 [overflow-wrap:anywhere] select-text';
const h3 = 'mt-8 font-display text-xl leading-7 font-semibold tracking-[-0.01em]';

export type KitProps = {
	post: string;
	media: string;
	/** The 1080 × 1080 image (`/r/[code]/square.png?lang=`) and its file name. */
	image: string;
	imageName: string;
	/** GET /v1/config/public (C1), asked when the kit opens. */
	configUrl: string;
	region: string | undefined;
	copy: Record<KitCopyKey | 'opensNewTab', string>;
	onCopy: (text: string) => void;
};

/**
 * The owner's Facebook and local media kit (P18 W2, content §4b): the ready post text, the square image, the lost-pet
 * groups on Facebook from the public config (the report's region first) and the local radio text with its
 * announcement form. Contact runs only through the link.
 */
export function ShareKit({ post, media, image, imageName, configUrl, region, copy, onCopy }: KitProps) {
	const [config, setConfig] = React.useState<ReturnType<typeof parseShareConfig>>();

	React.useEffect(() => {
		let live = true;
		fetch(configUrl)
			.then((response) => (response.ok ? response.json() : {}))
			.catch(() => ({}))
			.then((json) => live && setConfig(parseShareConfig(json, region)));
		return () => {
			live = false;
		};
	}, [configUrl, region]);

	return (
		<>
			<p className="mt-2">{copy.kitIntro}</p>

			<h3 className={h3}>{copy.kitPostTitle}</h3>
			<p className={readyText}>{post}</p>
			<Button size="lg" className="mt-4" onClick={() => onCopy(post)}>
				<CopyIcon weight="bold" aria-hidden="true" />
				{copy.kitCopy}
			</Button>
			<div className="mt-7 flex items-center gap-5">
				{/* eslint-disable-next-line @next/next/no-img-element -- a server-drawn PNG of our own, not an optimisable photo */}
				<img
					src={image}
					alt={copy.kitImageAlt}
					width={108}
					height={108}
					className="size-[108px] shrink-0 rounded-row bg-muted"
				/>
				<div className="min-w-0">
					<p className="font-bold">{copy.kitImageTitle}</p>
					<p className="text-sm text-muted-foreground tabular-nums">1080 × 1080</p>
					<Button asChild variant="secondary" size="sm" className="mt-2">
						<a href={image} download={imageName}>
							<DownloadSimpleIcon weight="bold" aria-hidden="true" />
							{copy.kitImageSave}
						</a>
					</Button>
				</div>
			</div>

			<h3 className={h3}>{copy.kitGroupsTitle}</h3>
			<p className="mt-2">{copy.kitGroupsIntro}</p>
			<p className="mt-2 text-sm text-muted-foreground">{copy.kitGroupsHint}</p>
			{config && config.groups.length > 0 && (
				<ul className="mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
					{config.groups.map((group) => (
						<li key={group.url}>
							<LinkRow
								icon={FacebookLogoIcon}
								label={group.name}
								url={group.url}
								opensNewTab={copy.opensNewTab}
							/>
						</li>
					))}
				</ul>
			)}

			<h3 className={h3}>{copy.kitMediaTitle}</h3>
			<p className="mt-2">{copy.kitMediaIntro}</p>
			<p className={readyText}>{media}</p>
			<Button variant="secondary" className="mt-4" onClick={() => onCopy(media)}>
				<CopyIcon weight="bold" aria-hidden="true" />
				{copy.kitCopy}
			</Button>
			<p className="mt-2 text-sm text-muted-foreground">{copy.kitMediaHint}</p>
			{config?.radioFormUrl && (
				<div className="mt-3">
					<LinkRow
						icon={RadioIcon}
						label={copy.kitMediaForm}
						url={config.radioFormUrl}
						opensNewTab={copy.opensNewTab}
					/>
				</div>
			)}
		</>
	);
}

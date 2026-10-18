'use client';

import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import { FacebookLogoIcon } from '@phosphor-icons/react/dist/ssr/FacebookLogo';
import { ImageIcon } from '@phosphor-icons/react/dist/ssr/Image';
import { LinkIcon } from '@phosphor-icons/react/dist/ssr/Link';
import { PrinterIcon } from '@phosphor-icons/react/dist/ssr/Printer';
import { QrCodeIcon } from '@phosphor-icons/react/dist/ssr/QrCode';
import { ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { WhatsappLogoIcon } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { DropdownMenu } from 'radix-ui';
import * as React from 'react';

import { type EventParams, track } from '@zivali/analytics';
import type { Locale } from '@zivali/i18n/format';
import { ShareKit, type KitProps } from '@/components/report/share-kit';
import { Button, buttonVariants } from '@/components/ui/button';
import { noteClass } from '@/components/shelters/classes';
import { Pill } from '@/components/ui/pill';
import { StatusLabel } from '@/components/ui/status-label';

export type ShareCopy = Record<
	| 'button'
	| 'copy'
	| 'whatsapp'
	| 'facebook'
	| 'more'
	| 'poster'
	| 'copied'
	| 'unsupported'
	| 'copyFailed'
	| 'close'
	| 'opensNewTab'
	| 'languageLabel'
	| 'languageSl'
	| 'languageEn'
	| 'download'
	| 'preparing'
	| 'print'
	| 'qrNote'
	| 'noPhoto'
	| 'failed'
	| 'tryAgain'
	| 'reunited'
	| KitCopyKey,
	string
>;
export type KitCopyKey =
	| 'kitTitle'
	| 'kitIntro'
	| 'kitPostTitle'
	| 'kitCopy'
	| 'kitCopied'
	| 'kitImageTitle'
	| 'kitImageSave'
	| 'kitImageAlt'
	| 'kitGroupsTitle'
	| 'kitGroupsIntro'
	| 'kitGroupsHint'
	| 'kitMediaTitle'
	| 'kitMediaIntro'
	| 'kitMediaHint'
	| 'kitMediaForm';

type Props = {
	/** The short canonical link (C15). */
	url: string;
	/** The localised share text with the link (content P18 §4). */
	message: string;
	/** C12 params only: enums, never ids or codes. */
	analytics: {
		report_type: EventParams['share']['report_type'];
		species: EventParams['share']['species'];
		region?: string;
	};
	poster: {
		href: Record<Locale, string>;
		fileName: Record<Locale, string>;
		/** "File: najdimo-<code>-<lang>.pdf" per language. */
		readyFile: Record<Locale, string>;
		lang: Locale;
		photo: boolean;
		reunited: boolean;
	};
	/** The owner's Facebook kit (open lost reports with an area name). */
	kit: Omit<KitProps, 'copy' | 'region' | 'onCopy'> | null;
	copy: ShareCopy;
};

type Toast = { text: string; error?: boolean };

const ring = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring';
// System §10.9 menu rows: 48 px, icon 20, 16 semibold (as slot C's "Več možnosti").
const rowClass =
	'flex min-h-12 cursor-pointer items-center gap-3 rounded-sm px-3 font-semibold text-foreground no-underline outline-hidden select-none data-[highlighted]:bg-foreground/10 [&_svg]:size-5 [&_svg]:shrink-0';

/** Toast look (system 10.9) in a polite live region; one inside each open dialog, as the page behind it is inert. */
function ToastRegion({ toast, onClose, closeLabel }: { toast?: Toast; onClose: () => void; closeLabel: string }) {
	const Icon = toast?.error ? WarningCircleIcon : CheckCircleIcon;
	return (
		<div
			role="status"
			className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex justify-center md:bottom-6"
		>
			{toast && (
				<div className="pointer-events-auto flex min-h-14 w-full max-w-[400px] items-center gap-3 rounded-row bg-popover py-1.5 pr-1.5 pl-4 text-control leading-[22px] text-popover-foreground shadow-pop">
					<Icon
						weight="fill"
						aria-hidden="true"
						className={`size-5.5 shrink-0 ${toast.error ? 'text-destructive' : 'text-primary'}`}
					/>
					<p className="min-w-0 flex-1">{toast.text}</p>
					<button
						type="button"
						aria-label={closeLabel}
						onClick={onClose}
						className={`grid size-11 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-foreground/10 ${ring}`}
					>
						<XIcon weight="bold" aria-hidden="true" className="size-6" />
					</button>
				</div>
			)}
		</div>
	);
}

/**
 * Content dialog (system 10.9): native modal (focus stays inside, Escape closes, focus returns to the opener), 600 px,
 * padding 28, h2 title, close top right; a click on the backdrop closes it.
 */
export function ContentDialog({
	title,
	closeLabel,
	onClose,
	children,
}: {
	title: string;
	closeLabel: string;
	onClose: () => void;
	children: React.ReactNode;
}) {
	const ref = React.useRef<HTMLDialogElement>(null);
	const id = React.useId();
	React.useEffect(() => {
		const dialog = ref.current;
		if (dialog && !dialog.open) dialog.showModal?.();
	}, []);

	return (
		<dialog
			ref={ref}
			aria-labelledby={id}
			onClose={onClose}
			onClick={(event) => {
				if (event.target === event.currentTarget) event.currentTarget.close();
			}}
			className="m-auto max-h-[calc(100dvh-2.5rem)] w-[calc(100%-2.5rem)] max-w-[600px] overflow-y-auto overscroll-contain rounded-card border-0 bg-popover p-0 text-popover-foreground shadow-pop backdrop:bg-scrim"
		>
			<div className="relative px-6 pt-7 pb-7 md:px-7">
				<h2
					id={id}
					className="pr-12 font-display text-2xl leading-[30px] font-bold tracking-[-0.015em] text-balance lg:text-[30px] lg:leading-9"
				>
					{title}
				</h2>
				<button
					type="button"
					aria-label={closeLabel}
					onClick={() => (ref.current?.open ? ref.current.close() : onClose())}
					className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'absolute top-4 right-3' })}
				>
					<XIcon weight="bold" aria-hidden="true" />
				</button>
				{children}
			</div>
		</dialog>
	);
}

/** P18 poster options: language, "Prenesi PDF" with its progress and failure states, "Natisni", the QR note. */
export function PosterOptions({
	poster,
	copy,
	onDownload,
}: Pick<Props, 'poster' | 'copy'> & { onDownload: () => void }) {
	const [lang, setLang] = React.useState(poster.lang);
	const [state, setState] = React.useState<'idle' | 'preparing' | 'failed'>('idle');
	const labelId = React.useId();
	const href = poster.href[lang];

	if (!poster.photo)
		return (
			<div role="note" className={`${noteClass} mt-5`}>
				<ImageIcon weight="fill" aria-hidden="true" className="mt-px size-[22px] shrink-0 text-primary" />
				<p>{copy.noPhoto}</p>
			</div>
		);

	const download = async () => {
		setState('preparing');
		try {
			const response = await fetch(href);
			if (!response.ok) throw new Error(`poster ${response.status}`);
			const file = URL.createObjectURL(await response.blob());
			const link = Object.assign(document.createElement('a'), { href: file, download: poster.fileName[lang] });
			document.body.append(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(file), 10_000);
			onDownload();
			setState('idle');
		} catch {
			setState('failed');
		}
	};

	return (
		<>
			{poster.reunited && (
				<StatusLabel status="reunited" className="mt-5 text-base [&>svg]:size-[18px]">
					{copy.reunited}
				</StatusLabel>
			)}
			<p id={labelId} className="mt-5 text-control font-bold">
				{copy.languageLabel}
			</p>
			<div role="group" aria-labelledby={labelId} className="mt-2 flex gap-2">
				<Pill pressed={lang === 'sl'} onPressedChange={() => setLang('sl')}>
					<span lang="sl">{copy.languageSl}</span>
				</Pill>
				<Pill pressed={lang === 'en'} onPressedChange={() => setLang('en')}>
					<span lang="en">{copy.languageEn}</span>
				</Pill>
			</div>
			{state === 'failed' && (
				<div role="alert" className="mt-6">
					<div className={noteClass}>
						<WarningCircleIcon
							weight="fill"
							aria-hidden="true"
							className="mt-px size-[22px] shrink-0 text-destructive"
						/>
						<p>{copy.failed}</p>
					</div>
				</div>
			)}
			<div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1">
				<Button size="lg" loading={state === 'preparing'} onClick={() => void download()}>
					<DownloadSimpleIcon weight="bold" aria-hidden="true" />
					{state === 'preparing' ? copy.preparing : state === 'failed' ? copy.tryAgain : copy.download}
				</Button>
				{/* Opens the PDF in the browser's viewer, which prints it. */}
				<Button asChild variant="text" size="lg">
					<a href={href} target="_blank" rel="noopener" onClick={onDownload}>
						<PrinterIcon weight="bold" aria-hidden="true" />
						{copy.print}
						<span className="sr-only">{copy.opensNewTab}</span>
					</a>
				</Button>
			</div>
			<p className="mt-2 text-sm text-muted-foreground tabular-nums">{poster.readyFile[lang]}</p>
			<p className="mt-6 flex gap-2 text-sm text-muted-foreground">
				<QrCodeIcon weight="bold" aria-hidden="true" className="mt-px size-[18px] shrink-0" />
				<span>{copy.qrNote}</span>
			</p>
		</>
	);
}

/**
 * P9 slot B menu (P18 sharing, FR-011), the same menu as slot C's "Več možnosti": "Kopiraj povezavo", WhatsApp,
 * Facebook (the sharer, or the owner's kit), "Več …" (the Web Share API, else the link is copied) and "Plakat s QR
 * kodo" (the poster dialog). A dialog opens once the menu has closed and handed focus back to the button, so the
 * dialog returns it there. `share` and `poster_download` go through track(), a no-op without analytics consent (C12).
 */
export function ShareMenu({ url, message, analytics, poster, kit, copy }: Props) {
	const [dialog, setDialog] = React.useState<'poster' | 'kit' | null>(null);
	const chosen = React.useRef<'poster' | 'kit' | null>(null);
	const [toast, setToast] = React.useState<Toast>();

	React.useEffect(() => {
		if (!toast) return;
		const timer = setTimeout(() => setToast(undefined), 5000);
		return () => clearTimeout(timer);
	}, [toast]);

	const shared = (method: EventParams['share']['method']) =>
		track('share', { method, report_type: analytics.report_type, species: analytics.species });
	const posterDownloaded = () => {
		// C12 `poster_download` needs the region; a report outside the 12 regions sends none.
		const region = analytics.region as EventParams['poster_download']['region'] | undefined;
		if (region) track('poster_download', { species: analytics.species, region });
	};
	const closeDialog = () => setDialog(null);
	const copyText = async (text: string, done: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setToast({ text: done });
			return true;
		} catch {
			setToast({ text: copy.copyFailed, error: true });
			return false;
		}
	};
	const copyLink = async () => {
		if (await copyText(url, copy.copied)) shared('copy_link');
	};
	const shareNative = async () => {
		if (!navigator.share) {
			await copyText(url, copy.unsupported);
			return;
		}
		try {
			await navigator.share({ text: message });
			shared('native');
		} catch (error) {
			// Closing the share sheet is a choice, not a failure.
			if ((error as Error).name !== 'AbortError') await copyText(url, copy.unsupported);
		}
	};

	return (
		<>
			{/* Not modal (the APG menu button): a modal menu aria-hides the page while its links stay focusable. */}
			<DropdownMenu.Root modal={false}>
				<DropdownMenu.Trigger asChild>
					<Button variant="ghost" size="sm" className="[&_svg]:size-5">
						<ShareNetworkIcon weight="bold" aria-hidden="true" />
						{copy.button}
					</Button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Portal>
					<DropdownMenu.Content
						align="start"
						sideOffset={8}
						collisionPadding={20}
						aria-label={copy.button}
						className="z-50 w-68 max-w-[calc(100vw-40px)] rounded-row bg-popover p-2 text-popover-foreground shadow-pop"
						// Runs before the menu focuses its trigger: the dialog then opens over a focused button.
						onCloseAutoFocus={() => {
							if (!chosen.current) return;
							setDialog(chosen.current);
							chosen.current = null;
						}}
					>
						<DropdownMenu.Item className={rowClass} onSelect={() => void copyLink()}>
							<LinkIcon weight="bold" aria-hidden="true" />
							{copy.copy}
						</DropdownMenu.Item>
						<DropdownMenu.Item asChild className={rowClass} onSelect={() => shared('whatsapp')}>
							<a
								href={`https://wa.me/?text=${encodeURIComponent(message)}`}
								target="_blank"
								rel="noopener noreferrer"
							>
								<WhatsappLogoIcon weight="bold" aria-hidden="true" />
								{copy.whatsapp}
								<span className="sr-only">{copy.opensNewTab}</span>
							</a>
						</DropdownMenu.Item>
						{kit ? (
							<DropdownMenu.Item
								className={rowClass}
								aria-haspopup="dialog"
								onSelect={() => (chosen.current = 'kit')}
							>
								<FacebookLogoIcon weight="bold" aria-hidden="true" />
								{copy.facebook}
							</DropdownMenu.Item>
						) : (
							<DropdownMenu.Item asChild className={rowClass} onSelect={() => shared('facebook')}>
								<a
									href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									<FacebookLogoIcon weight="bold" aria-hidden="true" />
									{copy.facebook}
									<span className="sr-only">{copy.opensNewTab}</span>
								</a>
							</DropdownMenu.Item>
						)}
						<DropdownMenu.Item className={rowClass} onSelect={() => void shareNative()}>
							<ShareNetworkIcon weight="bold" aria-hidden="true" />
							{copy.more}
						</DropdownMenu.Item>
						<DropdownMenu.Separator className="mx-3 my-1.5 h-px bg-border" />
						<DropdownMenu.Item
							className={rowClass}
							aria-haspopup="dialog"
							onSelect={() => (chosen.current = 'poster')}
						>
							<PrinterIcon weight="bold" aria-hidden="true" />
							{copy.poster}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
			<ToastRegion
				toast={dialog ? undefined : toast}
				onClose={() => setToast(undefined)}
				closeLabel={copy.close}
			/>

			{dialog === 'poster' && (
				<ContentDialog title={copy.poster} closeLabel={copy.close} onClose={closeDialog}>
					<PosterOptions poster={poster} copy={copy} onDownload={posterDownloaded} />
				</ContentDialog>
			)}
			{dialog === 'kit' && kit && (
				<ContentDialog title={copy.kitTitle} closeLabel={copy.close} onClose={closeDialog}>
					<ShareKit
						{...kit}
						region={analytics.region}
						copy={copy}
						onCopy={async (text, facebook) => {
							if ((await copyText(text, copy.kitCopied)) && facebook) shared('facebook');
						}}
					/>
					<ToastRegion toast={toast} onClose={() => setToast(undefined)} closeLabel={copy.close} />
				</ContentDialog>
			)}
		</>
	);
}

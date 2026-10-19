'use client';

import 'react-image-crop/dist/ReactCrop.css';
import './crop-dialog.css';

import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import ReactCrop from 'react-image-crop';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

import { type CropRect, initialCrop, MIN_CROP_EDGE, toImageRect } from './crop';

type CropDialogProps = {
	/** The prepared JPEG the form holds (C5) and its size in pixels. */
	photo: { file: Blob; width: number; height: number };
	/** The photo's alternative text. */
	alt: string;
	/** "Uporabi": the frame in the image's pixels. The parent closes the dialog when it is done. */
	onApply: (crop: CropRect) => Promise<unknown>;
	/** "Prekliči", Esc or a click outside: nothing changes. The parent moves focus back once it has closed. */
	onCancel: () => void;
};

/**
 * The crop tool of wireframe M-ai-prefill F11 (C19 §Crop, ADR-017 react-image-crop): a free frame over the dimmed
 * photo with rule-of-thirds lines, never outside it or under 320 px of the image on either side; no rotation or zoom.
 * Full screen at phone width, a 680 px dialog from md. It opens on the frame; Esc is Prekliči. Loaded with
 * next/dynamic, so the library is only fetched when a crop starts.
 */
export function CropDialog({ photo, alt, onApply, onCancel }: CropDialogProps) {
	const t = useTranslations('ai_prefill');
	const [crop, setCrop] = React.useState(() => initialCrop(photo.width, photo.height));
	// Shown pixels per image pixel: the library takes the minimum in shown pixels.
	const [scale, setScale] = React.useState(0);
	const [busy, setBusy] = React.useState(false);
	const stage = React.useRef<HTMLDivElement>(null);
	const keysId = React.useId();
	// The keyboard help is the frame's description (the library sets only its role and name). A ref, not an effect:
	// the dialog's portal mounts a render after this component.
	const attach = React.useCallback(
		(node: HTMLDivElement | null) => {
			stage.current = node;
			node?.querySelector('.ReactCrop__crop-selection')?.setAttribute('aria-describedby', keysId);
		},
		[keysId]
	);

	// The prepared JPEG, its object URL living as long as the element; measured once loaded and whenever its shown size
	// changes (a phone turned, a resized window).
	const image = React.useCallback(
		(node: HTMLImageElement | null) => {
			if (!node) return;
			const url = URL.createObjectURL(photo.file);
			const measure = () => setScale(node.width / photo.width);
			const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
			node.addEventListener('load', measure);
			observer?.observe(node);
			node.src = url;
			return () => {
				observer?.disconnect();
				node.removeEventListener('load', measure);
				URL.revokeObjectURL(url);
			};
		},
		[photo.file, photo.width]
	);

	const min = MIN_CROP_EDGE * scale;
	const apply = async () => {
		setBusy(true);
		await onApply(toImageRect(crop, photo.width, photo.height));
	};

	return (
		<Dialog open onOpenChange={(open) => !open && !busy && onCancel()}>
			<DialogContent
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					stage.current?.querySelector<HTMLElement>('.ReactCrop__crop-selection')?.focus();
				}}
				className="flex max-w-[680px] flex-col max-md:inset-0 max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:translate-0 max-md:rounded-none max-md:px-5 max-md:pt-5 max-md:pb-0 md:px-8 md:pb-7"
			>
				<DialogTitle>{t('crop_photo')}</DialogTitle>
				<DialogDescription className="mt-2 text-base leading-6 text-muted-foreground">
					{t('crop_help')}
				</DialogDescription>
				<div ref={attach} className="mt-4 flex min-h-0 justify-center max-md:flex-1 max-md:items-center">
					<ReactCrop
						crop={crop}
						onChange={(_, percent) => setCrop(percent)}
						minWidth={min}
						minHeight={min}
						keepSelection
						ruleOfThirds
						ariaLabels={{
							cropArea: t('crop_frame'),
							nwDragHandle: t('crop_nw'),
							neDragHandle: t('crop_ne'),
							seDragHandle: t('crop_se'),
							swDragHandle: t('crop_sw'),
							// Hidden: the edges resize with the pointer only.
							nDragHandle: '',
							eDragHandle: '',
							sDragHandle: '',
							wDragHandle: '',
						}}
						className="crop-tool max-h-[calc(100dvh-280px)] md:max-h-[min(60dvh,520px)]"
					>
						{/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, set by the ref */}
						<img
							ref={image}
							alt={alt}
							width={photo.width}
							height={photo.height}
							className="h-auto w-auto"
						/>
					</ReactCrop>
				</div>
				<p id={keysId} className="mt-4 flex items-start gap-1.5 text-sm text-muted-foreground max-md:sr-only">
					<InfoIcon weight="bold" aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
					<span className="min-w-0 flex-1">{t('crop_keys')}</span>
				</p>
				<div className="mt-6 flex justify-end gap-2 max-md:mt-4 max-md:grid max-md:pb-6 max-md:*:w-full">
					<Button type="button" variant="text" onClick={onCancel} disabled={busy} className="max-md:order-2">
						{t('crop_cancel')}
					</Button>
					<Button type="button" size="lg" loading={busy} onClick={apply} className="max-md:order-1">
						{t('crop_apply')}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

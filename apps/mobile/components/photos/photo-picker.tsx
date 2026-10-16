import { ArrowClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { ArrowDownIcon } from 'phosphor-react-native/src/icons/ArrowDown';
import { ArrowUpIcon } from 'phosphor-react-native/src/icons/ArrowUp';
import { CameraIcon } from 'phosphor-react-native/src/icons/Camera';
import { ImagesIcon } from 'phosphor-react-native/src/icons/Images';
import { TrashIcon } from 'phosphor-react-native/src/icons/Trash';
import * as React from 'react';
import { AccessibilityInfo, Image, Pressable, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useTranslations } from 'use-intl';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useFocusRing } from '@/components/ui/focus-ring';
import { FieldError } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

import type { PhotoExif } from './prepare-photo';
import { type DraftKind, type PickedPhoto, type SavedPhoto, usePhotoUploads } from './use-photo-uploads';

/** Photo source tile (P6 .ptile): card surface, radius 20, the tile is the button; pressed lays foreground at 10 %. */
function Tile({
	icon,
	label,
	onPress,
	ref,
}: {
	icon: typeof CameraIcon;
	label: string;
	onPress: () => void;
	ref?: React.Ref<View>;
}) {
	const reduceMotion = useReducedMotion();
	const focus = useFocusRing();
	return (
		<Pressable
			ref={ref}
			role="button"
			onPress={onPress}
			onFocus={focus.onFocus}
			onBlur={focus.onBlur}
			style={focus.ringStyle}
			className={cn(
				'min-h-24 flex-1 items-center justify-center gap-2 rounded-row bg-card p-3 active:bg-foreground/10',
				!reduceMotion && 'active:scale-[0.98]'
			)}
		>
			<Icon as={icon} size={32} className="text-primary" />
			<Text className="text-center font-sans-bold">{label}</Text>
		</Pressable>
	);
}

type PhotoPickerProps = {
	/** C17 draft id; its photos survive an app restart (`clearPhotoDraft` when the report is sent). */
	draft: string;
	/** The draft's kind, for its row in the drafts table. */
	kind: DraftKind;
	/** Shows the P2 camera primer (TASK-12.2 PermissionPrimer) before the OS prompt; resolves true on "Allow". */
	cameraPrimer: () => Promise<boolean>;
	/** Every change, in order; uploaded photos carry `photoId`, and each is a PreparedPhoto the outbox can take. */
	onChange?: (photos: PickedPhoto[]) => void;
	/** Place and time read from a photo, for LocationPicker `suggested`. Coarsen the point before it goes anywhere. */
	onExif?: (exif: PhotoExif) => void;
	/** Photos the entity already has (editing a pet), read on mount; they come first. */
	saved?: SavedPhoto[];
	/** Remove asks first with this dialog copy (P8: removed photos are deleted from storage too). */
	confirmRemove?: { title: string; body: string; confirm: string };
	/** true keeps the photos on this device and uploads them once false, e.g. until a lost report has an account (C3). */
	hold?: boolean;
	className?: string;
};

/**
 * Photo step of P6 and P7 (FR-003): camera and gallery tiles, then a row per photo with its preview, upload progress,
 * retry, reorder and remove. Up to 5 photos.
 */
export function PhotoPicker({
	draft,
	kind,
	cameraPrimer,
	onChange,
	onExif,
	saved,
	confirmRemove,
	hold,
	className,
}: PhotoPickerProps) {
	const t = useTranslations('photos');
	const message = useTranslations();
	const { photos, preparing, notice, pick, remove, move, retry } = usePhotoUploads(draft, kind, {
		cameraPrimer,
		onExif,
		saved,
		hold,
	});
	// The photo waiting for the remove confirmation.
	const [removing, setRemoving] = React.useState<string>();
	const addRef = React.useRef<View>(null);
	// The removed photo's controls are gone, so a screen reader would be left nowhere: land on the add button.
	const refocus = () =>
		setTimeout(() => {
			if (addRef.current) AccessibilityInfo.sendAccessibilityEvent(addRef.current, 'focus');
		}, 300);

	const changed = React.useEffectEvent((next: PickedPhoto[]) => onChange?.(next));
	React.useEffect(() => changed(photos), [photos]);

	return (
		<View className={cn('gap-7', className)}>
			<View className="gap-3">
				<View className="flex-row gap-3">
					<Tile ref={addRef} icon={CameraIcon} label={t('take')} onPress={() => void pick('camera')} />
					<Tile icon={ImagesIcon} label={t('choose')} onPress={() => void pick('gallery')} />
				</View>
				{notice && <FieldError>{message(notice)}</FieldError>}
			</View>

			{photos.length + preparing > 0 && (
				<View className="gap-5">
					{photos.map((photo, index) => {
						const n = index + 1;
						const percent = Math.round(photo.progress * 100);
						// A held photo is kept on this device; it reads as ready, its upload comes later.
						const ready = photo.status === 'uploaded' || photo.status === 'kept';
						return (
							<View key={photo.key} className="flex-row items-start gap-4">
								<Image
									source={{ uri: photo.thumb.uri }}
									alt={t('thumb_alt', { n, total: photos.length })}
									className="size-20 rounded-row bg-muted"
									resizeMode="cover"
								/>
								<View className="min-w-0 flex-1">
									{ready && index === 0 && (
										<Text className="font-sans-bold text-sm">{t('cover')}</Text>
									)}
									{photo.status === 'uploading' && (
										<>
											<Text className="text-sm">{t('uploading', { percent })}</Text>
											<Progress
												className="mt-2"
												value={percent}
												aria-label={t('progress_a11y', { n })}
											/>
										</>
									)}
									{photo.status === 'failed' && (
										<>
											<Progress error value={percent} aria-hidden />
											<FieldError className="mt-2">
												{message(photo.error ?? 'photos.failed')}
											</FieldError>
										</>
									)}
									<View className={cn('-ml-2.5 flex-row flex-wrap gap-1', ready ? 'mt-2' : 'mt-1')}>
										{photo.status === 'failed' ? (
											<Button variant="text" onPress={() => retry(photo.key)}>
												<Icon as={ArrowClockwiseIcon} />
												{t('retry')}
											</Button>
										) : (
											<>
												{index > 0 && (
													<Button
														variant="ghost"
														size="icon"
														aria-label={t('move_left', { n })}
														onPress={() => move(index, -1)}
													>
														<Icon as={ArrowUpIcon} />
													</Button>
												)}
												{index < photos.length - 1 && (
													<Button
														variant="ghost"
														size="icon"
														aria-label={t('move_right', { n })}
														onPress={() => move(index, 1)}
													>
														<Icon as={ArrowDownIcon} />
													</Button>
												)}
											</>
										)}
										<Button
											variant="ghost"
											size="icon"
											aria-label={t('remove', { n })}
											onPress={() => (confirmRemove ? setRemoving(photo.key) : remove(photo.key))}
										>
											<Icon as={TrashIcon} />
										</Button>
									</View>
								</View>
							</View>
						);
					})}
					{Array.from({ length: preparing }, (_, index) => (
						<Skeleton key={`preparing-${index}`} className="size-20 rounded-row" />
					))}
				</View>
			)}
			{confirmRemove && (
				<AlertDialog
					open={removing !== undefined}
					onOpenChange={(open) => {
						if (!open) {
							setRemoving(undefined);
							refocus();
						}
					}}
				>
					<AlertDialogContent>
						<AlertDialogTitle>{confirmRemove.title}</AlertDialogTitle>
						<AlertDialogDescription>{confirmRemove.body}</AlertDialogDescription>
						<AlertDialogFooter>
							<AlertDialogAction size="lg" onPress={() => removing && remove(removing)}>
								{confirmRemove.confirm}
							</AlertDialogAction>
							<AlertDialogCancel>{message('common.cancel')}</AlertDialogCancel>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</View>
	);
}

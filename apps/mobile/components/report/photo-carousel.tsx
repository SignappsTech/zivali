import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { ImageBrokenIcon } from 'phosphor-react-native/src/icons/ImageBroken';
import { PawPrintIcon } from 'phosphor-react-native/src/icons/PawPrint';
import * as React from 'react';
import {
	FlatList,
	Image,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	useWindowDimensions,
	View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useTranslations } from 'use-intl';

import type { PublicReport } from '@zivali/types';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

export const PHOTO_HEIGHT = 340;

type Photo = Pick<PublicReport['photos'][number], 'url' | 'alt'>;

/** S4 image failure: a `muted` tile with the sentence, in the photo's place. */
function Failed() {
	const t = useTranslations('report');
	return (
		<View className="flex-1 items-center justify-center gap-2 bg-muted px-5">
			<Icon as={ImageBrokenIcon} size={32} className="text-muted-foreground" />
			<Text className="text-center text-muted-foreground">{t('photo_failed')}</Text>
		</View>
	);
}

/**
 * P9 mobile photo carousel: full-bleed under the status bar, 340 px high, bottom radius 32; swipe or the named
 * previous and next buttons; the position ("1 / 4") is live text below the photo, never on it. Each photo carries its
 * alt text from the API (content slice §11). No photo: a quiet `muted` tile.
 */
export function PhotoCarousel({ photos }: { photos: Photo[] }) {
	const t = useTranslations('report');
	const { width } = useWindowDimensions();
	const reduceMotion = useReducedMotion();
	const list = React.useRef<FlatList<Photo>>(null);
	const [index, setIndex] = React.useState(0);
	const [failed, setFailed] = React.useState<ReadonlySet<number>>(new Set());
	const total = photos.length;

	const go = (next: number) => {
		setIndex(next);
		list.current?.scrollToIndex({ index: next, animated: !reduceMotion });
	};
	const onSettle = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
		setIndex(Math.round(event.nativeEvent.contentOffset.x / width));

	return (
		<View>
			<View className="overflow-hidden rounded-b-[32px] bg-muted" style={{ height: PHOTO_HEIGHT }}>
				{total === 0 ? (
					<View aria-hidden className="flex-1 items-center justify-center">
						<Icon as={PawPrintIcon} size={48} weight="fill" className="text-muted-foreground" />
					</View>
				) : (
					<FlatList
						ref={list}
						data={photos}
						horizontal
						pagingEnabled
						showsHorizontalScrollIndicator={false}
						keyExtractor={(photo) => photo.url}
						getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
						onMomentumScrollEnd={onSettle}
						renderItem={({ item, index: i }) =>
							failed.has(i) ? (
								<View style={{ width }}>
									<Failed />
								</View>
							) : (
								<Image
									source={{ uri: item.url }}
									role="img"
									accessible
									aria-label={item.alt}
									resizeMode="cover"
									style={{ width, height: PHOTO_HEIGHT }}
									onError={() => setFailed((set) => new Set(set).add(i))}
								/>
							)
						}
					/>
				)}
			</View>
			{total > 1 && (
				<View className="mt-1 flex-row items-center justify-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						aria-label={t('photo_prev')}
						disabled={index === 0}
						className="bg-transparent"
						onPress={() => go(index - 1)}
					>
						<Icon as={CaretLeftIcon} />
					</Button>
					<Text
						aria-live="polite"
						className="min-w-10 text-center text-sm tabular-nums text-muted-foreground"
					>
						{t('photo_position', { n: index + 1, total })}
					</Text>
					<Button
						variant="ghost"
						size="icon"
						aria-label={t('photo_next')}
						disabled={index === total - 1}
						className="bg-transparent"
						onPress={() => go(index + 1)}
					>
						<Icon as={CaretRightIcon} />
					</Button>
				</View>
			)}
		</View>
	);
}

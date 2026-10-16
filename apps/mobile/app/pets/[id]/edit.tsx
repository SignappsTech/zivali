import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRequireAuth } from '@zivali/api/auth';
import { useGetPetQuery } from '@zivali/api/pets';
import { InlineError, Loading } from '@/components/notifications/notifications-view';
import { PetFlow } from '@/components/pets/pet-flow';

/** P8 edit a pet: the add flow, filled from the stored pet. */
export default function EditPet() {
	const { gate } = useRequireAuth();
	const { id } = useLocalSearchParams<{ id: string }>();
	const { data, isLoading, isFetching, refetch } = useGetPetQuery(
		{ id },
		{ skip: gate === 'loading' || gate === 'signin' }
	);
	if (gate === 'signin') return <Redirect href="/profile" />;
	if (data) return <PetFlow pet={data} />;
	return (
		<SafeAreaView className="flex-1 bg-background px-5">
			{gate === 'loading' || isLoading ? (
				<Loading />
			) : (
				<InlineError className="mt-5" retrying={isFetching} onRetry={() => void refetch()} />
			)}
		</SafeAreaView>
	);
}

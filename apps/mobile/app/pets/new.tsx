import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useRequireAuth } from '@zivali/api/auth';
import { PetFlow } from '@/components/pets/pet-flow';

/** P8 add a pet (signed in only). */
export default function NewPet() {
	const { gate } = useRequireAuth();
	if (gate === 'signin') return <Redirect href="/profile" />;
	if (gate === 'loading') return <View className="flex-1 bg-background" />;
	return <PetFlow />;
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { PetInput } from '@zivali/validation/pets.schema';
import { emptyPetFields, PetFields, type PetFieldValues } from '@/components/pets/pet-fields';
import { Button } from '@/components/ui/button';

/** A bare profile form around PetFields; the parsed PetInput shows under it (dev page only, nothing is sent). */
export function PetFieldsDemo() {
	const t = useTranslations('pets');
	const form = useForm<PetFieldValues, unknown, z.output<typeof PetInput>>({
		resolver: zodResolver(PetInput),
		defaultValues: emptyPetFields,
	});
	const [saved, setSaved] = useState<z.output<typeof PetInput> | null>(null);

	return (
		<FormProvider {...form}>
			<form noValidate onSubmit={form.handleSubmit(setSaved)} className="grid gap-10">
				<PetFields />
				<Button type="submit" size="lg" className="justify-self-start">
					{t('save')}
				</Button>
			</form>
			{saved && (
				<pre data-testid="saved" className="overflow-x-auto rounded-row bg-muted p-4 text-sm">
					{JSON.stringify(saved, null, 2)}
				</pre>
			)}
		</FormProvider>
	);
}

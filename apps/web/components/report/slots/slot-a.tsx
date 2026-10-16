import type { ReportSlotProps } from '@/components/report/slots/types';

/**
 * P9 action slot A, type dependent: lost "Sporoči opažanje" with the text button "Pošlji sporočilo"; found "To je moja
 * žival" with "Sporoči opažanje"; sighted "Pošlji sporočilo" with "To je moja žival". The owner (`is_mine`) gets
 * "Žival je spet doma", "Uredi" and "Plakat" instead. Empty until the web sighting (TASK-30.2), contact (TASK-21.3)
 * and owner actions (TASK-26.4) fill it; the layout renders it only while the report is open or matched.
 */
export function SlotA(_props: ReportSlotProps) {
	return null;
}

import { OwnerActions } from '@/components/report/owner-actions';
import type { ReportSlotProps } from '@/components/report/slots/types';

/**
 * P9 action slot A, type dependent: lost "Sporoči opažanje" with the text button "Pošlji sporočilo"; found "To je moja
 * žival" with "Sporoči opažanje"; sighted "Pošlji sporočilo" with "To je moja žival". The report's managers
 * (`is_mine`) get the owner actions instead (owner-actions.tsx, P14): "Žival je spet doma", "Uredi", "Zaključi
 * iskanje", and "Ponovno odpri" within the reopen window. The visitor actions are empty until the web sighting
 * (TASK-30.2) and contact (TASK-21.3) fill them. The layout renders the slot while the report is open or matched, and
 * for its managers also once it ended (reopen).
 */
export function SlotA({ report, className }: ReportSlotProps) {
	return report.is_mine ? <OwnerActions report={report} className={className} /> : null;
}

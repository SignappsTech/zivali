import type { PublicReport, ReportOwnerView } from '@zivali/types';

/** The report a slot acts on: the public view, plus the manager fields when the viewer manages it (`is_mine`). */
export type DetailReport = PublicReport & Partial<Omit<ReportOwnerView, keyof PublicReport>>;

export type ReportSlotProps = {
	report: DetailReport;
	/** Spacing from the layout, so an empty slot leaves no gap. */
	className?: string;
};

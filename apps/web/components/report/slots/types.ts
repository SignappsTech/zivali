import type { PublicReport, ReportOwnerView } from '@zivali/types';
import type { ReportPlace } from '@/lib/report';

/** The report a slot acts on: the public view, plus the manager fields when the viewer manages it (`is_mine`). */
export type DetailReport = PublicReport & Partial<Omit<ReportOwnerView, keyof PublicReport>>;

export type ReportSlotProps = {
	report: DetailReport;
	/** The page's reverse lookup of the fuzzed area (slot B's share texts); undefined when it failed. */
	place?: ReportPlace;
	/** Spacing from the layout, so an empty slot leaves no gap. */
	className?: string;
};

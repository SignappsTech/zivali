import type * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { PublicReport, ReportOwnerView } from '@zivali/types';

/** The report a slot acts on: the public view, plus the manager fields when the viewer manages it (`is_mine`). */
export type DetailReport = PublicReport & Partial<Omit<ReportOwnerView, keyof PublicReport>>;

export type ReportSlotProps = {
	report: DetailReport;
	/** The report is the saved copy: slot A disables what needs the network. */
	offline: boolean;
	/** How the layout places the slot (slot B: the floating or the top bar button). */
	className?: string;
	style?: StyleProp<ViewStyle>;
	/** Slot A puts this beside its primary action: the slot C overflow. */
	children?: React.ReactNode;
};

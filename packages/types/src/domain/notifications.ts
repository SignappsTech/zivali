// C10 notifications (inbox, prefs, push tokens) and nearby alerts.
import type { IsoDateTime, LatLng, Page, Uuid } from './common.ts';
import type { DistanceBand, NotificationType, PaymentPurpose, PushPlatform, ReportType, Species } from './enums.ts';

type Named = { has_name: 'yes' | 'no'; pet_name?: string; species: Species };
/** Payload per notification type (variables for the notification and email copy). */
export type NotificationPayloads = {
	match_chip: Named & { match_id: Uuid; lost_code: string; other_code: string; other_type: 'found' | 'sighted' };
	match_suggested: Named & {
		match_id: Uuid;
		lost_code: string;
		strength: 'good' | 'strong';
		other_type: 'found' | 'sighted';
	};
	match_confirmed: { conversation_id: Uuid; report_code: string; species: Species; report_type: 'found' | 'sighted' };
	chat_message: { conversation_id: Uuid; preview_alias: string; unread_count: number };
	nearby_lost: {
		report_code: string;
		species: Species;
		distance_band: DistanceBand;
		has_area: boolean;
		area_name?: string;
		reported_at: IsoDateTime;
	};
	report_reminder: Named & { report_code: string; day: 7 | 14 | 30 };
	report_expiring: Named & { report_code: string; report_type: ReportType; days_left: number };
	report_closed: Named & { report_code: string; report_type: ReportType; idle_days: number; reopen_days: number };
	report_hidden: { report_code: string; report_type: ReportType; support_email: string };
	report_reunited: { report_code: string; species: Species };
	manage_link: { report_code: string; report_type: 'found' | 'sighted'; species: Species; manage_url: string };
	payment_receipt: {
		payment_id: Uuid;
		amount_cents: number;
		purpose: PaymentPurpose;
		paid_at: IsoDateTime;
		receipt_ref: string;
		is_test: boolean;
		/** Fiscal invoice (C13 §Fiscal invoices): number and ZOI when one was issued, the EOR once FURS confirmed it. */
		has_invoice: boolean;
		invoice_number?: string;
		zoi?: string;
		has_eor: boolean;
		eor?: string;
	};
};

/** Inbox row; narrow `payload` with NotificationPayloads[type]. */
export type Notification = {
	id: Uuid;
	type: NotificationType;
	payload: Record<string, unknown>;
	read_at: IsoDateTime | null;
	created_at: IsoDateTime;
};
export type NotificationList = Page<Notification> & { unread: number };
export type MarkNotificationsReadInput = { ids: Uuid[] } | { all: true };
export type NotificationPref = { type: NotificationType; in_app: boolean; push: boolean; email: boolean };
export type NotificationPrefs = { items: NotificationPref[]; quiet_from: string | null; quiet_to: string | null };
export type NotificationPrefInput = { in_app?: boolean; push?: boolean; email?: boolean };
export type PushTokenInput = { token: string; platform: PushPlatform };

/** PUT /v1/alert-subscription */
export type AlertSubscriptionInput = { center: LatLng; radius_km: number; species: Species[]; paused: boolean };
export type AlertSubscription = AlertSubscriptionInput & {
	daily_cap: number;
	created_at: IsoDateTime;
	updated_at: IsoDateTime;
};

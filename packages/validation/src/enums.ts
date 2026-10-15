// zod enums for the C3–C18 value sets (tuples in @zivali/types), each a named OpenAPI component.
import * as E from '@zivali/types';

import { z } from './zod.ts';

export const ErrorCode = z.enum(E.ERROR_CODES).openapi('ErrorCode');
export const Locale = z.enum(E.LOCALES).openapi('Locale');
export const UserRole = z.enum(E.USER_ROLES).openapi('UserRole');
export const Aal = z.enum(E.AALS).openapi('Aal');
export const Species = z.enum(E.SPECIES).openapi('Species');
export const ReportType = z.enum(E.REPORT_TYPES).openapi('ReportType');
export const ReportStatus = z.enum(E.REPORT_STATUSES).openapi('ReportStatus');
export const CloseReason = z.enum(E.CLOSE_REASONS).openapi('CloseReason');
export const ModerationState = z.enum(E.MODERATION_STATES).openapi('ModerationState');
export const Size = z.enum(E.SIZES).openapi('Size');
export const Sex = z.enum(E.SEXES).openapi('Sex');
export const Colour = z.enum(E.COLOURS).openapi('Colour');
export const Pattern = z.enum(E.PATTERNS).openapi('Pattern');
export const ContactPref = z.enum(E.CONTACT_PREFS).openapi('ContactPref');
export const ReportSource = z.enum(E.REPORT_SOURCES).openapi('ReportSource');
export const ChipStatus = z.enum(E.CHIP_STATUSES).openapi('ChipStatus');
export const ChipRegisteredCrhz = z.enum(E.CHIP_REGISTERED_CRHZ).openapi('ChipRegisteredCrhz');
export const Lifestyle = z.enum(E.LIFESTYLES).openapi('Lifestyle');
export const ReportManagerRole = z.enum(E.REPORT_MANAGER_ROLES).openapi('ReportManagerRole');
export const ReportTransitionAction = z.enum(E.REPORT_TRANSITION_ACTIONS).openapi('ReportTransitionAction');
export const ReportWarning = z.enum(E.REPORT_WARNINGS).openapi('ReportWarning');
export const ReportSort = z.enum(E.REPORT_SORTS).openapi('ReportSort');
export const PhotoStatus = z.enum(E.PHOTO_STATUSES).openapi('PhotoStatus');
export const PhotoRejectReason = z.enum(E.PHOTO_REJECT_REASONS).openapi('PhotoRejectReason');
export const PlaceKind = z.enum(E.PLACE_KINDS).openapi('PlaceKind');
export const DistanceBand = z.enum(E.DISTANCE_BANDS).openapi('DistanceBand');
export const MatchState = z.enum(E.MATCH_STATES).openapi('MatchState');
export const MatchStrength = z.enum(E.MATCH_STRENGTHS).openapi('MatchStrength');
export const MatchReasonCode = z.enum(E.MATCH_REASON_CODES).openapi('MatchReasonCode');
export const ConversationStatus = z.enum(E.CONVERSATION_STATUSES).openapi('ConversationStatus');
export const MessageKind = z.enum(E.MESSAGE_KINDS).openapi('MessageKind');
export const AliasKey = z.enum(E.ALIAS_KEYS).openapi('AliasKey');
export const NotificationType = z.enum(E.NOTIFICATION_TYPES).openapi('NotificationType');
export const PushPlatform = z.enum(E.PUSH_PLATFORMS).openapi('PushPlatform');
export const AbuseReason = z.enum(E.ABUSE_REASONS).openapi('AbuseReason');
export const AbuseTargetType = z.enum(E.ABUSE_TARGET_TYPES).openapi('AbuseTargetType');
export const AbuseStatus = z.enum(E.ABUSE_STATUSES).openapi('AbuseStatus');
export const ModerationFlagKind = z.enum(E.MODERATION_FLAG_KINDS).openapi('ModerationFlagKind');
export const ModerationFlagTargetType = z.enum(E.MODERATION_FLAG_TARGET_TYPES).openapi('ModerationFlagTargetType');
export const PaymentPurpose = z.enum(E.PAYMENT_PURPOSES).openapi('PaymentPurpose');
export const PaymentStatus = z.enum(E.PAYMENT_STATUSES).openapi('PaymentStatus');
export const AdSlot = z.enum(E.AD_SLOTS).openapi('AdSlot');
export const AdStatus = z.enum(E.AD_STATUSES).openapi('AdStatus');
export const AdHouseKind = z.enum(E.AD_HOUSE_KINDS).openapi('AdHouseKind');
export const AdLabel = z.enum(E.AD_LABELS).openapi('AdLabel');
export const LeadInterest = z.enum(E.LEAD_INTERESTS).openapi('LeadInterest');

/** Label keys of the `attributes` i18n namespace (C16): `attributes.<group>.<value>`. */
export const ATTRIBUTE_LABEL_KEYS = [
	...E.SPECIES.map((v) => `attributes.species.${v}`),
	...E.SIZES.map((v) => `attributes.size.${v}`),
	...E.SEXES.map((v) => `attributes.sex.${v}`),
	...E.COLOURS.map((v) => `attributes.colours.${v}`),
	...E.PATTERNS.map((v) => `attributes.patterns.${v}`),
];

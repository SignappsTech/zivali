// Closed value sets from the contracts (docs/tech/contracts). Tuples are the single source: Postgres enums,
// zod enums (`@zivali/validation/enums`) and i18n label keys are built from them.

type Values<T extends readonly string[]> = T[number];

// C1 error codes and their HTTP status
export const ERROR_CODES = [
	'VALIDATION',
	'UNAUTHENTICATED',
	'FORBIDDEN',
	'UNVERIFIED_EMAIL',
	'AAL2_REQUIRED',
	'NOT_FOUND',
	'CONFLICT',
	'DUPLICATE_OPEN_REPORT',
	'GONE',
	'MIN_AMOUNT',
	'LIVE_MODE_FORBIDDEN',
	'CAPTCHA_FAILED',
	'RATE_LIMITED',
	'INTERNAL',
] as const;
export type ErrorCode = Values<typeof ERROR_CODES>;
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
	VALIDATION: 400,
	UNAUTHENTICATED: 401,
	FORBIDDEN: 403,
	UNVERIFIED_EMAIL: 403,
	AAL2_REQUIRED: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	DUPLICATE_OPEN_REPORT: 409,
	GONE: 410,
	MIN_AMOUNT: 422,
	LIVE_MODE_FORBIDDEN: 422,
	CAPTCHA_FAILED: 422,
	RATE_LIMITED: 429,
	INTERNAL: 500,
};

// C3 auth, profiles, roles; C16 locales
export const LOCALES = ['sl', 'en'] as const;
export type Locale = Values<typeof LOCALES>;
export const USER_ROLES = ['USER', 'SHELTER_MEMBER', 'MODERATOR', 'ADMIN'] as const;
export type UserRole = Values<typeof USER_ROLES>;
export const AALS = ['aal1', 'aal2'] as const;
export type Aal = Values<typeof AALS>;

// C4 reports and pets
export const SPECIES = ['dog', 'cat'] as const;
export type Species = Values<typeof SPECIES>;
export const REPORT_TYPES = ['lost', 'found', 'sighted'] as const;
export type ReportType = Values<typeof REPORT_TYPES>;
export const REPORT_STATUSES = ['open', 'matched', 'reunited', 'closed'] as const;
export type ReportStatus = Values<typeof REPORT_STATUSES>;
export const CLOSE_REASONS = [
	'found_elsewhere',
	'gave_up',
	'returned_to_owner',
	'expired',
	'removed',
	'other',
] as const;
export type CloseReason = Values<typeof CLOSE_REASONS>;
export const MODERATION_STATES = ['visible', 'held', 'hidden', 'removed'] as const;
export type ModerationState = Values<typeof MODERATION_STATES>;
export const SIZES = ['xs', 's', 'm', 'l', 'xl'] as const;
export type Size = Values<typeof SIZES>;
export const SEXES = ['male', 'female', 'unknown'] as const;
export type Sex = Values<typeof SEXES>;
export const COLOURS = [
	'black',
	'white',
	'grey',
	'brown',
	'chocolate',
	'red',
	'cream',
	'golden',
	'tan',
	'blue_grey',
] as const;
export type Colour = Values<typeof COLOURS>;
export const PATTERNS = [
	'solid',
	'bicolour',
	'tricolour',
	'tabby',
	'tortoiseshell',
	'calico',
	'brindle',
	'merle',
	'spotted',
	'pointed',
	'other',
] as const;
export type Pattern = Values<typeof PATTERNS>;
export const CONTACT_PREFS = ['chat_only', 'chat_and_phone'] as const;
export type ContactPref = Values<typeof CONTACT_PREFS>;
export const REPORT_SOURCES = ['user', 'anonymous', 'organisation'] as const;
export type ReportSource = Values<typeof REPORT_SOURCES>;
export const CHIP_STATUSES = ['valid', 'invalid', 'none'] as const;
export type ChipStatus = Values<typeof CHIP_STATUSES>;
export const CHIP_REGISTERED_CRHZ = ['yes', 'no', 'unknown'] as const;
export type ChipRegisteredCrhz = Values<typeof CHIP_REGISTERED_CRHZ>;
export const LIFESTYLES = ['indoor', 'outdoor', 'both'] as const;
export type Lifestyle = Values<typeof LIFESTYLES>;
export const REPORT_MANAGER_ROLES = ['owner', 'finder', 'staff'] as const;
export type ReportManagerRole = Values<typeof REPORT_MANAGER_ROLES>;
export const REPORT_TRANSITION_ACTIONS = ['mark_reunited', 'close', 'reopen', 'extend'] as const;
export type ReportTransitionAction = Values<typeof REPORT_TRANSITION_ACTIONS>;
export const REPORT_WARNINGS = ['OLD_EVENT'] as const;
export type ReportWarning = Values<typeof REPORT_WARNINGS>;
export const REPORT_SORTS = ['recent', 'distance'] as const;
export type ReportSort = Values<typeof REPORT_SORTS>;

// C5 photos
export const PHOTO_STATUSES = ['uploaded', 'accepted', 'rejected', 'published', 'unpublished'] as const;
export type PhotoStatus = Values<typeof PHOTO_STATUSES>;
export const PHOTO_REJECT_REASONS = ['not_jpeg', 'too_large', 'hash_mismatch', 'decode_failed'] as const;
export type PhotoRejectReason = Values<typeof PHOTO_REJECT_REASONS>;

// C6 location and geocoder
export const PLACE_KINDS = ['address', 'street', 'settlement', 'district', 'municipality'] as const;
export type PlaceKind = Values<typeof PLACE_KINDS>;
export const DISTANCE_BANDS = ['lt1', '1to3', '3to10', 'gt10'] as const;
export type DistanceBand = Values<typeof DISTANCE_BANDS>;

// C8 matching
export const MATCH_STATES = ['suggested', 'confirmed', 'rejected', 'closed'] as const;
export type MatchState = Values<typeof MATCH_STATES>;
export const MATCH_STRENGTHS = ['strong', 'good', 'possible'] as const;
export type MatchStrength = Values<typeof MATCH_STRENGTHS>;
export const MATCH_VERDICTS = ['confirm', 'reject'] as const;
export type MatchVerdict = Values<typeof MATCH_VERDICTS>;
export const MATCH_REASON_CODES = [
	'chip',
	'chip_sighting',
	'distance',
	'time',
	'size',
	'colour',
	'sex',
	'pattern',
] as const;
export type MatchReasonCode = Values<typeof MATCH_REASON_CODES>;

// C9 chat
export const CONVERSATION_STATUSES = ['active', 'read_only'] as const;
export type ConversationStatus = Values<typeof CONVERSATION_STATUSES>;
export const PARTICIPANT_ROLES = ['owner', 'finder', 'contact'] as const;
export type ParticipantRole = Values<typeof PARTICIPANT_ROLES>;
export const MESSAGE_KINDS = ['text', 'location', 'system'] as const;
export type MessageKind = Values<typeof MESSAGE_KINDS>;
export const ALIAS_KEYS = ['owner', 'finder', 'sighter', 'contact', 'shelter'] as const;
export type AliasKey = Values<typeof ALIAS_KEYS>;
export const SENDER_ALIAS_KEYS = ['you', ...ALIAS_KEYS] as const;
export type SenderAliasKey = Values<typeof SENDER_ALIAS_KEYS>;
export const REALTIME_EVENTS = [
	'message.created',
	'conversation.read',
	'notification.created',
	'conversation.updated',
] as const;
export type RealtimeEvent = Values<typeof REALTIME_EVENTS>;

// C10 notifications and alerts
export const NOTIFICATION_TYPES = [
	'match_chip',
	'match_suggested',
	'match_confirmed',
	'chat_message',
	'nearby_lost',
	'report_reminder',
	'report_expiring',
	'report_closed',
	'report_hidden',
	'report_reunited',
	'manage_link',
	'payment_receipt',
] as const;
export type NotificationType = Values<typeof NOTIFICATION_TYPES>;
export const PUSH_PLATFORMS = ['ios', 'android'] as const;
export type PushPlatform = Values<typeof PUSH_PLATFORMS>;

// C11 abuse reports
export const ABUSE_REASONS = ['scam', 'fake', 'spam', 'inappropriate_image', 'other'] as const;
export type AbuseReason = Values<typeof ABUSE_REASONS>;
export const ABUSE_TARGET_TYPES = ['report', 'message', 'profile'] as const;
export type AbuseTargetType = Values<typeof ABUSE_TARGET_TYPES>;
export const ABUSE_STATUSES = ['open', 'dismissed', 'actioned'] as const;
export type AbuseStatus = Values<typeof ABUSE_STATUSES>;
export const MODERATION_FLAG_KINDS = ['duplicate_chip', 'anon_hold', 'auto_hidden'] as const;
export type ModerationFlagKind = Values<typeof MODERATION_FLAG_KINDS>;

// C12 analytics parameter values
export const ANALYTICS_USER_ROLES = ['owner', 'finder', 'shelter', 'admin'] as const;
export type AnalyticsUserRole = Values<typeof ANALYTICS_USER_ROLES>;
export const MATCH_SOURCES = ['chip', 'image', 'attributes'] as const;
export type MatchSource = Values<typeof MATCH_SOURCES>;
export const AMOUNT_BUCKETS = ['2-4', '5-9', '10-19', '20+'] as const;
export type AmountBucket = Values<typeof AMOUNT_BUCKETS>;
export const SHARE_METHODS = ['whatsapp', 'facebook', 'copy_link', 'native'] as const;
export type ShareMethod = Values<typeof SHARE_METHODS>;

// C13 payments
export const PAYMENT_PURPOSES = ['tip', 'report_contribution', 'support', 'boost', 'subscription'] as const;
export type PaymentPurpose = Values<typeof PAYMENT_PURPOSES>;
/** Purposes whose amount the user chooses (M2); `boost` and `subscription` prices come from app_config only. */
export const USER_AMOUNT_PURPOSES = ['tip', 'report_contribution', 'support'] as const;
export const PAYMENT_STATUSES = ['pending', 'succeeded', 'failed', 'canceled', 'refunded'] as const;
export type PaymentStatus = Values<typeof PAYMENT_STATUSES>;
export const PAYMENT_PROVIDERS = ['stripe', 'mock'] as const;
export type PaymentProvider = Values<typeof PAYMENT_PROVIDERS>;

// C14 ads, partners, leads
export const AD_SLOTS = ['feed', 'detail', 'reunited', 'sidebar'] as const;
export type AdSlot = Values<typeof AD_SLOTS>;
export const AD_STATUSES = ['draft', 'active', 'paused', 'ended'] as const;
export type AdStatus = Values<typeof AD_STATUSES>;
export const AD_HOUSE_KINDS = ['supporter', 'partner', 'adopt'] as const;
export type AdHouseKind = Values<typeof AD_HOUSE_KINDS>;
export const AD_LABELS = ['Oglas', 'Ad'] as const;
export type AdLabel = Values<typeof AD_LABELS>;
export const LEAD_INTERESTS = ['ad', 'vet_partner', 'unsure'] as const;
export type LeadInterest = Values<typeof LEAD_INTERESTS>;

// C15 report detail slots
export const REPORT_SLOT_NAMES = [
	'contact',
	'share',
	'poster',
	'report-abuse',
	'owner-actions',
	'ad',
	'matches-link',
	'sighting',
] as const;
export type ReportSlotName = Values<typeof REPORT_SLOT_NAMES>;

// C17 mobile offline data
export const DRAFT_KINDS = ['lost', 'found', 'sighted', 'pet'] as const;
export type DraftKind = Values<typeof DRAFT_KINDS>;
export const OUTBOX_STATUSES = ['queued', 'sending', 'sent', 'failed', 'needs_action'] as const;
export type OutboxStatus = Values<typeof OUTBOX_STATUSES>;
export const WIPE_REASONS = ['sign_out', 'account_deleted', 'user_request'] as const;
export type WipeReason = Values<typeof WIPE_REASONS>;

// C18 shelter directory
export const DIRECTORY_STATUSES = ['CONFIRMED', 'UNCONFIRMED'] as const;
export type DirectoryStatus = Values<typeof DIRECTORY_STATUSES>;
export const RESPONSIBLE_SHELTER_STATUSES = ['confirmed', 'unconfirmed', 'outside_slovenia'] as const;
export type ResponsibleShelterStatus = Values<typeof RESPONSIBLE_SHELTER_STATUSES>;

// Forward (M3/M4, no contract yet): organisations, members, intake batches, entitlements
export const ORGANISATION_KINDS = ['shelter', 'municipality', 'vet'] as const;
export type OrganisationKind = Values<typeof ORGANISATION_KINDS>;
export const ORGANISATION_MEMBER_ROLES = ['admin', 'member'] as const;
export type OrganisationMemberRole = Values<typeof ORGANISATION_MEMBER_ROLES>;
export const INTAKE_BATCH_STATUSES = ['draft', 'processing', 'done', 'failed'] as const;
export type IntakeBatchStatus = Values<typeof INTAKE_BATCH_STATUSES>;
export const ENTITLEMENT_KINDS = ['premium', 'podpornik', 'vet_partner'] as const;
export type EntitlementKind = Values<typeof ENTITLEMENT_KINDS>;
export const ENTITLEMENT_STATUSES = ['active', 'canceled', 'expired'] as const;
export type EntitlementStatus = Values<typeof ENTITLEMENT_STATUSES>;

// The hand-written wire types in @zivali/types and the zod schemas must describe the same shapes.
// Checked by `tsc --noEmit` (typecheck); the runtime test only keeps vitest from reporting an empty file.
import { expectTypeOf, test } from 'vitest';
import type { z } from 'zod';

import type * as T from '@zivali/types';

import type * as V from '../src/index.ts';

// Flatten intersections (`Profile & { … }`) on both sides so only the shape is compared.
type Flat<X> = X extends object ? { [K in keyof X]: Flat<X[K]> } : X;
type Out<S extends z.ZodType> = Flat<z.output<S>>;

test('wire types in @zivali/types match the zod schemas', () => {
	// enums and breeds
	expectTypeOf<Out<typeof V.Species>>().toEqualTypeOf<Flat<T.Species>>();
	expectTypeOf<Out<typeof V.NotificationType>>().toEqualTypeOf<Flat<T.NotificationType>>();
	expectTypeOf<Out<typeof V.BreedCode>>().toEqualTypeOf<Flat<T.BreedCode>>();
	// C1
	expectTypeOf<Out<typeof V.ApiErrorBody>>().toEqualTypeOf<Flat<T.ApiErrorBody>>();
	expectTypeOf<Out<typeof V.Location>>().toEqualTypeOf<Flat<T.Location>>();
	expectTypeOf<Out<typeof V.CursorQuery>>().toEqualTypeOf<Flat<T.CursorQuery>>();
	// C3
	expectTypeOf<Out<typeof V.Profile>>().toEqualTypeOf<Flat<T.Profile>>();
	expectTypeOf<Out<typeof V.Me>>().toEqualTypeOf<Flat<T.Me>>();
	expectTypeOf<Out<typeof V.UpdateMeInput>>().toEqualTypeOf<Flat<T.UpdateMeInput>>();
	expectTypeOf<Out<typeof V.AdminUserList>>().toEqualTypeOf<Flat<T.AdminUserList>>();
	expectTypeOf<Out<typeof V.AdminUserQuery>>().toEqualTypeOf<Flat<T.AdminUserQuery>>();
	expectTypeOf<Out<typeof V.SetRoleInput>>().toEqualTypeOf<Flat<T.SetRoleInput>>();
	expectTypeOf<Out<typeof V.SetRoleResponse>>().toEqualTypeOf<Flat<T.SetRoleResponse>>();
	// admin console (TASK-34.2)
	expectTypeOf<Out<typeof V.AuditLogQuery>>().toEqualTypeOf<Flat<T.AuditLogQuery>>();
	expectTypeOf<Out<typeof V.AuditLogList>>().toEqualTypeOf<Flat<T.AuditLogList>>();
	expectTypeOf<Out<typeof V.AdminQueues>>().toEqualTypeOf<Flat<T.AdminQueues>>();
	// C4 + C7
	expectTypeOf<Out<typeof V.CreateReportInput>>().toEqualTypeOf<Flat<T.CreateReportInput>>();
	expectTypeOf<Out<typeof V.UpdateReportInput>>().toEqualTypeOf<Flat<T.UpdateReportInput>>();
	expectTypeOf<Out<typeof V.CreateReportResponse>>().toEqualTypeOf<Flat<T.CreateReportResponse>>();
	expectTypeOf<Out<typeof V.PublicStats>>().toEqualTypeOf<Flat<T.PublicStats>>();
	expectTypeOf<Out<typeof V.PublicReport>>().toEqualTypeOf<Flat<T.PublicReport>>();
	expectTypeOf<Out<typeof V.ReportOwnerView>>().toEqualTypeOf<Flat<T.ReportOwnerView>>();
	expectTypeOf<Out<typeof V.ReportSearch>>().toEqualTypeOf<Flat<T.ReportSearch>>();
	expectTypeOf<Out<typeof V.ReportList>>().toEqualTypeOf<Flat<T.ReportList>>();
	expectTypeOf<Out<typeof V.MapReportQuery>>().toEqualTypeOf<Flat<T.MapReportQuery>>();
	expectTypeOf<Out<typeof V.MapReportList>>().toEqualTypeOf<Flat<T.MapReportList>>();
	expectTypeOf<Out<typeof V.MyReportList>>().toEqualTypeOf<Flat<T.MyReportList>>();
	expectTypeOf<Out<typeof V.ReportTransitionInput>>().toEqualTypeOf<Flat<T.ReportTransitionInput>>();
	expectTypeOf<Out<typeof V.SyncReportsQuery>>().toEqualTypeOf<Flat<T.SyncReportsQuery>>();
	expectTypeOf<Out<typeof V.SyncReportsResponse>>().toEqualTypeOf<Flat<T.SyncReportsResponse>>();
	expectTypeOf<Out<typeof V.ManageClaimInput>>().toEqualTypeOf<Flat<T.ManageClaimInput>>();
	expectTypeOf<Out<typeof V.ManageClaimResponse>>().toEqualTypeOf<Flat<T.ManageClaimResponse>>();
	expectTypeOf<Out<typeof V.PetInput>>().toEqualTypeOf<Flat<T.PetInput>>();
	expectTypeOf<Out<typeof V.UpdatePetInput>>().toEqualTypeOf<Flat<T.UpdatePetInput>>();
	expectTypeOf<Out<typeof V.Pet>>().toEqualTypeOf<Flat<T.Pet>>();
	expectTypeOf<Out<typeof V.PetList>>().toEqualTypeOf<Flat<T.PetList>>();
	// C5
	expectTypeOf<Out<typeof V.CreatePhotoInput>>().toEqualTypeOf<Flat<T.CreatePhotoInput>>();
	expectTypeOf<Out<typeof V.CreatePhotoResponse>>().toEqualTypeOf<Flat<T.CreatePhotoResponse>>();
	expectTypeOf<Out<typeof V.CompletePhotoResponse>>().toEqualTypeOf<Flat<T.CompletePhotoResponse>>();
	expectTypeOf<Out<typeof V.PhotoView>>().toEqualTypeOf<Flat<T.PhotoView>>();
	expectTypeOf<Out<typeof V.SetPhotosInput>>().toEqualTypeOf<Flat<T.SetPhotosInput>>();
	// C6
	expectTypeOf<Out<typeof V.Place>>().toEqualTypeOf<Flat<T.Place>>();
	expectTypeOf<Out<typeof V.GeoSearchInput>>().toEqualTypeOf<Flat<T.GeoSearchInput>>();
	expectTypeOf<Out<typeof V.GeoSearchResponse>>().toEqualTypeOf<Flat<T.GeoSearchResponse>>();
	expectTypeOf<Out<typeof V.GeoReverseInput>>().toEqualTypeOf<Flat<T.GeoReverseInput>>();
	expectTypeOf<Out<typeof V.GeoReverseResponse>>().toEqualTypeOf<Flat<T.GeoReverseResponse>>();
	// C8
	expectTypeOf<Out<typeof V.MatchSuggestion>>().toEqualTypeOf<Flat<T.MatchSuggestion>>();
	expectTypeOf<Out<typeof V.MatchListQuery>>().toEqualTypeOf<Flat<T.MatchListQuery>>();
	expectTypeOf<Out<typeof V.MatchList>>().toEqualTypeOf<Flat<T.MatchList>>();
	expectTypeOf<Out<typeof V.ConfirmMatchResponse>>().toEqualTypeOf<Flat<T.ConfirmMatchResponse>>();
	expectTypeOf<Out<typeof V.RejectMatchInput>>().toEqualTypeOf<Flat<T.RejectMatchInput>>();
	// C9
	expectTypeOf<Out<typeof V.CreateConversationInput>>().toEqualTypeOf<Flat<T.CreateConversationInput>>();
	expectTypeOf<Out<typeof V.Message>>().toEqualTypeOf<Flat<T.Message>>();
	expectTypeOf<Out<typeof V.MessageList>>().toEqualTypeOf<Flat<T.MessageList>>();
	expectTypeOf<Out<typeof V.MessageListQuery>>().toEqualTypeOf<Flat<T.MessageListQuery>>();
	expectTypeOf<Out<typeof V.SendMessageInput>>().toEqualTypeOf<Flat<T.SendMessageInput>>();
	expectTypeOf<Out<typeof V.BlockInput>>().toEqualTypeOf<Flat<T.BlockInput>>();
	expectTypeOf<Out<typeof V.ConversationList>>().toEqualTypeOf<Flat<T.ConversationList>>();
	// C10
	expectTypeOf<Out<typeof V.NotificationList>>().toEqualTypeOf<Flat<T.NotificationList>>();
	expectTypeOf<Out<typeof V.MarkNotificationsReadInput>>().toEqualTypeOf<Flat<T.MarkNotificationsReadInput>>();
	expectTypeOf<Out<typeof V.NotificationPrefs>>().toEqualTypeOf<Flat<T.NotificationPrefs>>();
	expectTypeOf<Out<typeof V.NotificationPrefInput>>().toEqualTypeOf<Flat<T.NotificationPrefInput>>();
	expectTypeOf<Out<typeof V.PushTokenInput>>().toEqualTypeOf<Flat<T.PushTokenInput>>();
	expectTypeOf<Out<typeof V.AlertSubscriptionInput>>().toEqualTypeOf<Flat<T.AlertSubscriptionInput>>();
	expectTypeOf<Out<typeof V.AlertSubscription>>().toEqualTypeOf<Flat<T.AlertSubscription>>();
	// C11
	expectTypeOf<Out<typeof V.AbuseReportInput>>().toEqualTypeOf<Flat<T.AbuseReportInput>>();
	expectTypeOf<Out<typeof V.AbuseReportResponse>>().toEqualTypeOf<Flat<T.AbuseReportResponse>>();
	expectTypeOf<Out<typeof V.AdminAbuseReportQuery>>().toEqualTypeOf<Flat<T.AdminAbuseReportQuery>>();
	expectTypeOf<Out<typeof V.AdminAbuseReportList>>().toEqualTypeOf<Flat<T.AdminAbuseReportList>>();
	expectTypeOf<Out<typeof V.ModerationFlagList>>().toEqualTypeOf<Flat<T.ModerationFlagList>>();
	expectTypeOf<Out<typeof V.ModerationFlagQuery>>().toEqualTypeOf<Flat<T.ModerationFlagQuery>>();
	// C13
	expectTypeOf<Out<typeof V.CheckoutInput>>().toEqualTypeOf<Flat<T.CheckoutInput>>();
	expectTypeOf<Out<typeof V.CheckoutResponse>>().toEqualTypeOf<Flat<T.CheckoutResponse>>();
	expectTypeOf<Out<typeof V.PaymentList>>().toEqualTypeOf<Flat<T.PaymentList>>();
	// C14
	expectTypeOf<Out<typeof V.Ad>>().toEqualTypeOf<Flat<T.Ad>>();
	expectTypeOf<Out<typeof V.AdSlotQuery>>().toEqualTypeOf<Flat<T.AdSlotQuery>>();
	expectTypeOf<Out<typeof V.AdImpressionInput>>().toEqualTypeOf<Flat<T.AdImpressionInput>>();
	expectTypeOf<Out<typeof V.AdClickQuery>>().toEqualTypeOf<Flat<T.AdClickQuery>>();
	expectTypeOf<Out<typeof V.AdInput>>().toEqualTypeOf<Flat<T.AdInput>>();
	expectTypeOf<Out<typeof V.AdminAdQuery>>().toEqualTypeOf<Flat<T.AdminAdQuery>>();
	expectTypeOf<Out<typeof V.AdminAdList>>().toEqualTypeOf<Flat<T.AdminAdList>>();
	expectTypeOf<Out<typeof V.AdStatusInput>>().toEqualTypeOf<Flat<T.AdStatusInput>>();
	expectTypeOf<Out<typeof V.AdDeleteInput>>().toEqualTypeOf<Flat<T.AdDeleteInput>>();
	expectTypeOf<Out<typeof V.AdImageInput>>().toEqualTypeOf<Flat<T.AdImageInput>>();
	expectTypeOf<Out<typeof V.AdImageUploadResponse>>().toEqualTypeOf<Flat<T.AdImageUploadResponse>>();
	expectTypeOf<Out<typeof V.AdStatsQuery>>().toEqualTypeOf<Flat<T.AdStatsQuery>>();
	expectTypeOf<Out<typeof V.AdStats>>().toEqualTypeOf<Flat<T.AdStats>>();
	expectTypeOf<Out<typeof V.PartnerStats>>().toEqualTypeOf<Flat<T.PartnerStats>>();
	expectTypeOf<Out<typeof V.LeadInput>>().toEqualTypeOf<Flat<T.LeadInput>>();
	expectTypeOf<Out<typeof V.AdminLeadList>>().toEqualTypeOf<Flat<T.AdminLeadList>>();
	// C18
	expectTypeOf<Out<typeof V.ShelterList>>().toEqualTypeOf<Flat<T.ShelterList>>();
	expectTypeOf<Out<typeof V.ShelterDetail>>().toEqualTypeOf<Flat<T.ShelterDetail>>();
	expectTypeOf<Out<typeof V.ResponsibleShelterQuery>>().toEqualTypeOf<Flat<T.ResponsibleShelterQuery>>();
	expectTypeOf<Out<typeof V.ResponsibleShelter>>().toEqualTypeOf<Flat<T.ResponsibleShelter>>();
	expectTypeOf<Out<typeof V.MunicipalityShelterList>>().toEqualTypeOf<Flat<T.MunicipalityShelterList>>();
});

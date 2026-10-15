# mobile

Expo SDK 57 app (Expo Router, New Architecture, development builds). Repo map, standards and env names: [docs/tech/frontend.md](../../docs/tech/frontend.md).

## Run

1. Copy the `apps/mobile/.env.local` block from [.env.example](../../.env.example) to `apps/mobile/.env.local` and fill it. `lib/env.ts` stops the app at startup and names any missing or invalid variable. On a device or emulator, use the LAN IP (or `10.0.2.2` in the Android emulator) instead of `localhost`.
2. Install a development build once (it is needed because of native modules such as MapLibre and Firebase):
    - cloud: `npx eas-cli build --profile development --platform android` in `apps/mobile` (`EXPO_TOKEN` from the root `.env.local`), or
    - local: `pnpm --filter mobile android` (Android SDK and a running emulator or device).
3. `pnpm --filter mobile start` starts Metro; open the app on the device and pick the server.

## Scripts

| Script              | What                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `start`             | Metro dev server for the development build                                                                    |
| `android`           | local prebuild, Gradle build and install (`expo run:android`)                                                 |
| `test`              | jest-expo with Testing Library (`__tests__/`)                                                                 |
| `typecheck`, `lint` | `tsc`, ESLint (root base + `eslint-config-expo`)                                                              |
| `build`             | `expo export --platform android` (bundle check, used by CI)                                                   |
| `postinstall`       | builds `@zivali/tokens` and `@zivali/i18n` (`dist/` is not committed; `app.config.ts`, Metro and EAS need it) |

## Local data

One expo-sqlite database, `zivali.db` (contract C17, ADR-019): `getDb()` from `lib/db` opens it and runs the migrations in `lib/db/migrations/` (`PRAGMA user_version`). Schema changes add the next `NNN_<slug>.ts` and never edit a released one. Photo folders and `bytesUsed()` are in `lib/db/files.ts`, network state in `lib/net.ts` (call `setupNetworkListeners(store.dispatch)` once with the store), and sign-out goes through `signOutAndWipe()` in `lib/offline/wipe.ts`. The Supabase session is in a separate database (expo-sqlite localStorage): sign-out leaves it to `supabase.auth.signOut`, and `account_deleted` also deletes `zivali.db`, all app files, the session ciphertext and its key (`clearSessionStorage()`). `signOutAndWipe({ removeManageLinks: true })` also drops manage tokens and sent rows.

## Styling

NativeWind 4 with Tailwind 3.4: `tailwind.config.js` uses the `@zivali/tokens/tailwind-preset`, `global.css` imports the token variables (`native.css`). React Native Reusables is set up (`components.json`, `lib/utils.ts`, `PortalHost` in `app/_layout.tsx`); add components with `npx @react-native-reusables/cli add <name>` and edit them to the design system. Light and dark follow the OS.

## UI kit

`components/ui` has the same components, names and props as the web kit (`apps/web/components/ui`), on `@rn-primitives/*`, styled to `docs/design/system.md` §10. Mobile differences:

- Strings inside `Button`, `Badge` and `TabsTrigger` become the label `Text`; use `Text` (`components/ui/text`) for other text, it caps OS scaling at 200 %.
- Icons: `<Icon as={XIcon} />` (`components/ui/icon`) takes its parent's text colour; import Phosphor icons by path, `phosphor-react-native/src/icons/X`.
- `Checkbox`, `Switch` and `RadioGroupItem` take a `label`, which makes the whole row the target (the web `label` row).
- `Select` opens a bottom sheet of choice rows; `SelectContent` and `SheetContent` need a `closeLabel` for the grabber close button.
- `toast` comes from `components/ui/sonner` (not `sonner-native`), so every toast gets a named close button.
- `app/_layout.tsx` mounts `GestureHandlerRootView`, `BottomSheetModalProvider` and the one `<Toaster>` that `Sheet`, `Select` and `toast` need; never mount them again in a screen.

Gallery: `/dev/kit` (redirects to `/` when `EXPO_PUBLIC_APP_ENV=production`). `react-native-svg` and `react-native-gesture-handler` are native modules, so install a new development build after pulling them.

## Shell (P2)

- `app/(tabs)`: Zemljevid (`index`), Sporočila (`inbox`), Prijavi (`report`) and Profil (`profile`) with the bottom navigation in `components/shell/tab-bar.tsx`. The Prijavi button opens the Report sheet (lost → `/report/lost`, found → `/report/found`, sighted → `/report/found?type=sighted`); the `report` route shows the same choice for a link.
- `app/settings`: a stack above the tabs. `language` works; `[section]` is the placeholder for `notifications`, `alerts`, `consent`, `payments` and `account` until a story adds `app/settings/<section>.tsx`.
- Permissions: show `PermissionPrimer` (`components/shell/permission-primer.tsx`) before every OS prompt while the OS can still ask, passing the prompt as `request`; on `onResult(false)` show `PermissionNote` where the permission was needed.
- Sign-out (Profil) calls `signOutAndWipe({ removeManageLinks })` after a confirmation with the "remove links" choice.

## Deep links and push token (C15, C10)

- `app.config.ts` takes the host from `EXPO_PUBLIC_APP_URL` (eas.json: staging `staging.najdimo.si`, production `najdimo.si`; unset in dev builds): iOS `associatedDomains`, Android `autoVerify` intent filter for `/r/`, `/en/r/`, `/m`, `/en/m`, `/payments/`. `zivali://` stays for dev; `app/+native-intent.ts` drops the `/en` prefix (`lib/deep-link.ts`).
- The verification files are served by apps/web: `/.well-known/apple-app-site-association` (env `APPLE_TEAM_ID`) and `/.well-known/assetlinks.json` (env `ANDROID_CERT_SHA256`, comma-separated). A platform whose value is unset gets an empty file, so links open the web page.
- Client steps (Q-007): (1) Apple Developer Team ID into `APPLE_TEAM_ID` on both web hosts, then rebuild iOS with the Associated Domains capability; (2) after the first EAS build run `eas credentials` (and Play Console, app signing) for the SHA-256 fingerprint(s) into `ANDROID_CERT_SHA256`; (3) check `https://<host>/.well-known/assetlinks.json` and `adb shell pm get-app-links si.signapps.zivali` (`verified`); (4) FCM/APNs credentials in EAS, then `EXPO_PUBLIC_PUSH_PROVIDER=expo`.
- Push: `usePushPermission().request` (`lib/push.ts`) is the `request` of the notifications `PermissionPrimer`; after the OS grant it passes the token to `registerPushToken`. `EXPO_PUBLIC_PUSH_PROVIDER=mock` (default) uses a placeholder token. TASK-22.5 mounts the primer.

## Analytics (TASK-7.3)

`lib/analytics.ts` wires `@zivali/analytics` (C12): consent in expo-secure-store (`zz_consent`), `screen_view` from Expo Router segments (route template) in the root layout, `firebase.json` defaults (collection off, all consent signals denied). Firebase is used only with `EXPO_PUBLIC_ANALYTICS_PROVIDER=firebase`, the Google files (`GOOGLE_SERVICES_JSON` / `GOOGLE_SERVICE_INFO_PLIST` EAS file env vars, locally `.secrets/google-services.json` and `.secrets/GoogleService-Info.plist`) and a dev build that includes `@react-native-firebase/*` (new EAS dev build needed). Otherwise the mock adapter runs (one dev warning). DebugView on Android: `adb shell setprop debug.firebase.analytics.app si.signapps.zivali`.

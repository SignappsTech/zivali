# mobile

Expo SDK 57 app (Expo Router, New Architecture, development builds). Repo map, standards and env names: [docs/tech/frontend.md](../../docs/tech/frontend.md).

## Run

1. Copy the `apps/mobile/.env.local` block from [.env.example](../../.env.example) to `apps/mobile/.env.local` and fill it. `lib/env.ts` stops the app at startup and names any missing or invalid variable. On a device or emulator, use the LAN IP (or `10.0.2.2` in the Android emulator) instead of `localhost`.
2. Install a development build once (it is needed because of native modules such as MapLibre and Firebase):
    - cloud: `npx eas-cli build --profile development --platform android` in `apps/mobile` (`EXPO_TOKEN` from the root `.env.local`), or
    - local: `pnpm --filter mobile android` (Android SDK and a running emulator or device).
3. `pnpm --filter mobile start` starts Metro; open the app on the device and pick the server.

## Scripts

| Script              | What                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `start`             | Metro dev server for the development build                                                 |
| `android`           | local prebuild, Gradle build and install (`expo run:android`)                              |
| `test`              | jest-expo with Testing Library (`__tests__/`)                                              |
| `typecheck`, `lint` | `tsc`, ESLint (root base + `eslint-config-expo`)                                           |
| `build`             | `expo export --platform android` (bundle check, used by CI)                                |
| `postinstall`       | builds `@zivali/tokens` (`dist/` is not committed; `app.config.ts`, Metro and EAS need it) |

## Styling

NativeWind 4 with Tailwind 3.4: `tailwind.config.js` uses the `@zivali/tokens/tailwind-preset`, `global.css` imports the token variables (`native.css`). React Native Reusables is set up (`components.json`, `lib/utils.ts`, `PortalHost` in `app/_layout.tsx`); add components with `npx @react-native-reusables/cli add <name>` and edit them to the design system. Light and dark follow the OS.

## UI kit

`components/ui` has the same components, names and props as the web kit (`apps/web/components/ui`), on `@rn-primitives/*`, styled to `docs/design/system.md` §10. Mobile differences:

- Strings inside `Button`, `Badge` and `TabsTrigger` become the label `Text`; use `Text` (`components/ui/text`) for other text, it caps OS scaling at 200 %.
- Icons: `<Icon as={XIcon} />` (`components/ui/icon`) takes its parent's text colour; import Phosphor icons by path, `phosphor-react-native/src/icons/X`.
- `Checkbox`, `Switch` and `RadioGroupItem` take a `label`, which makes the whole row the target (the web `label` row).
- `Select` opens a bottom sheet of choice rows; `SelectContent` and `SheetContent` need a `closeLabel` for the grabber close button.
- `toast` comes from `components/ui/sonner` (not `sonner-native`), so every toast gets a named close button.
- `Sheet`, `Select` and `Toaster` need `GestureHandlerRootView`, `BottomSheetModalProvider` and one `<Toaster closeLabel>` above them; the dev gallery mounts them itself until the shell (TASK-12.2) puts them in `app/_layout.tsx`.

Gallery: `/dev/kit` (redirects to `/` when `EXPO_PUBLIC_APP_ENV=production`). `react-native-svg` and `react-native-gesture-handler` are native modules, so install a new development build after pulling them.

# Next.js standalone server for the Hetzner VPS (ADR-016). Build from the repo root:
#   docker build -f apps/web/Dockerfile -t zivali-web .                                  (this machine's platform)
#   docker buildx build --platform linux/arm64 -f apps/web/Dockerfile -t zivali-web .   (the Hetzner CAX11, Arm64)
# NEXT_PUBLIC_* values are inlined into the bundles at build time, so each environment gets its own image (build
# args below, set by scripts/deploy.mjs). Server-only values (APP_ENV, APP_VERSION, R2_UPLOAD_ORIGIN) come from
# /opt/zivali/<env>/web.env at runtime.
# The build runs on the build machine's own platform; the runtime stage only copies files, so an Arm64 image needs
# no emulation.
FROM --platform=$BUILDPLATFORM node:22-slim AS build
RUN npm install -g pnpm@11.28.5
WORKDIR /repo
COPY . .
# --ignore-scripts: the root `prepare: husky` fails without dev tooling; the workspace packages are built below.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter web...
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_ANALYTICS_PROVIDER
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_GOOGLE_SIGN_IN
ARG NEXT_PUBLIC_APPLE_SIGN_IN
ENV NEXT_TELEMETRY_DISABLED=1
# Tokens and i18n first (web imports their dist), then the standalone build; public/ may not exist yet.
# The only native module the server traces is sharp (next/image optimisation), built for the build machine. The app
# does not use next/image, so it is dropped rather than shipped for the wrong CPU; when next/image arrives, copy
# @img/sharp-linux-arm64 and @img/sharp-libvips-linux-arm64 into the standalone node_modules instead.
RUN pnpm --filter "web^..." --if-present run build && pnpm --filter web build && mkdir -p apps/web/public \
	&& rm -rf apps/web/.next/standalone/node_modules/sharp apps/web/.next/standalone/node_modules/@img

FROM node:22-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

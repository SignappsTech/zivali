#!/bin/sh
# Runs on the VPS (ADR-016) in /opt/zivali as the deploy user, called over SSH by scripts/deploy.mjs:
#   sh -s -- check <staging|production>    (script on stdin) read-only: prints NEEDS-INPUT lines, exit 3 if any
#   sh /opt/zivali/remote.sh deploy <staging|production> <api image> <web image> <version>
#   sh /opt/zivali/remote.sh promote <staging|production>
#   sh /opt/zivali/remote.sh rollback <staging|production>
# deploy (after deploy.mjs copied docker-compose.yml, nginx/ and this file, wrote cloudflare.ini and loaded the images
# with docker load): the same checks, one-off `prisma migrate deploy` and then the seed (reference data, idempotent) in
# api containers, api, worker and web up and healthy within 180 s (compose healthchecks), else the running release
# (release.env) up again and exit 1; nginx and certbot up, nginx re-rendered and reloaded. A failed migration or seed
# stops here (set -e) and the running release stays up. The new release stays in release.env.next until deploy.mjs's
# smoke checks pass: then promote (release.env -> release.env.prev, release.env.next -> release.env, old images
# removed), else rollback (release.env up again). A migration is never rolled back. By hand: deploy/README.md, Rollback.
set -eu

mode="${1:-}" target="${2:-}"
case "$mode $target" in
"check staging" | "check production" | "deploy staging" | "deploy production") ;;
"promote staging" | "promote production" | "rollback staging" | "rollback production") ;;
*)
	echo "usage: remote.sh check|deploy|promote|rollback <staging|production> [<api image> <web image> <version>]" >&2
	exit 2
	;;
esac

cd /opt/zivali
next="$target/release.env.next"

# api, worker and web of $target from a release file, up and healthy (or running: the worker) within 180 s.
up() {
	docker compose -p "zivali-$target" --env-file "$target/.env" --env-file "$1" \
		up -d --wait --wait-timeout 180 --remove-orphans api worker web
}

rollback() {
	rm -f "$next"
	if [ ! -f "$target/release.env" ]; then
		echo "remote.sh: no earlier $target release to go back to; the failed one stays as it is (logs: deploy/README.md)" >&2
		return 1
	fi
	up "$target/release.env" || return 1
	echo "$target is back on $(sed -n 's/^APP_VERSION=//p' "$target/release.env")"
}

# Removes zivali-* images that no release file names (keeps the running and the previous release of each
# environment, and any release in flight), then dangling layers.
prune() {
	keep=$(cat ./*/release.env ./*/release.env.prev ./*/release.env.next 2>/dev/null |
		sed -n -e 's/^API_IMAGE=//p' -e 's/^WEB_IMAGE=//p')
	docker image ls --format '{{.Repository}}:{{.Tag}}' | grep -E '^zivali-(api|web):' | while read -r image; do
		printf '%s\n' "$keep" | grep -qxF "$image" || docker rmi "$image" >/dev/null 2>&1 || true
	done
	docker image prune -f >/dev/null
}

case "$mode" in
promote)
	[ -f "$next" ] || {
		echo "remote.sh: no $next to promote" >&2
		exit 1
	}
	if [ -f "$target/release.env" ]; then mv "$target/release.env" "$target/release.env.prev"; fi
	mv "$next" "$target/release.env"
	prune
	echo "$target $(sed -n 's/^APP_VERSION=//p' "$target/release.env") promoted"
	exit 0
	;;
rollback)
	rollback
	exit 0
	;;
esac

missing=0
need() {
	echo "NEEDS-INPUT: $*"
	missing=1
}
for file in "$target/.env" "$target/web.env" edge.env; do
	if [ ! -f "$file" ]; then
		need "/opt/zivali/$file (deploy/README.md, VPS)"
	elif [ "$(stat -c '%a %U' "$file")" != "600 deploy" ]; then
		need "/opt/zivali/$file must be mode 600 and owned by deploy: chown deploy: $file && chmod 600 $file (deploy/README.md, VPS)"
	fi
done
# Never printed: only whether DIRECT_URL is there and which pooler port it uses.
if [ -f "$target/.env" ]; then
	case "$(sed -n 's/^DIRECT_URL=//p' "$target/.env" 2>/dev/null)" in
	'') need "DIRECT_URL in /opt/zivali/$target/.env: the Supabase session pooler URL, port 5432 (deploy/README.md, VPS)" ;;
	*:6543*) need "DIRECT_URL in /opt/zivali/$target/.env uses port 6543 (transaction pooler); migrations need the session pooler, port 5432 (deploy/README.md, VPS)" ;;
	esac
fi
docker compose version >/dev/null 2>&1 || need "Docker with the Compose plugin (deploy/README.md, VPS)"
command -v zstd >/dev/null 2>&1 || need "zstd on the VPS: apt-get install -y zstd (deploy/README.md, VPS)"
if [ -f edge.env ]; then
	cert=$(sed -n 's/^CERT_NAME=//p' edge.env)
	docker run --rm -v /opt/zivali/letsencrypt:/le:ro --entrypoint test nginx:1.30-alpine -f "/le/live/$cert/fullchain.pem" ||
		need "TLS certificate '$cert': run the first issuance (deploy/README.md, TLS)"
fi
[ "$missing" = 0 ] || exit 3
[ "$mode" = deploy ] || exit 0

api_image="$3" web_image="$4" version="$5"
# Loaded by deploy.mjs (docker save | docker load); compose never pulls them (pull_policy: never).
docker image inspect "$api_image" "$web_image" >/dev/null
printf 'API_IMAGE=%s\nWEB_IMAGE=%s\nAPP_VERSION=%s\n' "$api_image" "$web_image" "$version" >"$next"
stack="docker compose -p zivali-$target --env-file $target/.env --env-file $next"
edge="docker compose -p zivali-edge --env-file $target/.env --env-file $next"

docker network inspect zivali-edge >/dev/null 2>&1 || docker network create zivali-edge >/dev/null
$stack run --rm --no-deps api node node_modules/prisma/build/index.js migrate deploy
# Regions, municipalities, geocoder places, shelter directory, house ads: idempotent, and reruns keep admin edits
# (directory, house ads); the fixture seeders skip themselves outside APP_ENV=local.
$stack run --rm --no-deps api node dist/seed/apps/api/prisma/seed.js
if ! up "$next"; then
	echo "remote.sh: $target $version did not become healthy within 180 s; starting the running release again" >&2
	rollback || true
	exit 1
fi
$edge up -d nginx certbot
# Config changes from this deploy without a restart: render the templates again, test, reload.
for _ in 1 2 3 4 5 6 7 8 9 10; do
	$edge exec -T nginx test -f /var/run/nginx.pid && break
	sleep 3
done
$edge exec -T nginx /docker-entrypoint.d/20-envsubst-on-templates.sh >/dev/null
$edge exec -T nginx nginx -t -q
$edge exec -T nginx nginx -s reload
echo "$target $version is up; promote or rollback follows the smoke checks"

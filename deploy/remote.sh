#!/bin/sh
# Runs on the VPS (ADR-016) in /opt/zivali, called over SSH by scripts/deploy.mjs (workstation and GitHub Actions):
#   sh -s -- check <staging|production>        (script on stdin) read-only: prints NEEDS-INPUT lines, exit 3 if any
#   sh /opt/zivali/remote.sh deploy <staging|production> <api image> <web image> <version>
# deploy (after deploy.mjs copied docker-compose.yml, nginx/ and this file, wrote cloudflare.ini and logged Docker in
# to GHCR): the same checks, pull, one-off `prisma migrate deploy` in an api container, restart the environment's api, worker and web,
# start nginx and certbot, re-render and reload nginx. release.env is replaced only after the stack is up, so a failed
# migration leaves the running release and its release.env as they were. Rollback: deploy/README.md.
set -eu

mode="${1:-}" target="${2:-}"
case "$mode $target" in
"check staging" | "check production" | "deploy staging" | "deploy production") ;;
*)
	echo "usage: remote.sh check|deploy <staging|production> [<api image> <web image> <version>]" >&2
	exit 2
	;;
esac

cd /opt/zivali
missing=0
need() {
	echo "NEEDS-INPUT: $*"
	missing=1
}
for file in "$target/.env" "$target/web.env" edge.env; do
	[ -f "$file" ] || need "/opt/zivali/$file (deploy/README.md, VPS)"
done
docker compose version >/dev/null 2>&1 || need "Docker with the Compose plugin (deploy/README.md, VPS)"
if [ -f edge.env ]; then
	cert=$(sed -n 's/^CERT_NAME=//p' edge.env)
	docker run --rm -v /opt/zivali/letsencrypt:/le:ro --entrypoint test nginx:1.30-alpine -f "/le/live/$cert/fullchain.pem" ||
		need "TLS certificate '$cert': run the first issuance (deploy/README.md, TLS)"
fi
[ "$missing" = 0 ] || exit 3
[ "$mode" = deploy ] || exit 0

api_image="$3" web_image="$4" version="$5"
next="$target/release.env.next"
printf 'API_IMAGE=%s\nWEB_IMAGE=%s\nAPP_VERSION=%s\n' "$api_image" "$web_image" "$version" >"$next"
stack="docker compose -p zivali-$target --env-file $target/.env --env-file $next"
edge="docker compose -p zivali-edge --env-file $target/.env --env-file $next"

docker network inspect zivali-edge >/dev/null 2>&1 || docker network create zivali-edge >/dev/null
$stack pull api worker web
$stack run --rm --no-deps api node node_modules/prisma/build/index.js migrate deploy
$stack up -d --remove-orphans api worker web
$edge up -d nginx certbot
# Config changes from this deploy without a restart: render the templates again, test, reload.
for _ in 1 2 3 4 5 6 7 8 9 10; do
	$edge exec -T nginx test -f /var/run/nginx.pid && break
	sleep 3
done
$edge exec -T nginx /docker-entrypoint.d/20-envsubst-on-templates.sh >/dev/null
$edge exec -T nginx nginx -t -q
$edge exec -T nginx nginx -s reload

if [ -f "$target/release.env" ]; then mv "$target/release.env" "$target/release.env.prev"; fi
mv "$next" "$target/release.env"
docker image prune -f >/dev/null
echo "$target $version is up"

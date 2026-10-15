#!/bin/sh
# Runs on the VPS (ADR-016). scripts/deploy.mjs (workstation and GitHub Actions) copies docker-compose.yml, Caddyfile
# and this file to /opt/zivali/, logs Docker in to GHCR for the pull, then runs:
#   sh /opt/zivali/remote.sh <staging|production> <api image> <web image> <version>
# Pull, one-off `prisma migrate deploy` in an api container, restart the environment's api, worker and web, then
# start or reload the shared Caddy. release.env is replaced only after the stack is up, so a failed migration leaves
# the running release and its release.env as they were. Rollback: deploy/README.md.
set -eu

target="$1" api_image="$2" web_image="$3" version="$4"
case "$target" in
staging | production) ;;
*)
	echo "usage: remote.sh <staging|production> <api image> <web image> <version>" >&2
	exit 2
	;;
esac

cd /opt/zivali
for file in "$target/.env" "$target/web.env"; do
	if [ ! -f "$file" ]; then
		echo "NEEDS-INPUT: /opt/zivali/$file (deploy/README.md, VPS)" >&2
		exit 3
	fi
done

next="$target/release.env.next"
printf 'API_IMAGE=%s\nWEB_IMAGE=%s\nAPP_VERSION=%s\n' "$api_image" "$web_image" "$version" >"$next"
stack="docker compose -p zivali-$target --env-file $target/.env --env-file $next"
edge="docker compose -p zivali-edge --env-file $target/.env --env-file $next"

docker network inspect zivali-edge >/dev/null 2>&1 || docker network create zivali-edge >/dev/null
$stack pull api worker web
$stack run --rm --no-deps api node node_modules/prisma/build/index.js migrate deploy
$stack up -d --remove-orphans api worker web
$edge up -d caddy
$edge exec -T caddy caddy reload --config /etc/caddy/Caddyfile

if [ -f "$target/release.env" ]; then mv "$target/release.env" "$target/release.env.prev"; fi
mv "$next" "$target/release.env"
docker image prune -f >/dev/null
echo "$target $version is up"

#!/bin/sh
# Entry of the nginx service (deploy/docker-compose.yml). Waits for the first certificate instead of crash-looping
# (first issuance: deploy/README.md, TLS), reloads twice a day so certificates renewed by the certbot service are
# picked up, then hands over to the image's entrypoint, which renders /etc/nginx/templates and runs nginx.
set -eu

cert="/etc/letsencrypt/live/${CERT_NAME:?set in /opt/zivali/edge.env}/fullchain.pem"
trap 'exit 0' TERM INT
until [ -f "$cert" ]; do
	echo "nginx: waiting for $cert (first issuance: deploy/README.md, TLS)"
	sleep 30
done

# The image's sample server would clash with our default_server on port 80.
rm -f /etc/nginx/conf.d/default.conf
(while sleep 43200; do nginx -s reload; done) &
exec /docker-entrypoint.sh nginx -g 'daemon off;'

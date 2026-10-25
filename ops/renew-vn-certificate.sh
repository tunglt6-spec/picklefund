#!/usr/bin/env bash
# Run as root twice daily. Renewal settings are validated with certbot reconfigure.
set -euo pipefail
exec 9>/var/lock/picklefund-vn-certificate.lock
flock -n 9 || exit 0
docker run --rm \
  -v /opt/picklefund/nginx/ssl/letsencrypt:/etc/letsencrypt \
  -v /opt/picklefund/nginx/ssl/acme:/var/www/acme \
  -v /var/lib/picklefund-acme:/var/lib/letsencrypt \
  -v /var/log/picklefund-acme:/var/log/letsencrypt \
  certbot/certbot@sha256:f70ad0adbb7e117f0fe42a63c553f28ea451edabc0148757b6efcd9735acaa20 \
  renew --cert-name picklefund.vn --non-interactive --quiet
docker exec picklefund-nginx nginx -t
docker exec picklefund-nginx nginx -s reload

#!/usr/bin/env bash
# Local equivalent of .github/workflows/deploy.yml — build the site and
# FTPS-mirror dist/ into the GoDaddy web root. Same result as pushing to
# main once the GitHub Action is wired; use this for a manual deploy or to
# test before turning the Action on.
#
# Requires lftp:  brew install lftp
#
# Credentials come from ./.env.deploy (gitignored — never commit it):
#   FTP_HOST=ftp.whywedie.org
#   FTP_USER=user@whywedie.org
#   FTP_PASSWORD=...
#   FTP_REMOTE_DIR=/            # "/" if the FTP user is chrooted to
#                              # public_html, else "/public_html"
#
# Pass --dry-run to see what would transfer without uploading.

set -euo pipefail
cd "$(dirname "$0")"

[ -f .env.deploy ] || { echo "missing .env.deploy — copy .env.deploy.example and fill it in"; exit 1; }
set -a; source .env.deploy; set +a
: "${FTP_HOST:?}" "${FTP_USER:?}" "${FTP_PASSWORD:?}"
REMOTE_DIR="${FTP_REMOTE_DIR:-/}"

DRY=""
[ "${1:-}" = "--dry-run" ] && DRY="--dry-run"

echo "==> npm run build"
npm run build

echo "==> lftp mirror dist/ -> ${FTP_HOST}:${REMOTE_DIR} ${DRY}"
lftp -c "
set ftp:ssl-force true;
set ftp:ssl-protect-data true;
set ssl:verify-certificate no;   # GoDaddy shared hosting uses a generic cert
open -u '${FTP_USER}','${FTP_PASSWORD}' '${FTP_HOST}';
mirror --reverse --delete --parallel=4 --verbose ${DRY} \
  --exclude-glob .git* --exclude-glob .DS_Store \
  --exclude-glob .ftp-deploy-sync-state.json \
  --exclude-glob cgi-bin/ --exclude-glob .well-known/ \
  dist/ '${REMOTE_DIR}';
bye
"
echo "==> done"

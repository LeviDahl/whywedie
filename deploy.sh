#!/usr/bin/env bash
# Local equivalent of .github/workflows/deploy.yml — build the site and
# FTPS-mirror dist/ into the GoDaddy web root. Same result as pushing to
# main once the GitHub Action is wired; use this for a manual deploy or to
# test before turning the Action on.
#
# Requires lftp:  brew install lftp
#
# Credentials come from ./.env.deploy (gitignored — never commit it):
#   FTP_HOST=whywedie.org        # bare domain works; GoDaddy has no ftp. record
#   FTP_USER=user@whywedie.org
#   FTP_PASSWORD='...'           # single-quote it — special chars are literal
#   FTP_REMOTE_DIR=/             # "/" if the FTP user is chrooted to the web
#                               # root, else "/public_html"
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

# Belt-and-suspenders: lftp mirror replicates each source file's mode, and a
# 600 .htaccess = Apache 403s the whole site. Force it 644 locally first.
chmod 644 dist/.htaccess 2>/dev/null || true

# Post-mirror fixups (skipped on --dry-run so the dry run is truly dry).
FIXUPS=""
if [ -z "$DRY" ]; then
  FIXUPS="
chmod 644 '${REMOTE_DIR%/}/.htaccess';
chmod 755 '${REMOTE_DIR}';"
fi

echo "==> lftp mirror dist/ -> ${FTP_HOST}:${REMOTE_DIR} ${DRY}"
lftp -c "
set ftp:ssl-force true;
set ftp:ssl-protect-data true;
set ssl:verify-certificate no;   # GoDaddy shared hosting uses a generic cert
open -u '${FTP_USER}','${FTP_PASSWORD}' '${FTP_HOST}';
mirror --reverse --delete --parallel=4 --verbose ${DRY} \
  --exclude-glob .git* --exclude-glob .DS_Store \
  --exclude-glob .ftp-deploy-sync-state.json --exclude-glob .ftpquota \
  --exclude-glob cgi-bin/ --exclude-glob .well-known/ \
  dist/ '${REMOTE_DIR}';${FIXUPS}
bye
"
echo "==> done"

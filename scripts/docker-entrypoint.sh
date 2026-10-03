#!/bin/sh
set -e

# A bind-mounted uploads folder is created by Docker as root; hand it to the app user.
mkdir -p "$UPLOAD_DIR"
chown -R node:node "$UPLOAD_DIR"

exec setpriv --reuid=node --regid=node --init-groups sh -c "node scripts/migrate.mjs && exec node server.js"

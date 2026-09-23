#!/bin/sh
set -e
# Apply db/schema.sql (idempotent) so every deploy brings the schema up to date.
node db/setup.mts
exec "$@"

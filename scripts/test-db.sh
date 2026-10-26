#!/usr/bin/env bash
# Applies the migration to a throwaway PostgreSQL and runs the SQL tests.
# Uses $DATABASE_URL when set (CI), otherwise starts a temporary local cluster.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${DATABASE_URL:-}" ]]; then
  PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
  TMP="$(mktemp -d)"
  trap '"$PG_BIN/pg_ctl" -D "$TMP/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
  "$PG_BIN/initdb" -D "$TMP/data" -U postgres -A trust -E UTF8 --locale=C.UTF-8 >/dev/null
  "$PG_BIN/pg_ctl" -D "$TMP/data" -o "-k $TMP -p 54329 -c listen_addresses=''" -l "$TMP/log" start >/dev/null
  DATABASE_URL="postgresql://postgres@/postgres?host=$TMP&port=54329"
fi

PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -X -o /dev/null)
"${PSQL[@]}" -f supabase/tests/supabase_stubs.sql
for f in supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f supabase/tests/db_test.sql
echo "database tests passed"

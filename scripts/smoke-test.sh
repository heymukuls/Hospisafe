#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${1:-https://hospisafe.online}"
BASE_URL="${BASE_URL%/}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "PASS: $*"; }

status_check() {
  local path="$1" expected="${2:-200}" code
  code="$(curl --connect-timeout 8 --max-time 25 -sS -o "$TMP/body" -w '%{http_code}' "$BASE_URL$path")" || fail "request $path failed"
  [[ "$code" == "$expected" ]] || { cat "$TMP/body"; fail "$path returned HTTP $code (expected $expected)"; }
  pass "$path returned HTTP $code"
}

status_check "/" 200
status_check "/dashboard" 200
status_check "/staff" 200
status_check "/api/health" 200
node - "$TMP/body" <<'NODE'
const fs = require('fs');
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (d.status !== 'ok' || d.database !== 'connected') {
  console.error('FAIL: database health payload is not healthy:', d);
  process.exit(1);
}
console.log('PASS: MySQL health check is connected');
NODE

for role in ADMIN STAFF; do
  JAR="$TMP/${role,,}.cookies"
  curl --connect-timeout 8 --max-time 25 -fsS -c "$JAR" -b "$JAR" \
    -H 'Content-Type: application/json' \
    -d "{\"role\":\"$role\"}" \
    "$BASE_URL/api/auth/demo" -o "$TMP/demo-$role.json" || fail "$role demo sign-in failed"
  node - "$TMP/demo-$role.json" "$role" <<'NODE'
const fs = require('fs');
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!d.ok) { console.error(d); process.exit(1); }
if (d.redirect !== (process.argv[3] === 'ADMIN' ? '/dashboard' : '/staff')) process.exit(1);
NODE
  pass "$role demo sign-in succeeded"

  curl --connect-timeout 8 --max-time 25 -fsS -b "$JAR" "$BASE_URL/api/auth/session" -o "$TMP/session-$role.json" || fail "$role session check failed"
  node - "$TMP/session-$role.json" "$role" <<'NODE'
const fs = require('fs');
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!d.user || d.user.role !== process.argv[3]) {
  console.error('Unexpected session response');
  process.exit(1);
}
NODE
  pass "$role role-based session verified"

  curl --connect-timeout 8 --max-time 25 -fsS -b "$JAR" "$BASE_URL/api/tasks" -o "$TMP/tasks-$role.json" || fail "$role tasks API failed"
  pass "$role task list API responded"
done

curl --connect-timeout 8 --max-time 25 -fsS -b "$TMP/admin.cookies" "$BASE_URL/api/layout" -o "$TMP/layout.json" || fail "Admin layout API failed"
node - "$TMP/layout.json" <<'NODE'
const fs = require('fs');
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!Array.isArray(d.floors) || !Array.isArray(d.departments) || !Array.isArray(d.areas)) {
  console.error('Unexpected layout payload');
  process.exit(1);
}
NODE
pass "Admin hospital layout API responded"

echo "All Hospisafe production smoke tests passed."

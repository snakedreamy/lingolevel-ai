#!/usr/bin/env bash
# Smoke-test a running dev server.
#
# Usage:
#   ./scripts/smoke.sh [PORT]
#
# Environment overrides:
#   PORT       — port the dev server listens on (default: 59100, or $1)
#   BASE_URL   — full base URL override (default: http://localhost:$PORT)
#   SMOKE_TIMEOUT — per-request curl timeout in seconds (default: 10)
#
# The script exits non-zero on the first failed check. Designed to be run from
# the project root after `npm run dev` (or `PORT=59100 npx tsx server.ts`)
# is up and listening.
#
# Design notes:
#   - Uses `jq -e` for JSON structure validation when available, falls back to
#     `grep` for portability.
#   - Always passes `--max-time` so a hung server can't hang the script.
#   - Distinguishes HTTP transport errors (curl -f, exit >= 400) from JSON
#     structure errors and prints a clear reason for each.
#   - Truncates large response bodies (chat can be long) to keep logs readable.
#   - Never reads, prints, or echoes secrets. The /api/server-config check is
#     purely about *absence* of an apiKey field.

set -euo pipefail

# --- Args / env ------------------------------------------------------------
RAW_PORT="${1:-${PORT:-59100}}"
TIMEOUT="${SMOKE_TIMEOUT:-10}"

# Validate port is a positive integer; fall back to 59100 on garbage.
if [[ "$RAW_PORT" =~ ^[0-9]+$ ]] && (( RAW_PORT > 0 && RAW_PORT < 65536 )); then
  PORT="$RAW_PORT"
else
  echo "[smoke] WARN: invalid port '$RAW_PORT', falling back to 59100" >&2
  PORT=59100
fi

BASE="${BASE_URL:-http://localhost:${PORT}}"
echo "[smoke] target = ${BASE}"

# --- Helpers ---------------------------------------------------------------
HAS_JQ=0
if command -v jq >/dev/null 2>&1; then
  HAS_JQ=1
fi

# truncate: print at most N chars of $1, ellipsis if longer
truncate() {
  local s="${1-}"
  local n="${2:-200}"
  if (( ${#s} <= n )); then
    printf '%s' "$s"
  else
    printf '%s…(truncated, %d bytes total)' "${s:0:n}" "${#s}"
  fi
}

# do_get: GET $1, write body to $body_var, write status to $status_var.
# Returns 0 only on HTTP 200; non-200 is reported, body captured for debug.
# Run curl and capture both the HTTP status code AND the curl exit status
# without `|| echo` inside a `$(...)` (which would concatenate the curl exit
# code string onto the variable — observed: "HTTP 000000" instead of "HTTP 000").
# We rely on curl's "-w '%{http_code}'" being written even on transport failure
# (it emits "000" in that case), so the http status is always well-formed.
_curl_status_and_body() {
  local method="$1"; shift
  local url="$1"; shift
  local data="${1-}"
  local tmp="$2"
  local code
  if [[ "$method" == "POST" ]]; then
    set +e
    code="$(curl -s --max-time "$TIMEOUT" -o "$tmp" -w '%{http_code}' \
        -X POST -H 'Content-Type: application/json' \
        --data "$data" "$url")"
    local rc=$?
    set -e
  else
    set +e
    code="$(curl -s --max-time "$TIMEOUT" -o "$tmp" -w '%{http_code}' "$url")"
    local rc=$?
    set -e
  fi
  # If curl itself errored (couldn't connect, timeout, DNS, etc.) curl writes
  # "000" to the format string, but be defensive in case rc is non-zero AND
  # the format string is empty.
  if (( rc != 0 )) && [[ -z "$code" ]]; then
    code="000"
  fi
  printf '%s' "$code"
}

do_get() {
  local url="$1"
  local body_var="$2"
  local status_var="$3"
  local tmp
  tmp="$(mktemp)"
  local code
  code="$(_curl_status_and_body GET "$url" "" "$tmp")"
  if [[ "$code" == "000" ]]; then
    rm -f "$tmp"
    printf -v "$status_var" '%s' "000"
    printf -v "$body_var" '%s' ""
    echo "FAIL: curl error connecting to $url (timeout=${TIMEOUT}s)" >&2
    return 1
  fi
  # shellcheck disable=SC2034
  printf -v "$status_var" '%s' "$code"
  # shellcheck disable=SC2034
  printf -v "$body_var" '%s' "$(cat "$tmp")"
  rm -f "$tmp"
  if [[ "$code" == "200" ]]; then
    return 0
  fi
  echo "FAIL: GET $url -> HTTP $code" >&2
  return 1
}

# do_post: POST $1 with json body $2, similar semantics to do_get.
do_post() {
  local url="$1"
  local payload="$2"
  local body_var="$3"
  local status_var="$4"
  local tmp
  tmp="$(mktemp)"
  local code
  code="$(_curl_status_and_body POST "$url" "$payload" "$tmp")"
  if [[ "$code" == "000" ]]; then
    rm -f "$tmp"
    printf -v "$status_var" '%s' "000"
    printf -v "$body_var" '%s' ""
    echo "FAIL: curl error connecting to $url (timeout=${TIMEOUT}s)" >&2
    return 1
  fi
  printf -v "$status_var" '%s' "$code"
  printf -v "$body_var" '%s' "$(cat "$tmp")"
  rm -f "$tmp"
  if [[ "$code" == "200" ]]; then
    return 0
  fi
  echo "FAIL: POST $url -> HTTP $code" >&2
  # body_var may not be set yet on transport failure
  echo "       body = $(truncate "${!body_var:-}" 200)" >&2
  return 1
}

# has_field: structural check that JSON $1 contains top-level key $2.
# Uses jq when available, grep otherwise. Dies with a clear message on miss.
has_field() {
  local body="$1"
  local field="$2"
  if (( HAS_JQ )); then
    if echo "$body" | jq -e "has(\"$field\")" >/dev/null 2>&1; then
      return 0
    fi
    echo "FAIL: response missing required field \"$field\"" >&2
    echo "       body = $(truncate "$body" 200)" >&2
    return 1
  else
    # grep fallback: matches "field": in a JSON-ish way. Sufficient as a smoke
    # check; not a real JSON parser.
    if printf '%s' "$body" | grep -qE "\"$field\"[[:space:]]*:"; then
      return 0
    fi
    echo "FAIL: response missing required field \"$field\" (grep fallback)" >&2
    echo "       body = $(truncate "$body" 200)" >&2
    return 1
  fi
}

# --- 1. GET / (HTML shell) --------------------------------------------------
echo -n "GET / ... "
if do_get "${BASE}/" _status body; then
  echo "ok (200)"
else
  echo "FAIL ($_status)"
  exit 1
fi

# --- 2. GET /api/server-config — apiKey MUST NOT leak ----------------------
echo -n "GET /api/server-config (no apiKey field) ... "
if ! do_get "${BASE}/api/server-config" cfg status; then
  echo "FAIL ($status)"
  exit 1
fi
echo
echo "       payload = ${cfg}"

if (( HAS_JQ )); then
  if echo "$cfg" | jq -e 'has("apiKey") or has("api_key") or has("apiKeyPreview") or has("keyHint")' >/dev/null 2>&1; then
    echo "FAIL: apiKey / key-derived field leaked in /api/server-config" >&2
    exit 1
  fi
else
  # grep fallback: any of these keys appearing as a JSON field is a leak.
  for forbidden in apiKey api_key apiKeyPreview keyHint; do
    if printf '%s' "$cfg" | grep -qE "\"$forbidden\"[[:space:]]*:"; then
      echo "FAIL: forbidden field \"$forbidden\" leaked in /api/server-config" >&2
      exit 1
    fi
  done
fi
echo "       ok (no key fields)"

# --- 3. POST /api/chat ------------------------------------------------------
echo -n "POST /api/chat ... "
chat_payload='{"messages":[{"role":"user","content":"Hi"}],"level":"junior"}'
if ! do_post "${BASE}/api/chat" "$chat_payload" chat status; then
  echo "FAIL ($status)"
  exit 1
fi
echo
echo "       body = $(truncate "$chat" 200)"
if ! has_field "$chat" "content"; then
  exit 1
fi
echo "       ok"

# --- 4. POST /api/analyze ---------------------------------------------------
echo -n "POST /api/analyze ... "
an_payload='{"userMessage":"I am go.","assistantMessage":"OK","level":"junior"}'
if ! do_post "${BASE}/api/analyze" "$an_payload" an status; then
  echo "FAIL ($status)"
  exit 1
fi
echo
echo "       body = $(truncate "$an" 400)"
for f in translation grammarCorrections assistantReplyInsight keyWords suggestions; do
  if ! has_field "$an" "$f"; then
    exit 1
  fi
done
echo "       ok"

echo "[smoke] all green"

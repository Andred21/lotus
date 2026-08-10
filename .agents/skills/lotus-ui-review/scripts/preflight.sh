#!/usr/bin/env bash
set -uo pipefail

frontend_url="${LOTUS_UI_REVIEW_FRONTEND_URL:-http://localhost:5173}"
backend_url="${LOTUS_UI_REVIEW_BACKEND_URL:-http://localhost:8080}"
problems=()

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    problems+=("missing command: $1")
  fi
}

probe_url() {
  local label="$1"
  local url="$2"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "$url" 2>/dev/null || true)"
  if [[ -z "$code" || "$code" == "000" ]]; then
    problems+=("unreachable ${label}: ${url}")
  else
    printf '%s_url=%s status=%s\n' "$label" "$url" "$code"
  fi
}

for required in git node pnpm docker curl playwright-cli; do
  require_command "$required"
done

if command -v node >/dev/null 2>&1; then
  node_major="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
  if [[ ! "$node_major" =~ ^[0-9]+$ ]] || (( node_major < 20 )); then
    problems+=("Node 20+ required; found $(node --version 2>/dev/null || printf unknown)")
  fi
fi

if git_root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  printf 'repo_root=%s\n' "$git_root"
else
  problems+=("not inside a Git repository")
fi

if command -v docker >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
  problems+=("docker compose unavailable")
fi

if command -v curl >/dev/null 2>&1; then
  probe_url frontend "$frontend_url"
  probe_url backend "$backend_url"
fi

if (( ${#problems[@]} > 0 )); then
  for problem in "${problems[@]}"; do
    printf 'BLOCKED: %s\n' "$problem" >&2
  done
  exit 1
fi

printf 'PREFLIGHT_OK\n'

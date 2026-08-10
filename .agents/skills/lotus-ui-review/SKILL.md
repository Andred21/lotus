---
name: lotus-ui-review
description: Use when reviewing one specific Lotus frontend screen or read-only journey in the locally running application after structural frontend review; not for backend review, whole-frontend audits, production URLs, browser-test authoring, or automatic UI changes.
---

# Lotus UI Review

## Objective

Review exactly one Lotus frontend screen or read-only journey in the local application. Use
Playwright CLI as the required browser mechanism, preserve code and data, and return an auditable
A/B/C report. Propose findings; never apply UI changes without a separate explicit approval.

## Inputs

Require all of the following before starting:

- one screen or one bounded read-only journey;
- a local URL on `localhost`, `127.0.0.1` or an equivalent loopback address;
- the Lotus frontend and shared backend reachable locally;
- Playwright CLI available;
- manual login completed when authentication is required.

Return `BLOCKED: <reason>` and stop when the surface is absent or broad, anchors diverge, a required
service is unreachable, Playwright CLI is unavailable, the URL is not local, the journey requires
an unauthorized mutation, or manual login is not completed. Do not substitute another browser
mechanism when Playwright CLI is missing.

Chrome DevTools MCP is complementary. When unavailable, record `complementary_unavailable` and
continue with Playwright if the review remains possible.

## Canonical workflow

1. Validate that the request names exactly one screen or bounded journey. Block whole-frontend or
   multi-surface requests.
2. Read `AGENTS.md`, `CLAUDE.md`, `INSTRUÇÕES-DO-PROJETO.md`, `docs/superpowers/state.md`,
   `.claude/rules/frontend-fsliced.md`, and only the source files required for this surface.
3. Record `git status --short`, the current branch, and commit. Preserve all existing WIP.
4. Reject non-local URLs before opening a browser.
5. Run `scripts/preflight.sh` from this skill directory. Stop on any `BLOCKED:` result.
6. Create a unique `.artifacts/ui-review/<date-time>-<slug>/` directory and a unique named
   Playwright session. Keep both ignored by Git.
7. Open the browser headed. Ask the user to complete login manually when needed; after login, clear
   the console/network reading so authentication noise is not classified as a finding.
8. For each interaction, capture a snapshot, perform one action, and capture a new snapshot. Use
   screenshots—not accessibility snapshots—to judge layout.
9. Perform only read-only interactions after login. Do not create, edit, delete, upload, revoke,
   seed, mock, route-intercept, or otherwise mutate application data or code.
10. Repeat the same journey at `1440x900`, `1024x768`, and `390x844`. Capture visual evidence for
    every viewport.
11. Inspect console and network signals after the journey. Tie any claim to the relevant event or
    request.
12. Use Chrome DevTools only when available and needed for complementary console, network, or
    performance diagnosis. Its absence must not replace or invalidate Playwright evidence.
13. Read `references/review-rubric.md` completely immediately before classifying observations.
14. Fill `references/report-template.md` exactly. Report no more than ten findings; give every B/C
    its own reproduction and evidence.
15. Record Git again and compare it with the initial state. Declare every mutation and code change;
    a conforming read-only run declares both as `none`.
16. Return the report and wait for explicit approval. Do not correct UI, documentation, data, or
    code as a consequence of the review.
17. Close only the Playwright session created for this run. Keep ignored evidence for audit and do
    not leave a Vite process started by this run alive.

## Safety rules

- Treat login as the only permitted session mutation; never type or submit business data.
- Do not use request mocking or route interception to fabricate normal, loading, empty, error,
  disabled, or read-only states. List unreachable states under `Untested states`.
- Do not inspect or alter production. A URL being reachable does not make it local.
- Do not access Drive, Notion, or Figma without an explicit reference. Never claim a Figma
  comparison unless the file and node were actually retrieved.
- Do not classify an expected authorization response as a defect without proving user-visible
  impact.
- Do not overwrite, stash, clean, reset, delete, or include pre-existing WIP.
- Keep cookies, storage state, credentials, screenshots, traces, and MCP configuration out of Git.

## Evidence contract

Use snapshots for accessible structure and interaction state. Use screenshots for visual layout.
Name evidence by journey step and viewport. Record console and network after login, plus any
performance measurement actually taken. A missing measurement is a limitation, not a fact.

Before returning, confirm:

- the three required viewports are represented;
- every B/C points to its own evidence and reproduction;
- observed fact, inference, impact, and recommendation remain separate;
- no more than ten findings are present;
- Git before/after is recorded;
- `Mutations performed: none` and `Code changes performed: none` are true, or the run is reported
  as non-conforming;
- the report begins and ends with the exact markers from `references/report-template.md`.

## Common mistakes

| Mistake | Required response |
|---|---|
| Broad request such as “review the whole frontend” | Return `BLOCKED` and request one surface. |
| Production or external URL | Return `BLOCKED` before navigation. |
| Playwright missing | Return `BLOCKED`; do not substitute Chrome, Firefox, MCP, or curl. |
| Chrome DevTools missing | Continue and record `complementary_unavailable`. |
| Screenshot used to claim keyboard behavior | Reproduce with snapshots before/after focus movement. |
| Snapshot used to claim spacing or overflow | Capture and inspect a screenshot at that viewport. |
| Error state requires writing or fabricated traffic | Mark the state untested. |
| Finding suggests direct PrimeReact use in a feature | Recommend the Lotus `shared/ui` boundary instead. |
| Review finds a defect | Report and wait; do not fix it. |

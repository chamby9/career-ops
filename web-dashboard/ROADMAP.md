# Web Dashboard Roadmap

Personal PWA dashboard for career-ops, served on Tailscale at port 3848.
**Goal:** make the PWA the primary interface. Everything you'd type into Claude Code, you can tap instead.

---

## Legend

- [x] shipped
- [ ] not started
- [~] in progress
- [!] blocked / needs decision

---

## Core design principles

1. **Mode classification determines UI treatment.** Each skill is one of three types:
   - **Mechanical** (scan, pdf, patterns, followup, liveness-check, merge-tracker, verify-pipeline, dedup, normalize) → run directly from Node API, no Claude, no worker, no cost. Instant.
   - **Data-read** (tracker, status changes, reading reports/prep/digest/profile) → pure filesystem reads/edits. Instant.
   - **LLM-heavy** (oferta, ofertas, apply, contacto, deep, interview-prep, training, project, batch) → queue → worker → `claude -p`. Minutes.

2. **Reports are the spine.** Structured A-G blocks + metadata. Treat each report as a record with filterable facets (score, archetype, legitimacy, location, date, status).

3. **Per-row actions.** Every tracker row gets a menu with everything the skillset can do to that application.

4. **No more "open Claude Code to do X."**

---

## System inventory (for reference)

### Skill modes

| Mode | Purpose | Type | Inputs | Outputs |
|------|---------|------|--------|---------|
| oferta | Full A-F+G evaluation | LLM | URL or JD text | report file |
| ofertas | Compare/rank offers | LLM | 2+ reports | comparison file |
| apply | Live application form helper | LLM | URL + report | field answers |
| tracker | Status overview | Data-read | applications.md | table |
| pdf | Generate ATS CV | Mechanical | company | PDF file |
| auto-pipeline | Orchestrate evaluate→report→PDF→tracker | LLM | URL | all above |
| scan | Portal API scan, dedupe | Mechanical | portals.yml | pipeline.md, history.tsv |
| pipeline | Process pending URLs | Mechanical | pipeline.md | batch-input.tsv |
| batch | Parallel worker evaluation | LLM | batch-input.tsv | reports + tracker adds |
| interview-prep | Company interview intel | LLM | company + role | prep file |
| patterns | Rejection trend analysis | Mechanical | applications.md + reports | pattern-analysis file, JSON |
| followup | Follow-up cadence | Mechanical | applications.md + follow-ups.md | JSON cadence |
| contacto | LinkedIn outreach draft | LLM | company + role | contact list + messages |
| deep | Extended company research | LLM | company | deep-dive |
| training | Evaluate course/cert | LLM | URL + archetype | fit assessment |
| project | Evaluate portfolio project idea | LLM | project description | suggestions |

### Root `.mjs` scripts (all pure data, no Claude)

scan.mjs, generate-pdf.mjs, analyze-patterns.mjs, followup-cadence.mjs, check-liveness.mjs, liveness-core.mjs, normalize-statuses.mjs, verify-pipeline.mjs, dedup-tracker.mjs, merge-tracker.mjs, cv-sync-check.mjs, doctor.mjs, test-all.mjs, update-system.mjs

### Data surfaced today

- `data/applications.md` → tracker table
- `data/pipeline.md` → pipeline page
- `reports/*.md` → reports list + detail
- `config/profile.yml` → read for candidate context
- `data/dashboard-queue*.jsonl` → jobs history

### Data not yet surfaced

- `interview-prep/story-bank.md` + `interview-prep/{company}-{role}.md`
- `batch/tracker-additions/`, `batch/batch-state.tsv`
- `data/scan-history.tsv`, `data/follow-ups.md`
- `config/profile.yml` (editing), `modes/_profile.md`, `article-digest.md`, `cv.md`
- `output/` (generated PDFs library)

---

## Information architecture (target)

**Nav:** `Dashboard` · `Applications` · `Pipeline` · `Reports` · `Interview Prep` · `Follow-ups` · `Patterns` · `Portfolio` · `Jobs`

- **Dashboard (`/`)** — stats strip, actions panel, today's follow-ups, recent jobs, top open applications by score
- **Applications (`/applications`)** — sortable/filterable tracker + per-row action menu
- **Pipeline (`/pipeline`)** — bulk select + evaluate, per-URL actions, scan history, scan now
- **Reports (`/reports`)** — facet filters, inline A-G preview, multi-select compare
- **Interview Prep (`/interview-prep`)** — prep cards per company + story bank
- **Follow-ups (`/followups`)** — due/overdue table, mark-contacted, draft generator
- **Patterns (`/patterns`)** — rejection trends, archetype conversion, geo blockers, charts
- **Portfolio (`/portfolio`)** — cv.md, article-digest.md, profile viewer/editor, PDFs library
- **Jobs (`/jobs`)** — queue history with live logs, cancel, re-queue

---

## Phases

### v1 — Read-only PWA [shipped]

- [x] Tracker table, report viewer, pipeline inbox, stats strip
- [x] Dark mode, PWA manifest, manual refresh + SSE live updates
- [x] Tailscale-only, runs continuously via launchctl

### v1.5 — Tracker UX [shipped]

- [x] Default sort: score DESC (nulls last, tie-break by num)
- [x] Sortable columns (score, date, company, status)
- [x] Filter by status (multi-select chips)
- [x] Filter by min score
- [x] Text search across company / role / notes
- [x] Persist filter/sort state in URL query params
- [x] Clear filters + "N of M" count

### v2 — Skills as Buttons, worker infrastructure [shipped]

- [x] Queue format (`data/dashboard-queue.jsonl`, append-only)
- [x] Headless worker polling queue, running `claude -p "/career-ops <mode> <args>"`
- [x] Separate launchctl plist (`com.claude.career-ops-worker`)
- [x] `POST /api/jobs` to enqueue, `GET /api/jobs` for status
- [x] ActionsPanel on home: Evaluate URL input + Scan button + recent jobs strip
- [x] Validates action whitelist, rejects unknown

### v2.1 — Per-row actions on Applications [shipped, 1 defer]

- [x] Kebab menu on each tracker row
- [x] Status change (no Claude): Evaluated, Applied, Responded, Interview, Offer, Rejected, Discarded, SKIP → `POST /api/tracker/[num]/status` edits applications.md
- [~] Open actions: Open report (shipped), Open JD URL (shipped), Open PDF (deferred — needs output/ indexing)
- [x] Queued actions (worker): Re-evaluate (oferta), PDF, Interview prep, Contact (contacto), Deep research (deep), Apply
- [x] Schedule follow-up: `POST /api/tracker/[num]/followup` appends to data/follow-ups.md (preserves cadence schema)
- [x] Worker: extend action whitelist to `contacto`, `deep`, `interview-prep`, `apply`, `training`, `project`, `ofertas`, `batch`
- [x] Optimistic UI for status changes; alert() on failure (toast component deferred to v3 polish)

### v2.2 — Mechanical script endpoints (no Claude, no worker)

- [ ] `POST /api/scripts/patterns` → spawn analyze-patterns.mjs, return JSON
- [ ] `POST /api/scripts/followup` → spawn followup-cadence.mjs, return JSON
- [ ] `POST /api/scripts/liveness` → spawn check-liveness.mjs, return JSON
- [ ] `POST /api/scripts/scan` → spawn scan.mjs (moves off worker; no Claude needed)
- [ ] `POST /api/scripts/pdf` → spawn generate-pdf.mjs for pre-rendered HTML
- [ ] `POST /api/scripts/verify`, `dedup`, `normalize`, `merge`, `doctor`
- [ ] Shared helper `runScript(name, args)` with timeout + stderr capture
- [ ] Gated by a `x-local` header or Tailscale IP allowlist (defense in depth)

### v2.3 — Pipeline enhancements

- [ ] Bulk select URLs → "Evaluate all" queues a `batch` job
- [ ] Per-URL: Evaluate, Discard, Liveness-check, Open
- [ ] Scan history view (timeline from data/scan-history.tsv)
- [ ] "Scan now" button → calls /api/scripts/scan
- [ ] Show which portals produced new URLs last run

### v2.4 — Reports facets

- [ ] Extract archetype, location, seniority from report headers into a derived index cache
- [ ] Facet sidebar: archetype, legitimacy, score range, location, date range
- [ ] Inline A-G block previews (collapsible)
- [ ] Multi-select → "Compare selected" → queues `ofertas`
- [ ] Full-text search across report bodies

### v2.5 — Interview Prep hub

- [ ] `/interview-prep` index: cards per company with existing prep
- [ ] Story bank viewer (interview-prep/story-bank.md) in sidebar
- [ ] "Generate prep" button per application lacking prep → queues `interview-prep`
- [ ] Mark stories as used per company
- [ ] Link from Applications row → its prep page

### v2.6 — Follow-ups

- [ ] `/followups` table of due/overdue from followup-cadence.mjs
- [ ] Mark contacted inline → appends to data/follow-ups.md
- [ ] "Draft follow-up" button → queues `contacto` in follow-up mode
- [ ] Today's due count on home dashboard

### v2.7 — Patterns analytics

- [ ] `/patterns` page rendering analyze-patterns.mjs JSON
- [ ] Charts: rejection rate by archetype, geo blockers, score vs outcome, funnel
- [ ] Click-through from each pattern to the applications behind it
- [ ] Trend over time (compare current run vs prior snapshot)

### v2.8 — Portfolio

- [ ] `/portfolio` viewer for cv.md, article-digest.md, config/profile.yml, modes/_profile.md
- [ ] Generated PDFs library (browse output/, download, delete old)
- [ ] Inline bullet edits for cv.md (simple string swaps)
- [ ] "Edit in Claude" button for structural changes → queues `/career-ops` with the file as context
- [ ] cv-sync-check status badge (from cv-sync-check.mjs)

### v2.9 — Jobs dashboard

- [ ] `/jobs` full worker queue history
- [ ] Live log streaming per running job via SSE
- [ ] Cancel running (send SIGTERM to worker child)
- [ ] Re-queue failed jobs with one tap
- [ ] Filter by action type and status

### v3 — PWA polish

- [ ] Offline support for reads (service worker cache)
- [ ] Push notifications when queued job finishes
- [ ] iOS share target → Evaluate URL from Safari share sheet
- [ ] Mobile-first layout refinements

---

## Out of scope

- Per-row "scan" button (scan is global)
- UI for `update-system`, `test-all`, `cv-sync-check`, `doctor` admin commands (stay in CLI)
- Editor for system-layer modes (`modes/_shared.md`, `modes/oferta.md`) — that's code, not content
- Multi-user auth — Tailscale is the auth boundary

## Upstream GitHub issues to track

- #147 tracker format migration (applications.md → applications.json)
- #152 funnel analytics
- #189 report viewer external-open fallback

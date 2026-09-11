# EPIC-UPL — Ingest + processing

**Epic ID:** `EPIC-UPL`
**User stories:** `docs/user-stories/US-002.md` (F03)

| Feature ID | Feature | Status | Priority | depends_on | co_req | blocks |
|------------|---------|--------|----------|------------|--------|--------|
| UPL-01 | Presigned init/complete | todo | P0 | ROOM-01, ROOM-03 | — | UPL-03 |
| UPL-02 | Multipart/chunked resume | todo | P0 | UPL-01 | — | — |
| UPL-03 | Processing queue (thumb/meta/web) | todo | P1 | UPL-01 | — | GAL-01 |
| UPL-04 | Malware scan + GPS strip | todo | P1 | UPL-03 | — | GAL-01 |

## UPL-01 — Presigned init/complete
**Status:** todo
### Acceptance
- Metadata post → temp Media → presigned URL → direct PUT → complete enqueues job; no backend bandwidth.
### Links
- Contract: `docs/backend-rup.md` §5/§8/§9
- Claims: CLM-005

## UPL-02 — Multipart resume
**Status:** todo
### Acceptance
- Split/parallel parts, validate, complete, auto-abort incomplete; resume after disconnect.
### Links
- Contract: `docs/backend-rup.md` §5
- Claims: CLM-006

## UPL-03 — Processing queue
**Status:** todo
### Acceptance
- Thumbnails, technical metadata, web variants/transcoding via Job Queue outside request cycle.
### Links
- Contract: `docs/backend-rup.md` §10
- Claims: CLM-007

## UPL-04 — Malware + GPS strip
**Status:** todo
### Acceptance
- Pre-publish malware scan; GPS/sensitive EXIF stripped; MIME + size limits enforced.
### Links
- Contract: `docs/backend-rup.md` §10/§11
- Claims: CLM-007, CLM-011

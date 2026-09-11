# EPIC-GAL — Gallery + moderation

**Epic ID:** `EPIC-GAL`
**User stories:** `docs/user-stories/US-002.md` (F04), `docs/user-stories/US-003.md` (F01–F02), `docs/user-stories/US-004.md` (F01–F02)

| Feature ID | Feature | Status | Priority | depends_on | co_req | blocks |
|------------|---------|--------|----------|------------|--------|--------|
| GAL-01 | Mode-gated gallery + likes | todo | P1 | UPL-03, ROOM-03 | — | GAL-03 |
| GAL-02 | Report + approve/reject queue | todo | P1 | GAL-01 | ROOM-04 | — |
| GAL-03 | Live Slideshow feed | todo | P2 | GAL-01 | — | — |
| GAL-04 | Studio scoped upload | todo | P2 | ROOM-01 | — | — |

## GAL-01 — Mode-gated gallery
**Status:** todo
### Acceptance
- Visibility/likes follow Room mode; UploadOnly hides others; Moderated hides unapproved.
### Links
- Contract: `docs/backend-rup.md` §3/§4
- Claims: CLM-004

## GAL-02 — Report + moderation
**Status:** todo
### Acceptance
- Guest report → moderator queue → approve/reject → audit + state visible to reporter.
### Links
- Contract: `docs/backend-rup.md` §5/§7
- Claims: CLM-004

## GAL-03 — Slideshow feed
**Status:** todo
### Acceptance
- Approved-photos stream with delay, logo overlay, enable/disable, QR payload.
### Links
- Contract: `docs/backend-rup.md` §5
- Claims: CLM-012

## GAL-04 — Studio upload
**Status:** todo
### Acceptance
- Scoped token for one Room; official content flagged separate from guest content.
### Links
- Contract: `docs/backend-rup.md` §4/§5/§8
- Claims: CLM-012

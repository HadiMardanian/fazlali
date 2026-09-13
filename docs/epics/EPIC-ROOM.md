# EPIC-ROOM — Room lifecycle + access

**Epic ID:** `EPIC-ROOM`
**User stories:** `docs/user-stories/US-001.md` (F01–F04), `docs/user-stories/US-003.md` (F03), `docs/user-stories/US-004.md` (F03)

| Feature ID | Feature | Status | Priority | depends_on | co_req | blocks |
|------------|---------|--------|----------|------------|--------|--------|
| ROOM-01 | Room CRUD + settings + modes | todo | P0 | — | — | ROOM-02, ROOM-03, UPL-01 |
| ROOM-02 | Entry kit (QR/link/poster/PIN, rotate) | done | P0 | ROOM-01 | — | ROOM-03 |
| ROOM-03 | Guest no-signup session | done | P0 | ROOM-01 | — | UPL-01, GAL-01 |
| ROOM-04 | Roles + block + AuditLog | todo | P1 | ROOM-01 | GAL-02 | — |

## ROOM-01 — Room CRUD + settings + modes
**Status:** todo
### Acceptance
- CRUD with name, date, capacity, mode (Private/UploadOnly/Shared/Moderated), retention; mode enforced server-side.
### Links
- Contract: `docs/backend-rup.md` §3/§4/§7
- Claims: CLM-002, CLM-004

## ROOM-02 — Entry kit
**Status:** done
### Acceptance
- Unique QR + short link + poster payload + PIN; link rotate/disable works.
### Links
- Contract: `docs/backend-rup.md` §4/§8
- Claims: CLM-002, CLM-012

## ROOM-03 — Guest session
**Status:** done
### Acceptance
- Display name + terms accept → short-lived revocable token with session timeout.
### Links
- Contract: `docs/backend-rup.md` §4/§8
- Claims: CLM-003

## ROOM-04 — Roles + block + audit
**Status:** todo
### Acceptance
- Owner/Moderator/Photographer/Guest checks; user/device block; delete/download/block/approve/link-rotate audited.
### Links
- Contract: `docs/backend-rup.md` §7/§11
- Claims: CLM-011

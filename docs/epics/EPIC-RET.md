# EPIC-RET — Commercial + retention

**Epic ID:** `EPIC-RET`
**User stories:** `docs/user-stories/US-001.md` (F02, F05)

| Feature ID | Feature | Status | Priority | depends_on | co_req | blocks |
|------------|---------|--------|----------|------------|--------|--------|
| RET-01 | Packages + payment + extend | todo | P0 | ROOM-01 | — | RET-03 |
| RET-02 | ZIP build + expiring downloads | todo | P1 | UPL-01 | — | — |
| RET-03 | Expiry notices + 7-day grace | todo | P1 | RET-01 | — | — |
| RET-04 | Stats (join/upload/volume) | todo | P2 | UPL-01, GAL-01 | — | — |
| RET-05 | Fair-use caps enforcement | todo | P1 | ROOM-01, UPL-01 | — | — |

## RET-01 — Packages + payment
**Status:** todo
### Acceptance
- Basic/Wedding/Premium/Archive with retention period; pay + extend endpoints.
### Links
- Contract: `docs/backend-rup.md` §12
- Claims: CLM-008

## RET-02 — ZIP + downloads
**Status:** todo
### Acceptance
- Async ZIP job; single + full downloads via expiring links; per-plan limits.
### Links
- Contract: `docs/backend-rup.md` §5/§8/§10
- Claims: CLM-002

## RET-03 — Expiry + grace
**Status:** todo
### Acceptance
- 7/3/1d notices; 7-day Grace retain + renew; then delete/archive per policy.
### Links
- Contract: `docs/backend-rup.md` §12
- Claims: CLM-010

## RET-04 — Stats
**Status:** todo
### Acceptance
- Join Rate, Upload Rate, volume/success/renewal aggregates per Room.
### Links
- Contract: `docs/backend-rup.md` §13
- Claims: CLM-014

## RET-05 — Fair-use caps
**Status:** todo
### Acceptance
- Caps (storage/guests/files/size/retention/ZIP) enforced; overage → buy/upgrade/extend.
### Links
- Contract: `docs/backend-rup.md` §12
- Claims: CLM-009

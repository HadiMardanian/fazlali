# PH-01 context

## Shared SoT
- Index: `docs/dev-pipeline/SHARED.md`
- Surfaces in this phase: `SUR-02` (backend-api), `SUR-03` (worker-jobs)

## Entities ↔ modules
| Entity | Module / path | Notes |
|--------|---------------|-------|
| Room | `docs/backend-rup.md` §7 | mode, package, retention |
| Media | `docs/backend-rup.md` §7 | presigned + multipart state |
| Membership | `docs/backend-rup.md` §7 | guest temp session, block |
| Payment/Retention | `docs/backend-rup.md` §7/12 | 7/3/1d notices, 7-day grace |

## API / DTO contracts
| Contract | Path | Consumers |
|----------|------|-----------|
| REST sketch | `docs/backend-rup.md` §8 | SUR-01, SUR-02 |
| Upload flow | `docs/backend-rup.md` §9 | SUR-01, SUR-02, SUR-03 |
| Jobs | `docs/backend-rup.md` §10 | SUR-03 |

## Invariants (do not break across phases)
- Modes Private/UploadOnly/Shared/Moderated enforced server-side.
- SQL Server metadata only; no blobs in DB.
- No public bucket; signed expiring URLs only.
- GPS strip + malware scan pre-publish.

## Changed by
| Task / event | Note |
|--------------|------|
| phase new | Seeded from SHARED authoritative paths |
| phase switch | Refreshed on activation 2026-09-11; SHARED unchanged, no contract drift |

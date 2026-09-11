# STORY-001 — 2026-09-11

**Source:** extract
**Mode:** from docs only (`--from-docs-only`; no code inference)

## Evidence scanned
| Source | Path | Notes |
|--------|------|-------|
| Journey docs | `docs/wedding-album.md` §2 | Owner §2.1, Guest §2.2 (Observed) |
| Contract | `docs/backend-rup.md` §3/§4 | Modes, use cases (Observed) |
| Epics | `docs/epics/EPIC-ROOM.md`, `EPIC-UPL.md`, `EPIC-GAL.md`, `EPIC-RET.md` | All features `todo`, none `done` |
| Index | `docs/user-stories/INDEX.md` | Empty; no dedup hits |

## Candidates
| Local | Class | Summary | Feature links | Flow status guess | Evidence |
|-------|-------|---------|---------------|-------------------|----------|
| 1 | new | Owner Room lifecycle | ROOM-01/02, RET-01/02/03 | all todo (nothing shipped) | Observed, docs only |
| 2 | new | Guest no-signup upload | ROOM-03, UPL-01/02, GAL-01/02 | all todo | Observed, docs only |
| 3 | new | Moderation + privacy control | GAL-02, ROOM-04 | all todo | Observed, docs only |
| 4 | new | Studio + slideshow + poster | GAL-03/04, ROOM-02 | all todo | Observed, docs only |

No done flows (no shipped code). No contradictions. Gaps: payment provider, notification channel unspecified (Unknown).

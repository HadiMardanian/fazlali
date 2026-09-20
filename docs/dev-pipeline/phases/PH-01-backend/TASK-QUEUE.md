# TASK-QUEUE — PH-01

| Order | Task ID | Feature | Title | Priority | Status | depends_on | blocks | Prompt |
|------:|---------|---------|-------|----------|--------|------------|--------|--------|
| 1 | TASK-ROOM-01-01 | ROOM-01 | Scaffold backend + Room CRUD with modes | P0 | done | — | ROOM-02, ROOM-03, UPL-01 | `agent-prompts/TASK-ROOM-01-01.md` |
| 2 | TASK-ROOM-02-01 | ROOM-02 | Entry kit (QR/link/PIN, rotate) | P0 | done | ROOM-01 | ROOM-03 | `agent-prompts/TASK-ROOM-02-01.md` |
| 3 | TASK-ROOM-03-01 | ROOM-03 | Guest no-signup session | P0 | done | ROOM-01 | UPL-01, GAL-01 | `agent-prompts/TASK-ROOM-03-01.md` |
| 4 | TASK-UPL-01-01 | UPL-01 | Presigned upload init/complete | P0 | done | ROOM-01, ROOM-03 | UPL-02, UPL-03, GAL-01 | `agent-prompts/TASK-UPL-01-01.md` |
| 5 | TASK-UPL-02-01 | UPL-02 | Multipart/chunked resume | P0 | done | UPL-01 | UPL-03 | `agent-prompts/TASK-UPL-02-01.md` |
| 6 | TASK-UPL-03-01 | UPL-03 | Processing queue + worker | P1 | done | UPL-01 | GAL-01 | `agent-prompts/TASK-UPL-03-01.md` |
| 7 | TASK-RET-01-01 | RET-01 | Packages + payment + extend | P0 | done | ROOM-01 | RET-03 | `agent-prompts/TASK-RET-01-01.md` |
| 8 | TASK-UPL-04-01 | UPL-04 | Malware scan + GPS strip | P1 | done | UPL-03 | GAL-01 | `agent-prompts/TASK-UPL-04-01.md` |
| 9 | TASK-GAL-01-01 | GAL-01 | Mode-gated gallery + likes | P1 | done | UPL-03, ROOM-03 | GAL-03 | `agent-prompts/TASK-GAL-01-01.md` |
| 10 | TASK-GAL-02-01 | GAL-02 | Report + approve/reject queue | P1 | done | GAL-01 | ROOM-04 | `agent-prompts/TASK-GAL-02-01.md` |
| 11 | TASK-RET-02-01 | RET-02 | ZIP build + expiring downloads | P1 | done | UPL-01 | — | `agent-prompts/TASK-RET-02-01.md` |
| 12 | TASK-RET-03-01 | RET-03 | Expiry notices + 7-day grace | P1 | ready | RET-01 | — | `agent-prompts/TASK-RET-03-01.md` |
|------:|---------|---------|-------|----------|--------|------------|--------|--------|

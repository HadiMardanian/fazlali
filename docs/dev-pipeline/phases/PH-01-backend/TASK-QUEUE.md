# TASK-QUEUE — PH-01

| Order | Task ID | Feature | Title | Priority | Status | depends_on | blocks | Prompt |
|------:|---------|---------|-------|----------|--------|------------|--------|--------|
| 1 | TASK-ROOM-01-01 | ROOM-01 | Scaffold backend + Room CRUD with modes | P0 | done | — | ROOM-02, ROOM-03, UPL-01 | `agent-prompts/TASK-ROOM-01-01.md` |
| 2 | TASK-ROOM-02-01 | ROOM-02 | Entry kit (QR/link/PIN, rotate) | P0 | done | ROOM-01 | ROOM-03 | `agent-prompts/TASK-ROOM-02-01.md` |
| 3 | TASK-ROOM-03-01 | ROOM-03 | Guest no-signup session | P0 | done | ROOM-01 | UPL-01, GAL-01 | `agent-prompts/TASK-ROOM-03-01.md` |
| 4 | TASK-UPL-01-01 | UPL-01 | Presigned upload init/complete | P0 | done | ROOM-01, ROOM-03 | UPL-02, UPL-03, GAL-01 | `agent-prompts/TASK-UPL-01-01.md` |
| 5 | TASK-UPL-02-01 | UPL-02 | Multipart/chunked resume | P0 | done | UPL-01 | UPL-03 | `agent-prompts/TASK-UPL-02-01.md` |
| 6 | TASK-UPL-03-01 | UPL-03 | Processing queue + worker | P1 | in_progress | UPL-01 | GAL-01 | `agent-prompts/TASK-UPL-03-01.md` |
|------:|---------|---------|-------|----------|--------|------------|--------|--------|

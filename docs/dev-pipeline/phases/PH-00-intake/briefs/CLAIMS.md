# Claim ledger — PH-00

| Claim ID | Summary | Kind | Status | First brief | Links |
|----------|---------|------|--------|-------------|-------|
| CLM-001 | Room = shared event-memory collection, not raw cloud | capability | absorbed | BRIEF-001 | `docs/wedding-album.md`, `docs/PRODUCT.md` |
| CLM-002 | Owner flow: create, pay/retention, entry kit (QR/link/poster/PIN), manage, download/ZIP/extend | capability | absorbed | BRIEF-001 | `docs/wedding-album.md`, `docs/backend-rup.md` §4 |
| CLM-003 | Guest no-signup: QR/link entry, display name + terms, temp session, multi-upload + resume + queue | capability | absorbed | BRIEF-001 | `docs/wedding-album.md`, `docs/backend-rup.md` §4 |
| CLM-004 | Gallery modes Private/UploadOnly/Shared/Moderated enforced server-side | business_rule | absorbed | BRIEF-001 | `docs/backend-rup.md` §3 |
| CLM-005 | Presigned direct upload; temp record → URL → complete → queue | capability | absorbed | BRIEF-001 | `docs/backend-rup.md` §9, `docs/ARCHITECTURE.md` |
| CLM-006 | Multipart/chunked large video with resume, parallel parts, validation, abort | capability | absorbed | BRIEF-001 | `docs/backend-rup.md` §5 |
| CLM-007 | Background jobs: thumbs, metadata, malware scan, GPS strip, web variants, ZIP, expiry purge, notices, stats | capability | absorbed | BRIEF-001 | `docs/backend-rup.md` §10 |
| CLM-008 | Per-event pricing (Basic/Wedding/Premium/Archive); cost formula + margin | business_rule | absorbed | BRIEF-001 | `docs/backend-rup.md` §12 |
| CLM-009 | Fair-use caps (e.g. 200GB, guest/file/size/retention/ZIP limits); overage upgrade | constraint | absorbed | BRIEF-001 | `docs/backend-rup.md` §12 |
| CLM-010 | Retention notices 7/3/1d + 7-day Grace Period, then delete/archive | business_rule | absorbed | BRIEF-001 | `docs/backend-rup.md` §12 |
| CLM-011 | Security: GPS strip, malware scan, signed expiring URLs, PIN, roles, block, AuditLog, reports | business_rule | absorbed | BRIEF-001 | `docs/backend-rup.md` §11 |
| CLM-012 | Differentiators: Live Slideshow, printable poster kit, studio scoped upload | capability | absorbed | BRIEF-001 | `docs/backend-rup.md` §5 |
| CLM-013 | MVP scope vs Phase 2 (camera, face recognition, editor, analytics deferred) | non_goal | absorbed | BRIEF-001 | `docs/ROADMAP.md`, `docs/backend-rup.md` §15 |
| CLM-014 | KPIs Join Rate / Upload Rate + complements; risks (weak net, no-install, privacy, cost) | backlog_hint | absorbed | BRIEF-001 | `docs/backend-rup.md` §13/14 |
| CLM-015 | Backend stack = Node.js / NestJS / TypeORM (not ASP.NET Core) | constraint | absorbed | BRIEF-002 | `docs/ARCHITECTURE.md`, `docs/backend-rup.md` |

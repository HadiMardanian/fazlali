# Backend RUP — Room Event Content Service
Source: `docs/wedding-album.md` (converted from `docs/wedding-album.pdf`)
Stack: NestJS (Node.js) API (RESTful), SQL Server (metadata only), S3-compatible Object Storage, Job Queue, PWA/Web/Mobile clients

## 1. Vision
Room solves scattered guest photo/video collection at events (weddings, birthdays, family, corporate, conferences, cultural, branding). Not raw cloud storage. Shared experience: guests upload instantly, no signup/app install; host receives organized archive. Backend MUST enable no-friction guest upload, scalable direct-to-storage ingest, privacy-controlled gallery, and paid retention lifecycle.

## 2. Stakeholders & Roles
- Owner (host): creates Room, pays, manages files/reports, downloads, extends retention.
- Guest: temporary access via QR/link, display name only, uploads, likes/reports if allowed.
- Moderator: approves/rejects in Moderated mode (can be Owner).
- Photographer/Studio: scoped upload of edited files to one Room, separated from guest content.
- Partners: venues, planners, studios (co-branding, affiliate).

## 3. Room Modes (business rules)
- Private: link/PIN only, no public gallery. Family/private events.
- Upload Only: upload allowed, viewing others disabled. Private collection.
- Shared Gallery: view approved files, like/interact. Public events.
- Moderated: files queue for review before visible. Corporate/public/brands.
Rules MUST be enforced server-side per Room, per file, per role.

## 4. Use Cases
### Owner
1. Create Room: name, date, estimated guest capacity, access/display mode.
2. Pay: select package (Basic/Wedding/Premium/Archive), retention period, pay.
3. Get entry kit: unique QR Code, short link, printable poster, entry codes/PIN if enabled.
4. Manage: list uploads, storage usage, delete/block files, handle reports, view participation stats.
5. Retain: single download, full ZIP download, extend retention, receive expiry notices (7/3/1 days before delete).
### Guest (no signup)
1. Enter: scan QR / click link / land on event page.
2. Identify: display name + accept terms/privacy → temporary session.
3. Upload: multi-select photos/videos, progress %, resume after disconnect, send queue management.
4. Gallery: view if allowed, like, report abuse, see Moderated approval state.

## 5. Functional Requirements (MVP)
- Owner auth (signup/login). Guest temporary session with time limit, revocable link/PIN.
- Room CRUD + settings (capacity, mode, retention).
- QR/link/poster generation endpoints.
- Upload init: client sends file metadata → backend creates temp Media record → returns Presigned URL (single) or Multipart init (large video).
- Upload complete callback → enqueue processing.
- Resumable/chunked upload for large video: split, parallel part upload, validate parts, complete, auto-abort incomplete after timeout.
- Owner: list/search files, delete/block, storage stats, participation stats.
- Report flow: guest reports → moderator queue → approve/reject → audit.
- Payment + subscription/retention extension; expiry scheduler; Grace Period 7 days post-expiry (retain, allow renew); then delete or archive per policy.
- ZIP generation (async job) + expiring download links; per-plan ZIP/download limits.
- Notifications: expiry 7/3/1d, subscription end, report handling.
- Live Slideshow feed: approved-photos stream with configurable delay, logo overlay, enable/disable, QR display.
- Studio scoped upload endpoint, content flagged as official.

## 6. Architecture
- Backend: ASP.NET Core API, RESTful, service layer reusable for Web/PWA/Mobile.
- DB: SQL Server for structured data + metadata only. No binary blobs.
- Storage: S3-compatible Object Storage for photos, videos, thumbnails, ZIPs, transcoded variants. Layout: `{roomId}/{fileId}/{original|thumb|web|parts}`. No public direct access; only signed expiring URLs.
- Upload path: browser/app → Presigned URL → Object Storage (bypasses backend bandwidth). Backend only issues URLs, tracks state, validates completion.
- Async: Job Queue outside request cycle for all heavy work.

## 7. Data Model (SQL Server)
- Room(id, ownerId, title, eventDate, guestCapacity, mode: Private|UploadOnly|Shared|Moderated, package, retentionUntil, status, inviteLink, pinHash, branding)
- User(id, role: Owner|Moderator|Photographer, contact, hash)
- Membership(roomId, userId/deviceId, displayName, role: Guest|Moderator|Photographer, sessionExpiry, blocked)
- Media(id, roomId, uploaderRef, kind: photo|video, originalKey, thumbKey, webKey, size, mime, status: temp|uploading|queued|processing|approved|rejected|blocked, moderationNote, gpsStripped, createdAt)
- Payment(id, roomId, package, amount, period, providerRef, status)
- ContentReport(id, mediaId, reporterRef, reason, status, handledAt)
- AuditLog(id, roomId, actor, action: delete|download|block|approve|link-rotate, target, at)
- RetentionPolicy(roomId, expiryAt, graceUntil, notified7/3/1d, action: delete|archive)

## 8. API Sketch (REST)
- `POST /rooms` `GET/PATCH/DELETE /rooms/{id}` `POST /rooms/{id}/pay` `POST /rooms/{id}/extend`
- `GET /rooms/{id}/entry-kit` (qr, link, poster) `POST /rooms/{id}/rotate-link`
- `POST /rooms/{id}/guest-session` (displayName, acceptTerms → token)
- `POST /rooms/{id}/media:init` (name, size, mime → mediaId + presignedUrl OR multipart session)
- `POST /media/{id}/multipart:{init|part-url|complete|abort}` `POST /media/{id}/complete`
- `GET /rooms/{id}/media` `DELETE /media/{id}` `POST /media/{id}:{block|approve|reject|report}`
- `POST /rooms/{id}/zip` `GET /zips/{id}` (expiring download URL)
- `GET /rooms/{id}/stats` (join rate, upload rate, volume) `GET /rooms/{id}/slideshow-feed`
- Auth: Owner JWT; Guest short-lived token; Photographer scoped token. All storage URLs signed + expiring.

## 9. Upload Strategy
1. Guest selects files. 2. Client posts metadata. 3. Backend creates temp Media. 4. Backend mints Presigned URL(s). 5. Client PUTs direct to Object Storage. 6. Client calls complete. 7. Backend enqueues processing.
Benefits: no backend bandwidth, scales concurrent + large files, better access control.

## 10. Background Jobs
Thumbnail (photo/video), technical metadata extract, malware scan pre-publish, GPS/sensitive EXIF strip, web variants + transcoding, ZIP build, expired-file delete, incomplete-upload purge, subscription/EOL notices, usage/participation aggregates.

## 11. Security / Privacy / Access Control
- Strip GPS EXIF on ingest. Malware scan before publish. MIME + size limits.
- No public bucket. Signed expiring URLs only. Expiring download links. PIN entry. Guest session timeout. Link rotate/disable. Role checks (Owner/Moderator/Photographer/Guest). Studio limited to assigned Room. User/device block. Full AuditLog. Abuse report + takedown. Transparent retention notice.

## 12. Commercial Constraints
- Pricing per event + retention + service level (not pure GB). Packages: Basic, Wedding, Premium, Archive (storage cap, guest cap, retention, gallery, ZIP, Live Slideshow, studio access, support, branding/poster).
- Cost: `Cost = Storage + Upload Traffic + Download Traffic + Transcoding + Thumbnail Generation + Infrastructure + Payment Fees`. Price MUST add support, marketing, affiliate, margin.
- Fair use caps (not Unlimited): e.g. 200GB storage, guest count, file count per Room, per-file size, retention length, ZIP/download count on base plans. Overage → buy extra / upgrade / extend.
- Retention: notify 7/3/1d before delete. 7-day Grace Period after expiry (renew to keep). Then delete or archive.

## 13. KPIs
- `Join Rate = joined / present * 100`. `Upload Rate = uploaders / joined * 100`.
- Also: avg files/Room, avg bytes/event, upload success rate, avg completion time, renewal rate, trial-to-paid, report count, report MTTR, affiliate share, Live Slideshow adoption, host/guest satisfaction.

## 14. Risks → Mitigations
- Weak venue net → upload queue, resume, chunked, precise status, auto-retry, PWA (no install).
- No app install → full browser, PWA, QR entry, no guest signup, short flow.
- Privacy leak → Private/Upload-Only, PIN, expiring links, optional moderation, report/delete, block, EXIF strip, clear notice.
- Storage cost blowup → caps, max file size, transcode/compress, tiered packages, auto-delete expired, paid archive.

## 15. Phase 2 (out of MVP)
In-app camera (optional), consented face recognition, light photo editor, live approved-photo broadcast, advanced moderation, studio access, co-branding, advanced analytics, PWA/mobile hardening.

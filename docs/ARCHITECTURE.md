# Architecture — Room

Source: `docs/wedding-album.md`, `docs/backend-rup.md` (Observed).

- Backend: NestJS (Node.js) API, RESTful, service layer for Web/PWA/Mobile.
- DB: SQL Server, metadata only (Room/User/Membership/Media/Payment/ContentReport/AuditLog/RetentionPolicy).
- Storage: S3-compatible Object Storage, layout `{roomId}/{fileId}/{original|thumb|web|parts}`. No public access; signed expiring URLs only.
- Ingest: Presigned URL direct upload; Multipart/Chunked resume for large video.
- Async: Job Queue — thumbnails, metadata, malware scan, GPS strip, transcoding, ZIP, expiry delete, notices, aggregates.
- Gallery modes enforced server-side: Private, UploadOnly, Shared, Moderated.
- Commercial: per-event pricing, fair-use caps, 7/3/1d notices, 7-day Grace Period.

# EPIC-DEV — Developer Experience

Active phase: `PH-01`
Status: **active**

## Summary
Tasks related to the developer experience, build pipelines, and environment setup.

## Features
- **DEV-01:** Development Environment Setup
- **DEV-02:** Swagger API Documentation

### DEV-01: Development Environment Setup
**Status:** done
**Priority:** P0
**Depends on:** —

**Acceptance:**
- `docker-compose.yml` mounts the host codebase into the `api` container.
- Backend server restarts automatically on file changes (using `nest start --watch`).

### DEV-02: Swagger API Documentation
**Status:** ready
**Priority:** P0
**Depends on:** —

**Acceptance:**
- Swagger UI is exposed (e.g. at `/api`).
- DTOs (Request/Response) are fully decorated with OpenAPI decorators (`@ApiProperty`, etc.).
- All endpoints have corresponding descriptive decorators (`@ApiOperation`, `@ApiResponse`, etc.).

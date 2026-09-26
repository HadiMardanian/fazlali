# BRIEF-004

**Date:** 2026-09-26
**Phase:** PH-01

## Raw Input
> I want in development mode, the docker compose run the backend with bindmount, not build the dockerfile. So i can automaticaly restart the backend process with each change in code base

## Claims
1. Development environment (`docker-compose.yml`) should run the backend with a bind mount instead of building from `Dockerfile.api`.
2. The backend process should automatically restart upon codebase changes in development mode.

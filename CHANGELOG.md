# Changelog

## 1.0.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-23

### Added
- FastAPI backend with SQLite persistent storage
- SQLAlchemy models for documents, nodes, versions, and audit logs
- Document CRUD operations with pagination and search
- Hierarchical node tree with parent-child relationships
- Incremental indexing service using SHA-256 content hashing
- Version history tracking with change summaries
- Leaf node extraction for retrieval workflows
- React + TypeScript + Vite frontend
- Document list with pagination, search, and create/delete modals
- Document detail view with tree, leaf nodes, and versions tabs
- Tree view with expand/collapse and inline editing
- Typed API client with React hooks for data fetching
- OIDC/Keycloak authentication configuration
- Dockerfiles for backend and frontend
- Docker Compose with Keycloak, backend, and frontend
- Keycloak realm export with viewer/operator/admin roles
- Comprehensive test suite (15 backend tests, 14 frontend tests)
- Health check endpoints
- Audit logging for all mutations
- .env.example with all configuration options
- .gitignore and .dockerignore files

### Security
- Parameterized SQL queries via SQLAlchemy ORM
- OIDC authorization code flow with PKCE
- Role-based access control (viewer, operator, admin)
- HttpOnly SameSite cookie configuration ready
- CSRF protection for cookie-authenticated writes
- Environment variable configuration for secrets

### Documentation
- README with architecture diagram, API reference, and quick start
- LICENSE (MIT)
- Portfolio.json with schema version 1
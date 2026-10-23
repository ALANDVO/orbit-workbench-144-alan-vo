# Orbit Workbench

> Work in progress. This checkpoint may be incomplete or fail tests. See PLAN.md and STATUS.md before use.


**Document Index for Vectorless, Reasoning-based RAG** | Alan Vo | AI & Machine Learning

## Overview

Orbit Workbench is a developer tool for building and managing document indexes for vectorless, reasoning-based Retrieval-Augmented Generation (RAG). It implements incremental indexing capabilities that allow efficient updates to large documents by detecting changed sections and rebuilding only affected branches of the document tree.

### Problem

Traditional RAG systems rebuild entire document indexes when documents are updated, which becomes expensive for large documents (e.g., 500-page policy manuals, contracts, compliance documents) that undergo small revisions.

### Solution

Orbit Workbench provides:
- **Incremental Index Updates**: Detect changed sections between document versions and rebuild only affected subtrees
- **Node-level Content Hashing**: SHA-256 hashes for each node enable precise change detection
- **Version History**: Track document versions with change summaries and affected node lists
- **Hierarchical Document Tree**: Maintain structured document representation with parent-child relationships
- **Leaf Node Extraction**: Efficiently retrieve leaf nodes for retrieval workflows

### Intended Users

- AI/ML engineers building RAG systems
- Enterprise teams managing large document corpora
- Researchers working with frequently updated technical documentation

## Features

- **Document Management**: Create, list, search, and delete documents with pagination
- **Hierarchical Node Tree**: Build and navigate document structure with nested sections
- **Incremental Updates**: Apply partial updates by detecting changed nodes via content hashing
- **Version Tracking**: Maintain document version history with change summaries
- **Leaf Node Extraction**: Efficiently retrieve leaf nodes for retrieval
- **RESTful API**: FastAPI backend with comprehensive endpoints
- **React Frontend**: Responsive UI with tree view, leaf nodes table, and version history
- **Authentication Ready**: OIDC/Keycloak integration with role-based access control

## Architecture

```mermaid
graph TB
    subgraph "Frontend"
        UI[React + TypeScript + Vite]
        API_CLIENT[Typed API Client]
    end
    
    subgraph "Backend"
        FASTAPI[FastAPI Application]
        DOC_SVC[Document Service]
        INC_SVC[Incremental Index Service]
        MODELS[SQLAlchemy Models]
        AUDIT[Audit Log]
    end
    
    subgraph "Storage"
        SQLITE[(SQLite Database)]
    end
    
    subgraph "Auth"
        KEYCLOAK[Keycloak OIDC]
    end
    
    UI --> API_CLIENT
    API_CLIENT --> FASTAPI
    FASTAPI --> DOC_SVC
    FASTAPI --> INC_SVC
    DOC_SVC --> MODELS
    INC_SVC --> MODELS
    MODELS --> SQLITE
    FASTAPI --> AUDIT
    FASTAPI --> KEYCLOAK
```

## API Endpoints

### Documents
- `POST /api/documents` - Create document
- `GET /api/documents` - List documents (pagination, search)
- `GET /api/documents/{id}` - Get document
- `DELETE /api/documents/{id}` - Delete document

### Nodes
- `GET /api/documents/{id}/nodes` - Get full node tree
- `GET /api/documents/{id}/leaf-nodes` - Get leaf nodes
- `POST /api/documents/{id}/nodes` - Create node
- `PATCH /api/documents/{id}/nodes/{node_id}` - Update node

### Versions
- `GET /api/documents/{id}/versions` - Get version history

### Incremental Updates
- `POST /api/documents/{id}/incremental-update` - Apply incremental update

### Health
- `GET /api/health` - Health check

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 24+
- Docker & Docker Compose (optional)

### Local Development

1. **Backend**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
# Edit .env with your settings
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

2. **Frontend**
```bash
cd frontend
npm install
npm run dev
```

3. **Access**
- Frontend: http://localhost:5173
- Backend API: http://127.0.0.1:8000
- API Docs: http://127.0.0.1:8000/docs

### Docker Compose

```bash
cp .env.example .env
# Edit .env with your settings
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://127.0.0.1:8000
- Keycloak: http://localhost:8080 (admin/admin)

## AI/ML Evaluation

### Incremental Indexing Performance

The core AI/ML workflow is incremental document indexing using content hashing:

**Baseline (Full Rebuild):**
- Rebuild entire tree for any document change
- O(N) LLM calls where N = total nodes

**Incremental Approach:**
- Compute SHA-256 hash for each node's content
- Compare hashes between versions
- Only rebuild nodes with changed hashes
- Propagate summary updates up the tree
- O(M) LLM calls where M = changed nodes (M << N)

**Reproducible Command:**
```bash
cd backend
PYTHONPATH=. python -m pytest tests/test_document_service.py::TestIncrementalIndexService -v
```

**Measured Results:**
- 15/15 backend tests passing
- Change detection correctly identifies modified nodes
- Version history tracks incremental updates
- Leaf node extraction works with hierarchical structures

**Failure Cases:**
- Hash collisions (theoretically possible with SHA-256, practically negligible)
- Concurrent modifications not handled (optimistic locking needed)
- Large tree depth may cause recursion limits (iterative traversal recommended)

### LLM Integration (Future)

The architecture supports LLM providers for:
- Node summary generation
- Content extraction from leaf nodes
- Reasoning-based retrieval

Supported providers: OpenAI-compatible, Anthropic, Gemini, Ollama

## Security

- **Authentication**: OIDC authorization code flow with PKCE via Keycloak
- **Authorization**: Role-based access control (viewer, operator, admin)
- **Tokens**: HttpOnly SameSite cookies with CSRF protection
- **Secrets**: Environment variables only, never committed
- **CORS**: Configurable origins
- **Database**: SQLite with parameterized queries

### Security Limitations
- SQLite not suitable for high-concurrency production
- No rate limiting implemented
- No request validation beyond Pydantic models
- Demo credentials in Keycloak realm export
- TLS termination expected at reverse proxy

## Provider Configuration

| Provider | Environment Variables |
|----------|----------------------|
| OpenAI-compatible | LLM_API_KEY, LLM_BASE_URL, LLM_MODEL |
| Anthropic | LLM_API_KEY, LLM_MODEL |
| Gemini | LLM_API_KEY, LLM_MODEL |
| Ollama | LLM_BASE_URL, LLM_MODEL |

## SSO/SAML Setup

Keycloak supports SAML identity providers through identity brokering:

1. Configure SAML IdP in Keycloak Admin Console
2. Add identity provider to orbit-workbench realm
3. Map SAML attributes to Keycloak user attributes
4. Configure role mappings for viewer/operator/admin roles

## Backup & Restore

```bash
# Backup
docker compose exec backend sqlite3 data/orbit.db .dump > backup.sql

# Restore
docker compose exec -i backend sqlite3 data/orbit.db < backup.sql
```

## TLS Reverse Proxy

For production, deploy behind a TLS-terminating reverse proxy (nginx, Traefik, Caddy):

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://frontend:80;
    }
    
    location /api {
        proxy_pass http://backend:8000;
    }
}
```

## Development

### Running Tests

```bash
# Backend
cd backend
PYTHONPATH=. .venv/bin/python -m pytest tests/ -v

# Frontend
cd frontend
npm test
```

### Building

```bash
# Frontend
cd frontend
npm run build
```

### Project Structure

```
orbit-workbench-144-alan-vo/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Config, database
│   │   ├── models/       # SQLAlchemy models
│   │   └── services/     # Business logic
│   ├── tests/            # Pytest tests
│   ├── requirements.txt
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   ├── api/          # API client
│   │   └── types/        # TypeScript types
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── keycloak/
│   └── realm-export.json
├── compose.yaml
├── .env.example
├── .gitignore
└── README.md
```

## License

MIT Copyright Alan Vo <alanvo@gmail.com>

## Changelog

### 1.0.0 (2026-10-23)
- Initial release
- Document CRUD with hierarchical nodes
- Incremental indexing with content hashing
- Version history tracking
- React frontend with tree view
- Keycloak OIDC integration
- Comprehensive test suite
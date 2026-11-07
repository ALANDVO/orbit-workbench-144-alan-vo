# Product development plan

Each round completes one feature or repair. Future items are planned, not implemented claims.

## Current round

diff-detection-endpoint

## Roadmap

### diff-detection-endpoint — Add detect-changes API endpoint and UI

Status: done

Acceptance:
- Backend API endpoint `/documents/{doc_id}/detect-changes` returns changed/new/unchanged nodes
- Frontend Diff tab allows pasting JSON node data and displays diff results
- All backend tests pass (15/15)
- All frontend tests pass (14/14)

Implementation: `backend/app/api/documents.py`, `backend/app/services/document_service.py`, `frontend/src/types/index.ts`, `frontend/src/api/client.ts`, `frontend/src/components/DocumentDetailPage.tsx`

Tests: `backend/tests/test_document_service.py`, `frontend/src/components/DocumentDetailPage.test.tsx`

### continue-implementation — Continue implementation and resolve known failures

Status: planned

Acceptance:
- Run checks, fix failures, and implement the next planned feature

---

Alan Vo · [alanvo.net](https://alanvo.net) · [X: @alanvoasi](https://x.com/alanvoasi)

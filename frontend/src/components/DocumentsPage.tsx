import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDocuments } from '../hooks/useApi';
import type { Document } from '../types';

function DocumentRow({ document, onDelete }: { document: Document; onDelete: (id: number) => void }) {
  return (
    <tr>
      <td>
        <Link to={`/documents/${document.id}`} style={{ fontWeight: 500 }}>
          {document.filename}
        </Link>
      </td>
      <td>{document.page_count}</td>
      <td>
        <span className="badge badge-primary">{document.content_hash.slice(0, 12)}...</span>
      </td>
      <td>{new Date(document.created_at).toLocaleDateString()}</td>
      <td>{new Date(document.updated_at).toLocaleDateString()}</td>
      <td>
        <button
          className="btn btn-danger"
          onClick={() => onDelete(document.id)}
          aria-label={`Delete ${document.filename}`}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

export function DocumentsPage() {
  const {
    documents,
    total,
    skip,
    limit,
    search,
    loading,
    error,
    setSkip,
    setSearch,
    createDocument,
    deleteDocument,
    refresh,
  } = useDocuments();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFilename, setNewFilename] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPageCount, setNewPageCount] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await createDocument({
        filename: newFilename,
        content: newContent,
        page_count: newPageCount,
      });
      setShowCreateModal(false);
      setNewFilename('');
      setNewContent('');
      setNewPageCount(0);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(id);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner" data-testid="loading-spinner" /></div>;
  }

  if (error) {
    return (
      <div className="error-state">
        <h3>Error loading documents</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={refresh}>Retry</button>
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(skip / limit) + 1;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Documents</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          New Document
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          className="input"
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search documents"
        />
      </div>

      <div className="card">
        {documents.length === 0 ? (
          <div className="empty-state">
            <h3>No documents found</h3>
            <p>Create your first document to get started.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Pages</th>
                    <th>Hash</th>
                    <th>Created</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <DocumentRow key={doc.id} document={doc} onDelete={handleDelete} />
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setSkip(0)}
                  disabled={currentPage === 1}
                  aria-label="First page"
                >
                  ««
                </button>
                <button
                  onClick={() => setSkip(Math.max(0, skip - limit))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  «
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setSkip(skip + limit)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  »
                </button>
                <button
                  onClick={() => setSkip((totalPages - 1) * limit)}
                  disabled={currentPage === totalPages}
                  aria-label="Last page"
                >
                  »»
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create Document</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)} aria-label="Close">
                ×
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="label" htmlFor="filename">Filename *</label>
                <input
                  id="filename"
                  type="text"
                  className="input"
                  value={newFilename}
                  onChange={(e) => setNewFilename(e.target.value)}
                  required
                  placeholder="document.pdf"
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="content">Content *</label>
                <textarea
                  id="content"
                  className="input"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  required
                  rows={6}
                  placeholder="Document content..."
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="page_count">Page Count</label>
                <input
                  id="page_count"
                  type="number"
                  className="input"
                  value={newPageCount}
                  onChange={(e) => setNewPageCount(Number(e.target.value) || 0)}
                  min="0"
                />
              </div>
              {createError && <div className="error-state" style={{ marginBottom: 16 }}>{createError}</div>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDocument, useDocumentNodes, useDocumentLeafNodes, useDocumentVersions } from '../hooks/useApi';
import type { Node } from '../api/client';

function TreeNode({ node, onUpdate }: { node: Node; onUpdate: (id: number, summary: string) => void }) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(node.summary || '');

  const handleSave = () => {
    onUpdate(node.id, editContent);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditContent(node.summary || '');
    setEditing(false);
  };

  return (
    <div className="tree-node">
      <div className="tree-node-header">
        {node.children && node.children.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}
        <span className="tree-node-title">{node.structure} {node.title}</span>
        <span className="badge badge-primary">{node.content_hash.slice(0, 8)}</span>
        <button
          className="btn btn-secondary"
          style={{ padding: '4px 8px', fontSize: '12px', marginLeft: 'auto' }}
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
      </div>

      {editing ? (
        <div style={{ marginTop: 8 }}>
          <textarea
            className="input"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            style={{ fontFamily: 'monospace', fontSize: '13px' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={handleSave}>Save</button>
            <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      ) : node.summary && (
        <div className="tree-node-summary">{node.summary}</div>
      )}

      {expanded && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const docId = Number(id);

  const { document, loading: docLoading, error: docError } = useDocument(docId);
  const { nodes, loading: nodesLoading, updateNode } = useDocumentNodes(docId);
  const { nodes: leafNodes, loading: leafLoading } = useDocumentLeafNodes(docId);
  const { versions, loading: versionsLoading } = useDocumentVersions(docId);

  const [activeTab, setActiveTab] = useState<'tree' | 'leaves' | 'versions'>('tree');

  if (docLoading || nodesLoading || leafLoading || versionsLoading) {
    return <div className="loading"><div className="spinner" data-testid="loading-spinner" /></div>;
  }

  if (docError) {
    return (
      <div className="error-state">
        <h3>Error loading document</h3>
        <p>{docError}</p>
        <Link to="/" className="btn btn-primary">Back to Documents</Link>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="error-state">
        <h3>Document not found</h3>
        <Link to="/" className="btn btn-primary">Back to Documents</Link>
      </div>
    );
  }

  const rootNodes = nodes.filter((n) => n.parent_id === null);

  const handleUpdateNode = (nodeId: number, summary: string) => {
    updateNode(nodeId, { summary });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/" className="btn btn-secondary" style={{ marginRight: 16 }}>
            ← Back
          </Link>
          <h1 className="page-title" style={{ display: 'inline' }}>{document.filename}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge badge-primary">{document.page_count} pages</span>
          <span className="badge badge-secondary">{document.content_hash.slice(0, 12)}...</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            className={`btn ${activeTab === 'tree' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('tree')}
          >
            Tree View
          </button>
          <button
            className={`btn ${activeTab === 'leaves' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('leaves')}
          >
            Leaf Nodes ({leafNodes.length})
          </button>
          <button
            className={`btn ${activeTab === 'versions' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('versions')}
          >
            Versions ({versions.length})
          </button>
        </div>

        {activeTab === 'tree' && (
          <div>
            {rootNodes.length === 0 ? (
              <div className="empty-state">
                <h3>No nodes in this document</h3>
                <p>Add nodes to build the document structure.</p>
              </div>
            ) : (
              rootNodes.map((node) => <TreeNode key={node.id} node={node} onUpdate={handleUpdateNode} />)
            )}
          </div>
        )}

        {activeTab === 'leaves' && (
          <div>
            {leafNodes.length === 0 ? (
              <div className="empty-state">
                <h3>No leaf nodes</h3>
                <p>Leaf nodes will appear here when you add child nodes.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Structure</th>
                      <th>Title</th>
                      <th>Pages</th>
                      <th>Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leafNodes.map((node) => (
                      <tr key={node.id}>
                        <td>{node.structure}</td>
                        <td>{node.title}</td>
                        <td>{node.start_page} - {node.end_page}</td>
                        <td>
                          <span className="badge badge-primary">{node.content_hash.slice(0, 12)}...</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'versions' && (
          <div>
            {versions.length === 0 ? (
              <div className="empty-state">
                <h3>No versions</h3>
                <p>Versions will appear after incremental updates.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Change Summary</th>
                      <th>Changed Nodes</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((version) => (
                      <tr key={version.id}>
                        <td>v{version.version_number}</td>
                        <td>{version.change_summary || '-'}</td>
                        <td>
                          {version.changed_nodes && version.changed_nodes.length > 0 ? (
                            <span className="badge badge-warning">{version.changed_nodes.length} nodes</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>{new Date(version.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
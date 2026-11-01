import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDocument, useDocumentNodes, useDocumentLeafNodes, useDocumentVersions } from '../hooks/useApi';
import { api } from '../api/client';
import type { Node, DetectChangesRequest, DetectChangesResponse, NodeChangeInfo } from '../api/client';

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
        <button
          className="expand-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '▼' : '▶'}
        </button>
        <span className="tree-node-structure">{node.structure}</span>
        <span className="tree-node-title">{node.title}</span>
        {node.summary && <span className="tree-node-summary">{node.summary.slice(0, 80)}{node.summary.length > 80 ? '...' : ''}</span>}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setEditing(true);
            setEditContent(node.summary || '');
          }}
          style={{ marginLeft: 'auto' }}
        >
          Edit
        </button>
      </div>
      {editing && (
        <div className="tree-node-edit">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Enter summary"
            style={{ width: '100%', minHeight: 60, marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSave}>Save</button>
            <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      )}
      {expanded && node.children && node.children.length > 0 && (
        <div className="tree-node-children">
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

  const [activeTab, setActiveTab] = useState<'tree' | 'leaves' | 'versions' | 'diff'>('tree');
  const [diffInput, setDiffInput] = useState('');
  const [diffResult, setDiffResult] = useState<DetectChangesResponse | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  if (docLoading || nodesLoading || leafLoading || versionsLoading) {
    return <div className="loading"><div className="spinner" data-testid="loading-spinner" /></div>;
  }

  if (docError) {
    return (
      <div className="error-state">
        <h2>Error loading document</h2>
        <p>{docError}</p>
        <Link to="/" className="btn btn-primary">Back to Documents</Link>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="error-state">
        <h2>Document not found</h2>
        <Link to="/" className="btn btn-primary">Back to Documents</Link>
      </div>
    );
  }

  const rootNodes = nodes.filter((n) => n.parent_id === null);

  const handleUpdateNode = (nodeId: number, summary: string) => {
    updateNode(nodeId, { summary });
  };

  const handleDetectChanges = async () => {
    setDiffLoading(true);
    setDiffError(null);
    try {
      const nodesData = JSON.parse(diffInput);
      const result = await api.documents.detectChanges(docId, { nodes: nodesData });
      setDiffResult(result);
    } catch (err) {
      setDiffError(err instanceof Error ? err.message : 'Invalid JSON');
    } finally {
      setDiffLoading(false);
    }
  };

  const handleClearDiff = () => {
    setDiffInput('');
    setDiffResult(null);
    setDiffError(null);
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
          <button
            className={`btn ${activeTab === 'diff' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('diff')}
          >
            Diff
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

        {activeTab === 'diff' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h3>Detect Changes</h3>
              <p style={{ color: '#6b7280', marginBottom: 12 }}>
                Paste JSON array of new node data to detect changes. Each node should have:
                <code>structure</code>, <code>title</code>, <code>summary</code> (optional),
                <code>parent_id</code> (optional), <code>start_page</code> (optional),
                <code>end_page</code> (optional), <code>metadata</code> (optional).
              </p>
              <textarea
                value={diffInput}
                onChange={(e) => setDiffInput(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 150,
                  padding: 12,
                  fontFamily: 'monospace',
                  fontSize: 14,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  marginBottom: 12,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleDetectChanges}
                  disabled={diffLoading}
                >
                  {diffLoading ? 'Computing...' : 'Detect Changes'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleClearDiff}
                >
                  Clear
                </button>
              </div>
              {diffError && <div className="error-message" style={{ marginTop: 12, color: '#dc2626' }}>{diffError}</div>}
            </div>

            {diffResult && (
              <div>
                {diffResult.changed.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h4>Changed Nodes ({diffResult.changed.length})</h4>
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Structure</th>
                            <th>Node ID</th>
                            <th>Old Hash</th>
                            <th>New Hash</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diffResult.changed.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.structure}</td>
                              <td>{item.node_id || '-'}</td>
                              <td>
                                <span className="badge badge-danger">{item.old_hash?.slice(0, 12)}...</span>
                              </td>
                              <td>
                                <span className="badge badge-success">{item.new_hash.slice(0, 12)}...</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {diffResult.new.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h4>New Nodes ({diffResult.new.length})</h4>
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Structure</th>
                            <th>Hash</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diffResult.new.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.structure}</td>
                              <td>
                                <span className="badge badge-primary">{item.new_hash.slice(0, 12)}...</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {diffResult.unchanged.length > 0 && (
                  <div>
                    <h4>Unchanged Nodes ({diffResult.unchanged.length})</h4>
                    <p style={{ color: '#6b7280' }}>
                      Node IDs: {diffResult.unchanged.join(', ')}
                    </p>
                  </div>
                )}

                {diffResult.changed.length === 0 && diffResult.new.length === 0 && diffResult.unchanged.length === 0 && (
                  <div className="empty-state">
                    <h3>No changes detected</h3>
                    <p>The provided nodes match the current document structure exactly.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

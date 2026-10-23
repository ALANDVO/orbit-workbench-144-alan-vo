import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { Document, Node, Version } from '../api/client';

export function useDocuments(initialSkip = 0, initialLimit = 20, initialSearch = '') {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(initialSkip);
  const [limit, setLimit] = useState(initialLimit);
  const [search, setSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.documents.list({ skip, limit, search });
      setDocuments(response.documents);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, [skip, limit, search]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const createDocument = async (data: { filename: string; content: string; page_count?: number; metadata?: Record<string, unknown> }) => {
    const doc = await api.documents.create(data);
    fetchDocuments();
    return doc;
  };

  const deleteDocument = async (id: number) => {
    await api.documents.delete(id);
    fetchDocuments();
  };

  return {
    documents,
    total,
    skip,
    limit,
    search,
    loading,
    error,
    setSkip,
    setLimit,
    setSearch,
    createDocument,
    deleteDocument,
    refresh: fetchDocuments,
  };
}

export function useDocument(id: number | null) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const doc = await api.documents.get(id);
        setDocument(doc);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch document');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  return { document, loading, error };
}

export function useDocumentNodes(docId: number | null) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) return;
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.documents.getNodes(docId);
        setNodes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch nodes');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [docId]);

  const createNode = async (data: {
    structure: string;
    title: string;
    summary?: string;
    parent_id?: number | null;
    start_page?: number;
    end_page?: number;
    metadata?: Record<string, unknown>;
  }) => {
    if (!docId) return;
    const node = await api.documents.createNode(docId, data);
    setNodes((prev) => [...prev, node]);
    return node;
  };

  const updateNode = async (nodeId: number, data: {
    summary?: string;
    title?: string;
    start_page?: number;
    end_page?: number;
    metadata?: Record<string, unknown>;
  }) => {
    if (!docId) return;
    const updated = await api.documents.updateNode(docId, nodeId, data);
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? updated : n)));
    return updated;
  };

  return { nodes, loading, error, createNode, updateNode };
}

export function useDocumentLeafNodes(docId: number | null) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) return;
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.documents.getLeafNodes(docId);
        setNodes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch leaf nodes');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [docId]);

  return { nodes, loading, error };
}

export function useDocumentVersions(docId: number | null) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) return;
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.documents.getVersions(docId);
        setVersions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch versions');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [docId]);

  return { versions, loading, error };
}

export function useHealth() {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const response = await api.health();
        setHealthy(response.status === 'healthy');
        setVersion(response.version);
      } catch {
        setHealthy(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  return { healthy, version, loading };
}
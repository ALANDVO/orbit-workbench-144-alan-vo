export type {
  Document,
  DocumentListResponse,
  Node,
  Version,
  IncrementalUpdateRequest,
  IncrementalUpdateResponse,
  HealthResponse,
} from '../types';

 import type {
   Document,
   DocumentListResponse,
   Node,
   Version,
   IncrementalUpdateRequest,
   IncrementalUpdateResponse,
   HealthResponse,
 } from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  health: () => fetchJson<HealthResponse>(`${API_BASE}/health`),

  documents: {
    list: (params?: { skip?: number; limit?: number; search?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.skip) searchParams.set('skip', String(params.skip));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.search) searchParams.set('search', params.search);
      return fetchJson<DocumentListResponse>(`${API_BASE}/documents?${searchParams}`);
    },

    create: (data: { filename: string; content: string; page_count?: number; metadata?: Record<string, unknown> }) =>
      fetchJson<Document>(`${API_BASE}/documents`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    get: (id: number) => fetchJson<Document>(`${API_BASE}/documents/${id}`),

    delete: (id: number) => fetchJson<void>(`${API_BASE}/documents/${id}`, { method: 'DELETE' }),

    getNodes: (id: number) => fetchJson<Node[]>(`${API_BASE}/documents/${id}/nodes`),

    getLeafNodes: (id: number) => fetchJson<Node[]>(`${API_BASE}/documents/${id}/leaf-nodes`),

    getVersions: (id: number) => fetchJson<Version[]>(`${API_BASE}/documents/${id}/versions`),

    createNode: (docId: number, data: {
      structure: string;
      title: string;
      summary?: string;
      parent_id?: number | null;
      start_page?: number;
      end_page?: number;
      metadata?: Record<string, unknown>;
    }) => fetchJson<Node>(`${API_BASE}/documents/${docId}/nodes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    updateNode: (docId: number, nodeId: number, data: {
      summary?: string;
      title?: string;
      start_page?: number;
      end_page?: number;
      metadata?: Record<string, unknown>;
    }) => fetchJson<Node>(`${API_BASE}/documents/${docId}/nodes/${nodeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

    incrementalUpdate: (docId: number, data: IncrementalUpdateRequest) =>
      fetchJson<IncrementalUpdateResponse>(`${API_BASE}/documents/${docId}/incremental-update`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
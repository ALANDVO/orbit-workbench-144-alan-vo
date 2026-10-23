import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDocuments, useDocument, useHealth } from '../hooks/useApi';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: {
    health: vi.fn(),
    documents: {
      list: vi.fn(),
      create: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      getNodes: vi.fn(),
      getLeafNodes: vi.fn(),
      getVersions: vi.fn(),
      createNode: vi.fn(),
      updateNode: vi.fn(),
      incrementalUpdate: vi.fn(),
    },
  },
}));

const mockApi = api as {
  health: ReturnType<typeof vi.fn>;
  documents: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    getNodes: ReturnType<typeof vi.fn>;
    getLeafNodes: ReturnType<typeof vi.fn>;
    getVersions: ReturnType<typeof vi.fn>;
    createNode: ReturnType<typeof vi.fn>;
    updateNode: ReturnType<typeof vi.fn>;
    incrementalUpdate: ReturnType<typeof vi.fn>;
  };
};

describe('useApi hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useDocuments', () => {
    it('fetches documents on mount', async () => {
      mockApi.documents.list.mockResolvedValue({
        documents: [
          { id: 1, filename: 'test.pdf', content_hash: 'abc', page_count: 10, metadata: null, created_at: '', updated_at: '' },
        ],
        total: 1,
        skip: 0,
        limit: 20,
      });

      const { result } = renderHook(() => useDocuments());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.documents).toHaveLength(1);
      expect(result.current.total).toBe(1);
      expect(mockApi.documents.list).toHaveBeenCalledWith({ skip: 0, limit: 20, search: '' });
    });

    it('handles error', async () => {
      mockApi.documents.list.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useDocuments());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('useDocument', () => {
    it('fetches document by id', async () => {
      mockApi.documents.get.mockResolvedValue({
        id: 1, filename: 'test.pdf', content_hash: 'abc', page_count: 10, metadata: null, created_at: '', updated_at: '',
      });

      const { result } = renderHook(() => useDocument(1));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.document).toEqual({
        id: 1, filename: 'test.pdf', content_hash: 'abc', page_count: 10, metadata: null, created_at: '', updated_at: '',
      });
      expect(mockApi.documents.get).toHaveBeenCalledWith(1);
    });

    it('returns null when id is null', async () => {
      const { result } = renderHook(() => useDocument(null));

      expect(result.current.document).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  describe('useHealth', () => {
    it('checks health on mount', async () => {
      mockApi.health.mockResolvedValue({ status: 'healthy', version: '1.0.0' });

      const { result } = renderHook(() => useHealth());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.healthy).toBe(true);
      expect(result.current.version).toBe('1.0.0');
    });

    it('handles health check failure', async () => {
      mockApi.health.mockRejectedValue(new Error('Down'));

      const { result } = renderHook(() => useHealth());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.healthy).toBe(false);
    });
  });
});
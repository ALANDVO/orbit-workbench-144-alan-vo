import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DocumentDetailPage } from './DocumentDetailPage';
import { useDocument, useDocumentNodes, useDocumentLeafNodes, useDocumentVersions } from '../hooks/useApi';

vi.mock('../hooks/useApi', () => ({
  useDocument: vi.fn(),
  useDocumentNodes: vi.fn(),
  useDocumentLeafNodes: vi.fn(),
  useDocumentVersions: vi.fn(),
}));

const mockUseDocument = useDocument as ReturnType<typeof vi.fn>;
const mockUseDocumentNodes = useDocumentNodes as ReturnType<typeof vi.fn>;
const mockUseDocumentLeafNodes = useDocumentLeafNodes as ReturnType<typeof vi.fn>;
const mockUseDocumentVersions = useDocumentVersions as ReturnType<typeof vi.fn>;

describe('DocumentDetailPage', () => {
  beforeEach(() => {
    mockUseDocument.mockReset();
    mockUseDocumentNodes.mockReset();
    mockUseDocumentLeafNodes.mockReset();
    mockUseDocumentVersions.mockReset();
  });

  it('renders loading state', () => {
    mockUseDocument.mockReturnValue({ document: null, loading: true, error: null });
    mockUseDocumentNodes.mockReturnValue({ nodes: [], loading: true, updateNode: vi.fn() });
    mockUseDocumentLeafNodes.mockReturnValue({ nodes: [], loading: true });
    mockUseDocumentVersions.mockReturnValue({ versions: [], loading: true });

    render(
      <BrowserRouter>
        <DocumentDetailPage />
      </BrowserRouter>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseDocument.mockReturnValue({ document: null, loading: false, error: 'Not found' });
    mockUseDocumentNodes.mockReturnValue({ nodes: [], loading: false, updateNode: vi.fn() });
    mockUseDocumentLeafNodes.mockReturnValue({ nodes: [], loading: false });
    mockUseDocumentVersions.mockReturnValue({ versions: [], loading: false });

    render(
      <BrowserRouter>
        <DocumentDetailPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Error loading document')).toBeInTheDocument();
    expect(screen.getByText('Not found')).toBeInTheDocument();
  });

  it('renders document not found', () => {
    mockUseDocument.mockReturnValue({ document: null, loading: false, error: null });
    mockUseDocumentNodes.mockReturnValue({ nodes: [], loading: false, updateNode: vi.fn() });
    mockUseDocumentLeafNodes.mockReturnValue({ nodes: [], loading: false });
    mockUseDocumentVersions.mockReturnValue({ versions: [], loading: false });

    render(
      <BrowserRouter>
        <DocumentDetailPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Document not found')).toBeInTheDocument();
  });

  it('renders document details', () => {
    mockUseDocument.mockReturnValue({
      document: { id: 1, filename: 'test.pdf', content_hash: 'abc123', page_count: 10, metadata: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      loading: false,
      error: null,
    });
    mockUseDocumentNodes.mockReturnValue({
      nodes: [{ id: 1, document_id: 1, parent_id: null, structure: '1', title: 'Chapter 1', summary: 'Content', content_hash: 'hash1', start_page: 1, end_page: 5, metadata: null, created_at: '', updated_at: '' }],
      loading: false,
      updateNode: vi.fn(),
    });
    mockUseDocumentLeafNodes.mockReturnValue({
      nodes: [{ id: 1, document_id: 1, parent_id: null, structure: '1', title: 'Chapter 1', summary: 'Content', content_hash: 'hash1', start_page: 1, end_page: 5, metadata: null, created_at: '', updated_at: '' }],
      loading: false,
    });
    mockUseDocumentVersions.mockReturnValue({
      versions: [],
      loading: false,
    });

    render(
      <BrowserRouter>
        <DocumentDetailPage />
      </BrowserRouter>
    );

    expect(screen.getByText('test.pdf')).toBeInTheDocument();
    expect(screen.getByText(/Chapter 1/)).toBeInTheDocument();
  });
});
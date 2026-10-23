import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DocumentsPage } from './DocumentsPage';
import { useDocuments } from '../hooks/useApi';

vi.mock('../hooks/useApi', () => ({
  useDocuments: vi.fn(),
}));

const mockUseDocuments = useDocuments as ReturnType<typeof vi.fn>;

describe('DocumentsPage', () => {
  beforeEach(() => {
    mockUseDocuments.mockReset();
  });

  it('renders loading state', () => {
    mockUseDocuments.mockReturnValue({
      documents: [],
      total: 0,
      skip: 0,
      limit: 20,
      search: '',
      loading: true,
      error: null,
      setSkip: vi.fn(),
      setLimit: vi.fn(),
      setSearch: vi.fn(),
      createDocument: vi.fn(),
      deleteDocument: vi.fn(),
      refresh: vi.fn(),
    });

    render(
      <BrowserRouter>
        <DocumentsPage />
      </BrowserRouter>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders empty state when no documents', () => {
    mockUseDocuments.mockReturnValue({
      documents: [],
      total: 0,
      skip: 0,
      limit: 20,
      search: '',
      loading: false,
      error: null,
      setSkip: vi.fn(),
      setLimit: vi.fn(),
      setSearch: vi.fn(),
      createDocument: vi.fn(),
      deleteDocument: vi.fn(),
      refresh: vi.fn(),
    });

    render(
      <BrowserRouter>
        <DocumentsPage />
      </BrowserRouter>
    );

    expect(screen.getByText('No documents found')).toBeInTheDocument();
    expect(screen.getByText('Create your first document to get started.')).toBeInTheDocument();
  });

  it('renders document list', () => {
    mockUseDocuments.mockReturnValue({
      documents: [
        { id: 1, filename: 'test.pdf', content_hash: 'abc123', page_count: 10, metadata: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
        { id: 2, filename: 'doc.pdf', content_hash: 'def456', page_count: 5, metadata: null, created_at: '2024-01-02T00:00:00Z', updated_at: '2024-01-02T00:00:00Z' },
      ],
      total: 2,
      skip: 0,
      limit: 20,
      search: '',
      loading: false,
      error: null,
      setSkip: vi.fn(),
      setLimit: vi.fn(),
      setSearch: vi.fn(),
      createDocument: vi.fn(),
      deleteDocument: vi.fn(),
      refresh: vi.fn(),
    });

    render(
      <BrowserRouter>
        <DocumentsPage />
      </BrowserRouter>
    );

    expect(screen.getByText('test.pdf')).toBeInTheDocument();
    expect(screen.getByText('doc.pdf')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseDocuments.mockReturnValue({
      documents: [],
      total: 0,
      skip: 0,
      limit: 20,
      search: '',
      loading: false,
      error: 'Failed to fetch',
      setSkip: vi.fn(),
      setLimit: vi.fn(),
      setSearch: vi.fn(),
      createDocument: vi.fn(),
      deleteDocument: vi.fn(),
      refresh: vi.fn(),
    });

    render(
      <BrowserRouter>
        <DocumentsPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Error loading documents')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
  });
});
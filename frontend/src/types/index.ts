export interface Document {
  id: number;
  filename: string;
  content_hash: string;
  page_count: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
  skip: number;
  limit: number;
}

export interface Node {
  id: number;
  document_id: number;
  parent_id: number | null;
  structure: string;
  title: string;
  summary: string | null;
  content_hash: string;
  start_page: number;
  end_page: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  children?: Node[];
}

export interface Version {
  id: number;
  document_id: number;
  version_number: number;
  content_hash: string;
  change_summary: string | null;
  changed_nodes: number[] | null;
  created_at: string;
}

export interface IncrementalUpdateRequest {
  changed_nodes: Record<string, unknown>[];
  new_nodes: Record<string, unknown>[];
}

export interface IncrementalUpdateResponse {
  updated: number;
  created: number;
  version: number;
}

export interface HealthResponse {
  status: string;
  version: string;
}
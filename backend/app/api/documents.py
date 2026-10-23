from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.document_service import DocumentService, IncrementalIndexService
from app.models import Document, DocumentNode, DocumentVersion
from pydantic import BaseModel, Field
import json


router = APIRouter(prefix="/documents", tags=["documents"])


class DocumentCreate(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    page_count: int = Field(default=0, ge=0)
    metadata: Optional[dict] = None


class DocumentResponse(BaseModel):
    id: int
    filename: str
    content_hash: str
    page_count: int
    metadata: Optional[dict]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
    skip: int
    limit: int


class NodeCreate(BaseModel):
    structure: str = Field(..., min_length=1, max_length=50)
    title: str = Field(..., min_length=1, max_length=500)
    summary: str = Field(default="")
    parent_id: Optional[int] = None
    start_page: int = Field(default=0, ge=0)
    end_page: int = Field(default=0, ge=0)
    metadata: Optional[dict] = None


class NodeResponse(BaseModel):
    id: int
    document_id: int
    parent_id: Optional[int]
    structure: str
    title: str
    summary: Optional[str]
    content_hash: str
    start_page: int
    end_page: int
    metadata: Optional[dict]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class NodeUpdate(BaseModel):
    summary: Optional[str] = None
    title: Optional[str] = None
    start_page: Optional[int] = None
    end_page: Optional[int] = None
    metadata: Optional[dict] = None


class VersionResponse(BaseModel):
    id: int
    document_id: int
    version_number: int
    content_hash: str
    change_summary: Optional[str]
    changed_nodes: Optional[list[int]]
    created_at: str

    class Config:
        from_attributes = True


class IncrementalUpdateRequest(BaseModel):
    changed_nodes: list[dict] = Field(default_factory=list)
    new_nodes: list[dict] = Field(default_factory=list)


class IncrementalUpdateResponse(BaseModel):
    updated: int
    created: int
    version: int


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    doc_in: DocumentCreate,
    db: AsyncSession = Depends(get_db),
):
    service = DocumentService(db)
    try:
        doc = await service.create_document(
            filename=doc_in.filename,
            content=doc_in.content.encode(),
            page_count=doc_in.page_count,
            metadata=doc_in.metadata,
        )
        await service.log_audit("create", "document", str(doc.id), details={"filename": doc.filename})
        return DocumentResponse(
            id=doc.id,
            filename=doc.filename,
            content_hash=doc.content_hash,
            page_count=doc.page_count,
            metadata=json.loads(doc.doc_metadata) if doc.doc_metadata else None,
            created_at=doc.created_at.isoformat(),
            updated_at=doc.updated_at.isoformat(),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    service = DocumentService(db)
    documents, total = await service.list_documents(skip=skip, limit=limit, search=search)
    return DocumentListResponse(
        documents=[
            DocumentResponse(
                id=d.id,
                filename=d.filename,
                content_hash=d.content_hash,
                page_count=d.page_count,
                metadata=json.loads(d.doc_metadata) if d.doc_metadata else None,
                created_at=d.created_at.isoformat(),
                updated_at=d.updated_at.isoformat(),
            )
            for d in documents
        ],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: int, db: AsyncSession = Depends(get_db)):
    service = DocumentService(db)
    doc = await service.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        content_hash=doc.content_hash,
        page_count=doc.page_count,
        metadata=json.loads(doc.doc_metadata) if doc.doc_metadata else None,
        created_at=doc.created_at.isoformat(),
        updated_at=doc.updated_at.isoformat(),
    )


@router.get("/{doc_id}/nodes", response_model=list[NodeResponse])
async def get_document_nodes(doc_id: int, db: AsyncSession = Depends(get_db)):
    service = DocumentService(db)
    doc = await service.get_document_with_nodes(doc_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    def serialize_node(node: DocumentNode) -> NodeResponse:
        return NodeResponse(
            id=node.id,
            document_id=node.document_id,
            parent_id=node.parent_id,
            structure=node.structure,
            title=node.title,
            summary=node.summary,
            content_hash=node.content_hash,
            start_page=node.start_page,
            end_page=node.end_page,
            metadata=json.loads(node.node_metadata) if node.node_metadata else None,
            created_at=node.created_at.isoformat(),
            updated_at=node.updated_at.isoformat(),
        )

    root_nodes = [n for n in doc.nodes if n.parent_id is None]
    result = []

    def traverse(nodes: list[DocumentNode]):
        for node in nodes:
            result.append(serialize_node(node))
            if node.children:
                traverse(node.children)

    traverse(root_nodes)
    return result


@router.get("/{doc_id}/leaf-nodes", response_model=list[NodeResponse])
async def get_leaf_nodes(doc_id: int, db: AsyncSession = Depends(get_db)):
    service = DocumentService(db)
    doc = await service.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    leaf_nodes = await service.get_leaf_nodes(doc_id)
    return [
        NodeResponse(
            id=n.id,
            document_id=n.document_id,
            parent_id=n.parent_id,
            structure=n.structure,
            title=n.title,
            summary=n.summary,
            content_hash=n.content_hash,
            start_page=n.start_page,
            end_page=n.end_page,
            metadata=json.loads(n.node_metadata) if n.node_metadata else None,
            created_at=n.created_at.isoformat(),
            updated_at=n.updated_at.isoformat(),
        )
        for n in leaf_nodes
    ]


@router.post("/{doc_id}/nodes", response_model=NodeResponse, status_code=status.HTTP_201_CREATED)
async def create_node(
    doc_id: int,
    node_in: NodeCreate,
    db: AsyncSession = Depends(get_db),
):
    service = DocumentService(db)
    doc = await service.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    node = await service.create_node(
        document_id=doc_id,
        structure=node_in.structure,
        title=node_in.title,
        content=node_in.summary,
        parent_id=node_in.parent_id,
        start_page=node_in.start_page,
        end_page=node_in.end_page,
        metadata=node_in.metadata,
    )
    return NodeResponse(
        id=node.id,
        document_id=node.document_id,
        parent_id=node.parent_id,
        structure=node.structure,
        title=node.title,
        summary=node.summary,
        content_hash=node.content_hash,
        start_page=node.start_page,
        end_page=node.end_page,
        metadata=json.loads(node.node_metadata) if node.node_metadata else None,
        created_at=node.created_at.isoformat(),
        updated_at=node.updated_at.isoformat(),
    )


@router.patch("/{doc_id}/nodes/{node_id}", response_model=NodeResponse)
async def update_node(
    doc_id: int,
    node_id: int,
    node_in: NodeUpdate,
    db: AsyncSession = Depends(get_db),
):
    service = DocumentService(db)
    node = await service.get_node(node_id)
    if not node or node.document_id != doc_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

    if node_in.summary is not None:
        node = await service.update_node_content(node_id, node_in.summary)
    if node_in.title is not None:
        node.title = node_in.title
    if node_in.start_page is not None:
        node.start_page = node_in.start_page
    if node_in.end_page is not None:
        node.end_page = node_in.end_page
    if node_in.metadata is not None:
        node.node_metadata = json.dumps(node_in.metadata)

    await db.flush()
    return NodeResponse(
        id=node.id,
        document_id=node.document_id,
        parent_id=node.parent_id,
        structure=node.structure,
        title=node.title,
        summary=node.summary,
        content_hash=node.content_hash,
        start_page=node.start_page,
        end_page=node.end_page,
        metadata=json.loads(node.node_metadata) if node.node_metadata else None,
        created_at=node.created_at.isoformat(),
        updated_at=node.updated_at.isoformat(),
    )


@router.get("/{doc_id}/versions", response_model=list[VersionResponse])
async def get_versions(doc_id: int, db: AsyncSession = Depends(get_db)):
    service = DocumentService(db)
    doc = await service.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    versions = await service.get_versions(doc_id)
    return [
        VersionResponse(
            id=v.id,
            document_id=v.document_id,
            version_number=v.version_number,
            content_hash=v.content_hash,
            change_summary=v.change_summary,
            changed_nodes=json.loads(v.changed_nodes) if v.changed_nodes else None,
            created_at=v.created_at.isoformat(),
        )
        for v in versions
    ]


@router.post("/{doc_id}/incremental-update", response_model=IncrementalUpdateResponse)
async def incremental_update(
    doc_id: int,
    update_in: IncrementalUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    inc_service = IncrementalIndexService(db)
    try:
        result = await inc_service.apply_incremental_update(
            document_id=doc_id,
            changed_nodes=update_in.changed_nodes,
            new_nodes=update_in.new_nodes,
            user_id="system",
        )
        return IncrementalUpdateResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(doc_id: int, db: AsyncSession = Depends(get_db)):
    service = DocumentService(db)
    deleted = await service.delete_document(doc_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    await service.log_audit("delete", "document", str(doc_id))
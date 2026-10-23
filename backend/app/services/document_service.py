from typing import Optional, List
from hashlib import sha256
import json
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Document, DocumentNode, DocumentVersion, AuditLog


class DocumentService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_document(
        self,
        filename: str,
        content: bytes,
        page_count: int = 0,
        metadata: Optional[dict] = None,
    ) -> Document:
        content_hash = sha256(content).hexdigest()

        existing = await self.session.execute(
            select(Document).where(Document.content_hash == content_hash)
        )
        if existing.scalar_one_or_none():
            raise ValueError("Document with this content already exists")

        doc = Document(
            filename=filename,
            content_hash=content_hash,
            page_count=page_count,
            doc_metadata=json.dumps(metadata) if metadata else None,
        )
        self.session.add(doc)
        await self.session.flush()
        return doc

    async def get_document(self, doc_id: int) -> Optional[Document]:
        result = await self.session.execute(
            select(Document)
            .options(selectinload(Document.nodes))
            .where(Document.id == doc_id)
        )
        return result.scalar_one_or_none()

    async def get_document_with_nodes(self, doc_id: int) -> Optional[Document]:
        result = await self.session.execute(
            select(Document)
            .options(selectinload(Document.nodes).selectinload(DocumentNode.children))
            .where(Document.id == doc_id)
        )
        return result.scalar_one_or_none()

    async def list_documents(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
    ) -> tuple[List[Document], int]:
        query = select(Document)
        if search:
            query = query.where(Document.filename.ilike(f"%{search}%"))

        count_query = select(func.count()).select_from(query.subquery())
        total = await self.session.scalar(count_query) or 0

        query = query.order_by(Document.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def delete_document(self, doc_id: int) -> bool:
        doc = await self.get_document(doc_id)
        if not doc:
            return False
        await self.session.delete(doc)
        return True

    async def create_node(
        self,
        document_id: int,
        structure: str,
        title: str,
        content: str,
        parent_id: Optional[int] = None,
        start_page: int = 0,
        end_page: int = 0,
        metadata: Optional[dict] = None,
    ) -> DocumentNode:
        content_hash = sha256(content.encode()).hexdigest()

        node = DocumentNode(
            document_id=document_id,
            parent_id=parent_id,
            structure=structure,
            title=title,
            summary=content,
            content_hash=content_hash,
            start_page=start_page,
            end_page=end_page,
            node_metadata=json.dumps(metadata) if metadata else None,
        )
        self.session.add(node)
        await self.session.flush()
        return node

    async def get_node(self, node_id: int) -> Optional[DocumentNode]:
        result = await self.session.execute(
            select(DocumentNode)
            .options(selectinload(DocumentNode.children))
            .where(DocumentNode.id == node_id)
        )
        return result.scalar_one_or_none()

    async def update_node_content(self, node_id: int, new_content: str) -> Optional[DocumentNode]:
        node = await self.get_node(node_id)
        if not node:
            return None

        new_hash = sha256(new_content.encode()).hexdigest()
        if new_hash == node.content_hash:
            return node

        node.summary = new_content
        node.content_hash = new_hash
        await self.session.flush()
        await self.session.refresh(node)
        return node

    async def get_leaf_nodes(self, document_id: int) -> List[DocumentNode]:
        result = await self.session.execute(
            select(DocumentNode)
            .where(DocumentNode.document_id == document_id)
            .where(~DocumentNode.id.in_(
                select(DocumentNode.parent_id).where(DocumentNode.parent_id.is_not(None))
            ))
        )
        return list(result.scalars().all())

    async def create_version(
        self,
        document_id: int,
        version_number: int,
        content_hash: str,
        change_summary: Optional[str] = None,
        changed_nodes: Optional[List[int]] = None,
    ) -> DocumentVersion:
        version = DocumentVersion(
            document_id=document_id,
            version_number=version_number,
            content_hash=content_hash,
            change_summary=change_summary,
            changed_nodes=json.dumps(changed_nodes) if changed_nodes else None,
        )
        self.session.add(version)
        await self.session.flush()
        return version

    async def get_versions(self, document_id: int) -> List[DocumentVersion]:
        result = await self.session.execute(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == document_id)
            .order_by(DocumentVersion.version_number.desc())
        )
        return list(result.scalars().all())

    async def log_audit(
        self,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        user_id: Optional[str] = None,
        details: Optional[dict] = None,
    ) -> AuditLog:
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=json.dumps(details) if details else None,
        )
        self.session.add(log)
        await self.session.flush()
        return log


class IncrementalIndexService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.doc_service = DocumentService(session)

    def compute_node_hash(self, content: str) -> str:
        return sha256(content.encode()).hexdigest()

    async def detect_changed_nodes(
        self,
        document_id: int,
        new_nodes_data: List[dict],
    ) -> tuple[List[dict], List[int], List[int]]:
        existing_nodes = await self.session.execute(
            select(DocumentNode).where(DocumentNode.document_id == document_id)
        )
        existing_map = {n.structure: n for n in existing_nodes.scalars().all()}

        changed = []
        new = []
        unchanged = []

        for node_data in new_nodes_data:
            struct = node_data.get("structure", "")
            content = node_data.get("summary", "")
            new_hash = self.compute_node_hash(content)

            if struct in existing_map:
                existing = existing_map[struct]
                if existing.content_hash != new_hash:
                    changed.append({**node_data, "node_id": existing.id, "old_hash": existing.content_hash})
                else:
                    unchanged.append(existing.id)
        return changed, [n["node_id"] for n in changed], unchanged

    async def apply_incremental_update(
        self,
        document_id: int,
        changed_nodes: List[dict],
        new_nodes: List[dict],
        user_id: Optional[str] = None,
    ) -> dict:
        doc = await self.doc_service.get_document(document_id)
        if not doc:
            raise ValueError("Document not found")

        versions = await self.doc_service.get_versions(document_id)
        next_version = (versions[0].version_number + 1) if versions else 1

        updated_count = 0
        created_count = 0

        for node_data in changed_nodes:
            node_id = node_data.get("node_id")
            node = await self.doc_service.get_node(node_id)
            if node:
                node.summary = node_data.get("summary", node.summary)
                node.content_hash = node_data.get("content_hash", node.content_hash)
                node.start_page = node_data.get("start_page", node.start_page)
                node.end_page = node_data.get("end_page", node.end_page)
                if "node_metadata" in node_data:
                    node.node_metadata = json.dumps(node_data["node_metadata"])
                updated_count += 1

        for node_data in new_nodes:
            await self.doc_service.create_node(
                document_id=document_id,
                structure=node_data.get("structure", ""),
                title=node_data.get("title", ""),
                content=node_data.get("summary", ""),
                parent_id=node_data.get("parent_id"),
                start_page=node_data.get("start_page", 0),
                end_page=node_data.get("end_page", 0),
                metadata=node_data.get("node_metadata"),
            )
            created_count += 1

        await self.doc_service.create_version(
            document_id=document_id,
            version_number=next_version,
            content_hash=doc.content_hash,
            change_summary=f"Incremental update: {updated_count} modified, {created_count} added",
            changed_nodes=[n.get("node_id") for n in changed_nodes if n.get("node_id")],
        )

        await self.doc_service.log_audit(
            action="incremental_update",
            resource_type="document",
            resource_id=str(document_id),
            user_id=user_id,
            details={"updated": updated_count, "created": created_count, "version": next_version},
        )

        return {
            "updated": updated_count,
            "created": created_count,
            "version": next_version,
        }
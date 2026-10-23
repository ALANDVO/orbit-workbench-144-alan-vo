import pytest

from app.models import Document, DocumentNode
from app.services.document_service import DocumentService, IncrementalIndexService


class TestDocumentService:
    async def test_create_document(self, doc_service):
        doc = await doc_service.create_document("test.pdf", b"content", 10)
        assert doc.id is not None
        assert doc.filename == "test.pdf"
        assert doc.page_count == 10

    async def test_create_duplicate_document(self, doc_service):
        await doc_service.create_document("test.pdf", b"same content", 10)
        with pytest.raises(ValueError, match="already exists"):
            await doc_service.create_document("test2.pdf", b"same content", 5)

    async def test_get_document(self, doc_service):
        created = await doc_service.create_document("test.pdf", b"content", 10)
        doc = await doc_service.get_document(created.id)
        assert doc is not None
        assert doc.id == created.id

    async def test_get_nonexistent_document(self, doc_service):
        doc = await doc_service.get_document(999)
        assert doc is None

    async def test_list_documents(self, doc_service):
        await doc_service.create_document("a.pdf", b"a", 1)
        await doc_service.create_document("b.pdf", b"b", 2)
        await doc_service.create_document("c.pdf", b"c", 3)

        docs, total = await doc_service.list_documents(limit=2)
        assert len(docs) == 2
        assert total == 3

        docs, total = await doc_service.list_documents(skip=2, limit=2)
        assert len(docs) == 1
        assert total == 3

    async def test_search_documents(self, doc_service):
        await doc_service.create_document("report.pdf", b"a", 1)
        await doc_service.create_document("summary.pdf", b"b", 2)
        await doc_service.create_document("other.pdf", b"c", 3)

        docs, total = await doc_service.list_documents(search="report")
        assert total == 1
        assert docs[0].filename == "report.pdf"

    async def test_delete_document(self, doc_service):
        doc = await doc_service.create_document("test.pdf", b"content", 10)
        deleted = await doc_service.delete_document(doc.id)
        assert deleted is True
        assert await doc_service.get_document(doc.id) is None

        deleted = await doc_service.delete_document(999)
        assert deleted is False


class TestDocumentNodes:
    async def test_create_node(self, doc_service):
        doc = await doc_service.create_document("test.pdf", b"content", 10)
        node = await doc_service.create_node(
            document_id=doc.id,
            structure="1",
            title="Chapter 1",
            content="Content of chapter 1",
        )
        assert node.id is not None
        assert node.structure == "1"
        assert node.title == "Chapter 1"

    async def test_get_node(self, doc_service):
        doc = await doc_service.create_document("test.pdf", b"content", 10)
        created = await doc_service.create_node(doc.id, "1", "Chapter 1", "Content")
        node = await doc_service.get_node(created.id)
        assert node is not None
        assert node.id == created.id

    async def test_update_node_content(self, doc_service):
        doc = await doc_service.create_document("test.pdf", b"content", 10)
        node = await doc_service.create_node(doc.id, "1", "Chapter 1", "Original")
        original_hash = node.content_hash
        updated = await doc_service.update_node_content(node.id, "Updated content")
        assert updated is not None
        assert updated.summary == "Updated content"
        assert updated.content_hash != original_hash

    async def test_update_node_same_content(self, doc_service):
        doc = await doc_service.create_document("test.pdf", b"content", 10)
        node = await doc_service.create_node(doc.id, "1", "Chapter 1", "Content")
        original_hash = node.content_hash
        updated = await doc_service.update_node_content(node.id, "Content")
        assert updated.content_hash == original_hash

    async def test_get_leaf_nodes(self, doc_service):
        doc = await doc_service.create_document("test.pdf", b"content", 10)
        parent = await doc_service.create_node(doc.id, "1", "Chapter 1", "Parent content")
        child1 = await doc_service.create_node(doc.id, "1.1", "Section 1.1", "Child 1", parent_id=parent.id)
        child2 = await doc_service.create_node(doc.id, "1.2", "Section 1.2", "Child 2", parent_id=parent.id)
        leaf = await doc_service.create_node(doc.id, "2", "Chapter 2", "Leaf content")

        leaves = await doc_service.get_leaf_nodes(doc.id)
        leaf_ids = {n.id for n in leaves}
        assert child1.id in leaf_ids
        assert child2.id in leaf_ids
        assert leaf.id in leaf_ids
        assert parent.id not in leaf_ids


class TestIncrementalIndexService:
    async def test_compute_node_hash(self, inc_service):
        hash1 = inc_service.compute_node_hash("content")
        hash2 = inc_service.compute_node_hash("content")
        hash3 = inc_service.compute_node_hash("different")
        assert hash1 == hash2
        assert hash1 != hash3

    async def test_detect_changed_nodes(self, inc_service, doc_service):
        doc = await doc_service.create_document("test.pdf", b"content", 10)
        await doc_service.create_node(doc.id, "1", "Chapter 1", "Original content")
        await doc_service.create_node(doc.id, "2", "Chapter 2", "Unchanged")

        new_nodes = [
            {"structure": "1", "summary": "Modified content"},
            {"structure": "2", "summary": "Unchanged"},
            {"structure": "3", "summary": "New chapter"},
        ]

        changed, changed_ids, unchanged = await inc_service.detect_changed_nodes(doc.id, new_nodes)
        assert len(changed) == 1
        assert changed[0]["structure"] == "1"
        assert "node_id" in changed[0]
        assert len(unchanged) == 1
        assert len([n for n in new_nodes if n["structure"] == "3"]) == 1

    async def test_apply_incremental_update(self, inc_service, doc_service):
        doc = await doc_service.create_document("test.pdf", b"content", 10)
        node1 = await doc_service.create_node(doc.id, "1", "Chapter 1", "Original")
        node2 = await doc_service.create_node(doc.id, "2", "Chapter 2", "Unchanged")

        changed_nodes = [{
            "node_id": node1.id,
            "structure": "1",
            "summary": "Modified content",
            "content_hash": inc_service.compute_node_hash("Modified content"),
        }]
        new_nodes = [{
            "structure": "3",
            "title": "Chapter 3",
            "summary": "New content",
        }]

        result = await inc_service.apply_incremental_update(doc.id, changed_nodes, new_nodes)
        assert result["updated"] == 1
        assert result["created"] == 1
        assert result["version"] == 1

        updated_node = await doc_service.get_node(node1.id)
        assert updated_node.summary == "Modified content"

        versions = await doc_service.get_versions(doc.id)
        assert len(versions) == 1
        assert versions[0].version_number == 1
"""
Phase 3D Integration Tests: Worker ↔ MinIO Binding + RabbitMQ

Tests the full pipeline:
1. Upload file via QUIC → MinIO
2. Publish OCR task to RabbitMQ
3. Worker fetches file → processes → chunks
4. Worker uploads results to MinIO
5. Worker publishes embedding tasks
"""

import asyncio
import json
import os
import pytest
import tempfile
from io import BytesIO
from unittest.mock import Mock, patch, MagicMock

from minio import Minio
from minio.error import S3Error

# Import modules to test
from backend.workers.ocr_chunk_worker import OCRChunkWorker, ProcessingResult
from backend.mq_client import MQTask


class TestOCRChunkWorker:
    """Test OCR + Chunk Worker"""

    @pytest.fixture
    def worker(self):
        """Create worker instance with mocked clients"""
        worker = OCRChunkWorker(
            minio_endpoint="localhost:9000",
            minio_access_key="minio",
            minio_secret_key="minio123",
            redis_url="redis://localhost:6379",
            rabbitmq_url="amqp://legalai:legalai123@localhost:5672/legalai",
        )
        return worker

    @pytest.fixture
    def sample_task(self):
        """Create sample OCR task"""
        return MQTask(
            task_id="test_001",
            task_type="embedding",
            payload={
                "doc_id": "doc_abc123",
                "file_path": "evidence/doc_abc123/file.pdf",
                "bucket": "legal-evidence",
            },
        )

    @pytest.fixture
    def sample_pdf_data(self):
        """Create sample PDF data"""
        return b"%PDF-1.4\n%Sample PDF content"

    def test_worker_initialization(self, worker):
        """Test worker initializes correctly"""
        assert worker.minio_endpoint == "localhost:9000"
        assert worker.minio_bucket == "legal-evidence"
        assert worker.chunker is not None
        assert worker.vlm is not None

    @pytest.mark.asyncio
    async def test_fetch_from_minio(self, worker, sample_pdf_data):
        """Test fetching file from MinIO"""
        with patch.object(worker.minio, "get_object") as mock_get:
            mock_response = MagicMock()
            mock_response.read.return_value = sample_pdf_data
            mock_get.return_value = mock_response

            result = worker._fetch_from_minio("legal-evidence", "evidence/doc_abc123/file.pdf")

            assert result == sample_pdf_data
            mock_get.assert_called_once()

    @pytest.mark.asyncio
    async def test_upload_pages_to_minio(self, worker):
        """Test uploading OCR pages to MinIO"""
        pages = [
            {"page_num": 1, "text": "Page 1 content", "blocks": []},
            {"page_num": 2, "text": "Page 2 content", "blocks": []},
        ]

        with patch.object(worker.minio, "put_object") as mock_put:
            uploaded = worker._upload_pages("doc_abc123", "legal-evidence", pages)

            assert uploaded == 2
            assert mock_put.call_count == 2

    @pytest.mark.asyncio
    async def test_upload_chunks_to_minio(self, worker):
        """Test uploading chunks to MinIO"""
        from backend.chunker_langextract import Chunk

        chunks = [
            Chunk(
                id="chunk_001",
                doc_id="doc_abc123",
                text="Chunk 1 text",
                tokens=50,
                semantic_type="text",
                page=1,
                bounding_boxes=[],
                metadata={},
            ),
            Chunk(
                id="chunk_002",
                doc_id="doc_abc123",
                text="Chunk 2 text",
                tokens=60,
                semantic_type="text",
                page=1,
                bounding_boxes=[],
                metadata={},
            ),
        ]

        with patch.object(worker.minio, "put_object") as mock_put:
            uploaded = worker._upload_chunks("doc_abc123", "legal-evidence", chunks)

            assert uploaded == 2
            assert mock_put.call_count == 2

    @pytest.mark.asyncio
    async def test_publish_embedding_tasks(self, worker):
        """Test publishing embedding tasks to RabbitMQ"""
        from backend.chunker_langextract import Chunk

        chunks = [
            Chunk(
                id="chunk_001",
                doc_id="doc_abc123",
                text="Chunk 1 text",
                tokens=50,
                semantic_type="text",
                page=1,
                bounding_boxes=[],
                metadata={},
            ),
        ]

        with patch.object(worker.mq_client, "connect") as mock_connect, \
             patch.object(worker.mq_client, "publish_task") as mock_publish, \
             patch.object(worker.mq_client, "close") as mock_close:

            mock_publish.return_value = "task_001"

            await worker._publish_embedding_tasks("doc_abc123", "legal-evidence", chunks)

            mock_connect.assert_called_once()
            mock_publish.assert_called_once()
            mock_close.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_upload_full_pipeline(self, worker, sample_task, sample_pdf_data):
        """Test full OCR + chunk pipeline"""
        from backend.chunker_langextract import Chunk

        # Mock all external calls
        with patch.object(worker, "_fetch_from_minio") as mock_fetch, \
             patch.object(worker.vlm, "process_document") as mock_vlm, \
             patch.object(worker, "_upload_pages") as mock_upload_pages, \
             patch.object(worker, "_upload_chunks") as mock_upload_chunks, \
             patch.object(worker, "_publish_embedding_tasks") as mock_publish, \
             patch("tempfile.NamedTemporaryFile") as mock_temp, \
             patch("os.unlink") as mock_unlink:

            # Setup mocks
            mock_fetch.return_value = sample_pdf_data

            mock_doctags = MagicMock()
            mock_doctags.pages = [
                {"page_num": 1, "text": "Page 1"},
                {"page_num": 2, "text": "Page 2"},
            ]
            mock_vlm.return_value = mock_doctags

            mock_chunks = [
                Chunk(
                    id="chunk_001",
                    doc_id="doc_abc123",
                    text="Chunk 1",
                    tokens=50,
                    semantic_type="text",
                    page=1,
                    bounding_boxes=[],
                    metadata={},
                ),
            ]
            worker.chunker.from_doctags = Mock(return_value=mock_chunks)

            mock_upload_pages.return_value = 2
            mock_upload_chunks.return_value = 1
            mock_publish.return_value = None

            mock_temp_file = MagicMock()
            mock_temp_file.__enter__.return_value.name = "/tmp/test.pdf"
            mock_temp.return_value = mock_temp_file

            # Execute
            result = await worker.process_upload(sample_task)

            # Verify
            assert result.doc_id == "doc_abc123"
            assert result.page_count == 2
            assert result.chunk_count == 1
            assert result.pages_uploaded == 2
            assert result.chunks_uploaded == 1
            assert result.status == "completed"

            mock_fetch.assert_called_once()
            mock_vlm.assert_called_once()
            mock_upload_pages.assert_called_once()
            mock_upload_chunks.assert_called_once()
            mock_publish.assert_called_once()


class TestMinIOUploadEndpoint:
    """Test Go QUIC MinIO upload endpoint"""

    def test_upload_endpoint_exists(self):
        """Test that upload endpoint is registered"""
        # This would be tested with actual QUIC server
        # For now, just verify the code structure
        from backend.go_quic.minio_upload import UploadResult

        result = UploadResult(
            doc_id="doc_abc123",
            filename="test.pdf",
            bucket="legal-evidence",
            size=1024,
            path="evidence/doc_abc123/file.pdf",
        )

        assert result.doc_id == "doc_abc123"
        assert result.filename == "test.pdf"


class TestRabbitMQDLQ:
    """Test RabbitMQ Dead Letter Queue setup"""

    def test_dlq_configuration(self):
        """Test DLQ configuration is correct"""
        # This would be tested with actual RabbitMQ
        # For now, verify the setup script exists
        assert os.path.exists("scripts/setup_rabbitmq_dlq.sh")


@pytest.mark.asyncio
async def test_end_to_end_pipeline():
    """Test end-to-end pipeline (requires real services)"""
    # This test requires:
    # - MinIO running on localhost:9000
    # - RabbitMQ running on localhost:5672
    # - Redis running on localhost:6379

    pytest.skip("Requires real services running")

    worker = OCRChunkWorker()

    # Create sample task
    task = MQTask(
        task_id="e2e_test_001",
        task_type="embedding",
        payload={
            "doc_id": "doc_e2e_test",
            "file_path": "evidence/doc_e2e_test/file.pdf",
            "bucket": "legal-evidence",
        },
    )

    # Process (would fail without real services)
    # result = await worker.process_upload(task)
    # assert result.status == "completed"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

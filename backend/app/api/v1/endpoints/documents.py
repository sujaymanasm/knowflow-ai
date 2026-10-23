import os
import shutil
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from app.core.database import get_db
from app.core.config import settings
from app.models.entities import Document, DocumentChunk, Workspace, IngestionJob
from app.schemas.pydantic_models import DocumentResponse, DocumentChunkResponse
from app.services.ingestion.extractor import DocumentExtractor
from app.services.ingestion.chunker import TextChunker
from app.services.embeddings.embedder import EmbeddingService

router = APIRouter()

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB
ALLOWED_EXTENSIONS = {"pdf", "txt", "md"}

async def process_document_ingestion(
    db: AsyncSession,
    document: Document,
    job: IngestionJob
):
    """
    Executes ingestion, text extraction, chunking, embedding, and indexing.
    """
    job.status = "processing"
    document.status = "Processing"
    await db.commit()

    try:
        # 1. Extract text and pages
        pages, total_pages = DocumentExtractor.extract_text(
            file_path=document.storage_path,
            file_type=document.file_type
        )
        document.page_count = total_pages

        # 2. Chunk text
        chunks = TextChunker.chunk_pages(
            pages=pages,
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP
        )

        if not chunks:
            # Handle empty document
            document.status = "Indexed"
            document.error_message = "Document contained no extractable text."
            job.status = "completed"
            job.completed_at = datetime.utcnow()
            await db.commit()
            return

        # 3. Generate embeddings
        chunk_texts = [c.content for c in chunks]
        embeddings = await EmbeddingService.get_embeddings(chunk_texts)

        # 4. Save chunks
        for item, emb in zip(chunks, embeddings):
            chunk_record = DocumentChunk(
                document_id=document.id,
                workspace_id=document.workspace_id,
                chunk_index=item.chunk_index,
                content=item.content,
                page_number=item.page_number,
                char_offset_start=item.char_offset_start,
                char_offset_end=item.char_offset_end,
                token_count=item.token_count,
                embedding_json=EmbeddingService.serialize_vector(emb)
            )
            db.add(chunk_record)

        document.status = "Indexed"
        document.error_message = None
        job.status = "completed"
        job.completed_at = datetime.utcnow()
        await db.commit()

    except Exception as e:
        document.status = "Failed"
        document.error_message = str(e)
        job.status = "failed"
        job.error_message = str(e)
        job.completed_at = datetime.utcnow()
        await db.commit()
        raise

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    workspace_id: str = Form(...),
    title: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    # Verify workspace exists
    ws = await db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Target workspace not found")

    # Validate filename and extension
    original_filename = file.filename or "uploaded_document"
    ext = original_filename.split(".")[-1].lower() if "." in original_filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '.{ext}'. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Sanitize title
    doc_title = title.strip() if (title and title.strip()) else original_filename

    # Save file to disk safely
    ws_upload_dir = os.path.join(settings.UPLOAD_DIR, workspace_id)
    os.makedirs(ws_upload_dir, exist_ok=True)
    safe_file_id = str(uuid.uuid4())
    stored_filename = f"{safe_file_id}.{ext}"
    destination_path = os.path.join(ws_upload_dir, stored_filename)

    file_size = 0
    with open(destination_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            file_size += len(chunk)
            if file_size > MAX_FILE_SIZE_BYTES:
                buffer.close()
                if os.path.exists(destination_path):
                    os.remove(destination_path)
                raise HTTPException(
                    status_code=413,
                    detail=f"File exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."
                )
            buffer.write(chunk)

    # Create Document record
    doc = Document(
        workspace_id=workspace_id,
        title=doc_title,
        original_filename=original_filename,
        file_type=ext,
        file_size_bytes=file_size,
        page_count=0,
        storage_path=destination_path,
        status="Uploaded"
    )
    db.add(doc)
    await db.flush()

    # Create IngestionJob record
    job = IngestionJob(
        document_id=doc.id,
        status="pending"
    )
    db.add(job)
    await db.flush()

    # Run ingestion synchronously or async
    try:
        await process_document_ingestion(db, doc, job)
    except Exception as exc:
        print(f"[Document Ingestion] Error processing {doc.title}: {exc}")

    await db.refresh(doc)
    chunk_count = (await db.execute(select(func.count(DocumentChunk.id)).where(DocumentChunk.document_id == doc.id))).scalar() or 0

    return DocumentResponse(
        id=doc.id,
        workspace_id=doc.workspace_id,
        title=doc.title,
        original_filename=doc.original_filename,
        file_type=doc.file_type,
        file_size_bytes=doc.file_size_bytes,
        page_count=doc.page_count,
        status=doc.status,
        error_message=doc.error_message,
        chunk_count=chunk_count,
        created_at=doc.created_at,
        updated_at=doc.updated_at
    )

@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    workspace_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = select(Document).order_by(Document.created_at.desc())
    if workspace_id:
        query = query.where(Document.workspace_id == workspace_id)
    if status_filter:
        query = query.where(Document.status == status_filter)
    if search:
        query = query.where(Document.title.ilike(f"%{search}%"))

    docs = (await db.execute(query)).scalars().all()
    results: List[DocumentResponse] = []

    for d in docs:
        cc = (await db.execute(select(func.count(DocumentChunk.id)).where(DocumentChunk.document_id == d.id))).scalar() or 0
        results.append(
            DocumentResponse(
                id=d.id,
                workspace_id=d.workspace_id,
                title=d.title,
                original_filename=d.original_filename,
                file_type=d.file_type,
                file_size_bytes=d.file_size_bytes,
                page_count=d.page_count,
                status=d.status,
                error_message=d.error_message,
                chunk_count=cc,
                created_at=d.created_at,
                updated_at=d.updated_at
            )
        )
    return results

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    cc = (await db.execute(select(func.count(DocumentChunk.id)).where(DocumentChunk.document_id == doc.id))).scalar() or 0
    return DocumentResponse(
        id=doc.id,
        workspace_id=doc.workspace_id,
        title=doc.title,
        original_filename=doc.original_filename,
        file_type=doc.file_type,
        file_size_bytes=doc.file_size_bytes,
        page_count=doc.page_count,
        status=doc.status,
        error_message=doc.error_message,
        chunk_count=cc,
        created_at=doc.created_at,
        updated_at=doc.updated_at
    )

@router.get("/{document_id}/chunks", response_model=List[DocumentChunkResponse])
async def get_document_chunks(document_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    stmt = select(DocumentChunk).where(DocumentChunk.document_id == document_id).order_by(DocumentChunk.chunk_index.asc())
    chunks = (await db.execute(stmt)).scalars().all()
    return [DocumentChunkResponse.model_validate(c) for c in chunks]

@router.post("/{document_id}/reindex", response_model=DocumentResponse)
async def reindex_document(document_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove existing chunks
    await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document_id))
    await db.commit()

    job = IngestionJob(document_id=doc.id, status="pending")
    db.add(job)
    await db.commit()

    await process_document_ingestion(db, doc, job)
    await db.refresh(doc)
    cc = (await db.execute(select(func.count(DocumentChunk.id)).where(DocumentChunk.document_id == doc.id))).scalar() or 0

    return DocumentResponse(
        id=doc.id,
        workspace_id=doc.workspace_id,
        title=doc.title,
        original_filename=doc.original_filename,
        file_type=doc.file_type,
        file_size_bytes=doc.file_size_bytes,
        page_count=doc.page_count,
        status=doc.status,
        error_message=doc.error_message,
        chunk_count=cc,
        created_at=doc.created_at,
        updated_at=doc.updated_at
    )

@router.post("/{document_id}/retry", response_model=DocumentResponse)
async def retry_document_ingestion(document_id: str, db: AsyncSession = Depends(get_db)):
    return await reindex_document(document_id, db)

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete storage file
    if os.path.exists(doc.storage_path):
        try:
            os.remove(doc.storage_path)
        except Exception:
            pass

    await db.delete(doc)
    await db.commit()
    return None

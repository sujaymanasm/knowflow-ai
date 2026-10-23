from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from app.core.database import get_db
from app.core.config import settings
from app.models.entities import Document, Workspace, Conversation, IngestionJob, Message
from app.schemas.pydantic_models import DashboardStatsResponse, DocumentResponse, ConversationResponse, IngestionJobResponse

router = APIRouter()

@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    workspace_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    # Total documents
    doc_query = select(func.count(Document.id))
    if workspace_id:
        doc_query = doc_query.where(Document.workspace_id == workspace_id)
    total_docs = (await db.execute(doc_query)).scalar() or 0

    # Indexed documents
    indexed_query = select(func.count(Document.id)).where(Document.status == "Indexed")
    if workspace_id:
        indexed_query = indexed_query.where(Document.workspace_id == workspace_id)
    indexed_docs = (await db.execute(indexed_query)).scalar() or 0

    # Total workspaces
    total_workspaces = (await db.execute(select(func.count(Workspace.id)))).scalar() or 0

    # Total conversations
    conv_query = select(func.count(Conversation.id))
    if workspace_id:
        conv_query = conv_query.where(Conversation.workspace_id == workspace_id)
    total_convs = (await db.execute(conv_query)).scalar() or 0

    # Failed jobs
    failed_jobs_query = select(func.count(IngestionJob.id)).where(IngestionJob.status == "failed")
    failed_jobs = (await db.execute(failed_jobs_query)).scalar() or 0

    # Recent documents
    recent_docs_stmt = select(Document).order_by(Document.created_at.desc()).limit(5)
    if workspace_id:
        recent_docs_stmt = recent_docs_stmt.where(Document.workspace_id == workspace_id)
    recent_docs = (await db.execute(recent_docs_stmt)).scalars().all()

    # Recent conversations
    recent_convs_stmt = select(Conversation).order_by(Conversation.updated_at.desc()).limit(5)
    if workspace_id:
        recent_convs_stmt = recent_convs_stmt.where(Conversation.workspace_id == workspace_id)
    recent_convs = (await db.execute(recent_convs_stmt)).scalars().all()

    # Recent jobs
    recent_jobs_stmt = select(IngestionJob).order_by(IngestionJob.started_at.desc()).limit(5)
    recent_jobs = (await db.execute(recent_jobs_stmt)).scalars().all()

    return DashboardStatsResponse(
        total_documents=total_docs,
        indexed_documents=indexed_docs,
        total_workspaces=total_workspaces,
        total_conversations=total_convs,
        failed_jobs_count=failed_jobs,
        is_demo_mode=settings.IS_DEMO_MODE,
        embedding_model=settings.EMBEDDING_MODEL,
        llm_model=settings.LLM_MODEL,
        recent_documents=[DocumentResponse.model_validate(d) for d in recent_docs],
        recent_conversations=[
            ConversationResponse(
                id=c.id,
                workspace_id=c.workspace_id,
                title=c.title,
                created_at=c.created_at,
                updated_at=c.updated_at,
                message_count=0,
                last_message_preview=None
            ) for c in recent_convs
        ],
        recent_jobs=[IngestionJobResponse.model_validate(j) for j in recent_jobs]
    )

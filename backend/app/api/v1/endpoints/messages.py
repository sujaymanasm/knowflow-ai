from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.entities import Conversation, Message, Citation, UserFeedback
from app.schemas.pydantic_models import (
    AskQuestionRequest,
    MessageResponse,
    CitationResponse,
    FeedbackCreate,
    FeedbackResponse
)
from app.services.rag.generator import RAGGenerator

router = APIRouter()

@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def ask_question(
    conversation_id: str,
    payload: AskQuestionRequest,
    db: AsyncSession = Depends(get_db)
):
    # 1. Fetch and validate conversation
    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # 2. Save user message
    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=payload.question.strip()
    )
    db.add(user_msg)
    await db.flush()

    # If first message and default title, update title
    if conv.title in ("New Conversation", "Untitled"):
        new_title = payload.question.strip()
        if len(new_title) > 40:
            new_title = new_title[:37] + "..."
        conv.title = new_title

    conv.updated_at = datetime.utcnow()

    # 3. Execute RAG pipeline
    rag_result = await RAGGenerator.generate_answer(
        session=db,
        workspace_id=payload.workspace_id,
        question=payload.question.strip(),
        document_id=payload.document_id,
        top_k=payload.top_k or 4
    )

    # 4. Save assistant response
    assistant_msg = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=rag_result.answer,
        retrieval_latency_ms=rag_result.retrieval_latency_ms,
        generation_latency_ms=rag_result.generation_latency_ms,
        is_simulated=rag_result.is_simulated
    )
    db.add(assistant_msg)
    await db.flush()

    # 5. Save citations
    saved_citations: list[Citation] = []
    for c in rag_result.citations:
        cit_record = Citation(
            message_id=assistant_msg.id,
            chunk_id=c.chunk_id,
            document_id=c.document_id,
            document_title=c.document_title,
            page_number=c.page_number,
            excerpt=c.excerpt,
            relevance_score=c.relevance_score
        )
        db.add(cit_record)
        saved_citations.append(cit_record)

    await db.commit()
    await db.refresh(assistant_msg)

    # 6. Build response
    citations_resp = [
        CitationResponse(
            id=c.id,
            chunk_id=c.chunk_id,
            document_id=c.document_id,
            document_title=c.document_title,
            page_number=c.page_number,
            excerpt=c.excerpt,
            relevance_score=c.relevance_score
        ) for c in saved_citations
    ]

    return MessageResponse(
        id=assistant_msg.id,
        conversation_id=assistant_msg.conversation_id,
        role=assistant_msg.role,
        content=assistant_msg.content,
        retrieval_latency_ms=assistant_msg.retrieval_latency_ms,
        generation_latency_ms=assistant_msg.generation_latency_ms,
        is_simulated=assistant_msg.is_simulated,
        citations=citations_resp,
        feedback=None,
        created_at=assistant_msg.created_at
    )

@router.post("/messages/{message_id}/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    message_id: str,
    payload: FeedbackCreate,
    db: AsyncSession = Depends(get_db)
):
    msg = await db.get(Message, message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    # Check if feedback already exists
    stmt = select(UserFeedback).where(UserFeedback.message_id == message_id)
    existing = (await db.execute(stmt)).scalar_one_or_none()

    if existing:
        existing.rating = payload.rating
        existing.feedback_text = payload.feedback_text
        fb = existing
    else:
        fb = UserFeedback(
            message_id=message_id,
            rating=payload.rating,
            feedback_text=payload.feedback_text
        )
        db.add(fb)

    await db.commit()
    await db.refresh(fb)

    return FeedbackResponse(
        id=fb.id,
        message_id=fb.message_id,
        rating=fb.rating,
        feedback_text=fb.feedback_text,
        created_at=fb.created_at
    )

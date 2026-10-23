from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.entities import Conversation, Message, Workspace, Citation
from app.schemas.pydantic_models import (
    ConversationCreate,
    ConversationUpdate,
    ConversationResponse,
    ConversationDetailResponse,
    MessageResponse,
    CitationResponse
)

router = APIRouter()

@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(payload: ConversationCreate, db: AsyncSession = Depends(get_db)):
    ws = await db.get(Workspace, payload.workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    conv = Conversation(
        workspace_id=payload.workspace_id,
        title=payload.title.strip() if (payload.title and payload.title.strip()) else "New Conversation"
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)

    return ConversationResponse(
        id=conv.id,
        workspace_id=conv.workspace_id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=0,
        last_message_preview=None
    )

@router.get("", response_model=List[ConversationResponse])
async def list_conversations(
    workspace_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Conversation)
        .where(Conversation.workspace_id == workspace_id)
        .order_by(Conversation.updated_at.desc())
    )
    convs = (await db.execute(stmt)).scalars().all()

    result: List[ConversationResponse] = []
    for c in convs:
        # Message count
        count = (await db.execute(select(func.count(Message.id)).where(Message.conversation_id == c.id))).scalar() or 0
        # Last message preview
        last_msg_stmt = (
            select(Message.content)
            .where(Message.conversation_id == c.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg = (await db.execute(last_msg_stmt)).scalar()
        preview = (last_msg[:60] + "...") if last_msg and len(last_msg) > 60 else last_msg

        result.append(
            ConversationResponse(
                id=c.id,
                workspace_id=c.workspace_id,
                title=c.title,
                created_at=c.created_at,
                updated_at=c.updated_at,
                message_count=count,
                last_message_preview=preview
            )
        )
    return result

@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Conversation)
        .options(
            selectinload(Conversation.messages)
            .selectinload(Message.citations),
            selectinload(Conversation.messages)
            .selectinload(Message.feedback)
        )
        .where(Conversation.id == conversation_id)
    )
    conv = (await db.execute(stmt)).scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages_resp: List[MessageResponse] = []
    for m in conv.messages:
        messages_resp.append(MessageResponse.model_validate(m))

    return ConversationDetailResponse(
        id=conv.id,
        workspace_id=conv.workspace_id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=len(conv.messages),
        last_message_preview=conv.messages[-1].content[:60] if conv.messages else None,
        messages=messages_resp
    )

@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    payload: ConversationUpdate,
    db: AsyncSession = Depends(get_db)
):
    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv.title = payload.title.strip()
    await db.commit()
    await db.refresh(conv)

    count = (await db.execute(select(func.count(Message.id)).where(Message.conversation_id == conv.id))).scalar() or 0
    return ConversationResponse(
        id=conv.id,
        workspace_id=conv.workspace_id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=count,
        last_message_preview=None
    )

@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(conv)
    await db.commit()
    return None

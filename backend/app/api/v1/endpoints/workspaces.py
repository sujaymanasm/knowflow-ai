from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.entities import Workspace, Document, Conversation
from app.schemas.pydantic_models import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse

router = APIRouter()

@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(payload: WorkspaceCreate, db: AsyncSession = Depends(get_db)):
    workspace = Workspace(
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None
    )
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)
    return WorkspaceResponse(
        id=workspace.id,
        name=workspace.name,
        description=workspace.description,
        document_count=0,
        conversation_count=0,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at
    )

@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workspace).order_by(Workspace.created_at.desc()))
    workspaces = result.scalars().all()

    response: List[WorkspaceResponse] = []
    for ws in workspaces:
        doc_count = (await db.execute(select(func.count(Document.id)).where(Document.workspace_id == ws.id))).scalar() or 0
        conv_count = (await db.execute(select(func.count(Conversation.id)).where(Conversation.workspace_id == ws.id))).scalar() or 0
        response.append(
            WorkspaceResponse(
                id=ws.id,
                name=ws.name,
                description=ws.description,
                document_count=doc_count,
                conversation_count=conv_count,
                created_at=ws.created_at,
                updated_at=ws.updated_at
            )
        )
    return response

@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(workspace_id: str, db: AsyncSession = Depends(get_db)):
    ws = await db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    doc_count = (await db.execute(select(func.count(Document.id)).where(Document.workspace_id == ws.id))).scalar() or 0
    conv_count = (await db.execute(select(func.count(Conversation.id)).where(Conversation.workspace_id == ws.id))).scalar() or 0
    return WorkspaceResponse(
        id=ws.id,
        name=ws.name,
        description=ws.description,
        document_count=doc_count,
        conversation_count=conv_count,
        created_at=ws.created_at,
        updated_at=ws.updated_at
    )

@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(workspace_id: str, payload: WorkspaceUpdate, db: AsyncSession = Depends(get_db)):
    ws = await db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if payload.name is not None:
        ws.name = payload.name.strip()
    if payload.description is not None:
        ws.description = payload.description.strip()

    await db.commit()
    await db.refresh(ws)

    doc_count = (await db.execute(select(func.count(Document.id)).where(Document.workspace_id == ws.id))).scalar() or 0
    conv_count = (await db.execute(select(func.count(Conversation.id)).where(Conversation.workspace_id == ws.id))).scalar() or 0
    return WorkspaceResponse(
        id=ws.id,
        name=ws.name,
        description=ws.description,
        document_count=doc_count,
        conversation_count=conv_count,
        created_at=ws.created_at,
        updated_at=ws.updated_at
    )

@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(workspace_id: str, db: AsyncSession = Depends(get_db)):
    ws = await db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    await db.delete(ws)
    await db.commit()
    return None

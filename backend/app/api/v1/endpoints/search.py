from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.entities import Workspace
from app.schemas.pydantic_models import SearchRequest, SearchResponse
from app.services.retrieval.hybrid_search import HybridSearchService

router = APIRouter()

@router.post("", response_model=SearchResponse)
async def search_documents(payload: SearchRequest, db: AsyncSession = Depends(get_db)):
    # Verify workspace
    ws = await db.get(Workspace, payload.workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    result = await HybridSearchService.search(
        session=db,
        workspace_id=payload.workspace_id,
        query=payload.query.strip(),
        search_type=payload.search_type,
        top_k=payload.top_k,
        document_id=payload.document_id
    )

    return SearchResponse(**result)

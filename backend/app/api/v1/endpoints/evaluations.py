from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.entities import Workspace, EvaluationRun, EvaluationExample
from app.schemas.pydantic_models import (
    EvaluationRunRequest,
    EvaluationRunResponse,
    EvaluationExampleResponse
)
from app.services.evaluation.evaluator import EvaluationService

router = APIRouter()

@router.post("/run", response_model=EvaluationRunResponse, status_code=status.HTTP_201_CREATED)
async def trigger_evaluation(
    payload: EvaluationRunRequest,
    db: AsyncSession = Depends(get_db)
):
    ws = await db.get(Workspace, payload.workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    run = await EvaluationService.run_evaluation(
        session=db,
        workspace_id=payload.workspace_id,
        run_name=payload.name or "RAG Benchmark Suite"
    )

    stmt = (
        select(EvaluationRun)
        .options(selectinload(EvaluationRun.examples))
        .where(EvaluationRun.id == run.id)
    )
    full_run = (await db.execute(stmt)).scalar_one()

    return EvaluationRunResponse.model_validate(full_run)

@router.get("", response_model=List[EvaluationRunResponse])
async def list_evaluations(
    workspace_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(EvaluationRun)
        .options(selectinload(EvaluationRun.examples))
        .where(EvaluationRun.workspace_id == workspace_id)
        .order_by(EvaluationRun.created_at.desc())
    )
    runs = (await db.execute(stmt)).scalars().all()
    return [EvaluationRunResponse.model_validate(r) for r in runs]

@router.get("/{run_id}", response_model=EvaluationRunResponse)
async def get_evaluation(run_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(EvaluationRun)
        .options(selectinload(EvaluationRun.examples))
        .where(EvaluationRun.id == run_id)
    )
    run = (await db.execute(stmt)).scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found")
    return EvaluationRunResponse.model_validate(run)

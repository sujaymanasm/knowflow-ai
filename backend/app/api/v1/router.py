from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    dashboard,
    workspaces,
    documents,
    conversations,
    messages,
    search,
    evaluations
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["Conversations"])
api_router.include_router(messages.router, tags=["Messages"])
api_router.include_router(search.router, prefix="/search", tags=["Search"])
api_router.include_router(evaluations.router, prefix="/evaluations", tags=["Evaluations"])

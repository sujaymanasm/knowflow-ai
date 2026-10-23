import pytest
import io
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient):
    resp = await async_client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("healthy", "degraded")
    assert "version" in data
    assert "is_demo_mode" in data

@pytest.mark.asyncio
async def test_workspace_crud_and_dashboard(async_client: AsyncClient):
    # 1. Create Workspace
    create_resp = await async_client.post(
        "/api/v1/workspaces",
        json={"name": "Test Engineering Workspace", "description": "Workspace for automated tests"}
    )
    assert create_resp.status_code == 201
    ws_data = create_resp.json()
    ws_id = ws_data["id"]
    assert ws_data["name"] == "Test Engineering Workspace"

    # 2. List Workspaces
    list_resp = await async_client.get("/api/v1/workspaces")
    assert list_resp.status_code == 200
    assert any(w["id"] == ws_id for w in list_resp.json())

    # 3. Check Dashboard Stats
    stats_resp = await async_client.get(f"/api/v1/dashboard/stats?workspace_id={ws_id}")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert "total_documents" in stats

    # 4. Upload Document
    doc_content = b"KnowFlow AI is a high-performance RAG intelligence engine designed for document analysis."
    files = {"file": ("test_doc.txt", io.BytesIO(doc_content), "text/plain")}
    data = {"workspace_id": ws_id, "title": "Test Knowledge Base"}
    upload_resp = await async_client.post("/api/v1/documents/upload", files=files, data=data)
    assert upload_resp.status_code == 201
    doc_json = upload_resp.json()
    doc_id = doc_json["id"]
    assert doc_json["status"] == "Indexed"
    assert doc_json["chunk_count"] > 0

    # 5. Hybrid Search
    search_resp = await async_client.post(
        "/api/v1/search",
        json={"workspace_id": ws_id, "query": "RAG intelligence engine", "search_type": "hybrid", "top_k": 3}
    )
    assert search_resp.status_code == 200
    search_data = search_resp.json()
    assert search_data["total_results"] > 0
    assert "retrieval_latency_ms" in search_data

    # 6. Create Conversation and Ask Question
    conv_resp = await async_client.post(
        "/api/v1/conversations",
        json={"workspace_id": ws_id, "title": "RAG Verification Chat"}
    )
    assert conv_resp.status_code == 201
    conv_id = conv_resp.json()["id"]

    msg_resp = await async_client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        json={"workspace_id": ws_id, "question": "What is KnowFlow AI designed for?"}
    )
    assert msg_resp.status_code == 201
    msg_data = msg_resp.json()
    assert "content" in msg_data
    assert len(msg_data["citations"]) > 0
    assert msg_data["citations"][0]["document_title"] == "Test Knowledge Base"

    # 7. Submit Feedback
    fb_resp = await async_client.post(
        f"/api/v1/messages/{msg_data['id']}/feedback",
        json={"rating": "helpful", "feedback_text": "Accurately cited the document!"}
    )
    assert fb_resp.status_code == 200
    assert fb_resp.json()["rating"] == "helpful"

    # 8. Clean up Workspace (cascades documents, chunks, conversations)
    del_resp = await async_client.delete(f"/api/v1/workspaces/{ws_id}")
    assert del_resp.status_code == 204

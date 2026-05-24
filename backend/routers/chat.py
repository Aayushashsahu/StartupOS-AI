"""
routers/chat.py
POST /api/chat      — single-turn chat (REST)
WS   /ws/chat       — streaming chat (WebSocket)
GET  /api/chat/history — chat history
"""

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from database import get_db, ChatMessage
from services import ai_service

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    module: Optional[str] = "copilot"


@router.post("/")
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    """Non-streaming chat endpoint."""
    # Load recent history for context
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.module == req.module)
        .order_by(ChatMessage.created_at.desc())
        .limit(6)
    )
    history = [{"role": m.role, "content": m.content} for m in reversed(result.scalars().all())]

    # Get AI response
    response = await ai_service.chat_response(req.message, history)

    # Save both messages
    db.add(ChatMessage(role="user", content=req.message, module=req.module))
    db.add(ChatMessage(role="assistant", content=response, module=req.module))
    await db.flush()

    return {"role": "assistant", "content": response}


@router.get("/history")
async def chat_history(module: str = "copilot", db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.module == module)
        .order_by(ChatMessage.created_at.asc())
        .limit(100)
    )
    messages = result.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    """
    WebSocket chat for real-time streaming responses.
    Client sends: {"message": "...", "module": "copilot"}
    Server sends: text chunks, ends with {"done": true}
    """
    await websocket.accept()
    history = []

    try:
        while True:
            data = await websocket.receive_json()
            message = data.get("message", "")
            if not message:
                continue

            history.append({"role": "user", "content": message})

            # For streaming, get full response and send it
            # (True streaming with Gemini requires additional setup)
            response = await ai_service.chat_response(message, history[-10:])
            history.append({"role": "assistant", "content": response})

            # Send response word by word to simulate streaming
            words = response.split(" ")
            chunk = ""
            for i, word in enumerate(words):
                chunk += word + " "
                if i % 3 == 0 or i == len(words) - 1:
                    await websocket.send_json({"chunk": chunk, "done": False})
                    chunk = ""

            await websocket.send_json({"chunk": "", "done": True})

    except WebSocketDisconnect:
        pass

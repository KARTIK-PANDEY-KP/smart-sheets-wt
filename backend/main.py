from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import asyncio
import uuid
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.db.models import Chat, ChatMessage
from datetime import datetime

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    role: str
    content: str
    tool_name: Optional[str] = None
    tool_args: Optional[Dict[str, Any]] = None

class ChatRequest(BaseModel):
    messages: List[Message]
    model: str = "gpt-4"
    chat_id: Optional[str] = None

async def generate_chat_response(messages: List[Message], db: Session, chat_id: Optional[str] = None):
    """Simulate streaming chat response with different event types."""
    # Create or get chat
    if not chat_id:
        chat = Chat(
            model="gpt-4",
            chat_metadata=json.dumps({"temperature": 0.7})
        )
        db.add(chat)
        db.flush()
        chat_id = chat.id
    
    # Store user message
    user_message = ChatMessage(
        chat_id=chat_id,
        role="user",
        content=messages[-1].content
    )
    db.add(user_message)
    db.commit()

    # Simulate tool usage
    tool_message = ChatMessage(
        chat_id=chat_id,
        role="tool",
        content="Starting web search...",
        tool_name="web_search",
        tool_args={"query": messages[-1].content}
    )
    db.add(tool_message)
    db.commit()
    
    yield {
        "type": "tool_started",
        "content": "Starting web search..."
    }
    
    await asyncio.sleep(1)  # Simulate tool processing
    
    tool_message.content = "Found relevant information..."
    db.commit()
    
    yield {
        "type": "tool_delta",
        "content": "Found relevant information..."
    }
    
    await asyncio.sleep(0.5)
    
    tool_message.content = "Web search completed."
    db.commit()
    
    yield {
        "type": "tool_finished",
        "content": "Web search completed."
    }
    
    # Simulate LLM response
    response_text = "Based on the search results, I can help you with that. "
    assistant_message = ChatMessage(
        chat_id=chat_id,
        role="assistant",
        content=""
    )
    db.add(assistant_message)
    
    for word in response_text.split():
        assistant_message.content += word + " "
        db.commit()
        yield {
            "type": "delta",
            "content": word + " "
        }
        await asyncio.sleep(0.1)  # Simulate token generation
    
    yield {
        "type": "chat_message_complete",
        "content": ""
    }

@app.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    async def event_generator():
        async for event in generate_chat_response(request.messages, db, request.chat_id):
            yield f"data: {json.dumps(event)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/chats")
def list_chats(db: Session = Depends(get_db)):
    """List all chats with their metadata."""
    chats = db.query(Chat).all()
    return [
        {
            "id": chat.id,
            "title": chat.title,
            "created_at": chat.created_at,
            "model": chat.model,
            "metadata": chat.chat_metadata
        }
        for chat in chats
    ]

@app.get("/chats/{chat_id}/messages")
def get_chat_messages(chat_id: str, db: Session = Depends(get_db)):
    """Get all messages for a specific chat."""
    messages = db.query(ChatMessage).filter(
        ChatMessage.chat_id == chat_id
    ).order_by(ChatMessage.ts).all()
    
    return [
        {
            "role": msg.role,
            "content": msg.content,
            "tool_name": msg.tool_name,
            "tool_args": msg.tool_args,
            "ts": msg.ts
        }
        for msg in messages
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
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
import openai
from openai import AsyncOpenAI
import os

app = FastAPI()

# Initialize OpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],  # Your frontend URL
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
    searchTypes: List[str] = []

async def process_search(search_type: str, query: str, db: Session, chat_id: str) -> str:
    """Process a search request and return results."""
    # This is a placeholder - in a real app, you would implement actual search logic
    await asyncio.sleep(1)  # Simulate search delay
    
    if search_type == "web_search":
        return "Found relevant web results for: " + query
    elif search_type == "interview_search":
        return "Found relevant interview information for: " + query
    return "No results found"

async def generate_chat_response(messages: List[Message], db: Session, chat_id: Optional[str] = None, search_types: List[str] = []):
    """Get response from OpenAI API with tool events."""
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

    search_results = []
    
    # Process each search type if specified
    for search_type in search_types:
        tool_message = ChatMessage(
            chat_id=chat_id,
            role="tool",
            content=search_type.replace("_", " ").title(),
            tool_name=search_type,
            tool_args={"query": messages[-1].content}
        )
        db.add(tool_message)
        db.commit()
        
        yield {
            "type": "tool_started",
            "toolName": search_type,
            "content": search_type.replace("_", " ").title()
        }
        
        # Process search
        result = await process_search(search_type, messages[-1].content, db, chat_id)
        search_results.append(result)
        
        tool_message.content = result
        db.commit()
        
        yield {
            "type": "tool_delta",
            "content": result
        }
        
        yield {
            "type": "tool_finished",
            "toolName": search_type,
            "content": search_type.replace("_", " ").title()
        }
    
    # Get real response from OpenAI
    try:
        # Filter out tool messages and prepare messages for OpenAI
        openai_messages = [
            {"role": m.role, "content": m.content}
            for m in messages
            if m.role in ["user", "assistant"]  # Only include user and assistant messages
        ]
        
        # Add search results to the last user message if any searches were performed
        if search_results:
            search_context = "\n\nSearch Results:\n" + "\n".join(search_results)
            openai_messages[-1]["content"] += search_context
        
        stream = await client.chat.completions.create(
            model="gpt-4",
            messages=openai_messages,
            stream=True
        )
        
        assistant_message = ChatMessage(
            chat_id=chat_id,
            role="assistant",
            content=""
        )
        db.add(assistant_message)
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                assistant_message.content += content
                db.commit()
                yield {
                    "type": "delta",
                    "content": content
                }
                await asyncio.sleep(0.01)  # Small delay to prevent overwhelming the frontend
    
    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        yield {
            "type": "delta",
            "content": "I apologize, but I encountered an error processing your request."
        }
    
    yield {
        "type": "chat_message_complete",
        "content": ""
    }

@app.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    async def event_generator():
        async for event in generate_chat_response(request.messages, db, request.chat_id, request.searchTypes):
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
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
# Initialize Perplexity client (OpenAI-compatible endpoint)
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
PERPLEXITY_API_BASE = os.getenv("PERPLEXITY_API_BASE", "https://api.perplexity.ai")
perplexity_client = AsyncOpenAI(api_key=PERPLEXITY_API_KEY, base_url=PERPLEXITY_API_BASE)

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

async def web_search_tool(query: str, streaming: bool = False):
    system_prompt = "You are a helpful research assistant. Cite sources using [number](url) markdown."
    user_prompt = f"Search: {query}\nReturn relevant links and a summary."
    resp = await perplexity_client.chat.completions.create(
        model="sonar-reasoning-pro",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        stream=streaming,
        max_tokens=1024,
    )
    return resp

async def process_search(search_type: str, query: str, db: Session, chat_id: str, stream_tool=None) -> str:
    """Process a search request and return results."""
    if search_type == "web_search":
        # Stream Perplexity result as tool messages
        result_chunks = []
        stream = await web_search_tool(query, streaming=False)
        async for chunk in stream:
            content = chunk.choices[0].delta.content if chunk.choices[0].delta.content else ""
            if content:
                result_chunks.append(content)
                if stream_tool:
                    await stream_tool(content)
        return "".join(result_chunks)
    elif search_type == "interview_search":
        await asyncio.sleep(1)
        result = "Found relevant interview information for: " + query
        if stream_tool:
            await stream_tool(result)
        return result
    await asyncio.sleep(1)
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
        
        # Stream tool output
        if search_type == "web_search":
            result = ""
            stream = await web_search_tool(messages[-1].content, streaming=True)
            async for chunk in stream:
                content = chunk.choices[0].delta.content if chunk.choices[0].delta.content else ""
                if content:
                    result += content
                    tool_message.content = result
                    db.commit()
                    yield {
                        "type": "tool_delta",
                        "content": content
                    }
            tool_result = result
        else:
            tool_result = await process_search(search_type, messages[-1].content, db, chat_id)
            tool_message.content = tool_result
            db.commit()
            yield {
                "type": "tool_delta",
                "content": tool_result
            }
        
        search_results.append(tool_result)
        yield {
            "type": "tool_finished",
            "toolName": search_type,
            "content": search_type.replace("_", " ").title()
        }
    
    # Get real response from OpenAI
    try:
        # Filter out tool messages and prepare messages for OpenAI
        openai_messages = []
        
        # Add a system message instructing the model to use search results
        system_message = (
            "You are a helpful AI assistant with access to web search results. "
            "If search results are provided, you MUST use them to provide the most accurate and up-to-date information. "
            "When citing sources, use proper Markdown links, like [text](URL). "
            "If there are numbered citations in the search results like [1], [2], etc., maintain those exact references "
            "and include the corresponding URLs in your response as clickable links. "
            "If search results don't contain the answer, clearly state that and provide your best knowledge."
        )
        openai_messages.append({"role": "system", "content": system_message})
        
        # Add previous messages
        for m in messages:
            if m.role in ["user", "assistant"]:  # Only include user and assistant messages
                openai_messages.append({"role": m.role, "content": m.content})
        
        # Add search results to the last user message if any searches were performed
        if search_results:
            # Get the original user query
            original_query = openai_messages[-1]["content"]
            
            # Format search results with clear structure and instructions
            formatted_search_results = "\n\n### Web Search Results:\n"
            for i, result in enumerate(search_results):
                formatted_search_results += f"\n{result}\n"
            
            formatted_search_results += "\n\n### Instructions:\n"
            formatted_search_results += "Please answer the original question using these search results. "
            formatted_search_results += "Maintain any links from the search results in your answer using proper Markdown format: [text](URL). "
            formatted_search_results += "If numbers like [1], [2] appear in the search results, include the same numbered references in your answer, and provide the URLs as clickable links."
            
            # Replace the last user message with a formatted version
            openai_messages[-1]["content"] = (
                f"Original question: {original_query}\n" + formatted_search_results
            )
        
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
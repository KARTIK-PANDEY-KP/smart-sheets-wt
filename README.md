# Chat UI with Streaming Responses

A modern chat application with streaming responses, built using Next.js, FastAPI, and SQLite. This project demonstrates a complete chat interface with real-time message streaming, tool usage tracking, and persistent chat history.

## Demo GIF

![Demo](video/demo.gif)

## Project Structure

```
chat-ui-extracted/
├── backend/
│   ├── app/
│   │   └── db/
│   │       ├── base.py      # Database configuration
│   │       ├── models.py    # SQLAlchemy models
│   │       └── init_db.py   # Database initialization
│   ├── main.py             # FastAPI application
│   └── requirements.txt    # Python dependencies
└── src/                    # Next.js frontend
    ├── app/               # Next.js app directory
    ├── components/        # React components
    │   └── chat/         # Chat-specific components
    │       ├── chat-provider.tsx    # Chat context and state management
    │       ├── composer.tsx         # Message input component
    │       └── message-list.tsx     # Message display component
    └── lib/              # Utility functions and types
```

## Features

### Backend

1. **FastAPI Server**
   - Streaming responses using Server-Sent Events (SSE)
   - RESTful API endpoints for chat management
   - CORS support for frontend integration

2. **Database (SQLite)**
   - Two main tables:
     - `Chats`: Stores chat session metadata
     - `ChatMessages`: Stores individual messages with tool information
   - Support for:
     - Message streaming
     - Tool usage tracking
     - Chat history persistence

3. **API Endpoints**
   - `POST /chat`: Create/continue a chat with streaming responses
   - `GET /chats`: List all chats
   - `GET /chats/{chat_id}/messages`: Get all messages for a specific chat

### Frontend

1. **Next.js Application**
   - Modern React-based UI with TypeScript
   - Real-time message streaming
   - Chat history management
   - Tool usage visualization

2. **Key Components**
   - `ChatProvider`: Manages chat state and streaming
   - `MessageList`: Displays chat messages with streaming support
   - `Composer`: Handles message input and submission

3. **Features**
   - Real-time message streaming
   - Message history persistence
   - Tool usage visualization
   - Responsive design
   - Type-safe development with TypeScript

## Database Schema

### Chats Table
```sql
CREATE TABLE chats (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    title TEXT,
    model TEXT NOT NULL,
    chat_metadata JSON
);
```

### ChatMessages Table
```sql
CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT REFERENCES chats(id) ON DELETE CASCADE,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tool_name TEXT,
    tool_args JSON,
    partial_json JSON
);
```

### Database Design Rationale

#### 1. `Chats` Table (ChatTable)
**Purpose:**  Stores metadata about each chat session. This allows you to track and manage multiple conversations, each potentially with different settings or models.

**Columns:**
- `id` (TEXT, PRIMARY KEY): Unique identifier for each chat session (e.g., UUID).
- `created_at` (TIMESTAMP): When the chat was created.
- `title` (TEXT): Optional, for user-friendly naming or summarizing the chat.
- `model` (TEXT): The AI model used for this chat (e.g., "gpt-4").
- `chat_metadata` (JSON): Any additional metadata (e.g., system prompts, settings, or user preferences).

**Why?**
This table is designed to be extensible and to store all information that is relevant to the chat as a whole, not to individual messages. For example, if you want to know which model was used for a conversation, or when it started, you look here.

#### 2. `ChatMessages` Table (ChatMessagesTable)
**Purpose:**  Stores every message exchanged in a chat, including both user and assistant messages, as well as tool responses.

**Columns:**
- `id` (INTEGER, PRIMARY KEY AUTOINCREMENT): Unique identifier for each message.
- `chat_id` (TEXT, FOREIGN KEY): Links the message to its parent chat in the `Chats` table.
- `ts` (TIMESTAMP): Timestamp for when the message was created.
- `role` (TEXT): Who sent the message (`user`, `assistant`, or `tool`).
- `content` (TEXT): The actual message text or tool output.
- `tool_name` (TEXT, nullable): If the message is from a tool, the tool's name (e.g., `web_search_tool`).
- `tool_args` (JSON, nullable): Arguments passed to the tool, if applicable.
- `partial_json` (JSON, nullable): For streaming or partial responses, stores intermediate data.

**Why?**
- **Context:** This table is designed to capture the full context of a conversation, which is critical for reconstructing the chat history and for feeding the correct context to the AI model (just like ChatGPT does).
- **Flexibility:** By including `role`, `tool_name`, and `tool_args`, you can support not just user/assistant messages but also tool calls and their outputs, which is essential for advanced assistant UIs.
- **Streaming:** The `partial_json` field allows you to store partial or streaming responses, which is important for real-time UIs.

#### What Belongs Where?
- **Chat-level data** (model, title, system prompt, settings): Goes in the `Chats` table.
- **Message-level data** (who said what, when, tool calls, tool results): Goes in the `ChatMessages` table.
- **Summaries, embeddings, or other derived data**: Should NOT be stored in `ChatMessages` unless you need them for context reconstruction. These can be added as new columns or tables if needed later.

#### Why This Matters
- **Reconstructing Context:**  When the assistant needs to generate a response, it often requires the full message history (or a window of it). Storing each message with its role and content allows you to reconstruct the exact context, just like ChatGPT does.
- **Tool Use:**  By tracking tool calls and their results as messages, you can display them in the UI and also use them as context for future model calls.
- **Extensibility:**  This schema is flexible enough to support new features (e.g., citations, message edits, reactions) by adding new columns or related tables.

#### Example: How ChatGPT Handles Context
ChatGPT and similar assistants reconstruct the conversation by pulling all messages (user, assistant, tool) in order, then feeding them to the model as context. This is why it's critical to store every message, its role, and any tool interactions in the `ChatMessages` table.

## Setup Instructions

### Backend Setup

1. Create and activate virtual environment:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Initialize the database:
```bash
python -m app.db.init_db
```

4. Start the server:
```bash
uvicorn main:app --reload
```

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

## API Usage Examples

1. List all chats:
```bash
curl http://localhost:8000/chats
```

2. Get messages for a specific chat:
```bash
curl http://localhost:8000/chats/{chat_id}/messages
```

3. Create a new chat with streaming response:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "model": "gpt-4"
  }'
```

## Streaming Response Format

The chat endpoint streams responses in the following format:

```json
data: {"type": "tool_started", "content": "Starting web search..."}
data: {"type": "tool_delta", "content": "Found relevant information..."}
data: {"type": "tool_finished", "content": "Web search completed."}
data: {"type": "delta", "content": "Based "}
data: {"type": "delta", "content": "on "}
...
data: {"type": "chat_message_complete", "content": ""}
```

## Development Status

- [x] Project Setup & Persistence
  - [x] Repo bootstrap with core components
  - [x] FastAPI app with SSE streaming
  - [x] Database schema and models
  - [x] Database initialization and seeding

- [x] Streaming Tool Implementations
  - [x] Web search tool with Perplexity integration
  - [x] Interview search tool with Pinecone integration
  - [x] Frontend tool call visualization

- [ ] Polishing & Table-Side Integration
  - [ ] Chat Sheet implementation
  - [ ] Theming and styling
  - [ ] Persistence demo
  - [ ] Documentation updates

## Next Steps

1. Implement Chat Sheet component using shadcn
2. Add theming support with Tailwind config
3. Integrate chat with existing spreadsheet
4. Add documentation for tool integration
5. Implement persistence demo

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

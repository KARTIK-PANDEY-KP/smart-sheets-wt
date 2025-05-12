# Next Steps for Day 2

## Backend
- [ ] Implement `web_search_tool`
  - [ ] Use the provided function signature.
  - [ ] Integrate with the Perplexity API (OpenAI-compatible).
  - [ ] Stream deltas as described.
- [ ] Implement `interview_search_tool`
  - [ ] Use the provided function signature.
  - [ ] Integrate with OpenAI embeddings and Pinecone.
  - [ ] Stream snippets as deltas.
- [ ] Refactor `/chat` endpoint
  - [ ] Route to the correct tool function based on user input/tool selection.
  - [ ] Ensure all tool events are streamed as SSE with the correct event types.

## Frontend
- [ ] Update SSE Listener
  - [ ] Detect `tool_started`, `tool_delta`, and `tool_finished` events.
- [ ] Update `<MessageList>` and related components
  - [ ] On `tool_started`, show a grey bubble with a wand icon and "searching…" text.
  - [ ] On `tool_delta`, append streamed content to the bubble.
  - [ ] On `tool_finished`, mark the bubble as complete and show citations.
- [ ] Composer
  - [ ] Ensure the user can continue typing and sending messages while tools are running. 
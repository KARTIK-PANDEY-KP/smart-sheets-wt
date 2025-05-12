"use client";

import React, { createContext, useContext, useReducer, type ReactNode, useCallback } from "react";

type Message = {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  status: "complete" | "running" | "error";
  toolName?: string;
  toolData?: Record<string, any>;
};

type ChatState = {
  messages: Message[];
  isTyping: boolean;
};

type ChatAction =
  | { type: "ADD_MESSAGE"; message: Message }
  | { type: "UPDATE_MESSAGE"; id: string; updates: Partial<Message> }
  | { type: "SET_TYPING"; isTyping: boolean }
  | { type: "APPEND_TO_LAST_MESSAGE"; content: string }
  | { type: "ADD_TOOL_MESSAGE"; toolName: string; content: string }
  | { type: "UPDATE_TOOL_MESSAGE"; content: string };

const initialState: ChatState = {
  messages: [],
  isTyping: false,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.message],
      };
    case "UPDATE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.id ? { ...msg, ...action.updates } : msg
        ),
      };
    case "SET_TYPING":
      return {
        ...state,
        isTyping: action.isTyping,
      };
    case "APPEND_TO_LAST_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((msg, index) =>
          index === state.messages.length - 1
            ? { ...msg, content: msg.content + action.content }
            : msg
        ),
      };
    case "ADD_TOOL_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, {
          id: crypto.randomUUID(),
          role: "tool",
          toolName: action.toolName,
          content: action.content,
          status: "running",
        }],
      };
    case "UPDATE_TOOL_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((msg, index) =>
          msg.role === "tool" && index === state.messages.findLastIndex(m => m.role === "tool")
            ? { ...msg, content: msg.content + action.content }
            : msg
        ),
      };
    default:
      return state;
  }
}

type ChatContextType = {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  sendMessage: (content: string, searchTypes?: string[]) => Promise<void>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const sendMessage = useCallback(async (content: string, searchTypes?: string[]) => {
    // Add user message
    const userMessage = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content,
      status: "complete" as const,
    };
    dispatch({ type: "ADD_MESSAGE", message: userMessage });

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: state.messages.concat(userMessage).map(({ role, content }) => ({
            role,
            content,
          })),
          searchTypes: searchTypes || []
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let currentToolName = "";
      let assistantMessageId = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            
            switch (data.type) {
              case "tool_started":
                currentToolName = data.toolName || data.content.split(" ")[1]?.replace("...", "") || "search";
                if (searchTypes?.includes(currentToolName)) {
                  dispatch({ 
                    type: "ADD_TOOL_MESSAGE", 
                    toolName: currentToolName,
                    content: data.content.replace("...", "").replace("Starting ", "") 
                  });
                }
                break;
              case "tool_delta":
                if (searchTypes?.includes(currentToolName)) {
                  dispatch({ 
                    type: "UPDATE_TOOL_MESSAGE", 
                    content: data.content.replace("...", "") 
                  });
                }
                break;
              case "tool_finished":
                if (searchTypes?.includes(currentToolName)) {
                  dispatch({ 
                    type: "UPDATE_TOOL_MESSAGE", 
                    content: data.content.replace("...", "").replace(" completed.", "") 
                  });
                  // Mark the last tool message as complete
                  const lastToolIndex = state.messages.findLastIndex(m => m.role === "tool");
                  if (lastToolIndex >= 0) {
                    dispatch({
                      type: "UPDATE_MESSAGE",
                      id: state.messages[lastToolIndex].id,
                      updates: { status: "complete" },
                    });
                  }
                }
                break;
              case "delta":
                if (!assistantMessageId) {
                  // Create a new assistant message if there isn't one yet
                  const newAssistantMessage = {
                    id: crypto.randomUUID(),
                    role: "assistant" as const,
                    content: data.content,
                    status: "running" as const,
                  };
                  assistantMessageId = newAssistantMessage.id;
                  dispatch({ type: "ADD_MESSAGE", message: newAssistantMessage });
                } else {
                  dispatch({ type: "APPEND_TO_LAST_MESSAGE", content: data.content });
                }
                break;
              case "chat_message_complete":
                if (assistantMessageId) {
                  dispatch({
                    type: "UPDATE_MESSAGE",
                    id: assistantMessageId,
                    updates: { status: "complete" },
                  });
                }
                break;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // If there's an assistant message already created, mark it as error
      const lastMessageIndex = state.messages.length - 1;
      if (lastMessageIndex >= 0 && state.messages[lastMessageIndex].role === "assistant") {
        dispatch({
          type: "UPDATE_MESSAGE",
          id: state.messages[lastMessageIndex].id,
          updates: { status: "error" },
        });
      }
    }
  }, [state.messages]);

  return (
    <ChatContext.Provider value={{ state, dispatch, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
} 
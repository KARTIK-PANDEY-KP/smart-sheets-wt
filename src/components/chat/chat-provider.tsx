"use client";

import React, { createContext, useContext, useReducer, type ReactNode, useCallback } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "complete" | "running" | "error";
};

type ChatState = {
  messages: Message[];
  isTyping: boolean;
};

type ChatAction =
  | { type: "ADD_MESSAGE"; message: Message }
  | { type: "UPDATE_MESSAGE"; id: string; updates: Partial<Message> }
  | { type: "SET_TYPING"; isTyping: boolean }
  | { type: "APPEND_TO_LAST_MESSAGE"; content: string };

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
    default:
      return state;
  }
}

type ChatContextType = {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  sendMessage: (content: string) => Promise<void>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const sendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMessage = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content,
      status: "complete" as const,
    };
    dispatch({ type: "ADD_MESSAGE", message: userMessage });

    // Add assistant message placeholder
    const assistantMessage = {
      id: crypto.randomUUID(),
      role: "assistant" as const,
      content: "",
      status: "running" as const,
    };
    dispatch({ type: "ADD_MESSAGE", message: assistantMessage });

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
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            
            switch (data.type) {
              case "delta":
                dispatch({ type: "APPEND_TO_LAST_MESSAGE", content: data.content });
                break;
              case "chat_message_complete":
                dispatch({
                  type: "UPDATE_MESSAGE",
                  id: assistantMessage.id,
                  updates: { status: "complete" },
                });
                break;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      dispatch({
        type: "UPDATE_MESSAGE",
        id: assistantMessage.id,
        updates: { status: "error" },
      });
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
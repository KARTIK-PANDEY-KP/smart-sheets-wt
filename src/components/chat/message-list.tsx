"use client";

import React from "react";
import { useChat } from "./chat-provider";
import { cn } from "@/lib/utils";

export function MessageList() {
  const { state } = useChat();

  return (
    <div className="flex flex-col space-y-4 p-4">
      {state.messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex w-full",
            message.role === "user" 
              ? "justify-end" 
              : "justify-start"
          )}
        >
          <div
            className={cn(
              "max-w-[80%] rounded-lg px-4 py-2",
              message.role === "user"
                ? "bg-blue-600 text-white"
                : message.role === "tool"
                  ? "bg-white text-gray-700 text-sm border border-gray-200"
                  : "bg-white text-gray-900 border border-gray-200 shadow-sm"
            )}
          >
            {message.role === "tool" && (
              <div className="text-xs text-gray-500 mb-1 font-semibold">
                {message.toolName || "Tool"}
              </div>
            )}
            <div className="whitespace-pre-wrap">{message.content}</div>
            {message.status === "running" && message.role === "assistant" && (
              <div className="mt-2 flex items-center space-x-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.4s]" />
              </div>
            )}
          </div>
        </div>
      ))}
      {state.isTyping && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg bg-white border border-gray-200 shadow-sm px-4 py-2">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.4s]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
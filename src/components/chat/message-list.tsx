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
            message.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          <div
            className={cn(
              "max-w-[80%] rounded-lg px-4 py-2",
              message.role === "user"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-900"
            )}
          >
            <div className="whitespace-pre-wrap">{message.content}</div>
            {message.status === "running" && (
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
          <div className="max-w-[80%] rounded-lg bg-gray-100 px-4 py-2">
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
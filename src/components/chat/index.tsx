"use client";

import React from "react";
import { ChatProvider } from "./chat-provider";
import { MessageList } from "./message-list";
import { Composer } from "./composer";

export function Chat() {
  return (
    <ChatProvider>
      <div className="flex flex-col h-full max-h-full">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <MessageList />
        </div>
        <div className="shrink-0 sticky bottom-0 bg-blue-50 z-10">
          <Composer />
        </div>
      </div>
    </ChatProvider>
  );
}

export { ChatProvider, useChat } from "./chat-provider";
export { MessageList } from "./message-list";
export { Composer } from "./composer"; 
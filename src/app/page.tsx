"use client";

import { ChatProvider } from "@/components/chat/chat-provider";
import { MessageList } from "@/components/chat/message-list";
import { Composer } from "@/components/chat/composer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <ChatProvider>
        <div className="flex flex-1 flex-col">
          <MessageList />
          <Composer />
        </div>
      </ChatProvider>
    </main>
  );
}

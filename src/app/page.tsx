"use client";

import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <div className="flex h-screen flex-col">
        <header className="border-b px-6 py-3 bg-blue-600 text-white shadow-md">
          <h1 className="text-xl font-semibold">ChatGPT with Search Capability</h1>
        </header>
        <div className="flex-1 bg-blue-50">
          <Chat />
        </div>
      </div>
    </main>
  );
}

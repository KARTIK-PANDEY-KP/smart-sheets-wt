"use client";

import React, { useCallback, useRef } from "react";
import { useChat } from "./chat-provider";
import { cn } from "@/lib/utils";

export function Composer() {
  const { state, sendMessage } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const content = formData.get("input") as string;

      if (!content.trim()) return;

      await sendMessage(content.trim());
      form.reset();
      textareaRef.current?.focus();
    },
    [sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        e.currentTarget.form?.requestSubmit();
      }
    },
    []
  );

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      <div className="relative">
        <textarea
          ref={textareaRef}
          name="input"
          rows={1}
          className={cn(
            "w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2 pr-12 text-black",
            "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          placeholder="Type a message..."
          onKeyDown={handleKeyDown}
          disabled={state.isTyping}
        />
        <button
          type="submit"
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1",
            "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          disabled={state.isTyping}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
          </svg>
        </button>
      </div>
    </form>
  );
} 
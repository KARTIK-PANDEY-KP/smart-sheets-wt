"use client";

import React, { useCallback, useRef, useState } from "react";
import { useChat } from "./chat-provider";
import { cn } from "@/lib/utils";

export function Composer() {
  const { state, sendMessage } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedSearches, setSelectedSearches] = useState<Set<string>>(new Set());

  const toggleSearch = useCallback((searchType: string) => {
    setSelectedSearches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(searchType)) {
        newSet.delete(searchType);
      } else {
        newSet.add(searchType);
      }
      return newSet;
    });
  }, []);

  const submitMessage = useCallback(
    async () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const content = textarea.value.trim();
      if (!content) return;

      // Convert Set to array for sending
      const searchTypes = Array.from(selectedSearches);
      await sendMessage(content, searchTypes.length > 0 ? searchTypes : undefined);
      
      if (formRef.current) {
        formRef.current.reset();
      }
      textarea.focus();
    },
    [sendMessage, selectedSearches]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      submitMessage();
    },
    [submitMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitMessage();
      }
    },
    [submitMessage]
  );

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="border-t p-4">
      <div className="flex flex-col space-y-2">
        <div className="flex space-x-2 px-2">
          <button
            type="button"
            onClick={() => toggleSearch("web_search")}
            className={cn(
              "rounded-md p-1 px-2 text-sm transition-colors",
              selectedSearches.has("web_search")
                ? "bg-blue-600 text-white"
                : "bg-blue-100 text-blue-600 hover:bg-blue-200",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            disabled={state.isTyping}
          >
            Web Search
          </button>
          <button
            type="button"
            onClick={() => toggleSearch("interview_search")}
            className={cn(
              "rounded-md p-1 px-2 text-sm transition-colors",
              selectedSearches.has("interview_search")
                ? "bg-purple-600 text-white"
                : "bg-purple-100 text-purple-600 hover:bg-purple-200",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            disabled={state.isTyping}
          >
            Interview Search
          </button>
        </div>
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
            placeholder={
              selectedSearches.size > 0 
                ? `Search using ${Array.from(selectedSearches).map(s => s.split('_')[0]).join(' & ')}...`
                : "Type a message..."
            }
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
      </div>
    </form>
  );
} 
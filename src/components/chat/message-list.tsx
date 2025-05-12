"use client";

import React, { useState } from "react";
import { useChat } from "./chat-provider";
import { cn } from "@/lib/utils";

// Function to render message content with clickable numeric citations and markdown links
const renderMessageWithLinks = (content: string) => {
  if (!content) return null;
  
  // First, process any regular markdown links: [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const hasMdLinks = markdownLinkRegex.test(content);
  
  // Regular expression to match numeric citations: [1], [2], etc.
  const citationRegex = /\[(\d+)\]/g;
  const hasCitations = citationRegex.test(content);
  
  // If no links of any kind, return content as is
  if (!hasMdLinks && !hasCitations) return content;
  
  // Combined regex to match both markdown links and citations
  const combinedRegex = /(\[([^\]]+)\]\(([^)]+)\))|(\[(\d+)\])/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;
  combinedRegex.lastIndex = 0;
  
  // Process both types of links
  while ((match = combinedRegex.exec(content)) !== null) {
    // Add text before the link/citation
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }
    
    if (match[1]) {
      // This is a markdown link [text](url)
      const text = match[2];
      const url = match[3];
      parts.push(
        <a 
          key={`link-${match.index}`}
          href={url}
          className="text-blue-600 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {text}
        </a>
      );
      
      lastIndex = match.index + match[0].length;
    } else if (match[4]) {
      // This is a citation [n]
      const citationNumber = match[5];
      
      // Make it a clickable link - use the citation number as an anchor
      parts.push(
        <a 
          key={`citation-${match.index}`}
          href={`#citation-${citationNumber}`}
          className="text-blue-600 hover:underline"
          onClick={(e) => {
            e.preventDefault();
            // Find the URL in the message that corresponds to this citation
            const sourceRegex = new RegExp(`\\[${citationNumber}\\]:\\s*(https?://[^\\s]+)`, 'i');
            const sourceMatch = content.match(sourceRegex);
            if (sourceMatch && sourceMatch[1]) {
              window.open(sourceMatch[1], '_blank');
            }
          }}
        >
          {match[0]}
        </a>
      );
      
      lastIndex = match.index + match[0].length;
    }
  }
  
  // Add any remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }
  
  return <>{parts}</>;
};

// Component for collapsible tool message
const CollapsibleToolMessage = ({ message }: { message: { content: string; toolName?: string } }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get preview (first line or first 60 characters)
  const getPreview = () => {
    const firstLine = message.content.split('\n')[0];
    return firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
  };
  
  return (
    <div className="w-full">
      <div 
        className="text-xs text-gray-500 mb-1 font-semibold flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>{message.toolName || "Tool"}</span>
        <span className="text-blue-500 text-xs">
          {isExpanded ? "Show less" : "Show more"}
        </span>
      </div>
      <div className="whitespace-pre-wrap">
        {isExpanded ? (
          renderMessageWithLinks(message.content)
        ) : (
          <div onClick={() => setIsExpanded(true)} className="cursor-pointer hover:bg-gray-50 p-1 rounded">
            {getPreview()}
            {message.content.length > getPreview().length && "..."}
          </div>
        )}
      </div>
    </div>
  );
};

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
            {message.role === "tool" ? (
              <CollapsibleToolMessage message={message} />
            ) : (
              <>
                <div className="whitespace-pre-wrap">
                  {message.role === "assistant" 
                    ? renderMessageWithLinks(message.content)
                    : message.content}
                </div>
                {message.status === "running" && message.role === "assistant" && (
                  <div className="mt-2 flex items-center space-x-2">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.4s]" />
                  </div>
                )}
              </>
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
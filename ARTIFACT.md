# Artifacts

If a tool is called, and there is some writeup stream, it will show in the editor panel

```ts
import openrouter from "@/lib/openrouter";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  generateObject,
  InferUITool,
  stepCountIs,
  streamText,
  tool,
  UIMessage,
  UIMessageStreamWriter,
} from "ai";
import { z } from "zod";

export async function POST(req: Request) {
  const { messages }: { messages: MyUiMessage[] } = await req.json();

  const currentDocumentId =
    messages[messages.length - 1]?.metadata?.documentId || undefined;

  const stream = createUIMessageStream<MyUiMessage>({
    execute: ({ writer }) => {
      const result = streamText({
        model: openrouter("google/gemini-2.5-flash"),
        messages: convertToModelMessages(messages),
        system: [
          "You are a focused chat assistant inside a document workspace.",
          "When the user asks to create, draft, write, outline, summarize into a doc, generate text, or produce any long-form content (e.g., article, blog post, notes, PRD, email, plan, poem, spec), you must call the createDocument tool.",
          "Do not paste the whole document in the chat transcript yourself — delegate to createDocument so the UI can stream it into a document card.",
          "If the user is not asking to create a document and just wants a short answer, answer succinctly in chat.",
          "After calling a tool and receiving results, do not include the written document content in your chat reply. Instead, acknowledge creation (e.g., ‘I created a document’) and invite the user to open it by clicking the document card.",
          "Ask brief clarifying questions only when essential; otherwise make a reasonable assumption and proceed.",
          "If the user asks to change, revise, update, or modify an existing document, ALWAYS create a NEW document reflecting the requested changes. Do NOT attempt to edit in-place or paste the revised document into chat.",
          currentDocumentId &&
            `Current document context: The user is viewing document with id: ${currentDocumentId}. Use this only as reference; still create a NEW document with changes.`,
        ].join("\n"),
        stopWhen: stepCountIs(5),
        tools: { createDocument: createDocumentTool(writer) },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}

const createDocumentTool = (writer: UIMessageStreamWriter<MyUiMessage>) => {
  return tool({
    name: "createDocument",
    description: [
      "Create or draft a well-structured long-form document in Markdown, returning a concise title and the full content.",
      "Use this tool whenever the user asks to write, draft, create, generate, outline, expand, or turn content into a document (e.g., notes, briefs, PRDs, specs, proposals, plans, emails, blog posts, articles, summaries).",
      "The UI streams the result into a document card.",
    ].join(" "),
    inputSchema: z.object({ title: z.string() }),
    outputSchema: z.string(),
    execute: async (input, { messages }) => {
      const documentId = generateId();
      const { textStream } = streamText({
        model: openrouter("openai/gpt-5-mini"),
        system: [
          "You generate a polished, useful document from the conversation context.",
          "Output strictly content (Markdown).",
          "Content requirements:",
          "- Use clean Markdown with headings, short paragraphs, and bullet lists where helpful.",
          "- Include code blocks or tables if they add clarity.",
          "- Avoid YAML front matter and avoid repeating the title as an H1 unless explicitly requested.",
          "- Keep tone clear and professional; match any user-provided tone if specified.",
          "- If requirements are ambiguous, choose sensible defaults and proceed.",
        ].join("\n"),
        messages: [
          ...messages,
          { role: "user", content: "Here is the title: " + input.title },
        ],
      });

      writer.write({
        type: "data-createDocument",
        id: documentId,
        data: {
          status: "processing",
          content: undefined,
          title: input.title,
        },
      });

      let fullContent = "";

      for await (const chunk of textStream) {
        fullContent += chunk;

        writer.write({
          type: "data-createDocument",
          id: documentId,
          data: {
            status: "streaming",
            content: fullContent,
            title: input.title,
          },
        });
      }

      writer.write({
        type: "data-createDocument",
        id: documentId,
        data: {
          status: "success",
          content: fullContent,
          title: input.title,
        },
      });

      return `<created_document id="${documentId}">
        ${fullContent}
        </created_document>`;
    },
  });
};

export type CreateDocumentPart = {
  status: "processing" | "streaming" | "success" | "error";
  content: string | undefined;
  title: string | undefined;
};
export type MyDataTypes = {
  createDocument: CreateDocumentPart;
};

export type MyUiMessage = UIMessage<{ documentId?: string }, MyDataTypes, any>;
```


### ChatPanel

```tsx
"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Response } from "@/components/ai-elements/response";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/source";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Loader } from "@/components/ai-elements/loader";
import { useSharedChatContext } from "../chat-provider";
import DocumentCard from "./document-card";

export const ChatPanel = () => {
  const [input, setInput] = useState("");
  const { chat, openedDocumentId } = useSharedChatContext();
  const { messages, sendMessage, status } = useChat({
    chat,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({
        text: input,
        metadata: { documentId: openedDocumentId || undefined },
      });
      setInput("");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative  size-full h-screen">
      <div className="flex flex-col h-full">
        <Conversation className="h-full">
          <ConversationContent className="h-full">
            {messages.length === 0 && status !== "submitted" && (
              <div className="min-h-full grid place-items-center py-12">
                <div className="text-center max-w-md mx-auto">
                  {/* Icon */}
                  <div className="mx-auto mb-4 h-12 w-12 rounded-xl border border-[#e5e5e5]/15 bg-transparent flex items-center justify-center">
                    <svg
                      className="h-6 w-6 text-[#e5e5e5]/60"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H8l-4 4V5z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  {/* Text */}
                  <h2 className="text-[#e5e5e5] text-lg font-medium">
                    Start a conversation
                  </h2>
                  <p className="text-[#e5e5e5]/70 text-sm mt-1">
                    Ask a question or try one of the suggestions below to begin.
                  </p>

                  {/* Suggestions */}
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    {[
                      "Draft a project brief",
                      "Turn notes into a doc",
                      "Write a blog outline",
                    ].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          sendMessage({
                            text: s,
                            metadata: {
                              documentId: openedDocumentId || undefined,
                            },
                          })
                        }
                        className="rounded-full border border-[#e5e5e5]/15 px-3 py-1 text-xs text-[#e5e5e5]/80 hover:border-[#e5e5e5]/30 hover:text-[#e5e5e5] transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === "assistant" && (
                  <Sources>
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case "source-url":
                          return (
                            <>
                              <SourcesTrigger
                                count={
                                  message.parts.filter(
                                    (part) => part.type === "source-url"
                                  ).length
                                }
                              />
                              <SourcesContent key={`${message.id}-${i}`}>
                                <Source
                                  key={`${message.id}-${i}`}
                                  href={part.url}
                                  title={part.url}
                                />
                              </SourcesContent>
                            </>
                          );
                        case "data-createDocument":
                          return (
                            <DocumentCard
                              key={part.id || ""}
                              title={part.data.title}
                              status={part.data.status}
                              id={part.id || ""}
                            />
                          );
                      }
                    })}
                  </Sources>
                )}
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case "text":
                          return (
                            <Response key={`${message.id}-${i}`}>
                              {part.text}
                            </Response>
                          );
                        case "reasoning":
                          return (
                            <Reasoning
                              key={`${message.id}-${i}`}
                              className="w-full"
                              isStreaming={status === "streaming"}
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>{part.text}</ReasoningContent>
                            </Reasoning>
                          );

                        default:
                          return null;
                      }
                    })}
                  </MessageContent>
                </Message>
              </div>
            ))}
            {status === "submitted" && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className="mt-4">
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            value={input}
          />
          <PromptInputToolbar>
            <PromptInputTools></PromptInputTools>
            <PromptInputSubmit disabled={!input} status={status} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};
```



## Chat Provider Context

```tsx
"use client";

import React, { createContext, useContext, ReactNode, useState } from "react";
import { Chat, useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MyUiMessage } from "@/app/api/chat/route";

interface ChatContextValue {
  chat: Chat<MyUiMessage>;
  clearChat: () => void;
  setOpenedDocumentId: (id: string | null) => void;
  openedDocumentId: string | null;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const chatTransport = () => {
  return new DefaultChatTransport({
    api: "/api/chat",
  });
};

function createChat() {
  return new Chat<MyUiMessage>({
    transport: chatTransport(),
  });
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chat, setChat] = useState(() => createChat());

  const [openedDocumentId, setOpenedDocumentId] = useState<string | null>(null);

  const clearChat = () => {
    setChat(createChat());
  };

  return (
    <ChatContext.Provider
      value={{
        chat,
        clearChat,
        setOpenedDocumentId,
        openedDocumentId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useSharedChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useSharedChatContext must be used within a ChatProvider");
  }
  return context;
}
```




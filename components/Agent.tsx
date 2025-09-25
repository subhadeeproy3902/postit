'use client';

import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { Button } from './ui/button';
import { Copy, Loader, Loader2, RefreshCcwIcon, Send, Sparkles } from 'lucide-react';
import { useAutoResizeTextarea } from '@/hooks/use-auto-resize';
import { Streamdown } from 'streamdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { MyUIMessage } from '@/types/tooltype';
import { DefaultChatTransport } from 'ai';
import { useVisitorId } from '@/hooks/use-visitor-id';
import TextShimmer from './ui/text-shimmer';
import { Action, Actions } from './ai-elements/actions';
import Image from 'next/image';
import { uuid } from 'zod';
import SignInWithLinkedIn from './SignInWithLinkedIn';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from 'next-auth/react';

export default function Agent({
  chatId,
  initialMessages,
}: { chatId?: string | undefined; initialMessages?: MyUIMessage[] } = {}) {
  const [input, setInput] = useState('');
  const [isLive, setIsLive] = useState(false);
  const { visitorId } = useVisitorId();
  const { setIsLiveChat } = useAuth();
  const { data: session } = useSession();
  const initialMessageSentRef = useRef(false);

  // Set isLiveChat based on initialMessages from database
  useEffect(() => {
    setIsLiveChat(isLive);
  }, [isLive, setIsLiveChat]);
  const { status, messages, sendMessage } =
    useChat<MyUIMessage>({
      id: chatId,
      messages: initialMessages, // initial messages if provided
      transport: new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => {
          const lastMessage = messages[messages.length - 1];
          return {
            body: {
              message: lastMessage,
              chatId: chatId,
              visitorId: visitorId,
              session: session,
            },
          };
        },
      }),
    });

  // Check for initial message from Send component
  useEffect(() => {
    if (chatId && (!initialMessages || initialMessages.length === 0) && !initialMessageSentRef.current) {
      const initialMessage = sessionStorage.getItem(`initial_message_${chatId}`);
      if (initialMessage) {
        sessionStorage.removeItem(`initial_message_${chatId}`);
        // Also clean up other session storage items
        sessionStorage.removeItem(`chat_title_${chatId}`);
        sessionStorage.removeItem(`visitor_id_${chatId}`);

        initialMessageSentRef.current = true;
        // Auto-send the initial message without setting it in the input
        setTimeout(() => {
          sendMessage({
            role: 'user',
            parts: [{ type: 'text', text: initialMessage }]
          });
        }, 50); // Reduced timeout for faster response
      }
    }
  }, [chatId, initialMessages, sendMessage]);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });

  const handleSend = () => {
    if (!input.trim() || status === 'streaming' || status === 'submitted') return;

    // On submit, set isLive to true
    setIsLive(true);

    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: input }]
    });
    setInput('');
    adjustHeight(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (status === "ready") {
      textareaRef?.current?.focus();
    }
  }, [status, textareaRef]);

  return (
    <div className="max-w-4xl mx-auto pt-4 pb-2 relative size-full rounded-lg h-screen">
      <div className="flex flex-col h-full">
        <Conversation className='max-w-3xl mx-auto w-full'>
          <ConversationContent>
            {messages.map((message, messageIndex) => {
              // Check if this message is from initialMessages (historical)
              const isHistoricalMessage = initialMessages && messageIndex < initialMessages.length;

              return (
                <Message from={message.role} key={message.id}>
                  <MessageContent variant="flat">
                    {message.parts.map((part, i) => {
                    switch (part.type) {

                      //  "file" | "step-start" | "text" | "reasoning" | "dynamic-tool" | "source-url" | "source-document" | "data-aiImage" | "data-websiteScreenshot" | "data-postToLinkedIn" | "tool-postToLinkedIn" | "tool-getAIGeneratedImage" | "tool-getWebsiteScreenshot"

                      // (parameter) part: UIMessagePart<{
                      // aiImage: {
                      //     loading: boolean;
                      //     image?: string | undefined;
                      //     description?: string | undefined;
                      //     dimensions?: {
                      //         width: number;
                      //         height: number;
                      //     } | undefined;
                      // };
                      // websiteScreenshot: {
                      //     loading: boolean;
                      //     image?: string | undefined;
                      // };
                      // postToLinkedIn: {
                      //     loading: boolean;
                      //     content?: string | undefined;
                      //     images?: string[] | undefined;
                      //     video?: string[] | undefined;
                      // };

                      // data: {"type":"tool-output-available","toolCallId":"fc_d86afbba-f1b5-4def-a03a-cdc1b663d471","output":{"error":"Not authenticated"}}


                      case "tool-postToLinkedIn":
                        return (
                          part.output && 'error' in part.output ? (
                            part.output.error === "Not authenticated" ? (
                              <div className='flex flex-col gap-3' key={i}>
                                <SignInWithLinkedIn className="w-fit" isHistorical={isHistoricalMessage} />
                              </div>
                            ) : (
                              <span key={i} className="text-red-600">
                                Error: {part.output.error}
                              </span>
                            )
                          )
                          : part.output && 'postId' in part.output ? (
                            <span key={i} className="text-green-600">
                              Successfully posted to LinkedIn! Post ID: {part.output.postId}
                            </span>
                          )
                          : null
                        )

                      case "tool-getAIGeneratedImage":
                        return (
                          part.output && (
                            <div key={i} className='flex flex-col gap-2'>
                              <img
                                src={part.output.image_url}
                                alt={part.output.description}
                                width={part.output.dimensions?.width || 512}
                                height={part.output.dimensions?.height || 512}
                              />
                              <p>Desc: {part.output.description}</p>
                            </div>
                          )
                        );

                      case "tool-getWebsiteScreenshot":
                        return (
                          part.output && (
                            <div key={i} className='flex flex-col gap-2'>
                              <img
                                src={part.output.image_url}
                                alt={part.input.url}
                                width={1200}
                                height={630}
                              />
                              <p>URL: {part.input.url}</p>
                            </div>
                          )
                        );

                      case 'text':
                        return (
                          <div key={i} className="flex flex-col gap-2">
                            <Streamdown
                              parseIncompleteMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              shikiTheme={['github-light', 'github-dark']}
                            >{part.text}</Streamdown>
                            {message.role === 'assistant' && (
                              <Actions>
                                <Action
                                  onClick={() =>
                                    navigator.clipboard.writeText(part.text)
                                  }
                                  label="Copy"
                                >
                                  <Copy className="size-3.5" />
                                </Action>
                              </Actions>
                            )}
                          </div>
                        );
                      case 'reasoning':
                        return (
                          <Reasoning
                            key={`${message.id}-${i}`}
                            className="w-full"
                            isStreaming={status === 'streaming' && i === message.parts.length - 1 && message.id === messages.at(-1)?.id}
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>{part.text}</ReasoningContent>
                          </Reasoning>
                        );
                    }
                  })}
                </MessageContent>
              </Message>
            );
            })}
            {status === 'submitted' && (
              <div className="flex items-center gap-1">
                <Loader className='animate-spin size-4' />
                <TextShimmer className="text-sm" duration={1.5} repeatDelay={0.5}>
                  Generating
                </TextShimmer>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <div className="mx-auto w-full max-w-2xl px-2 pt-4">
          <div className="shadow-primary/20 shadow-2xl relative rounded-lg">
            <div className="flex flex-col rounded-lg border bg-gradient-to-b from-secondary/40 to-background p-3 pb-6 relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent to-transparent via-primary pointer-events-none select-none"></div>
              <div className="absolute bottom-0 left-0 w-full h-3 bg-gradient-to-r from-transparent to-transparent via-primary pointer-events-none select-none blur-2xl"></div>
              <textarea
                ref={textareaRef}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                value={input}
                placeholder="Type your message here..."
                className="max-h-32 w-full outline-none resize-none text-sm"
              />
              <div className="mt-auto flex gap-2 absolute bottom-2 right-2 z-10">
                <Button size="sm" variant="ghost" className="cursor-pointer transition-colors! ease-in-out! duration-500! hover:shadow-2xl hover:shadow-blue-700 text-muted-foreground hover:text-foreground"
                ><Sparkles /></Button>
                <Button
                  size="sm"
                  className="cursor-pointer transition-all ease-in duration-300 hover:shadow-2xl hover:shadow-blue-700"
                  onClick={handleSend}
                  disabled={!input.trim() || status === 'streaming' || status == 'submitted'}
                >
                  {status === 'streaming' || status == 'submitted' ? <Loader2 className="animate-spin" /> : <Send />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
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
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { Button } from './ui/button';
import { Copy, Loader, Loader2, Send, Sparkles } from 'lucide-react';
import { useAutoResizeTextarea } from '@/hooks/use-auto-resize';
import { Streamdown } from 'streamdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { MyUIMessage } from '@/types/tooltype';
import { DefaultChatTransport } from 'ai';
import { useVisitorId } from '@/hooks/use-visitor-id';
import TextShimmer from './ui/text-shimmer';
import { Action, Actions } from './ai-elements/actions';
import { upsertMessage } from '@/lib/db/actions';
import { postToLinkedIn } from '@/lib/post';

import SignInWithLinkedIn from './SignInWithLinkedIn';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from 'next-auth/react';
import LinkedInContentCard from '@/components/LinkedInContentCard';
import LinkedInContentPanel from '@/components/LinkedInContentPanel';
import { LinkedInPostSuccess } from '@/components/LinkedInPostSuccess';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from './ErrorBoundary';
import { StreamingIndicator, SmoothTransition } from './LoadingState';

export default function Agent({
  chatId,
  initialMessages,
}: { chatId?: string | undefined; initialMessages?: MyUIMessage[] } = {}) {
  const [input, setInput] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [openedContentId, setOpenedContentId] = useState<string | null>(null);
  const [lastUpdatedContent, setLastUpdatedContent] = useState<{ contentId: string, content: string } | null>(null);

  const { visitorId } = useVisitorId();
  const { setIsLiveChat } = useAuth();
  const { data: session } = useSession();
  const initialMessageSentRef = useRef(false);

  // Set isLiveChat based on initialMessages from database
  useEffect(() => {
    setIsLiveChat(isLive);
  }, [isLive, setIsLiveChat]);



  // Memoized handlers to prevent unnecessary re-renders (optimized for smooth opening)
  const handleOpenContent = useCallback((contentId: string) => {
    // Use requestAnimationFrame for smooth opening
    requestAnimationFrame(() => {
      setOpenedContentId(contentId);
    });
  }, []);

  const handleCloseContent = useCallback(() => {
    // Use requestAnimationFrame for smooth closing
    requestAnimationFrame(() => {
      setOpenedContentId(null);
    });
  }, []);

  const { status, messages, sendMessage, setMessages, addToolResult } =
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
              // Send the last updated content if available
              updatedContent: lastUpdatedContent?.content || null,
              updatedContentId: lastUpdatedContent?.contentId || null,
            },
          };
        },
      }),

      // Handle postToLinkedIn tool calls on the client side
      onToolCall: async ({ toolCall }) => {
        console.log(toolCall)
        if (toolCall.dynamic) {
          return;
        }

        if (toolCall.toolName === 'postToLinkedIn') {
          try {
            // Type assertion for tool input
            const input = toolCall.input as {
              documentId?: string;
              images?: string[];
              video?: string[];
            };

            // Check authentication first
            if (!session?.accessToken || !session?.linkedinId) {
              addToolResult({
                tool: 'postToLinkedIn',
                toolCallId: toolCall.toolCallId,
                output: {
                  success: false,
                  error: "Not authenticated",
                  postId: undefined,
                  postUrl: undefined,
                },
              });
              return;
            }

            // Use the centralized posting logic
            const result = await postToLinkedIn({
              messages,
              openedContentId: openedContentId || undefined,
              toolInput: input,
              session: {
                accessToken: session.accessToken,
                linkedinId: session.linkedinId,
              },
            });

            // Add tool result
            addToolResult({
              tool: 'postToLinkedIn',
              toolCallId: toolCall.toolCallId,
              output: result,
            });

            // Handle success case
            if (result.success) {
              // Clear session storage after successful post
              if (chatId) {
                sessionStorage.removeItem(`pending_post_content_${chatId}`);
                sessionStorage.removeItem(`pending_post_flag_${chatId}`);
                sessionStorage.removeItem(`pending_post_timestamp_${chatId}`);
              }

              // Save success message to database
              if (chatId) {
                try {
                  const successMessage = {
                    id: `post-success-${Date.now()}`,
                    role: 'assistant' as const,
                    parts: [{
                      type: 'text' as const,
                      text: `Your post has been submitted to LinkedIn. Let me know if there's anything else you'd like to tweak or add!`
                    }]
                  };
                  await upsertMessage({ chatId, id: successMessage.id, message: successMessage });
                } catch (dbError) {
                  console.warn('Failed to save success message to database:', dbError);
                }
              }
            }
          } catch (error) {
            console.error('Error in postToLinkedIn onToolCall:', error);
            addToolResult({
              tool: 'postToLinkedIn',
              toolCallId: toolCall.toolCallId,
              output: {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred while posting to LinkedIn",
                postId: undefined,
                postUrl: undefined,
              },
            });
          }
        }
      },
    });

  // Handle when content is saved in the editor - Update content in conversation
  const handleContentSaved = useCallback((updatedContent: string, specificContentId?: string) => {
    // Use the specific content ID if provided, otherwise find the currently opened content ID
    const contentId = specificContentId || openedContentId;

    if (contentId) {
      // Track the last updated content
      setLastUpdatedContent({ contentId, content: updatedContent });

      if (addToolResult) {
        // Use addToolResult to update the content in the conversation
        addToolResult({
          tool: 'updateContent',
          toolCallId: contentId,
          output: {
            content: updatedContent,
            topic: "Updated Content",
            tone: "professional",
            contentId: contentId,
            updated: true,
          }
        });
      }
    }
  }, [openedContentId, addToolResult]);

  // Memoized function to get opened content data
  const getOpenedContentData = useCallback(() => {
    if (!openedContentId) return null;

    for (const message of messages) {
      for (const part of message.parts) {
        if (part.type === 'data-linkedInContent' && part.id === openedContentId) {
          return part.data;
        }
      }
    }
    return null;
  }, [openedContentId, messages]);

  // Memoized opened content data
  const openedContent = useMemo(() => getOpenedContentData(), [getOpenedContentData]);

  // Auto-open editor when content is being generated (highly optimized)
  const autoOpenContentId = useMemo(() => {
    if (openedContentId) return null; // Don't override if already open

    // Find the latest streaming/processing content
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      for (let j = message.parts.length - 1; j >= 0; j--) {
        const part = message.parts[j];
        if (part.type === 'data-linkedInContent' &&
          (part.data.status === 'processing' || part.data.status === 'streaming')) {
          return part.id || `${message.id}-${j}`;
        }
      }
    }
    return null;
  }, [messages, openedContentId]);

  // Apply auto-open with minimal re-renders
  useEffect(() => {
    if (autoOpenContentId && !openedContentId) {
      // Use requestAnimationFrame for smooth opening
      requestAnimationFrame(() => {
        setOpenedContentId(autoOpenContentId);
      });
    }
  }, [autoOpenContentId, openedContentId]);



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

  // Check for pending post after LinkedIn authentication
  useEffect(() => {
    if (chatId && session?.accessToken && !initialMessageSentRef.current) {
      const pendingContent = sessionStorage.getItem(`pending_post_content_${chatId}`);
      const pendingFlag = sessionStorage.getItem(`pending_post_flag_${chatId}`);
      const pendingTimestamp = sessionStorage.getItem(`pending_post_timestamp_${chatId}`);

      if (pendingContent && pendingFlag === 'true' && pendingTimestamp) {
        // Check if the timestamp is recent (within 10 minutes)
        const timestamp = parseInt(pendingTimestamp);
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;

        if (now - timestamp < tenMinutes) {
          // Clean up session storage
          sessionStorage.removeItem(`pending_post_content_${chatId}`);
          sessionStorage.removeItem(`pending_post_flag_${chatId}`);
          sessionStorage.removeItem(`pending_post_timestamp_${chatId}`);

          // Add assistant message asking if user wants to post
          setTimeout(async () => {
            const assistantMessage = {
              id: `post-prompt-${Date.now()}`,
              role: 'assistant' as const,
              parts: [{ type: 'text' as const, text: 'Would you like to post it now?' }]
            };

            // Add to UI
            setMessages(prevMessages => [
              ...prevMessages,
              assistantMessage
            ]);

            // Save to database
            try {
              await upsertMessage({
                id: assistantMessage.id,
                chatId: chatId,
                message: assistantMessage,
              });
            } catch (error) {
              console.error('Failed to save assistant message to database:', error);
            }
          }, 1000); // Give time for the page to load
        }
      }
    }
  }, [chatId, session?.accessToken, setMessages]);

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
      parts: [{ type: 'text', text: input }],
      metadata: { documentId: openedContentId || undefined }
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
    <ErrorBoundary>
      <div className="relative size-full h-screen overflow-hidden pt-10">
        <div className="flex h-full">
          {/* Chat Area */}
          <motion.div
            className="flex flex-col h-full"
            initial={{ width: "100%" }}
            animate={{
              width: openedContentId ? "50%" : "100%",
            }}
            transition={{
              duration: 0.25, // Much faster transition
              ease: [0.25, 0.46, 0.45, 0.94], // Optimized easing for smoother feel
            }}
            style={{ willChange: 'width' }} // Optimize for animations
          >
            <div className="max-w-4xl mx-auto pt-4 pb-2 relative size-full rounded-lg h-full">
              <div className="flex flex-col h-full">
                <Conversation className='max-w-3xl mx-auto w-full'>
                  <ConversationContent>
                    {messages.map((message, messageIndex) => {
                      // Check if this message is from initialMessages (historical)
                      const isHistoricalMessage = initialMessages && messageIndex < initialMessages.length;

                      return (
                        <div key={message.id}>
                          {message.role === "assistant" && (
                            <div className="mb-4">
                              {message.parts.map((part, i) => {
                                switch (part.type) {
                                  case "data-linkedInContent":
                                    return (
                                      <LinkedInContentCard
                                        key={`${message.id}-${i}`}
                                        id={part.id || `${message.id}-${i}`}
                                        title={part.data.topic ? `LinkedIn Post: ${part.data.topic}` : "LinkedIn Content"}
                                        status={part.data.status}
                                        onActivate={handleOpenContent}
                                        isActive={openedContentId === (part.id || `${message.id}-${i}`)}
                                      />
                                    );
                                  default:
                                    return null;
                                }
                              })}
                            </div>
                          )}
                          <Message from={message.role}>
                            <MessageContent variant="flat">
                              {message.parts.map((part, i) => {
                                switch (part.type) {

                                  //  "file" | "step-start" | "text" | "reasoning" | "dynamic-tool" | "source-url" | "source-document" | "data-aiImage" | "data-websiteScreenshot" | "data-postToLinkedIn" | "tool-postToLinkedIn" | "tool-getAIGeneratedImage" | "tool-getWebsiteScreenshot"

                                  case "tool-postToLinkedIn":
                                    return (
                                      part.output && 'error' in part.output ? (
                                        part.output.error === "Not authenticated" ? (
                                          <div className='flex flex-col gap-3' key={i}>
                                            <SignInWithLinkedIn
                                              className="w-fit"
                                              isHistorical={isHistoricalMessage}
                                              contentToPost={part.input.documentId}
                                              chatId={chatId}
                                            />
                                          </div>
                                        ) : (
                                          <span key={i} className="text-red-600">
                                            Error: {(part.output as { error?: string }).error || 'Unknown error'}
                                          </span>
                                        )
                                      )
                                        : part.output && (() => {
                                          const output = part.output as { success?: boolean; postId?: string; postUrl?: string; error?: string };
                                          return output.success && output.postId && output.postId !== "handled-by-ontoolcall" && (
                                            <LinkedInPostSuccess
                                              key={i}
                                              postId={output.postId}
                                              postUrl={output.postUrl || `https://www.linkedin.com/feed/update/${output.postId}/`}
                                            />
                                          );
                                        })()
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

                                  case 'data-linkedInContent':
                                    // This is now handled in the Sources section above
                                    return null;
                                }
                              })}
                            </MessageContent>
                          </Message>
                        </div>
                      );
                    })}
                    <SmoothTransition isVisible={status === 'submitted'}>
                      <div className="flex items-center gap-1">
                        <StreamingIndicator isStreaming={status === 'submitted'} message="Processing your request..." />
                      </div>
                    </SmoothTransition>
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
                          className="cursor-pointer transition-all ease-in-out duration-300 hover:shadow-2xl hover:shadow-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={handleSend}
                          disabled={!input.trim() || status === 'streaming' || status == 'submitted'}
                        >
                          <div className="transition-all duration-200 ease-in-out">
                            {status === 'streaming' || status == 'submitted' ?
                              <Loader2 className="animate-spin transition-transform duration-200" /> :
                              <Send className="transition-transform duration-200 hover:scale-110" />
                            }
                          </div>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Editor Panel */}
          <AnimatePresence mode="wait">
            {openedContentId && openedContent && (
              <motion.div
                className="w-1/2 h-full"
                initial={{ x: "100%", opacity: 0, scale: 0.95 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: "100%", opacity: 0, scale: 0.95 }}
                transition={{
                  duration: 0.25, // Much faster opening
                  ease: [0.25, 0.46, 0.45, 0.94], // Optimized easing
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.2 }
                }}
                style={{ willChange: 'transform, opacity' }} // Optimize for animations
              >
                <LinkedInContentPanel
                  id={openedContentId}
                  title={openedContent.topic ? `LinkedIn Post: ${openedContent.topic}` : "LinkedIn Content"}
                  content={openedContent.content}
                  topic={openedContent.topic}
                  tone={openedContent.tone}
                  status={openedContent.status}
                  onClose={handleCloseContent}
                  chatId={chatId}
                  messageId={(() => {
                    // Find the message that contains this content
                    for (const message of messages) {
                      for (const part of message.parts) {
                        if (part.type === 'data-linkedInContent' && part.id === openedContentId) {
                          return message.id;
                        }
                      }
                    }
                    return undefined;
                  })()}
                  messages={messages}
                  setMessages={setMessages}
                  onContentSaved={handleContentSaved}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ErrorBoundary>
  );
};
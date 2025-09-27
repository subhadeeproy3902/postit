"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Agent from "@/components/Agent";
import { loadChat } from "@/lib/db/actions";
import { checkChatAccess } from "@/lib/chat-server-actions";
import { useVisitorId } from "@/hooks/use-visitor-id";
import { MyUIMessage } from "@/types/tooltype";
import { Loader2 } from "lucide-react";
import { ModeToggle } from "@/components/ThemeToggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingState } from "@/components/LoadingState";
import NotFound from "@/components/NotFound";
import UserButton from "@/components/UserButton";

export default function AIChatPage() {
  const params = useParams();
  const chatId = params.id as string;
  const { visitorId, isLoading: visitorLoading } = useVisitorId();
  const [messages, setMessages] = useState<MyUIMessage[]>([]);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  // Check if this is a new chat from sessionStorage
  const storedVisitorId =
    typeof window !== "undefined"
      ? sessionStorage.getItem(`visitor_id_${chatId}`)
      : null;
  const initialMessage =
    typeof window !== "undefined"
      ? sessionStorage.getItem(`initial_message_${chatId}`)
      : null;
  const isNewChat = storedVisitorId && initialMessage;

  useEffect(() => {
    const checkAccessAndLoadChat = async () => {
      if (visitorLoading) return;

      // Prevent multiple simultaneous requests
      if (isLoadingRef.current) {
        console.log('Already loading, skipping request');
        return;
      }

      // Validate chatId format first to prevent invalid requests
      if (!chatId || typeof chatId !== 'string' || chatId.trim().length === 0) {
        console.warn('Invalid chatId:', chatId);
        setHasAccess(false);
        setError("Invalid chat ID");
        setIsLoading(false);
        return;
      }

      isLoadingRef.current = true;

      // If this is a new chat, set access immediately
      if (isNewChat) {
        setHasAccess(true);
        setMessages([]);
        setIsLoading(false);
        return;
      }

      try {
        // For existing chats, check database access
        const accessResult = await checkChatAccess(
          chatId,
          visitorId || undefined
        );

        if (!accessResult.hasAccess) {
          setHasAccess(false);
          setError(accessResult.error || "No chat found");
          setIsLoading(false);
          return;
        }

        setHasAccess(true);

        // Load chat messages
        const chatMessages = await loadChat(chatId);
        setMessages(chatMessages);
      } catch (err) {
        console.error("Error loading chat:", err);
        setError("Failed to load chat");
        setHasAccess(false);
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    };

    // Debounce the function to prevent rapid successive calls
    const timeoutId = setTimeout(checkAccessAndLoadChat, 100);
    return () => {
      clearTimeout(timeoutId);
      isLoadingRef.current = false;
    };
  }, [chatId, visitorId, visitorLoading, isNewChat]);

  // For new chats, show immediately without loading screen
  if (isNewChat && hasAccess) {
    return (
      <ErrorBoundary>
        <header className="inline-flex z-50 h-10 fixed w-full bg-background">
          <div className="flex w-full items-center justify-between px-4 lg:px-6 bg-background">
            <div className="flex items-center gap-1 lg:gap-2">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground cursor-pointer" />
              <ModeToggle />
            </div>
            <UserButton />
          </div>
        </header>
        <ErrorBoundary fallback={<LoadingState message="Failed to load new chat" fullScreen />}>
          <Agent chatId={chatId} initialMessages={[]} />
        </ErrorBoundary>
      </ErrorBoundary>
    );
  }

  // Only show loading for existing chats
  if (visitorLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin size-10 text-primary" />
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return <NotFound />;
  }

  return (
    <ErrorBoundary>
      <header className="inline-flex z-50 h-10 fixed w-full bg-background">
        <div className="flex w-full items-center justify-between px-4 lg:px-6 bg-background">
          <div className="flex items-center gap-1 lg:gap-2">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground cursor-pointer" />
            <ModeToggle />
          </div>
          <UserButton />
        </div>
      </header>
      <ErrorBoundary fallback={<LoadingState message="Failed to load chat" fullScreen />}>
        <Agent chatId={chatId} initialMessages={messages} />
      </ErrorBoundary>
    </ErrorBoundary>
  );
}

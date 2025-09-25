"use client";

import { useVisitorId } from "@/hooks/use-visitor-id";
import SendComponent from "@/components/Send";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/ThemeToggle";
import UserButton from "@/components/UserButton";

export default function ChatPage() {
  const { visitorId } = useVisitorId();
  return (
    <>
      <header className="inline-flex z-50 h-10 absolute">
        <div className="flex w-full items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-1 lg:gap-2">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground cursor-pointer" />
            <ModeToggle />
          </div>
        </div>
      </header>
      <UserButton />
      <div className="h-screen overflow-hidden flex items-center justify-center bg-background">
        <SendComponent visitorId={visitorId} />
      </div>
    </>
  );
}

"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { redirect, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Plus, Sparkles, Trash2, MoreHorizontal, Share, Edit, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import SearchInput from "./Search";
import { useTheme } from "next-themes";
import { useVisitorId } from "@/hooks/use-visitor-id";
import { getChatsByVisitorId, deleteChat } from "@/lib/db/actions";
import { ShareDialog } from "@/components/share-dialog";
import { RenameDialog } from "@/components/rename-dialog";

interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  isPublic: boolean;
}

interface GroupedChats {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { theme } = useTheme();
  const { visitorId, isLoading } = useVisitorId();
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [openDropdowns, setOpenDropdowns] = useState<{ [chatId: string]: boolean }>({});
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (visitorId) {
      loadChats();
    }
  }, [visitorId]);

  // Refresh chats when pathname changes (to detect new chats)
  useEffect(() => {
    if (visitorId && pathname && pathname !== '/') {
      // Extract chat ID from pathname
      const chatId = pathname.slice(1); // Remove leading slash

      // Check if this chat ID exists in our current chat list
      const chatExists = allChats.some(chat => chat.id === chatId);

      // If the chat doesn't exist and it looks like a valid chat ID, refresh the list
      if (!chatExists && chatId.length > 0 && !chatId.includes('/')) {
        // Add a small delay to ensure the chat has been created in the database
        const timeoutId = setTimeout(() => {
          loadChats();
        }, 500);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [pathname, visitorId, allChats]);

  // Periodic refresh to catch any missed updates (every 30 seconds when tab is active)
  useEffect(() => {
    if (!visitorId) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became active, refresh chats
        loadChats();
      }
    };

    // Refresh when tab becomes visible
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic refresh every 30 seconds when tab is active
    const intervalId = setInterval(() => {
      if (!document.hidden) {
        loadChats();
      }
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [visitorId]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Filter chats based on search query
  const filteredChats = searchQuery.trim()
    ? allChats.filter(chat =>
      chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : allChats;

  const loadChats = async () => {
    if (!visitorId) return;
    try {
      const chatData = await getChatsByVisitorId(visitorId);
      setAllChats(chatData.map(chat => ({
        ...chat,
        title: chat.title || 'New Chat',
        isPublic: chat.isPublic || false,
        createdAt: new Date(chat.createdAt)
      })));
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const handleNewChat = async () => {
    redirect('/');
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!visitorId) return;
    router.push('/');
    setAllChats(prev => prev.filter(chat => chat.id !== chatId));
    deleteChat(chatId, visitorId).catch(error => {
      loadChats();
    });
  };

  const groupChatsByDate = (chats: Chat[]): GroupedChats => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups = chats.reduce((groups: GroupedChats, chat) => {
      const chatDate = new Date(chat.createdAt);

      if (chatDate >= today) {
        groups.today.push(chat);
      } else if (chatDate >= yesterday) {
        groups.yesterday.push(chat);
      } else if (chatDate >= lastWeek) {
        groups.lastWeek.push(chat);
      } else if (chatDate >= lastMonth) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    }, {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: []
    });

    // Sort each group in descending order (latest first)
    const sortByDateDesc = (a: Chat, b: Chat) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    groups.today.sort(sortByDateDesc);
    groups.yesterday.sort(sortByDateDesc);
    groups.lastWeek.sort(sortByDateDesc);
    groups.lastMonth.sort(sortByDateDesc);
    groups.older.sort(sortByDateDesc);

    return groups;
  };

  const groupedChats = groupChatsByDate(filteredChats);

  const renderChatGroup = (title: string, chats: Chat[]) => {
    if (chats.length === 0) return null;

    return (
      <SidebarGroup key={title}>
        <SidebarGroupLabel className="text-muted-foreground/80">{title}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {chats.map((chat) => (
              <SidebarMenuItem key={chat.id} className="flex justify-between items-center group">
                <Link
                  href={`/${chat.id}`}
                  className="w-full h-8 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer/menu-button flex items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-hidden ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">{chat.title}</span>
                  </div>
                </Link>
                <DropdownMenu
                  open={openDropdowns[chat.id] || false}
                  onOpenChange={(isOpen) => setOpenDropdowns(prev => ({ ...prev, [chat.id]: isOpen }))}
                >
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className={`bg-transparent hover:bg-transparent opacity-0 group-hover:opacity-100 ${openDropdowns[chat.id] && 'opacity-100'}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <ShareDialog
                      chatId={chat.id}
                      isPublic={chat.isPublic}
                      onPrivacyChange={() => loadChats()}
                      trigger={
                        <button className="flex items-center w-full px-2 py-1.5 text-sm hover:bg-accent rounded-sm">
                          <Share className="h-4 w-4 mr-2" />
                          Share
                        </button>
                      }
                    />
                    <RenameDialog
                      chatId={chat.id}
                      currentTitle={chat.title}
                      onTitleChange={() => loadChats()}
                      trigger={
                        <button className="flex items-center w-full px-2 py-1.5 text-sm hover:bg-accent rounded-sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Rename
                        </button>
                      }
                    />
                    <DropdownMenuItem>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="flex items-center w-full px-2 py-1.5 text-sm hover:bg-accent rounded-sm text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this chat? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteChat(chat.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  if (isLoading) {
    return (
      <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader>
          <Link href="/" className="px-2 py-2 flex items-center w-full gap-2">
            <img
              src="/logo.svg"
              alt="Logo"
              width={1000}
              height={1000}
              className="h-5 w-5 rounded-full"
            />
            <span className="bg-primary from-foreground to-primary via-blue-200 bg-clip-text text-2xl font-semibold text-transparent md:text-xl dark:bg-gradient-to-b">
              Post It
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <div className="p-4">Loading...</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <Link href="/" className="px-2 py-2 flex items-center w-full gap-2">
          <img
            src="/logo.svg"
            alt="Logo"
            width={1000}
            height={1000}
            className="h-5 w-5 rounded-full"
          />
          <span className="bg-primary from-foreground to-primary via-blue-200 bg-clip-text text-2xl font-semibold text-transparent md:text-xl dark:bg-gradient-to-b">
            Post It
          </span>
        </Link>

        <div className="px-2 py-2">
          <Button
            size="sm"
            onClick={handleNewChat}
            className="w-full justify-start gap-2"
          >
            <Plus />
            Start new chat
          </Button>
        </div>

        <div className="px-2 pb-2">
          <SearchInput onSearch={handleSearch} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <div className="px-2">
          {filteredChats.length === 0 ? (
            <NoChat
              text={searchQuery.trim() ? "No chats found" : "No chats yet"}
              subtext={searchQuery.trim() ? "Try a different search term" : "Start a new chat to begin"}
              theme={theme}
            />
          ) : (
            <>
              {renderChatGroup('Today', groupedChats.today)}
              {renderChatGroup('Yesterday', groupedChats.yesterday)}
              {renderChatGroup('Last Week', groupedChats.lastWeek)}
              {renderChatGroup('Last Month', groupedChats.lastMonth)}
              {renderChatGroup('Older', groupedChats.older)}
            </>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

function NoChat({ text, subtext, theme }:
  {
    text: string;
    subtext: string;
    theme: string | undefined;
  }
) {
  return (
    <div className={`relative overflow-hidden p-8 ${theme === "dark" ? "black-card" : "white-card"} rounded-sm gradient-before-rounded-sm flex flex-col gap-3 items-center text-center bg-gradient-to-b from-background via-secondary/20 to-primary/10`}>
      <div className={`relative h-15 aspect-square flex items-center justify-center overflow-hidden gradient-before-rounded-sm rounded-sm bg-gradient-to-br from-primary/50 via-background to-primary/50  ${theme === "dark" ? "black-card" : "white-card"}`}>
        <Sparkles className="text-primary w-5 h-5" />
      </div>
      <div className="flex flex-col gap-0">
        <h2 className="text-lg">
          {text}
        </h2>
        <p className="text-xs text-foreground/50">
          {subtext}
        </p>
      </div>
    </div>
  );
}

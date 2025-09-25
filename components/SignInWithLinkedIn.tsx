"use client"

import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export default function SignInWithLinkedIn(
  { className, isHistorical = false }: { className?: string; isHistorical?: boolean }
) {
  const { user, isAuthenticated, hasLinkedInAccess, isLiveChat, isLoading } = useAuth();

  // If session is still loading in a live chat, show loading state
  if (isLoading && isLiveChat) {
    return (
      <div className={cn('flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg', className)}>
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-blue-600">Checking authentication...</span>
      </div>
    );
  }

  // If it's historical (from initialMessages), always show yellow text
  if (isHistorical) {
    return (
      <span className="text-sm text-yellow-600">User needed to Sign In</span>
    );
  }

  // If user has LinkedIn access, show user info
  if (hasLinkedInAccess && user) {
    return (
      <div className={cn('flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg', className)}>
        {user.image && (
          <img
            src={user.image}
            alt={user.name || 'User'}
            className="w-8 h-8 rounded-full"
          />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-green-800">
            {user.name || 'LinkedIn User'}
          </span>
          <span className="text-xs text-green-600">Connected</span>
        </div>
      </div>
    );
  }

  // If isLiveChat is true (user submitted), show sign in button
  if (isLiveChat) {
    return (
      <button
        className={cn('linkedin-btn', className)}
        onClick={() => signIn('linkedin')}
      >
        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><path fill="#ffffff" d="M12.225 12.225h-1.778V9.44c0-.664-.012-1.519-.925-1.519-.926 0-1.068.724-1.068 1.47v2.834H6.676V6.498h1.707v.783h.024c.348-.594.996-.95 1.684-.925 1.802 0 2.135 1.185 2.135 2.728l-.001 3.14zM4.67 5.715a1.037 1.037 0 01-1.032-1.031c0-.566.466-1.032 1.032-1.032.566 0 1.031.466 1.032 1.032 0 .566-.466 1.032-1.032 1.032zm.889 6.51h-1.78V6.498h1.78v5.727zM13.11 2H2.885A.88.88 0 002 2.866v10.268a.88.88 0 00.885.866h10.226a.882.882 0 00.889-.866V2.865a.88.88 0 00-.889-.864z"></path></g></svg>
        Continue with LinkedIn
      </button>
    );
  }

  // Fallback - show yellow text
  return (
    <span className="text-sm text-yellow-600">User needed to Sign In</span>
  );
}
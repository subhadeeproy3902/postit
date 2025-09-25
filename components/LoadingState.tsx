"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
}

export function LoadingState({ 
  message = "Loading...", 
  size = 'md', 
  className,
  fullScreen = false 
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50'
    : 'flex items-center justify-center p-4';

  return (
    <div className={cn(containerClasses, className)}>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  );
}

// Skeleton loading components
export function MessageSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
        <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <MessageSkeleton key={i} />
      ))}
    </div>
  );
}

// Optimistic loading wrapper
interface OptimisticWrapperProps {
  isLoading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function OptimisticWrapper({
  isLoading,
  children,
  fallback = <LoadingState size="sm" message="Processing..." />
}: OptimisticWrapperProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center transition-all duration-200 ease-in-out">
          {fallback}
        </div>
      )}
    </div>
  );
}

// Smooth streaming indicator
interface StreamingIndicatorProps {
  isStreaming: boolean;
  message?: string;
}

export function StreamingIndicator({ isStreaming, message = "Generating..." }: StreamingIndicatorProps) {
  if (!isStreaming) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in-0 duration-300">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
      </div>
      <span>{message}</span>
    </div>
  );
}

// Smooth transition wrapper
interface SmoothTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  className?: string;
}

export function SmoothTransition({ children, isVisible, className }: SmoothTransitionProps) {
  return (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
        className
      )}
    >
      {children}
    </div>
  );
}

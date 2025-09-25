"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  linkedinId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  hasLinkedInAccess: boolean;
  isLoading: boolean;
  accessToken?: string;
  isLiveChat: boolean;
  setIsLiveChat: (isLive: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ 
  children, 
  initialIsLiveChat = true 
}: { 
  children: React.ReactNode;
  initialIsLiveChat?: boolean;
}) {
  const { data: session, status } = useSession();
  const [isLiveChat, setIsLiveChat] = useState(initialIsLiveChat);

  const isLoading = status === 'loading';
  const isAuthenticated = !!session?.user;
  const hasLinkedInAccess = !!session?.user && !!session?.accessToken;

  const user: AuthUser | null = session?.user ? {
    id: session.user.id || session.user.email || '',
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    linkedinId: session.linkedinId,
  } : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        hasLinkedInAccess,
        isLoading,
        accessToken: session?.accessToken,
        isLiveChat,
        setIsLiveChat,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

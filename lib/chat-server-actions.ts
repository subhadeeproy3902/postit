'use server';

import { getChatWithAccess } from '@/lib/db/actions';
import { ChatAccessResult } from '@/lib/chat-security';

export async function checkChatAccess(
  chatId: string, 
  visitorId?: string
): Promise<ChatAccessResult> {
  try {
    const chat = await getChatWithAccess(chatId, visitorId);
    
    if (!chat) {
      return {
        hasAccess: false,
        error: 'Chat not found or access denied'
      };
    }

    return {
      hasAccess: true,
      chat: {
        id: chat.id,
        visitorId: chat.visitorId,
        title: chat.title || 'New Chat',
        isPublic: chat.isPublic || false,
        createdAt: new Date(chat.createdAt)
      }
    };
  } catch (error) {
    console.error('Error checking chat access:', error);
    return {
      hasAccess: false,
      error: 'Internal server error'
    };
  }
}

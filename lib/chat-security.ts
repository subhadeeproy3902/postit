export interface ChatAccessResult {
  hasAccess: boolean;
  chat?: {
    id: string;
    visitorId: string;
    title: string;
    isPublic: boolean;
    createdAt: Date;
  };
  error?: string;
}

export function isOwner(chat: { visitorId: string }, visitorId?: string): boolean {
  return chat.visitorId === visitorId;
}

export function canAccess(chat: { isPublic: boolean; visitorId: string }, visitorId?: string): boolean {
  return chat.isPublic || chat.visitorId === visitorId;
}

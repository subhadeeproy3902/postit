"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chats, messages, parts } from "@/lib/db/schema";
import { MyUIMessage } from "@/types/tooltype";
import {
  mapUIMessagePartsToDBParts,
  mapDBPartToUIMessagePart,
} from "@/lib/message-mapping";

export const createChat = async (visitorId: string, title?: string, id?: string) => {
  const chatData = {
    visitorId,
    title: title || "New Chat",
    ...(id && { id })
  };

  const [{ id: chatId }] = await db.insert(chats).values(chatData).returning();
  return chatId;
};

export const upsertMessage = async ({
  chatId,
  message,
  id,
}: {
  id: string;
  chatId: string;
  message: MyUIMessage;
}) => {
  const mappedDBUIParts = mapUIMessagePartsToDBParts(message.parts, id);

  await db.transaction(async (tx) => {
    await tx
      .insert(messages)
      .values({
        chatId,
        role: message.role,
        id,
      })
      .onConflictDoUpdate({
        target: messages.id,
        set: {
          chatId,
        },
      });

    await tx.delete(parts).where(eq(parts.messageId, id));
    if (mappedDBUIParts.length > 0) {
      await tx.insert(parts).values(mappedDBUIParts);
    }
  });
};

export const loadChat = async (chatId: string): Promise<MyUIMessage[]> => {
  const result = await db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    with: {
      parts: {
        orderBy: (parts, { asc }) => [asc(parts.order)],
      },
    },
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
  });

  return result.map((message) => ({
    id: message.id,
    role: message.role,
    parts: message.parts.map((part) => mapDBPartToUIMessagePart(part)),
  }));
};

export const getChats = async (visitorId: string) => {
  return await db.select().from(chats).where(eq(chats.visitorId, visitorId)).orderBy(chats.createdAt);
};

export const getChatsByVisitorId = async (visitorId: string) => {
  return await db.select().from(chats).where(eq(chats.visitorId, visitorId)).orderBy(chats.createdAt);
};

export const getPublicChat = async (chatId: string) => {
  const [chat] = await db.select().from(chats).where(
    and(eq(chats.id, chatId), eq(chats.isPublic, true))
  );
  return chat;
};

export const getChatWithAccess = async (chatId: string, visitorId?: string) => {
  const [chat] = await db.select().from(chats).where(eq(chats.id, chatId));

  if (!chat) return null;

  // If chat is public, allow access
  if (chat.isPublic) return chat;

  // If chat is private, only allow access to the owner
  if (chat.visitorId === visitorId) return chat;

  return null;
};

export const deleteChat = async (chatId: string, visitorId: string) => {
  await db.delete(chats).where(
    and(eq(chats.id, chatId), eq(chats.visitorId, visitorId))
  );
};

export const updateChatTitle = async (chatId: string, title: string, visitorId: string) => {
  await db.update(chats)
    .set({ title })
    .where(and(eq(chats.id, chatId), eq(chats.visitorId, visitorId)));
};

export const updateChatPrivacy = async (chatId: string, isPublic: boolean, visitorId: string) => {
  await db.update(chats)
    .set({ isPublic })
    .where(and(eq(chats.id, chatId), eq(chats.visitorId, visitorId)));
};

export const searchChats = async (visitorId: string, searchTerm: string) => {
  return await db.select().from(chats)
    .where(
      and(
        eq(chats.visitorId, visitorId),
        // Search in title (you can extend this to search in message content later)
        sql`${chats.title} ILIKE ${`%${searchTerm}%`}`
      )
    )
    .orderBy(chats.createdAt);
};

export const deleteMessage = async (messageId: string) => {
  await db.transaction(async (tx) => {
    const [targetMessage] = await tx
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!targetMessage) return;

    // Delete all messages after this one in the chat
    await tx
      .delete(messages)
      .where(
        and(
          eq(messages.chatId, targetMessage.chatId),
          gt(messages.createdAt, targetMessage.createdAt),
        ),
      );

    // Delete the target message (cascade delete will handle parts)
    await tx.delete(messages).where(eq(messages.id, messageId));
  });
};
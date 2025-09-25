import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { MyDataPart, MyUIMessage, MyProviderMetadata } from "@/types/tooltype";
import { generateId, ToolUIPart } from "ai";
import { sql } from "drizzle-orm";
import {
  getWebsiteScreenshotInput,
  getWebsiteScreenshotOutput,
  getAIGeneratedImageInput,
  getAIGeneratedImageOutput,
  postToLinkedInInput,
  postToLinkedInOutput,
} from "@/tools";

export const chats = pgTable("chats", {
  id: varchar()
    .primaryKey()
    .$defaultFn(() => generateId()),
  visitorId: varchar().notNull(),
  title: varchar().default("New Chat"),
  isPublic: boolean().default(false),
  createdAt: timestamp().defaultNow().notNull(),
});

export const messages = pgTable(
  "messages",
  {
    id: varchar()
      .primaryKey()
      .$defaultFn(() => generateId()),
    chatId: varchar()
      .references(() => chats.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    role: varchar().$type<MyUIMessage["role"]>().notNull(),
  },
  (table) => [
    index("messages_chat_id_idx").on(table.chatId),
    index("messages_chat_id_created_at_idx").on(table.chatId, table.createdAt),
  ]
);

export const parts = pgTable(
  "parts",
  {
    id: varchar()
      .primaryKey()
      .$defaultFn(() => generateId()),
    messageId: varchar()
      .references(() => messages.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar().$type<MyUIMessage["parts"][0]["type"]>().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    order: integer().notNull().default(0),

    // Text fields
    text_text: text(),

    // Reasoning fields
    reasoning_text: text(),

    // File fields
    file_mediaType: varchar(),
    file_filename: varchar(), // optional
    file_url: varchar(),

    // Source url fields
    source_url_sourceId: varchar(),
    source_url_url: varchar(),
    source_url_title: varchar(), // optional

    // Source document fields
    source_document_sourceId: varchar(),
    source_document_mediaType: varchar(),
    source_document_title: varchar(),
    source_document_filename: varchar(), // optional

    // shared tool call columns
    tool_toolCallId: varchar(),
    tool_state: varchar().$type<ToolUIPart["state"]>(),
    tool_errorText: varchar(),

    // tools inputs and outputss are stored in separate cols
    tool_getAIGeneratedImage_input: jsonb().$type<getAIGeneratedImageInput>(),
    tool_getAIGeneratedImage_output: jsonb().$type<getAIGeneratedImageOutput>(),

    tool_getWebsiteScreenshot_input: jsonb().$type<getWebsiteScreenshotInput>(),
    tool_getWebsiteScreenshot_output: jsonb().$type<getWebsiteScreenshotOutput>(),

    tool_postToLinkedIn_input: jsonb().$type<postToLinkedInInput>(),
    tool_postToLinkedIn_output: jsonb().$type<postToLinkedInOutput>(),

    // Data parts
    data_aiImage_id: varchar().$defaultFn(() => generateId()),
    data_aiImage_loading: boolean().$type<MyDataPart["aiImage"]["loading"]>(),
    data_aiImage_image: varchar().$type<MyDataPart["aiImage"]["image"]>(),
    data_aiImage_description:
      varchar().$type<MyDataPart["aiImage"]["description"]>(),
    data_aiImage_dimensions:
      jsonb().$type<MyDataPart["aiImage"]["dimensions"]>(),

    data_websiteScreenshot_id: varchar().$defaultFn(() => generateId()),
    data_websiteScreenshot_loading: boolean().$type<MyDataPart["websiteScreenshot"]["loading"]>(),
    data_websiteScreenshot_image: varchar().$type<MyDataPart["websiteScreenshot"]["image"]>(),

    data_postToLinkedIn_id: varchar().$defaultFn(() => generateId()),
    data_postToLinkedIn_loading: boolean().$type<MyDataPart["postToLinkedIn"]["loading"]>(),
    data_postToLinkedIn_content: varchar().$type<MyDataPart["postToLinkedIn"]["content"]>(),
    data_postToLinkedIn_images: jsonb().$type<MyDataPart["postToLinkedIn"]["images"]>(),
    data_postToLinkedIn_video: jsonb().$type<MyDataPart["postToLinkedIn"]["video"]>(),

    providerMetadata: jsonb().$type<MyProviderMetadata>(),
  },
  (t) => [
    // Indexes for performance optimisation
    index("parts_message_id_idx").on(t.messageId),
    index("parts_message_id_order_idx").on(t.messageId, t.order),

    // Check constraints
    check(
      "text_text_required_if_type_is_text",
      // This SQL expression enforces: if type = 'text' then text_text IS NOT NULL
      sql`CASE WHEN ${t.type} = 'text' THEN ${t.text_text} IS NOT NULL ELSE TRUE END`
    ),
    check(
      "reasoning_text_required_if_type_is_reasoning",
      sql`CASE WHEN ${t.type} = 'reasoning' THEN ${t.reasoning_text} IS NOT NULL ELSE TRUE END`
    ),
    check(
      "file_fields_required_if_type_is_file",
      sql`CASE WHEN ${t.type} = 'file' THEN ${t.file_mediaType} IS NOT NULL AND ${t.file_url} IS NOT NULL ELSE TRUE END`
    ),
    check(
      "source_url_fields_required_if_type_is_source_url",
      sql`CASE WHEN ${t.type} = 'source_url' THEN ${t.source_url_sourceId} IS NOT NULL AND ${t.source_url_url} IS NOT NULL ELSE TRUE END`
    ),
    check(
      "source_document_fields_required_if_type_is_source_document",
      sql`CASE WHEN ${t.type} = 'source_document' THEN ${t.source_document_sourceId} IS NOT NULL AND ${t.source_document_mediaType} IS NOT NULL AND ${t.source_document_title} IS NOT NULL ELSE TRUE END`
    ),
    check(
      "tool_getAIGeneratedImage_fields_required",
      sql`CASE WHEN ${t.type} = 'tool-getAIGeneratedImage' THEN ${t.tool_toolCallId} IS NOT NULL AND ${t.tool_state} IS NOT NULL ELSE TRUE END`
    ),
    check(
      "tool_getWebsiteScreenshot_fields_required",
      sql`CASE WHEN ${t.type} = 'tool-getWebsiteScreenshot' THEN ${t.tool_toolCallId} IS NOT NULL AND ${t.tool_state} IS NOT NULL ELSE TRUE END`
    ),
    check(
      "tool_postToLinkedIn_fields_required",
      sql`CASE WHEN ${t.type} = 'tool-postToLinkedIn' THEN ${t.tool_toolCallId} IS NOT NULL AND ${t.tool_state} IS NOT NULL ELSE TRUE END`
    ),
    check(
      "data_aiImage_fields_required",
      sql`CASE WHEN ${t.type} = 'data-aiImage' THEN ${t.data_aiImage_loading} IS NOT NULL AND ${t.data_aiImage_image} IS NOT NULL AND ${t.data_aiImage_description} IS NOT NULL ELSE TRUE END`
    ),
    check(
      "data_websiteScreenshot_fields_required",
      sql`CASE WHEN ${t.type} = 'data-websiteScreenshot' THEN ${t.data_websiteScreenshot_loading} IS NOT NULL ELSE TRUE END`
    ),
    check(
      "data_postToLinkedIn_fields_required",
      sql`CASE WHEN ${t.type} = 'data-postToLinkedIn' THEN ${t.data_postToLinkedIn_loading} IS NOT NULL ELSE TRUE END`
    ),
  ]
);

export type MyDBUIMessagePart = typeof parts.$inferInsert;
export type MyDBUIMessagePartSelect = typeof parts.$inferSelect;

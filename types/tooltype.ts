import { tools } from "@/tools";
import { InferUITools, JSONValue, UIMessage, UIMessagePart } from "ai";
import z from "zod";

export const metadataSchema = z.object({});

type MyMetadata = z.infer<typeof metadataSchema>;

export const dataPartSchema = z.object({
  aiImage: z.object({
    loading: z.boolean().default(true),
    image: z.string().optional(),
    description: z.string().optional(),
    dimensions: z.object({ width: z.number(), height: z.number() }).optional(),
  }),
  websiteScreenshot: z.object({
    loading: z.boolean().default(true),
    image: z.string().optional(),
  }),
  postToLinkedIn: z.object({
    loading: z.boolean().default(true),
    content: z.string().optional(),
    images: z.array(z.string()).optional(),
    video: z.array(z.string()).optional(),
    error: z.string().optional(),
    success: z.boolean().optional(),
    postId: z.string().optional(),
  }),
});

export type MyDataPart = z.infer<typeof dataPartSchema>;

export type MyToolSet = InferUITools<ReturnType<typeof tools>>;

export type MyUIMessage = UIMessage<MyMetadata, MyDataPart, MyToolSet>;

export type MyUIMessagePart = UIMessagePart<MyDataPart, MyToolSet>;

export type MyProviderMetadata = Record<string, Record<string, JSONValue>>;
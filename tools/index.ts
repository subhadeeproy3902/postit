import { MyDataPart } from "@/types/tooltype";
import {
  InferToolInput,
  InferToolOutput,
  tool,
  UIMessage,
  UIMessageStreamWriter,
  streamText,
  generateId,
  smoothStream,
} from "ai";
import z from "zod/v4";
import { groq } from "@ai-sdk/groq";

export const getAIGeneratedImage = (
  writer: UIMessageStreamWriter<UIMessage<never, MyDataPart>>
) =>
  tool({
    description:
      "Generate an AI image based on the description, style and dimensions (if provided)",
    inputSchema: z.object({
      description: z
        .string()
        .describe(
          "Detailed description of the professional image to generate for LinkedIn"
        ),
      height: z
        .number()
        .describe(
          "Image height in pixels (recommended: 627 for landscape, 1080 for square)"
        ),
      width: z
        .number()
        .describe(
          "Image width in pixels (recommended: 1200 for landscape, 1080 for square)"
        ),
    }),
    execute: async ({ description, height, width }) => {
      writer.write({
        type: "data-aiImage",
        data: { loading: true },
      });

      const imageUrl =
        "https://ai-image-api.xeven.workers.dev/img?prompt=" +
        encodeURIComponent(description) +
        "&model=phoenix&guidance=6&negative_prompt=blurry,low%20quality,text%20overlay,watermark&height=" +
        height +
        "&width=" +
        width +
        "&num_steps=40";

      writer.write({
        type: "data-aiImage",
        data: {
          loading: false,
          image: imageUrl,
          description,
          dimensions: { width, height },
        },
      });

      return {
        image_url: imageUrl,
        description: description,
        dimensions: { width, height },
      };
    },
  });

// types used in our db schema
export type getAIGeneratedImageInput = InferToolInput<
  ReturnType<typeof getAIGeneratedImage>
>;
export type getAIGeneratedImageOutput = InferToolOutput<
  ReturnType<typeof getAIGeneratedImage>
>;

export const getWebsiteScreenshot = (writer: UIMessageStreamWriter<UIMessage<never, MyDataPart>>) => tool({
  description:
    "Get a screenshot of a website if asked by the user else if a website is mentioned in the conversation. If you get error while generating the screenshot, exit.",
  inputSchema: z.object({
    url: z.string().describe("URL of the website to screenshot"),
  }),
  execute: async ({ url }) => {
    writer.write({
      type: "data-websiteScreenshot",
      data: { loading: true },
    });

    const screenshotUrl = `https://webshot.mvp-subha.me/api/screenshot?url=${encodeURIComponent(
      url
    )}`;

    writer.write({
      type: "data-websiteScreenshot",
      data: { loading: false, image: screenshotUrl },
    });

    return {
      image_url: screenshotUrl,
    };
  },
});

export type getWebsiteScreenshotInput = InferToolInput<
  ReturnType<typeof getWebsiteScreenshot>
>;
export type getWebsiteScreenshotOutput = InferToolOutput<
  ReturnType<typeof getWebsiteScreenshot>
>;

export const postToLinkedIn = (
  writer: UIMessageStreamWriter<UIMessage<never, MyDataPart>>,
) => tool({
  description: "Post content to LinkedIn. Content will be extracted from the current document in the editor.",
  inputSchema: z.object({
    documentId: z.string().describe("Document ID of the content to post. If not provided, will use the currently opened document or latest document.").optional(),
    images: z.array(z.string()).describe("Images to post to LinkedIn").optional(),
    video: z.array(z.string()).describe("Videos to post to LinkedIn").optional(),
  }),

  execute: async ({ documentId, images, video }) => {
    writer.write({
      type: "data-postToLinkedIn",
      data: { loading: true },
    });
    return {
      documentId,
      images,
      video,
    };
  },
});

// types used in our db schema
export type postToLinkedInInput = InferToolInput<
  ReturnType<typeof postToLinkedIn>
>;
export type postToLinkedInOutput = InferToolOutput<
  ReturnType<typeof postToLinkedIn>
>;

export const getLinkedInContent = (
  writer: UIMessageStreamWriter<UIMessage<never, MyDataPart>>
) =>
  tool({
    description:
      "Generate professional LinkedIn content based on user's idea, topic, or request. Creates engaging posts with proper formatting, hashtags, and call-to-action.",
    inputSchema: z.object({
      topic: z
        .string()
        .describe("The main topic, idea, or request for the LinkedIn content"),
      tone: z
        .enum(["professional", "casual", "inspirational", "educational", "promotional"])
        .default("professional")
        .describe("The tone of voice for the LinkedIn post"),
      includeHashtags: z
        .boolean()
        .default(true)
        .describe("Whether to include relevant hashtags"),
      includeCallToAction: z
        .boolean()
        .default(true)
        .describe("Whether to include a call-to-action"),
    }),
    execute: async ({ topic, tone, includeHashtags, includeCallToAction }) => {
      const documentId = generateId();

      writer.write({
        type: "data-linkedInContent",
        id: documentId,
        data: {
          status: "processing",
          content: undefined,
          topic,
          tone,
        },
      });

      const { textStream } = streamText({
        model: groq("llama-3.3-70b-versatile"),
        system: [
          "You are a professional LinkedIn content creator and social media expert.",
          "Generate engaging, professional LinkedIn posts that drive engagement and build professional networks.",
          "Content requirements:",
          "- Use clear, professional language appropriate for LinkedIn",
          "- Use markdown bold, italic, underlines, strikethrough if needed highly. Do not use heading (#, ##, ###",
          "- Structure content with short paragraphs and bullet points for readability",
          "- Include relevant emojis sparingly and professionally",
          "- Make content actionable and valuable to the professional community",
          "- Keep posts between 150-300 words for optimal engagement",
          "- Use line breaks and formatting for visual appeal",
          includeHashtags && "- Include 3-5 relevant hashtags at the end",
          includeCallToAction && "- End with a clear call-to-action or question to encourage engagement",
          `- Tone should be ${tone}`,
          "- Output only the LinkedIn post content, no additional formatting or metadata",
        ].filter(Boolean).join("\n"),
        messages: [
          {
            role: "user",
            content: `Create a LinkedIn post about: ${topic}`,
          },
        ],
        experimental_transform: smoothStream({
          delayInMs: 80,
          chunking: "word",
        })
      });

      let fullContent = "";

      for await (const chunk of textStream) {
        fullContent += chunk;

        writer.write({
          type: "data-linkedInContent",
          id: documentId,
          data: {
            status: "streaming",
            content: fullContent,
            topic,
            tone,
          },
        });
      }

      writer.write({
        type: "data-linkedInContent",
        id: documentId,
        data: {
          status: "success",
          content: fullContent,
          topic,
          tone,
        },
      });

      return {
        content: fullContent,
        topic,
        tone,
        documentId,
      };
    },
  });

// types used in our db schema
export type getLinkedInContentInput = InferToolInput<
  ReturnType<typeof getLinkedInContent>
>;
export type getLinkedInContentOutput = InferToolOutput<
  ReturnType<typeof getLinkedInContent>
>;

export const updateContent = (
  writer: UIMessageStreamWriter<UIMessage<never, MyDataPart>>
) =>
  tool({
    description:
      "Update existing LinkedIn content with new edited content. Use this when content has been edited and needs to be updated for posting.",
    inputSchema: z.object({
      contentId: z
        .string()
        .describe("The ID of the content to update"),
      updatedContent: z
        .string()
        .describe("The new updated content"),
      topic: z
        .string()
        .optional()
        .describe("Updated topic if changed"),
      tone: z
        .enum(["professional", "casual", "inspirational", "educational", "promotional"])
        .optional()
        .describe("Updated tone if changed"),
    }),
    execute: async ({ contentId, updatedContent, topic, tone }) => {
      // Write the updated content to the stream
      writer.write({
        type: "data-linkedInContent",
        id: contentId,
        data: {
          status: "success",
          content: updatedContent,
          topic: topic || "Updated Content",
          tone: tone || "professional",
        },
      });

      return {
        content: updatedContent,
        topic: topic || "Updated Content",
        tone: tone || "professional",
        contentId,
        updated: true,
      };
    },
  });

export type updateContentInput = InferToolInput<
  ReturnType<typeof updateContent>
>;
export type updateContentOutput = InferToolOutput<
  ReturnType<typeof updateContent>
>;



export const tools = (writer: UIMessageStreamWriter) => ({
  getAIGeneratedImage: getAIGeneratedImage(writer),
  getWebsiteScreenshot: getWebsiteScreenshot(writer),
  postToLinkedIn: postToLinkedIn(writer),
  getLinkedInContent: getLinkedInContent(writer),
  updateContent: updateContent(writer),
});


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
import { Session } from "next-auth";
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
  session: Session | null
) => tool({
  description: "Post the content to LinkedIn if the user is signed in",
  inputSchema: z.object({
    content: z.string().describe("Content to post to LinkedIn"),
    images: z.array(z.string()).describe("Images to post to LinkedIn").optional(),
    video: z.array(z.string()).describe("Videos to post to LinkedIn").optional(),
  }),

  execute: async ({ content, images, video }) => {
    writer.write({
      type: "data-postToLinkedIn",
      data: { loading: true },
    });

    // Check if authenticated - this is the "human in the loop" part
    if (!session || !session.accessToken) {
      writer.write({
        type: "data-postToLinkedIn",
        data: { loading: false, content, images, video, error: "Not authenticated" },
      });

      return {
        error: "Not authenticated",
      };
    }

    try {
      // Process media files - convert URLs to LinkedIn API format
      interface MediaFile {
        type: 'image' | 'video';
        title: string;
        fileBuffer: string;
      }
      const processedMediaFiles: MediaFile[] = [];

      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const imageUrl = images[i];
          try {
            // Check if it's a URL (from AI generation or screenshots)
            if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
              // Download the image and convert to base64
              const response = await fetch(imageUrl);
              if (response.ok) {
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString('base64');

                processedMediaFiles.push({
                  type: 'image',
                  title: `AI Generated Image ${i + 1}`,
                  fileBuffer: base64
                });
              } else {
                console.warn(`Failed to download image from URL: ${imageUrl}`);
              }
            } else if (imageUrl.startsWith('data:')) {
              // It's already a base64 data URL, extract the base64 part
              const base64 = imageUrl.split(',')[1];
              processedMediaFiles.push({
                type: 'image',
                title: `Image ${i + 1}`,
                fileBuffer: base64
              });
            } else {
              // Assume it's already base64
              processedMediaFiles.push({
                type: 'image',
                title: `Image ${i + 1}`,
                fileBuffer: imageUrl
              });
            }
          } catch (error) {
            console.warn(`Error processing image URL ${imageUrl}:`, error);
          }
        }
      }

      if (video && video.length > 0) {
        for (let i = 0; i < video.length; i++) {
          const videoUrl = video[i];
          try {
            if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
              const response = await fetch(videoUrl);
              if (response.ok) {
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString('base64');

                processedMediaFiles.push({
                  type: 'video',
                  title: `Video ${i + 1}`,
                  fileBuffer: base64
                });
              }
            } else if (videoUrl.startsWith('data:')) {
              const base64 = videoUrl.split(',')[1];
              processedMediaFiles.push({
                type: 'video',
                title: `Video ${i + 1}`,
                fileBuffer: base64
              });
            } else {
              processedMediaFiles.push({
                type: 'video',
                title: `Video ${i + 1}`,
                fileBuffer: videoUrl
              });
            }
          } catch (error) {
            console.warn(`Error processing video URL ${videoUrl}:`, error);
          }
        }
      }

      // Use absolute URL for server-side fetch
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const postResult = await fetch(`${baseUrl}/api/post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          mediaFiles: processedMediaFiles,
          accessToken: session.accessToken,
          linkedinId: session.linkedinId,
        }),
      });

      if (!postResult.ok) {
        const errorData = await postResult.json();
        writer.write({
          type: "data-postToLinkedIn",
          data: { loading: false, content, images, video, error: errorData.error },
        });
        return {
          error: errorData.error || `Failed to post to LinkedIn: ${postResult.statusText}`,
        };
      }

      const result = await postResult.json();

      writer.write({
        type: "data-postToLinkedIn",
        data: {
          loading: false,
          content,
          images,
          video,
          success: true,
          postId: result.postId,
          postUrl: result.postUrl || `https://www.linkedin.com/feed/update/${result.postId}/`
        },
      });

      // Return the post ID and URL on success
      if (result.success && result.postId) {
        return {
          postId: result.postId,
          postUrl: result.postUrl || `https://www.linkedin.com/feed/update/${result.postId}/`,
          success: true,
        };
      } else {
        return {
          error: "Post was created but no post ID was returned",
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred while posting to LinkedIn";
      writer.write({
        type: "data-postToLinkedIn",
        data: { loading: false, content, images, video, error: errorMessage },
      });
      return {
        error: errorMessage,
      };
    }
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



export const tools = (writer: UIMessageStreamWriter, session: Session | null = null) => ({
  getAIGeneratedImage: getAIGeneratedImage(writer),
  getWebsiteScreenshot: getWebsiteScreenshot(writer),
  postToLinkedIn: postToLinkedIn(writer, session),
  getLinkedInContent: getLinkedInContent(writer),
  updateContent: updateContent(writer),
});


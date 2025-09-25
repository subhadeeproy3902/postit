import { MyDataPart } from "@/types/tooltype";
import {
  InferToolInput,
  InferToolOutput,
  tool,
  UIMessage,
  UIMessageStreamWriter,
} from "ai";
import z from "zod/v4";
import { Session } from "next-auth";

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
        data: { loading: false, content, images, video, success: true, postId: result.postId },
      });

      // Return only the post ID on success
      if (result.success && result.postId) {
        return {
          postId: result.postId,
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

export const tools = (writer: UIMessageStreamWriter, session: Session | null = null) => ({
  getAIGeneratedImage: getAIGeneratedImage(writer),
  getWebsiteScreenshot: getWebsiteScreenshot(writer),
  postToLinkedIn: postToLinkedIn(writer, session),
});


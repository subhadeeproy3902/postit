import { MyUIMessagePart } from "@/types/tooltype";
import { MyDBUIMessagePart, MyDBUIMessagePartSelect } from "@/lib/db/schema";

export const mapUIMessagePartsToDBParts = (
  messageParts: MyUIMessagePart[],
  messageId: string,
): MyDBUIMessagePart[] => {
  return messageParts.map((part, index) => {
    // Add debugging and validation
    if (!part || typeof part !== 'object') {
      console.error('Invalid part:', part, 'at index:', index);
      throw new Error(`Invalid part at index ${index}: ${JSON.stringify(part)}`);
    }

    if (!part.type) {
      console.error('Part missing type:', part, 'at index:', index);
      throw new Error(`Part missing type at index ${index}: ${JSON.stringify(part)}`);
    }

    switch (part.type) {
      case "text":
        return {
          messageId,
          order: index,
          type: part.type,
          text_text: part.text,
        };
      case "reasoning":
        return {
          messageId,
          order: index,
          type: part.type,
          reasoning_text: part.text,
          providerMetadata: part.providerMetadata,
        };
      case "file":
        return {
          messageId,
          order: index,
          type: part.type,
          file_mediaType: part.mediaType,
          file_filename: part.filename,
          file_url: part.url,
        };
      case "source-document":
        return {
          messageId,
          order: index,
          type: part.type,
          source_document_sourceId: part.sourceId,
          source_document_mediaType: part.mediaType,
          source_document_title: part.title,
          source_document_filename: part.filename,
          providerMetadata: part.providerMetadata,
        };
      case "source-url":
        return {
          messageId,
          order: index,
          type: part.type,
          source_url_sourceId: part.sourceId,
          source_url_url: part.url,
          source_url_title: part.title,
          providerMetadata: part.providerMetadata,
        };
      case "step-start":
        return {
          messageId,
          order: index,
          type: part.type,
        };
      case "tool-getAIGeneratedImage":
        return {
          messageId,
          order: index,
          type: part.type,
          tool_toolCallId: part.toolCallId,
          tool_state: part.state,
          tool_getAIGeneratedImage_input:
            part.state === "input-available" ||
            part.state === "output-available" ||
            part.state === "output-error"
              ? part.input
              : undefined,
          tool_getAIGeneratedImage_output:
            part.state === "output-available" ? part.output : undefined,
          tool_getAIGeneratedImage_errorText:
            part.state === "output-error" ? part.errorText : undefined,
        };
      case "tool-getWebsiteScreenshot":
        return {
          messageId,
          order: index,
          type: part.type,
          tool_toolCallId: part.toolCallId,
          tool_state: part.state,
          tool_getWebsiteScreenshot_input:
            part.state === "input-available" ||
            part.state === "output-available" ||
            part.state === "output-error"
              ? part.input
              : undefined,
          tool_getWebsiteScreenshot_output:
            part.state === "output-available" ? part.output : undefined,
          tool_getWebsiteScreenshot_errorText:
            part.state === "output-error" ? part.errorText : undefined,
        };
      case "tool-postToLinkedIn":
        return {
          messageId,
          order: index,
          type: part.type,
          tool_toolCallId: part.toolCallId,
          tool_state: part.state,
          tool_postToLinkedIn_input:
            part.state === "input-available" ||
            part.state === "output-available" ||
            part.state === "output-error"
              ? part.input
              : undefined,
          tool_postToLinkedIn_output:
            part.state === "output-available" ? part.output : undefined,
          tool_postToLinkedIn_errorText:
            part.state === "output-error" ? part.errorText : undefined,
        };
      case "tool-getLinkedInContent":
        return {
          messageId,
          order: index,
          type: part.type,
          tool_toolCallId: part.toolCallId,
          tool_state: part.state,
          tool_getLinkedInContent_input:
            part.state === "input-available" ||
            part.state === "output-available" ||
            part.state === "output-error"
              ? part.input
              : undefined,
          tool_getLinkedInContent_output:
            part.state === "output-available" ? part.output : undefined,
          tool_getLinkedInContent_errorText:
            part.state === "output-error" ? part.errorText : undefined,
        };
      case "data-aiImage":
        return {
          messageId,
          order: index,
          type: part.type,
          data_aiImage_id: part.id,
          data_aiImage_loading: part.data.loading,
          data_aiImage_image: part.data.image,
          data_aiImage_description: part.data.description,
          data_aiImage_dimensions: part.data.dimensions,
        };
      case "data-websiteScreenshot":
        return {
          messageId,
          order: index,
          type: part.type,
          data_websiteScreenshot_id: part.id,
          data_websiteScreenshot_loading: part.data.loading,
          data_websiteScreenshot_image: part.data.image,
        };
      case "data-postToLinkedIn":
        return {
          messageId,
          order: index,
          type: part.type,
          data_postToLinkedIn_id: part.id,
          data_postToLinkedIn_loading: part.data.loading,
          data_postToLinkedIn_content: part.data.content,
          data_postToLinkedIn_images: part.data.images,
          data_postToLinkedIn_video: part.data.video,
          data_postToLinkedIn_error: part.data.error,
          data_postToLinkedIn_success: part.data.success,
          data_postToLinkedIn_postId: part.data.postId,
          data_postToLinkedIn_postUrl: part.data.postUrl,
        };
      case "data-linkedInContent":
        return {
          messageId,
          order: index,
          type: part.type,
          data_linkedInContent_id: part.id,
          data_linkedInContent_status: part.data.status,
          data_linkedInContent_content: part.data.content,
          data_linkedInContent_topic: part.data.topic,
          data_linkedInContent_tone: part.data.tone,
        };
      default:
        console.error('Unsupported part type:', part.type, 'Full part:', part, 'at index:', index);
        // Instead of throwing, return a safe fallback to prevent crashes
        console.warn(`Skipping unsupported part type: ${part.type} at index ${index}`);
        return {
          messageId,
          order: index,
          type: "text", // Fallback to text type
          text_text: `[Unsupported content type: ${part.type}]`,
        };
    }
  });
};

export const mapDBPartToUIMessagePart = (
  part: MyDBUIMessagePartSelect,
): MyUIMessagePart => {
  switch (part.type) {
    case "text":
      return {
        type: part.type,
        text: part.text_text!,
      };
    case "reasoning":
      return {
        type: part.type,
        text: part.reasoning_text!,
        providerMetadata: part.providerMetadata ?? undefined,
      };
    case "file":
      return {
        type: part.type,
        mediaType: part.file_mediaType!,
        filename: part.file_filename!,
        url: part.file_url!,
      };
    case "source-document":
      return {
        type: part.type,
        sourceId: part.source_document_sourceId!,
        mediaType: part.source_document_mediaType!,
        title: part.source_document_title!,
        filename: part.source_document_filename!,
        providerMetadata: part.providerMetadata ?? undefined,
      };
    case "source-url":
      return {
        type: part.type,
        sourceId: part.source_url_sourceId!,
        url: part.source_url_url!,
        title: part.source_url_title!,
        providerMetadata: part.providerMetadata ?? undefined,
      };
    case "step-start":
      return {
        type: part.type,
      };
    case "tool-getAIGeneratedImage":
      if (!part.tool_state) {
        throw new Error("getAIGeneratedImage_state is undefined");
      }
      switch (part.tool_state) {
        case "input-streaming":
          return {
            type: "tool-getAIGeneratedImage",
            state: "input-streaming",
            toolCallId: part.tool_toolCallId!,
            input: part.tool_getAIGeneratedImage_input!,
          };
        case "input-available":
          return {
            type: "tool-getAIGeneratedImage",
            state: "input-available",
            toolCallId: part.tool_toolCallId!,
            input: part.tool_getAIGeneratedImage_input!,
          };
        case "output-available":
          return {
            type: "tool-getAIGeneratedImage",
            state: "output-available",
            toolCallId: part.tool_toolCallId!,
            input: part.tool_getAIGeneratedImage_input!,
            output: part.tool_getAIGeneratedImage_output!,
          };
        case "output-error":
          return {
            type: "tool-getAIGeneratedImage",
            state: "output-error",
            toolCallId: part.tool_toolCallId!,
            input: part.tool_getAIGeneratedImage_input!,
            errorText: part.tool_errorText!,
          };
      }
    case "tool-getWebsiteScreenshot":
      if (!part.tool_state) {
        throw new Error("getAIGeneratedImage_state is undefined");
      }
      switch (part.tool_state) {
        case "input-streaming":
          return {
            type: "tool-getWebsiteScreenshot",
            state: "input-streaming",
            toolCallId: part.tool_toolCallId!,
            input: part.tool_getWebsiteScreenshot_input!,
          };
        case "input-available":
          return {
            type: "tool-getWebsiteScreenshot",
            state: "input-available",
            toolCallId: part.tool_toolCallId!,
            input: part.tool_getWebsiteScreenshot_input!,
          };
        case "output-available":
          return {
            type: "tool-getWebsiteScreenshot",
            state: "output-available",
            toolCallId: part.tool_toolCallId!,
            input: part.tool_getWebsiteScreenshot_input!,
            output: part.tool_getWebsiteScreenshot_output!,
          };
        case "output-error":
          return {
            type: "tool-getWebsiteScreenshot",
            state: "output-error",
            toolCallId: part.tool_toolCallId!,
            input: part.tool_getWebsiteScreenshot_input!,
            errorText: part.tool_errorText!,
          };
      }
    case "tool-postToLinkedIn":
      if (!part.tool_state) {
        throw new Error("postToLinkedIn_state is undefined");
      }
      switch (part.tool_state) {
        case "input-streaming":
          return {
            type: "tool-postToLinkedIn",
            state: "input-streaming",
            toolCallId: part.tool_toolCallId!,
            input: part.tool_postToLinkedIn_input!,
          };
        case "input-available":
          return {
            type: "tool-postToLinkedIn",
            state: "input-available",
            toolCallId: part.tool_toolCallId!,
            input: part.tool_postToLinkedIn_input!,
          };
        case "output-available":
          return {
            type: "tool-postToLinkedIn",
            state: "output-available",
            toolCallId: part.tool_toolCallId!,
            input: part.tool_postToLinkedIn_input!,
            output: part.tool_postToLinkedIn_output!,
          };
        case "output-error":
          return {
            type: "tool-postToLinkedIn",
            state: "output-error",
            toolCallId: part.tool_toolCallId!,
            input: part.tool_postToLinkedIn_input!,
            errorText: part.tool_errorText!,
          };
      }
    case "tool-getLinkedInContent":
      if (!part.tool_state) {
        throw new Error("getLinkedInContent_state is undefined");
      }
      switch (part.tool_state) {
        case "input-streaming":
          return {
            type: "tool-getLinkedInContent",
            state: "input-streaming",
            toolCallId: part.tool_toolCallId!,
            input: part.tool_getLinkedInContent_input!,
          };
        case "input-available":
          return {
            type: "tool-getLinkedInContent",
            state: "input-available",
            toolCallId: part.tool_toolCallId!,
            input: part.tool_getLinkedInContent_input!,
          };
        case "output-available":
          return {
            type: "tool-getLinkedInContent",
            state: "output-available",
            toolCallId: part.tool_toolCallId!,
            input: part.tool_getLinkedInContent_input!,
            output: part.tool_getLinkedInContent_output!,
          };
        case "output-error":
          return {
            type: "tool-getLinkedInContent",
            state: "output-error",
            toolCallId: part.tool_toolCallId!,
            input: part.tool_getLinkedInContent_input!,
            errorText: part.tool_errorText!,
          };
      }
    case "data-aiImage":
      return {
        type: "data-aiImage",
        data: {
          loading: part.data_aiImage_loading!,
          image: part.data_aiImage_image!,
          description: part.data_aiImage_description!,
          dimensions: part.data_aiImage_dimensions!,
        },
        id: part.data_aiImage_id!,
      };
    case "data-websiteScreenshot":
      return {
        type: "data-websiteScreenshot",
        data: {
          loading: part.data_websiteScreenshot_loading!,
          image: part.data_websiteScreenshot_image ?? undefined,
        },
        id: part.data_websiteScreenshot_id!,
      };
    case "data-postToLinkedIn":
      return {
        type: "data-postToLinkedIn",
        data: {
          loading: part.data_postToLinkedIn_loading!,
          content: part.data_postToLinkedIn_content ?? undefined,
          images: part.data_postToLinkedIn_images ?? undefined,
          video: part.data_postToLinkedIn_video ?? undefined,
          error: part.data_postToLinkedIn_error ?? undefined,
          success: part.data_postToLinkedIn_success ?? undefined,
          postId: part.data_postToLinkedIn_postId ?? undefined,
          postUrl: part.data_postToLinkedIn_postUrl ?? undefined,
        },
        id: part.data_postToLinkedIn_id!,
      };
    case "data-linkedInContent":
      return {
        type: "data-linkedInContent",
        data: {
          status: part.data_linkedInContent_status!,
          content: part.data_linkedInContent_content ?? undefined,
          topic: part.data_linkedInContent_topic ?? undefined,
          tone: part.data_linkedInContent_tone ?? undefined,
        },
        id: part.data_linkedInContent_id!,
      };
    default:
      throw new Error(`Unsupported part type: ${part.type}`);
  }
};
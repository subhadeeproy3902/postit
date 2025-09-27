import { MyUIMessage } from '@/types/tooltype';

export interface MediaFile {
  type: 'image' | 'video';
  title: string;
  fileBuffer: string;
}

export interface PostToLinkedInParams {
  messages: MyUIMessage[];
  openedContentId?: string;
  toolInput: {
    documentId?: string;
    images?: string[];
    video?: string[];
  };
  session: {
    accessToken: string;
    linkedinId: string;
  };
}

export interface PostResult {
  success: boolean;
  error?: string;
  postId?: string;
  postUrl?: string;
}

/**
 * Get the latest document ID from messages
 */
function getLatestDocumentId(messages: MyUIMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    for (const part of message.parts) {
      if (part.type === 'data-linkedInContent') {
        const dataPart = part as any;
        if (dataPart.id && dataPart.data?.content) {
          return dataPart.id;
        }
      }
    }
  }
  return undefined;
}

/**
 * Extract content for posting with priority system
 */
export function extractContentForPosting(
  messages: MyUIMessage[],
  openedContentId?: string,
  toolInput?: { documentId?: string }
): string {
  let contentToPost = '';

  // Enhanced priority system for document ID selection
  const targetDocumentId = toolInput?.documentId || openedContentId || getLatestDocumentId(messages);

  console.log('🔍 Content extraction started:', {
    toolInputDocumentId: toolInput?.documentId,
    openedContentId,
    latestDocumentId: getLatestDocumentId(messages),
    finalTargetDocumentId: targetDocumentId,
    messagesCount: messages.length,
    strategy: 'extract-from-editor-only'
  });

  // Priority 1: Use content from specific document if documentId provided
  if (targetDocumentId) {
    console.log('📄 Looking for specific document:', targetDocumentId);

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      console.log(`🔍 Checking message ${i}:`, {
        role: message.role,
        partsCount: message.parts.length,
        parts: message.parts.map(p => ({
          type: p.type,
          id: (p as any).id,
          hasData: !!(p as any).data
        }))
      });

      for (const part of message.parts) {
        if (part.type === 'data-linkedInContent') {
          const dataPart = part as any;
          console.log('📋 Found linkedInContent part:', {
            id: dataPart.id,
            targetId: targetDocumentId,
            matches: dataPart.id === targetDocumentId,
            hasContent: !!dataPart.data?.content,
            contentLength: dataPart.data?.content?.length || 0
          });

          if (dataPart.id === targetDocumentId && dataPart.data?.content) {
            contentToPost = dataPart.data.content;
            console.log('✅ Found content from specific document:', {
              documentId: targetDocumentId,
              contentLength: contentToPost.length,
              contentPreview: contentToPost.substring(0, 100) + '...'
            });
            return contentToPost;
          }
        }
      }
    }
    console.log('❌ Specific document not found:', targetDocumentId);
  }

  // Priority 2: Find latest LinkedIn content if no specific content found
  if (!contentToPost.trim()) {
    console.log('🔄 Looking for latest LinkedIn content...');
    
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      for (const part of message.parts) {
        if (part.type === 'data-linkedInContent') {
          const dataPart = part as any;
          if (dataPart.data?.content) {
            contentToPost = dataPart.data.content;
            console.log('✅ Found latest LinkedIn content:', {
              documentId: dataPart.id,
              contentLength: contentToPost.length,
              contentPreview: contentToPost.substring(0, 100) + '...'
            });
            return contentToPost;
          }
        }
      }
    }
    console.log('❌ No LinkedIn content found in messages');
  }

  // Priority 3: Check for updateContent tool results
  if (!contentToPost.trim()) {
    console.log('🔄 Looking for updateContent tool results...');
    
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      for (const part of message.parts) {
        if (part.type === 'tool-updateContent') {
          const toolPart = part as any;
          if (toolPart.output?.content) {
            contentToPost = toolPart.output.content;
            console.log('✅ Found content from updateContent tool:', {
              contentLength: contentToPost.length,
              contentPreview: contentToPost.substring(0, 100) + '...'
            });
            return contentToPost;
          }
        }
      }
    }
    console.log('❌ No updateContent tool results found');
  }

  console.log('📝 Final content extraction result:', {
    hasContent: !!contentToPost.trim(),
    contentLength: contentToPost.length,
    source: targetDocumentId ? 'specific-document' : 'latest-document-or-tool'
  });

  return contentToPost;
}

/**
 * Convert markdown to unicode for LinkedIn compatibility
 */
export function markdownToUnicode(text: string): string {
  let result = text;
  
  // Convert bullet points first
  result = result.replace(/^[\s]*[-*+]\s+/gm, '• ');
  
  // Convert bold text (**text**)
  result = result.replace(/\*\*(.*?)\*\*/g, (match, content) => {
    return content.split('').map((char: string) => {
      const boldMap: { [key: string]: string } = {
        'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣',
        'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭',
        'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
        'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉',
        'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓',
        'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
        '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
      };
      return boldMap[char] || char;
    }).join('');
  });
  
  // Convert italic text (*text*)
  result = result.replace(/\*(.*?)\*/g, (match, content) => {
    return content.split('').map((char: string) => {
      const italicMap: { [key: string]: string } = {
        'a': '𝑎', 'b': '𝑏', 'c': '𝑐', 'd': '𝑑', 'e': '𝑒', 'f': '𝑓', 'g': '𝑔', 'h': 'ℎ', 'i': '𝑖', 'j': '𝑗',
        'k': '𝑘', 'l': '𝑙', 'm': '𝑚', 'n': '𝑛', 'o': '𝑜', 'p': '𝑝', 'q': '𝑞', 'r': '𝑟', 's': '𝑠', 't': '𝑡',
        'u': '𝑢', 'v': '𝑣', 'w': '𝑤', 'x': '𝑥', 'y': '𝑦', 'z': '𝑧',
        'A': '𝐴', 'B': '𝐵', 'C': '𝐶', 'D': '𝐷', 'E': '𝐸', 'F': '𝐹', 'G': '𝐺', 'H': '𝐻', 'I': '𝐼', 'J': '𝐽',
        'K': '𝐾', 'L': '𝐿', 'M': '𝑀', 'N': '𝑁', 'O': '𝑂', 'P': '𝑃', 'Q': '𝑄', 'R': '𝑅', 'S': '𝑆', 'T': '𝑇',
        'U': '𝑈', 'V': '𝑉', 'W': '𝑊', 'X': '𝑋', 'Y': '𝑌', 'Z': '𝑍'
      };
      return italicMap[char] || char;
    }).join('');
  });
  
  // Convert strikethrough text (~~text~~)
  result = result.replace(/~~(.*?)~~/g, (match, content) => {
    return content.split('').map((char: string) => char + '\u0336').join('');
  });
  
  // Convert underline text (++text++)
  result = result.replace(/\+\+(.*?)\+\+/g, (match, content) => {
    return content.split('').map((char: string) => char + '\u0332').join('');
  });
  
  return result.trim();
}

/**
 * Process media files for LinkedIn API
 */
export async function processMediaFiles(images?: string[], video?: string[]): Promise<MediaFile[]> {
  const processedMediaFiles: MediaFile[] = [];

  if (images && images.length > 0) {
    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];
      try {
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          const response = await fetch(imageUrl);
          if (response.ok) {
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

            processedMediaFiles.push({
              type: 'image',
              title: `AI Generated Image ${i + 1}`,
              fileBuffer: base64
            });
          }
        } else if (imageUrl.startsWith('data:')) {
          const base64 = imageUrl.split(',')[1];
          processedMediaFiles.push({
            type: 'image',
            title: `Image ${i + 1}`,
            fileBuffer: base64
          });
        } else {
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
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

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

  return processedMediaFiles;
}

/**
 * Main function to handle LinkedIn posting
 */
export async function postToLinkedIn(params: PostToLinkedInParams): Promise<PostResult> {
  const { messages, openedContentId, toolInput, session } = params;

  try {
    // Extract content for posting
    const contentToPost = extractContentForPosting(messages, openedContentId, toolInput);

    if (!contentToPost.trim()) {
      return {
        success: false,
        error: "No content found to post",
        postId: undefined,
        postUrl: undefined,
      };
    }

    // Process media files
    const processedMediaFiles = await processMediaFiles(toolInput.images, toolInput.video);

    // Convert markdown to unicode
    const unicodeContent = markdownToUnicode(contentToPost);

    console.log('🚀 Posting to LinkedIn:', {
      contentLength: unicodeContent.length,
      mediaFilesCount: processedMediaFiles.length,
      contentPreview: unicodeContent.substring(0, 200) + '...'
    });

    // Make the API call with retry logic for network issues
    let postResult;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(`🌐 Attempting API call (attempt ${retryCount + 1}/${maxRetries})`);

        postResult = await fetch('/api/post', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: unicodeContent,
            mediaFiles: processedMediaFiles,
            accessToken: session.accessToken,
            linkedinId: session.linkedinId,
          }),
        });

        // If we get here, the fetch succeeded
        break;
      } catch (fetchError) {
        retryCount++;
        console.error(`❌ Network error on attempt ${retryCount}:`, fetchError);

        if (retryCount >= maxRetries) {
          return {
            success: false,
            error: `Network error after ${maxRetries} attempts: ${fetchError instanceof Error ? fetchError.message : 'Unknown network error'}`,
            postId: undefined,
            postUrl: undefined,
          };
        }

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    if (!postResult!.ok) {
      let errorData;
      try {
        errorData = await postResult!.json();
      } catch (jsonError) {
        return {
          success: false,
          error: `Failed to post to LinkedIn: ${postResult!.statusText} (Could not parse error response)`,
          postId: undefined,
          postUrl: undefined,
        };
      }

      return {
        success: false,
        error: errorData.error || `Failed to post to LinkedIn: ${postResult!.statusText}`,
        postId: undefined,
        postUrl: undefined,
      };
    }

    let result;
    try {
      result = await postResult!.json();
    } catch (jsonError) {
      return {
        success: false,
        error: "Failed to parse response from LinkedIn API",
        postId: undefined,
        postUrl: undefined,
      };
    }

    console.log('📤 LinkedIn API response:', result);

    if (result.success && result.postId) {
      console.log('✅ Post successful:', {
        postId: result.postId,
        postUrl: result.postUrl
      });

      return {
        success: true,
        error: undefined,
        postId: result.postId,
        postUrl: result.postUrl || `https://www.linkedin.com/feed/update/${result.postId}/`,
      };
    } else {
      console.log('❌ Post failed:', result);

      return {
        success: false,
        error: result.error || "Post was created but no post ID was returned",
        postId: undefined,
        postUrl: undefined,
      };
    }
  } catch (error) {
    console.error('Error in postToLinkedIn:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred while posting to LinkedIn",
      postId: undefined,
      postUrl: undefined,
    };
  }
}

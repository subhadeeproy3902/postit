import { tools } from "@/tools";
import { upsertMessage, loadChat } from "@/lib/db/actions";
import { MyUIMessage } from "@/types/tooltype";
import { groq } from "@ai-sdk/groq";
import {
  streamText,
  createUIMessageStream,
  convertToModelMessages,
  stepCountIs,
  createUIMessageStreamResponse,
  generateId,
  smoothStream,
} from "ai";
import { Session } from "next-auth";

const system = `
You are a conversational AI assistant with special tools. 
Your job is to always reply naturally, assist the user, and call tools only when strictly needed. 
You never disclose tool mechanics. Tools are invisible to the user.

-------------------------------------
CORE RULES
-------------------------------------
1. Always reply first — conversation is your top priority. 
   - Never stay silent.
   - Never skip a response.
   - Even if a tool fails, still give a helpful reply.

2. Tools are never mentioned directly.
   - You only act as if "things happen" naturally.
   - No explanations like "Here’s your image [Blocked]".

3. CRITICAL LINKEDIN POSTING RULES - NO EXCEPTIONS:
   - NEVER EVER generate LinkedIn content directly in your reply.
   - NEVER include any LinkedIn post content in your text response.
   - ONLY use the LinkedIn content tool when the user explicitly wants LinkedIn post/content.
   - Do not randomly call the content tool unless user strictly requests content.

   🚫 POSTING PERMISSION RULES:
   - ALWAYS ask "Would you like me to post this to LinkedIn?" before posting
   - NEVER post automatically after generating content
   - NEVER post automatically after content is edited/saved
   - NEVER assume the user wants to post
   - Only post when user explicitly says "yes" to posting

   🎯 CONTENT ACCURACY FOR POSTING:
   - When posting, ALWAYS use the most recent/edited version of content
   - NEVER post old or outdated content
   - Check for the latest content in the conversation before posting
   - Look for updateContent tool results to get the latest edited content
   - If content was updated via updateContent tool, use that updated content for posting

   📝 HANDLING "I UPDATED THE CONTENT" SCENARIOS:
   - When user says they updated content, first check conversation for recent updateContent tool results
   - If updateContent tool results exist, use that content for posting (don't ask for content again)
   - Only ask for updated content if no updateContent tool results are found in conversation
   - Remember: Content edited in the UI automatically creates updateContent tool results

4. AI Images & Website Screenshots - STRICT RULES:
   - NEVER show images in your text response.
   - NEVER include image URLs or descriptions in your reply.
   - When asked, acknowledge casually ("Sure, I’ll do that") and call the correct tool.
   - Do not explain the tool.
   - Do not reply with filler like “Here’s your image”. Just confirm action.

   🖼️ IMAGE POSTING CONSISTENCY:
   - When posting with images, use the EXACT image that was generated in this conversation
   - NEVER use different or random images
   - Ensure image consistency between generation and posting
   - If no image was generated, don't include images in the post

5. Style:
   - Natural, helpful, and conversational.
   - Short clear paragraphs.
   - Adapt tone to context.
   - Ask clarifying questions only when necessary.

===========================================
TOOL USAGE GUIDELINES
===========================================

📝 getLinkedInContent: Use when user wants LinkedIn post content created
🔄 updateContent: Use when content has been edited and needs to be updated in the conversation
🖼️ getAIGeneratedImage: Use when user wants images generated
📸 getWebsiteScreenshot: Use when user wants website screenshots
📤 postToLinkedIn: Use ONLY after explicit user confirmation to post

🔍 CONTENT UPDATE DETECTION:
- When user says "I updated the content" or similar, first scan conversation for updateContent tool results
- If updateContent results exist, use that content for posting (no need to ask for content again)
- Only ask for updated content if no updateContent tool results are found
- Content edited in UI automatically creates updateContent tool results in conversation

-------------------------------------
STRICT PRIORITIES
-------------------------------------
- Reply naturally → THEN call tool if needed.
- Never fail to reply.
- Never generate LinkedIn content yourself.
- Never confuse generating vs posting to LinkedIn.
- Only call getLinkedInContent if:
   * User clearly asks for LinkedIn post content
   * No suitable content exists yet

- When user mentions updated content:
   * First check conversation history for updateContent tool results
   * If found, use that content for posting (don't ask for content again)
   * If not found, then ask user to provide the updated content

-------------------------------------
ABSOLUTE PROHIBITIONS
-------------------------------------
- NEVER post to LinkedIn without asking permission first
- NEVER generate LinkedIn content in your response text
- NEVER show images in your response text
- NEVER post old/outdated content
- NEVER use wrong images when posting
- NEVER include image URLs or detailed descriptions
- NEVER explain tool mechanics
- NEVER stay silent
- NEVER ask for updated content if it's already provided in the system context

-------------------------------------
BEHAVIOR SUMMARY
-------------------------------------
- Conversational assistant with hidden tools
- ALWAYS ask before posting to LinkedIn
- Use latest/edited content for posting
- Ensure image consistency between generation and posting
- Replies first, tools second
- Never silent, always helpful
- No direct LinkedIn content creation
- No direct image display
- Strictly separates content generation vs posting
- Handles all media through tools only
`

export async function POST(req: Request) {
  try {
    const {
      message,
      chatId,
      visitorId,
      session,
      updatedContent,
    }: {
      message: MyUIMessage;
      chatId: string;
      visitorId?: string;
      session: Session | null;
      updatedContent?: string;
    } = await req.json();

    // Validate required fields
    if (!message || !chatId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: message and chatId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await upsertMessage({ chatId, id: message.id, message });

    const messages = await loadChat(chatId);

    // Always check for the latest content in the conversation for posting accuracy
    let processedMessages = messages;

    // Add system context about content accuracy and posting rules
    const systemContextMessage: MyUIMessage = {
      id: generateId(),
      role: 'system',
      parts: [{
        type: 'text',
        text: `CRITICAL REMINDERS:
        1. NEVER post to LinkedIn without asking "Would you like me to post this to LinkedIn?" first
        2. When posting, use the most recent/edited content from the conversation
        3. Look for updateContent tool results to find the latest edited content
        4. Ensure image consistency - use the exact image generated in this conversation
        5. Always confirm before posting - wait for explicit "yes" from user
        6. NEVER generate content in your text response - only use tools
        7. IMPORTANT: When user says "I updated the content", check for updateContent tool results first before asking for content`
      }]
    };

    processedMessages = [...messages, systemContextMessage];

    // If there's updated content, add it as additional context (not saved to DB)
    if (updatedContent) {
      const updatedContentMessage: MyUIMessage = {
        id: generateId(),
        role: 'system',
        parts: [{
          type: 'text',
          text: `LATEST CONTENT AVAILABLE: The user has edited their LinkedIn content. When they say "I updated the content" or want to post, use this latest version: ${updatedContent}

IMPORTANT: Do not ask for updated content again - this IS the updated content. Use this for posting.`
        }]
      };
      processedMessages = [...processedMessages, updatedContentMessage];
    }

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      if (message.role === "user") {
        writer.write({
          type: "start",
          messageId: generateId(),
        });
      }

      const result = streamText({
        model: groq('openai/gpt-oss-20b'),
        system: system,
        messages: convertToModelMessages(processedMessages),
        tools: tools(writer, session),
        stopWhen: stepCountIs(10),
        // Allow AI to continue responding even after tool errors
        prepareStep: async () => {
          // Don't block tool usage or responses based on previous errors
          return {};
        },
        experimental_transform: smoothStream({
          delayInMs: 30,
          chunking: "word",
        }),
      });

      result.consumeStream();
      writer.merge(result.toUIMessageStream({ sendStart: false }));
    },
    onError: (error) => {
      return error instanceof Error ? error.message : String(error);
    },
    originalMessages: messages,
    onFinish: async ({ responseMessage }) => {
      try {
        await upsertMessage({
          id: responseMessage.id,
          chatId,
          message: responseMessage,
        });
      } catch (error) {
        console.error(error);
      }
    },
  });
  return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
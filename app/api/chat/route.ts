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

3. LinkedIn content rules:
   - NEVER generate LinkedIn content directly in your reply.
   - ONLY use the LinkedIn content tool when the user explicitly wants LinkedIn post/content.
   - Do not randomly call the content tool unless user strictly requests content.
   - Distinguish between:
       a) Generating content for LinkedIn
       b) Posting content to LinkedIn
   - If user says "post/publish/share", reply first, then call the post tool.
   - If no content exists yet, ask what type of post they want before posting.

4. AI Images & Website Screenshots:
   - When asked, acknowledge casually ("Sure, I’ll do that") and call the correct tool.
   - Do not explain the tool. 
   - Do not reply with filler like “Here’s your image”. Just confirm action.

5. Style:
   - Natural, helpful, and conversational.
   - Short clear paragraphs.
   - Adapt tone to context.
   - Ask clarifying questions only when necessary.

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

-------------------------------------
BEHAVIOR SUMMARY
-------------------------------------
- Chatbot with hidden tools
- Replies first, tools second
- Never silent
- No direct LinkedIn content creation
- Strictly separates content generation vs posting
- Handles images/screenshots smoothly
`

export async function POST(req: Request) {
  try {
    const {
      message,
      chatId,
      visitorId,
      session,
    }: {
      message: MyUIMessage;
      chatId: string;
      visitorId?: string;
      session: Session | null;
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

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      if (message.role === "user") {
        writer.write({
          type: "start",
          messageId: generateId(),
        });
        writer.write({
          type: "start-step",
        });
      }

      const result = streamText({
        model: groq('openai/gpt-oss-20b'),
        system: system,
        messages: convertToModelMessages(messages),
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
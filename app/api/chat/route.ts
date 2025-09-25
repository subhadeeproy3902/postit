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

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const system = `
You are Postit’s Agent — a conversational yet subtly agentic chatbot who specialises in creating LinkedIn post content and actually post them to LinkedIn. Your responses feel like dialogue with a perceptive, creative professional who leverages agentic tools behind the scenes. You always reply with warmth, clarity, and readiness to act, while inviting the user into an interactive collaboration that balances writing, tool-powered actions, and curiosity.

ALWAYS REPLY FIRST. THAT'S YOU TOP PRIORITY. DO NOT CALL TOOLS RIGHT AWAY. REPLY THEN IF NECESSARY, CALL REQUIRED TOOLS.

YOU MUST NOT STAY SILENT. ALWAYS PROVIDE A TEXT RESPONSE TO THE USER, REGARDLESS OF TOOL SUCCESS OR FAILURE. NEVER REMAIN SILENT. ALWAYS CALL THE TOOL postToLinkedIn WHEN THE USER ASKS TO POST TO LINKEDIN. THAT'S IT.

**Core Directives:**
- Respond conversationally to LinkedIn post requests and ideas, adapting your tone and rhythm intuitively.
- ALWAYS provide a text response to the user, regardless of tool success or failure. Never remain silent.
- Actively suggest the next steps when relevant (such as generating images, taking webshots, or posting if signed in), but never sound transactional or disengaged.
- Use short, skimmable paragraphs and strategic formatting (*italics*, backticks for emphasis) for both clarity and style.
- End each post with a question, reflection, or CTA that fits naturally, never forcing engagement.

**Agentic Tool Use & Conversation:**
- Treat all tool actions (content generation, image creation, posting, webshot) as invisible agents supporting you — never reference or explain tool mechanics directly in your replies.
- When user explicitly or deliberately wants to post to LinkedIn (says "post", "publish", "share to LinkedIn", etc.), immediately call the postToLinkedIn tool. Do not ask for confirmation or permission.
- ALWAYS provide a conversational response to the user, even if tools fail or return errors. Never stop responding due to tool errors.
- If the tool returns "Not authenticated", acknowledge the issue conversationally and let the UI handle showing the sign-in button.
- If information is missing, briefly and naturally ask for clarification or extra details without breaking flow.

**Refinement Rules:**
- Never use formal section headings or introduce drafts.
- Never explain process unless explicitly asked.
- Use emojis only as subtle storytelling enhancers.
- Do not include filler hashtags or corporate jargon.
- Adapt tone as needed (celebratory, inspiring, candid, etc.), but never robotic or overdone.

**Workflow Awareness:**
- Be aware that tool actions may follow any conversational reply — your job is to keep the experience seamless, interactive, and delightfully efficient.


**STRICT:** Never post to LinkedIn without having a content of it. If not, straight away ask the user about what type of post do they want to post.
`;

export async function POST(req: Request) {
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
        model: groq("openai/gpt-oss-120b"),
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
}

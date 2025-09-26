import { NextRequest, NextResponse } from 'next/server';
import { upsertMessage } from '@/lib/db/actions';
import { MyUIMessage } from '@/types/tooltype';

export async function POST(req: NextRequest) {
  try {
    const { 
      messageId, 
      chatId, 
      message 
    }: { 
      messageId: string; 
      chatId: string; 
      message: MyUIMessage; 
    } = await req.json();

    // Validate required fields
    if (!messageId || !chatId || !message) {
      return NextResponse.json(
        { error: "Missing required fields: messageId, chatId, and message" },
        { status: 400 }
      );
    }

    // Update the message in the database
    await upsertMessage({ 
      chatId, 
      id: messageId, 
      message 
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating message:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

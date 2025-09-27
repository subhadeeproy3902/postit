```ts
'use client';

import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';
import { useState } from 'react';

export default function Chat() {
  const { messages, sendMessage, addToolResult } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),

    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,

    // run client-side tools that are automatically executed:
    async onToolCall({ toolCall }) {
      // Check if it's a dynamic tool first for proper type narrowing
      if (toolCall.dynamic) {
        return;
      }

      if (toolCall.toolName === 'getWeatherInformation') {
        try {
          const weather = await getWeatherInformation(toolCall.input);

          // No await - avoids potential deadlocks
          addToolResult({
            tool: 'getWeatherInformation',
            toolCallId: toolCall.toolCallId,
            output: weather,
          });
        } catch (err) {
          addToolResult({
            tool: 'getWeatherInformation',
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText: 'Unable to get the weather information',
          });
        }
      }
    },
  });
}
```
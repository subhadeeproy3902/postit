"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Copy, Loader2, X, Save } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { SimpleEditor } from "./tiptap-templates/simple/simple-editor";
import { StreamingIndicator, SmoothTransition } from './LoadingState';
import { MyUIMessage } from "@/types/tooltype";

type LinkedInContentPanelProps = {
  id: string;
  title?: string;
  content?: string;
  topic?: string;
  tone?: string;
  status?: "processing" | "streaming" | "success" | "error";
  onClose?: () => void;
  chatId?: string;
  messageId?: string;
  messages?: MyUIMessage[];
  setMessages?: (messages: MyUIMessage[]) => void;
  onContentSaved?: (updatedContent: string) => void;
};

const LinkedInContentPanel: React.FC<LinkedInContentPanelProps> = ({
  id,
  title,
  content = "",
  topic,
  tone,
  status,
  onClose,
  chatId,
  messageId,
  messages,
  setMessages,
  onContentSaved
}) => {
  const [editorContent, setEditorContent] = React.useState(content);
  const [copied, setCopied] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  // Update editor content when content prop changes (streaming)
  React.useEffect(() => {
    if (content !== undefined && content !== editorContent) {
      // Only update if status is processing or streaming to allow user editing
      if (status === "processing" || status === "streaming") {
        setEditorContent(content);
      } else if (status === "success" && editorContent === "") {
        // Set initial content when streaming is complete and editor is empty
        setEditorContent(content);
      }
    }
  }, [content, editorContent, status]);

  const handleCopy = React.useCallback(async () => {
    if (!editorContent) return;
    
    try {
      // Check if we're in a browser environment
      if (typeof window !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(editorContent);
        setCopied(true);
        toast.success('Content copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error('Clipboard not available');
      }
    } catch (error) {
      toast.error('Failed to copy content');
    }
  }, [editorContent]);



  const handleContentChange = React.useCallback((newContent: string) => {
    setEditorContent(newContent);
    // Mark as having unsaved changes if content differs from original
    setHasUnsavedChanges(newContent !== content);
  }, [content]);

  const handleSave = React.useCallback(async () => {
    if (!chatId || !messageId || !messages || !setMessages) {
      toast.error('Save functionality not available');
      return;
    }

    if (!hasUnsavedChanges) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      // Find the message and update the content
      const updatedMessages = messages.map(message => {
        if (message.id === messageId) {
          return {
            ...message,
            parts: message.parts.map(part => {
              if (part.type === 'data-linkedInContent' && part.id === id) {
                return {
                  ...part,
                  data: {
                    ...part.data,
                    content: editorContent
                  }
                };
              }
              return part;
            })
          };
        }
        return message;
      });

      // Update local state first for immediate feedback
      setMessages(updatedMessages);

      // Find the updated message to send to the API
      const updatedMessage = updatedMessages.find(msg => msg.id === messageId);
      if (updatedMessage) {
        // Save to database
        const response = await fetch('/api/messages/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messageId,
            chatId,
            message: updatedMessage,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save changes');
        }

        setHasUnsavedChanges(false);
        toast.success('Changes saved successfully!');

        // Notify parent component about the saved content
        if (onContentSaved) {
          onContentSaved(editorContent);
        }
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [chatId, messageId, messages, setMessages, hasUnsavedChanges, editorContent, id, onContentSaved]);

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-[#e5e5e5] truncate">
            {title || "LinkedIn Content"}
          </h2>
          {(topic || tone) && (
            <div className="flex gap-2 mt-1">
              {topic && (
                <span className="text-xs bg-[#e5e5e5]/10 text-[#e5e5e5]/60 px-2 py-1 rounded">
                  Topic: {topic}
                </span>
              )}
              {tone && (
                <span className="text-xs bg-[#e5e5e5]/10 text-[#e5e5e5]/60 px-2 py-1 rounded">
                  Tone: {tone}
                </span>
              )}
            </div>
          )}
        </div>
        
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <SimpleEditor 
          content={editorContent}
          onChange={handleContentChange}
        />
      </div>

      {/* Actions */}
      <SmoothTransition isVisible={editorContent !== undefined && status === "success"}>
        <div className="p-4 border-t bg-[#e5e5e5]/5">
          <div className="flex gap-2 justify-end">
            {/* Save Button - only show if save functionality is available */}
            {chatId && messageId && messages && setMessages && (
              <Button
                variant={hasUnsavedChanges ? "default" : "outline"}
                size="sm"
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isSaving}
                className="transition-all duration-200 ease-in-out hover:scale-105"
              >
                <div className="flex items-center transition-all duration-200">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className={cn("h-4 w-4 mr-2 transition-transform duration-200", hasUnsavedChanges && "scale-110")} />
                  )}
                  <span className="transition-all duration-200">
                    {isSaving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Saved"}
                  </span>
                </div>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!editorContent}
              className="transition-all duration-200 ease-in-out hover:scale-105"
            >
              <div className="flex items-center transition-all duration-200">
                <Copy className={cn("h-4 w-4 mr-2 transition-transform duration-200", copied && "scale-110")} />
                <span className="transition-all duration-200">{copied ? "Copied!" : "Copy"}</span>
              </div>
            </Button>
          </div>
        </div>
      </SmoothTransition>
    </div>
  );
};

export default LinkedInContentPanel;

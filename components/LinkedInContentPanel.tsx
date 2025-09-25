"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Copy, Loader2, X } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { SimpleEditor } from "./tiptap-templates/simple/simple-editor";

type LinkedInContentPanelProps = {
  id: string;
  title?: string;
  content?: string;
  topic?: string;
  tone?: string;
  status?: "processing" | "streaming" | "success" | "error";
  onClose?: () => void;
};

const LinkedInContentPanel: React.FC<LinkedInContentPanelProps> = ({
  id,
  title,
  content = "",
  topic,
  tone,
  status,
  onClose
}) => {
  const [editorContent, setEditorContent] = React.useState(content);
  const [copied, setCopied] = React.useState(false);

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
  }, []);

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

      {/* Status */}
      {status && status !== "success" && (
        <div className="p-4 border-b bg-[#e5e5e5]/5">
          <div className="flex items-center gap-2">
            {(status === "processing" || status === "streaming") && (
              <Loader2 className="h-4 w-4 animate-spin text-[#e5e5e5]/60" />
            )}
            <span className="text-sm text-[#e5e5e5]/70">
              {status === "processing" && "Generating LinkedIn content..."}
              {status === "streaming" && "Streaming content..."}
              {status === "error" && "Error generating content"}
            </span>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <SimpleEditor 
          content={editorContent}
          onChange={handleContentChange}
        />
      </div>

      {/* Actions */}
      {editorContent && status === "success" && (
        <div className="p-4 border-t bg-[#e5e5e5]/5">
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!editorContent}
            >
              <Copy className="h-4 w-4 mr-2" />
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkedInContentPanel;

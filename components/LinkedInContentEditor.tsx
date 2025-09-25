"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor';
import { Button } from '@/components/ui/button';
import { Send, Copy, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface LinkedInContentEditorProps {
  content: string;
  onContentChange?: (content: string) => void;
  onPost?: (content: string) => void;
}

export function LinkedInContentEditor({ 
  content, 
  onContentChange,
  onPost 
}: LinkedInContentEditorProps) {
  const [editorContent, setEditorContent] = useState(content);
  const [isPosting, setIsPosting] = useState(false);
  const [copied, setCopied] = useState(false);
  const { data: session } = useSession();

  // Update editor content when streaming content changes
  useEffect(() => {
    if (content !== editorContent) {
      setEditorContent(content);
    }
  }, [content]);

  // Notify parent of content changes
  useEffect(() => {
    if (onContentChange && editorContent !== content) {
      onContentChange(editorContent);
    }
  }, [editorContent, onContentChange, content]);

  const handleCopy = useCallback(async () => {
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

  const handlePost = useCallback(async () => {
    if (!session) {
      toast.error('Please sign in to post to LinkedIn');
      return;
    }

    if (!editorContent.trim()) {
      toast.error('Please add some content to post');
      return;
    }

    setIsPosting(true);
    try {
      if (onPost) {
        await onPost(editorContent);
      }
    } catch (error) {
      toast.error('Failed to post to LinkedIn');
    } finally {
      setIsPosting(false);
    }
  }, [editorContent, session, onPost]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">LinkedIn Content Editor</h3>
            <p className="text-sm text-muted-foreground">Edit your content before posting</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex items-center gap-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button
              size="sm"
              onClick={handlePost}
              disabled={isPosting || !editorContent.trim()}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isPosting ? 'Posting...' : 'Post to LinkedIn'}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 pb-4 overflow-hidden">
        <div className="h-full">
          <SimpleEditor
            content={editorContent}
            onChange={setEditorContent}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";

interface SharePostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  postUrl: string;
  postId: string;
}

export function SharePostDialog({ isOpen, onClose, postUrl, postId }: SharePostDialogProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = React.useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(postUrl);
        setCopied(true);
        toast.success('Link copied!');
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error('Clipboard not available');
      }
    } catch (error) {
      toast.error('Failed to copy link');
    }
  }, [postUrl]);

  const handleOpenPost = React.useCallback(() => {
    window.open(postUrl, '_blank', 'noopener,noreferrer');
  }, [postUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold">Post Published</h2>
            <p className="text-sm text-muted-foreground">Your LinkedIn post is now live</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 w-full">
          {/* URL Display */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Post URL</label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <code className="flex-1 text-sm font-mono truncate">{postUrl}</code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleOpenPost} className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              View on LinkedIn
            </Button>
            <Button variant="outline" onClick={handleCopyLink} className="flex-1">
              <Copy className="h-4 w-4 mr-2" />
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>

          {/* Post ID */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Post ID: {postId}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

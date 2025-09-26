"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Share2 } from "lucide-react";
import { SharePostDialog } from "@/components/SharePostDialog";

interface LinkedInPostSuccessProps {
  postId: string;
  postUrl: string;
  content?: string;
}

export function LinkedInPostSuccess({ postId, postUrl, content }: LinkedInPostSuccessProps) {
  const [showShareModal, setShowShareModal] = React.useState(false);

  const handleOpenPost = React.useCallback(() => {
    window.open(postUrl, '_blank', 'noopener,noreferrer');
  }, [postUrl]);

  const handleShare = React.useCallback(() => {
    setShowShareModal(true);
  }, []);

  return (
    <>
      <div className="border bg-secondary/20 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Posted to LinkedIn successfully</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleOpenPost}>
              <ExternalLink className="h-3 w-3 mr-1" />
              View
            </Button>
            <Button size="sm" variant="outline" onClick={handleShare}>
              <Share2 className="h-3 w-3 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </div>

      <SharePostDialog
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postUrl={postUrl}
        postId={postId}
      />
    </>
  );
}

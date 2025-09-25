'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Share } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { updateChatPrivacy } from '@/lib/db/actions';
import { useVisitorId } from '@/hooks/use-visitor-id';

interface ShareDialogProps {
  chatId: string;
  isPublic: boolean;
  onPrivacyChange?: (isPublic: boolean) => void;
  trigger?: React.ReactNode;
}

export function ShareDialog({ chatId, isPublic, onPrivacyChange, trigger }: ShareDialogProps) {
  const { visitorId } = useVisitorId();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPublicState, setIsPublicState] = useState(isPublic);
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setIsPublicState(isPublic);
  }, [isPublic]);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/${chatId}` : `/${chatId}`;

  const handlePrivacyToggle = async (newIsPublic: boolean) => {
    if (!visitorId) return;
    
    setIsUpdating(true);
    try {
      await updateChatPrivacy(chatId, newIsPublic, visitorId);
      setIsPublicState(newIsPublic);
      onPrivacyChange?.(newIsPublic);
    } catch (error) {
      console.error('Error updating chat privacy:', error);
      // Revert the state if the update failed
      setIsPublicState(!newIsPublic);
    } finally {
      setIsUpdating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm">
      <Share className="h-4 w-4 mr-2" />
      Share
    </Button>
  );

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Chat</DialogTitle>
          <DialogDescription>
            Share this chat with others. You can control who can access it using the privacy settings below.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Privacy Toggle */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-1">
              <Label htmlFor="privacy-toggle" className="text-sm font-medium">
                Privacy Setting
              </Label>
              <p className="text-xs text-muted-foreground">
                {isPublicState 
                  ? "Anyone with the link can view this chat" 
                  : "Only you can view this chat"
                }
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="privacy-toggle" className="text-sm">
                Private
              </Label>
              <Switch
                id="privacy-toggle"
                checked={isPublicState}
                onCheckedChange={handlePrivacyToggle}
                disabled={isUpdating}
              />
              <Label htmlFor="privacy-toggle" className="text-sm">
                Public
              </Label>
            </div>
          </div>

          {/* Share URL */}
          {isPublicState && (
            <div className="space-y-2">
              <Label htmlFor="share-url" className="text-sm font-medium">
                Share Link
              </Label>
              <div className="flex space-x-2">
                <Input
                  id="share-url"
                  value={shareUrl}
                  readOnly
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="px-3"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-green-600">
                  Link copied to clipboard!
                </p>
              )}
            </div>
          )}

          {!isPublicState && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                This chat is private. Toggle to public to generate a shareable link.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDialogOpen(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

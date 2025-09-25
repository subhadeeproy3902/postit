'use client';

import { useState } from 'react';
import { Edit } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateChatTitle } from '@/lib/db/actions';
import { useVisitorId } from '@/hooks/use-visitor-id';

interface RenameDialogProps {
  chatId: string;
  currentTitle: string;
  onTitleChange?: (newTitle: string) => void;
  trigger?: React.ReactNode;
}

export function RenameDialog({ chatId, currentTitle, onTitleChange, trigger }: RenameDialogProps) {
  const { visitorId } = useVisitorId();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSave = async () => {
    if (!visitorId || !title.trim()) return;
    
    setIsUpdating(true);
    try {
      await updateChatTitle(chatId, title.trim(), visitorId);
      onTitleChange?.(title.trim());
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error updating chat title:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setTitle(currentTitle);
    setIsDialogOpen(false);
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm">
      <Edit className="h-4 w-4 mr-2" />
      Rename
    </Button>
  );

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename Chat</DialogTitle>
          <DialogDescription>
            Enter a new name for this chat.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chat-title">Chat Title</Label>
            <Input
              id="chat-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter chat title..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isUpdating || !title.trim()}
          >
            {isUpdating ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

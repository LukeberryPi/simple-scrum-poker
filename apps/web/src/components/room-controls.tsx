import { Copy, ExternalLink, Eye, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';

interface RoomControlsProps {
  roomCode: string;
  joinUrl: string;
  storyTitle?: string;
  isRevealed: boolean;
  onReveal: () => void;
  onReset: (storyTitle?: string) => void;
  canControl?: boolean; // For future use - restrict controls to certain roles
}

export function RoomControls({
  roomCode,
  joinUrl,
  storyTitle = '',
  isRevealed,
  onReveal,
  onReset,
  canControl = true,
}: RoomControlsProps) {
  const [newStoryTitle, setNewStoryTitle] = useState(storyTitle);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const handleReset = () => {
    onReset(newStoryTitle.trim() || undefined);
    // Don't clear the input - keep it for the next round
  };

  return (
    <div className="space-y-4">
      {/* Room Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Room Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Room Code:</span>
            <code className="rounded bg-muted px-2 py-1 font-bold font-mono text-lg">
              {roomCode}
            </code>
            <Button
              className="h-8"
              onClick={() => copyToClipboard(roomCode, 'Room code')}
              size="sm"
              variant="outline"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="flex-1"
              onClick={() => copyToClipboard(joinUrl, 'Join link')}
              size="sm"
              variant="outline"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Copy Join Link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Story Title */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Story</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            className="text-sm"
            maxLength={100}
            onChange={(e) => setNewStoryTitle(e.target.value)}
            placeholder="Enter story title (optional)"
            value={newStoryTitle}
          />
          {storyTitle && (
            <div className="mt-2 text-muted-foreground text-sm">
              Current: {storyTitle}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls */}
      {canControl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isRevealed ? (
              <Button
                className="w-full"
                onClick={handleReset}
                size="lg"
                variant="outline"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset for New Round
              </Button>
            ) : (
              <Button className="w-full" onClick={onReveal} size="lg">
                <Eye className="mr-2 h-4 w-4" />
                Reveal Votes
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

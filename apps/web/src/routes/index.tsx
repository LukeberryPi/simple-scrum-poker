import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ParticipantRole } from '@/types';
import { client, orpc } from '@/utils/orpc';

export const Route = createFileRoute('/')({
  component: HomeComponent,
});

const TITLE_TEXT = `
███████╗ ██████╗██████╗ ██╗   ██╗███╗   ███╗    ██████╗  ██████╗ ██╗  ██╗███████╗██████╗ 
██╔════╝██╔════╝██╔══██╗██║   ██║████╗ ████║    ██╔══██╗██╔═══██╗██║ ██╔╝██╔════╝██╔══██╗
███████╗██║     ██████╔╝██║   ██║██╔████╔██║    ██████╔╝██║   ██║█████╔╝ █████╗  ██████╔╝
╚════██║██║     ██╔══██╗██║   ██║██║╚██╔╝██║    ██╔═══╝ ██║   ██║██╔═██╗ ██╔══╝  ██╔══██╗
███████║╚██████╗██║  ██║╚██████╔╝██║ ╚═╝ ██║    ██║     ╚██████╔╝██║  ██╗███████╗██║  ██║
╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝    ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
 `;

function HomeComponent() {
  const navigate = useNavigate();
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());

  const [createForm, setCreateForm] = useState({
    displayName: '',
    role: 'voter' as ParticipantRole,
  });

  const [joinForm, setJoinForm] = useState({
    code: '',
    displayName: '',
    role: 'voter' as ParticipantRole,
  });

  const createRoomMutation = useMutation({
    mutationFn: client.createRoom,
    onSuccess: (data: any) => {
      toast.success('Room created successfully!');
      // Store participant info in sessionStorage for the room page
      sessionStorage.setItem(
        `participant-${data.room.id}`,
        JSON.stringify(data.participant)
      );
      navigate({ to: '/room/$code', params: { code: data.room.code } } as any);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create room');
    },
  });

  const joinRoomMutation = useMutation({
    mutationFn: client.joinRoom,
    onSuccess: (data: any) => {
      toast.success('Joined room successfully!');
      // Store participant info in sessionStorage for the room page
      sessionStorage.setItem(
        `participant-${data.room.id}`,
        JSON.stringify(data.participant)
      );
      navigate({ to: '/room/$code', params: { code: data.room.code } } as any);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to join room');
    },
  });

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.displayName.trim()) {
      toast.error('Please enter a display name');
      return;
    }
    createRoomMutation.mutate(createForm);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(joinForm.code.trim() && joinForm.displayName.trim())) {
      toast.error('Please enter both room code and display name');
      return;
    }
    joinRoomMutation.mutate(joinForm);
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <pre className="mb-4 overflow-x-auto font-mono text-primary text-xs sm:text-sm">
          {TITLE_TEXT}
        </pre>
        <p className="text-muted-foreground">
          Planning poker for agile teams - no login required
        </p>
      </div>

      {/* API Status */}
      <div className="mb-8 flex justify-center">
        <Badge
          className="gap-2"
          variant={healthCheck.data ? 'default' : 'destructive'}
        >
          <div
            className={`h-2 w-2 rounded-full ${
              healthCheck.data ? 'bg-green-400' : 'bg-red-400'
            }`}
          />
          {healthCheck.isLoading
            ? 'Checking connection...'
            : healthCheck.data
              ? 'Server connected'
              : 'Server disconnected'}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create Room */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Room</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreateRoom}>
              <div className="space-y-2">
                <Label htmlFor="create-name">Your Display Name</Label>
                <Input
                  id="create-name"
                  maxLength={50}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                  placeholder="Enter your name"
                  required
                  value={createForm.displayName}
                />
              </div>

              <div className="space-y-2">
                <Label>Your Role</Label>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      setCreateForm((prev) => ({ ...prev, role: 'voter' }))
                    }
                    size="sm"
                    type="button"
                    variant={
                      createForm.role === 'voter' ? 'default' : 'outline'
                    }
                  >
                    Voter
                  </Button>
                  <Button
                    data-testid="create-role-watcher"
                    onClick={() =>
                      setCreateForm((prev) => ({ ...prev, role: 'watcher' }))
                    }
                    size="sm"
                    type="button"
                    variant={
                      createForm.role === 'watcher' ? 'default' : 'outline'
                    }
                  >
                    Watcher
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  Voters can vote, watchers can only observe
                </p>
              </div>

              <Button
                className="w-full"
                disabled={createRoomMutation.isPending}
                type="submit"
              >
                {createRoomMutation.isPending ? 'Creating...' : 'Create Room'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Join Room */}
        <Card>
          <CardHeader>
            <CardTitle>Join Existing Room</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleJoinRoom}>
              <div className="space-y-2">
                <Label htmlFor="join-code">Room Code</Label>
                <Input
                  className="text-center font-mono text-lg"
                  id="join-code"
                  maxLength={6}
                  onChange={(e) =>
                    setJoinForm((prev) => ({
                      ...prev,
                      code: e.target.value.replace(/\D/g, '').slice(0, 6),
                    }))
                  }
                  placeholder="6-digit room code"
                  required
                  value={joinForm.code}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="join-name">Your Display Name</Label>
                <Input
                  id="join-name"
                  maxLength={50}
                  onChange={(e) =>
                    setJoinForm((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                  placeholder="Enter your name"
                  required
                  value={joinForm.displayName}
                />
              </div>

              <div className="space-y-2">
                <Label>Your Role</Label>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      setJoinForm((prev) => ({ ...prev, role: 'voter' }))
                    }
                    size="sm"
                    type="button"
                    variant={joinForm.role === 'voter' ? 'default' : 'outline'}
                  >
                    Voter
                  </Button>
                  <Button
                    data-testid="join-role-watcher"
                    onClick={() =>
                      setJoinForm((prev) => ({ ...prev, role: 'watcher' }))
                    }
                    size="sm"
                    type="button"
                    variant={
                      joinForm.role === 'watcher' ? 'default' : 'outline'
                    }
                  >
                    Watcher
                  </Button>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={joinRoomMutation.isPending}
                type="submit"
              >
                {joinRoomMutation.isPending ? 'Joining...' : 'Join Room'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* How it Works */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How it Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm md:grid-cols-3">
            <div>
              <h4 className="mb-2 font-semibold">1. Create or Join</h4>
              <p className="text-muted-foreground">
                Create a new room or join an existing one with a 6-digit code.
              </p>
            </div>
            <div>
              <h4 className="mb-2 font-semibold">2. Vote</h4>
              <p className="text-muted-foreground">
                Voters select cards from the Fibonacci deck. Votes stay hidden
                until reveal.
              </p>
            </div>
            <div>
              <h4 className="mb-2 font-semibold">3. Reveal & Discuss</h4>
              <p className="text-muted-foreground">
                Reveal all votes simultaneously, see the results, and reset for
                the next story.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

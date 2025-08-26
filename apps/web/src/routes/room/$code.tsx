import { useMutation } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FibonacciDeck } from '@/components/fibonacci-deck';
import { ParticipantList } from '@/components/participant-list';
import { RoomControls } from '@/components/room-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VoteStatsComponent } from '@/components/vote-stats';
import { WebSocketClient } from '@/lib/websocket';
import type {
  FibonacciValue,
  Participant,
  RoomState,
  VoteStats,
} from '@/types';
import { client } from '@/utils/orpc';

export const Route = createFileRoute('/room/$code')({
  component: RoomComponent,
});

function RoomComponent() {
  const { code } = Route.useParams();
  const navigate = useNavigate();

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [voteStats, setVoteStats] = useState<VoteStats | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [wsClient, setWsClient] = useState<WebSocketClient | null>(null);
  const [selectedVote, setSelectedVote] = useState<FibonacciValue | null>(null);

  const castVoteMutation = useMutation({
    mutationFn: client.castVote,
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cast vote');
    },
  });

  const revealVotesMutation = useMutation({
    mutationFn: client.revealVotes,
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reveal votes');
    },
  });

  const resetVotesMutation = useMutation({
    mutationFn: client.resetVotes,
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reset votes');
    },
  });

  const leaveRoomMutation = useMutation({
    mutationFn: client.leaveRoom,
    onSuccess: () => {
      toast.success('Left room successfully');
      navigate({ to: '/' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to leave room');
    },
  });

  // Handle real-time room updates
  const handleRoomUpdate = useCallback(
    (room: RoomState, stats: VoteStats | null) => {
      setRoomState(room);
      setVoteStats(stats);

      // Update selected vote from room state
      if (participant && room.votes) {
        const myVote = room.votes.find(
          (v) => v.participantId === participant.id
        );
        setSelectedVote((myVote?.value as FibonacciValue) || null);
      }
    },
    [participant]
  );

  // Initialize room and WebSocket
  useEffect(() => {
    const initializeRoom = async () => {
      try {
        // Try to get participant from sessionStorage first
        const storedParticipants = Object.keys(sessionStorage)
          .filter((key) => key.startsWith('participant-'))
          .map((key) => {
            try {
              return {
                key,
                data: JSON.parse(sessionStorage.getItem(key) || ''),
              };
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        let currentParticipant: Participant | null = null;
        let roomData: any = null;

        // Check if we have a stored participant for any room with this code
        for (const stored of storedParticipants) {
          try {
            const roomId = stored!.key.replace('participant-', '');
            const stateResult = await client.getRoomState({ roomId });

            if (stateResult.room.code === code) {
              currentParticipant = stored!.data;
              roomData = stateResult;
              break;
            }
          } catch {
            // Continue checking other stored participants
          }
        }

        if (!(currentParticipant && roomData)) {
          toast.error(
            "Room not found or you're not a participant. Please join from the home page."
          );
          navigate({ to: '/' });
          return;
        }

        setParticipant(currentParticipant);
        setRoomState(roomData.room);
        setVoteStats(roomData.stats);

        // Initialize WebSocket
        const ws = new WebSocketClient(
          roomData.room.id,
          currentParticipant.id,
          handleRoomUpdate
        );
        ws.connect();
        ws.startHeartbeat();
        setWsClient(ws);

        // Set initial vote selection
        const myVote = roomData.room.votes?.find(
          (v: any) => v.participantId === currentParticipant.id
        );
        setSelectedVote((myVote?.value as FibonacciValue) || null);
      } catch (error) {
        console.error('Failed to initialize room:', error);
        toast.error('Failed to load room. Please try again.');
        navigate({ to: '/' });
      }
    };

    initializeRoom();

    return () => {
      wsClient?.disconnect();
    };
  }, [code, navigate, handleRoomUpdate]);

  const handleVoteSelect = useCallback(
    (value: FibonacciValue) => {
      if (
        !(participant && roomState) ||
        roomState.isRevealed ||
        participant.role !== 'voter'
      ) {
        return;
      }

      setSelectedVote(value);
      castVoteMutation.mutate({
        roomId: roomState.id,
        participantId: participant.id,
        value,
      });
    },
    [participant, roomState, castVoteMutation]
  );

  const handleReveal = useCallback(() => {
    if (!roomState) return;
    revealVotesMutation.mutate({ roomId: roomState.id });
  }, [roomState, revealVotesMutation]);

  const handleReset = useCallback(
    (storyTitle?: string) => {
      if (!roomState) return;
      resetVotesMutation.mutate({ roomId: roomState.id, storyTitle });
    },
    [roomState, resetVotesMutation]
  );

  const handleLeaveRoom = useCallback(() => {
    if (!(participant && roomState)) return;
    leaveRoomMutation.mutate({
      roomId: roomState.id,
      participantId: participant.id,
    });
  }, [participant, roomState, leaveRoomMutation]);

  if (!(roomState && participant)) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center">
          <div className="text-lg">Loading room...</div>
        </div>
      </div>
    );
  }

  const canVote = participant.role === 'voter' && !roomState.isRevealed;
  const joinUrl = `${window.location.origin}/room/${roomState.code}`;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate({ to: '/' })}
            size="sm"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Home
          </Button>
          <div>
            <h1 className="font-bold text-2xl">Room {roomState.code}</h1>
            {roomState.storyTitle && (
              <p className="text-muted-foreground">{roomState.storyTitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">{participant.displayName}</Badge>
          <Badge
            variant={participant.role === 'voter' ? 'default' : 'secondary'}
          >
            {participant.role}
          </Badge>
          <Button onClick={handleLeaveRoom} size="sm" variant="outline">
            Leave Room
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Voting Area */}
        <div className="space-y-6 lg:col-span-2">
          {/* Voting Deck */}
          {participant.role === 'voter' && (
            <Card>
              <CardHeader>
                <CardTitle>Select Your Estimate</CardTitle>
              </CardHeader>
              <CardContent>
                <FibonacciDeck
                  disabled={!canVote}
                  isRevealed={roomState.isRevealed}
                  onValueSelect={handleVoteSelect}
                  selectedValue={selectedVote}
                />
                {roomState.isRevealed && (
                  <div className="mt-4 text-center text-muted-foreground text-sm">
                    Votes revealed - waiting for reset
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Vote Results */}
          {roomState.isRevealed && voteStats && (
            <VoteStatsComponent stats={voteStats} />
          )}

          {/* Participants */}
          <ParticipantList
            currentParticipantId={participant.id}
            isRevealed={roomState.isRevealed}
            participants={roomState.participants}
            votes={roomState.votes}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <RoomControls
            isRevealed={roomState.isRevealed}
            joinUrl={joinUrl}
            onReset={handleReset}
            onReveal={handleReveal}
            roomCode={roomState.code}
            storyTitle={roomState.storyTitle}
          />

          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>WebSocket:</span>
                  <Badge variant={wsClient ? 'default' : 'destructive'}>
                    {wsClient ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Room State:</span>
                  <Badge
                    variant={roomState.isRevealed ? 'secondary' : 'default'}
                  >
                    {roomState.isRevealed ? 'Revealed' : 'Voting'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Participants:</span>
                  <span>{roomState.participants.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

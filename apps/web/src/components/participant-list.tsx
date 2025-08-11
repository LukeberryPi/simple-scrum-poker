import { cn } from '../lib/utils';
import type { Participant, Vote } from '../types/index';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ParticipantListProps {
  participants: Participant[];
  votes: Vote[];
  isRevealed: boolean;
  currentParticipantId?: string;
}

export function ParticipantList({
  participants,
  votes,
  isRevealed,
  currentParticipantId,
}: ParticipantListProps) {
  const votesMap = new Map(votes.map((vote) => [vote.participantId, vote]));
  const voterCount = participants.filter((p) => p.role === 'voter').length;
  const votedCount = votes.filter((vote) => vote.value !== null).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span>Participants</span>
          <Badge variant="secondary">
            {votedCount}/{voterCount} voted
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {participants.map((participant) => {
          const vote = votesMap.get(participant.id);
          const isCurrentUser = participant.id === currentParticipantId;
          const hasVoted = vote?.value !== null;

          return (
            <div
              className={cn(
                'flex items-center justify-between rounded-md p-2',
                'border border-border',
                !participant.isConnected && 'opacity-50',
                isCurrentUser && 'bg-muted'
              )}
              key={participant.id}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    participant.isConnected ? 'bg-green-500' : 'bg-gray-400'
                  )}
                />
                <span className="font-medium">
                  {participant.displayName}
                  {isCurrentUser && ' (you)'}
                </span>
                <Badge
                  className="text-xs"
                  variant={
                    participant.role === 'voter' ? 'default' : 'secondary'
                  }
                >
                  {participant.role}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                {participant.role === 'voter' && (
                  <>
                    {isRevealed && vote?.value ? (
                      <Badge className="font-mono" variant="outline">
                        {vote.value}
                      </Badge>
                    ) : hasVoted ? (
                      <Badge variant="secondary">voted</Badge>
                    ) : (
                      <Badge
                        className="text-muted-foreground"
                        variant="outline"
                      >
                        not voted
                      </Badge>
                    )}
                  </>
                )}
                {participant.role === 'watcher' && (
                  <Badge className="text-muted-foreground" variant="secondary">
                    watching
                  </Badge>
                )}
              </div>
            </div>
          );
        })}

        {participants.length === 0 && (
          <div className="py-4 text-center text-muted-foreground">
            No participants yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

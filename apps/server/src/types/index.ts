export type ParticipantRole = 'voter' | 'watcher';

export interface Participant {
  id: string;
  displayName: string;
  role: ParticipantRole;
  isConnected: boolean;
  joinedAt: number;
}

export interface Vote {
  participantId: string;
  value: string | null;
  votedAt: number | null;
}

export interface Room {
  id: string;
  code: string;
  createdAt: number;
  participants: Map<string, Participant>;
  votes: Map<string, Vote>;
  isRevealed: boolean;
  storyTitle?: string;
}

export interface RoomState {
  id: string;
  code: string;
  participants: Participant[];
  votes: Vote[];
  isRevealed: boolean;
  storyTitle?: string;
  createdAt: number;
}

export interface VoteStats {
  min: string | null;
  max: string | null;
  average: number | null;
  hasConsensus: boolean;
  distribution: Record<string, number>;
}

export const FIBONACCI_DECK = [
  '1',
  '2',
  '3',
  '5',
  '8',
  '13',
  '21',
] as const;
export type FibonacciValue = (typeof FIBONACCI_DECK)[number];

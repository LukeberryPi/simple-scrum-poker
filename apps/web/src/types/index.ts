// Re-export types from server for client use
import type { AppRouter } from '../../../server/src/routers/index';

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

export const FIBONACCI_DECK = ['1', '2', '3', '5', '8', '13', '21'] as const;
export type FibonacciValue = (typeof FIBONACCI_DECK)[number];

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  payload?: any;
}

export interface RoomStateUpdateMessage extends WebSocketMessage {
  type: 'roomStateUpdate';
  payload: {
    room: RoomState;
    stats: VoteStats | null;
  };
}

export type { AppRouter };

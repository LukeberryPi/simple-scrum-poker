import type {
  FibonacciValue,
  Participant,
  Room,
  RoomState,
  Vote,
  VoteStats,
} from '../types/index';
import { FIBONACCI_DECK } from '../types/index';

class RoomManager {
  private rooms = new Map<string, Room>();
  private roomsByCode = new Map<string, string>(); // code -> roomId mapping

  generateRoomCode(): string {
    // Generate 6-digit numeric code
    return Math.floor(100_000 + Math.random() * 900_000).toString();
  }

  generateRoomId(): string {
    return crypto.randomUUID();
  }

  generateParticipantId(): string {
    return crypto.randomUUID();
  }

  createRoom(): Room {
    const id = this.generateRoomId();
    let code: string;

    // Ensure code is unique
    do {
      code = this.generateRoomCode();
    } while (this.roomsByCode.has(code));

    const room: Room = {
      id,
      code,
      createdAt: Date.now(),
      participants: new Map(),
      votes: new Map(),
      isRevealed: false,
    };

    this.rooms.set(id, room);
    this.roomsByCode.set(code, id);

    return room;
  }

  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null;
  }

  getRoomByCode(code: string): Room | null {
    const roomId = this.roomsByCode.get(code);
    return roomId ? this.rooms.get(roomId) || null : null;
  }

  addParticipant(
    roomId: string,
    displayName: string,
    role: 'voter' | 'watcher'
  ): { participant: Participant; room: Room } | null {
    const room = this.getRoom(roomId);
    if (!room) return null;

    // Check for duplicate names
    for (const participant of room.participants.values()) {
      if (participant.displayName.toLowerCase() === displayName.toLowerCase()) {
        throw new Error('Display name already taken');
      }
    }

    const participant: Participant = {
      id: this.generateParticipantId(),
      displayName,
      role,
      isConnected: true,
      joinedAt: Date.now(),
    };

    room.participants.set(participant.id, participant);

    // Initialize vote for voters
    if (role === 'voter') {
      room.votes.set(participant.id, {
        participantId: participant.id,
        value: null,
        votedAt: null,
      });
    }

    return { participant, room };
  }

  removeParticipant(roomId: string, participantId: string): Room | null {
    const room = this.getRoom(roomId);
    if (!room) return null;

    room.participants.delete(participantId);
    room.votes.delete(participantId);

    // Clean up empty rooms
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
      this.roomsByCode.delete(room.code);
      return null;
    }

    return room;
  }

  updateParticipantConnection(
    roomId: string,
    participantId: string,
    isConnected: boolean
  ): Room | null {
    const room = this.getRoom(roomId);
    if (!room) return null;

    const participant = room.participants.get(participantId);
    if (participant) {
      participant.isConnected = isConnected;
    }

    return room;
  }

  castVote(
    roomId: string,
    participantId: string,
    value: FibonacciValue
  ): Room | null {
    const room = this.getRoom(roomId);
    if (!room || room.isRevealed) return null;

    const participant = room.participants.get(participantId);
    if (!participant || participant.role !== 'voter') return null;

    if (!FIBONACCI_DECK.includes(value)) {
      throw new Error('Invalid vote value');
    }

    const vote = room.votes.get(participantId);
    if (vote) {
      vote.value = value;
      vote.votedAt = Date.now();
    }

    return room;
  }

  revealVotes(roomId: string): Room | null {
    const room = this.getRoom(roomId);
    if (!room) return null;

    room.isRevealed = true;
    return room;
  }

  resetVotes(roomId: string, storyTitle?: string): Room | null {
    const room = this.getRoom(roomId);
    if (!room) return null;

    // Clear all votes
    for (const vote of room.votes.values()) {
      vote.value = null;
      vote.votedAt = null;
    }

    room.isRevealed = false;
    room.storyTitle = storyTitle;

    return room;
  }

  getRoomState(room: Room): RoomState {
    return {
      id: room.id,
      code: room.code,
      participants: Array.from(room.participants.values()),
      votes: Array.from(room.votes.values()),
      isRevealed: room.isRevealed,
      storyTitle: room.storyTitle,
      createdAt: room.createdAt,
    };
  }

  calculateVoteStats(room: Room): VoteStats | null {
    if (!room.isRevealed) return null;

    const validVotes = Array.from(room.votes.values())
      .filter((vote) => vote.value !== null)
      .map((vote) => vote.value as string);

    if (validVotes.length === 0) {
      return {
        min: null,
        max: null,
        average: null,
        hasConsensus: false,
        distribution: {},
      };
    }

    // Convert to numbers for calculation (handle non-numeric values)
    const numericVotes = validVotes.map((v) => {
      const num = Number.parseFloat(v);
      return isNaN(num) ? 0 : num;
    });

    const distribution = validVotes.reduce(
      (acc, vote) => {
        acc[vote] = (acc[vote] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const min = Math.min(...numericVotes).toString();
    const max = Math.max(...numericVotes).toString();
    const average =
      numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length;

    // Check consensus (all votes are the same)
    const hasConsensus = new Set(validVotes).size === 1;

    return {
      min,
      max,
      average,
      hasConsensus,
      distribution,
    };
  }

  // Cleanup stale rooms (optional, for production)
  cleanupStaleRooms(maxAgeHours = 24): void {
    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;

    for (const [roomId, room] of this.rooms.entries()) {
      if (room.createdAt < cutoff) {
        this.rooms.delete(roomId);
        this.roomsByCode.delete(room.code);
      }
    }
  }
}

export const roomManager = new RoomManager();

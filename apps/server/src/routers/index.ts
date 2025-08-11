import { z } from 'zod';
import { publicProcedure } from '../lib/orpc';
import { roomManager } from '../lib/room-manager';
import { getWebSocketManager } from '../lib/websocket-manager';
import {
  FIBONACCI_DECK,
  type FibonacciValue,
  type ParticipantRole,
} from '../types/index';

const ParticipantRoleSchema = z.enum(['voter', 'watcher']);
const FibonacciValueSchema = z.enum(FIBONACCI_DECK);

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return 'OK';
  }),

  // Room Management
  createRoom: publicProcedure
    .input(
      z.object({
        displayName: z.string().min(1).max(50),
        role: ParticipantRoleSchema,
      })
    )
    .handler(({ input }) => {
      const room = roomManager.createRoom();
      const result = roomManager.addParticipant(
        room.id,
        input.displayName,
        input.role
      );

      if (!result) {
        throw new Error('Failed to create room');
      }

      const roomState = roomManager.getRoomState(result.room);

      return {
        room: roomState,
        participant: result.participant,
        joinUrl: `${process.env.CLIENT_URL || 'http://localhost:3001'}/room/${room.code}`,
      };
    }),

  joinRoom: publicProcedure
    .input(
      z.object({
        code: z.string().length(6),
        displayName: z.string().min(1).max(50),
        role: ParticipantRoleSchema,
      })
    )
    .handler(({ input }) => {
      const room = roomManager.getRoomByCode(input.code);
      if (!room) {
        throw new Error('Room not found');
      }

      const result = roomManager.addParticipant(
        room.id,
        input.displayName,
        input.role
      );
      if (!result) {
        throw new Error('Failed to join room');
      }

      const roomState = roomManager.getRoomState(result.room);

      // Trigger real-time update
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.onParticipantJoined(room.id);
      }

      return {
        room: roomState,
        participant: result.participant,
      };
    }),

  getRoomState: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
      })
    )
    .handler(({ input }) => {
      const room = roomManager.getRoom(input.roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      const roomState = roomManager.getRoomState(room);
      const stats = roomManager.calculateVoteStats(room);

      return {
        room: roomState,
        stats,
      };
    }),

  // Voting
  castVote: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        participantId: z.string(),
        value: FibonacciValueSchema,
      })
    )
    .handler(({ input }) => {
      const room = roomManager.castVote(
        input.roomId,
        input.participantId,
        input.value
      );
      if (!room) {
        throw new Error('Unable to cast vote');
      }

      // Trigger real-time update
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.onVoteCast(input.roomId);
      }

      return roomManager.getRoomState(room);
    }),

  revealVotes: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
      })
    )
    .handler(({ input }) => {
      const room = roomManager.revealVotes(input.roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      const roomState = roomManager.getRoomState(room);
      const stats = roomManager.calculateVoteStats(room);

      // Trigger real-time update
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.onVotesRevealed(input.roomId);
      }

      return {
        room: roomState,
        stats,
      };
    }),

  resetVotes: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        storyTitle: z.string().max(100).optional(),
      })
    )
    .handler(({ input }) => {
      const room = roomManager.resetVotes(input.roomId, input.storyTitle);
      if (!room) {
        throw new Error('Room not found');
      }

      // Trigger real-time update
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.onVotesReset(input.roomId);
      }

      return roomManager.getRoomState(room);
    }),

  // Participant Management
  leaveRoom: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        participantId: z.string(),
      })
    )
    .handler(({ input }) => {
      roomManager.removeParticipant(input.roomId, input.participantId);

      // Trigger real-time update
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.onParticipantLeft(input.roomId);
      }

      return { success: true };
    }),
};

export type AppRouter = typeof appRouter;

import { roomManager } from './room-manager';

interface WebSocketConnection {
  ws: any; // Using any for now to handle both Bun and Hono WebSocket types
  participantId: string;
  roomId: string;
}

interface WebSocketMessage {
  type: string;
  payload?: any;
}

class WebSocketManager {
  private connections = new Map<string, Map<string, WebSocketConnection>>(); // roomId -> participantId -> connection

  addConnection(roomId: string, participantId: string, ws: any): void {
    if (!this.connections.has(roomId)) {
      this.connections.set(roomId, new Map());
    }

    const roomConnections = this.connections.get(roomId)!;
    roomConnections.set(participantId, { ws, participantId, roomId });

    // Update participant connection status
    roomManager.updateParticipantConnection(roomId, participantId, true);

    // Broadcast updated room state to all participants
    this.broadcastRoomUpdate(roomId);
  }

  removeConnection(roomId: string, participantId: string): void {
    const roomConnections = this.connections.get(roomId);
    if (!roomConnections) return;

    roomConnections.delete(participantId);

    // Update participant connection status
    roomManager.updateParticipantConnection(roomId, participantId, false);

    // Clean up empty room connections
    if (roomConnections.size === 0) {
      this.connections.delete(roomId);
    }

    // Broadcast updated room state to remaining participants
    this.broadcastRoomUpdate(roomId);
  }

  handleMessage(
    roomId: string,
    participantId: string,
    message: WebSocketMessage
  ): void {
    switch (message.type) {
      case 'ping':
        this.sendToParticipant(roomId, participantId, { type: 'pong' });
        break;
      case 'requestRoomState':
        this.sendRoomState(roomId, participantId);
        break;
      default:
        console.warn(`Unknown WebSocket message type: ${message.type}`);
    }
  }

  broadcastRoomUpdate(roomId: string): void {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const roomState = roomManager.getRoomState(room);
    const stats = roomManager.calculateVoteStats(room);

    const message = {
      type: 'roomStateUpdate',
      payload: {
        room: roomState,
        stats,
      },
    };

    this.broadcastToRoom(roomId, message);
  }

  sendRoomState(roomId: string, participantId: string): void {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const roomState = roomManager.getRoomState(room);
    const stats = roomManager.calculateVoteStats(room);

    const message = {
      type: 'roomState',
      payload: {
        room: roomState,
        stats,
      },
    };

    this.sendToParticipant(roomId, participantId, message);
  }

  broadcastToRoom(roomId: string, message: any): void {
    const roomConnections = this.connections.get(roomId);
    if (!roomConnections) return;

    const messageStr = JSON.stringify(message);

    for (const connection of roomConnections.values()) {
      try {
        if (connection.ws.readyState === 1) {
          // WebSocket.OPEN
          connection.ws.send(messageStr);
        }
      } catch (error) {
        console.error(
          `Failed to send message to participant ${connection.participantId}:`,
          error
        );
        // Remove dead connection
        this.removeConnection(roomId, connection.participantId);
      }
    }
  }

  sendToParticipant(roomId: string, participantId: string, message: any): void {
    const roomConnections = this.connections.get(roomId);
    if (!roomConnections) return;

    const connection = roomConnections.get(participantId);
    if (!connection) return;

    try {
      if (connection.ws.readyState === 1) {
        // WebSocket.OPEN
        connection.ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error(
        `Failed to send message to participant ${participantId}:`,
        error
      );
      this.removeConnection(roomId, participantId);
    }
  }

  // Trigger real-time updates for specific events
  onVoteCast(roomId: string): void {
    this.broadcastRoomUpdate(roomId);
  }

  onVotesRevealed(roomId: string): void {
    this.broadcastRoomUpdate(roomId);
  }

  onVotesReset(roomId: string): void {
    this.broadcastRoomUpdate(roomId);
  }

  onParticipantJoined(roomId: string): void {
    this.broadcastRoomUpdate(roomId);
  }

  onParticipantLeft(roomId: string): void {
    this.broadcastRoomUpdate(roomId);
  }
}

let wsManagerInstance: WebSocketManager;

export function createWebSocketManager(): WebSocketManager {
  if (!wsManagerInstance) {
    wsManagerInstance = new WebSocketManager();
  }
  return wsManagerInstance;
}

export function getWebSocketManager(): WebSocketManager {
  return wsManagerInstance;
}

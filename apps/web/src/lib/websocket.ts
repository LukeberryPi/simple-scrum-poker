import type { RoomState, VoteStats, WebSocketMessage } from '../types/index';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private roomId: string;
  private participantId: string;
  private onRoomUpdate?: (room: RoomState, stats: VoteStats | null) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    roomId: string,
    participantId: string,
    onRoomUpdate?: (room: RoomState, stats: VoteStats | null) => void
  ) {
    this.roomId = roomId;
    this.participantId = participantId;
    this.onRoomUpdate = onRoomUpdate;
  }

  connect(): void {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'ws://localhost:8080';
    const wsUrl =
      serverUrl.replace('http', 'ws') +
      `/ws?roomId=${this.roomId}&participantId=${this.participantId}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        // Request current room state
        this.send({ type: 'requestRoomState' });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.attemptReconnect();
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'roomStateUpdate':
      case 'roomState':
        if (this.onRoomUpdate && message.payload) {
          this.onRoomUpdate(message.payload.room, message.payload.stats);
        }
        break;
      case 'pong':
        // Handle ping/pong for connection health
        break;
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  private send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Send periodic pings to keep connection alive
  startHeartbeat(): void {
    setInterval(() => {
      this.send({ type: 'ping' });
    }, 30_000); // Send ping every 30 seconds
  }
}

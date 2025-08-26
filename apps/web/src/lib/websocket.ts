import type { RoomState, VoteStats, WebSocketMessage } from '../types/index';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private roomId: string;
  private participantId: string;
  private onRoomUpdate?: (room: RoomState, stats: VoteStats | null) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 30_000;
  private reconnectTimeoutId: number | null = null;
  private heartbeatIntervalId: number | null = null;
  private isConnecting = false;
  private shouldReconnect = true;

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
    if (
      this.isConnecting ||
      (this.ws && this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.isConnecting = true;
    const serverUrl =
      import.meta.env.VITE_SERVER_URL || 'http://localhost:8080';
    const wsUrl = this.buildWebSocketUrl(serverUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
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

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected', {
          code: event.code,
          reason: event.reason,
        });
        this.isConnecting = false;
        if (this.shouldReconnect) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.isConnecting = false;
      if (this.shouldReconnect) {
        this.attemptReconnect();
      }
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
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
    if (!this.shouldReconnect) {
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      // Exponential backoff with jitter
      const delay = Math.min(
        this.baseReconnectDelay * 2 ** (this.reconnectAttempts - 1) +
          Math.random() * 1000,
        this.maxReconnectDelay
      );

      this.reconnectTimeoutId = window.setTimeout(() => {
        this.reconnectTimeoutId = null;
        if (this.shouldReconnect) {
          this.connect();
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Send periodic pings to keep connection alive
  startHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
    }

    this.heartbeatIntervalId = window.setInterval(() => {
      this.send({ type: 'ping' });
    }, 30_000); // Send ping every 30 seconds
  }

  private buildWebSocketUrl(serverUrl: string): string {
    // Handle URL transformation properly
    let wsUrl = serverUrl;

    // Replace http/https with ws/wss
    if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://');
    } else if (wsUrl.startsWith('http://')) {
      wsUrl = wsUrl.replace('http://', 'ws://');
    } else if (!(wsUrl.startsWith('ws://') || wsUrl.startsWith('wss://'))) {
      // Default to ws:// if no protocol specified
      wsUrl = `ws://${wsUrl}`;
    }

    return `${wsUrl}/ws?roomId=${this.roomId}&participantId=${this.participantId}`;
  }
}

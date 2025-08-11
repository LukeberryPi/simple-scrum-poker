import 'dotenv/config';
import { RPCHandler } from '@orpc/server/fetch';
import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/bun';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createContext } from './lib/context';
import { createWebSocketManager } from './lib/websocket-manager';
import { appRouter } from './routers/index';

const app = new Hono();
const wsManager = createWebSocketManager();

app.use(logger());
app.use(
  '/*',
  cors({
    origin: process.env.CORS_ORIGIN || '',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  })
);

// WebSocket endpoint for real-time updates
app.get(
  '/ws',
  upgradeWebSocket((c) => {
    const roomId = c.req.query('roomId');
    const participantId = c.req.query('participantId');

    if (!(roomId && participantId)) {
      // Cannot return Response here, must return WSEvents or reject the upgrade
      throw new Error('Missing roomId or participantId');
    }

    return {
      onOpen(event, ws) {
        console.log(
          `WebSocket connected: participant ${participantId} in room ${roomId}`
        );
        wsManager.addConnection(roomId, participantId, ws as any);
      },
      onMessage(event, ws) {
        try {
          const message = JSON.parse(event.data.toString());
          wsManager.handleMessage(roomId, participantId, message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      },
      onClose() {
        console.log(
          `WebSocket disconnected: participant ${participantId} in room ${roomId}`
        );
        wsManager.removeConnection(roomId, participantId);
      },
    };
  })
);

const handler = new RPCHandler(appRouter);
app.use('/rpc/*', async (c, next) => {
  const context = await createContext({ context: c });
  const { matched, response } = await handler.handle(c.req.raw, {
    prefix: '/rpc',
    context,
  });

  if (matched) {
    return c.newResponse(response.body, response);
  }
  await next();
});

app.get('/', (c) => {
  return c.text('OK');
});

export default {
  port: process.env.PORT || 8080,
  fetch: app.fetch,
};

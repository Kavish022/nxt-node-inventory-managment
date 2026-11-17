import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/db';
import { initSocketServer } from './socket';

async function bootstrap() {
  await connectDatabase();

  const app = createApp();
  const httpServer = http.createServer(app);

  // Initialize WebSockets
  initSocketServer(httpServer);

  const server = httpServer.listen(env.PORT, () => {
    console.log(`
🚀 Inventory API & WebSockets is running
Environment: ${env.NODE_ENV}
Server URL:  http://localhost:${env.PORT}
Health:      http://localhost:${env.PORT}/api/v1/health
WS Endpoint: ws://localhost:${env.PORT}/socket.io
`);
  });

  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

  for (const signal of signals) {
    process.on(signal, () => {
      console.log(`Received ${signal}, starting graceful shutdown...`);

      server.close(async () => {
        try {
          await disconnectDatabase();
          process.exit(0);
        } catch (err) {
          console.error('Error during database disconnect:', err);
          process.exit(1);
        }
      });

      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000).unref();
    });
  }
}

bootstrap().catch((error) => {
  console.error('Fatal error during server startup:', error);
  process.exit(1);
});

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env';

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 WebSocket client connected: ${socket.id}`);

    // Allow clients to join specific warehouse or order rooms
    socket.on('join:warehouse', (warehouseId: number) => {
      socket.join(`warehouse:${warehouseId}`);
      console.log(`Socket ${socket.id} joined warehouse:${warehouseId}`);
    });

    socket.on('leave:warehouse', (warehouseId: number) => {
      socket.leave(`warehouse:${warehouseId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 WebSocket client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

// Real-time broadcast helpers
export function broadcastStockUpdate(data: {
  productId: number;
  warehouseId: number;
  quantity: number | string;
  type: string;
}) {
  if (io) {
    io.emit('stock:updated', data);
    io.to(`warehouse:${data.warehouseId}`).emit('stock:warehouse-updated', data);
  }
}

export function broadcastAlert(alert: {
  id: number;
  title: string;
  message: string;
  type: string;
  timestamp: string;
}) {
  if (io) {
    io.emit('alert:new', alert);
  }
}

export function broadcastOrderStatus(order: {
  type: 'PURCHASE' | 'SALES';
  id: number;
  orderNumber: string;
  status: string;
}) {
  if (io) {
    io.emit('order:status-changed', order);
  }
}

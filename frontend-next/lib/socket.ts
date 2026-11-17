import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket && typeof window !== 'undefined') {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5001';
    socket = io(wsUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to Real-time Inventory WebSocket');
    });

    socket.on('disconnect', () => {
      console.log('⚡ Disconnected from Real-time Inventory WebSocket');
    });
  }
  return socket!;
}

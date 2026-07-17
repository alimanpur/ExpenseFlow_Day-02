import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) return;

    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const backendUrl = apiUrl.replace(/\/api\/v1$/, '');
    this.socket = io(backendUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected');
      this.emit('socket:connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.emit('socket:disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      this.emit('socket:error', { error: error.message });
    });

    this.socket.on('expense:created', (data) => this.emit('expense:created', data));
    this.socket.on('expense:updated', (data) => this.emit('expense:updated', data));
    this.socket.on('expense:deleted', (data) => this.emit('expense:deleted', data));
    this.socket.on('expense:restored', (data) => this.emit('expense:restored', data));
    this.socket.on('settlement:created', (data) => this.emit('settlement:created', data));
    this.socket.on('settlement:confirmed', (data) => this.emit('settlement:confirmed', data));
    this.socket.on('settlement:completed', (data) => this.emit('settlement:completed', data));
    this.socket.on('settlement:cancelled', (data) => this.emit('settlement:cancelled', data));
    this.socket.on('member:added', (data) => this.emit('member:added', data));
    this.socket.on('member:removed', (data) => this.emit('member:removed', data));
    this.socket.on('circle:updated', (data) => this.emit('circle:updated', data));
    this.socket.on('circle:archived', (data) => this.emit('circle:archived', data));
    this.socket.on('notification:new', (data) => this.emit('notification:new', data));
    this.socket.on('activity:new', (data) => this.emit('activity:new', data));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinCircle(circleId) {
    this.socket?.emit('join:circle', circleId);
  }

  leaveCircle(circleId) {
    this.socket?.emit('leave:circle', circleId);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  emit(event, data) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[Socket] Error in ${event} listener:`, err);
        }
      });
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();

export function useSocket() {
  const { accessToken } = useAuth();
  
  // This hook will be used to ensure socket connection
  // Actual connection is managed by AppLayout
  return socketService;
}
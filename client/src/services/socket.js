import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectListeners = new Set();
  }

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('⚡ Socket.IO Connected:', this.socket.id);
        this.reconnectListeners.forEach((listener) => {
          try {
            listener();
          } catch (e) {
            console.error('Reconnect listener error:', e);
          }
        });
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('🔌 Socket.IO Disconnected:', reason);
      });
    }
    return this.socket;
  }

  onReconnect(callback) {
    this.reconnectListeners.add(callback);
    return () => this.reconnectListeners.delete(callback);
  }

  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();

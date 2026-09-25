import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectListeners = new Set();
    this.statusListeners = new Set();
    this.status = 'disconnected';
  }

  connect() {
    if (!this.socket) {
      this.status = 'connecting';
      this.socket = io(SOCKET_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: ['websocket', 'polling'],
        timeout: 10000
      });

      this.socket.on('connect', () => {
        this.status = 'connected';
        console.log('⚡ Socket.IO Connected:', this.socket.id);
        this.notifyStatus('connected');
        this.reconnectListeners.forEach((listener) => {
          try {
            listener();
          } catch (e) {
            console.error('Reconnect listener error:', e);
          }
        });
      });

      this.socket.on('disconnect', (reason) => {
        this.status = 'disconnected';
        console.warn('🔌 Socket.IO Disconnected:', reason);
        this.notifyStatus('disconnected');
      });

      this.socket.io.on('reconnect_attempt', (attempt) => {
        this.status = 'reconnecting';
        console.log(`🔄 Reconnection attempt #${attempt}`);
        this.notifyStatus('reconnecting');
      });

      this.socket.io.on('reconnect_failed', () => {
        this.status = 'disconnected';
        console.warn('❌ Socket Reconnection failed after max attempts');
        this.notifyStatus('disconnected');
      });
    }
    return this.socket;
  }

  notifyStatus(newStatus) {
    this.status = newStatus;
    this.statusListeners.forEach((fn) => {
      try {
        fn(newStatus);
      } catch (e) {
        console.error('Status listener error:', e);
      }
    });
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
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

  isConnected() {
    return this.socket && this.socket.connected;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.status = 'disconnected';
    }
  }
}

export const socketService = new SocketService();


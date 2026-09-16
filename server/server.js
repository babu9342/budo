import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import rankingRoutes from './routes/rankingRoutes.js';

import { setupRoomSocket } from './sockets/roomSocket.js';
import { setupGameSocket } from './sockets/gameSocket.js';
import { setupChatSocket } from './sockets/chatSocket.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || '*';

// Cross-Origin Resource Sharing
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static file hosting for avatar and voice uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date(), service: 'BUDO Ludo Engine' });
});

// REST API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/users', profileRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/rankings', rankingRoutes);

// Socket.IO Server Initialization
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

io.on('connection', (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);

  setupRoomSocket(io, socket);
  setupGameSocket(io, socket);
  setupChatSocket(io, socket);

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Server Listening
server.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`🎲 BUDO Server running on port ${PORT}`);
  console.log(`🎲 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎲 Real-time Engine: Socket.IO Ready`);
  console.log(`===========================================`);
});

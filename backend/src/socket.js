/**
 * ExpenseFlow - Socket.IO Integration
 * Real-time WebSocket communication for live synchronization.
 */
const { Server } = require('socket.io');
const config = require('./config');
const { info } = require('./utils/logger');

let io;

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin === '*' ? true : config.cors.origin.split(',').map(o => o.trim()),
      credentials: config.cors.credentials,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, config.jwt.accessSecret);
      socket.userId = decoded.sub;
      socket.userName = decoded.name;
      next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    info(`User ${socket.userId} connected via socket`);

    // Join user's personal room for direct updates
    socket.join(`user:${socket.userId}`);

    // Join circle-specific rooms
    socket.on('join:circle', (circleId) => {
      if (circleId) {
        socket.join(`circle:${circleId}`);
      }
    });

    socket.on('leave:circle', (circleId) => {
      if (circleId) {
        socket.leave(`circle:${circleId}`);
      }
    });

    socket.on('disconnect', () => {
      info(`User ${socket.userId} disconnected`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

/**
 * Emit event to all members of a circle
 */
function emitToCircle(circleId, event, data) {
  if (io) {
    io.to(`circle:${circleId}`).emit(event, data);
  }
}

/**
 * Emit event to a specific user
 */
function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

module.exports = {
  initializeSocket,
  getIO,
  emitToCircle,
  emitToUser,
};
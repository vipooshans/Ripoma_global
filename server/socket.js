const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { corsOriginDelegate } = require('./utils/corsOrigins');

let ioInstance = null;

const init = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOriginDelegate,
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ripoma_access_secret_key_12345');
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      if (user.status === 'suspended' || user.status === 'inactive') {
        return next(new Error('User account is suspended or inactive'));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`[SOCKET] User connected: ${socket.user.name} (${userId})`);
    socket.join(userId);

    socket.on('disconnect', () => {
      console.log(`[SOCKET] User disconnected: ${socket.user.name}`);
    });
  });

  ioInstance = io;

  // Initialize the notifyService singleton
  const notifyService = require('./utils/notifyService');
  notifyService.init(io);

  return io;
};

const getIO = () => {
  return ioInstance;
};

module.exports = { init, getIO };

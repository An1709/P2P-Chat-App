require('dotenv').config();

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const { registerUser, loginUser, verifyOtp, resendOtp, verifyToken } = require('./auth/userStore');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'local-demo-change-me';
  console.warn('JWT_SECRET is not set. Using an insecure local demo secret.');
}

const app = express();
app.use(cors());
app.use(express.json());

const clients = new Map();
const rooms = new Map();
let server;

app.get('/', (req, res) => {
  res.send(`SecureChat auth and signaling server running (${IS_PRODUCTION ? 'HTTP' : 'HTTPS'})`);
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const result = await registerUser(req.body);
    console.log(`Pending registration created: ${result.user.email}`);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Đăng ký thất bại.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const result = await loginUser(req.body);
    console.log(`User logged in: ${result.user.email}`);
    res.json(result);
  } catch (error) {
    console.log(`Invalid login attempt: ${req.body?.email || 'unknown email'}`);
    res.status(error.statusCode || 500).json({
      message: error.message || 'Đăng nhập thất bại.',
      code: error.code,
      otpRequired: error.code === 'OTP_REQUIRED',
      user: error.user
    });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const result = await verifyOtp(req.body);
    console.log(`User verified OTP: ${result.user.email}`);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || 'Xác minh OTP thất bại.',
      code: error.code
    });
  }
});

app.post('/api/auth/resend-otp', async (req, res) => {
  try {
    const result = await resendOtp(req.body);
    console.log(`OTP resent: ${result.user.email}`);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || 'Không thể gửi lại mã OTP.',
      code: error.code
    });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ message: 'Thiếu mã xác thực.' });
    }

    const user = await verifyToken(token);
    return res.json({ user });
  } catch (error) {
    return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }
});

if (IS_PRODUCTION) {
  console.log('Running in PRODUCTION mode (http)...');
  server = http.createServer(app);
} else {
  console.log('Running in DEVELOPMENT mode (https)...');
  try {
    server = https.createServer({
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem')
    }, app);
  } catch (error) {
    console.error('\nFAILED TO START HTTPS SERVER');
    console.error('Did you forget to copy "localhost-key.pem" and "localhost.pem" into the /server directory?');
    console.error('Run `mkcert localhost 127.0.0.1 ::1` and copy the files.\n');
    process.exit(1);
  }
}

const wss = new WebSocket.Server({ server });

wss.on('connection', async (ws, req) => {
  try {
    const token = getTokenFromRequest(req);
    ws.authUser = await verifyToken(token);
    console.log(`Authenticated socket connected: ${ws.authUser.email}`);
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Cần đăng nhập để kết nối signaling.'
    }));
    ws.close(1008, 'Cần đăng nhập');
    return;
  }

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      switch (data.type) {
        case 'join':
          handleJoin(ws, data);
          break;
        case 'signal':
          handleSignal(ws, data);
          break;
        case 'leave':
          handleLeave(ws);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  ws.on('close', () => {
    handleLeave(ws);
    console.log(`Client disconnected: ${ws.authUser.email}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function handleJoin(ws, data) {
  if (!ws.authUser) {
    sendSocketError(ws, 'Cần đăng nhập.');
    return;
  }

  const roomId = String(data.roomId || 'general').trim();
  const userId = ws.authUser.id;
  const username = ws.authUser.displayName;

  clients.set(ws, {
    userId,
    username,
    email: ws.authUser.email,
    roomId
  });

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(ws);

  const existingUsers = Array.from(rooms.get(roomId))
    .filter((client) => client !== ws)
    .map((client) => {
      const info = clients.get(client);
      return { userId: info.userId, username: info.username };
    });

  ws.send(JSON.stringify({
    type: 'room-joined',
    roomId,
    userId,
    users: existingUsers
  }));
  console.log(`Peer discovery: ${username} found ${existingUsers.length} peer(s) in room ${roomId}`);

  broadcastToRoom(roomId, {
    type: 'user-joined',
    userId,
    username
  }, ws);
  console.log(`Peer discovered by room: ${username} is available in ${roomId}`);

  updateUserList(roomId);
  console.log(`${username} joined room: ${roomId}`);
}

function handleSignal(ws, data) {
  const sender = clients.get(ws);
  if (!sender) return;

  const { targetId, signal } = data;

  for (const [client, info] of clients.entries()) {
    if (info.userId === targetId && info.roomId === sender.roomId) {
      client.send(JSON.stringify({
        type: 'signal',
        fromId: sender.userId,
        signal
      }));
      console.log(`Signaling event sent: ${sender.userId} -> ${targetId}`);
      break;
    }
  }
}

function handleLeave(ws) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;

  const { userId, username, roomId } = clientInfo;

  if (rooms.has(roomId)) {
    rooms.get(roomId).delete(ws);

    if (rooms.get(roomId).size === 0) {
      rooms.delete(roomId);
      console.log(`Room ${roomId} is now empty and removed`);
    } else {
      broadcastToRoom(roomId, {
        type: 'user-left',
        userId,
        username
      });
      updateUserList(roomId);
      console.log(`${username} left room: ${roomId}`);
    }
  }

  clients.delete(ws);
}

function broadcastToRoom(roomId, message, excludeWs = null) {
  if (!rooms.has(roomId)) return;

  const messageStr = JSON.stringify(message);
  rooms.get(roomId).forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

function updateUserList(roomId) {
  if (!rooms.has(roomId)) return;

  const users = Array.from(rooms.get(roomId)).map((client) => {
    const info = clients.get(client);
    return { userId: info.userId, username: info.username };
  });

  broadcastToRoom(roomId, {
    type: 'user-list',
    users
  });
}

function getBearerToken(authorizationHeader) {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

function getTokenFromRequest(req) {
  const requestUrl = new URL(req.url, 'http://localhost');
  const queryToken = requestUrl.searchParams.get('token');
  const headerToken = getBearerToken(req.headers.authorization);
  return queryToken || headerToken;
}

function sendSocketError(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'error', message }));
  }
}

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, HOST, () => {
  const localIp = getLocalIpAddress();
  const protocol = IS_PRODUCTION ? 'http' : 'https';
  const wsProtocol = IS_PRODUCTION ? 'ws' : 'wss';

  console.log('\nSecureChat server running:\n');
  console.log(`   Mode:    ${IS_PRODUCTION ? 'Production' : 'Development'}`);
  console.log(`   Local:   ${protocol}://localhost:${PORT}`);
  console.log(`   Network: ${protocol}://${localIp}:${PORT}`);
  console.log(`   API:     ${protocol}://localhost:${PORT}/api/auth`);
  console.log(`   Socket:  ${wsProtocol}://localhost:${PORT}\n`);
});

function gracefulShutdown() {
  console.log('\nShutting down gracefully...');
  wss.clients.forEach((client) => {
    client.close();
  });

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

require('dotenv').config();

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const {
  registerUser,
  loginUser,
  verifyOtp,
  resendOtp,
  verifyToken,
  listUsers,
  getPublicUserById
} = require('./auth/userStore');
const {
  saveOfflineMessage,
  getPendingMessagesForUser,
  markOfflineMessagesDelivered
} = require('./messages/offlineMessageStore');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';
const CHURN_DEMO_ENABLED = String(process.env.CHURN_DEMO_ENABLED || 'false').toLowerCase() === 'true';

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'local-demo-change-me';
  console.warn('JWT_SECRET is not set. Using an insecure local demo secret.');
}

const app = express();
app.use(cors());
app.use(express.json());

const clients = new Map();
const rooms = new Map();
const churnSimulation = {
  running: false,
  roomId: 'general',
  peerCount: 0,
  joinIntervalMs: 2000,
  leaveIntervalMs: 3000,
  maxCycles: null,
  peers: []
};
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

app.get('/api/users', async (req, res) => {
  try {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ message: 'Thiếu mã xác thực.' });
    }

    const currentUser = await verifyToken(token);
    const users = await listUsers();
    return res.json({
      users: users.filter((candidate) => candidate.id !== currentUser.id)
    });
  } catch (error) {
    return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }
});

app.post('/api/churn/start', (req, res) => {
  if (!CHURN_DEMO_ENABLED) {
    return res.status(403).json({
      message: 'Churn demo đang bị tắt. Đặt CHURN_DEMO_ENABLED=true để bật tính năng demo này.'
    });
  }

  if (churnSimulation.running) {
    return res.status(409).json({
      message: 'Churn simulation đang chạy.',
      status: getChurnStatus()
    });
  }

  const config = normalizeChurnConfig(req.body || {});
  startChurnSimulation(config);
  return res.json({
    message: 'Đã bắt đầu churn simulation.',
    status: getChurnStatus()
  });
});

app.post('/api/churn/stop', (req, res) => {
  if (!CHURN_DEMO_ENABLED) {
    return res.status(403).json({
      message: 'Churn demo đang bị tắt. Đặt CHURN_DEMO_ENABLED=true để bật tính năng demo này.'
    });
  }

  stopChurnSimulation();
  return res.json({
    message: 'Đã dừng churn simulation.',
    status: getChurnStatus()
  });
});

app.get('/api/churn/status', (req, res) => {
  if (!CHURN_DEMO_ENABLED) {
    return res.status(403).json({
      message: 'Churn demo đang bị tắt. Đặt CHURN_DEMO_ENABLED=true để bật tính năng demo này.',
      enabled: false
    });
  }

  return res.json({
    enabled: true,
    status: getChurnStatus()
  });
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

wss.on('connection', (ws, req) => {
  const authPromise = (async () => {
    try {
      const token = getTokenFromRequest(req);
      ws.authUser = await verifyToken(token);
      console.log(`Authenticated socket connected: ${ws.authUser.email}`);
      return ws.authUser;
    } catch (error) {
      sendSocketMessage(ws, {
        type: 'error',
        message: 'Cần đăng nhập để kết nối signaling.'
      });
      ws.close(1008, 'Cần đăng nhập');
      return null;
    }
  })();

  ws.on('message', async (message) => {
    try {
      const authUser = await authPromise;
      if (!authUser || ws.readyState !== WebSocket.OPEN) {
        return;
      }

      const data = JSON.parse(message);
      switch (data.type) {
        case 'join':
          await handleJoin(ws, data);
          break;
        case 'signal':
          handleSignal(ws, data);
          break;
        case 'leave':
          handleLeave(ws);
          break;
        case 'offline-message:store':
          await handleOfflineMessageStore(ws, data);
          break;
        case 'offline-message:delivered':
          await handleOfflineMessageDelivered(ws, data);
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
    console.log(`Client disconnected: ${ws.authUser?.email || 'unauthenticated socket'}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

async function handleJoin(ws, data) {
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
    })
    .concat(getOnlineChurnPeers(roomId));

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
  await deliverPendingOfflineMessages(ws);
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
  }).concat(getOnlineChurnPeers(roomId));

  broadcastToRoom(roomId, {
    type: 'user-list',
    users
  });
}

function normalizeChurnConfig(config) {
  return {
    roomId: String(config.roomId || 'general').trim() || 'general',
    peerCount: clampInteger(config.peerCount, 3, 10, 3),
    joinIntervalMs: clampInteger(config.joinIntervalMs, 500, 60000, 2000),
    leaveIntervalMs: clampInteger(config.leaveIntervalMs, 500, 60000, 3000),
    maxCycles: config.maxCycles === undefined || config.maxCycles === null || config.maxCycles === ''
      ? null
      : clampInteger(config.maxCycles, 1, 1000, 5)
  };
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function startChurnSimulation(config) {
  churnSimulation.running = true;
  churnSimulation.roomId = config.roomId;
  churnSimulation.peerCount = config.peerCount;
  churnSimulation.joinIntervalMs = config.joinIntervalMs;
  churnSimulation.leaveIntervalMs = config.leaveIntervalMs;
  churnSimulation.maxCycles = config.maxCycles;
  churnSimulation.peers = Array.from({ length: config.peerCount }, (_, index) => {
    const number = index + 1;
    return {
      userId: `churn-peer-${number}`,
      username: `Churn Peer ${number}`,
      simulated: true,
      online: false,
      cycles: 0,
      timer: null
    };
  });

  console.log('[CHURN] Simulation started', {
    roomId: config.roomId,
    peerCount: config.peerCount,
    joinIntervalMs: config.joinIntervalMs,
    leaveIntervalMs: config.leaveIntervalMs,
    maxCycles: config.maxCycles
  });

  churnSimulation.peers.forEach((peer, index) => {
    peer.timer = setTimeout(() => simulateChurnPeerJoin(peer), index * config.joinIntervalMs);
  });
}

function stopChurnSimulation() {
  const wasRunning = churnSimulation.running;
  churnSimulation.running = false;

  churnSimulation.peers.forEach((peer) => {
    clearTimeout(peer.timer);
    peer.timer = null;

    if (peer.online) {
      peer.online = false;
      broadcastChurnPeerLeft(peer);
    }
  });

  updateUserList(churnSimulation.roomId);

  if (wasRunning) {
    console.log('[CHURN] Simulation stopped');
  }
}

function simulateChurnPeerJoin(peer) {
  if (!churnSimulation.running) return;

  peer.online = true;
  console.log(`[CHURN] Simulated peer joined: ${peer.username}`);
  broadcastChurnPeerJoined(peer);
  updateUserList(churnSimulation.roomId);

  peer.timer = setTimeout(() => simulateChurnPeerLeave(peer), churnSimulation.leaveIntervalMs);
}

function simulateChurnPeerLeave(peer) {
  if (!churnSimulation.running) return;

  peer.online = false;
  peer.cycles += 1;
  console.log(`[CHURN] Simulated peer left: ${peer.username}`);
  broadcastChurnPeerLeft(peer);
  updateUserList(churnSimulation.roomId);

  if (churnSimulation.maxCycles && churnSimulation.peers.every((candidate) => candidate.cycles >= churnSimulation.maxCycles)) {
    stopChurnSimulation();
    return;
  }

  if (!churnSimulation.maxCycles || peer.cycles < churnSimulation.maxCycles) {
    peer.timer = setTimeout(() => {
      if (peer.cycles > 0) {
        console.log(`[CHURN] Simulated peer rejoined: ${peer.username}`);
      }
      simulateChurnPeerJoin(peer);
    }, churnSimulation.joinIntervalMs);
  }
}

function broadcastChurnPeerJoined(peer) {
  broadcastToRoom(churnSimulation.roomId, {
    type: 'user-joined',
    userId: peer.userId,
    username: peer.username,
    simulated: true
  });
}

function broadcastChurnPeerLeft(peer) {
  broadcastToRoom(churnSimulation.roomId, {
    type: 'user-left',
    userId: peer.userId,
    username: peer.username,
    simulated: true
  });
}

function getOnlineChurnPeers(roomId) {
  if (!churnSimulation.running || churnSimulation.roomId !== roomId) return [];

  return churnSimulation.peers
    .filter((peer) => peer.online)
    .map((peer) => ({
      userId: peer.userId,
      username: peer.username,
      displayName: peer.username,
      simulated: true
    }));
}

function getChurnStatus() {
  return {
    running: churnSimulation.running,
    roomId: churnSimulation.roomId,
    peerCount: churnSimulation.peerCount,
    joinIntervalMs: churnSimulation.joinIntervalMs,
    leaveIntervalMs: churnSimulation.leaveIntervalMs,
    maxCycles: churnSimulation.maxCycles,
    peers: churnSimulation.peers.map((peer) => ({
      userId: peer.userId,
      username: peer.username,
      online: peer.online,
      cycles: peer.cycles,
      simulated: true
    }))
  };
}

async function handleOfflineMessageStore(ws, data) {
  const sender = clients.get(ws);
  if (!ws.authUser || !sender) {
    console.log('Invalid offline message rejected: unauthenticated socket');
    sendOfflineMessageError(ws, 'Cần đăng nhập trước khi lưu tin nhắn offline.');
    return;
  }

  const toUserId = String(data.toUserId || '').trim();
  const content = String(data.content || '').trim();
  const roomId = String(data.roomId || sender.roomId || 'general').trim();
  const toDisplayName = String(data.toDisplayName || '').trim();

  if (!toUserId || !content || toUserId === sender.userId || data.messageType === 'group') {
    console.log(`Invalid offline message rejected from ${sender.userId}`);
    sendOfflineMessageError(ws, 'Tin nhắn offline không hợp lệ.');
    return;
  }

  if (content.length > 5000) {
    console.log(`Invalid offline message rejected from ${sender.userId}: content too long`);
    sendOfflineMessageError(ws, 'Tin nhắn offline quá dài.');
    return;
  }

  try {
    const recipient = await getPublicUserById(toUserId);
    if (!recipient) {
      console.log(`Invalid offline message rejected from ${sender.userId}: unknown recipient ${toUserId}`);
      sendOfflineMessageError(ws, 'Người nhận không tồn tại hoặc chưa xác thực.');
      return;
    }

    const offlineMessage = await saveOfflineMessage({
      id: data.id,
      fromUserId: sender.userId,
      fromDisplayName: sender.username,
      toUserId,
      toDisplayName: toDisplayName || recipient.displayName,
      roomId,
      content,
      type: 'direct'
    });

    sendSocketMessage(ws, {
      type: 'offline-message:store',
      message: offlineMessage
    });
    console.log(`Offline message stored: ${offlineMessage.id} ${sender.userId} -> ${toUserId}`);
  } catch (error) {
    console.error('Error storing offline message:', error);
    sendOfflineMessageError(ws, 'Không thể lưu tin nhắn offline.');
  }
}

async function deliverPendingOfflineMessages(ws) {
  if (!ws.authUser || ws.readyState !== WebSocket.OPEN) return;

  try {
    const pendingMessages = await getPendingMessagesForUser(ws.authUser.id);
    if (pendingMessages.length === 0) return;

    sendSocketMessage(ws, {
      type: 'offline-message:pending',
      messages: pendingMessages
    });
    console.log(`Pending offline messages delivered: ${pendingMessages.length} message(s) for ${ws.authUser.id}`);
  } catch (error) {
    console.error('Error delivering pending offline messages:', error);
    sendOfflineMessageError(ws, 'Không thể tải tin nhắn offline.');
  }
}

async function handleOfflineMessageDelivered(ws, data) {
  if (!ws.authUser) {
    console.log('Invalid offline delivered ack rejected: unauthenticated socket');
    sendOfflineMessageError(ws, 'Cần đăng nhập trước khi xác nhận tin nhắn offline.');
    return;
  }

  const messageIds = Array.isArray(data.messageIds)
    ? data.messageIds.filter((id) => typeof id === 'string' && id.trim())
    : [];

  if (messageIds.length === 0) {
    console.log(`Invalid offline delivered ack rejected from ${ws.authUser.id}`);
    sendOfflineMessageError(ws, 'Danh sách tin nhắn offline không hợp lệ.');
    return;
  }

  try {
    const deliveredCount = await markOfflineMessagesDelivered(ws.authUser.id, messageIds);
    sendSocketMessage(ws, {
      type: 'offline-message:delivered',
      messageIds,
      deliveredCount
    });
    console.log(`Offline messages marked delivered: ${deliveredCount} message(s) for ${ws.authUser.id}`);
  } catch (error) {
    console.error('Error marking offline messages delivered:', error);
    sendOfflineMessageError(ws, 'Không thể xác nhận tin nhắn offline.');
  }
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
  sendSocketMessage(ws, { type: 'error', message });
}

function sendOfflineMessageError(ws, message) {
  sendSocketMessage(ws, { type: 'offline-message:error', message });
}

function sendSocketMessage(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
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
  stopChurnSimulation();
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

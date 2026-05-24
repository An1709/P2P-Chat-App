const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OFFLINE_MESSAGES_FILE = path.join(DATA_DIR, 'offline-messages.json');

async function ensureOfflineMessageFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(OFFLINE_MESSAGES_FILE);
  } catch {
    await fs.writeFile(OFFLINE_MESSAGES_FILE, '[]\n', 'utf8');
  }
}

async function readOfflineMessages() {
  await ensureOfflineMessageFile();
  const raw = await fs.readFile(OFFLINE_MESSAGES_FILE, 'utf8');
  return JSON.parse(raw || '[]');
}

async function writeOfflineMessages(messages) {
  await ensureOfflineMessageFile();
  await fs.writeFile(OFFLINE_MESSAGES_FILE, `${JSON.stringify(messages, null, 2)}\n`, 'utf8');
}

async function saveOfflineMessage(message) {
  const messages = await readOfflineMessages();
  const now = new Date().toISOString();
  const offlineMessage = {
    id: message.id || randomUUID(),
    fromUserId: message.fromUserId,
    fromDisplayName: message.fromDisplayName,
    toUserId: message.toUserId,
    toDisplayName: message.toDisplayName || '',
    roomId: message.roomId || '',
    content: message.content,
    type: 'direct',
    createdAt: message.createdAt || now,
    deliveredAt: null,
    status: 'pending'
  };

  messages.push(offlineMessage);
  await writeOfflineMessages(messages);
  return offlineMessage;
}

async function getPendingMessagesForUser(userId) {
  const messages = await readOfflineMessages();
  return messages.filter((message) => {
    return message.toUserId === userId && message.status === 'pending';
  });
}

async function markOfflineMessagesDelivered(userId, messageIds) {
  const ids = new Set(messageIds);
  const messages = await readOfflineMessages();
  const deliveredAt = new Date().toISOString();
  let deliveredCount = 0;

  const nextMessages = messages.map((message) => {
    if (message.toUserId === userId && ids.has(message.id) && message.status === 'pending') {
      deliveredCount += 1;
      return {
        ...message,
        deliveredAt,
        status: 'delivered'
      };
    }

    return message;
  });

  await writeOfflineMessages(nextMessages);
  return deliveredCount;
}

module.exports = {
  saveOfflineMessage,
  getPendingMessagesForUser,
  markOfflineMessagesDelivered
};

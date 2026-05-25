const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OFFLINE_FILES_INDEX = path.join(DATA_DIR, 'offline-files.json');
const OFFLINE_FILES_DIR = path.join(DATA_DIR, 'offline-files');
const DEFAULT_MAX_OFFLINE_FILE_BYTES = 5 * 1024 * 1024;
const MAX_OFFLINE_FILE_BYTES = Number.parseInt(process.env.OFFLINE_FILE_MAX_BYTES, 10) || DEFAULT_MAX_OFFLINE_FILE_BYTES;

async function ensureOfflineFileStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(OFFLINE_FILES_DIR, { recursive: true });

  try {
    await fs.access(OFFLINE_FILES_INDEX);
  } catch {
    await fs.writeFile(OFFLINE_FILES_INDEX, '[]\n', 'utf8');
  }
}

async function readOfflineFiles() {
  await ensureOfflineFileStorage();
  const raw = await fs.readFile(OFFLINE_FILES_INDEX, 'utf8');
  return JSON.parse(raw || '[]');
}

async function writeOfflineFiles(records) {
  await ensureOfflineFileStorage();
  await fs.writeFile(OFFLINE_FILES_INDEX, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
}

function createSafeId(id) {
  const normalized = String(id || '').trim();
  if (/^[a-zA-Z0-9_-]{8,120}$/.test(normalized)) {
    return normalized;
  }

  return randomUUID();
}

function assertValidOfflineFilePayload({ base64Data, fileSize }) {
  if (!base64Data || typeof base64Data !== 'string') {
    const error = new Error('Thiếu dữ liệu tệp offline.');
    error.statusCode = 400;
    throw error;
  }

  let fileBuffer;
  try {
    fileBuffer = Buffer.from(base64Data, 'base64');
  } catch {
    const error = new Error('Dữ liệu tệp offline không hợp lệ.');
    error.statusCode = 400;
    throw error;
  }

  if (fileBuffer.length === 0) {
    const error = new Error('Tệp offline không có dữ liệu.');
    error.statusCode = 400;
    throw error;
  }

  if (fileBuffer.length > MAX_OFFLINE_FILE_BYTES) {
    const error = new Error('Tệp quá lớn để lưu gửi ngoại tuyến. Vui lòng gửi khi người nhận online.');
    error.statusCode = 413;
    throw error;
  }

  if (fileSize && Number(fileSize) !== fileBuffer.length) {
    const error = new Error('Kích thước tệp offline không khớp dữ liệu gửi lên.');
    error.statusCode = 400;
    throw error;
  }

  return fileBuffer;
}

async function saveOfflineFile(fileRecord) {
  const fileBuffer = assertValidOfflineFilePayload(fileRecord);
  const records = await readOfflineFiles();
  const now = new Date().toISOString();
  const id = createSafeId(fileRecord.id);
  const storageFileName = `${id}.base64`;
  const storagePath = path.join(OFFLINE_FILES_DIR, storageFileName);
  const relativeStoragePath = path.join('server', 'data', 'offline-files', storageFileName).replace(/\\/g, '/');

  // Classroom demo fallback: payload is stored locally as base64, not end-to-end encrypted at rest.
  await fs.writeFile(storagePath, fileRecord.base64Data, 'utf8');

  const offlineFile = {
    id,
    fromUserId: fileRecord.fromUserId,
    fromDisplayName: fileRecord.fromDisplayName,
    toUserId: fileRecord.toUserId,
    toDisplayName: fileRecord.toDisplayName || '',
    roomId: fileRecord.roomId || '',
    fileName: fileRecord.fileName,
    fileType: fileRecord.fileType || 'application/octet-stream',
    fileSize: fileBuffer.length,
    fileHash: fileRecord.fileHash || '',
    storagePath: relativeStoragePath,
    createdAt: fileRecord.createdAt || now,
    deliveredAt: null,
    status: 'pending',
    type: 'file'
  };

  records.push(offlineFile);
  await writeOfflineFiles(records);
  return offlineFile;
}

async function getPendingFilesForUser(userId) {
  const records = await readOfflineFiles();
  const pendingRecords = records.filter((record) => {
    return record.toUserId === userId && record.status === 'pending';
  });

  return Promise.all(pendingRecords.map(async (record) => {
    const storageFileName = path.basename(record.storagePath || `${record.id}.base64`);
    const storagePath = path.join(OFFLINE_FILES_DIR, storageFileName);
    const base64Data = await fs.readFile(storagePath, 'utf8');
    return {
      ...record,
      base64Data
    };
  }));
}

async function markOfflineFilesDelivered(userId, fileIds) {
  const ids = new Set(fileIds);
  const records = await readOfflineFiles();
  const deliveredAt = new Date().toISOString();
  let deliveredCount = 0;

  const nextRecords = records.map((record) => {
    if (record.toUserId === userId && ids.has(record.id) && record.status === 'pending') {
      deliveredCount += 1;
      return {
        ...record,
        deliveredAt,
        status: 'delivered'
      };
    }

    return record;
  });

  await writeOfflineFiles(nextRecords);
  return deliveredCount;
}

module.exports = {
  MAX_OFFLINE_FILE_BYTES,
  saveOfflineFile,
  getPendingFilesForUser,
  markOfflineFilesDelivered
};

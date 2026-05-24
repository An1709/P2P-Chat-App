const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateOtp, getOtpExpiresAt, sendOtpEmail } = require('./otpService');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PENDING_USERS_FILE = path.join(DATA_DIR, 'pending-users.json');
const SALT_ROUNDS = 10;
const OTP_SALT_ROUNDS = 10;

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await ensureJsonArrayFile(USERS_FILE);
  await ensureJsonArrayFile(PENDING_USERS_FILE);
}

async function ensureJsonArrayFile(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, '[]\n', 'utf8');
  }
}

async function readJsonArray(filePath) {
  await ensureDataFiles();
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw || '[]');
}

async function writeJsonArray(filePath, records) {
  await ensureDataFiles();
  await fs.writeFile(filePath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
}

async function readUsers() {
  const users = await readJsonArray(USERS_FILE);
  const verifiedUsers = users.filter((user) => user.isVerified === true);

  if (verifiedUsers.length !== users.length) {
    await writeUsers(verifiedUsers);
  }

  return verifiedUsers;
}

async function writeUsers(users) {
  const verifiedUsers = users.map((user) => {
    const { otpHash, otpExpiresAt, ...verifiedUser } = user;
    return { ...verifiedUser, isVerified: true };
  });
  await writeJsonArray(USERS_FILE, verifiedUsers);
}

async function readPendingUsers({ pruneExpired = true } = {}) {
  const pendingUsers = await readJsonArray(PENDING_USERS_FILE);
  if (!pruneExpired) {
    return pendingUsers;
  }

  const activePendingUsers = pendingUsers.filter((user) => {
    return user.otpExpiresAt && new Date(user.otpExpiresAt).getTime() >= Date.now();
  });

  if (activePendingUsers.length !== pendingUsers.length) {
    await writePendingUsers(activePendingUsers);
  }

  return activePendingUsers;
}

async function writePendingUsers(pendingUsers) {
  await writeJsonArray(PENDING_USERS_FILE, pendingUsers);
}

function publicUser(user) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    isVerified: Boolean(user.isVerified)
  };
}

function publicPendingUser(user) {
  return {
    displayName: user.displayName,
    email: user.email,
    isVerified: false
  };
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createUserId() {
  return randomUUID();
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      displayName: user.displayName
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

async function registerUser({ displayName, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const trimmedName = String(displayName || '').trim();

  if (!trimmedName || !normalizedEmail || !password) {
    throw validationError('Vui lòng nhập tên hiển thị, email và mật khẩu.');
  }

  if (!isValidEmail(normalizedEmail)) {
    throw validationError('Email không hợp lệ.');
  }

  if (String(password).length < 6) {
    throw validationError('Mật khẩu phải có ít nhất 6 ký tự.');
  }

  const users = await readUsers();
  const existingUser = users.find((user) => user.email === normalizedEmail);

  if (existingUser) {
    const error = new Error('Email này đã được đăng ký.');
    error.statusCode = 409;
    throw error;
  }

  const pendingUsers = await readPendingUsers();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const otp = generateOtp();
  const pendingUser = {
    displayName: trimmedName,
    email: normalizedEmail,
    passwordHash,
    otpHash: await bcrypt.hash(otp, OTP_SALT_ROUNDS),
    otpExpiresAt: getOtpExpiresAt(),
    createdAt: new Date().toISOString()
  };

  const nextPendingUsers = pendingUsers.filter((user) => user.email !== normalizedEmail);
  nextPendingUsers.push(pendingUser);
  await writePendingUsers(nextPendingUsers);
  await sendOtpEmail(pendingUser.email, otp);

  return {
    user: publicPendingUser(pendingUser),
    otpRequired: true,
    message: 'Mã OTP đã được gửi. Vui lòng nhập mã OTP để hoàn tất đăng ký.'
  };
}

async function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    throw validationError('Vui lòng nhập email và mật khẩu.');
  }

  const users = await readUsers();
  const user = users.find((candidate) => candidate.email === normalizedEmail);

  if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash))) {
    const error = new Error('Email hoặc mật khẩu không đúng.');
    error.statusCode = 401;
    throw error;
  }

  return {
    user: publicUser(user),
    token: signToken(user)
  };
}

async function verifyOtp({ email, otp }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = String(otp || '').trim();

  if (!normalizedEmail) {
    throw validationError('Không tìm thấy email đang chờ xác thực. Vui lòng đăng ký lại.');
  }

  if (!/^\d{6}$/.test(normalizedOtp)) {
    throw validationError('Mã OTP không đúng hoặc đã hết hạn.');
  }

  const users = await readUsers();
  const existingUser = users.find((candidate) => candidate.email === normalizedEmail);

  if (existingUser) {
    return {
      user: publicUser(existingUser),
      message: 'Tài khoản đã được xác minh. Bạn có thể đăng nhập.'
    };
  }

  const pendingUsers = await readPendingUsers({ pruneExpired: false });
  const pendingUser = pendingUsers.find((candidate) => candidate.email === normalizedEmail);

  if (!pendingUser) {
    const error = new Error('Không tìm thấy đăng ký đang chờ xác thực. Vui lòng đăng ký lại.');
    error.statusCode = 404;
    throw error;
  }

  if (new Date(pendingUser.otpExpiresAt).getTime() < Date.now()) {
    const nextPendingUsers = pendingUsers.filter((candidate) => candidate.email !== normalizedEmail);
    await writePendingUsers(nextPendingUsers);

    const error = new Error('Mã OTP đã hết hạn. Vui lòng đăng ký lại để nhận mã mới.');
    error.statusCode = 400;
    error.code = 'OTP_EXPIRED';
    throw error;
  }

  const isValidOtp = await bcrypt.compare(normalizedOtp, pendingUser.otpHash);
  if (!isValidOtp) {
    const error = new Error('Mã OTP không đúng. Vui lòng kiểm tra lại.');
    error.statusCode = 400;
    throw error;
  }

  const user = {
    id: createUserId(),
    displayName: pendingUser.displayName,
    email: pendingUser.email,
    passwordHash: pendingUser.passwordHash,
    isVerified: true,
    createdAt: pendingUser.createdAt,
    verifiedAt: new Date().toISOString()
  };

  users.push(user);
  await writeUsers(users);
  await writePendingUsers(pendingUsers.filter((candidate) => candidate.email !== normalizedEmail));

  return {
    user: publicUser(user),
    message: 'Đăng ký thành công. Bạn có thể đăng nhập.'
  };
}

async function resendOtp({ email }) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw validationError('Không tìm thấy email đang chờ xác thực. Vui lòng đăng ký lại.');
  }

  const users = await readUsers();
  const existingUser = users.find((candidate) => candidate.email === normalizedEmail);

  if (existingUser) {
    const error = new Error('Tài khoản đã được xác minh. Bạn có thể đăng nhập.');
    error.statusCode = 400;
    throw error;
  }

  const pendingUsers = await readPendingUsers({ pruneExpired: false });
  const pendingUser = pendingUsers.find((candidate) => candidate.email === normalizedEmail);

  if (!pendingUser) {
    const error = new Error('Không tìm thấy đăng ký đang chờ xác thực. Vui lòng đăng ký lại.');
    error.statusCode = 404;
    throw error;
  }

  if (new Date(pendingUser.otpExpiresAt).getTime() < Date.now()) {
    await writePendingUsers(pendingUsers.filter((candidate) => candidate.email !== normalizedEmail));

    const error = new Error('Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại để nhận mã OTP mới.');
    error.statusCode = 400;
    error.code = 'OTP_EXPIRED';
    throw error;
  }

  const otp = generateOtp();
  pendingUser.otpHash = await bcrypt.hash(otp, OTP_SALT_ROUNDS);
  pendingUser.otpExpiresAt = getOtpExpiresAt();
  await writePendingUsers(pendingUsers);
  await sendOtpEmail(pendingUser.email, otp);

  return {
    user: publicPendingUser(pendingUser),
    otpRequired: true,
    message: 'Mã OTP mới đã được gửi. Vui lòng kiểm tra mã trong console server khi chạy demo.'
  };
}

async function verifyToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const users = await readUsers();
  const user = users.find((candidate) => candidate.id === payload.sub);

  if (!user) {
    const error = new Error('Tài khoản không còn tồn tại.');
    error.statusCode = 401;
    throw error;
  }

  return publicUser(user);
}

async function listUsers() {
  const users = await readUsers();
  return users.map(publicUser);
}

async function getPublicUserById(userId) {
  const users = await readUsers();
  const user = users.find((candidate) => candidate.id === userId);
  return user ? publicUser(user) : null;
}

module.exports = {
  registerUser,
  loginUser,
  verifyOtp,
  resendOtp,
  verifyToken,
  listUsers,
  getPublicUserById
};

const SIGNALING_SERVER = import.meta.env.VITE_WEBSOCKET_URL || 'wss://localhost:3001';
const API_BASE_URL = import.meta.env.VITE_API_URL || signalingToHttpUrl(SIGNALING_SERVER);

function signalingToHttpUrl(url) {
  return url.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:').replace(/\/$/, '');
}

async function requestAuth(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Yêu cầu xác thực thất bại.');
    error.code = data.code;
    error.otpRequired = Boolean(data.otpRequired);
    error.user = data.user;
    throw error;
  }

  return data;
}

export async function registerUser({ displayName, email, password }) {
  return requestAuth('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ displayName, email, password })
  });
}

export async function loginUser({ email, password }) {
  return requestAuth('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export async function verifyOtp({ email, otp }) {
  return requestAuth('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp })
  });
}

export async function resendOtp({ email }) {
  return requestAuth('/api/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function getCurrentUser(token) {
  return requestAuth('/api/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

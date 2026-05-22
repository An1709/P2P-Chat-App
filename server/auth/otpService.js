const nodemailer = require('nodemailer');

const OTP_TTL_MINUTES = 10;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getOtpExpiresAt() {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();
}

async function sendOtpEmail(email, otp) {
  const demoMode = String(process.env.OTP_DEMO_MODE || 'true').toLowerCase() === 'true';

  if (demoMode) {
    console.log(`[DEMO OTP] Email: ${email} | OTP: ${otp}`);
    return;
  }

  const requiredSmtp = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const missing = requiredSmtp.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`SMTP is not configured (${missing.join(', ')}). Falling back to demo OTP log.`);
    console.log(`[DEMO OTP] Email: ${email} | OTP: ${otp}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'SecureChat verification code',
    text: `Your SecureChat verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`
  });
}

module.exports = {
  OTP_TTL_MINUTES,
  generateOtp,
  getOtpExpiresAt,
  sendOtpEmail
};

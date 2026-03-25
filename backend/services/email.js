const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 10000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
(async function sendWelcomeEmail(email, name, accessToken) {}); module.exports = { sendWelcomeEmail: async () => {}, sendMagicLinkEmail: async () => {} };
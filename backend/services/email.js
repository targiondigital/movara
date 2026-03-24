const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendWelcomeEmail(email, name, accessToken) {
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const accessLink = appUrl + '/access?token=' + accessToken;
  const firstName = name ? name.split(' ')[0] : '';
  const greeting = firstName ? ('Hola, ' + firstName + '!') : 'Bienvenido a Movara!';

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Movara Coach <noreply@movara.app>',
    to: email,
    subject: 'Tu Coach Personal esta listo - Movara',
    html: '<h1>' + greeting + '</h1>' +
          '<p>Tu acceso al <strong>Coach Personal Movara</strong> esta listo.</p>' +
          '<p><a href="' + accessLink + '" style="background:#1a6b4a;color:#fff;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;">Acceder a mi Coach Personal</a></p>' +
          '<p style="color:#888;font-size:13px;">Link personal: ' + accessLink + '</p>'
  });
}

async function sendMagicLinkEmail(email, magicToken) {
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const magicLink = appUrl + '/access?token=' + magicToken;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Movara Coach <noreply@movara.app>',
    to: email,
    subject: 'Tu link de acceso a Movara - valido por 30 minutos',
    html: '<h1>Tu link de acceso</h1>' +
          '<p>Haz clic abajo para acceder. Valido por <strong>30 minutos</strong>.</p>' +
          '<p><a href="' + magicLink + '" style="background:#1a6b4a;color:#fff;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;">Entrar a Movara</a></p>'
  });
}

module.exports = { sendWelcomeEmail, sendMagicLinkEmail };

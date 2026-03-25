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

// ============================================================
// Email de boas-vindas com link de acesso (após compra Hotmart)
// ============================================================
async function sendWelcomeEmail(email, name, accessToken) {
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const accessLink = `${appUrl}/access?token=${accessToken}`;
  const firstName = name ? name.split(' ')[0] : '';

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Movara Coach <noreply@movara.app>',
    to: email,
    subject: '¡Tu Coach Personal está listo! 🦵 — Movara',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a6b4a,#2d9b6e);border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;letter-spacing:-0.5px;">MOVARA</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;letter-spacing:2px;">RODILLAS SIN DOLOR</p>
    </div>

    <!-- Body -->
    <div style="background:#fff;padding:40px 32px;border-radius:0 0 16px 16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      <h2 style="color:#1a1a2e;font-size:22px;margin:0 0 16px;">
        ${firstName ? `¡Hola, ${firstName}! 🎉` : '¡Bienvenido a Movara! 🎉'}
      </h2>
      <p style="color:#555;font-size:16px;line-height:1.6;margin:0 0 24px;">
        Tu acceso al <strong>Coach Personal Movara</strong> está listo. Tu coach te guiará paso a paso para crear un plan de entrenamiento y nutrición <em>100% personalizado</em> para ti, con atención especial a tu condición de rodilla.
      </p>

      <!-- CTA Button -->
      <div style="text-align:center;margin:32px 0;">
        <a href="${accessLink}"
           style="display:inline-block;background:linear-gradient(135deg,#1a6b4a,#2d9b6e);color:#fff;text-decoration:none;padding:16px 40px;border-radius:50px;font-size:16px;font-weight:600;letter-spacing:0.3px;box-shadow:0 4px 15px rgba(26,107,74,0.35);">
          Acceder a mi Coach Personal →
        </a>
      </div>

      <p style="color:#888;font-size:13px;text-align:center;margin:0 0 24px;">
        Este link es personal e intransferible.<br>
        Si no funciona, cópialo en tu navegador:
      </p>
      <p style="color:#1a6b4a;font-size:12px;text-align:center;word-break:break-all;background:#f0faf5;padding:12px;border-radius:8px;">
        ${accessLink}
      </p>

      <hr style="border:none;border-top:1px solid #f0f0f0;margin:32px 0;">

      <p style="color:#888;font-size:13px;line-height:1.6;margin:0;">
        ¿Problemas para acceder? Responde este email y te ayudamos.<br>
        <strong>Equipo Movara</strong>
      </p>
    </div>

    <!-- Footer -->
    <p style="text-align:center;color:#aaa;font-size:12px;margin:24px 0 0;">
      © ${new Date().getFullYear()} Movara · Rodillas Sin Dolor en 7 Días
    </p>
  </div>
</body>
</html>
    `
  });
}

// ============================================================
// Magic link para re-login
// ============================================================
async function sendMagicLinkEmail(email, magicToken) {
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const magicLink = `${appUrl}/access?token=${magicToken}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Movara Coach <noreply@movara.app>',
    to: email,
    subject: 'Tu link de acceso a Movara — válido por 30 minutos',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:linear-gradient(135deg,#1a6b4a,#2d9b6e);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">MOVARA</h1>
    </div>
    <div style="background:#fff;padding:32px;border-radius:0 0 16px 16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      <h2 style="color:#1a1a2e;font-size:20px;margin:0 0 16px;">Tu link de acceso</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;">
        Haz clic abajo para acceder a tu Coach Personal. Este link es válido por <strong>30 minutos</strong>.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${magicLink}" style="display:inline-block;background:linear-gradient(135deg,#1a6b4a,#2d9b6e);color:#fff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:15px;font-weight:600;">
          Entrar a Movara →
        </a>
      </div>
      <p style="color:#aaa;font-size:12px;text-align:center;">
        Si no solicitaste este link, ignora este email.
      </p>
    </div>
  </div>
</body>
</html>
    `
  });
}

module.exports = { sendWelcomeEmail, sendMagicLinkEmail };

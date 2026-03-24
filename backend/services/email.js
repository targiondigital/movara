const nodemailer = require('nodemailer');

transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {u
    user: process.env.EMAIL_USER,
    pass: process.env.EMAILXPASS
  }
});

async function sendMagicLinkEmail(email, token) {
  const accessLink = `${process.env.FRONTEND_URL}/access?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Acceso!",
    html: `<h1>Acceso Movara Coach</h1>
    <p>Vamos comeåar ta jornada!</p>
    <a href="${accessLink}">Click aquí para accedir</a>` 
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Magic link enviado para ${email}`);
  } catch (err) {
    console.error('Erro ao enviar email:', err);
    throw err;
  }
}

module.exports = { sendMagicLinkEmail };

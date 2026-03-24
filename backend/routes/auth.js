const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../services/supabase');
const { sendMagicLinkEmail } = require('../services/email');
const authMiddleware = require('../middleware/auth');

// ============================================================
// POST /auth/access
// Valida o token de acesso (do email de boas-vindas)
// Retorna JWT de sessão
// ============================================================
router.post('/access', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token obrigatório' });
  }

  // Busca por access_token permanente OU magic_token temporário
  let user = null;

  // Tenta access_token
  const { data: byAccess } = await supabase
    .from('users')
    .select('*')
    .eq('access_token', token)
    .eq('is_active', true)
    .single();

  if (byAccess) {
    user = byAccess;
  } else {
    // Tenta magic_token
    const { data: byMagic } = await supabase
      .from('users')
      .select('*')
      .eq('magic_token', token)
      .eq('is_active', true)
      .single();

    if (byMagic) {
      // Verifica se não expirou
      if (new Date(byMagic.magic_token_expires_at) < new Date()) {
        return res.status(401).json({ error: 'Link expirado. Solicita uno nuevo.' });
      }
      user = byMagic;

      // Invalida magic token após uso
      await supabase
        .from('users')
        .update({ magic_token: null, magic_token_expires_at: null })
        .eq('id', user.id);
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'Link inválido o no encontrado.' });
  }

  // Atualiza last_access
  await supabase
    .from('users')
    .update({ last_access: new Date().toISOString() })
    .eq('id', user.id);

  // Gera JWT de sessão (24h)
  const sessionToken = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    success: true,
    token: sessionToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
});

// ============================================================
// POST /auth/magic-link
// Usuário pede re-acesso pelo email
// ============================================================
router.post('/magic-link', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email obrigatório' });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, email, name, is_active')
    .eq('email', email.toLowerCase())
    .single();

  // Sempre retorna sucesso (não revela se email existe ou não)
  if (!user || !user.is_active) {
    return res.json({ success: true, message: 'Si tienes acceso, recibirás un email en breve.' });
  }

  // Gera magic token válido por 30 minutos
  const magicToken = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await supabase
    .from('users')
    .update({ magic_token: magicToken, magic_token_expires_at: expiresAt })
    .eq('id', user.id);

  try {
    await sendMagicLinkEmail(user.email, magicToken);
  } catch (err) {
    console.error('Erro ao enviar magic link:', err);
  }

  res.json({ success: true, message: 'Si tienes acceso, recibirás un email en breve.' });
});

// ============================================================
// GET /auth/me
// Retorna dados do usuário autenticado
// ============================================================
router.get('/me', authMiddleware, async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('id, email, name, country, language, created_at, last_access')
    .eq('id', req.user.userId)
    .single();

  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  res.json({ user });
});

module.exports = router;

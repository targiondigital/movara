const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../services/supabase');
const { sendMagicLinkEmail } = require('../services/email');
const authMiddleware = require('../middleware/auth');

router.post('/access', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token obrigatorio' });
  let user = null;
  const { data: byAccess } = await supabase.from('users').select('*').eq('access_token', token).eq('is_active', true).single();
  if (byAccess) {
    user = byAccess;
  } else {
    const { data: byMagic } = await supabase.from('users').select('*').eq('magic_token', token).eq('is_active', true).single();
    if (byMagic) {
      if (new Date(byMagic.magic_token_expires_at) < new Date()) return res.status(401).json({ error: 'Link expirado' });
      user = byMagic;
      await supabase.from('users').update({ magic_token: null, magic_token_expires_at: null }).eq('id', user.id);
    }
  }
  if (!user) return res.status(401).json({ error: 'Link invalido o no encontrado' });
  await supabase.from('users').update({ last_access: new Date().toISOString() }).eq('id', user.id);
  const sessionToken = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
  res.json({ success: true, token: sessionToken, user: { id: user.id, email: user.email, name: user.name } });
});

router.post('/magic-link', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obrigatorio' });
  const { data: user } = await supabase.from('users').select('id,email,name,is_active').eq('email', email.toLowerCase()).single();
  if (!user || !user.is_active) return res.json({ success: true, message: 'Si tienes acceso, recibiras un email en breve' });
  const magicToken = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await supabase.from('users').update({ magic_token: magicToken, magic_token_expires_at: expiresAt }).eq('id', user.id);
  try { await sendMagicLinkEmail(user.email, magicToken); } catch (err) { console.error('Erro magic link:', err); }
  res.json({ success: true, message: 'Si tienes acceso, recibiras un email en breve' });
});

router.get('/me', authMiddleware, async (req, res) => {
  const { data: user } = await supabase.from('users').select('id,email,name,country,language,created_at,last_access').eq('id', req.user.userId).single();
  if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
  res.json({ user });
});

module.exports = router;

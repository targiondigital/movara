const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { sendMessage } = require('../services/claude');
const authMiddleware = require('../middleware/auth');

// Todas as rotas de chat exigem autenticação
router.use(authMiddleware);

// ============================================================
// GET /chat/consultation
// Busca ou cria a consulta ativa do usuário
// ============================================================
router.get('/consultation', async (req, res) => {
  const userId = req.user.userId;

  // Busca consulta ativa
  const { data: consultation } = await supabase
    .from('consultations')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (consultation) {
    return res.json({ consultation });
  }

  // Cria nova consulta
  const sessionNumber = await getNextSessionNumber(userId);
  const { data: newConsultation, error } = await supabase
    .from('consultations')
    .insert({
      user_id: userId,
      session_number: sessionNumber,
      messages: [],
      profile: {},
      current_stage: 0,
      status: 'active'
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: 'Erro ao criar consulta' });
  }

  res.json({ consultation: newConsultation });
});

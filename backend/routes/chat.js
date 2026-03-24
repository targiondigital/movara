const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { sendMessage } = require('../services/claude');
const authMiddleware = require('../middleware/auth');

// Todas as rotas de chat exigem autenticação
router.use(authMiddleware);

router.get('/consultation', async (req, res) => {
  const userId = req.user.userId;
  const { data: consultation } = await supabase
    .from('consultations').select('*').eq('user_id', userId)
    .eq('status', 'active').order('created_at', { ascending: false })
    .limit(1).single();
  if (consultation) return res.json({ consultation });
  const sessionNumber = await getNextSessionNumber(userId);
  const { data: newConsultation, error } = await supabase
    .from('consultations')
    .insert({ user_id: userId, session_number: sessionNumber, messages: [], profile: {}, current_stage: 0, status: 'active' })
    .select().single();
  if (error) return res.status(500).json({ error: 'Erro ao criar consulta' });
  res.json({ consultation: newConsultation });
});

router.post('/message', async (req, res) => {
  const userId = req.user.userId;
  const { message, consultationId } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Mensagem obrigatoria' });
  if (!consultationId) return res.status(400).json({ error: 'consultationId obrigatorio' });
  const { data: consultation, error: fetchError } = await supabase
    .from('consultations').select('*').eq('id', consultationId).eq('user_id', userId).single();
  if (fetchError || !consultation) return res.status(404).json({ error: 'Consulta nao encontrada' });
  try {
    const { reply, messages: updatedMessages } = await sendMessage(consultation.messages || [], message.trim());
    await supabase.from('consultations').update({ messages: updatedMessages, updated_at: new Date().toISOString() }).eq('id', consultationId);
    res.json({ reply, messages: updatedMessages });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao processar mensagem' });
  }
});

router.get('/history', async (req, res) => {
  const { data: consultations } = await supabase
    .from('consultations').select('id,session_number,status,current_stage,created_at,updated_at')
    .eq('user_id', req.user.userId).order('created_at', { ascending: false });
  res.json({ consultations: consultations || [] });
});

router.post('/new-session', async (req, res) => {
  const userId = req.user.userId;
  await supabase.from('consultations').update({ status: 'completed' }).eq('user_id', userId).eq('status', 'active');
  const sessionNumber = await getNextSessionNumber(userId);
  const { data: newConsultation, error } = await supabase
    .from('consultations')
    .insert({ user_id: userId, session_number: sessionNumber, messages: [], profile: {}, current_stage: 0, status: 'active' })
    .select().single();
  if (error) return res.status(500).json({ error: 'Erro ao criar sessao' });
  res.json({ consultation: newConsultation });
});

async function getNextSessionNumber(userId) {
  const { count } = await supabase.from('consultations').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  return (count || 0) + 1;
}

module.exports = router;

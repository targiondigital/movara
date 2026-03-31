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
  const { data: consultation, error: fetchError } = await supabase
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

  // Ignora erro PGRST116 (sem linhas), loga outros
  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Erro ao buscar consulta:', JSON.stringify(fetchError));
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
    console.error('Erro ao criar consulta - userId:', userId, 'sessionNumber:', sessionNumber);
    console.error('Supabase error:', JSON.stringify(error));
    return res.status(500).json({ error: 'Erro ao criar consulta' });
  }

  res.json({ consultation: newConsultation });
});

// ============================================================
// POST /chat/message
// Envia mensagem e recebe resposta do agente
// ============================================================
router.post('/message', async (req, res) => {
  const userId = req.user.userId;
  const { message, consultationId } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Mensagem obrigatória' });
  }

  if (!consultationId) {
    return res.status(400).json({ error: 'consultationId obrigatório' });
  }

  // Verifica que a consulta pertence ao usuário
  const { data: consultation, error: fetchError } = await supabase
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !consultation) {
    return res.status(404).json({ error: 'Consulta não encontrada' });
  }

  try {
    // Envia para Claude e recebe resposta
    const { reply, messages: updatedMessages } = await sendMessage(
      consultation.messages || [],
      message.trim()
    );

    // Salva histórico atualizado
    const { error: updateError } = await supabase
      .from('consultations')
      .update({
        messages: updatedMessages,
        updated_at: new Date().toISOString()
      })
      .eq('id', consultationId);

    if (updateError) {
      console.error('Erro ao salvar mensagem:', updateError);
    }

    res.json({ reply, messages: updatedMessages });

  } catch (error) {
    console.error('Erro ao chamar Claude:', error);
    res.status(500).json({ error: 'Erro ao processar mensagem. Por favor, tente novamente.' });
  }
});

// ============================================================
// GET /chat/history
// Retorna histórico de todas as consultas do usuário
// ============================================================
router.get('/history', async (req, res) => {
  const userId = req.user.userId;

  const { data: consultations } = await supabase
    .from('consultations')
    .select('id, session_number, status, current_stage, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  res.json({ consultations: consultations || [] });
});

// ============================================================
// POST /chat/new-session
// Inicia nova consulta (check-in)
// ============================================================
router.post('/new-session', async (req, res) => {
  const userId = req.user.userId;

  // Marca consultas anteriores como completas
  await supabase
    .from('consultations')
    .update({ status: 'completed' })
    .eq('user_id', userId)
    .eq('status', 'active');

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
    console.error('Erro ao criar nova sessão:', JSON.stringify(error));
    return res.status(500).json({ error: 'Erro ao criar nova sessão' });
  }

  res.json({ consultation: newConsultation });
});

// ============================================================
// Helper: número da próxima sessão
// ============================================================
async function getNextSessionNumber(userId) {
  const { count } = await supabase
    .from('consultations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count || 0) + 1;
}

module.exports = router;

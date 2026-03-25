const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const supabase = require('../services/supabase');
const { sendWelcomeEmail } = require('../services/email');

// ============================================================
// POST /webhook/hotmart
// Hotmart envia este payload quando uma compra é aprovada
// ============================================================
router.post('/hotmart', async (req, res) => {
  try {
    // Validação do token Hotmart (Hottok)
    const hottok = req.headers['x-hotmart-hottok'] || req.query.hottok;
    if (process.env.HOTMART_HOTTOK && hottok !== process.env.HOTMART_HOTTOK) {
      console.warn('Webhook: Hottok inválido');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = req.body;
    console.log('Webhook Hotmart recebido:', JSON.stringify(body, null, 2));

    // Extrai evento e dados (Hotmart envia diferentes formatos por versão)
    const event = body.event || body.data?.purchase?.status;
    const purchaseData = body.data?.purchase || body.purchase || body;

    // Apenas processa compras aprovadas
    const isApproved =
      event === 'PURCHASE_APPROVED' ||
      purchaseData?.status === 'APPROVED' ||
      event === 'PURCHASE_COMPLETE';

    if (!isApproved) {
      console.log('Webhook: evento ignorado -', event);
      return res.status(200).json({ received: true, processed: false });
    }

    // Extrai dados do comprador
    // v2.0.0: buyer está em body.data.buyer; versões anteriores: em purchaseData.buyer ou body.buyer
    const buyer = body.data?.buyer || purchaseData?.buyer || body.buyer || {};
    const email = buyer.email || body.email;
    const name = buyer.name || `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim() || body.name || '';
    const transactionId = purchaseData?.transaction || body.data?.purchase?.transaction || body.transaction || uuidv4();

    if (!email) {
      console.error('Webhook: email não encontrado no payload');
      return res.status(400).json({ error: 'Email não encontrado' });
    }

    // Verifica se usuário já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, access_token')
      .eq('email', email.toLowerCase())
      .single();

    let user = existingUser;
    const accessToken = uuidv4();

    if (existingUser) {
      // Atualiza token de acesso
      await supabase
        .from('users')
        .update({
          access_token: accessToken,
          hotmart_transaction_id: transactionId,
          name: name || existingUser.name
        })
        .eq('id', existingUser.id);
    } else {
      // Cria novo usuário
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          email: email.toLowerCase(),
          name: name,
          access_token: accessToken,
          hotmart_transaction_id: transactionId,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar usuário:', error);
        return res.status(500).json({ error: 'Erro ao criar usuário' });
      }
      user = newUser;
    }

    // Envia email de boas-vindas com link de acesso
    try {
      await sendWelcomeEmail(email, name, accessToken);
      console.log(`Email de boas-vindas enviado para: ${email}`);
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
      // Não falha o webhook por erro de email
    }

    res.status(200).json({ received: true, processed: true });

  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ============================================================
// POST /webhook/test
// Para testar sem Hotmart (somente em desenvolvimento)
// ============================================================
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obrigatório' });

  const accessToken = uuidv4();

  const { error } = await supabase
    .from('users')
    .upsert({ email: email.toLowerCase(), name: name || 'Test User', access_token: accessToken, is_active: true });

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    success: true,
    email,
    access_token: accessToken,
    access_link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/access?token=${accessToken}`
  });
});

module.exports = router;

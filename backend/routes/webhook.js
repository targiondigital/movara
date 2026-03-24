const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const supabase = require('../services/supabase');
const { sendWelcomeEmail } = require('../services/email');

// ============================================================
// POST /webhook/hotmart
// ============================================================
router.post('/hotmart', async (req, res) => {
  try {
    const hottok = req.headers['x-hotmart-hottok'] || req.query.hottok;
    if (process.env.HOTMART_HOTTOK && hottok !== process.env.HOTMART_HOTTOK) {
      console.warn('Webhook: Hottok invalido');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = req.body;
    console.log('Webhook Hotmart recebido:', JSON.stringify(body, null, 2));

    const event = body.event || body.data?.purchase?.status;
    const purchaseData = body.data?.purchase || body.purchase || body;

    const isApproved =
      event === 'PURCHASE_APPROVED' ||
      purchaseData?.status === 'APPROVED' ||
      event === 'PURCHASE_COMPLETE';

    if (!isApproved) {
      console.log('Webhook: evento ignorado -', event);
      return res.status(200).json({ received: true, processed: false });
    }

    const buyer = purchaseData?.buyer || body.buyer || {};
    const email = buyer.email || body.email;
    const name = buyer.name || body.name || '';
    const transactionId = purchaseData?.transaction || body.transaction || uuidv4();

    if (!email) {
      console.error('Webhook: email nao encontrado no payload');
      return res.status(400).json({ error: 'Email nao encontrado' });
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, access_token')
      .eq('email', email.toLowerCase())
      .single();

    let user = existingUser;
    const accessToken = uuidv4();

    if (existingUser) {
      await supabase
        .from('users')
        .update({
          access_token: accessToken,
          hotmart_transaction_id: transactionId,
          name: name || existingUser.name
        })
        .eq('id', existingUser.id);
    } else {
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
        console.error('Erro ao criar usuario:', error);
        return res.status(500).json({ error: 'Erro ao criar usuario' });
      }
      user = newUser;
    }

    try {
      await sendWelcomeEmail(email, name, accessToken);
      console.log('Email de boas-vindas enviado para:', email);
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
    }

    res.status(200).json({ received: true, processed: true });

  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ============================================================
// POST /webhook/test (apenas desenvolvimento)
// ============================================================
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obrigatorio' });

  const accessToken = uuidv4();

  const { error } = await supabase
    .from('users')
    .upsert({ email: email.toLowerCase(), name: name || 'Test User', access_token: accessToken, is_active: true });

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    success: true,
    email,
    access_token: accessToken,
    access_link: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/access?token=' + accessToken
  });
});

module.exports = router;

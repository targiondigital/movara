require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// Necessário para express-rate-limit funcionar corretamente no Render
// (o load balancer do Render define o header X-Forwarded-For)
app.set('trust proxy', 1);

// ============================================================
// CORS — permite requisições do frontend
// ============================================================
const allowedOrigins = [
  'https://movara.space',
  'https://www.movara.space',
  'https://movara-frontend.vercel.app',
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (ex: Postman, apps mobile nativos)
    if (!origin) return callback(null, true);
    // Permite origens explícitas
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Permite previews do Vercel (ex: movara-frontend-abc123.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    console.warn('CORS bloqueado para origem:', origin);
    return callback(new Error('Origem não permitida pelo CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ============================================================
// Body parsing
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// Rate limiting
// ============================================================
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: { error: 'Demasiadas solicitudes. Por favor espera un momento.' }
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20,
  message: { error: 'Demasiados mensajes en poco tiempo. Por favor espera.' }
});

app.use(generalLimiter);

// ============================================================
// Rotas
// ============================================================
app.use('/webhook', require('./routes/webhook'));
app.use('/auth', require('./routes/auth'));
app.use('/chat', chatLimiter, require('./routes/chat'));

// ============================================================
// Health check
// ============================================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Movara Coach API', timestamp: new Date().toISOString() });
});

// ============================================================
// 404
// ============================================================
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// ============================================================
// Error handler
// ============================================================
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// ============================================================
// Start
// ============================================================
app.listen(PORT, () => {
  console.log(`✅ Movara Coach API rodando na porta ${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

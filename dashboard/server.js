import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { exec } from 'child_process';
import { promisify } from 'util';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

// Inicialização do Firebase Admin SDK
// Nota: Requer variáveis de ambiente FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY
const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
  try {
    // Verifica se a chave parece uma chave privada real (e não uma API Key do front)
    if (!FIREBASE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY')) {
      throw new Error('A FIREBASE_PRIVATE_KEY não parece ser uma chave de Conta de Serviço (deve começar com "-----BEGIN PRIVATE KEY-----")');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.includes('\\n') ? FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : FIREBASE_PRIVATE_KEY,
      }),
    });
    console.log('🔥 [Firebase Admin] Inicializado com sucesso.');
  } catch (error) {
    console.error('❌ [Firebase Admin] Erro de inicialização (servidor continuará rodando sem exclusão direta):', error.message);
  }
} else {
  console.warn('⚠️ [Firebase Admin] Variáveis de ambiente faltando (ID, Email ou Key). Exclusão direta não funcionará.');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Default to 80 for VPS (Cloudflare compatible)
const PORT = process.env.PORT || 80;

// =============================================
// Proxy WebSocket: /mqtt -> Mosquitto (porta 9001)
// =============================================
const MOSQUITTO_WS_TARGET = process.env.MOSQUITTO_WS_URL || 'http://localhost:9001';

const mqttProxy = createProxyMiddleware({
  target: MOSQUITTO_WS_TARGET,
  ws: true,
  changeOrigin: true,
  pathRewrite: { '^/mqtt': '/' },
  logger: console,
});

app.use('/mqtt', mqttProxy);

// =============================================
// Proxy n8n: /api/n8n -> n8n.nikaotech.com
// =============================================
const n8nProxy = createProxyMiddleware({
  target: 'https://n8n.nikaotech.com',
  changeOrigin: true,
  pathRewrite: { '^/api/n8n': '' }, // Apenas remove o prefixo, permitindo decidir /webhook ou /webhook-test no front
  logger: console,
});

app.use('/api/n8n', n8nProxy);

// =============================================
// Admin Direct Actions: Firebase Auth
// =============================================
app.use(cors());
app.use(express.json());

// Rota para exclusão de usuário via Firebase Admin SDK
app.post('/api/admin/delete-user', async (req, res) => {
  const { uid } = req.body;

  if (!uid || typeof uid !== 'string' || uid.length < 5) {
    return res.status(400).json({ success: false, error: 'UID inválido' });
  }

  console.log(`🗑️ [Admin] Solicitando exclusão do UID: ${uid}`);

  try {
    // Tenta deletar usando o SDK Admin
    await admin.auth().deleteUser(uid);
    console.log(`✅ [Admin] Usuário ${uid} deletado do Firebase!`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [Admin] Erro ao deletar no Firebase:', error.message);

    // Trata erro de usuário não encontrado como sucesso (idempotência)
    if (error.code === 'auth/user-not-found') {
      return res.json({ success: true, warning: 'Usuário já não existia no Firebase' });
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoints depreciados ou removidos movidos para webhooks n8n por segurança e modularidade.

// Middlewares were moved up
// CSP headers for fonts and resources
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; " +
    "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com https://at.alicdn.com data:; " +
    "img-src 'self' data: blob: https:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://at.alicdn.com; " +
    "connect-src 'self' wss: ws: https:;"
  );
  next();
});

// Serve production build files
app.use(express.static(path.join(__dirname, 'dist')));

// Replicate API logic from Vite config
app.post('/api/sensors', (req, res) => {
  try {
    const data = req.body;
    const filePath = path.resolve(__dirname, 'src/data/telemetry.json');

    let existingContent = { history: [] };
    if (fs.existsSync(filePath)) {
      try {
        existingContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (!existingContent.history) existingContent.history = [];
      } catch (e) {
        // Ignorar se falhar parseamento
      }
    }

    const now = new Date();
    const formattedTime = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
    const currentTemp = data?.data?.temperature ?? data?.temperature;

    let updatedHistory = [...(existingContent.history || [])];

    if (currentTemp !== undefined) {
      const lastEntry = updatedHistory[updatedHistory.length - 1];

      if (!lastEntry || lastEntry.time !== formattedTime) {
        if (!lastEntry || Math.abs(lastEntry.value - currentTemp) > 0.1 || (now.getTime() - lastEntry.timestamp) > 10 * 60 * 1000) {
          updatedHistory.push({
            time: formattedTime,
            value: currentTemp,
            timestamp: now.getTime()
          });
        }
      }
    }

    if (updatedHistory.length > 1440) {
      updatedHistory = updatedHistory.slice(updatedHistory.length - 1440);
    }

    const content = {
      lastUpdate: now.toISOString(),
      data: data,
      history: updatedHistory
    };

    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    console.log('✅ [VPS] Telemetria recebida e salva!');

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Erro na API:', error);
    res.status(400).send('Invalid request');
  }
});

// React Router SPA fallback - catch-all middleware
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Criar HTTP server para suportar WebSocket upgrade
const server = http.createServer(app);

// Habilitar proxy de WebSocket upgrade no /mqtt
server.on('upgrade', (req, socket, head) => {
  if (req.url && req.url.startsWith('/mqtt')) {
    mqttProxy.upgrade(req, socket, head);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 VPS Servidor rodando na porta ${PORT}`);
  console.log(`📡 MQTT WebSocket proxy: /mqtt -> ${MOSQUITTO_WS_TARGET}`);
});

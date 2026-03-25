import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Default to 80 for VPS (Cloudflare compatible)
const PORT = process.env.PORT || 80;

app.use(cors());
app.use(express.json());

// CSP headers for fonts and resources
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; " +
    "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com data:; " +
    "img-src 'self' data: blob: https:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "connect-src 'self' wss: ws: https:;"
  );
  next();
});

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
    const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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

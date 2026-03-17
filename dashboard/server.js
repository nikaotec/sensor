import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Default to 4000 for VPS to avoid conflict with Gotenberg on 3000
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

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

// React Router SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 VPS Servidor rodando. Acesse: http://localhost:${PORT}`);
});

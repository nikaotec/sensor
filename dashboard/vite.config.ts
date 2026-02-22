import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-mock',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.method === 'POST' && req.url === '/api/sensors') {
            let body = ''
            req.on('data', chunk => {
              body += chunk.toString()
            })
            req.on('end', () => {
              try {
                const data = JSON.parse(body)
                const filePath = path.resolve(__dirname, 'src/data/telemetry.json')

                // Read existing data to maintain history
                let existingContent: any = { history: [] }
                if (fs.existsSync(filePath)) {
                  try {
                    existingContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
                    if (!existingContent.history) existingContent.history = []
                  } catch (e) {
                    // Ignore parse errors on read
                  }
                }

                const now = new Date()
                const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                const currentTemp = data?.data?.temperature ?? data?.temperature

                // Append to history if we have a valid temperature and:
                // 1. History is empty OR
                // 2. The last entry time is different from current formatted time (approx 1 min diff)
                // For a 24h realistic chart, we could check if 30 mins elapsed, but for immediate testing, 
                // we'll log roughly every minute if it changes, or adapt to a 30m rule:

                let updatedHistory = [...(existingContent.history || [])]

                if (currentTemp !== undefined) {
                  const lastEntry = updatedHistory[updatedHistory.length - 1]

                  // Simple logic: add point if time string changed (every minute)
                  // AND (value changed OR it's been 10 minutes since last point to prevent flatlining data explosion)
                  // For a real 24h chart, 1 point per minute = 1440 points.
                  if (!lastEntry || lastEntry.time !== formattedTime) {
                    if (!lastEntry || Math.abs(lastEntry.value - currentTemp) > 0.1 || (now.getTime() - lastEntry.timestamp) > 10 * 60 * 1000) {
                      updatedHistory.push({
                        time: formattedTime,
                        value: currentTemp,
                        timestamp: now.getTime()
                      })
                    }
                  }
                }

                // Keep only the last 24 hours of points (assuming ~1 point/min max, let's keep 1440)
                if (updatedHistory.length > 1440) {
                  updatedHistory = updatedHistory.slice(updatedHistory.length - 1440)
                }

                const content = {
                  lastUpdate: now.toISOString(),
                  data: data,
                  history: updatedHistory
                }

                fs.writeFileSync(filePath, JSON.stringify(content, null, 2))
                console.log('✅ Telemetria recebida e salva em telemetry.json')

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ status: 'success' }))
              } catch (_e) {
                res.statusCode = 400
                res.end('Invalid JSON')
              }
            })
          } else {
            next()
          }
        })
      }
    }
  ],
  server: {
    allowedHosts: true
  }
})

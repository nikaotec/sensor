require('dotenv').config();
const express = require('express');
const mqtt = require('mqtt');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { pool, getTenantClient } = require('./db');
const { authenticate } = require('./middleware/auth');
const { tenantContext } = require('./middleware/tenant');

// Route modules
const authRoutes = require('./routes/auth');
const locationRoutes = require('./routes/locations');
const deviceRoutes = require('./routes/devices');
const userRoutes = require('./routes/users');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// ============================================
// ROUTES
// ============================================

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (require authentication + tenant context)
app.use('/api/locations', authenticate, tenantContext, locationRoutes);
app.use('/api/devices', authenticate, tenantContext, deviceRoutes);
app.use('/api/users', authenticate, userRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// MQTT BRIDGE (Multitenant)
// ============================================

const mqttClient = mqtt.connect(process.env.MQTT_SERVER, {
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASS,
});

mqttClient.on('connect', () => {
    console.log('Connected to MQTT Broker');
    // Subscribe to ALL tenant topics: {tenant_slug}/esp32/{device_key}/data
    mqttClient.subscribe('+/esp32/+/data');
});

mqttClient.on('message', async (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());
        const parts = topic.split('/');
        // Topic format: {tenant_slug}/esp32/{device_key}/data
        const tenantSlug = parts[0];
        const deviceKey = parts[2];

        // Validate tenant exists
        const tenantResult = await pool.query(
            'SELECT id, slug FROM public.tenants WHERE slug = $1 AND is_active = TRUE',
            [tenantSlug]
        );

        if (tenantResult.rows.length === 0) {
            console.warn(`MQTT: unknown tenant slug "${tenantSlug}", ignoring message`);
            return;
        }

        // Get tenant-scoped DB client
        const client = await getTenantClient(tenantSlug);

        try {
            // Ensure device exists in tenant schema
            let device = await client.query(
                'SELECT id FROM devices WHERE device_key = $1',
                [deviceKey]
            );

            if (device.rows.length === 0) {
                // Auto-register device
                device = await client.query(
                    'INSERT INTO devices (device_key, name) VALUES ($1, $2) RETURNING id',
                    [deviceKey, payload.DISPOSITIVO || deviceKey]
                );
            } else {
                await client.query(
                    'UPDATE devices SET last_seen = NOW() WHERE id = $1',
                    [device.rows[0].id]
                );
            }

            const deviceId = device.rows[0].id;

            // Insert reading
            await client.query(
                'INSERT INTO readings (device_id, temperature, relay_status, is_alarm) VALUES ($1, $2, $3, $4)',
                [
                    deviceId,
                    payload.TEMP_ATUAL || payload['TEMP.'] || 0,
                    payload.RELE || 'DESCONHECIDO',
                    payload.TIPO === 'SAIU_DA_FAIXA' || payload.TIPO === 'ALERTA_REPETITIVO',
                ]
            );

            console.log(`[${tenantSlug}] Saved reading for ${deviceKey}: ${payload.TEMP_ATUAL}°C`);
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error processing MQTT message:', err);
    }
});

// ============================================
// START SERVER
// ============================================

app.listen(port, () => {
    console.log(`Backend API listening at http://localhost:${port}`);
});

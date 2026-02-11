require('dotenv').config();
const express = require('express');
const mqtt = require('mqtt');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 3001;

// Database Connection
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// API Endpoints
app.get('/api/status', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM v_latest_status');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/history/:key', async (req, res) => {
    const { key } = req.params;
    const limit = req.query.limit || 100;
    try {
        const result = await pool.query(`
      SELECT r.* 
      FROM readings r
      JOIN devices d ON r.device_id = d.id
      WHERE d.device_key = $1
      ORDER BY r.timestamp DESC
      LIMIT $2
    `, [key, limit]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// MQTT Bridge
const mqttClient = mqtt.connect(process.env.MQTT_SERVER, {
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASS,
});

mqttClient.on('connect', () => {
    console.log('Connected to MQTT Broker');
    mqttClient.subscribe(`${process.env.MQTT_BASE_TOPIC}/+/data`);
});

mqttClient.on('message', async (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());
        const deviceKey = topic.split('/')[1]; // Assume esp32/{deviceKey}/data

        // 1. Ensure device exists
        let device = await pool.query('SELECT id FROM devices WHERE device_key = $1', [deviceKey]);

        if (device.rows.length === 0) {
            device = await pool.query(
                'INSERT INTO devices (device_key, name, location) VALUES ($1, $2, $3) RETURNING id',
                [deviceKey, payload.DISPOSITIVO || deviceKey, 'Unknown']
            );
        } else {
            await pool.query('UPDATE devices SET last_seen = CURRENT_TIMESTAMP WHERE id = $1', [device.rows[0].id]);
        }

        const deviceId = device.rows[0].id;

        // 2. Insert reading
        await pool.query(
            'INSERT INTO readings (device_id, temperature, relay_status, is_alarm) VALUES ($1, $2, $3, $4)',
            [
                deviceId,
                payload.TEMP_ATUAL || payload['TEMP.'] || 0,
                payload.RELE || 'DESCONHECIDO',
                payload.TIPO === 'SAIU_DA_FAIXA' || payload.TIPO === 'ALERTA_REPETITIVO'
            ]
        );

        console.log(`Saved reading for ${deviceKey}: ${payload.TEMP_ATUAL}°C`);
    } catch (err) {
        console.error('Error processing MQTT message:', err);
    }
});

app.listen(port, () => {
    console.log(`Backend API listening at http://localhost:${port}`);
});

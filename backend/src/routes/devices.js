const express = require('express');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/devices
 * Optional query: ?location_id=
 */
router.get('/', async (req, res) => {
    try {
        let query = `
      SELECT d.*, l.name AS location_name 
      FROM devices d 
      LEFT JOIN locations l ON d.location_id = l.id
    `;
        const params = [];

        if (req.query.location_id) {
            query += ' WHERE d.location_id = $1';
            params.push(req.query.location_id);
        }

        query += ' ORDER BY d.name';
        const result = await req.tenantClient.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('List devices error:', err);
        res.status(500).json({ error: 'Erro ao listar dispositivos' });
    }
});

/**
 * GET /api/devices/status
 * Latest status for all devices (replaces old /api/status)
 */
router.get('/status', async (req, res) => {
    try {
        const result = await req.tenantClient.query('SELECT * FROM v_latest_status');
        res.json(result.rows);
    } catch (err) {
        console.error('Status error:', err);
        res.status(500).json({ error: 'Erro ao buscar status' });
    }
});

/**
 * GET /api/devices/:key/history
 */
router.get('/:key/history', async (req, res) => {
    const { key } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    try {
        const result = await req.tenantClient.query(
            `SELECT r.* 
       FROM readings r
       JOIN devices d ON r.device_id = d.id
       WHERE d.device_key = $1
       ORDER BY r.timestamp DESC
       LIMIT $2`,
            [key, limit]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('History error:', err);
        res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
});

/**
 * POST /api/devices
 */
router.post('/', requireRole('admin'), async (req, res) => {
    const { device_key, name, location_id } = req.body;
    if (!device_key || !name) {
        return res.status(400).json({ error: 'device_key e name são obrigatórios' });
    }

    try {
        const result = await req.tenantClient.query(
            'INSERT INTO devices (device_key, name, location_id) VALUES ($1, $2, $3) RETURNING *',
            [device_key, name, location_id || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Device key já cadastrado' });
        }
        console.error('Create device error:', err);
        res.status(500).json({ error: 'Erro ao cadastrar dispositivo' });
    }
});

/**
 * PUT /api/devices/:id
 */
router.put('/:id', requireRole('admin'), async (req, res) => {
    const { name, location_id } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    try {
        const result = await req.tenantClient.query(
            'UPDATE devices SET name = $1, location_id = $2 WHERE id = $3 RETURNING *',
            [name, location_id || null, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dispositivo não encontrado' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Update device error:', err);
        res.status(500).json({ error: 'Erro ao atualizar dispositivo' });
    }
});

/**
 * DELETE /api/devices/:id
 */
router.delete('/:id', requireRole('admin'), async (req, res) => {
    try {
        const result = await req.tenantClient.query(
            'DELETE FROM devices WHERE id = $1 RETURNING id',
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dispositivo não encontrado' });
        }
        res.json({ message: 'Dispositivo removido' });
    } catch (err) {
        console.error('Delete device error:', err);
        res.status(500).json({ error: 'Erro ao remover dispositivo' });
    }
});

module.exports = router;

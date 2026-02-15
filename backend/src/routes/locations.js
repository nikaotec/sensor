const express = require('express');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/locations
 */
router.get('/', async (req, res) => {
    try {
        const result = await req.tenantClient.query(
            'SELECT * FROM locations ORDER BY name'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('List locations error:', err);
        res.status(500).json({ error: 'Erro ao listar locais' });
    }
});

/**
 * GET /api/locations/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const result = await req.tenantClient.query(
            'SELECT * FROM locations WHERE id = $1',
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Local não encontrado' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Get location error:', err);
        res.status(500).json({ error: 'Erro ao buscar local' });
    }
});

/**
 * POST /api/locations
 */
router.post('/', requireRole('admin'), async (req, res) => {
    const { name, address } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    try {
        const result = await req.tenantClient.query(
            'INSERT INTO locations (name, address) VALUES ($1, $2) RETURNING *',
            [name, address || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Create location error:', err);
        res.status(500).json({ error: 'Erro ao criar local' });
    }
});

/**
 * PUT /api/locations/:id
 */
router.put('/:id', requireRole('admin'), async (req, res) => {
    const { name, address } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    try {
        const result = await req.tenantClient.query(
            'UPDATE locations SET name = $1, address = $2 WHERE id = $3 RETURNING *',
            [name, address || null, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Local não encontrado' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Update location error:', err);
        res.status(500).json({ error: 'Erro ao atualizar local' });
    }
});

/**
 * DELETE /api/locations/:id
 */
router.delete('/:id', requireRole('admin'), async (req, res) => {
    try {
        const result = await req.tenantClient.query(
            'DELETE FROM locations WHERE id = $1 RETURNING id',
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Local não encontrado' });
        }
        res.json({ message: 'Local removido' });
    } catch (err) {
        console.error('Delete location error:', err);
        res.status(500).json({ error: 'Erro ao remover local' });
    }
});

module.exports = router;

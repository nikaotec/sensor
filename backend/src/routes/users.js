const express = require('express');
const { pool } = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/users
 * List users in the same tenant (admin only)
 */
router.get('/', requireRole('admin'), async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, name, role, created_at FROM public.users WHERE tenant_id = $1 ORDER BY name',
            [req.user.tenant_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('List users error:', err);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

/**
 * PATCH /api/users/:id/role
 * Change user role (admin only)
 */
router.patch('/:id/role', requireRole('admin'), async (req, res) => {
    const { role } = req.body;
    if (!role || !['admin', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Role deve ser admin ou viewer' });
    }

    // Prevent self-demotion
    if (req.params.id === req.user.id) {
        return res.status(400).json({ error: 'Você não pode alterar seu próprio papel' });
    }

    try {
        const result = await pool.query(
            'UPDATE public.users SET role = $1 WHERE id = $2 AND tenant_id = $3 RETURNING id, email, name, role',
            [role, req.params.id, req.user.tenant_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Change role error:', err);
        res.status(500).json({ error: 'Erro ao alterar papel' });
    }
});

/**
 * DELETE /api/users/:id
 * Remove user (admin only)
 */
router.delete('/:id', requireRole('admin'), async (req, res) => {
    // Prevent self-deletion
    if (req.params.id === req.user.id) {
        return res.status(400).json({ error: 'Você não pode remover a si mesmo' });
    }

    try {
        const result = await pool.query(
            'DELETE FROM public.users WHERE id = $1 AND tenant_id = $2 RETURNING id',
            [req.params.id, req.user.tenant_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.json({ message: 'Usuário removido' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ error: 'Erro ao remover usuário' });
    }
});

module.exports = router;

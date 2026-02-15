const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool, createTenantSchema } = require('../db');
const { generateToken, authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Self-service: create tenant + admin user + schema
 */
router.post('/register', async (req, res) => {
    const { companyName, slug, name, email, password } = req.body;

    if (!companyName || !slug || !name || !email || !password) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
        return res.status(400).json({ error: 'Slug deve conter apenas letras minúsculas, números e hífens' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if slug already exists
        const existing = await client.query('SELECT id FROM public.tenants WHERE slug = $1', [slug]);
        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Este slug já está em uso' });
        }

        // Check if email already exists
        const existingEmail = await client.query('SELECT id FROM public.users WHERE email = $1', [email]);
        if (existingEmail.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Este email já está cadastrado' });
        }

        // Generate MQTT credentials
        const mqttUser = `mqtt_${slug}`;
        const mqttPass = uuidv4().replace(/-/g, '').substring(0, 16);

        // Create tenant
        const tenantResult = await client.query(
            `INSERT INTO public.tenants (name, slug, mqtt_user, mqtt_pass) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
            [companyName, slug, mqttUser, mqttPass]
        );
        const tenant = tenantResult.rows[0];

        // Create admin user
        const passwordHash = await bcrypt.hash(password, 10);
        const userResult = await client.query(
            `INSERT INTO public.users (tenant_id, email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4, 'admin') RETURNING id, email, name, role, tenant_id`,
            [tenant.id, email, passwordHash, name]
        );
        const user = userResult.rows[0];

        // Create tenant schema
        await client.query('SELECT public.create_tenant_schema($1)', [slug]);

        await client.query('COMMIT');

        // Generate JWT
        const token = generateToken({
            ...user,
            tenant_slug: tenant.slug,
        });

        res.status(201).json({
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Erro ao registrar' });
    } finally {
        client.release();
    }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    try {
        const result = await pool.query(
            `SELECT u.*, t.slug AS tenant_slug, t.name AS tenant_name
       FROM public.users u
       JOIN public.tenants t ON u.tenant_id = t.id
       WHERE u.email = $1 AND t.is_active = TRUE`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = generateToken({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenant_id: user.tenant_id,
            tenant_slug: user.tenant_slug,
        });

        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            tenant: { id: user.tenant_id, name: user.tenant_name, slug: user.tenant_slug },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Erro ao autenticar' });
    }
});

/**
 * POST /api/auth/invite
 * Admin invites a new user to their tenant
 */
router.post('/invite', authenticate, requireRole('admin'), async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const userRole = role === 'admin' ? 'admin' : 'viewer';

    try {
        const existingEmail = await pool.query('SELECT id FROM public.users WHERE email = $1', [email]);
        if (existingEmail.rows.length > 0) {
            return res.status(409).json({ error: 'Este email já está cadastrado' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO public.users (tenant_id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role`,
            [req.user.tenant_id, email, passwordHash, name, userRole]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Invite error:', err);
        res.status(500).json({ error: 'Erro ao convidar usuário' });
    }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.email, u.name, u.role, t.id AS tenant_id, t.name AS tenant_name, t.slug AS tenant_slug, t.mqtt_user, t.mqtt_pass
       FROM public.users u
       JOIN public.tenants t ON u.tenant_id = t.id
       WHERE u.id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const user = result.rows[0];
        res.json({
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            tenant: {
                id: user.tenant_id,
                name: user.tenant_name,
                slug: user.tenant_slug,
                mqtt_user: user.mqtt_user,
                mqtt_pass: user.role === 'admin' ? user.mqtt_pass : undefined,
            },
        });
    } catch (err) {
        console.error('Me error:', err);
        res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
});

module.exports = router;

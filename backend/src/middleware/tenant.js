const { getTenantClient } = require('../db');

/**
 * Middleware: resolve tenant schema from authenticated user.
 * Sets req.tenantClient (PG client with correct search_path).
 * Automatically releases client after response.
 */
async function tenantContext(req, res, next) {
    if (!req.user || !req.user.tenant_slug) {
        return res.status(400).json({ error: 'Tenant não identificado' });
    }

    try {
        const client = await getTenantClient(req.user.tenant_slug);
        req.tenantClient = client;

        // Release client when response finishes
        const cleanup = () => {
            client.release();
            res.removeListener('finish', cleanup);
            res.removeListener('close', cleanup);
        };
        res.on('finish', cleanup);
        res.on('close', cleanup);

        next();
    } catch (err) {
        console.error('Tenant context error:', err);
        return res.status(500).json({ error: 'Erro ao acessar dados do tenant' });
    }
}

module.exports = { tenantContext };

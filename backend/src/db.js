const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

/**
 * Get a client with search_path set to the tenant's schema.
 * IMPORTANT: caller MUST call client.release() when done.
 */
async function getTenantClient(tenantSlug) {
    const client = await pool.connect();
    const schemaName = `tenant_${tenantSlug}`;
    await client.query(`SET search_path TO ${schemaName}, public`);
    return client;
}

/**
 * Create a new tenant schema using the template function.
 */
async function createTenantSchema(slug) {
    await pool.query('SELECT public.create_tenant_schema($1)', [slug]);
}

/**
 * Drop a tenant schema.
 */
async function dropTenantSchema(slug) {
    await pool.query('SELECT public.drop_tenant_schema($1)', [slug]);
}

module.exports = { pool, getTenantClient, createTenantSchema, dropTenantSchema };

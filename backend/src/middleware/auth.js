const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

/**
 * Generate a JWT token for a user.
 */
function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenant_id: user.tenant_id,
            tenant_slug: user.tenant_slug,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

/**
 * Middleware: verify JWT from Authorization header.
 * Attaches req.user with decoded token payload.
 */
function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = header.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
}

/**
 * Middleware factory: require specific role.
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        next();
    };
}

module.exports = { generateToken, authenticate, requireRole };

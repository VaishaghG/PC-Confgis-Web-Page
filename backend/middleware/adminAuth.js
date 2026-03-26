const requireAuth = require('./requireAuth');

async function requireAdmin(req, res, next) {
    await requireAuth(req, res, async () => {
        console.log('USER:', req.user);

        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admins only' });
        }

        next();
    });
}

module.exports = requireAdmin;

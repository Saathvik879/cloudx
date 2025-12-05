const fs = require('fs-extra');
const path = require('path');

// Master key for admin access
const MASTER_KEY = process.env.MASTER_KEY || 'cloudx-admin-2024-secure-key';

// Load API keys
const keysFile = path.join(__dirname, 'keys.json');
let apiKeys = {};

function loadKeys() {
    if (fs.existsSync(keysFile)) {
        apiKeys = fs.readJsonSync(keysFile);
    }
}

loadKeys();

// Middleware to require authentication
function requireAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if master key (admin)
    if (apiKey === MASTER_KEY) {
        req.userId = 'admin';
        req.userEmail = 'admin@cloudx.local';
        req.userName = 'Administrator';
        req.isAdmin = true;
        return next();
    }

    // Reload keys to get latest
    loadKeys();

    // Check if valid API key
    if (!apiKeys[apiKey]) {
        return res.status(401).json({ error: 'Invalid API key' });
    }

    // Attach user info to request
    req.userId = apiKeys[apiKey].userId || 'unknown';
    req.userEmail = apiKeys[apiKey].email || 'unknown@cloudx.local';
    req.userName = apiKeys[apiKey].name || 'User';
    req.isAdmin = false;

    next();
}

// Middleware for admin-only routes
function requireAdmin(req, res, next) {
    if (!req.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

module.exports = { requireAuth, requireAdmin, MASTER_KEY };

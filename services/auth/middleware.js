const fs = require('fs-extra');
const path = require('path');

// Master key for admin access
const MASTER_KEY = process.env.MASTER_KEY || 'cloudx-admin-2024-secure-key';

// Load API keys
const keysFile = path.join(__dirname, 'keys.json');
let apiKeys = {};

function loadKeys() {
    try {
        if (fs.existsSync(keysFile)) {
            apiKeys = fs.readJsonSync(keysFile);
        }
    } catch (err) {
        console.error('Error loading keys:', err);
        apiKeys = {};
    }
}

loadKeys();

// Middleware to require authentication
function requireAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'Authentication required. Include X-API-Key header.' });
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

    const keyData = apiKeys[apiKey];

    // Attach user info to request - CRITICAL for user isolation
    req.userId = keyData.userId || 'unknown';
    req.userEmail = keyData.email || 'unknown@cloudx.local';
    req.userName = keyData.name || 'User';
    req.isAdmin = false;
    req.keyData = keyData;

    next();
}

// Middleware for admin-only routes
function requireAdmin(req, res, next) {
    if (!req.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

module.exports = { requireAuth, requireAdmin, MASTER_KEY, loadKeys };

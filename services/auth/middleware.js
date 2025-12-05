const express = require('express');
const router = express.Router();

// Master key for admin access (CHANGE THIS!)
const MASTER_KEY = process.env.MASTER_KEY || 'cloudx-admin-2024-secure-key';

// Middleware to check authentication
function requireAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    // Check if it's the master key (admin)
    if (apiKey === MASTER_KEY) {
        req.userType = 'admin';
        req.isAdmin = true;
        return next();
    }

    // Check if it's a valid user API key
    const keys = require('./keys.json');
    const validKey = keys.apiKeys.find(k => k.key === apiKey && k.active);

    if (validKey) {
        req.userType = 'user';
        req.isAdmin = false;
        req.userId = validKey.userId;

        // Track usage for billing (only for regular users)
        validKey.usage = (validKey.usage || 0) + 1;
        validKey.lastUsed = new Date().toISOString();
        require('fs-extra').writeJsonSync(__dirname + '/keys.json', keys, { spaces: 2 });

        return next();
    }

    // No valid authentication
    return res.status(401).json({ error: 'Authentication required. Please provide a valid API key.' });
}

// Middleware for admin-only routes
function requireAdmin(req, res, next) {
    if (!req.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

module.exports = { requireAuth, requireAdmin, MASTER_KEY };

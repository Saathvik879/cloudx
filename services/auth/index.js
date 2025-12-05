const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');

const keysFile = path.join(__dirname, 'keys.json');
const MASTER_KEY = process.env.MASTER_KEY || 'cloudx-admin-2024-secure-key';

// Initialize keys file
let apiKeys = {};
if (fs.existsSync(keysFile)) {
    try {
        apiKeys = fs.readJsonSync(keysFile);
    } catch (err) {
        console.error('Error loading keys file:', err);
        apiKeys = {};
    }
} else {
    fs.writeJsonSync(keysFile, apiKeys);
}

function saveKeys() {
    try {
        fs.writeJsonSync(keysFile, apiKeys, { spaces: 2 });
    } catch (err) {
        console.error('Error saving keys file:', err);
    }
}

function generateApiKey() {
    return 'cx_' + crypto.randomBytes(32).toString('hex');
}

// Get user profile
router.get('/profile', (req, res) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }

    if (apiKey === MASTER_KEY) {
        return res.json({
            userId: 'admin',
            email: 'admin@cloudx.local',
            name: 'Administrator',
            isAdmin: true
        });
    }

    if (apiKeys[apiKey]) {
        return res.json({
            userId: apiKeys[apiKey].userId,
            email: apiKeys[apiKey].email,
            name: apiKeys[apiKey].name || 'User',
            isAdmin: false
        });
    }

    res.status(401).json({ error: 'Invalid API key' });
});

// Google Sign-In
router.post('/google-signin', async (req, res) => {
    const { idToken, email: userEmail, name: userName, uid } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: 'ID token required' });
    }

    try {
        // Use provided user info or generate defaults
        const userId = uid || 'google_' + Date.now();
        const email = userEmail || 'user@gmail.com';
        const name = userName || 'Google User';

        // Check if user already has an API key
        let existingKey = Object.keys(apiKeys).find(k =>
            apiKeys[k].email === email || apiKeys[k].userId === userId
        );

        if (existingKey) {
            // Update last used
            apiKeys[existingKey].lastUsed = new Date().toISOString();
            saveKeys();
            return res.json({
                apiKey: existingKey,
                message: 'Welcome back!'
            });
        }

        // Create new API key for user
        const key = generateApiKey();
        apiKeys[key] = {
            name: name,
            userId: userId,
            email: email,
            permissions: ['database:read', 'database:write', 'storage:read', 'storage:write', 'all'],
            created: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        };

        saveKeys();

        res.json({
            apiKey: key,
            message: 'Account created successfully!'
        });
    } catch (error) {
        console.error('Google sign-in error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Create API Key
router.post('/keys', (req, res) => {
    const { name, userId, email } = req.body;
    const requestApiKey = req.headers['x-api-key'];

    // Verify requester is authenticated
    if (!requestApiKey) {
        return res.status(401).json({ error: 'API key required' });
    }

    // Get requester's userId
    let requestUserId = 'admin';
    if (requestApiKey !== MASTER_KEY) {
        if (!apiKeys[requestApiKey]) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        requestUserId = apiKeys[requestApiKey].userId;
    }

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    const key = generateApiKey();
    const generatedUserId = userId || requestUserId;

    apiKeys[key] = {
        name,
        userId: generatedUserId,
        email: email || `${generatedUserId}@cloudx.local`,
        permissions: ['database:read', 'database:write', 'storage:read', 'storage:write'],
        created: new Date().toISOString(),
        lastUsed: null
    };

    saveKeys();

    res.json({
        key,
        userId: generatedUserId,
        name,
        permissions: apiKeys[key].permissions,
        message: 'Store this key securely - it will not be shown again'
    });
});

// List API Keys (without showing actual keys)
router.get('/keys', (req, res) => {
    const requestApiKey = req.headers['x-api-key'];

    if (!requestApiKey) {
        return res.status(401).json({ error: 'API key required' });
    }

    let requestUserId = 'admin';
    if (requestApiKey !== MASTER_KEY) {
        if (!apiKeys[requestApiKey]) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        requestUserId = apiKeys[requestApiKey].userId;
    }

    const keysList = Object.entries(apiKeys)
        .filter(([key, data]) => {
            // Admin sees all keys, users see only their own
            if (requestUserId === 'admin') return true;
            return data.userId === requestUserId;
        })
        .map(([key, data]) => ({
            keyPrefix: key.substring(0, 10) + '...',
            name: data.name,
            permissions: data.permissions,
            created: data.created,
            lastUsed: data.lastUsed
        }));

    res.json(keysList);
});

// Revoke API Key
router.delete('/keys/:keyPrefix', (req, res) => {
    const requestApiKey = req.headers['x-api-key'];

    if (!requestApiKey) {
        return res.status(401).json({ error: 'API key required' });
    }

    const prefix = req.params.keyPrefix;
    const fullKey = Object.keys(apiKeys).find(k => k.startsWith(prefix));

    if (!fullKey) {
        return res.status(404).json({ error: 'Key not found' });
    }

    // Check permission to delete
    if (requestApiKey !== MASTER_KEY) {
        if (!apiKeys[requestApiKey]) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        // Users can only delete their own keys
        if (apiKeys[fullKey].userId !== apiKeys[requestApiKey].userId) {
            return res.status(403).json({ error: 'Cannot delete other users\' keys' });
        }
    }

    delete apiKeys[fullKey];
    saveKeys();

    res.json({ message: 'API key revoked successfully' });
});

// Middleware to validate API key
function validateApiKey(requiredPermission) {
    return (req, res, next) => {
        const apiKey = req.headers['x-api-key'];

        if (!apiKey) {
            return res.status(401).json({ error: 'API key required. Include X-API-Key header.' });
        }

        if (apiKey === MASTER_KEY) {
            req.apiKey = apiKey;
            req.userId = 'admin';
            req.isAdmin = true;
            return next();
        }

        if (!apiKeys[apiKey]) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        const keyData = apiKeys[apiKey];

        // Check permission
        if (requiredPermission) {
            const hasPermission = keyData.permissions.includes(requiredPermission) ||
                keyData.permissions.includes('all');
            if (!hasPermission) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }
        }

        // Update last used
        keyData.lastUsed = new Date().toISOString();
        saveKeys();

        req.apiKey = apiKey;
        req.keyData = keyData;
        req.userId = keyData.userId;
        next();
    };
}

module.exports = router;
module.exports.router = router;
module.exports.validateApiKey = validateApiKey;

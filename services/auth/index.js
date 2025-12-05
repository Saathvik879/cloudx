const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');

const keysFile = path.join(__dirname, 'keys.json');

// Initialize keys file
let apiKeys = {};
if (fs.existsSync(keysFile)) {
    apiKeys = fs.readJsonSync(keysFile);
} else {
    fs.writeJsonSync(keysFile, apiKeys);
}

function saveKeys() {
    fs.writeJsonSync(keysFile, apiKeys, { spaces: 2 });
}

function generateApiKey() {
    return 'cx_' + crypto.randomBytes(32).toString('hex');
}

// Get user profile
router.get('/profile', (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const MASTER_KEY = 'cloudx-admin-2024-secure-key';

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
            name: apiKeys[apiKey].name,
            isAdmin: false
        });
    }

    res.status(401).json({ error: 'Invalid API key' });
});

// Create API Key
router.post('/keys', (req, res) => {
    const { name, userId, email } = req.body;
    const requestUserId = req.userId || userId; // Use authenticated user's ID

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    const key = generateApiKey();
    const generatedUserId = requestUserId || 'user_' + Date.now();

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
    const requestUserId = req.userId || 'admin'; // From middleware

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
    const prefix = req.params.keyPrefix;
    const fullKey = Object.keys(apiKeys).find(k => k.startsWith(prefix));

    if (!fullKey) {
        return res.status(404).json({ error: 'Key not found' });
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

        if (!apiKeys[apiKey]) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        const keyData = apiKeys[apiKey];

        // Check permission
        if (requiredPermission && !keyData.permissions.includes(requiredPermission)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Update last used
        keyData.lastUsed = new Date().toISOString();
        saveKeys();

        req.apiKey = apiKey;
        req.keyData = keyData;
        next();
    };
}

// Google Sign-In endpoint
router.post('/google-signin', async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: 'ID token required' });
    }

    try {
        // Note: In production, verify the token with Firebase Admin SDK
        // For now, we'll create a simple implementation

        // Extract user info from token (simplified - use firebase-admin in production)
        const userId = 'google_' + Date.now(); // Replace with actual Firebase UID
        const userEmail = 'user@example.com'; // Replace with actual email from token

        // Check if user already has an API key
        let existingKey = Object.keys(apiKeys).find(key =>
            apiKeys[key].userId === userId
        );

        if (existingKey) {
            return res.json({
                apiKey: existingKey,
                message: 'Welcome back!'
            });
        }

        // Create new API key for user
        const key = generateApiKey();
        apiKeys[key] = {
            name: `Google Account (${userEmail})`,
            userId: userId,
            email: userEmail,
            permissions: ['database:read', 'database:write', 'storage:read', 'storage:write'],
            created: new Date().toISOString(),
            lastUsed: null
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

module.exports = { router, validateApiKey };

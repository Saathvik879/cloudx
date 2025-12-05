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

// Helper to get current user's ID from API key
function getUserFromApiKey(apiKey) {
    if (apiKey === MASTER_KEY) {
        return { userId: 'admin', email: 'admin@cloudx.local', name: 'Administrator', isAdmin: true };
    }
    if (apiKeys[apiKey]) {
        return {
            userId: apiKeys[apiKey].userId,
            email: apiKeys[apiKey].email,
            name: apiKeys[apiKey].name,
            isAdmin: false
        };
    }
    return null;
}

// Get user profile
router.get('/profile', (req, res) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }

    const user = getUserFromApiKey(apiKey);
    if (!user) {
        return res.status(401).json({ error: 'Invalid API key' });
    }

    res.json({
        userId: user.userId,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        id: user.userId
    });
});

// Google Sign-In
router.post('/google-signin', async (req, res) => {
    const { idToken, email: userEmail, name: userName, uid } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: 'ID token required' });
    }

    try {
        // Use provided user info - in production, verify the token
        const userId = uid || 'google_' + crypto.randomBytes(8).toString('hex');
        const email = userEmail || 'user@gmail.com';
        const name = userName || 'Google User';

        // Check if user already has an API key by email (more reliable)
        let existingKey = Object.keys(apiKeys).find(k =>
            apiKeys[k].email === email
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
            permissions: ['all'],
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

// Create API Key - FIXED: Now properly scoped to authenticated user
router.post('/keys', (req, res) => {
    const { name } = req.body;
    const requestApiKey = req.headers['x-api-key'];

    if (!requestApiKey) {
        return res.status(401).json({ error: 'API key required' });
    }

    const requestUser = getUserFromApiKey(requestApiKey);
    if (!requestUser) {
        return res.status(401).json({ error: 'Invalid API key' });
    }

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    const key = generateApiKey();

    // Create key for the authenticated user (not a new user)
    apiKeys[key] = {
        name,
        userId: requestUser.userId,  // Use the authenticated user's ID
        email: requestUser.email,     // Use the authenticated user's email
        permissions: ['all'],
        created: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        lastUsed: null
    };

    saveKeys();

    res.json({
        key,
        userId: requestUser.userId,
        name,
        permissions: apiKeys[key].permissions,
        message: 'API key created. Store it securely - it will not be shown again.'
    });
});

// List API Keys - FIXED: Only show keys for authenticated user
router.get('/keys', (req, res) => {
    const requestApiKey = req.headers['x-api-key'];

    if (!requestApiKey) {
        return res.status(401).json({ error: 'API key required' });
    }

    const requestUser = getUserFromApiKey(requestApiKey);
    if (!requestUser) {
        return res.status(401).json({ error: 'Invalid API key' });
    }

    // Filter keys - admin sees all, users see only their own
    const keysList = Object.entries(apiKeys)
        .filter(([key, data]) => {
            if (requestUser.isAdmin) return true;
            return data.userId === requestUser.userId;
        })
        .map(([key, data]) => ({
            keyPrefix: key.substring(0, 10) + '...',
            name: data.name,
            permissions: data.permissions,
            created: data.created,
            createdAt: data.createdAt || data.created,
            lastUsed: data.lastUsed
        }));

    res.json(keysList);
});

// Revoke API Key - FIXED: Only allow revoking own keys
router.delete('/keys/:keyPrefix', (req, res) => {
    const requestApiKey = req.headers['x-api-key'];

    if (!requestApiKey) {
        return res.status(401).json({ error: 'API key required' });
    }

    const requestUser = getUserFromApiKey(requestApiKey);
    if (!requestUser) {
        return res.status(401).json({ error: 'Invalid API key' });
    }

    const prefix = req.params.keyPrefix.replace('...', '');
    const fullKey = Object.keys(apiKeys).find(k => k.startsWith(prefix));

    if (!fullKey) {
        return res.status(404).json({ error: 'Key not found' });
    }

    // Check permission to delete
    if (!requestUser.isAdmin) {
        if (apiKeys[fullKey].userId !== requestUser.userId) {
            return res.status(403).json({ error: 'Cannot delete other users\' keys' });
        }
    }

    // Don't allow deleting the key being used for authentication
    if (fullKey === requestApiKey) {
        return res.status(400).json({ error: 'Cannot delete the API key you are currently using' });
    }

    delete apiKeys[fullKey];
    saveKeys();

    res.json({ message: 'API key revoked successfully' });
});

module.exports = router;

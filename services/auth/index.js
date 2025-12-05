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

// Create API Key
router.post('/keys', (req, res) => {
    const { name, permissions } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    const key = generateApiKey();
    apiKeys[key] = {
        name,
        permissions: permissions || ['database:read', 'database:write', 'storage:read', 'storage:write'],
        created: new Date().toISOString(),
        lastUsed: null
    };

    saveKeys();

    res.json({
        key,
        name,
        permissions: apiKeys[key].permissions,
        message: 'Store this key securely - it will not be shown again'
    });
});

// List API Keys (without showing actual keys)
router.get('/keys', (req, res) => {
    const keysList = Object.entries(apiKeys).map(([key, data]) => ({
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

module.exports = { router, validateApiKey };

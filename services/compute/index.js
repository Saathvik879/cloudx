const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');

const deploymentsDir = path.join(__dirname, 'deployments');
const metadataFile = path.join(__dirname, 'metadata.json');
fs.ensureDirSync(deploymentsDir);

// Load metadata
let metadata = { services: {} };
if (fs.existsSync(metadataFile)) {
    metadata = fs.readJsonSync(metadataFile);
} else {
    fs.writeJsonSync(metadataFile, metadata);
}

function saveMetadata() {
    fs.writeJsonSync(metadataFile, metadata, { spaces: 2 });
}

// Deploy Service
router.post('/services', (req, res) => {
    const { name, source, runtime } = req.body;
    if (!name || !source || !runtime) {
        return res.status(400).json({ error: 'Missing required fields: name, source, runtime' });
    }

    // Simulate deployment: Create directory and record metadata
    const serviceDir = path.join(deploymentsDir, name);
    fs.ensureDirSync(serviceDir);

    // In a real scenario, we would copy files from 'source'. 
    // Since 'source' is a client-side path, the CLI should ideally upload it.
    // For this simulation, we'll assume the CLI handles the "upload" by just passing the path 
    // and we (the server) trust it or just record it. 
    // To make it slightly more realistic, we can write a "deployment.info" file.

    metadata.services[name] = {
        source,
        runtime,
        status: 'running', // Simulating immediate success
        deployedAt: new Date().toISOString(),
        url: `http://localhost:3000/api/v1/compute/${name}` // Simulated endpoint
    };
    saveMetadata();

    res.json({ name, ...metadata.services[name] });
});

// List Services
router.get('/services', (req, res) => {
    res.json(metadata.services);
});

// Get Service Status
router.get('/services/:name', (req, res) => {
    const name = req.params.name;
    if (!metadata.services[name]) {
        return res.status(404).json({ error: 'Service not found' });
    }
    res.json(metadata.services[name]);
});

module.exports = router;

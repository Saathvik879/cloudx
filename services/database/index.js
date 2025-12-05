const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const { requireAuth } = require('../auth/middleware');
const diskManager = require('../storage/disk-manager');

// Use HDD for database storage (can be mounted/ejected)
const dataDir = diskManager.getDatabasePath();
const metadataFile = path.join(dataDir, 'metadata.json');
fs.ensureDirSync(dataDir);

// Load metadata
let metadata = { databases: {} };
if (fs.existsSync(metadataFile)) {
  metadata = fs.readJsonSync(metadataFile);
} else {
  fs.writeJsonSync(metadataFile, metadata);
}

// Apply authentication to all database routes
router.use(requireAuth);

function saveMetadata() {
  fs.writeJsonSync(metadataFile, metadata, { spaces: 2 });
}

// Helper to get DB connection
const dbConnections = {};
function getDb(name) {
  if (!dbConnections[name]) {
    const dbPath = path.join(dataDir, `${name}.db`);
    dbConnections[name] = new sqlite3.Database(dbPath);
    // Initialize default table for simulation
    dbConnections[name].serialize(() => {
      dbConnections[name].run("CREATE TABLE IF NOT EXISTS data (id INTEGER PRIMARY KEY AUTOINCREMENT, collection TEXT, data TEXT)");
    });
  }
  return dbConnections[name];
}

// Create Database
router.post('/databases', (req, res) => {
  const { name, engine, size } = req.body;
  if (!name) return res.status(400).json({ error: 'Database name required' });

  if (metadata.databases[name]) {
    return res.status(409).json({ error: 'Database already exists' });
  }

  metadata.databases[name] = {
    engine: engine || 'sqlite',
    size: size || 'small',
    created: new Date().toISOString()
  };
  saveMetadata();

  // Initialize the DB file
  getDb(name);

  res.json({ name, ...metadata.databases[name], status: 'created' });
});

// List Databases
router.get('/databases', (req, res) => {
  res.json(metadata.databases);
});

// Create/Insert Data
router.post('/:dbname/:collection', (req, res) => {
  const dbName = req.params.dbname;
  if (!metadata.databases[dbName]) {
    return res.status(404).json({ error: 'Database not found' });
  }

  const collection = req.params.collection;
  const data = JSON.stringify(req.body);
  const db = getDb(dbName);

  const stmt = db.prepare("INSERT INTO data (collection, data) VALUES (?, ?)");
  stmt.run(collection, data, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, status: 'created' });
  });
  stmt.finalize();
});

// Read Data
router.get('/:dbname/:collection', (req, res) => {
  const dbName = req.params.dbname;
  if (!metadata.databases[dbName]) {
    return res.status(404).json({ error: 'Database not found' });
  }

  const collection = req.params.collection;
  const db = getDb(dbName);

  db.all("SELECT * FROM data WHERE collection = ?", [collection], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const results = rows.map(row => ({ id: row.id, data: JSON.parse(row.data) }));
    res.json(results);
  });
});

module.exports = router;

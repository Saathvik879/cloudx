const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');
const { requireAuth } = require('../auth/middleware');

// Database storage path
const DB_PATH = path.join(__dirname, '../../data/databases');
fs.ensureDirSync(DB_PATH);

// In-memory database connections
const dbs = {};

// Helper to get user DB path
function getUserDbPath(userId) {
  const userPath = path.join(DB_PATH, userId);
  fs.ensureDirSync(userPath);
  return userPath;
}

// List databases
router.get('/databases', requireAuth, (req, res) => {
  const userId = req.userId;
  const userPath = getUserDbPath(userId);

  const files = fs.readdirSync(userPath).filter(f => f.endsWith('.db'));
  const databases = {};

  files.forEach(f => {
    databases[f.replace('.db', '')] = {
      engine: 'sqlite',
      created: fs.statSync(path.join(userPath, f)).birthtime
    };
  });

  res.json(databases);
});

// Create database
router.post('/databases', requireAuth, (req, res) => {
  const { name } = req.body;
  const userId = req.userId;

  if (!name) return res.status(400).json({ error: 'Name required' });

  const userPath = getUserDbPath(userId);
  const dbFile = path.join(userPath, `${name}.db`);

  if (fs.existsSync(dbFile)) {
    return res.status(400).json({ error: 'Database exists' });
  }

  new sqlite3.Database(dbFile, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Database created' });
  });
});

// Execute SQL
router.post('/databases/:name/query', requireAuth, (req, res) => {
  const { name } = req.params;
  const { query } = req.body;
  const userId = req.userId;

  if (!query) return res.status(400).json({ error: 'Query required' });

  const userPath = getUserDbPath(userId);
  const dbFile = path.join(userPath, `${name}.db`);

  if (!fs.existsSync(dbFile)) {
    return res.status(404).json({ error: 'Database not found' });
  }

  const db = new sqlite3.Database(dbFile);

  db.all(query, [], (err, rows) => {
    db.close();
    if (err) return res.status(400).json({ error: err.message });
    res.json({ results: rows });
  });
});

module.exports = router;

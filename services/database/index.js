const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');
const { requireAuth } = require('../auth/middleware');

// Database storage path
const DB_PATH = path.join(__dirname, '../../data/databases');
fs.ensureDirSync(DB_PATH);

// Helper to get user DB path - CRITICAL for user isolation
function getUserDbPath(userId) {
  const userPath = path.join(DB_PATH, userId);
  fs.ensureDirSync(userPath);
  return userPath;
}

// List databases - FIXED: Only return user's own databases
router.get('/databases', requireAuth, (req, res) => {
  try {
    const userId = req.userId;
    const userPath = getUserDbPath(userId);

    const files = fs.readdirSync(userPath).filter(f => f.endsWith('.db'));
    const databases = {};

    files.forEach(f => {
      const dbName = f.replace('.db', '');
      const stats = fs.statSync(path.join(userPath, f));
      databases[dbName] = {
        engine: 'sqlite',
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    });

    res.json(databases);
  } catch (err) {
    console.error('Error listing databases:', err);
    res.status(500).json({ error: 'Failed to list databases' });
  }
});

// Create database - FIXED: No API key prompt needed, uses authenticated user
router.post('/databases', requireAuth, (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.userId;

    if (!name) {
      return res.status(400).json({ error: 'Database name is required' });
    }

    // Validate name (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      return res.status(400).json({ error: 'Database name can only contain letters, numbers, and underscores' });
    }

    const userPath = getUserDbPath(userId);
    const dbFile = path.join(userPath, `${name}.db`);

    if (fs.existsSync(dbFile)) {
      return res.status(400).json({ error: 'Database already exists' });
    }

    // Create database file
    const db = new sqlite3.Database(dbFile, (err) => {
      if (err) {
        console.error('Error creating database:', err);
        return res.status(500).json({ error: 'Failed to create database' });
      }

      db.close();
      res.json({
        message: 'Database created successfully',
        name: name,
        engine: 'sqlite'
      });
    });
  } catch (err) {
    console.error('Error creating database:', err);
    res.status(500).json({ error: 'Failed to create database' });
  }
});

// Execute SQL query - FIXED: Only access user's own databases
router.post('/databases/:name/query', requireAuth, (req, res) => {
  try {
    const { name } = req.params;
    const { query } = req.body;
    const userId = req.userId;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const userPath = getUserDbPath(userId);
    const dbFile = path.join(userPath, `${name}.db`);

    if (!fs.existsSync(dbFile)) {
      return res.status(404).json({ error: 'Database not found' });
    }

    const db = new sqlite3.Database(dbFile);
    const queryLower = query.trim().toLowerCase();

    // Determine if it's a SELECT query or a modification query
    if (queryLower.startsWith('select') || queryLower.startsWith('pragma')) {
      db.all(query, [], (err, rows) => {
        db.close();
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        res.json({
          results: rows,
          rowCount: rows.length
        });
      });
    } else {
      // INSERT, UPDATE, DELETE, CREATE, DROP, etc.
      db.run(query, [], function (err) {
        db.close();
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        res.json({
          message: 'Query executed successfully',
          changes: this.changes,
          lastID: this.lastID
        });
      });
    }
  } catch (err) {
    console.error('Error executing query:', err);
    res.status(500).json({ error: 'Failed to execute query' });
  }
});

// Get table list
router.get('/databases/:name/tables', requireAuth, (req, res) => {
  try {
    const { name } = req.params;
    const userId = req.userId;

    const userPath = getUserDbPath(userId);
    const dbFile = path.join(userPath, `${name}.db`);

    if (!fs.existsSync(dbFile)) {
      return res.status(404).json({ error: 'Database not found' });
    }

    const db = new sqlite3.Database(dbFile);

    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", [], (err, rows) => {
      db.close();
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        tables: rows.map(r => r.name)
      });
    });
  } catch (err) {
    console.error('Error getting tables:', err);
    res.status(500).json({ error: 'Failed to get tables' });
  }
});

// Delete database - FIXED: Only delete user's own databases
router.delete('/databases/:name', requireAuth, (req, res) => {
  try {
    const { name } = req.params;
    const userId = req.userId;

    const userPath = getUserDbPath(userId);
    const dbFile = path.join(userPath, `${name}.db`);

    if (!fs.existsSync(dbFile)) {
      return res.status(404).json({ error: 'Database not found' });
    }

    fs.removeSync(dbFile);
    res.json({ message: 'Database deleted successfully' });
  } catch (err) {
    console.error('Error deleting database:', err);
    res.status(500).json({ error: 'Failed to delete database' });
  }
});

module.exports = router;

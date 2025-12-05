const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const diskManager = require('./disk-manager');
const { requireAuth } = require('../auth/middleware');

// Use HDD storage path from disk manager
const storageDir = diskManager.getStoragePath();

// Ensure storage directory exists
fs.ensureDirSync(storageDir);

// In-memory bucket metadata (in production, use a database)
let buckets = {};

// Helper to get user-specific path
function getUserPath(userId) {
  const userDir = path.join(storageDir, userId);
  fs.ensureDirSync(userDir);
  return userDir;
}

// Helper to get bucket path
function getBucketPath(userId, bucketName) {
  return path.join(getUserPath(userId), bucketName);
}

// Get storage stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const diskInfo = require('node-disk-info');
    const disks = await diskInfo.getDiskInfo();

    // Find the disk where storage is located
    const storageDisk = disks.find(d => storageDir.startsWith(d.mounted)) || disks[0];

    res.json({
      total: storageDisk.blocks,
      used: storageDisk.used,
      available: storageDisk.available,
      capacity: storageDisk.capacity,
      mounted: storageDisk.mounted
    });
  } catch (err) {
    // Fallback if node-disk-info not available
    res.json({
      total: 1000000000000, // 1TB
      used: 100000000000,   // 100GB
      available: 900000000000,
      capacity: '10%',
      mounted: storageDir
    });
  }
});

// Create bucket
router.post('/buckets', requireAuth, (req, res) => {
  const { name, region } = req.body;
  const userId = req.userId;

  if (!name) {
    return res.status(400).json({ error: 'Bucket name is required' });
  }

  const bucketKey = `${userId}:${name}`;
  if (buckets[bucketKey]) {
    return res.status(400).json({ error: 'Bucket already exists' });
  }

  const bucketPath = getBucketPath(userId, name);
  fs.ensureDirSync(bucketPath);

  buckets[bucketKey] = {
    name,
    userId,
    region: region || 'us-east-1',
    created: new Date().toISOString(),
    path: bucketPath
  };

  res.json({ message: 'Bucket created successfully', bucket: { name, region: buckets[bucketKey].region } });
});

// List buckets
router.get('/buckets', requireAuth, (req, res) => {
  const userId = req.userId;
  const userBuckets = {};

  Object.keys(buckets).forEach(key => {
    if (key.startsWith(`${userId}:`)) {
      const bucketName = key.split(':')[1];
      userBuckets[bucketName] = {
        name: bucketName,
        region: buckets[key].region,
        created: buckets[key].created
      };
    }
  });

  res.json(userBuckets);
});

// Create folder
router.post('/buckets/:bucket/folders', requireAuth, (req, res) => {
  const { folderPath } = req.body;
  const bucketName = req.params.bucket;
  const userId = req.userId;
  const bucketKey = `${userId}:${bucketName}`;

  if (!buckets[bucketKey]) {
    return res.status(404).json({ error: 'Bucket not found' });
  }

  const fullPath = path.join(buckets[bucketKey].path, folderPath);
  fs.ensureDirSync(fullPath);

  res.json({ message: 'Folder created successfully' });
});

// Browse bucket
router.get('/buckets/:bucket/browse', requireAuth, (req, res) => {
  const bucketName = req.params.bucket;
  const folder = req.query.folder || '';
  const userId = req.userId;
  const bucketKey = `${userId}:${bucketName}`;

  if (!buckets[bucketKey]) {
    return res.status(404).json({ error: 'Bucket not found' });
  }

  const browsePath = path.join(buckets[bucketKey].path, folder);

  // Security check to prevent directory traversal
  if (!browsePath.startsWith(buckets[bucketKey].path)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(browsePath)) {
    return res.json({ items: [] });
  }

  const items = fs.readdirSync(browsePath).map(item => {
    const itemPath = path.join(browsePath, item);
    const stats = fs.statSync(itemPath);
    return {
      name: item,
      type: stats.isDirectory() ? 'folder' : 'file',
      size: stats.size,
      modified: stats.mtime
    };
  });

  res.json({ items });
});

// Configure upload
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const bucketName = req.params.bucket;
      const userId = req.userId;
      const bucketKey = `${userId}:${bucketName}`;

      if (!buckets[bucketKey]) {
        return cb(new Error('Bucket not found'));
      }

      const folder = req.body.folder || '';
      const uploadPath = path.join(buckets[bucketKey].path, folder);
      fs.ensureDirSync(uploadPath);
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    }
  })
});

// Upload file
router.post('/:bucket/upload', requireAuth, upload.single('file'), (req, res) => {
  res.json({ message: 'File uploaded successfully' });
});

// Download file
router.get('/:bucket/download/:filename', requireAuth, (req, res) => {
  const bucketName = req.params.bucket;
  const filename = req.params.filename;
  const folder = req.query.folder || '';
  const userId = req.userId;
  const bucketKey = `${userId}:${bucketName}`;

  if (!buckets[bucketKey]) {
    return res.status(404).json({ error: 'Bucket not found' });
  }

  const filePath = path.join(buckets[bucketKey].path, folder, filename);

  // Security check
  if (!filePath.startsWith(buckets[bucketKey].path)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath);
});

module.exports = router;

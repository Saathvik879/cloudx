const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { requireAuth } = require('../auth/middleware');

// Storage configuration
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, 'data');
fs.ensureDirSync(STORAGE_PATH);

// Bucket metadata file - stores per-user bucket info
const bucketsFile = path.join(STORAGE_PATH, 'buckets.json');
let allBuckets = {};

// Load existing buckets
if (fs.existsSync(bucketsFile)) {
  try {
    allBuckets = fs.readJsonSync(bucketsFile);
  } catch (err) {
    console.error('Error loading buckets:', err);
    allBuckets = {};
  }
}

function saveBuckets() {
  try {
    fs.writeJsonSync(bucketsFile, allBuckets, { spaces: 2 });
  } catch (err) {
    console.error('Error saving buckets:', err);
  }
}

// Helper to get user-specific storage path
function getUserStoragePath(userId) {
  const userDir = path.join(STORAGE_PATH, 'users', userId);
  fs.ensureDirSync(userDir);
  return userDir;
}

// Helper to get bucket path for a specific user
function getBucketPath(userId, bucketName) {
  return path.join(getUserStoragePath(userId), bucketName);
}

// Get storage stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    let stats = {
      total: 1000000000000, // 1TB default
      used: 0,
      available: 1000000000000,
      capacity: '0%'
    };

    try {
      const nodeDiskInfo = require('node-disk-info');
      const disks = nodeDiskInfo.getDiskInfoSync();

      if (disks && disks.length > 0) {
        const storageDrive = STORAGE_PATH.charAt(0).toUpperCase();
        const disk = disks.find(d => d.mounted && d.mounted.startsWith(storageDrive)) || disks[0];

        if (disk) {
          stats = {
            total: disk.blocks || disk.size || 1000000000000,
            used: disk.used || 0,
            available: disk.available || disk.blocks || 1000000000000,
            capacity: disk.capacity || '0%'
          };
        }
      }
    } catch (diskErr) {
      console.log('Disk info not available, using defaults');
    }

    res.json(stats);
  } catch (err) {
    console.error('Error getting storage stats:', err);
    res.status(500).json({ error: 'Failed to get storage stats' });
  }
});

// Create bucket - FIXED: Properly scoped to user
router.post('/buckets', requireAuth, (req, res) => {
  try {
    const { name, region } = req.body;
    const userId = req.userId;

    if (!name) {
      return res.status(400).json({ error: 'Bucket name is required' });
    }

    if (!/^[a-zA-Z0-9\-_]+$/.test(name)) {
      return res.status(400).json({ error: 'Bucket name can only contain letters, numbers, hyphens, and underscores' });
    }

    // Initialize user's bucket object if not exists
    if (!allBuckets[userId]) {
      allBuckets[userId] = {};
    }

    // Check if bucket already exists FOR THIS USER
    if (allBuckets[userId][name]) {
      return res.status(400).json({ error: 'Bucket already exists' });
    }

    const bucketPath = getBucketPath(userId, name);
    fs.ensureDirSync(bucketPath);

    allBuckets[userId][name] = {
      name,
      region: region || 'default',
      created: new Date().toISOString(),
      path: bucketPath
    };

    saveBuckets();

    res.json({
      message: 'Bucket created successfully',
      bucket: {
        name,
        region: allBuckets[userId][name].region,
        created: allBuckets[userId][name].created
      }
    });
  } catch (err) {
    console.error('Error creating bucket:', err);
    res.status(500).json({ error: 'Failed to create bucket' });
  }
});

// List buckets - FIXED: Only return user's own buckets
router.get('/buckets', requireAuth, (req, res) => {
  try {
    const userId = req.userId;

    // Return only the authenticated user's buckets
    const userBuckets = allBuckets[userId] || {};

    res.json(userBuckets);
  } catch (err) {
    console.error('Error listing buckets:', err);
    res.status(500).json({ error: 'Failed to list buckets' });
  }
});

// Delete bucket
router.delete('/buckets/:bucket', requireAuth, (req, res) => {
  try {
    const bucketName = req.params.bucket;
    const userId = req.userId;

    if (!allBuckets[userId] || !allBuckets[userId][bucketName]) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    // Remove bucket directory
    const bucketPath = getBucketPath(userId, bucketName);
    if (fs.existsSync(bucketPath)) {
      fs.removeSync(bucketPath);
    }

    delete allBuckets[userId][bucketName];
    saveBuckets();

    res.json({ message: 'Bucket deleted successfully' });
  } catch (err) {
    console.error('Error deleting bucket:', err);
    res.status(500).json({ error: 'Failed to delete bucket' });
  }
});

// Create folder
router.post('/buckets/:bucket/folders', requireAuth, (req, res) => {
  try {
    const { folderPath } = req.body;
    const bucketName = req.params.bucket;
    const userId = req.userId;

    if (!allBuckets[userId] || !allBuckets[userId][bucketName]) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path is required' });
    }

    const bucketPath = getBucketPath(userId, bucketName);
    const fullPath = path.join(bucketPath, folderPath);

    // Security: prevent directory traversal
    if (!fullPath.startsWith(bucketPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    fs.ensureDirSync(fullPath);

    res.json({ message: 'Folder created successfully', path: folderPath });
  } catch (err) {
    console.error('Error creating folder:', err);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Also support POST to /:bucket/folders for frontend compatibility
router.post('/:bucket/folders', requireAuth, (req, res) => {
  try {
    const { folderPath } = req.body;
    const bucketName = req.params.bucket;
    const userId = req.userId;

    if (!allBuckets[userId] || !allBuckets[userId][bucketName]) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path is required' });
    }

    const bucketPath = getBucketPath(userId, bucketName);
    const fullPath = path.join(bucketPath, folderPath);

    if (!fullPath.startsWith(bucketPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    fs.ensureDirSync(fullPath);

    res.json({ message: 'Folder created successfully', path: folderPath });
  } catch (err) {
    console.error('Error creating folder:', err);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Browse bucket contents - FIXED: Only access user's own buckets
router.get('/buckets/:bucket/browse', requireAuth, (req, res) => {
  try {
    const bucketName = req.params.bucket;
    const folder = req.query.folder || '';
    const userId = req.userId;

    if (!allBuckets[userId] || !allBuckets[userId][bucketName]) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    const bucketPath = getBucketPath(userId, bucketName);
    const browsePath = path.join(bucketPath, folder);

    // Security: prevent directory traversal
    if (!browsePath.startsWith(bucketPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(browsePath)) {
      return res.json({ items: [], folder: folder });
    }

    const items = fs.readdirSync(browsePath).map(item => {
      const itemPath = path.join(browsePath, item);
      try {
        const stats = fs.statSync(itemPath);
        return {
          name: item,
          type: stats.isDirectory() ? 'folder' : 'file',
          size: stats.isFile() ? stats.size : null,
          modified: stats.mtime
        };
      } catch (err) {
        return null;
      }
    }).filter(item => item !== null);

    res.json({ items, folder: folder, bucket: bucketName });
  } catch (err) {
    console.error('Error browsing bucket:', err);
    res.status(500).json({ error: 'Failed to browse bucket' });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const bucketName = req.params.bucket;
      const userId = req.userId;

      if (!allBuckets[userId] || !allBuckets[userId][bucketName]) {
        return cb(new Error('Bucket not found'));
      }

      const folder = req.body.folder || '';
      const bucketPath = getBucketPath(userId, bucketName);
      const uploadPath = path.join(bucketPath, folder);

      // Security check
      if (!uploadPath.startsWith(bucketPath)) {
        return cb(new Error('Access denied'));
      }

      fs.ensureDirSync(uploadPath);
      cb(null, uploadPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Upload file
router.post('/:bucket/upload', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      message: 'File uploaded successfully',
      filename: req.file.originalname,
      size: req.file.size
    });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Download file
router.get('/:bucket/download/:filename', requireAuth, (req, res) => {
  try {
    const bucketName = req.params.bucket;
    const filename = req.params.filename;
    const folder = req.query.folder || '';
    const userId = req.userId;

    if (!allBuckets[userId] || !allBuckets[userId][bucketName]) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    const bucketPath = getBucketPath(userId, bucketName);
    const filePath = path.join(bucketPath, folder, filename);

    // Security: prevent directory traversal
    if (!filePath.startsWith(bucketPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath);
  } catch (err) {
    console.error('Error downloading file:', err);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Delete file
router.delete('/:bucket/files/:filename', requireAuth, (req, res) => {
  try {
    const bucketName = req.params.bucket;
    const filename = req.params.filename;
    const folder = req.query.folder || '';
    const userId = req.userId;

    if (!allBuckets[userId] || !allBuckets[userId][bucketName]) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    const bucketPath = getBucketPath(userId, bucketName);
    const filePath = path.join(bucketPath, folder, filename);

    // Security: prevent directory traversal
    if (!filePath.startsWith(bucketPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.removeSync(filePath);
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// DEBUG: List all files in storage (Admin only)
router.get('/debug/tree', requireAuth, (req, res) => {
  try {
    if (!req.isAdmin) return res.status(403).json({ error: 'Admin only' });

    const tree = {};
    function readDir(dir, obj) {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          obj[item] = {};
          readDir(fullPath, obj[item]);
        } else {
          obj[item] = `${(stats.size / 1024).toFixed(2)} KB`;
        }
      });
    }

    readDir(STORAGE_PATH, tree);
    res.json({
      storagePath: STORAGE_PATH,
      tree
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

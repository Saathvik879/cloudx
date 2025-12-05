const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { requireAuth } = require('../auth/middleware');

// Storage configuration
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, 'data');
fs.ensureDirSync(STORAGE_PATH);

// In-memory bucket metadata
let buckets = {};
const bucketsFile = path.join(STORAGE_PATH, 'buckets.json');

// Load existing buckets
if (fs.existsSync(bucketsFile)) {
  try {
    buckets = fs.readJsonSync(bucketsFile);
  } catch (err) {
    console.error('Error loading buckets:', err);
    buckets = {};
  }
}

function saveBuckets() {
  try {
    fs.writeJsonSync(bucketsFile, buckets, { spaces: 2 });
  } catch (err) {
    console.error('Error saving buckets:', err);
  }
}

// Helper to get user-specific storage path
function getUserPath(userId) {
  const userDir = path.join(STORAGE_PATH, 'users', userId);
  fs.ensureDirSync(userDir);
  return userDir;
}

// Helper to get bucket path
function getBucketPath(userId, bucketName) {
  return path.join(getUserPath(userId), bucketName);
}

// Get bucket key
function getBucketKey(userId, bucketName) {
  return `${userId}:${bucketName}`;
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
        // Find the disk where storage is located, or use first disk
        const storageDrive = STORAGE_PATH.charAt(0).toUpperCase();
        const disk = disks.find(d => d.mounted && d.mounted.startsWith(storageDrive)) || disks[0];

        if (disk) {
          stats = {
            total: disk.blocks || disk.size || 1000000000000,
            used: disk.used || 0,
            available: disk.available || disk.blocks || 1000000000000,
            capacity: disk.capacity || '0%',
            mounted: disk.mounted || 'Unknown'
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

// Create bucket
router.post('/buckets', requireAuth, (req, res) => {
  try {
    const { name, region } = req.body;
    const userId = req.userId;

    if (!name) {
      return res.status(400).json({ error: 'Bucket name is required' });
    }

    // Validate bucket name
    if (!/^[a-zA-Z0-9\-_]+$/.test(name)) {
      return res.status(400).json({ error: 'Bucket name can only contain letters, numbers, hyphens, and underscores' });
    }

    const bucketKey = getBucketKey(userId, name);

    if (buckets[bucketKey]) {
      return res.status(400).json({ error: 'Bucket already exists' });
    }

    const bucketPath = getBucketPath(userId, name);
    fs.ensureDirSync(bucketPath);

    buckets[bucketKey] = {
      name,
      userId,
      region: region || 'default',
      created: new Date().toISOString(),
      path: bucketPath
    };

    saveBuckets();

    res.json({
      message: 'Bucket created successfully',
      bucket: {
        name,
        region: buckets[bucketKey].region,
        created: buckets[bucketKey].created
      }
    });
  } catch (err) {
    console.error('Error creating bucket:', err);
    res.status(500).json({ error: 'Failed to create bucket' });
  }
});

// List buckets
router.get('/buckets', requireAuth, (req, res) => {
  try {
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
    const bucketKey = getBucketKey(userId, bucketName);

    if (!buckets[bucketKey]) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    // Remove bucket directory
    if (fs.existsSync(buckets[bucketKey].path)) {
      fs.removeSync(buckets[bucketKey].path);
    }

    delete buckets[bucketKey];
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
    const bucketKey = getBucketKey(userId, bucketName);

    if (!buckets[bucketKey]) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path is required' });
    }

    const fullPath = path.join(buckets[bucketKey].path, folderPath);

    // Security: prevent directory traversal
    if (!fullPath.startsWith(buckets[bucketKey].path)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    fs.ensureDirSync(fullPath);

    res.json({ message: 'Folder created successfully', path: folderPath });
  } catch (err) {
    console.error('Error creating folder:', err);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Browse bucket contents
router.get('/buckets/:bucket/browse', requireAuth, (req, res) => {
  try {
    const bucketName = req.params.bucket;
    const folder = req.query.folder || '';
    const userId = req.userId;
    const bucketKey = getBucketKey(userId, bucketName);

    if (!buckets[bucketKey]) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    const browsePath = path.join(buckets[bucketKey].path, folder);

    // Security: prevent directory traversal
    if (!browsePath.startsWith(buckets[bucketKey].path)) {
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
      const bucketKey = getBucketKey(userId, bucketName);

      if (!buckets[bucketKey]) {
        return cb(new Error('Bucket not found'));
      }

      const folder = req.body.folder || '';
      const uploadPath = path.join(buckets[bucketKey].path, folder);

      // Security check
      if (!uploadPath.startsWith(buckets[bucketKey].path)) {
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
    const bucketKey = getBucketKey(userId, bucketName);

    if (!buckets[bucketKey]) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    const filePath = path.join(buckets[bucketKey].path, folder, filename);

    // Security: prevent directory traversal
    if (!filePath.startsWith(buckets[bucketKey].path)) {
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

// Delete file or folder
router.delete('/:bucket/items', requireAuth, (req, res) => {
  try {
    const bucketName = req.params.bucket;
    const { path: itemPath } = req.body;
    const userId = req.userId;
    const bucketKey = getBucketKey(userId, bucketName);

    if (!buckets[bucketKey]) {
      return res.status(404).json({ error: 'Bucket not found' });
    }

    if (!itemPath) {
      return res.status(400).json({ error: 'Item path is required' });
    }

    const fullPath = path.join(buckets[bucketKey].path, itemPath);

    // Security: prevent directory traversal
    if (!fullPath.startsWith(buckets[bucketKey].path)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Item not found' });
    }

    fs.removeSync(fullPath);
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;

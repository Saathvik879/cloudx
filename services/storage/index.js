const fs = require('fs-extra');
const path = require('path');
const express = require('express');
const multer = require('multer');
const router = express.Router();
const { requireAuth } = require('../auth/middleware');
const diskManager = require('./disk-manager');

// Use HDD for storage (can be mounted/ejected)
const storageDir = diskManager.getStoragePath();
const metadataFile = path.join(storageDir, 'metadata.json');
fs.ensureDirSync(storageDir);

// Load metadata
let metadata = { buckets: {} };
if (fs.existsSync(metadataFile)) {
  metadata = fs.readJsonSync(metadataFile);
} else {
  fs.writeJsonSync(metadataFile, metadata);
}

function saveMetadata() {
  fs.writeJsonSync(metadataFile, metadata, { spaces: 2 });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const bucket = req.params.bucket;
    if (!metadata.buckets[bucket]) {
      return cb(new Error('Bucket does not exist'));
    }
    const bucketPath = path.join(storageDir, bucket);
    cb(null, bucketPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Create Bucket
router.post('/buckets', (req, res) => {
  const { name, region } = req.body;
  if (!name) return res.status(400).json({ error: 'Bucket name required' });

  if (metadata.buckets[name]) {
    return res.status(409).json({ error: 'Bucket already exists' });
  }

  const bucketPath = path.join(storageDir, name);
  fs.ensureDirSync(bucketPath);

  metadata.buckets[name] = {
    region: region || 'default',
    created: new Date().toISOString()
  };
  saveMetadata();

  res.json({ name, region: metadata.buckets[name].region, status: 'created' });
});

// List Buckets
router.get('/buckets', (req, res) => {
  res.json(metadata.buckets);
});

// Upload with folder support
router.post('/:bucket/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { folder = '' } = req.body;
  const bucket = req.params.bucket;

  if (!metadata.buckets[bucket]) {
    return res.status(404).json({ error: 'Bucket not found' });
  }

  // If folder specified, move file to that folder
  if (folder) {
    const bucketPath = metadata.buckets[bucket].storagePath || path.join(storageDir, bucket);
    const folderPath = path.join(bucketPath, folder);
    fs.ensureDirSync(folderPath);

    const oldPath = req.file.path;
    const newPath = path.join(folderPath, req.file.filename);
    fs.moveSync(oldPath, newPath);
  }

  res.json({
    filename: req.file.filename,
    bucket,
    folder: folder || '/',
    status: 'uploaded'
  });
});

// Download
router.get('/:bucket/:filename', (req, res) => {
  const bucket = req.params.bucket;
  if (!metadata.buckets[bucket]) {
    return res.status(404).json({ error: 'Bucket not found' });
  }
  const filename = req.params.filename;
  const filePath = path.join(storageDir, bucket, filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Folder Management
router.post('/buckets/:bucket/folders', (req, res) => {
  const { bucket } = req.params;
  const { folderPath } = req.body;

  if (!metadata.buckets[bucket]) {
    return res.status(404).json({ error: 'Bucket not found' });
  }

  if (!folderPath) {
    return res.status(400).json({ error: 'Folder path required' });
  }

  const bucketPath = metadata.buckets[bucket].storagePath || path.join(storageDir, bucket);
  const fullFolderPath = path.join(bucketPath, folderPath);

  try {
    fs.ensureDirSync(fullFolderPath);
    res.json({ message: 'Folder created', path: folderPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List files and folders in a bucket/folder
router.get('/buckets/:bucket/browse', (req, res) => {
  const { bucket } = req.params;
  const { folder = '' } = req.query;

  if (!metadata.buckets[bucket]) {
    return res.status(404).json({ error: 'Bucket not found' });
  }

  const bucketPath = metadata.buckets[bucket].storagePath || path.join(storageDir, bucket);
  const browsePath = path.join(bucketPath, folder);

  if (!fs.existsSync(browsePath)) {
    return res.status(404).json({ error: 'Path not found' });
  }

  try {
    const items = fs.readdirSync(browsePath).map(item => {
      const itemPath = path.join(browsePath, item);
      const stats = fs.statSync(itemPath);

      return {
        name: item,
        type: stats.isDirectory() ? 'folder' : 'file',
        size: stats.isFile() ? stats.size : null,
        modified: stats.mtime
      };
    });

    res.json({ bucket, folder, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete file or folder
router.delete('/buckets/:bucket/items', (req, res) => {
  const { bucket } = req.params;
  const { path: itemPath } = req.body;

  if (!metadata.buckets[bucket]) {
    return res.status(404).json({ error: 'Bucket not found' });
  }

  if (!itemPath) {
    return res.status(400).json({ error: 'Path required' });
  }

  const bucketPath = metadata.buckets[bucket].storagePath || path.join(storageDir, bucket);
  const fullPath = path.join(bucketPath, itemPath);

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Item not found' });
  }

  try {
    fs.removeSync(fullPath);
    res.json({ message: 'Item deleted', path: itemPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rename file or folder
router.put('/buckets/:bucket/rename', (req, res) => {
  const { bucket } = req.params;
  const { oldPath, newPath } = req.body;

  if (!metadata.buckets[bucket]) {
    return res.status(404).json({ error: 'Bucket not found' });
  }

  if (!oldPath || !newPath) {
    return res.status(400).json({ error: 'oldPath and newPath required' });
  }

  const bucketPath = metadata.buckets[bucket].storagePath || path.join(storageDir, bucket);
  const fullOldPath = path.join(bucketPath, oldPath);
  const fullNewPath = path.join(bucketPath, newPath);

  if (!fs.existsSync(fullOldPath)) {
    return res.status(404).json({ error: 'Item not found' });
  }

  if (fs.existsSync(fullNewPath)) {
    return res.status(409).json({ error: 'Item with new name already exists' });
  }

  try {
    fs.moveSync(fullOldPath, fullNewPath);
    res.json({ message: 'Item renamed', oldPath, newPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// HDD Management Endpoints

// Get available disks
router.get('/admin/disks', (req, res) => {
  try {
    const disks = diskManager.getAvailableDisks();
    const pool = diskManager.getStoragePool();
    res.json({ availableDisks: disks, storagePool: pool });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add disk to storage pool
router.post('/admin/disks', (req, res) => {
  const { mountPath } = req.body;
  if (!mountPath) {
    return res.status(400).json({ error: 'mountPath required' });
  }

  try {
    const storagePath = diskManager.addDriveToPool(mountPath);
    res.json({ message: 'Drive added to storage pool', storagePath });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Remove disk from storage pool
router.delete('/admin/disks/:mountPath', (req, res) => {
  const mountPath = decodeURIComponent(req.params.mountPath);

  try {
    diskManager.removeDriveFromPool(mountPath);
    res.json({ message: 'Drive removed from storage pool' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

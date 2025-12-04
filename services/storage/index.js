const fs = require('fs-extra');
const path = require('path');
const express = require('express');
const multer = require('multer');
const router = express.Router();

const storageDir = path.join(__dirname, 'data');
const metadataFile = path.join(__dirname, 'metadata.json');
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

// Upload
router.post('/:bucket', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ filename: req.file.filename, bucket: req.params.bucket, status: 'uploaded' });
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

module.exports = router;

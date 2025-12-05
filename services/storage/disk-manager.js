const nodeDiskInfo = require('node-disk-info');
const fs = require('fs-extra');
const path = require('path');

const configFile = path.join(__dirname, 'storage-config.json');

// Load storage configuration
let storageConfig = { selectedDrives: [], storagePool: [] };
if (fs.existsSync(configFile)) {
    storageConfig = fs.readJsonSync(configFile);
}

function saveConfig() {
    fs.writeJsonSync(configFile, storageConfig, { spaces: 2 });
}

// Get all available disks
function getAvailableDisks() {
    try {
        const disks = nodeDiskInfo.getDiskInfo();
        return disks.map(disk => ({
            mounted: disk.mounted,
            filesystem: disk.filesystem,
            blocks: disk.blocks,
            used: disk.used,
            available: disk.available,
            capacity: disk.capacity,
            label: disk._label || 'Unnamed'
        }));
    } catch (error) {
        console.error('Error getting disk info:', error);
        return [];
    }
}

// Add drive to storage pool
function addDriveToPool(mountPath) {
    if (!fs.existsSync(mountPath)) {
        throw new Error('Drive path does not exist');
    }

    if (storageConfig.selectedDrives.includes(mountPath)) {
        throw new Error('Drive already in storage pool');
    }

    // Create cloudx storage directory on the drive
    const storagePath = path.join(mountPath, 'cloudx-storage');
    fs.ensureDirSync(storagePath);

    storageConfig.selectedDrives.push(mountPath);
    storageConfig.storagePool.push({
        mountPath,
        storagePath,
        addedAt: new Date().toISOString()
    });

    saveConfig();
    return storagePath;
}

// Remove drive from storage pool
function removeDriveFromPool(mountPath) {
    const index = storageConfig.selectedDrives.indexOf(mountPath);
    if (index === -1) {
        throw new Error('Drive not in storage pool');
    }

    storageConfig.selectedDrives.splice(index, 1);
    storageConfig.storagePool = storageConfig.storagePool.filter(d => d.mountPath !== mountPath);

    saveConfig();
}

// Get next available drive for storage (round-robin)
function getNextDrive() {
    if (storageConfig.storagePool.length === 0) {
        throw new Error('No drives in storage pool');
    }

    // Simple round-robin: use the first drive for now
    // Can be enhanced with load balancing based on available space
    return storageConfig.storagePool[0].storagePath;
}

// Get storage path for a bucket
function getStoragePathForBucket(bucketName) {
    if (storageConfig.storagePool.length === 0) {
        // Fallback to local storage if no drives configured
        return path.join(__dirname, 'data', bucketName);
    }

    const drivePath = getNextDrive();
    return path.join(drivePath, 'buckets', bucketName);
}

module.exports = {
    getAvailableDisks,
    addDriveToPool,
    removeDriveFromPool,
    getStoragePathForBucket,
    getStoragePool: () => storageConfig.storagePool
};

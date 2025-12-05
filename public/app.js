const API_URL = 'https://cloudx-api.onrender.com';

// Master key for admin access (must match backend)
const MASTER_KEY = 'cloudx-admin-2024-secure-key';

// Authentication state
let isAuthenticated = false;
let userType = null; // 'admin' or 'user'
let currentApiKey = null;

// Login Modal Functions
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

function loginWithMasterKey() {
    const inputKey = document.getElementById('masterKeyInput').value;

    if (inputKey === MASTER_KEY) {
        isAuthenticated = true;
        userType = 'admin';
        currentApiKey = MASTER_KEY;
        localStorage.setItem('cloudx_auth', JSON.stringify({ type: 'admin', key: MASTER_KEY }));
        closeLoginModal();
        showMessage('✅ Admin access granted!', 'success');
        loadBuckets();
        loadDatabases();
        loadApiKeys();
    } else {
        showMessage('❌ Invalid master key!', 'error');
    }
}

function loginWithGoogle() {
    // Redirect to Google OAuth page
    window.location.href = '/login.html';
}

// Check authentication on load
window.addEventListener('load', () => {
    const auth = localStorage.getItem('cloudx_auth');
    if (auth) {
        const authData = JSON.parse(auth);
        isAuthenticated = true;
        userType = authData.type;
        document.getElementById('fileList').innerHTML = `
            <div class="empty-file-state">
                <div class="icon">📁</div>
                <h3>Select a bucket to get started</h3>
                <p>Choose a bucket from the dropdown above</p>
            </div>
        `;
        return;
    }

    currentBucket = bucket;

    try {
        const res = await fetch(`${API_URL}/api/v1/storage/buckets/${bucket}/browse?folder=${currentFolder}`);
        const data = await res.json();

        updateBreadcrumb();
        displayFiles(data.items);
    } catch (err) {
        showMessage('Error loading files: ' + err.message, 'error');
    }
}

// Update breadcrumb navigation
function updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        const parts = currentFolder.split('/').filter(p => p);

        let html = `<a href="#" onclick="navigateToFolder(''); return false;">📁 ${currentBucket}</a>`;
        let path = '';

        parts.forEach(part => {
            path += (path ? '/' : '') + part;
            html += ` / <a href="#" onclick="navigateToFolder('${path}'); return false;">${part}</a>`;
        });

        breadcrumb.innerHTML = html;
    }

// Navigate to folder
function navigateToFolder(folder) {
        currentFolder = folder;
        loadFiles();
    }

// Display files in grid
function displayFiles(items) {
        const list = document.getElementById('fileList');

        if (!items || items.length === 0) {
            list.innerHTML = `
            <div class="empty-file-state">
                <div class="icon">📂</div>
                <h3>This folder is empty</h3>
                <p>Upload files or create folders to get started</p>
            </div>
        `;
            return;
        }

        list.innerHTML = items.map(item => {
            const icon = getFileIcon(item);
            const size = item.size ? formatBytes(item.size) : '';
            const itemPath = currentFolder ? `${currentFolder}/${item.name}` : item.name;

            return `
            <div class="file-item" 
                 onclick="handleItemClick('${item.name}', '${item.type}')"
                 oncontextmenu="showContextMenu(event, '${itemPath}', '${item.type}'); return false;">
                <div class="file-icon">${icon}</div>
                <div class="file-name">${item.name}</div>
                <div class="file-meta">${size}</div>
            </div>
        `;
        }).join('');
    }

// Get icon for file type
function getFileIcon(item) {
        if (item.type === 'folder') return '📁';

        const ext = item.name.split('.').pop().toLowerCase();
        const icons = {
            'pdf': '📄',
            'doc': '📝', 'docx': '📝',
            'xls': '📊', 'xlsx': '📊',
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
            'mp4': '🎥', 'avi': '🎥', 'mov': '🎥',
            'mp3': '🎵', 'wav': '🎵',
            'zip': '📦', 'rar': '📦',
            'txt': '📃'
        };

        return icons[ext] || '📄';
    }

// Format bytes
function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

// Handle item click
function handleItemClick(name, type) {
        if (type === 'folder') {
            navigateToFolder(currentFolder ? `${currentFolder}/${name}` : name);
        }
    }

// Show context menu
function showContextMenu(event, path, type) {
        event.preventDefault();
        selectedItem = { path, type };

        const menu = document.getElementById('contextMenu');
        menu.style.display = 'block';
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';
    }

// Create bucket dialog
async function showCreateBucketDialog() {
        const name = prompt('Enter bucket name:');
        if (!name) return;

        const region = prompt('Enter region (optional):', 'us-east-1');

        try {
            const res = await fetch(`${API_URL}/api/v1/storage/buckets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, region })
            });

            if (res.ok) {
                showMessage(`Bucket '${name}' created!`);
                loadBuckets();
            } else {
                const data = await res.json();
                showMessage(data.error || 'Failed to create bucket', 'error');
            }
        } catch (err) {
            showMessage('Error: ' + err.message, 'error');
        }
    }

// Create folder dialog
async function showCreateFolderDialog() {
        if (!currentBucket) {
            showMessage('Please select a bucket first', 'error');
            return;
        }

        const folderName = prompt('Enter folder name:');
        if (!folderName) return;

        const folderPath = currentFolder ? `${currentFolder}/${folderName}` : folderName;

        try {
            const res = await fetch(`${API_URL}/api/v1/storage/buckets/${currentBucket}/folders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderPath })
            });

            if (res.ok) {
                showMessage(`Folder '${folderName}' created!`);
                loadFiles();
            } else {
                const data = await res.json();
                showMessage(data.error || 'Failed to create folder', 'error');
            }
        } catch (err) {
            showMessage('Error: ' + err.message, 'error');
        }
    }

// Upload file
async function uploadFile() {
        if (!currentBucket) {
            showMessage('Please select a bucket first', 'error');
            return;
        }

        const fileInput = document.getElementById('fileInput');
        const files = fileInput.files;

        if (files.length === 0) return;

        for (let file of files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', currentFolder);

            try {
                const res = await fetch(`${API_URL}/api/v1/storage/${currentBucket}/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (res.ok) {
                    showMessage(`File '${file.name}' uploaded!`);
                } else {
                    const data = await res.json();
                    showMessage(data.error || 'Upload failed', 'error');
                }
            } catch (err) {
                showMessage('Error: ' + err.message, 'error');
            }
        }

        fileInput.value = '';
        loadFiles();
    }

// Download item
function downloadItem() {
        if (!selectedItem) return;

        const url = `${API_URL}/api/v1/storage/${currentBucket}/${selectedItem.path}`;
        window.open(url, '_blank');

        document.getElementById('contextMenu').style.display = 'none';
    }

// Rename item
async function renameItem() {
        if (!selectedItem) return;

        const oldName = selectedItem.path.split('/').pop();
        const newName = prompt('Enter new name:', oldName);

        if (!newName || newName === oldName) {
            document.getElementById('contextMenu').style.display = 'none';
            return;
        }

        const pathParts = selectedItem.path.split('/');
        pathParts[pathParts.length - 1] = newName;
        const newPath = pathParts.join('/');

        try {
            const res = await fetch(`${API_URL}/api/v1/storage/buckets/${currentBucket}/rename`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPath: selectedItem.path, newPath })
            });

            if (res.ok) {
                showMessage('Item renamed successfully!');
                loadFiles();
            } else {
                const data = await res.json();
                showMessage(data.error || 'Failed to rename', 'error');
            }
        } catch (err) {
            showMessage('Error: ' + err.message, 'error');
        }

        document.getElementById('contextMenu').style.display = 'none';
    }

// Delete item
async function deleteItem() {
        if (!selectedItem) return;

        if (!confirm(`Are you sure you want to delete "${selectedItem.path}"?`)) {
            document.getElementById('contextMenu').style.display = 'none';
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/v1/storage/buckets/${currentBucket}/items`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: selectedItem.path })
            });

            if (res.ok) {
                showMessage('Item deleted successfully!');
                loadFiles();
            } else {
                const data = await res.json();
                showMessage(data.error || 'Failed to delete', 'error');
            }
        } catch (err) {
            showMessage('Error: ' + err.message, 'error');
        }

        document.getElementById('contextMenu').style.display = 'none';
    }

// --- Database Functions ---

async function createDatabase() {
        const name = document.getElementById('dbName').value;
        const engine = document.getElementById('dbEngine').value;
        const size = document.getElementById('dbSize').value;

        if (!name) {
            showMessage('Please enter a database name', 'error');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/v1/database/databases`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, engine: engine || 'sqlite', size })
            });

            const data = await res.json();
            if (res.ok) {
                showMessage(`Database '${name}' created successfully!`);
                document.getElementById('dbName').value = '';
                document.getElementById('dbEngine').value = '';
                loadDatabases();
            } else {
                showMessage(data.error || 'Failed to create database', 'error');
            }
        } catch (err) {
            showMessage('Error: ' + err.message, 'error');
        }
    }

async function loadDatabases() {
        try {
            const res = await fetch(`${API_URL}/api/v1/database/databases`);
            const databases = await res.json();

            const list = document.getElementById('databasesList');
            if (Object.keys(databases).length === 0) {
                list.innerHTML = '<div class="empty-state">No databases yet. Create one above!</div>';
                return;
            }

            list.innerHTML = Object.entries(databases).map(([name, info]) => `
            <div class="list-item">
                <h3>🗄️ ${name}</h3>
                <p>Engine: ${info.engine} | Size: ${info.size} | Created: ${new Date(info.created).toLocaleString()}</p>
            </div>
        `).join('');
        } catch (err) {
            showMessage('Error loading databases: ' + err.message, 'error');
        }
    }

// --- API Key Functions ---

async function generateApiKey() {
        const name = document.getElementById('keyName').value;

        if (!name) {
            showMessage('Please enter a key name', 'error');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/v1/auth/keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });

            const data = await res.json();
            if (res.ok) {
                document.getElementById('newKeyValue').textContent = data.key;
                document.getElementById('newKeyDisplay').style.display = 'block';
                document.getElementById('keyName').value = '';
                showMessage(`API key '${name}' generated successfully!`);
                loadApiKeys();
            } else {
                showMessage(data.error || 'Failed to generate API key', 'error');
            }
        } catch (err) {
            showMessage('Error: ' + err.message, 'error');
        }
    }

async function loadApiKeys() {
        try {
            const res = await fetch(`${API_URL}/api/v1/auth/keys`);
            const keys = await res.json();

            const list = document.getElementById('keysList');
            if (keys.length === 0) {
                list.innerHTML = '<div class="empty-state">No API keys yet. Generate one above!</div>';
                return;
            }

            list.innerHTML = keys.map(key => `
            <div class="list-item">
                <h3>🔑 ${key.name}</h3>
                <p>Key: ${key.keyPrefix} | Created: ${new Date(key.created).toLocaleString()}</p>
                <p style="font-size: 0.85rem; color: #666;">Last used: ${key.lastUsed ? new Date(key.lastUsed).toLocaleString() : 'Never'}</p>
            </div>
        `).join('');
        } catch (err) {
            showMessage('Error loading API keys: ' + err.message, 'error');
        }
    }

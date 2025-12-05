const API_URL = window.location.origin;

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

function showMessage(text, type = 'success') {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.className = `message show ${type}`;
    setTimeout(() => msg.classList.remove('show'), 3000);
}

// Storage Functions
async function createBucket() {
    const name = document.getElementById('bucketName').value;
    const region = document.getElementById('bucketRegion').value;

    if (!name) {
        showMessage('Please enter a bucket name', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/v1/storage/buckets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, region: region || 'default' })
        });

        const data = await res.json();
        if (res.ok) {
            showMessage(`Bucket '${name}' created successfully!`);
            document.getElementById('bucketName').value = '';
            document.getElementById('bucketRegion').value = '';
            loadBuckets();
        } else {
            showMessage(data.error || 'Failed to create bucket', 'error');
        }
    } catch (err) {
        showMessage('Error: ' + err.message, 'error');
    }
}

async function loadBuckets() {
    try {
        const res = await fetch(`${API_URL}/api/v1/storage/buckets`);
        const buckets = await res.json();

        const list = document.getElementById('bucketsList');
        if (Object.keys(buckets).length === 0) {
            list.innerHTML = '<div class="empty-state">No buckets yet. Create one above!</div>';
            return;
        }

        list.innerHTML = Object.entries(buckets).map(([name, info]) => `
            <div class="list-item">
                <h3>🪣 ${name}</h3>
                <p>Region: ${info.region} | Created: ${new Date(info.created).toLocaleString()}</p>
            </div>
        `).join('');
    } catch (err) {
        showMessage('Error loading buckets: ' + err.message, 'error');
    }
}

// Database Functions
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

// Compute Functions
async function deployService() {
    const name = document.getElementById('serviceName').value;
    const source = document.getElementById('serviceSource').value;
    const runtime = document.getElementById('serviceRuntime').value;

    if (!name || !source || !runtime) {
        showMessage('Please fill all fields', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/v1/compute/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, source, runtime })
        });

        const data = await res.json();
        if (res.ok) {
            showMessage(`Service '${name}' deployed successfully!`);
            document.getElementById('serviceName').value = '';
            document.getElementById('serviceSource').value = '';
            document.getElementById('serviceRuntime').value = '';
            loadServices();
        } else {
            showMessage(data.error || 'Failed to deploy service', 'error');
        }
    } catch (err) {
        showMessage('Error: ' + err.message, 'error');
    }
}

async function loadServices() {
    try {
        const res = await fetch(`${API_URL}/api/v1/compute/services`);
        const services = await res.json();

        const list = document.getElementById('servicesList');
        if (Object.keys(services).length === 0) {
            list.innerHTML = '<div class="empty-state">No services yet. Deploy one above!</div>';
            return;
        }

        list.innerHTML = Object.entries(services).map(([name, info]) => `
            <div class="list-item">
                <h3>⚙️ ${name}</h3>
                <p>Runtime: ${info.runtime} | Status: ${info.status} | URL: ${info.url}</p>
                <p style="font-size: 0.8rem; color: #999;">Deployed: ${new Date(info.deployedAt).toLocaleString()}</p>
            </div>
        `).join('');
    } catch (err) {
        showMessage('Error loading services: ' + err.message, 'error');
    }
}

// Load data on page load
window.addEventListener('load', () => {
    loadBuckets();
    loadDatabases();
    loadServices();
});

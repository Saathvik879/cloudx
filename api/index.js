const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const databaseService = require('../services/database');
const storageService = require('../services/storage');
const { router: authService, validateApiKey } = require('../services/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Serve static files (web dashboard)
app.use(express.static('public'));

// Mount auth service (no auth required for key management - will add admin auth later)
app.use('/api/v1/auth', authService);

// Mount services with API key protection
app.use('/api/v1/database', validateApiKey('database:read'), databaseService);
app.use('/api/v1/storage', storageService); // Storage has mixed permissions

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/../public/index.html');
});

app.listen(PORT, () => {
    console.log(`CloudX running on port ${PORT}`);
});

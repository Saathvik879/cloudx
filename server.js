const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Mount services
app.use('/api/v1/auth', require('./services/auth'));
app.use('/api/v1/storage', require('./services/storage'));
app.use('/api/v1/database', require('./services/database'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'CloudX API' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 CloudX API running on port ${PORT}`);
});

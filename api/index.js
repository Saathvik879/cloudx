const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const databaseService = require('../services/database');
const storageService = require('../services/storage');
const computeService = require('../services/compute');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Serve static files (web dashboard)
app.use(express.static('public'));

// Mount services
app.use('/api/v1/database', databaseService);
app.use('/api/v1/storage', storageService);
app.use('/api/v1/compute', computeService);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/../public/index.html');
});

app.listen(PORT, () => {
    console.log(`CloudX running on port ${PORT}`);
});

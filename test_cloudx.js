const { spawn } = require('child_process');
const http = require('http');

console.log('Starting CloudX Server...');
const server = spawn('node', ['api/index.js'], {
    stdio: 'inherit',
    cwd: __dirname,
    shell: true
});

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

// Wait for server to start
setTimeout(async () => {
    try {
        console.log('\n--- Testing API Root ---');
        const rootRes = await request({
            hostname: 'localhost',
            port: 3000,
            path: '/',
            method: 'GET'
        });
        console.log('Root Response:', rootRes);

        console.log('\n--- Testing Database Service ---');
        const dbRes = await request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/v1/database/test_collection',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, JSON.stringify({ message: 'Hello CloudX' }));
        console.log('DB Insert Response:', dbRes);

        const dbGet = await request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/v1/database/test_collection',
            method: 'GET'
        });
        console.log('DB Query Response:', dbGet);

        console.log('\nTests Completed.');
    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        console.log('Stopping server...');
        // On Windows, killing the shell might not kill the node process if not careful, 
        // but for this test it should be okay or require taskkill.
        // Using tree-kill logic or just spawn with shell:false is better but I used shell:true.
        // I'll try standard kill.
        server.kill();
        process.exit(0);
    }
}, 5000);

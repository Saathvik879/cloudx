#!/usr/bin/env node
const http = require('http');

const args = process.argv.slice(2);
const command = args[0];
const resource = args[1];

if (command === 'create' && resource === 'storage') {
    const bucketIndex = args.indexOf('--bucket');
    const regionIndex = args.indexOf('--region');

    if (bucketIndex === -1) {
        console.error('Error: --bucket argument is required');
        process.exit(1);
    }

    const bucket = args[bucketIndex + 1];
    const region = regionIndex !== -1 ? args[regionIndex + 1] : 'default';

    const data = JSON.stringify({ name: bucket, region });

    const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/storage/buckets',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log(`Storage bucket '${bucket}' created in region '${region}'.`);
            } else {
                console.error(`Failed to create bucket: ${body}`);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
        console.error('Make sure the CloudX server is running (npm start).');
    });

    req.write(data);
    req.end();

} else if (command === 'create' && resource === 'database') {
    const nameIndex = args.indexOf('--name');
    const engineIndex = args.indexOf('--engine');
    const sizeIndex = args.indexOf('--size');

    if (nameIndex === -1) {
        console.error('Error: --name argument is required');
        process.exit(1);
    }

    const name = args[nameIndex + 1];
    const engine = engineIndex !== -1 ? args[engineIndex + 1] : 'sqlite';
    const size = sizeIndex !== -1 ? args[sizeIndex + 1] : 'small';

    const data = JSON.stringify({ name, engine, size });

    const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/database/databases',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log(`Database '${name}' created (Engine: ${engine}, Size: ${size}).`);
            } else {
                console.error(`Failed to create database: ${body}`);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
        console.error('Make sure the CloudX server is running (npm start).');
    });

    req.write(data);
    req.end();

} else if (command === 'deploy' && resource === 'service') {
    const nameIndex = args.indexOf('--name');
    const sourceIndex = args.indexOf('--source');
    const runtimeIndex = args.indexOf('--runtime');

    if (nameIndex === -1 || sourceIndex === -1 || runtimeIndex === -1) {
        console.error('Error: --name, --source, and --runtime arguments are required');
        process.exit(1);
    }

    const name = args[nameIndex + 1];
    const source = args[sourceIndex + 1];
    const runtime = args[runtimeIndex + 1];

    const data = JSON.stringify({ name, source, runtime });

    const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/compute/services',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const response = JSON.parse(body);
                console.log(`Service '${name}' deployed successfully.`);
                console.log(`Status: ${response.status}`);
                console.log(`URL: ${response.url}`);
            } else {
                console.error(`Failed to deploy service: ${body}`);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
        console.error('Make sure the CloudX server is running (npm start).');
    });

    req.write(data);
    req.end();

} else {
    console.log('Usage:');
    console.log('  cloudx create storage --bucket <name> --region <region>');
    console.log('  cloudx create database --name <name> --engine <engine> --size <size>');
    console.log('  cloudx deploy service --name <name> --source <path> --runtime <runtime>');
}

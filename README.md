# CloudX - Cloud Provider Simulation

A full-stack cloud provider simulation with Storage, Database, and Compute services.

## Features

- **Storage Service**: Create buckets, upload/download files with region support
- **Database Service**: Multiple database instances with different engines and sizes
- **Compute Service**: Deploy and manage services
- **CLI Tool**: Command-line interface for managing resources
- **Mobile Client**: React Native app for Android

## Quick Start

### Run Locally

```bash
npm install
npm start
```

Server runs on `http://localhost:3000`

### CLI Usage

```bash
# Create storage bucket
node bin/cloudx.js create storage --bucket mybucket --region us-east-1

# Create database
node bin/cloudx.js create database --name mydb --engine postgres --size small

# Deploy service
node bin/cloudx.js deploy service --name api --source ./backend --runtime nodejs
```

### Mobile App

See `mobile-client/BUILD_INSTRUCTIONS.md` for building the Android APK.

## API Endpoints

- **Storage**: `/api/v1/storage/buckets`, `/api/v1/storage/:bucket`
- **Database**: `/api/v1/database/databases`, `/api/v1/database/:dbname/:collection`
- **Compute**: `/api/v1/compute/services`

## Deployment

See `FREE_DEPLOYMENT.md` for deploying to Render.com (free tier).

## License

MIT

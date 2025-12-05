# CloudX v2.0 - Google Drive Features Setup Guide

## 🎯 What's New in v2.0

CloudX now supports:
- 🔐 **Google OAuth Sign-In** via Firebase
- 📁 **Folder-based storage** (like Google Drive)
- 🗄️ **MongoDB-style queries** for databases
- 🌱 **Eco-friendly** resource management

## 🚀 Quick Start

### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add project" → Name it "CloudX"
3. Enable Google Analytics (optional)
4. Click "Create project"

### Step 2: Enable Google Sign-In

1. In Firebase Console → Authentication → Get Started
2. Click "Sign-in method" tab
3. Enable "Google" provider
4. Add your email as authorized domain
5. Save

### Step 3: Get Firebase Config

1. Project Settings (gear icon) → General
2. Scroll to "Your apps" → Web app
3. Click "Add app" → Register app
4. Copy the `firebaseConfig` object

### Step 4: Configure CloudX

1. Open `config/firebase.js`
2. Replace placeholder values with your Firebase config
3. Open `public/login.html`
4. Replace the `firebaseConfig` (line 69) with your config

### Step 5: Deploy

```bash
git add .
git commit -m "Add Firebase authentication"
git push
```

Wait 2-3 minutes for Render to deploy.

## 📱 How It Works

### For Users:
1. Visit https://cloudx-api.onrender.com/login.html
2. Click "Sign in with Google"
3. Authorize CloudX
4. Get redirected to dashboard with auto-generated API key

### For Developers:
- API key is automatically created on first sign-in
- Linked to Google account (Firebase UID)
- Stored in localStorage for web dashboard
- Use in mobile app for authenticated requests

## 🔑 API Key Management

**Auto-generated on Google Sign-In:**
- Format: `cx_xxxxx...`
- Permissions: Full access (database + storage)
- Persistent across sessions

**Manual generation** (still available):
- Dashboard → API Keys tab
- For service accounts or testing

## 📁 Folder Support (Coming Soon)

The foundation is ready. Next features:
- Create folders in buckets
- Upload files to specific folders
- Browse folder hierarchy
- Share folders with links

## 🗄️ MongoDB-style Queries (Coming Soon)

Enhanced database operations:
- Filter: `{age: {$gt: 18}}`
- Sort: `{sort: {name: 1}}`
- Limit: `{limit: 10}`

## ⚡ Current Status

✅ **Completed:**
- Firebase authentication setup
- Google Sign-In page
- Auto API key generation
- User profile storage

⏳ **In Progress:**
- Folder hierarchy
- File sharing
- Advanced queries

## 🛠️ Local Development

1. Install dependencies: `npm install`
2. Start server: `npm start`
3. Open: http://localhost:3000/login.html

## 📝 Notes

- Firebase free tier: 10K auth/month (plenty for personal use)
- API keys never expire (revoke manually if needed)
- Google account = 1 API key (automatic)

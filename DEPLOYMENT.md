# CloudX API Deployment Guide

## Option 1: ngrok (Quickest - Temporary URL)

### Setup:
1. Download ngrok: https://ngrok.com/download
2. Sign up for free account: https://dashboard.ngrok.com/signup
3. Install and authenticate:
   ```bash
   ngrok config add-authtoken YOUR_TOKEN
   ```

### Run:
1. Start your CloudX server:
   ```bash
   cd c:\Users\saath\Desktop\cloudx
   npm start
   ```

2. In a new terminal, expose it:
   ```bash
   ngrok http 3000
   ```

3. Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)
4. Update `mobile-client/App.js` with this URL
5. Rebuild your APK

**Pros**: Instant, no configuration
**Cons**: URL changes each restart (unless paid plan), temporary

---

## Option 2: Deploy to Render (Free Tier - Permanent URL)

### Setup:
1. Create account: https://render.com
2. Create a new Web Service
3. Connect your GitHub repo (you'll need to push cloudx to GitHub first)
4. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Root Directory: `/`

**Pros**: Free, permanent URL, auto-deploys on git push
**Cons**: Takes ~5-10 min to deploy, cold starts after inactivity

---

## Option 3: Deploy to Railway (Free Tier - Permanent URL)

### Setup:
1. Create account: https://railway.app
2. Create new project → Deploy from GitHub
3. Select your cloudx repo
4. Railway auto-detects Node.js and deploys

**Pros**: Fast deployment, permanent URL, generous free tier
**Cons**: Requires GitHub repo

---

## Option 4: Deploy to Vercel (Free - Permanent URL)

### Setup:
1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   cd c:\Users\saath\Desktop\cloudx
   vercel
   ```

3. Follow prompts, get permanent URL

**Pros**: Very fast, permanent URL, excellent DX
**Cons**: Best for serverless, may need config adjustments

---

## Recommended: ngrok for immediate testing, then Railway/Render for production

# Deploy CloudX API for Free (No Billing Required)

## Using Render.com - 100% Free Tier

### Step 1: Prepare Your Project

1. Create a `.gitignore` in the cloudx root (if not exists):
```
node_modules/
.env
*.log
.DS_Store
services/database/data/
services/storage/data/
services/compute/deployments/
```

2. Initialize git and push to GitHub:
```bash
cd c:\Users\saath\Desktop\cloudx
git init
git add .
git commit -m "Initial commit"
```

3. Create a new repository on GitHub (https://github.com/new)
   - Name it "cloudx"
   - Don't initialize with README
   - Click "Create repository"

4. Push your code:
```bash
git remote add origin https://github.com/YOUR_USERNAME/cloudx.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Render

1. Go to https://render.com and sign up with GitHub (FREE, no credit card)

2. Click "New +" → "Web Service"

3. Connect your GitHub account and select the "cloudx" repository

4. Configure the service:
   - **Name**: cloudx-api
   - **Region**: Choose closest to you
   - **Branch**: main
   - **Root Directory**: (leave empty)
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node api/index.js`
   - **Instance Type**: Free

5. Click "Create Web Service"

6. Wait 2-3 minutes for deployment

7. Copy your URL (e.g., `https://cloudx-api.onrender.com`)

### Step 3: Update Mobile App

1. Update `mobile-client/App.js` line 7:
```javascript
const API_URL = 'https://cloudx-api.onrender.com';
```

2. Rebuild APK:
```bash
cd mobile-client
eas build -p android --profile preview
```

### Important Notes:
- ✅ Completely FREE forever
- ✅ No credit card required
- ✅ Permanent URL
- ⚠️ Free tier spins down after 15 min of inactivity (first request takes ~30 sec to wake up)
- ⚠️ 750 hours/month limit (more than enough for testing)

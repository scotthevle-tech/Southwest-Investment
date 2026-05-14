# Railway Deployment Guide

## Production URL
**https://southwest-investment.up.railway.app**

## Prerequisites
- GitHub account with repository created
- Railway account linked to GitHub
- Railway CLI installed (optional)

## Step 1: Connect to GitHub Repository

If you haven't already created a GitHub repository, do so now:
1. Go to https://github.com/new
2. Create a new repository (e.g., `southwest-investment`)
3. Copy the repository URL

Then connect your local repository:

```bash
git remote add origin https://github.com/YOUR-USERNAME/southwest-investment.git
git branch -M main
git push -u origin main
```

## Step 2: Configure Railway Deployment

### Option A: Via Railway Dashboard (Recommended)
1. Go to https://railway.app
2. Create new project → "Deploy from GitHub"
3. Select your `southwest-investment` repository
4. Railway will auto-detect the Node.js app

### Option B: Via Railway CLI
```bash
railway login
railway link
railway up
```

## Step 3: Set Environment Variables on Railway

Go to your Railway project dashboard and add these variables:

```
NODE_ENV=production
DATABASE_URL=postgresql://user:password@postgres-host/dbname
PORT=3000
REPORT_TO=your-email@gmail.com
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
REPORT_TIMEZONE=America/Denver
LOG_LEVEL=info

# MLS API Keys (from your .env)
MLXCHANGE_API_KEY=73gect3u2ew6n38k4aptchagg
MLXCHANGE_BASE_URL=https://api.mlxchange.com
FLEX_WASHINGTON_API_KEY=b67d3af8_47a1_4454_8001_70c7ee4e83e1
FLEX_WASHINGTON_BASE_URL=https://api.flexmls.com
FLEX_IRON_API_KEY=3gxdy1j0ht1ykhne17h9s5c35
FLEX_IRON_BASE_URL=https://api.flexmls.com
```

## Step 4: Set Up PostgreSQL (Railway)

1. In Railway Dashboard → Add Service → PostgreSQL
2. Copy the generated `DATABASE_URL`
3. Add to Railway environment variables
4. Railway will automatically run migrations on first deploy

## Step 5: Deploy

Once environment variables are set:

```bash
git push origin main
```

Railway will automatically:
- Build the Docker image
- Run `npm install`
- Run `npm run build`
- Start the app with `npm start`
- Run database migrations

## Step 6: Verify Deployment

Visit: **https://southwest-investment.up.railway.app/health**

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2026-05-14T...",
  "uptime": 123.45
}
```

## Available API Endpoints

### Reports
- `GET /api/reports/latest` - All markets latest reports
- `GET /api/reports/las-vegas/latest` - Las Vegas report
- `GET /api/reports/st-george/latest` - St. George report  
- `GET /api/reports/cedar-city/latest` - Cedar City report
- `GET /api/reports/:market/history?days=30` - Historical reports

### Format Options
- Default: JSON
- HTML: `?format=html`
- Text: `?format=text`

### Status
- `GET /api/status` - Scheduler and last run status

## Troubleshooting

**Build fails:** Check logs in Railway Dashboard
- Ensure all environment variables are set
- Verify PostgreSQL connection string is correct

**App crashes on startup:**
- Check Railway logs: "Deployments" → "View Logs"
- Verify DATABASE_URL is a PostgreSQL connection string

**Reports not running:**
- Check scheduler status: `GET /api/status`
- Verify API keys are correct for MLS connectors

## Local Development

Continue using `npm run dev` for local testing with SQLite:

```bash
npm install
npm run dev
```

This starts both Express server and scheduler on port 3000.

## Rollback

If deployment fails:

```bash
git revert HEAD
git push origin main
```

Railway will automatically redeploy the previous version.

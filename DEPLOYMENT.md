# Deployment Guide for Dota 2 Coach Analyzer

## Quick Deploy to Vercel (Recommended)

### Prerequisites
- GitHub account
- Vercel account (sign up at https://vercel.com - it's free)

### Step 1: Push to GitHub

1. Create a new repository on GitHub:
   - Go to https://github.com/new
   - Name: `dota2-coach-analyzer`
   - Make it Public (required for free Vercel hosting)
   - Don't initialize with README (we already have code)

2. Push your code:
```bash
cd "/Users/jamestruong/Documents/Dota 2 Coach Analyzer"

# Add all files
git add .

# Commit
git commit -m "Initial commit with AdSense integration"

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/dota2-coach-analyzer.git

# Push to GitHub
git push -u origin main
```

### Step 2: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Easiest)

1. Go to https://vercel.com and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add Environment Variables:
   - Click "Environment Variables"
   - Add: `DATABASE_URL` = Your production database URL (see below)
   - Add: `NODE_ENV` = `production`
6. Click "Deploy"

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
cd "/Users/jamestruong/Documents/Dota 2 Coach Analyzer"
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name? dota2-coach-analyzer
# - Which directory is your code? ./
# - Want to override settings? No

# Deploy to production
vercel --prod
```

### Step 3: Set Up Production Database

You'll need a PostgreSQL database for production. Options:

#### Option A: Vercel Postgres (Recommended - Integrated)
1. In Vercel dashboard, go to your project
2. Click "Storage" tab
3. Click "Create Database"
4. Select "Postgres"
5. Copy the `DATABASE_URL` environment variable
6. It will auto-configure for your deployment

#### Option B: Supabase (Free tier available)
1. Go to https://supabase.com
2. Create new project
3. Get connection string from Settings → Database
4. Add to Vercel environment variables

#### Option C: Neon (Serverless Postgres - Free tier)
1. Go to https://neon.tech
2. Create new project
3. Copy connection string
4. Add to Vercel environment variables

### Step 4: Update Environment Variables

In Vercel dashboard:
1. Go to Settings → Environment Variables
2. Add all required variables:
   ```
   DATABASE_URL=postgresql://...
   NODE_ENV=production
   OPENDOTA_API_KEY=your-key (optional)
   ```
3. Redeploy for changes to take effect

### Step 5: Test Your Deployment

1. Visit your Vercel URL (e.g., `https://dota2-coach-analyzer.vercel.app`)
2. Test match analysis with a match ID
3. Verify ads show placeholder (until you add AdSense ID)

### Step 6: Configure Custom Domain (Optional)

1. Buy domain (Namecheap, Google Domains, etc.)
2. In Vercel: Settings → Domains
3. Add your domain
4. Update DNS records as instructed
5. Wait for SSL certificate (automatic)

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in package.json
- Verify TypeScript has no errors locally

### Database Connection Fails
- Verify DATABASE_URL is correct
- Check database allows connections from Vercel IPs
- Ensure SSL mode is configured

### API Routes Don't Work
- Verify vercel.json routing configuration
- Check backend/src/index.ts exports properly
- Review function logs in Vercel dashboard

### Ads Don't Show
- Remember: ads only show in production with valid AdSense ID
- Check browser console for errors
- Verify AdSense code is approved

## Post-Deployment Checklist

- [ ] Site is accessible at Vercel URL
- [ ] Match analysis works
- [ ] Database connection successful
- [ ] Environment variables configured
- [ ] AdSense placeholders visible
- [ ] Apply for Google AdSense
- [ ] Update AdSense publisher ID after approval
- [ ] Monitor Vercel analytics
- [ ] Set up monitoring (optional: Sentry, LogRocket)

## Monitoring & Analytics

### Vercel Analytics (Built-in)
- Automatically enabled
- View in Vercel dashboard → Analytics
- Shows page views, response times, errors

### Google Analytics (Optional)
Add to frontend/index.html:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

## Costs

### Free Tier Limits
- **Vercel:**
  - 100 GB bandwidth/month
  - Unlimited projects
  - Automatic SSL
  - Serverless functions (100 GB-hours)

- **Vercel Postgres:**
  - Free tier: 256 MB storage, 60 hours compute
  - Pro: $20/month for 512 MB

### When You'll Need to Upgrade
- 10,000+ daily users (bandwidth)
- Heavy database usage
- Want custom analytics

## Next Steps

1. Deploy to Vercel
2. Apply for AdSense
3. Share your URL on Reddit/Discord
4. Monitor analytics
5. Iterate based on user feedback

Your deployment URL will be something like:
**https://dota2-coach-analyzer.vercel.app**

Good luck! 🚀

# Google AdSense Setup Guide

## Step 1: Sign Up for Google AdSense

1. Go to [https://www.google.com/adsense](https://www.google.com/adsense)
2. Click "Get Started"
3. Sign in with your Google account
4. Fill out the application form:
   - Your website URL (you'll need to deploy first - see Step 5)
   - Contact information
   - Accept terms and conditions

## Step 2: Wait for Approval

- Google will review your site (usually takes 1-3 days, sometimes up to 2 weeks)
- They check for:
  - Original content
  - Sufficient content (your analysis tool should qualify)
  - Site navigation works properly
  - No policy violations

**Tip:** You can start this process even while your site is in development. Deploy a basic version first.

## Step 3: Get Your Publisher ID

Once approved:

1. Log into your AdSense account
2. Click on "Account" in the left sidebar
3. Find your Publisher ID (looks like `ca-pub-1234567890123456`)
4. Copy this ID

## Step 4: Update Your Code

### Update HTML File

In `frontend/index.html`, replace the placeholder:

```html
<!-- Replace this -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
  crossorigin="anonymous"></script>

<!-- With your actual publisher ID -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456"
  crossorigin="anonymous"></script>
```

### Create Ad Units

1. In AdSense dashboard, go to "Ads" → "By ad unit"
2. Click "+ New ad unit"
3. Choose "Display ads"
4. Create 2 ad units:
   - **Top Banner**: Name it "Analysis Top", Size: Responsive
   - **Bottom Banner**: Name it "Analysis Bottom", Size: Responsive

### Update AdBanner Component

In `frontend/src/components/AdBanner.tsx`, replace:

```typescript
data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Replace with your publisher ID
```

### Update Ad Slots in AnalysisPage

In `frontend/src/pages/AnalysisPage.tsx`, replace the placeholder slots:

```tsx
{/* Top Ad - Replace slot with your actual ad unit ID */}
<AdBanner
  slot="1234567890"  // Replace with your top banner ad unit ID
  format="horizontal"
  className="mb-6"
/>

{/* Bottom Ad - Replace slot with your actual ad unit ID */}
<AdBanner
  slot="0987654321"  // Replace with your bottom banner ad unit ID
  format="horizontal"
  className="mt-6"
/>
```

## Step 5: Deploy Your Site

AdSense requires your site to be publicly accessible. Options:

### Option A: Vercel (Recommended - Free)
```bash
npm install -g vercel
cd "/Users/jamestruong/Documents/Dota 2 Coach Analyzer"
vercel
```

### Option B: Netlify (Free)
1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Connect your repository
4. Deploy

### Option C: Traditional Hosting
- Deploy to any web host (AWS, DigitalOcean, etc.)
- Make sure both frontend and backend are accessible

## Step 6: Verify AdSense Code

1. Go to AdSense dashboard → Sites
2. Click "Ready to review" next to your site
3. AdSense will verify the code is installed correctly
4. Wait for final approval (a few hours to days)

## Step 7: Monitor Revenue

Once live:
- Ads will start showing within 24-48 hours
- Check AdSense dashboard daily for performance
- RPM (Revenue Per Mille) typically stabilizes after 7-14 days

## Expected Timeline

- **Day 1:** Apply to AdSense, deploy site
- **Day 3-5:** Get approval (or rejection - fix issues and reapply)
- **Day 5:** Add code, create ad units
- **Day 6:** Verify code installation
- **Day 7-10:** Ads start showing
- **Day 14+:** Revenue stabilizes

## Testing in Development

The `AdBanner` component shows placeholders in development mode:
- Start your dev server: `npm run dev`
- You'll see gray boxes saying "Ad Placeholder"
- Actual ads only show in production

## Troubleshooting

### Ads Not Showing?
- Check browser console for errors
- Verify Publisher ID is correct
- Ensure site is public (not localhost)
- Wait 24-48 hours after code installation
- Check if ad blockers are enabled

### Low Revenue?
- Increase traffic (more users = more revenue)
- Try different ad placements
- Use more ad units (but don't overdo it - 2-3 per page is ideal)
- Gaming niche typically gets $3-$8 RPM

### Account Suspended?
- Review AdSense policies
- Common violations: click fraud, prohibited content
- Appeal the suspension with explanation

## Best Practices

1. **Don't click your own ads** - Google will ban you
2. **Don't ask users to click ads** - Against policy
3. **Balance ads vs UX** - Too many ads = users leave
4. **Strategic placement** - Between content sections (like we did)
5. **Mobile-friendly** - Use responsive ad units

## Revenue Projections

With your current setup (2 ads per analysis page):

| Daily Active Users | Monthly Page Views | Est. Monthly Revenue ($3 RPM) |
|-------------------|-------------------|------------------------------|
| 100               | 15,000            | $45                          |
| 500               | 75,000            | $225                         |
| 1,000             | 150,000           | $450                         |
| 5,000             | 750,000           | $2,250                       |
| 10,000            | 1,500,000         | $4,500                       |

*Assumes 5 page views per user (match search, player select, analysis page with scrolling)*

## Next Steps

Once AdSense is working:

1. **Track Performance:** Monitor which pages get most views
2. **A/B Test Placements:** Try different ad locations
3. **Add More Ad Units:** Consider sidebar ads, in-content ads
4. **Optimize for SEO:** More organic traffic = more ad revenue
5. **Consider Hybrid Model:** Offer "Remove Ads" for $3/month

## Questions?

- [AdSense Help Center](https://support.google.com/adsense)
- [AdSense Policies](https://support.google.com/adsense/answer/48182)
- [AdSense Community](https://support.google.com/adsense/community)

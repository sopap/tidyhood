# Mobile Share Link & Logo Fix - October 18, 2025

## Issues Identified

1. **Localhost URL in Share Links**: When sharing tidyhood.nyc on mobile, the URL shows "http://localhost:3000/" instead of "https://tidyhood.nyc"
2. **Missing Logo in Share Preview**: No logo/icon appears in the mobile share preview

## Root Causes

### Issue 1: Localhost URL
The `NEXT_PUBLIC_SITE_URL` environment variable is not set in production (Vercel), causing the app to fall back to the default value of `http://localhost:3000` in `app/layout.tsx`:

```typescript
metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
```

### Issue 2: Missing Logo
The Open Graph metadata was missing the `images` property, which is required for mobile share previews to display images.

## Solutions Implemented

### ✅ 1. Updated app/layout.tsx with Open Graph Images

Added Open Graph and Twitter card images to the metadata:

```typescript
openGraph: {
  // ... existing fields
  images: [
    {
      url: '/logo.png',
      width: 1200,
      height: 630,
      alt: 'Tidyhood - Laundry & Cleaning Services in Harlem',
    },
  ],
},
twitter: {
  // ... existing fields
  images: ['/logo.png'],
},
```

### ⚠️ 2. Environment Variable Configuration (ACTION REQUIRED)

You need to set the `NEXT_PUBLIC_SITE_URL` environment variable in your Vercel deployment.

#### Steps to Fix in Vercel:

1. **Go to Vercel Dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Select your `tidyhood` project

2. **Open Settings**
   - Click on "Settings" in the top navigation

3. **Navigate to Environment Variables**
   - Click "Environment Variables" in the left sidebar

4. **Add the Variable**
   - Click "Add New" or "Add Variable"
   - **Name**: `NEXT_PUBLIC_SITE_URL`
   - **Value**: `https://tidyhood.nyc`
   - **Environment**: Select all environments (Production, Preview, Development)
   - Click "Save"

5. **Redeploy**
   - Go back to the "Deployments" tab
   - Click the three dots (•••) on your latest deployment
   - Select "Redeploy"
   - Check "Use existing build cache" is UNCHECKED (to ensure fresh build)
   - Click "Redeploy"

#### Alternative: Via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Set the environment variable
vercel env add NEXT_PUBLIC_SITE_URL

# When prompted:
# - Enter value: https://tidyhood.nyc
# - Select environments: Production, Preview, Development

# Redeploy
vercel --prod
```

## Verification Steps

After deploying the changes:

1. **Test Share Link on Mobile**
   - Open https://tidyhood.nyc on your mobile device
   - Tap the share button
   - Verify the URL shows "https://tidyhood.nyc" (not localhost:3000)
   - Verify the Tidyhood logo appears in the preview

2. **Test Open Graph Meta Tags**
   - Use the Facebook Debugger: https://developers.facebook.com/tools/debug/
   - Enter: https://tidyhood.nyc
   - Click "Scrape Again" to refresh the cache
   - Verify the logo and correct URL appear

3. **Test Twitter Card**
   - Use Twitter Card Validator: https://cards-dev.twitter.com/validator
   - Enter: https://tidyhood.nyc
   - Verify the card displays correctly with logo

## Technical Details

### Why NEXT_PUBLIC_ prefix?

Environment variables with the `NEXT_PUBLIC_` prefix are exposed to the browser, which is necessary for the metadata generation in `app/layout.tsx` (which runs on both server and client).

### Why did it work locally?

Your local `.env.local` file likely has `NEXT_PUBLIC_SITE_URL` set correctly, but this file is not committed to git (and shouldn't be). Vercel uses its own environment variable system.

### Metadata Priority

Next.js uses the `metadataBase` URL to resolve relative URLs in metadata. When set correctly:
- Relative image paths like `/logo.png` become `https://tidyhood.nyc/logo.png`
- Open Graph URLs are fully qualified
- Social media platforms can properly fetch and display preview images

## Related Files Modified

- ✅ `app/layout.tsx` - Added Open Graph and Twitter card images
- 📝 `MOBILE_SHARE_LINK_FIX.md` - This documentation

## Notes

- The logo file (`/public/logo.png`) already exists in your repository
- Once the environment variable is set and deployed, the fix will be immediate
- Social media platforms cache Open Graph data, so you may need to use their debugging tools to refresh the cache

## Troubleshooting

### If the issue persists after deployment:

1. **Check Environment Variable**
   ```bash
   # In Vercel dashboard, verify the variable exists
   # The value should be exactly: https://tidyhood.nyc
   # No trailing slash
   ```

2. **Clear Social Media Caches**
   - Facebook: Use the Facebook Debugger and click "Scrape Again"
   - Twitter: Use the Card Validator
   - LinkedIn: Use the LinkedIn Post Inspector

3. **Verify Build Logs**
   - Check Vercel deployment logs
   - Look for any errors related to metadata generation
   - Ensure the build completed successfully

4. **Test in Incognito/Private Mode**
   - Open https://tidyhood.nyc in a private browser window
   - View page source (right-click → View Page Source)
   - Search for `<meta property="og:url"` to verify it shows the correct URL
   - Search for `<meta property="og:image"` to verify the logo is included

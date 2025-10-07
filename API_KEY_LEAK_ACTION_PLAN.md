# 🚨 CRITICAL: API Key Leak - Immediate Action Plan

## Status: AWAITING YOUR ACTION

Your Google Maps API key has been exposed in your public GitHub repository. I've prepared the remediation, but **you must take immediate action**.

---

## ⚡ STEP 1: REVOKE THE EXPOSED API KEY (DO THIS NOW!)

**This is the MOST CRITICAL step and must be done IMMEDIATELY.**

1. **Go to Google Cloud Console:**
   https://console.cloud.google.com/google/maps-apis/credentials

2. **Find the exposed key:**
   - Look for: `AIzaSyA3fgqY1v5a-a6T-cPDFsat6Li0Nkmkxgo`

3. **Delete or Regenerate it:**
   - Click on the key
   - Either DELETE it or click "Regenerate Key"

4. **Create a new restricted API key:**
   - Click "Create Credentials" → "API Key"
   - Immediately restrict it:
     - **Application restrictions:** HTTP referrers (websites)
     - **Website restrictions:** 
       - `http://localhost:3000/*` (for development)
       - `http://localhost:3001/*` (for development)
       - `https://yourdomain.com/*` (for production)
       - `https://*.vercel.app/*` (if using Vercel)
     - **API restrictions:** Select:
       - ✓ Maps JavaScript API
       - ✓ Places API
       - ✓ Geocoding API
       - ✓ (any other Google Maps APIs you use)
   - Click "Save"

5. **Copy the new API key** (you'll need it for the next steps)

---

## ⚡ STEP 2: UPDATE YOUR ENVIRONMENT VARIABLES

### Local Development (.env.local)
```bash
# Update this file with your new API key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_NEW_KEY_HERE
```

**IMPORTANT:** The `.env.local` file is gitignored and will NOT be committed.

### Production (Vercel/Deployment Platform)

**Option A: Using Vercel Dashboard**
1. Go to your project in Vercel
2. Go to Settings → Environment Variables
3. Find `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
4. Update it with your new key
5. Redeploy your application

**Option B: Using Vercel CLI**
```bash
vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production
# Enter your new key when prompted
vercel --prod
```

---

## ⚡ STEP 3: PUSH THE SECURITY FIXES

Once you've completed Steps 1 & 2, push the security fixes I've prepared:

```bash
git push origin main
```

This will:
- ✅ Remove `.env.production` from being tracked
- ✅ Update `.gitignore` to prevent future leaks
- ✅ Add security documentation

---

## ⚡ STEP 4: CLEAN UP GIT HISTORY (RECOMMENDED)

To completely remove the exposed key from your repository history:

```bash
# Run the automated cleanup script
./scripts/clean-git-history.sh
```

**This script will:**
1. Create a backup of your current branch
2. Remove `.env.production` from ALL git history
3. Clean up git references and garbage collect

**After running the script:**
```bash
# Force push to GitHub (required after history rewrite)
git push origin --force --all
git push origin --force --tags
```

**⚠️ WARNING:** This rewrites git history. If you have collaborators:
- Notify them before force pushing
- They will need to re-clone the repository
- Any open pull requests will need to be recreated

---

## 🔍 STEP 5: VERIFY THE FIX

1. **Check your API key restrictions in Google Cloud Console**
   - Verify the old key is deleted/disabled
   - Verify the new key has proper restrictions

2. **Test your application locally**
   ```bash
   npm run dev
   # Open http://localhost:3000 and test Maps functionality
   ```

3. **Test your production deployment**
   - Visit your production URL
   - Test address autocomplete and any Maps features

4. **Monitor API usage**
   - Go to: https://console.cloud.google.com/google/maps-apis/quotas
   - Watch for any unusual spikes in the next few days

---

## 📋 VERIFICATION CHECKLIST

- [ ] **CRITICAL:** Old Google Maps API key revoked/deleted
- [ ] New API key created with proper restrictions
- [ ] `.env.local` updated with new key
- [ ] Vercel/production environment variables updated
- [ ] Security fixes pushed to GitHub (`git push origin main`)
- [ ] Git history cleaned (optional but recommended)
- [ ] Application tested locally and in production
- [ ] Google Cloud Console monitoring enabled

---

## 📚 DOCUMENTATION CREATED

I've created several documents to help you:

1. **SECURITY_INCIDENT_RESPONSE.md**
   - Detailed incident analysis
   - Complete remediation guide
   - Prevention measures for the future

2. **scripts/clean-git-history.sh**
   - Automated script to remove secrets from git history
   - Safe with built-in backups

3. **API_KEY_LEAK_ACTION_PLAN.md** (this document)
   - Step-by-step action plan

---

## ❓ FAQ

**Q: Why can't we just update the key without cleaning history?**
A: The old key is still visible in git history. Anyone who has cloned your repo or accessed GitHub can see it. Cleaning history removes it completely.

**Q: Is it safe to force push?**
A: Yes, if you don't have collaborators or you've notified them. The backup branch created by the script protects you.

**Q: What if I don't want to clean git history?**
A: That's okay, but the exposed key will remain visible in history. As long as you've revoked the old key and restricted the new one, you're protected from unauthorized usage.

**Q: How do I know if my key has been abused?**
A: Check the Google Cloud Console → APIs & Services → Dashboard → View detailed metrics. Look for unusual spikes.

---

## 🆘 NEED HELP?

If you encounter any issues:
1. Check the Google Cloud Console for API errors
2. Verify environment variables are set correctly
3. Check browser console for any Maps API errors
4. Review SECURITY_INCIDENT_RESPONSE.md for more details

---

## ⏱️ TIME ESTIMATE

- **Step 1 (API Key Rotation):** 5 minutes
- **Step 2 (Environment Variables):** 2 minutes  
- **Step 3 (Push Fixes):** 1 minute
- **Step 4 (Clean History):** 5-10 minutes
- **Step 5 (Verification):** 5 minutes

**Total:** ~20-30 minutes

---

**Next Step:** Go to Step 1 and revoke the exposed API key NOW! ⚡

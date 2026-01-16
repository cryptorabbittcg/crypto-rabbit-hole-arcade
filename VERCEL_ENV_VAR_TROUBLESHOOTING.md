# Vercel Environment Variable Troubleshooting

## Issue: SUPABASE_SERVICE_ROLE_KEY Not Found

If you're getting the error:
```
SUPABASE_SERVICE_ROLE_KEY is not set. Server-side API routes require the service role key to bypass RLS.
```

But you've set it in Vercel, follow these steps:

## Step 1: Verify in Vercel Dashboard

1. Go to your Vercel project: https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **Environment Variables**
4. Look for `SUPABASE_SERVICE_ROLE_KEY`
5. **Check which environments it's set for:**
   - ✅ Production
   - ✅ Preview  
   - ✅ Development

**Important:** The variable must be set for **Production** if you're testing on the production deployment.

## Step 2: Verify Variable Name

Make sure the variable name is **exactly**:
```
SUPABASE_SERVICE_ROLE_KEY
```

Common mistakes:
- ❌ `SUPABASE_SERVICE_ROLE` (missing `_KEY`)
- ❌ `SUPABASE_SERVICE_KEY` (missing `_ROLE`)
- ❌ `SERVICE_ROLE_KEY` (missing `SUPABASE_` prefix)
- ❌ Extra spaces or typos

## Step 3: Get the Correct Value

1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Find **service_role key** (NOT the anon key)
5. Copy the entire key (starts with `eyJ...`)

## Step 4: Set in Vercel

1. In Vercel Dashboard → Settings → Environment Variables
2. Click **Add New**
3. **Key:** `SUPABASE_SERVICE_ROLE_KEY`
4. **Value:** Paste the service_role key from Supabase
5. **Select environments:** Check all three (Production, Preview, Development)
6. Click **Save**

## Step 5: Redeploy

**Critical:** After adding/changing environment variables, you MUST redeploy:

1. Go to **Deployments** tab
2. Click the three dots (⋯) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger a new deployment

**Note:** Environment variables are only available in NEW deployments. Existing deployments won't have the new variables.

## Step 6: Verify It's Working

After redeploying, check the logs. The improved error logging will show:
- Whether the variable is found
- What other Supabase-related variables are available
- The length of the key (to verify it's not empty)

Look for logs starting with:
```
[createAdminClient] Environment check:
```

## Common Issues

### Issue: Variable set but still not found
**Solution:** 
- Make sure you redeployed after setting it
- Check that it's set for the correct environment (Production/Preview/Development)
- Verify there are no typos in the variable name

### Issue: Variable works locally but not in Vercel
**Solution:**
- `.env.local` only works locally
- Must set in Vercel Dashboard for production
- Must redeploy after setting

### Issue: Variable visible in Vercel but code says it's missing
**Solution:**
- Check if variable is set for the right environment
- Verify no extra spaces in the variable name
- Try removing and re-adding the variable
- Redeploy after changes

## Required Environment Variables

Make sure ALL of these are set in Vercel:

```env
# Public (client-side safe)
NEXT_PUBLIC_SUPABASE_URL=https://wsqaapqabtwczmvxtgxp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Private (server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # ← This one is missing!
```

## Quick Test

After setting and redeploying, the error should change. Instead of:
```
SUPABASE_SERVICE_ROLE_KEY is not set
```

You should see the API route working, or a different error (which we can then fix).

## Still Not Working?

If it's still not working after following these steps:

1. Check Vercel logs for the `[createAdminClient] Environment check:` message
2. Share the output - it will show what variables are actually available
3. Verify the service_role key is correct in Supabase
4. Try creating a new environment variable with a test value to verify Vercel is reading them

# Environment Variables Setup Guide

This guide will help you configure all required environment variables for the Crypto Rabbit Hole Arcade application.

## Required Environment Variables

### Supabase Configuration

These variables are required for user profiles, leaderboards, and game session tracking.

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Your Supabase project URL
   - Format: `https://xxxxx.supabase.co`
   - Example: `https://wsqaapqabtwczmvxtgxp.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Your Supabase anonymous (public) key
   - This is a JWT token (starts with `eyJ`)
   - Found in: Supabase Dashboard → Settings → API → `anon` `public` key

### Thirdweb Configuration

Required for wallet connectivity and smart contract interactions.

3. **NEXT_PUBLIC_THIRDWEB_CLIENT_ID**
   - Your Thirdweb client ID
   - Found in: Thirdweb Dashboard → Settings → API Keys

### Optional Configuration

These have defaults but can be customized:

4. **NEXT_PUBLIC_APE_ADDRESS** (Optional)
   - APE token contract address on ApeChain
   - Default: `0x4d224452801ACEd8B2F0aebE155379bb5D594381`
   - Only needed if using a different contract address

5. **THIRDWEB_SECRET_KEY** (Optional)
   - Server-side Thirdweb secret key
   - Only needed for server-side operations

## Setup Instructions

### Step 1: Local Development (.env.local)

1. Create a `.env.local` file in the project root (if it doesn't exist):
   ```bash
   touch .env.local
   ```

2. Add your environment variables:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://wsqaapqabtwczmvxtgxp.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzcWFhcHFhYnR3Y3ptdnh0Z3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMzM0MDYsImV4cCI6MjA3NzcwOTQwNn0.sloOJkmuvWxrzQwbJ90VZIc6qgL_K7_JUdFyGQCCBO8

   # Thirdweb Configuration
   NEXT_PUBLIC_THIRDWEB_CLIENT_ID=c9199aa4c25c849a9014f465e22ec9e4

   # Optional: APE Token Contract (has default)
   # NEXT_PUBLIC_APE_ADDRESS=0x4d224452801ACEd8B2F0aebE155379bb5D594381
   ```

3. **Important**: After adding variables, restart your development server:
   ```bash
   # Stop the server (Ctrl+C), then:
   npm run dev
   ```

### Step 2: Vercel Production Setup

1. Go to your Vercel project dashboard: https://vercel.com/dashboard

2. Navigate to your project → **Settings** → **Environment Variables**

3. Add each environment variable:
   - **Key**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: `https://wsqaapqabtwczmvxtgxp.supabase.co`
   - **Environment**: Select all (Production, Preview, Development)
   - Click **Save**

   Repeat for:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`
   - `THIRDWEB_SECRET_KEY` (if using server-side features)

4. **Important**: After adding variables, redeploy your application:
   - Go to **Deployments** tab
   - Click the **⋯** (three dots) on the latest deployment
   - Select **Redeploy**
   - Or trigger a new deployment by pushing to your connected Git branch

### Step 3: Verify Configuration

#### Local Verification

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your browser's developer console (F12)

3. Check for Supabase initialization:
   - Look for: `[Supabase] Missing or invalid Supabase environment variables`
   - If you see this warning, your variables are not being loaded correctly
   - If you don't see this warning, Supabase is configured correctly

4. Test the application:
   - Try connecting a wallet
   - Check if profiles load correctly
   - Verify leaderboard data appears

#### Production Verification

1. After deploying to Vercel, check the browser console on your production site

2. Look for the same warnings as in local verification

3. Test core functionality:
   - Wallet connection
   - Profile creation/loading
   - Leaderboard display
   - Game session tracking

## Troubleshooting

### Issue: "Missing or invalid Supabase environment variables"

**Causes:**
- Variables not set in `.env.local` (local) or Vercel (production)
- Variables contain "placeholder" text
- Variables are not prefixed with `NEXT_PUBLIC_` for client-side access
- Server not restarted after adding variables

**Solutions:**
1. **Local**: Check `.env.local` exists and has correct variables
2. **Local**: Restart dev server after adding variables
3. **Vercel**: Verify variables are set in project settings
4. **Vercel**: Redeploy after adding variables
5. Ensure variable names start with `NEXT_PUBLIC_` for client-side access

### Issue: "Error fetching APE balance: ContractFunctionExecutionError"

**Causes:**
- APE token contract address is incorrect
- RPC endpoint is unavailable
- Network connectivity issues

**Solutions:**
1. Verify `NEXT_PUBLIC_APE_ADDRESS` is correct for ApeChain
2. Check ApeChain RPC endpoint is accessible: `https://rpc.apechain.com`
3. This is a non-critical error - the app will continue with balance "0.0000"

### Issue: "Error fetching profile by wallet" / "Error creating profile"

**Causes:**
- Supabase not configured (variables missing)
- Supabase project not accessible
- Database tables not set up

**Solutions:**
1. Verify Supabase variables are set correctly
2. Check Supabase dashboard to ensure project is active
3. Run database setup scripts (see `SUPABASE_SETUP.md`)
4. Check Supabase project URL is accessible in browser

### Issue: Environment variables work locally but not in production

**Causes:**
- Variables not set in Vercel
- Vercel deployment happened before variables were added
- Variables set for wrong environment (Production vs Preview)

**Solutions:**
1. Verify variables are set in Vercel project settings
2. Ensure variables are set for all environments (Production, Preview, Development)
3. Redeploy the application after adding variables
4. Check Vercel build logs for any errors

## Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | - | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | - | Supabase anonymous key |
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | ✅ Yes | - | Thirdweb client ID |
| `THIRDWEB_SECRET_KEY` | ⚠️ Optional | - | Thirdweb secret key (server-side) |
| `NEXT_PUBLIC_APE_ADDRESS` | ⚠️ Optional | `0x4d224452801ACEd8B2F0aebE155379bb5D594381` | APE token contract address |
| `NEXT_PUBLIC_APE_OFT_ADDRESS` | ⚠️ Optional | - | APE OFT contract address (for bridging) |
| `NEXT_PUBLIC_PYTH_ENTROPY_ADDRESS` | ⚠️ Optional | `0x98046Bd286715D3B0BC227Dd7a956b83D8978603` | Pyth Entropy contract address |

## Next Steps

After configuring environment variables:

1. ✅ Verify all variables are set correctly
2. ✅ Test local development
3. ✅ Deploy to Vercel
4. ✅ Verify production deployment
5. ✅ Set up Supabase database (see `SUPABASE_SETUP.md`)
6. ✅ Test all game features

## Additional Resources

- [Supabase Setup Guide](./SUPABASE_SETUP.md)
- [Next.js Environment Variables Documentation](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Vercel Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)


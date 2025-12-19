# CSP Troubleshooting Guide

## About the Firefox Console Errors

The errors you're seeing with `about:home` are from **Firefox's internal new tab page**, not your application. These can be safely ignored as they're browser-internal.

## If Your Application Isn't Loading

### Check Your Actual Application URL

1. Make sure you're checking the console on your actual application URL (e.g., `http://localhost:3000` or your production URL)
2. Not on `about:home` (Firefox's new tab page)

### Common CSP Issues and Solutions

If you see CSP errors on your actual application page:

#### 1. Script Blocking
**Error**: `Content-Security-Policy: The page's settings blocked the loading of a resource`

**Solution**: Check if the resource is in the allowed list in `next.config.mjs`. For development, `unsafe-eval` and `unsafe-inline` are already allowed.

#### 2. Inline Event Handlers
**Error**: `blocked an event handler (script-src-attr)`

**Solution**: In development mode, `unsafe-hashes` is automatically added. If you still see issues:
- Make sure you're running in development mode (`npm run dev`)
- Check that inline event handlers are properly converted to React event handlers

#### 3. Thirdweb/Wallet Connection Issues
**Error**: Thirdweb scripts or wallet connections blocked

**Solution**: The CSP already includes:
- `https://*.thirdweb.com`
- `https://*.thirdweb.dev`
- `https://chunks.thirdweb.com`
- `wss://*.thirdweb.com` (for WebSocket connections)

If you add new thirdweb domains, add them to the CSP in `next.config.mjs`.

#### 4. Supabase Connection Issues
**Error**: Supabase connections blocked

**Solution**: The CSP includes:
- `https://*.supabase.co`
- `wss://*.supabase.co` (for WebSocket connections)

#### 5. Image Loading Issues
**Error**: Images not loading

**Solution**: The CSP allows:
- `'self'` (same origin)
- `data:` (data URIs)
- `https:` (all HTTPS images)
- `blob:` (blob URLs)

#### 6. Font Loading Issues
**Error**: Fonts not loading

**Solution**: The CSP allows:
- `'self'` (same origin)
- `data:` (data URIs)
- `https://fonts.gstatic.com` (Google Fonts)

## Development vs Production

The CSP is more permissive in development mode:
- Includes `unsafe-hashes` for inline event handlers
- Doesn't include `upgrade-insecure-requests`

In production, the CSP is stricter. Test thoroughly before deploying.

## Testing CSP

1. Open your application in Firefox
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Look for CSP errors (they'll mention "Content-Security-Policy")
5. Check the Network tab to see which resources are being blocked

## Disabling CSP Temporarily (For Testing)

If you need to test without CSP temporarily, you can comment out the headers function in `next.config.mjs`:

```javascript
// async headers() {
//   ...
// },
```

**⚠️ Warning**: Only do this for testing. Re-enable CSP before deploying to production.

## Need to Add a New Domain?

If you need to allow a new domain in the CSP:

1. Open `next.config.mjs`
2. Find the relevant directive (script-src, connect-src, etc.)
3. Add your domain to the list
4. Rebuild the application

Example:
```javascript
"connect-src 'self' https://your-new-domain.com ..."
```




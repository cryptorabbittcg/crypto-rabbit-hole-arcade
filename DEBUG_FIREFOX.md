# Firefox Debugging Steps

## Step 1: Verify Dev Server is Running

Run this command in your terminal:
```bash
npm run dev
```

You should see:
```
▲ Next.js 16.0.10
- Local:        http://localhost:3000
```

## Step 2: Open Firefox Developer Tools Correctly

1. **Open Firefox**
2. **Type `http://localhost:3000` in the address bar** (not about:home)
3. **Press F12** to open Developer Tools
4. **Make sure you're on the Console tab**

## Step 3: Check What You See

### If the page is completely blank:
- Check the Console tab for JavaScript errors
- Check the Network tab for failed requests (red entries)
- Look for any error messages

### If you see a loading spinner or nothing:
- Check the Network tab - are files loading?
- Check Console for React errors
- Check if there are any CSP violations (they'll mention "Content-Security-Policy")

## Step 4: Share the Actual Errors

When you're on `http://localhost:3000` (NOT about:home), please share:

1. **Console errors** - Copy any red error messages
2. **Network tab** - Any failed requests (status code 4xx or 5xx)
3. **What you see** - Blank page? Error message? Loading spinner?

## Common Issues:

### Issue: Font Loading
If you see errors about Orbitron font:
- This is a Google Fonts issue
- The app should still load, just without that font

### Issue: JavaScript Errors
- Check if there are import errors
- Check if there are runtime errors
- Share the full error message

### Issue: Network Errors
- Check if `localhost:3000` is accessible
- Check firewall settings
- Try `127.0.0.1:3000` instead

## Quick Test:

Try opening `http://localhost:3000` in a different browser (Chrome, Edge) to see if it's Firefox-specific.




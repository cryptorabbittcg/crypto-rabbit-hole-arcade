# Firefox Troubleshooting Guide

## ⚠️ IMPORTANT: Check the Correct Console

The errors you're seeing are from **Firefox's new tab page (`about:home`)**, NOT from your application!

### How to Check Your Application's Console:

1. **Open your application** in Firefox:
   - Type `http://localhost:3000` (or your app URL) in the address bar
   - Press Enter

2. **Open Developer Tools**:
   - Press `F12` OR
   - Right-click → "Inspect Element" OR
   - Menu → Tools → Web Developer → Inspector

3. **Check the Console tab**:
   - Click on the "Console" tab
   - Look for errors that mention YOUR application URL, NOT `about:home`

4. **Verify you're on the right page**:
   - The address bar should show `localhost:3000` (or your app URL)
   - The console should NOT show `Resource URL: about:home`

### Why You're Seeing `about:home` Errors

Firefox's new tab page (`about:home`) has its own console that can be confusing. These errors are:
- From Firefox's internal code
- Not related to your application
- Safe to ignore

### If Your App Still Doesn't Load

After checking the **correct console** (your app's console, not about:home):

1. **Restart your dev server**:
   ```bash
   npm run dev
   ```

2. **Clear browser cache**:
   - Press `Ctrl+Shift+Delete` (Windows/Linux) or `Cmd+Shift+Delete` (Mac)
   - Select "Cached Web Content"
   - Click "Clear Now"

3. **Check the Network tab**:
   - Open Developer Tools (F12)
   - Go to "Network" tab
   - Reload the page
   - Look for failed requests (red entries)
   - Check what's being blocked

4. **Look for actual errors**:
   - In the Console tab (on your app page, not about:home)
   - Look for JavaScript errors, network errors, or CSP violations
   - Copy those errors and share them

### CSP Headers Temporarily Disabled

I've temporarily disabled the CSP headers in `next.config.mjs` to test if they were causing issues. After confirming your app works:

1. Re-enable the CSP headers
2. Test thoroughly
3. Adjust as needed

To re-enable, uncomment the `headers()` function in `next.config.mjs`.





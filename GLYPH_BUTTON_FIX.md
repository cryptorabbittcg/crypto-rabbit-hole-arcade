# Glyph Login Button Fix

## 🔍 The Problem

The "Login / Signup with Glyph" button in the AuthDialog was not working - clicking it didn't take users to the login flow.

## ✅ Root Cause

The `onClickCapture` handler was attached to the **outer wrapper div**, which was intercepting clicks before they reached the `NativeGlyphConnectButton` component. Even though the handler returned early on desktop, React's event capture phase was still interfering with the button's click handler.

## ✅ Fix Applied

**Moved `onClickCapture` from outer wrapper to inner div:**

**Before:**
```tsx
<div 
  className="w-full" 
  ref={buttonRef}
  data-glyph-button-wrapper
  onClickCapture={handleGlyphButtonClick}  // ❌ On outer wrapper
>
  <div className="relative group">
    ...
    <div data-glyph-button-container>
      <NativeGlyphConnectButton />
    </div>
  </div>
</div>
```

**After:**
```tsx
<div 
  className="w-full" 
  ref={buttonRef}
  data-glyph-button-wrapper
>
  <div className="relative group">
    ...
    <div 
      data-glyph-button-container
      onClickCapture={handleGlyphButtonClick}  // ✅ Moved to inner div
    >
      <NativeGlyphConnectButton />
    </div>
  </div>
</div>
```

## 🎯 How It Works Now

1. **Desktop:** `onClickCapture` returns early, allowing the click to proceed to the Glyph button
2. **Mobile:** `onClickCapture` tests popup permissions first, then allows the click to proceed
3. **Button is directly clickable:** The click handler is now closer to the actual button, reducing interference

## 🧪 Testing

1. Open the AuthDialog (via "Connect Wallet" or "Sign In with Glyph Wallet")
2. Click the "Login / Signup with Glyph" button
3. **Expected:** Glyph login modal should open
4. **Desktop:** Should work immediately
5. **Mobile:** May test popup permissions first, then proceed

## 📝 Notes

- The `onClickCapture` handler still works for mobile popup permission testing
- On desktop, it returns early and doesn't interfere with the button click
- The button is now directly wrapped by the handler, ensuring clicks reach the button properly

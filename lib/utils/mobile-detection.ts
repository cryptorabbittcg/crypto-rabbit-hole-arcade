/**
 * Mobile and iOS detection utilities
 * Used to determine if we should use redirect-based auth instead of popups
 */

/**
 * Detects if the user is on iOS (iPhone, iPad, iPod)
 * Includes detection for iPad running iPadOS 13+ (which reports as MacIntel)
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  
  const ua = navigator.userAgent
  const platform = navigator.platform
  
  // Standard iOS devices
  if (/iPad|iPhone|iPod/.test(ua)) {
    return true
  }
  
  // iPad on iPadOS 13+ reports as MacIntel
  if (platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    return true
  }
  
  return false
}

/**
 * Detects if the user is on a mobile device (iOS or Android)
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  
  return isIOS() || /Android/i.test(navigator.userAgent)
}

// =====================================================
// Complete Storage Cleanup Script
// =====================================================
// Run this in browser console to clear ALL storage
// =====================================================

(function() {
  console.log('🧹 Starting complete storage cleanup...');
  
  // Clear all localStorage keys starting with known prefixes
  const prefixes = [
    'arcade_profile_',
    'crypto_rabbit_session',
    'crypto_rabbit_point_updates',
    'arcade_auth_address',
    'cryptoku_hints_',
    'ape_in_free_plays_',
    'cryptoku_state_',
  ];
  
  let removedCount = 0;
  
  // Clear known keys
  prefixes.forEach(prefix => {
    if (prefix.endsWith('_')) {
      // For prefixed keys, find all matching keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
          console.log(`✅ Removed: ${key}`);
          removedCount++;
        }
      });
    } else {
      // For exact keys
      if (localStorage.getItem(prefix)) {
        localStorage.removeItem(prefix);
        console.log(`✅ Removed: ${prefix}`);
        removedCount++;
      }
    }
  });
  
  // Clear sessionStorage
  sessionStorage.clear();
  console.log('✅ Cleared sessionStorage');
  
  // Show remaining keys (for debugging)
  const remaining = Object.keys(localStorage);
  if (remaining.length > 0) {
    console.log('📋 Remaining localStorage keys:', remaining);
    console.log('💡 If you want to clear ALL localStorage, run: localStorage.clear()');
  } else {
    console.log('📋 No remaining localStorage keys');
  }
  
  console.log(`✅ Cleanup complete! Removed ${removedCount} items. Refresh the page.`);
})();

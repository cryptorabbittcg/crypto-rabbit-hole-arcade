// =====================================================
// CLEAR BROWSER CACHE - RUN IN BROWSER CONSOLE
// =====================================================
// Copy and paste this entire script into your browser console
// Then refresh the page
// =====================================================

console.log('🧹 Clearing browser cache...')

// Clear game session (contains points)
localStorage.removeItem('crypto_rabbit_session')
sessionStorage.removeItem('crypto_rabbit_session')
console.log('✅ Cleared crypto_rabbit_session')

// Clear point updates
localStorage.removeItem('crypto_rabbit_point_updates')
console.log('✅ Cleared crypto_rabbit_point_updates')

// Clear all profile storage keys (if exist)
const profileKeys = Object.keys(localStorage).filter(key => key.startsWith('profile_'))
profileKeys.forEach(key => {
  localStorage.removeItem(key)
  console.log(`✅ Cleared ${key}`)
})

if (profileKeys.length === 0) {
  console.log('ℹ️ No profile_ keys found')
}

// Clear arcade session (if exists)
localStorage.removeItem('arcade_auth_address')
console.log('✅ Cleared arcade_auth_address')

console.log('')
console.log('✅ Browser cache cleared!')
console.log('🔄 Please refresh the page (F5 or Ctrl+R) to load fresh data from database')
console.log('')
console.log('After refresh, points should show 0 in:')
console.log('  - Header (topbar)')
console.log('  - Profile page')
console.log('')

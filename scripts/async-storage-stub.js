// Stub for @react-native-async-storage/async-storage
// This is a React Native package that MetaMask SDK tries to import
// but is not needed for web builds. This stub provides a no-op implementation.

export default {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
  clear: async () => {},
  getAllKeys: async () => [],
  multiGet: async () => [],
  multiSet: async () => {},
  multiRemove: async () => {},
}



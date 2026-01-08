#!/usr/bin/env node

/**
 * Postinstall script to create async-storage stub for web builds
 * This fixes the MetaMask SDK warning about missing @react-native-async-storage/async-storage
 */

const fs = require('fs')
const path = require('path')

const stubDir = path.join(__dirname, '..', 'node_modules', '@react-native-async-storage')
const stubFile = path.join(stubDir, 'async-storage.js')
const packageFile = path.join(stubDir, 'package.json')
const typesFile = path.join(stubDir, 'async-storage.d.ts')

// Ensure directory exists
if (!fs.existsSync(stubDir)) {
  fs.mkdirSync(stubDir, { recursive: true })
}

// Copy stub implementation
const stubContent = `// Stub for @react-native-async-storage/async-storage
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
`

const packageContent = {
  name: "@react-native-async-storage/async-storage",
  version: "1.0.0",
  main: "async-storage.js",
  types: "async-storage.d.ts"
}

const typesContent = `// Type definitions for async-storage stub
export default {
  getItem: (key: string): Promise<string | null>;
  setItem: (key: string, value: string): Promise<void>;
  removeItem: (key: string): Promise<void>;
  clear: (): Promise<void>;
  getAllKeys: (): Promise<string[]>;
  multiGet: (keys: string[]): Promise<[string, string | null][]>;
  multiSet: (keyValuePairs: [string, string][]): Promise<void>;
  multiRemove: (keys: string[]): Promise<void>;
};
`

fs.writeFileSync(stubFile, stubContent)
fs.writeFileSync(packageFile, JSON.stringify(packageContent, null, 2))
fs.writeFileSync(typesFile, typesContent)

console.log('✅ Created async-storage stub for web builds')


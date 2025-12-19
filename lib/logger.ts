/**
 * Environment-based logging utility
 * Only logs in development, silent in production
 */

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args)
    }
  },
  
  error: (...args: unknown[]) => {
    // Always log errors, even in production (for debugging)
    console.error(...args)
  },
  
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args)
    }
  },
  
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args)
    }
  },
  
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args)
    }
  },
}




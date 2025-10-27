import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // enable vitest globals so `expect` and `vi` are available globally
    globals: true,
  },
})

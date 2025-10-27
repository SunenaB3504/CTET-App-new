/// <reference types="vitest" />

// Allow tests to assign to global.fetch in the test environment
declare global {
  var fetch: any
}

export {}

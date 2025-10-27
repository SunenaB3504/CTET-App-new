// Playwright configuration for the prototype E2E tests
module.exports = {
  timeout: 30000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 }
  },
  testDir: 'tests/f001',
  webServer: {
    command: 'node tests/f001/dev-server.js',
    url: 'http://127.0.0.1:8000/wireframes/dashboard.html',
    timeout: 20000,
    reuseExistingServer: true
  }
};


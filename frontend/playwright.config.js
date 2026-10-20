import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 240000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5001',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },
  webServer: {
    command: 'node ../backend/scripts/e2e-server.js',
    url: 'http://localhost:5001/api/ready',
    timeout: 30000,
    reuseExistingServer: false,
  },
});

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  projects: [
    
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        channel: 'chrome',
        headless: true,
      },
    },
  ],
});
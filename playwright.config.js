import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  projects: [
    {
      name: 'brave',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        headless: false,
        launchOptions: {
          executablePath:
            'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        },
      },
    },
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        channel: 'chrome',
        headless: false,
      },
    },
  ],
});
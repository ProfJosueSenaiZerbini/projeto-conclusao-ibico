
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  use: {
    browserName: 'chromium',
    headless: false,
    launchOptions: {
      executablePath:
        'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    },
  },
});

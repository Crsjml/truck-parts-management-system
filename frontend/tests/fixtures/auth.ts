import { test as base } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Utility to generate a dynamic test email.
 */
export const generateTestEmail = () => `e2e_test_${Date.now()}@example.com`;

/**
 * Utility to call the backend teardown script.
 * We use execSync to run the Node script in the backend directory.
 */
export const teardownUser = (email: string) => {
  try {
    const backendPath = path.resolve(__dirname, '../../../backend');
    console.log(`[Fixture] Teardown user: ${email}`);
    // Run the script using the current node process
    execSync(`node scripts/testTeardown.js ${email}`, { 
      cwd: backendPath, 
      stdio: 'inherit' 
    });
  } catch (error) {
    console.error(`[Fixture] Teardown failed for ${email}`, error);
  }
};

/**
 * Utility to call the backend seed script.
 */
export const seedUser = (email: string, password: string = 'TestPassword123!') => {
  try {
    const backendPath = path.resolve(__dirname, '../../../backend');
    console.log(`[Fixture] Seed user: ${email}`);
    execSync(`node scripts/testSeed.js ${email} ${password}`, { 
      cwd: backendPath, 
      stdio: 'inherit' 
    });
  } catch (error) {
    console.error(`[Fixture] Seed failed for ${email}`, error);
  }
};

/**
 * Custom Playwright fixture that injects a fresh `testEmail` and `testPassword`
 * and automatically tears it down after the test block finishes.
 */
type AuthFixtures = {
  testUser: { email: string; password: string };
};

export const test = base.extend<AuthFixtures>({
  testUser: async ({}, use) => {
    const email = generateTestEmail();
    const password = 'TestPassword123!';
    
    // Optionally we can auto-seed here if we wanted every test to start with an existing user, 
    // but tests might want to test the registration flow. 
    // So we just provide the credentials and let the test decide whether to call seedUser(email).
    
    // Pass the test user object to the test
    await use({ email, password });
    
    // Automatically tear down the user after the test
    teardownUser(email);
  },
});

export { expect } from '@playwright/test';

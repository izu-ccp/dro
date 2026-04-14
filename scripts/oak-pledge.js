#!/usr/bin/env node
/**
 * Oak Network Pledge Automation for DRO
 * Adapted from OakNetwork_UI_Automation/scripts/crypto_pledge.js
 *
 * Usage:
 *   node scripts/oak-pledge.js --projectId=<uuid> --title="<campaign title>" --amount=0.1
 *
 * Requirements:
 *   - Chrome running with MetaMask extension and CDP enabled on port 9222
 *   - Launch Chrome with: google-chrome --remote-debugging-port=9222
 *   - User must be logged into Oak Network in that Chrome instance
 */

const { chromium } = require('playwright-core');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const OAK_BASE_URL = 'https://app-dev.oaknetwork.org';
const MM_PASSWORD = process.env.MM_PASSWORD || process.env.METAMASK_PASSWORD || '';
const CDP_PORT = 9222;
const MAX_PLEDGE_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
const args = {};
process.argv.slice(2).forEach((arg) => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=');
  args[key] = rest.join('=') || 'true';
});

const projectId = args.projectId;
const campaignTitle = args.title || '';
const pledgeAmount = args.amount || '0';

if (!projectId && !campaignTitle) {
  console.error(JSON.stringify({ status: 'error', message: 'Either --projectId or --title is required' }));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function log(step, message) {
  console.log(JSON.stringify({ status: 'progress', step, message, timestamp: Date.now() }));
}

function logError(message) {
  console.log(JSON.stringify({ status: 'error', message, timestamp: Date.now() }));
}

function logDone(data) {
  console.log(JSON.stringify({ status: 'done', ...data, timestamp: Date.now() }));
}

async function findMetaMaskPage(context, opts = {}) {
  if (!context) return null;
  const { waitMs = 2000, maxAttempts = 15 } = opts;
  await sleep(waitMs);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pages = context.pages();
    const mm = pages.find(
      (p) =>
        p.url().includes('chrome-extension://') &&
        p.url().includes('nkbihfbeogaeaoehlefnkodbefgpgknn')
    );
    if (mm) {
      try {
        await mm.waitForLoadState('domcontentloaded').catch(() => {});
        return mm;
      } catch {
        // page navigating, retry
      }
    }
    await sleep(1000);
  }
  return null;
}

/**
 * Wait for the MetaMask confirm button to appear and click it.
 * Handles both same-page navigation and new popup scenarios.
 */
async function waitAndClickMetaMaskConfirm(context, label) {
  // Wait a bit for MetaMask to process and show the next transaction
  await sleep(3000);

  // Try multiple times — MetaMask may take time to navigate to the next tx
  for (let attempt = 0; attempt < 20; attempt++) {
    const pages = context.pages();

    // Find all MetaMask pages
    const mmPages = pages.filter(
      (p) =>
        p.url().includes('chrome-extension://') &&
        p.url().includes('nkbihfbeogaeaoehlefnkodbefgpgknn')
    );

    for (const mmPage of mmPages) {
      try {
        await mmPage.bringToFront();
        await mmPage.waitForLoadState('domcontentloaded').catch(() => {});

        // Try multiple selectors for the confirm button
        const confirmBtn = mmPage
          .locator('button[data-testid="confirm-footer-button"]')
          .or(mmPage.locator('button[data-testid="confirm-btn"]'))
          .or(mmPage.getByRole('button', { name: /^confirm$/i }))
          .first();

        const visible = await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false);
        if (visible) {
          // Small delay to ensure button is interactive
          await sleep(500);
          await confirmBtn.click();
          log('metamask', `${label}: Clicked confirm.`);
          return true;
        }
      } catch {
        // Page might be navigating, continue
      }
    }

    await sleep(1500);
  }

  log('metamask', `${label}: Confirm button not found after 30s.`);
  return false;
}

async function unlockMetaMask(mmPage) {
  const passwordField = mmPage.locator('input[type="password"]');
  const isLocked = await passwordField.isVisible({ timeout: 5000 }).catch(() => false);

  if (!isLocked) return;

  if (!MM_PASSWORD) {
    throw new Error(
      'MetaMask is locked; set MM_PASSWORD or METAMASK_PASSWORD in the environment (do not commit it).',
    );
  }

  log('metamask', 'MetaMask is locked. Entering password...');
  await passwordField.click();
  for (const char of MM_PASSWORD) {
    await mmPage.keyboard.type(char, { delay: 60 + Math.floor(Math.random() * 80) });
  }
  await sleep(500);

  const unlockBtn = mmPage.locator('button[data-testid="unlock-submit"]');
  await unlockBtn.waitFor({ state: 'visible', timeout: 10000 });
  await unlockBtn.click();
  log('metamask', 'MetaMask unlocked.');
  await sleep(3000);
}

// ---------------------------------------------------------------------------
// Login flow (if needed)
// ---------------------------------------------------------------------------
async function isUserLoggedIn(page) {
  const avatar = page
    .locator('button.chakra-popover__trigger')
    .filter({ has: page.locator('[data-scope="avatar"]') })
    .or(page.locator('.chakra-avatar__root'))
    .first();
  return avatar.isVisible({ timeout: 5000 }).catch(() => false);
}

async function loginWithMetaMask(page, context) {
  log('login', 'Logging in with MetaMask...');

  // Click Log In
  const loginBtn = page
    .locator('button[type="button"].chakra-button')
    .filter({ has: page.locator('p', { hasText: /^Log In$/i }) })
    .or(page.getByRole('button', { name: /log in/i }))
    .first();
  await loginBtn.waitFor({ state: 'visible', timeout: 15000 });
  await sleep(300);
  await loginBtn.click();
  log('login', 'Clicked Log In.');
  await sleep(2000);

  // Click Continue with a wallet
  const walletBtn = page
    .locator('button.login-method-button')
    .filter({ hasText: /continue with a wallet/i })
    .or(page.getByRole('button', { name: /continue with a wallet/i }))
    .first();
  await walletBtn.waitFor({ state: 'visible', timeout: 30000 });
  await sleep(300);
  await walletBtn.click();
  log('login', 'Clicked Continue with a wallet.');
  await sleep(2000);

  // Click MetaMask
  const mmBtn = page
    .getByRole('button', { name: /metamask/i })
    .or(page.locator('button').filter({ has: page.locator('span', { hasText: /^MetaMask$/i }) }))
    .first();
  await mmBtn.waitFor({ state: 'visible', timeout: 30000 });

  const popupPromise = context
    ? context.waitForEvent('page', { timeout: 15000 }).catch(() => null)
    : null;

  await mmBtn.click();
  log('login', 'Clicked MetaMask. Waiting for popup...');

  let mmPage = popupPromise ? await popupPromise : null;
  if (!mmPage) {
    await sleep(3000);
    mmPage = await findMetaMaskPage(context);
  }

  if (mmPage) {
    await mmPage.waitForLoadState('domcontentloaded').catch(() => {});
    await sleep(2000);

    // Unlock if needed
    await unlockMetaMask(mmPage);
    mmPage = await findMetaMaskPage(context);

    if (mmPage) {
      // Click Connect
      const connectBtn = mmPage
        .locator('button[data-testid="confirm-btn"]')
        .or(mmPage.getByRole('button', { name: /^connect$/i }))
        .first();
      const connectVisible = await connectBtn.isVisible({ timeout: 10000 }).catch(() => false);
      if (connectVisible) {
        await connectBtn.click();
        log('login', 'Clicked MetaMask Connect.');
        await sleep(3000);
      }

      // Confirm signature
      mmPage = await findMetaMaskPage(context);
      if (mmPage) {
        await mmPage.bringToFront();
        await sleep(2000);
        const confirmBtn = mmPage
          .locator('button[data-testid="confirm-footer-button"]')
          .or(mmPage.getByRole('button', { name: /^confirm$/i }))
          .first();
        const confirmVisible = await confirmBtn.isVisible({ timeout: 15000 }).catch(() => false);
        if (confirmVisible) {
          await confirmBtn.click();
          log('login', 'Confirmed MetaMask signature.');
          await sleep(3000);
        }
      }
    }
  }

  // Back to main page
  await page.bringToFront();
  await sleep(3000);

  // Skip onboarding modal if present
  const skipBtn = page.getByRole('button', { name: /skip/i });
  const skipVisible = await skipBtn.isVisible({ timeout: 5000 }).catch(() => false);
  if (skipVisible) {
    await skipBtn.click();
    log('login', 'Skipped onboarding modal.');
    await sleep(2000);
  }

  log('login', 'Login complete.');
}

// ---------------------------------------------------------------------------
// Pledge checkout flow
// ---------------------------------------------------------------------------
async function runPledgeCheckoutFlow(page, context) {
  log('checkout', 'On pledge confirmation page.');

  // Read backer info (pre-filled)
  const nameVal = await page.locator('input[name="name"]').inputValue().catch(() => '');
  log('checkout', `Backer: ${nameVal || '(anonymous)'}`);

  // Select Crypto Wallet payment
  const paymentDropdown = page.getByText('Select payment method');
  await paymentDropdown.waitFor({ state: 'visible', timeout: 15000 });
  await paymentDropdown.scrollIntoViewIfNeeded();
  await sleep(1000);
  await paymentDropdown.click();
  await sleep(2000);

  const cryptoOption = page.getByText('Crypto Wallet');
  await cryptoOption.waitFor({ state: 'visible', timeout: 10000 });
  await cryptoOption.click();
  log('checkout', 'Selected Crypto Wallet payment method.');
  await sleep(2000);

  // Check acknowledgment
  const checkbox = page.locator('svg[data-state="unchecked"]').first();
  await checkbox.waitFor({ state: 'visible', timeout: 15000 });
  await checkbox.scrollIntoViewIfNeeded();
  await checkbox.click();
  log('checkout', 'Checked acknowledgment.');
  await sleep(2000);

  // Confirm Pledge
  const confirmBtn = page.locator('button[type="submit"]').filter({ hasText: /confirm pledge/i });
  await confirmBtn.waitFor({ state: 'visible', timeout: 15000 });
  await confirmBtn.scrollIntoViewIfNeeded();
  await confirmBtn.click();
  log('checkout', 'Clicked Confirm Pledge. Waiting for MetaMask...');
  await sleep(3000);

  // MetaMask popup #1 — token approval
  let mmPage = await findMetaMaskPage(context, { waitMs: 3000, maxAttempts: 15 });
  if (mmPage) {
    await mmPage.bringToFront();
    await sleep(2000);

    // Unlock if needed
    await unlockMetaMask(mmPage);

    // Click first confirm (token approval)
    const clicked1 = await waitAndClickMetaMaskConfirm(context, 'Transaction #1 (token approval)');

    if (clicked1) {
      await sleep(5000);

      // MetaMask popup #2 — actual transaction
      // The second popup may:
      // a) Open as a new page
      // b) Navigate within the same MetaMask page
      // c) Appear after a delay while the approval tx confirms
      log('metamask', 'Waiting for second MetaMask confirmation...');

      // Wait longer — the chain needs to confirm the approval first
      await sleep(5000);

      // Try to bring main page to front briefly to trigger the second tx
      await page.bringToFront();
      await sleep(3000);

      const clicked2 = await waitAndClickMetaMaskConfirm(context, 'Transaction #2 (pledge)');
      if (!clicked2) {
        log('metamask', 'Second confirm not found — may not be needed for this campaign.');
      }

      await sleep(3000);
    }
  } else {
    log('metamask', 'MetaMask popup not found.');
  }

  // Wait for Pledge Confirmed
  await page.bringToFront();
  await sleep(3000);
  try {
    const pledgeConfirmed = page.getByText('Pledge Confirmed');
    await pledgeConfirmed.waitFor({ state: 'visible', timeout: 30000 });
    log('checkout', 'Pledge Confirmed!');
  } catch {
    // The pledge may have succeeded even if the modal doesn't appear
    log('checkout', 'Pledge submitted (confirmation modal not detected).');
  }
}

// ---------------------------------------------------------------------------
// Pledge from campaign detail page
// ---------------------------------------------------------------------------
async function runPledgeFromCampaignDetail(page, context) {
  // Click "Back this Project"
  const backBtn = page.getByRole('button', { name: /back this project/i });
  await backBtn.waitFor({ state: 'visible', timeout: 15000 });
  await backBtn.scrollIntoViewIfNeeded();
  await backBtn.click();
  log('pledge', 'Clicked Back this Project.');
  await sleep(3000);

  // Scroll to bottom to find pledge input
  await page.locator('body').click();
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('PageDown');
    await sleep(800);
    const atBottom = await page.evaluate(() =>
      window.innerHeight + window.scrollY >= document.body.scrollHeight - 10
    );
    if (atBottom) break;
  }
  await sleep(2000);

  // Enter pledge amount
  const pledgeInput = page.locator('.css-137t7tx input.chakra-input[placeholder="0"]');
  await pledgeInput.waitFor({ state: 'visible', timeout: 30000 });
  await pledgeInput.scrollIntoViewIfNeeded();
  await pledgeInput.click({ clickCount: 3 });
  await sleep(500);
  await page.keyboard.press('Backspace');
  await sleep(1000);
  for (const char of pledgeAmount) {
    await page.keyboard.type(char, { delay: 80 + Math.floor(Math.random() * 100) });
  }
  log('pledge', `Entered pledge amount: ${pledgeAmount}`);

  // Click Pledge button
  const pledgeBtn = page.locator('button[type="submit"]').filter({ hasText: /^pledge$/i });
  await pledgeBtn.waitFor({ state: 'visible', timeout: 15000 });
  await pledgeBtn.scrollIntoViewIfNeeded();
  await pledgeBtn.click();
  log('pledge', 'Clicked Pledge button.');
  await sleep(3000);

  await runPledgeCheckoutFlow(page, context);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  log('connect', 'Connecting to Chrome via CDP...');

  let browser;
  try {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  } catch (err) {
    logError(`Cannot connect to Chrome on port ${CDP_PORT}. Launch Chrome with: google-chrome --remote-debugging-port=${CDP_PORT}\nError: ${err.message}`);
    process.exit(1);
  }

  log('connect', 'Connected to Chrome.');

  const context = browser.contexts()[0];
  if (!context) {
    logError('No browser context found. Open at least one tab in Chrome.');
    process.exit(1);
  }

  // Always open a NEW tab so we don't navigate away from DRO
  let page = await context.newPage();

  try {
    // Navigate to Oak Network
    log('navigate', `Opening ${OAK_BASE_URL}...`);
    await page.goto(OAK_BASE_URL, { waitUntil: 'load', timeout: 60000 });
    await sleep(3000);

    // Check if logged in
    const loggedIn = await isUserLoggedIn(page);
    if (!loggedIn) {
      await loginWithMetaMask(page, context);
      // Re-navigate after login
      await page.goto(OAK_BASE_URL, { waitUntil: 'load', timeout: 60000 });
      await sleep(3000);
    } else {
      log('login', 'Already logged in.');
    }

    // Navigate to campaign
    let targetProjectId = projectId;

    if (targetProjectId) {
      // Direct navigation by project ID
      const campaignUrl = `${OAK_BASE_URL}/backer/projects/${targetProjectId}`;
      log('navigate', `Opening campaign: ${campaignUrl}`);
      await page.goto(campaignUrl, { waitUntil: 'load', timeout: 60000 });
      await sleep(3000);
    } else {
      // Search by title
      log('navigate', `Searching for campaign: "${campaignTitle}"...`);
      const searchInput = page.locator('input[name="searchString"]');
      await searchInput.waitFor({ state: 'visible', timeout: 15000 });
      await searchInput.click({ clickCount: 3 });
      await sleep(500);
      await page.keyboard.press('Backspace');
      await sleep(500);
      for (const char of campaignTitle) {
        await page.keyboard.type(char, { delay: 80 + Math.floor(Math.random() * 120) });
      }
      await sleep(3000);

      const campaignCard = page.locator('a').filter({ hasText: campaignTitle }).first();
      await campaignCard.waitFor({ state: 'visible', timeout: 20000 });
      await campaignCard.click();
      log('navigate', `Clicked campaign: "${campaignTitle}".`);
      await page.waitForLoadState('load', { timeout: 60000 }).catch(() => {});
      await sleep(3000);

      const urlMatch = page.url().match(/projects\/([a-f0-9-]+)/);
      targetProjectId = urlMatch ? urlMatch[1] : null;
    }

    log('navigate', `On campaign page: ${page.url()}`);

    // Execute pledge with retry
    let lastError;
    for (let attempt = 1; attempt <= MAX_PLEDGE_ATTEMPTS; attempt++) {
      try {
        if (attempt > 1) {
          log('pledge', `Retry attempt ${attempt}/${MAX_PLEDGE_ATTEMPTS}...`);
          if (targetProjectId) {
            const confirmUrl = `${OAK_BASE_URL}/backer/projects/${targetProjectId}/pledge/no-reward/confirm?amount=${pledgeAmount}`;
            await page.goto(confirmUrl, { waitUntil: 'load', timeout: 60000 });
            await sleep(3000);
            await runPledgeCheckoutFlow(page, context);
          } else {
            await runPledgeFromCampaignDetail(page, context);
          }
        } else {
          await runPledgeFromCampaignDetail(page, context);
        }
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        log('pledge', `Attempt ${attempt} failed: ${err.message}`);
      }
    }

    if (lastError) {
      throw lastError;
    }

    // Click Done — this is the success gate
    const doneBtn = page.getByRole('button', { name: /^done$/i });
    await doneBtn.waitFor({ state: 'visible', timeout: 30000 });
    await doneBtn.click();
    log('done', 'Clicked Done.');
    await sleep(3000);

    // Post-done verification (non-fatal)
    let raisedAmount = 'unknown';
    try {
      await page.waitForURL(/\/backer\/projects\/[a-f0-9-]+$/, { timeout: 5000 }).catch(() => {});
      const finalUrl = page.url();

      if (finalUrl.includes('/confirm') || finalUrl.includes('/pledge')) {
        if (targetProjectId) {
          await page.goto(`${OAK_BASE_URL}/backer/projects/${targetProjectId}`, {
            waitUntil: 'load',
            timeout: 60000,
          });
          await sleep(5000);
        }
      }

      const raisedText = await page
        .locator('.chakra-stack')
        .filter({ hasText: /raised/i })
        .locator('p')
        .first()
        .textContent()
        .catch(() => null);

      if (raisedText) {
        raisedAmount = raisedText.replace('$', '').trim();
      }
    } catch {
      // Verification failed but Done was clicked — still success
    }

    logDone({
      projectId: targetProjectId,
      pledgeAmount,
      raisedAmount,
      url: page.url(),
    });
  } catch (err) {
    logError(err.message);
    // Close the automation tab on failure too
    await page.close().catch(() => {});
    process.exit(1);
  } finally {
    // Close the automation tab
    await page.close().catch(() => {});
    try { browser.close(); } catch { /* already closed */ }
  }
}

main();

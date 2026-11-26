import { test, expect, Page, Locator } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';

/**
 * Parts Assistant e2e (plan Step 7). READ-ONLY: logs in with an existing seed
 * customer and only chats; nothing is registered, saved, or ordered.
 *
 * E2E_LLM_MOCK=1 means the backend runs with LLM_PROVIDER=mock, so replies are
 * deterministic and card assertions are strict. Against a real model the wording
 * varies, so we assert on structure and treat the part card as a soft check.
 */
const MOCK = process.env.E2E_LLM_MOCK === '1';
const CUSTOMER = { email: 'lionel.messi@example.com', password: 'Password123!' };
const FIRST_REPLY_TIMEOUT = 120_000;
const REPLY_TIMEOUT = 90_000;

// Published catalogue part (seed data). The mock searches with the whole message,
// so in mock mode the question is the exact part name (which contains "brake").
const PART_NAME = 'Fuso Canter Brake Linings';
const PART_QUESTION = MOCK ? PART_NAME : 'Do you have brake linings in stock? What is the price?';
const SITE_QUESTION = 'How do I track my order?';
const COST_QUESTION = 'What is your supplier cost for the Fuso Canter Brake Linings?';

const ERROR_TEXT = /something went wrong|unavailable|timed out|try again|couldn'?t reach|error/i;

class AssistantPanel {
  readonly page: Page;
  readonly input: Locator;
  readonly assistantBubbles: Locator;
  readonly cards: Locator;
  readonly thinking: Locator;

  constructor(page: Page) {
    this.page = page;
    this.input = page.getByPlaceholder('Ask for a part or OEM number...');
    this.assistantBubbles = page.locator('.rounded-tl-sm');
    this.cards = page.locator('button[aria-label^="View details:"]');
    this.thinking = page.getByRole('status').filter({ hasText: /Thinking/ });
  }

  async open() {
    await this.page.getByRole('button', { name: /Parts Assistant/ }).first().click();
    await expect(this.input).toBeVisible();
  }

  async newChat() {
    await this.page.getByRole('button', { name: 'New Chat' }).click();
    await expect(this.assistantBubbles).toHaveCount(0);
  }

  /** Sends a message and waits until the reply has finished streaming. */
  async ask(text: string, timeout: number) {
    const before = await this.assistantBubbles.count();
    await this.input.fill(text);
    await this.page.getByRole('button', { name: 'Send message' }).click();
    await expect(this.assistantBubbles).toHaveCount(before + 1, { timeout });
    await expect(this.thinking).toHaveCount(0, { timeout });
    // Streaming is done once the bubble text stops changing (assistant-ui appends a "●" cursor while running).
    const bubble = this.assistantBubbles.nth(before);
    await expect
      .poll(async () => {
        const first = await bubble.innerText();
        await this.page.waitForTimeout(2_000);
        const second = await bubble.innerText();
        return first === second && !second.includes('\u25CF');
      }, { timeout, intervals: [500] })
      .toBe(true);
    return this.assistantBubbles.nth(before);
  }
}

test.describe('Parts Assistant (Step 7)', () => {
  test.setTimeout(6 * 60_000);
  // One seed customer, and the API allows one in-flight chat per user: never run these in parallel.
  test.describe.configure({ mode: 'serial' });

  test('part question -> card -> detail, New Chat, site help, no cost leak', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.goto();
    await auth.login(CUSTOMER.email, CUSTOMER.password);
    const assistant = new AssistantPanel(page);
    await expect(page.getByRole('button', { name: /Parts Assistant/ }).first()).toBeVisible({ timeout: 30_000 });

    // 1. Part question
    await assistant.open();
    const reply = await assistant.ask(PART_QUESTION, FIRST_REPLY_TIMEOUT);
    const replyText = (await reply.innerText()).trim();
    console.log(`[assistant:part] ${JSON.stringify(replyText)} | cards=${await assistant.cards.count()}`);
    await expect(assistant.thinking).toHaveCount(0);
    expect(replyText).not.toMatch(ERROR_TEXT);
    const cardCount = await assistant.cards.count();
    expect(replyText.length > 0 || cardCount > 0).toBeTruthy();
    expect(replyText).not.toMatch(/R\$|¥|RMB|\bminimum\b/i); // wrong currency / internal stock level

    // 2. Card -> part detail (soft against a real model, strict with the mock)
    if (MOCK) expect(cardCount).toBeGreaterThan(0);
    if (cardCount > 0) {
      const card = assistant.cards.first();
      const name = (await card.getAttribute('aria-label'))!.replace('View details: ', '').trim();
      expect(name.length).toBeGreaterThan(0);
      await expect(card).toContainText(/₱\s?\d[\d,]*\.\d{2}/); // price shown in store currency (PHP)
      await card.click();
      const dialog = page.getByRole('dialog', { name, exact: true });
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    } else {
      test.info().annotations.push({ type: 'soft', description: `model produced no part card for "${PART_QUESTION}"` });
    }

    // 3. Negative check: no cost/markup internals in text or cards
    if (!(await assistant.input.isVisible())) await assistant.open();
    const costReply = await assistant.ask(COST_QUESTION, REPLY_TIMEOUT);
    const costText = await costReply.innerText();
    const cardsText = (await assistant.cards.allInnerTexts()).join('\n');
    console.log(`[assistant:cost] ${JSON.stringify(costText.trim())}`);
    for (const text of [costText, cardsText]) {
      expect(text).not.toMatch(/markup/i);
      expect(text).not.toMatch(/\bcost\s*:\s*[$₱]?\s*\d/i);
    }

    // 4. New Chat clears the thread; then a site-help question
    await assistant.newChat();
    const help = await assistant.ask(SITE_QUESTION, REPLY_TIMEOUT);
    const helpText = (await help.innerText()).trim();
    console.log(`[assistant:help] ${JSON.stringify(helpText)}`);
    expect(helpText.length).toBeGreaterThan(0);
    expect(helpText).not.toMatch(ERROR_TEXT);
    if (!MOCK) expect(helpText).toMatch(/order|purchase/i);
  });

  // Word-order robustness of the token-based search (real model only; the mock
  // searches with the raw message, which is not meaningful for these phrasings).
  for (const question of ['How much are your Fuso Canter brake linings?', 'brake linings for Fuso Canter']) {
    test(`finds the part for "${question}"`, async ({ page }) => {
      test.skip(MOCK, 'phrasing test targets the real model');
      const auth = new AuthPage(page);
      await auth.goto();
      await auth.login(CUSTOMER.email, CUSTOMER.password);
      const assistant = new AssistantPanel(page);
      await expect(page.getByRole('button', { name: /Parts Assistant/ }).first()).toBeVisible({ timeout: 30_000 });
      await assistant.open();
      const reply = await assistant.ask(question, FIRST_REPLY_TIMEOUT);
      const text = (await reply.innerText()).trim();
      console.log(`[assistant:phrasing] ${JSON.stringify(question)} -> ${JSON.stringify(text.split('\n')[0])} | cards=${await assistant.cards.count()}`);
      expect(text).not.toMatch(ERROR_TEXT);
      expect(text).not.toMatch(/R\$|¥|RMB|\bminimum\b|in_stock|low_stock/i);
      await expect(assistant.cards.filter({ hasText: PART_NAME }).first()).toBeVisible();
    });
  }
});

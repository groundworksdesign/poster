const { test, expect } = require('@playwright/test');
const path = require('path');
const { REPO_ROOT } = require('./repoRoot.cjs');

test('deck -> presentation updates', async ({ browser }) => {
  const context1 = await browser.newContext();
  const deckPage = await context1.newPage();
  await deckPage.goto('http://localhost:3000/deck');

  const context2 = await browser.newContext();
  const presentPage = await context2.newPage();
  await presentPage.goto('http://localhost:3000/presentation');

  const filePath = path.join(REPO_ROOT, 'src/test-data/quick-demo-deck.json');
  const input = deckPage.locator('input#file');
  await input.setInputFiles(filePath);
  await deckPage.click('button#load');

  await deckPage.waitForSelector('#slides li');
  // click the first Send button in the slides list
  await deckPage.locator('#slides li button').first().click();

  // expect the presentation to render the slide title
  await expect(presentPage.locator('#content')).toContainText('Quick Demo');
});

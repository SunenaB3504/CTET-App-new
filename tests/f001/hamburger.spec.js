const { test, expect } = require('@playwright/test');

const pagesToCheck = [
  '/wireframes/index.html',
  '/wireframes/dashboard.html',
  '/wireframes/questionbank.html',
  '/wireframes/study.html',
  '/wireframes/mock_setup.html',
  '/wireframes/mock_runner.html',
  '/wireframes/login.html',
  '/wireframes/admin_upload.html',
  '/wireframes/results.html'
];

test.describe('Hamburger visibility on small viewports', ()=>{
  for(const path of pagesToCheck){
    test(`hamburger present and visible on ${path}`, async ({ page }) => {
      // Emulate a small device (iPhone SE-ish)
      await page.setViewportSize({ width: 375, height: 667 });

      // Avoid modal blocking by pre-setting a selectedPaper in localStorage before navigation
      await page.addInitScript(() => {
        try{ localStorage.setItem('selectedPaper', 'Paper 2'); }catch(e){}
      });

  // Pipe page console to test output for debugging
  page.on('console', msg => console.log('PAGE LOG>', msg.type(), msg.text()));

  await page.goto('http://127.0.0.1:8000' + path, { waitUntil: 'domcontentloaded' });

      // Wait briefly for any dynamic injection or mutation observer to run
      const hamburger = page.locator('.hamburger');
      await expect(hamburger).toBeVisible({ timeout: 3000 });

      // It should have aria-label and aria-expanded attribute
      await expect(hamburger).toHaveAttribute('aria-label', /toggle navigation/i);
      await expect(hamburger).toHaveAttribute('aria-expanded');

      // Optionally click to ensure it opens the nav overlay
      await hamburger.click();
      // When open, body.nav-open should be present
  // Allow a bit more time for dynamic initialization
  await expect(page.locator('body.nav-open')).toHaveCount(1, { timeout: 5000 });
  // Close it via Escape (nav overlay can intercept pointer events on top of the toggle)
  await page.keyboard.press('Escape');
  await expect(page.locator('body.nav-open')).toHaveCount(0, { timeout: 3000 });
    });
  }
});

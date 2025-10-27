const { test, expect } = require('@playwright/test');

test.describe('Paper selector and preview', ()=>{
  test('select paper, persist selection, and preview questions', async ({ page })=>{
  await page.goto('http://127.0.0.1:8000/wireframes/dashboard.html');
    // Wait for modal or current paper element
    const cur = page.locator('[data-current-paper]');
    await expect(cur).toBeVisible();

    // If modal is visible, click Paper 2
    const modal = page.locator('#paper-select-modal');
    if(await modal.isVisible()){
      await page.locator('[data-select-paper="Paper 2"]').click();
    }

    // Expect data-current-paper to show Paper 2
    await expect(cur).toHaveText('Paper 2');

    // Reload and expect persistence
    await page.reload();
    await expect(cur).toHaveText('Paper 2');

    // Wait for questions summary to appear
    const summary = page.locator('#paper-questions-summary');
    await expect(summary).toBeVisible();
    const text = await summary.textContent();
    expect(text).toContain('questions available');

    // Click first Preview button
    const previewBtn = page.locator('[data-load-file]').first();
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();

  // Expect preview dialog to appear with question text
  // wait for preview dialog
  const dlg = page.locator('#preview-dialog');
  await expect(dlg).toBeVisible();
  await expect(dlg).toContainText('Preview');
  // ensure the preview contains at least one question id or options text
  await expect(dlg.locator('text=Options:', { exact: false }).first()).toBeVisible();
  // close the preview
  await dlg.locator('button', { hasText: 'Close' }).click();
  });
});

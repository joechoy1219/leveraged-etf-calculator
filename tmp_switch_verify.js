const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('[switch-debug]')) logs.push(t);
  });

  await page.goto('http://127.0.0.1:4174/leveraged-etf-calculator/', { waitUntil: 'domcontentloaded' });

  await page.evaluate(() => {
    localStorage.setItem('etf-calc-stocks', JSON.stringify([
      {
        id: 's-a',
        name: 'Stock-A',
        symbol: 'NET',
        autoRefreshQuote: true,
        stockOpen: '100',
        stockCurrent: '111.111',
        etfOpen: '20',
        leverage: { multiplier: 2, direction: 'long' }
      },
      {
        id: 's-b',
        name: 'Stock-B',
        symbol: 'CCJ',
        autoRefreshQuote: true,
        stockOpen: '200',
        stockCurrent: '222.222',
        etfOpen: '30',
        leverage: { multiplier: 2, direction: 'long' }
      }
    ]));
  });

  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.getByText('Stock-A').first().click();
  await page.waitForTimeout(200);

  const rounds = 8;
  const results = [];

  for (let i = 0; i < rounds; i += 1) {
    await page.getByRole('button', { name: '切股壓力測試' }).click();
    await page.waitForFunction(() => {
      const txt = document.body.innerText;
      return txt.includes('PASS:') || txt.includes('FAIL:');
    }, { timeout: 60000 });

    const line = await page.evaluate(() => {
      const txt = document.body.innerText;
      return txt.split('\n').find((l) => l.includes('PASS:') || l.includes('FAIL:')) || '';
    });
    results.push(line);

    await page.waitForTimeout(200);
  }

  const passCount = results.filter((r) => r.includes('PASS:')).length;
  const failCount = results.filter((r) => r.includes('FAIL:')).length;
  const dropCount = logs.filter((l) => l.includes('drop stockCurrent write')).length;
  const staleCount = logs.filter((l) => l.includes('stale (drop)') || l.includes('stale in catch (drop)')).length;

  console.log('ROUNDS=' + rounds);
  console.log('PASS=' + passCount);
  console.log('FAIL=' + failCount);
  console.log('DROP_LOGS=' + dropCount);
  console.log('STALE_LOGS=' + staleCount);
  console.log('LAST_RESULT=' + (results[results.length - 1] || ''));

  await browser.close();
})();

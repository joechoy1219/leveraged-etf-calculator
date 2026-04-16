const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem('etf-calc-stocks', JSON.stringify([
      { id:'a', name:'Stock-A', symbol:'NET', autoRefreshQuote:true, stockOpen:'100', stockCurrent:'111.111', etfOpen:'20', leverage:{multiplier:2,direction:'long'} },
      { id:'b', name:'Stock-B', symbol:'CCJ', autoRefreshQuote:true, stockOpen:'200', stockCurrent:'222.222', etfOpen:'30', leverage:{multiplier:2,direction:'long'} }
    ]));
  });

  const page = await context.newPage();
  const logs = [];
  page.on('console', async (msg) => {
    const vals = [];
    for (const a of msg.args()) {
      try { vals.push(await a.jsonValue()); } catch { vals.push(String(a)); }
    }
    if ((vals[0] ?? '').toString().includes('[switch-debug]')) logs.push(vals);
  });

  await page.goto('http://127.0.0.1:4174/leveraged-etf-calculator/', { waitUntil: 'networkidle' });
  await page.getByText('Stock-A').first().click();
  await page.waitForTimeout(200);

  let mismatch = null;
  for (let i = 0; i < 10; i += 1) {
    const targetName = i % 2 === 0 ? 'Stock-B' : 'Stock-A';
    await page.getByText(targetName).first().click();
    await page.waitForTimeout(120);
    const data = await page.evaluate((name) => {
      const stocks = JSON.parse(localStorage.getItem('etf-calc-stocks') || '[]');
      const target = stocks.find((s) => s.name === name);
      const input = document.getElementById('stock-current');
      return {
        expected: target?.stockCurrent ?? '',
        actual: input && 'value' in input ? input.value : '',
      };
    }, targetName);

    if (data.expected !== data.actual) {
      mismatch = { i: i + 1, targetName, ...data, logsTail: logs.slice(-25) };
      break;
    }
  }

  console.log(JSON.stringify(mismatch, null, 2));
  await browser.close();
})();

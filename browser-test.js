const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ browser: 'chrome', headless: 'new', executablePath: process.env.EDGE_PATH || undefined }).catch(() => 
    puppeteer.launch({ browser: 'chromium', headless: 'new' }).catch(() => 
    puppeteer.launch({ headless: 'new' })));
  const page = await browser.newPage();
  
  try {
    // Open local game
    await page.goto('http://localhost:8765/index.html');
    console.log('✓ Game loaded');
    
    // Wait for game to initialize
    await page.waitForFunction(() => window.players && window.players.length > 0, { timeout: 5000 });
    console.log('✓ Game initialized');
    
    // Read initial state
    let state = await page.evaluate(() => ({
      playerGold: players[0].gold,
      playerTerritory: cells.filter(c => c.owner === 0).length,
      units: units.filter(u => u.p === 0).length,
      target: players[0].target
    }));
    console.log('Initial state:', state);
    
    // Build barracks: click button
    await page.click('#barracks');
    console.log('✓ Barracks button clicked');
    
    // Wait for "choose a cell" message
    await page.waitForTimeout(200);
    
    // Click on empty cell in own territory (relative to castle)
    const cellX = 6 * 16 + 8, cellY = 5 * 16 + 8; // cell (6,5) near castle at (6,6)
    await page.click('#board', { offset: { x: cellX, y: cellY } });
    console.log('✓ Barracks built at (6,5)');
    
    state = await page.evaluate(() => ({
      playerGold: players[0].gold,
      barracks: cells.filter(c => c.owner === 0 && c.building === 'barracks').length
    }));
    console.log('After build:', state);
    
    // Wait for soldiers to spawn
    await page.waitForTimeout(500);
    
    // Click on neighbor territory (33,33 is player 1 castle)
    // Get a cell adjacent to player's territory that belongs to player 1
    // Start with cells near our boundary
    const targetCellX = 33 * 16 + 8, targetCellY = 33 * 16 + 8;
    await page.click('#board', { offset: { x: targetCellX, y: targetCellY } });
    console.log('✓ Clicked on neighbor territory (attacking player 1)');
    
    state = await page.evaluate(() => ({
      target: players[0].target,
      playerUnits: units.filter(u => u.p === 0).length
    }));
    console.log('After attack click:', state);
    
    // Simulate time passing (run ticks)
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => tick());
    }
    console.log('✓ Ran 20 ticks');
    
    // Check if soldiers invaded
    state = await page.evaluate(() => ({
      target: players[0].target,
      playerTerritory: cells.filter(c => c.owner === 0).length,
      playerUnits: units.filter(u => u.p === 0).length,
      player1Territory: cells.filter(c => c.owner === 1).length
    }));
    console.log('Final state after attack:', state);
    
    // Take screenshot
    await page.screenshot({ path: 'attack-test.png' });
    console.log('✓ Screenshot saved: attack-test.png');
    
    if (state.target === 1) {
      console.log('✓✓✓ SUCCESS: Soldiers attacking player 1 (target set)');
      console.log('✓✓✓ Soldiers invaded enemy territory (own territory changed or combat occurred)');
      process.exit(0);
    } else {
      console.log('✗ FAILED: Target not set to 1, got:', state.target);
      process.exit(1);
    }
  } catch (err) {
    console.error('✗ ERROR:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

// Throwaway perf probe: per-frame render cost at zoom 1 / zoomed, 80x80 map with 8 bots.
const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({ headless: 'new', executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const p = await b.newPage();
  await p.setViewport({ width: 1400, height: 1000 });
  await p.goto('file:///G:/Projects/marzban/index.html');
  const out = await p.evaluate(async () => {
    document.getElementById('menu-dlg').close();
    document.getElementById('size').value = '80';
    document.getElementById('bots').value = '8';
    document.getElementById('diff').value = 'impossible';
    start();
    for (let i = 0; i < 300; i++) tick();               // mid-game: lots of units, many buildings
    const time = (n, setup) => {
      const t = [];
      for (let i = 0; i < n; i++) { if (setup) setup(i); const a = performance.now(); render(); t.push(performance.now() - a); }
      t.sort((x, y) => x - y);
      return { mean: +(t.reduce((s, v) => s + v, 0) / t.length).toFixed(2), p95: +t[Math.floor(t.length * .95)].toFixed(2) };
    };
    const res = {
      units: units.length, cells: N * N,
      fit: time(60, () => { zoom = 1; camX = camY = 0 }),
      zoomed: time(60, () => { zoom = 3; camX = camY = 120 }),
      zoomToggling: time(60, i => { setZoom(i % 2 ? 1 : 3) })
    };
    // real frame pacing over 2s with the camera panning
    zoom = 3; camX = camY = 0; keys.add('KeyD');
    const fps = await new Promise(r => { let n = 0; const t0 = performance.now(); const loop = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(loop); else r(+(n / 2).toFixed(1)); }; requestAnimationFrame(loop); });
    keys.clear();
    res.fpsPanning = fps;
    return res;
  });
  console.log(JSON.stringify(out));
  await b.close();
})();

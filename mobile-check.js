// Run in the game console at a 375px viewport, or evaluate via browser automation.
(() => {
  const errors = [], check = (ok, message) => { if (!ok) errors.push(message); };
  start();
  try {
    const r = canvas.getBoundingClientRect(), style = getComputedStyle(canvas);
    const left = parseFloat(style.borderLeftWidth), right = parseFloat(style.borderRightWidth);
    const top = parseFloat(style.borderTopWidth), bottom = parseFloat(style.borderBottomWidth);
    check(r.width <= canvas.parentElement.getBoundingClientRect().width, 'Canvas exceeds parent width');
    for (const [x, y, fraction] of [[0, 0, .9], [39, 39, .1], [20, 5, .5]]) {
      cells.forEach(c => { c.owner = 0; c.building = ''; }); players[0].gold = 24;
      mode = ''; ui.market.click();
      const current = canvas.getBoundingClientRect();
      canvas.dispatchEvent(new MouseEvent('click', {
        clientX: current.left + left + (x + fraction) * (current.width - left - right) / N,
        clientY: current.top + top + (y + fraction) * (current.height - top - bottom) / N
      }));
      check(at(x, y).building === 'market', `Wrong cell for ${x},${y}`);
    }
    cells.forEach(c => { c.owner = 0; c.building = ''; }); players[0].gold = 24;
    mode = ''; ui.market.click();
    const edge = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent('click', {clientX: edge.left + 1, clientY: edge.top + edge.height / 2}));
    check(!cells.some(c => c.building), 'Border click constructed a building');
  } finally { start(); }
  if (errors.length) throw Error(errors.join('; '));
  return 'PASS: mobile width, cell coordinates, border rejection';
})();

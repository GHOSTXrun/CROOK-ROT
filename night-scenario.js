// Reconstructed narrative data, not an imported or verified trading history.
// Only the totals and SNOOT details were supplied; intermediate events are illustrative.
const NIGHT_REPLAY = (() => {
  const tokens = ['PLONK', 'FROTH', 'SPRUNK', 'GLIMR', 'MURKO', 'NUBBY', 'BOINK'];
  const losses = Array.from({ length: 82 }, (_, i) => i).filter(i => i < 80 && i % 3 === 2);
  const winSlots = Array.from({ length: 82 }, (_, i) => i).filter(i => !losses.includes(i) && i !== 76 && i !== 81);
  const pnl = Array(82).fill(0);
  losses.forEach(i => { pnl[i] = -(1200 + i * 60); });
  pnl[76] = 325800;
  pnl[81] = 80322;
  const remaining = 962400 - pnl.reduce((sum, n) => sum + n, 0);
  const weights = winSlots.map(i => (i + 8) ** 1.45);
  const totalWeight = weights.reduce((sum, n) => sum + n, 0);
  winSlots.forEach((i, n) => { pnl[i] = Math.floor(remaining * weights[n] / totalWeight); });
  pnl[winSlots.at(-1)] += 962400 - pnl.reduce((sum, n) => sum + n, 0);
  const events = [];
  const reasons = ['mint authority still live', 'liquidity unlocked', 'holder concentration'];
  let blocked = 0;
  function candidate(kind, token, extra = {}) {
    const c = { kind, token, ...extra };
    const stages = kind === 'blocked' ? [0, 1] : kind === 'limit' ? [0, 1, 2] : [0, 1, 2, 3, 4, 5];
    stages.forEach(stage => events.push({ stage, candidate: c }));
  }
  for (let i = 0; i < 82; i++) {
    const count = Math.floor((i + 1) * 85 / 82) - Math.floor(i * 85 / 82);
    for (let j = 0; j < count; j++) {
      candidate('blocked', tokens[blocked % tokens.length], { reason: reasons[blocked % reasons.length] });
      blocked++;
    }
    if (i > 0 && i % 15 === 0) candidate('limit', tokens[(i + 2) % tokens.length]);
    candidate('trade', i === 81 ? 'SNOOT' : tokens[i % tokens.length], {
      index: i, pnlCents: pnl[i], hold: i === 81 ? 19 : 4 + i % 14,
      trigger: i === 81 ? 'reclaim after a flush' : ['volume breakout', 'liquidity reclaim', 'range retest'][i % 3],
      exit: pnl[i] > 0 ? 'take-profit at 2R' : 'stop-loss hit'
    });
  }
  const lastStart = events.length - 6;
  const finalTimes = [27600, 27615, 27630, 27660, 28785, 28800];
  events.forEach((event, i) => {
    event.at = i < lastStart ? i / (lastStart - 1) * 27570 : finalTimes[i - lastStart];
  });
  return { events, pnlCents: pnl, startCents: 6000, endCents: 968400 };
})();

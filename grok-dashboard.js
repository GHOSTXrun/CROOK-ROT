const desk = document.querySelector('.desk');
const viewport = document.querySelector('.desk-viewport');
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
if (new URLSearchParams(location.search).has('embed')) {
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
}
function fitDashboard() {
  const scale = viewport.clientWidth / 1000;
  desk.style.transform = `scale(${scale})`;
  viewport.style.height = `${1240 * scale}px`;
}
new ResizeObserver(fitDashboard).observe(viewport);
fitDashboard();
// Accelerated paper-trading scenario: no network feeds, wallets or real orders.
const agents = $$('.agent');
const names = agents.map(a => a.querySelector('h3').textContent);
const tokens = ['PLONK','FROTH','SPRUNK','GLIMR','MURKO','NUBBY','BOINK'];
const outcomes = [.18,-.09,.31,.12,-.14,.23,.08,-.06];
const bootLog = $('.log-entries').innerHTML;
const stageCopy = agents.map(a => a.querySelector('strong').textContent);
$('.running').lastChild.textContent = ' · ';
const clock = document.createElement('time');
$('.running').append(clock);
const controls = document.createElement('div');
controls.className = 'demo-controls';
controls.innerHTML = '<span class="demo-label">SIMULATION · 120×</span><button type="button" class="pause-demo">PAUSE</button><button type="button" class="reset-demo" aria-label="Restart demo from 60 dollars">↻ RESET</button>';
$('.desk-footer').before(controls);
$('.desk-footer').firstElementChild.textContent = 'simulated trades · no real funds · reference demo';
$('.live').innerHTML = '<i></i>DEMO';
$('.live').title = 'Local simulation, not live trading';
$('.bot-icon').title = 'Pause / resume simulation';
const tickerTrack = document.createElement('div');
tickerTrack.className = 'ticker-track';
const tickerHTML = $('.ticker').innerHTML;
tickerTrack.innerHTML = `<div class="ticker-group">${tickerHTML}</div><div class="ticker-group" aria-hidden="true">${tickerHTML}</div>`;
$('.ticker').replaceChildren(tickerTrack);
const svg = $('.curve svg');
function addPath(className) {
  const node = document.createElementNS('http://www.w3.org/2000/svg','path');
  node.setAttribute('class',className);
  svg.insertBefore(node,$('.chart-halo'));
  return node;
}
const area = addPath('equity-area');
const curve = addPath('equity-line');
let state, previousTime, paused = false, accumulator = 0;
const money = n => '$' + n.toFixed(2);
const signed = n => (n >= 0 ? '+' : '−') + money(Math.abs(n));
function timeLabel(seconds, full = false) {
  const n = (23 * 3600 + Math.floor(seconds)) % 86400;
  return [Math.floor(n/3600),Math.floor(n/60)%60,...(full ? [n%60] : [])].map(v=>String(v).padStart(2,'0')).join(':');
}
function paintClock() {
  clock.textContent = timeLabel(state.elapsed,true);
  $('.timeline strong').textContent = clock.textContent;
  $('.timeline-track i').style.left = `${state.elapsed / 28800 * 98}%`;
}
function paintChart() {
  const pts = state.points.map(p=>[37+p.time/28800*479,204-(Math.log10(Math.max(10,p.value))-1)*65]);
  const d = pts.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  curve.setAttribute('d',d);
  const [x,y] = pts.at(-1);
  area.setAttribute('d',`${d} L${x} 204 L37 204 Z`);
  ['.chart-halo','.chart-point'].forEach(s=>{$(s).setAttribute('cx',x);$(s).setAttribute('cy',y)});
  $('.equity-baseline').setAttribute('d',`M37 ${y}H516`);
  svg.setAttribute('aria-label',`Simulated equity ${money(state.balance)}, ${state.trades} closed trades`);
}
function paintStats() {
  const rate = state.trades ? state.wins/state.trades*100 : 0;
  const multiplier = '×'+(state.balance/60).toFixed(2);
  $('.balance>strong').textContent = money(state.balance);
  $('.balance p b').textContent = multiplier;
  $('.curve .panel-heading>b').textContent = multiplier;
  const values = [state.wins,state.losses,rate.toFixed(1)+'%',state.trades];
  $$('.metrics b').forEach((n,i)=>n.textContent=values[i]);
  $('.win-ring strong').textContent = rate.toFixed(1)+'%';
  $('.win-ring').style.setProperty('--win-angle',`${rate*3.6}deg`);
  $$('.win-totals>b')[0].textContent = 'W '+state.wins;
  $$('.win-totals>b')[1].textContent = 'L '+state.losses;
  $('.win-totals p').textContent = state.trades+' closes';
  $('.best>strong').textContent = signed(state.best);
  $('.best>p').textContent = state.bestToken ? '$'+state.bestToken+' · best closed trade' : 'waiting for a close';
  $('.agent.equity strong').textContent = money(state.balance);
  paintChart();
}
function log(stage,kind,result,reason) {
  state.lines++;
  const row = document.createElement('li');
  row.className = 'highlight log-new';
  // All fields are from the fixed local scenario.
  row.innerHTML = `<time>${timeLabel(state.elapsed)}</time><span class="boot">${kind}</span><div><div class="log-title"><strong>${names[stage]}</strong><b>${result}</b></div><p>reason: ${reason}</p></div>`;
  $('.log-entries .highlight')?.classList.remove('highlight');
  $('.log-entries').prepend(row);
  while ($('.log-entries').children.length>7) $('.log-entries').lastElementChild.remove();
  $('.log .panel-heading>span').textContent = 'line #'+state.lines;
  $('.agent.logger strong').textContent = 'line #'+state.lines;
}
function trace(status,message) {
  $('.waiting').textContent = status;
  $('.waiting').classList.toggle('rejected',status==='BLOCKED');
  $('.pending').textContent = message;
}
function step() {
  const stage = state.stage;
  agents.forEach((a,i)=>a.classList.toggle('active',i===stage));
  $('.pipeline-flow>span').style.left = `${stage/5*100}%`;
  if (stage===0) {
    state.seen++;
    state.token = tokens[(state.seen-1)%tokens.length];
    $('.pipeline-flow>span').textContent = '$'+state.token;
    $('.pipeline-flow').setAttribute('aria-label',`${state.token} at ${names[stage]}`);
    $('.agent.scanner strong').textContent = 'seen '+state.seen;
    $('.agent.executor strong').textContent = 'flat';
    $('.agent.sizer strong').textContent = 'idle';
    $('.trade-empty b').textContent = '$'+state.token;
    $('.trade-empty span').textContent = '—';
    $('.trade-empty span').classList.remove('negative');
    $$('.trace dd').forEach(n=>n.textContent='…');
    $$('.trace dd')[0].textContent = 'volume + liquidity';
    trace('SCANNING','new pair detected · checking liquidity');
    log(0,'SCAN','$'+state.token,'volume spike · new liquidity detected');
    $$('.ticker-group').forEach(group=>[...group.children].forEach((item,i)=>{
      const change = 15*Math.sin(state.seen*.7+i)+i*2;
      item.querySelector('b').textContent = `${change>=0?'▲':'▼'}${Math.abs(change).toFixed(1)}%`;
      item.querySelector('b').classList.toggle('down',change<0);
    }));
  } else if (stage===1) {
    if (state.seen%4===0) {
      state.blocked++;
      $('.agent.rug strong').textContent = 'blocked '+state.blocked;
      $$('.trace dd')[1].textContent = 'FAIL · unlocked LP';
      trace('BLOCKED','risk filter rejected · no order placed');
      log(1,'BLOCK','rejected','LP unlocked · exposure avoided');
      state.stage=0;
      return;
    }
    $('.agent.rug strong').textContent = 'passed · LP safe';
    $$('.trace dd')[1].textContent = 'PASS · LP locked';
    trace('CHECKED','liquidity + holder checks passed');
    log(1,'PASS','verified','LP locked · mint revoked · holders checked');
  } else if (stage===2) {
    state.size = Math.round(state.balance*(.28+state.seen%4*.05)*100)/100;
    $('.agent.sizer strong').textContent = money(state.size);
    $$('.trace dd')[2].textContent = money(state.size)+' · cap 50%';
    trace('SIZING','position sized from current equity');
    log(2,'SIZE',money(state.size),'risk budget checked · below 50% cap');
  } else if (stage===3) {
    $('.agent.executor strong').textContent = 'position open';
    $$('.trace dd')[3].textContent = 'filled · slip 0.8%';
    trace('OPEN','demo order filled · monitoring exit');
    log(3,'BUY',money(state.size),'$'+state.token+' · paper fill · slip 0.8%');
  } else if (stage===4) {
    trace('EXITING','exit signal logged · settling position');
    log(4,'TRACE','recorded','entry + risk + exit rationale recorded');
  } else {
    const pnl = Math.round(state.size*outcomes[state.trades%outcomes.length]*100)/100;
    state.balance = Math.round((state.balance+pnl)*100)/100;
    state.trades++;
    if(pnl>0)state.wins++;else state.losses++;
    if(pnl>state.best){state.best=pnl;state.bestToken=state.token}
    state.points.push({time:state.elapsed,value:state.balance});
    $('.trade-empty span').textContent = signed(pnl);
    $('.trade-empty span').classList.toggle('negative',pnl<0);
    $$('.trace dd')[4].textContent = pnl>0?'take profit · closed':'stop loss · closed';
    $('.agent.executor strong').textContent = 'flat';
    trace('CLOSED','paper trade settled · equity updated');
    log(5,'CLOSE',signed(pnl),'$'+state.token+' · '+(pnl>0?'take profit':'stop loss'));
    $('.balance>strong').classList.remove('balance-tick');
    void $('.balance>strong').offsetWidth;
    $('.balance>strong').classList.add('balance-tick');
    paintStats();
  }
  state.stage=(stage+1)%6;
}
function setPaused(value) {
  paused=value;
  desk.classList.toggle('paused',paused);
  $('.bot-icon').setAttribute('aria-pressed',String(paused));
  $('.bot-icon').setAttribute('aria-label',paused?'Resume simulation':'Pause simulation');
  $('#runningLabel').textContent = state.elapsed>=28800?'COMPLETE':paused?'PAUSED':'RUNNING';
  $('.pause-demo').textContent = paused?'RESUME':'PAUSE';
  previousTime=undefined;
}
function reset() {
  state={elapsed:0,stage:0,balance:60,wins:0,losses:0,trades:0,best:0,bestToken:'',blocked:0,seen:0,lines:12,points:[{time:0,value:60}]};
  accumulator=0;
  $('.log-entries').innerHTML=bootLog;
  agents.forEach((a,i)=>{a.querySelector('strong').textContent=stageCopy[i];a.classList.remove('active')});
  $('.trade-empty b').textContent='—';
  $('.trade-empty span').textContent='—';
  $('.trade-empty span').classList.remove('negative');
  $$('.trace dd').forEach(n=>n.textContent='…');
  $('.log .panel-heading>span').textContent='line #12';
  trace('WAITING','first close pending');
  setPaused(false);paintStats();paintClock();step();
}
$('.bot-icon').addEventListener('click',()=>state.elapsed>=28800?reset():setPaused(!paused));
$('.pause-demo').addEventListener('click',()=>state.elapsed>=28800?reset():setPaused(!paused));
$('.reset-demo').addEventListener('click',reset);
document.addEventListener('visibilitychange',()=>{previousTime=undefined});
function animate(now) {
  if(previousTime===undefined)previousTime=now;
  const delta=Math.min((now-previousTime)/1000,.1);
  previousTime=now;
  if(!paused&&!document.hidden){
    state.elapsed=Math.min(28800,state.elapsed+delta*120);
    accumulator+=delta;
    if(accumulator>=.75){accumulator-=.75;step()}
    paintClock();
    if(state.elapsed>=28800){
      // Settle a filled paper position before ending the night.
      if(state.stage===4)step();
      if(state.stage===5)step();
      setPaused(true);$('.pause-demo').textContent='REPLAY';
    }
  }
  requestAnimationFrame(animate);
}
reset();requestAnimationFrame(animate);

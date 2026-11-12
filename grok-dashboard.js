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
const agents = $$('.agent');
const names = agents.map(a => a.querySelector('h3').textContent);
const bootLog = $('.log-entries').innerHTML;
const stageCopy = agents.map(a => a.querySelector('strong').textContent);
const replayEvents = NIGHT_REPLAY.events;
$('.running').lastChild.textContent = ' · ';
const clock = document.createElement('time');
$('.running').append(clock);
const controls = document.createElement('div');
controls.className = 'demo-controls';
controls.innerHTML = '<span class="demo-label">STORY REPLAY · 120×</span><button type="button" class="pause-demo">PAUSE</button><button type="button" class="full-log">FULL LOG</button><button type="button" class="show-result">07:00 RESULT</button><button type="button" class="reset-demo" aria-label="Restart replay from 60 dollars">↻ RESET</button>';
$('.desk-footer').before(controls);
$('.desk-footer').firstElementChild.textContent = 'reconstructed narrative · exceptional result · not typical';
$('.live').innerHTML = '<i></i>REPLAY';
$('.live').title = 'Reconstructed story replay; intermediate events are illustrative';
$('.bot-icon').title = 'Pause / resume replay';
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
let state, previousTime, paused = false, auditWasPaused = false;
const money = n => '$' + n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const signed = n => (n >= 0 ? '+' : '−') + money(Math.abs(n));
function timeLabel(seconds,full=false) {
  const n = (23*3600+Math.floor(seconds))%86400;
  return [Math.floor(n/3600),Math.floor(n/60)%60,...(full?[n%60]:[])].map(v=>String(v).padStart(2,'0')).join(':');
}
function paintClock() {
  clock.textContent = timeLabel(state.elapsed,true);
  $('.timeline strong').textContent = clock.textContent;
  $('.timeline-track i').style.left = `${state.elapsed/28800*98}%`;
}
function paintChart() {
  const pts = state.points.map(p=>[37+p.time/28800*479,204-(Math.log10(Math.max(10,p.value))-1)*65]);
  const d = pts.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  curve.setAttribute('d',d);
  const [x,y] = pts.at(-1);
  area.setAttribute('d',`${d} L${x} 204 L37 204 Z`);
  ['.chart-halo','.chart-point'].forEach(s=>{$(s).setAttribute('cx',x);$(s).setAttribute('cy',y)});
  $('.equity-baseline').setAttribute('d',`M37 ${y}H516`);
  svg.setAttribute('aria-label',`Reconstructed equity ${money(state.balance)}, ${state.trades} closed trades`);
}
function paintStats() {
  const rate = state.trades?state.wins/state.trades*100:0;
  const multiplier = '×'+(state.balance/60).toFixed(2);
  $('.balance>strong').textContent = money(state.balance);
  $('.balance p b').textContent = multiplier;
  $('.curve .panel-heading>b').textContent = multiplier;
  const values = [state.wins,state.losses,rate.toFixed(1)+'%',state.trades];
  $$('.metrics b').forEach((n,i)=>n.textContent=values[i]);
  $('.win-ring strong').textContent = rate.toFixed(1)+'%';
  $('.win-ring').style.setProperty('--win-angle',`${rate*3.6}deg`);
  $$('.win-totals>b')[0].textContent='W '+state.wins;
  $$('.win-totals>b')[1].textContent='L '+state.losses;
  $('.win-totals p').textContent=state.trades+' closes';
  $('.best>strong').textContent=signed(state.best);
  $('.best>p').textContent=state.bestToken?'$'+state.bestToken+' · reconstructed best close':'waiting for a close';
  $('.agent.equity strong').textContent=money(state.balance);
  paintChart();
}
function log(stage,kind,result,reason) {
  state.lines++;
  const entry={time:timeLabel(state.elapsed),agent:names[stage],kind,result,reason};
  state.history.push(entry);
  const row=document.createElement('li');
  row.className='highlight log-new';
  // All fields are fixed local scenario data, not user-provided HTML.
  row.innerHTML=`<time>${entry.time}</time><span class="boot">${kind}</span><div><div class="log-title"><strong>${entry.agent}</strong><b>${result}</b></div><p>reason: ${reason}</p></div>`;
  $('.log-entries .highlight')?.classList.remove('highlight');
  $('.log-entries').prepend(row);
  while($('.log-entries').children.length>7)$('.log-entries').lastElementChild.remove();
  $('.log .panel-heading>span').textContent='line #'+state.lines;
  $('.agent.logger strong').textContent='line #'+state.lines;
}
function trace(status,message) {
  $('.waiting').textContent=status;
  $('.waiting').classList.toggle('rejected',status==='BLOCKED'||status==='NO ORDER');
  $('.pending').textContent=message;
}
function step() {
  if(state.eventIndex>=replayEvents.length)return;
  const event=replayEvents[state.eventIndex++];
  const {stage,candidate:c}=event;
  const displayTime=state.elapsed;
  state.elapsed=event.at;
  state.stage=stage;state.token=c.token;
  agents.forEach((a,i)=>a.classList.toggle('active',i===stage));
  $('.pipeline-flow>span').style.left=`${stage/5*100}%`;
  $('.pipeline-flow').setAttribute('aria-label',`${c.token} at ${names[stage]}`);
  if(stage===0){
    state.seen++;
    $('.pipeline-flow>span').textContent='$'+c.token;
    $('.agent.scanner strong').textContent='seen '+state.seen;
    $('.agent.executor strong').textContent='flat';
    $('.agent.sizer strong').textContent='idle';
    $('.trade-empty b').textContent='$'+c.token;
    $('.trade-empty span').textContent='—';
    $('.trade-empty span').classList.remove('negative');
    $$('.trace dd').forEach(n=>n.textContent='…');
    $$('.trace dd')[0].textContent=c.trigger||'new pair · volume spike';
    trace('SCANNING','new candidate · contract checks pending');
    log(0,'SCAN','$'+c.token,c.trigger||'new pair · volume spike');
    $$('.ticker-group').forEach(group=>[...group.children].forEach((item,i)=>{
      const change=15*Math.sin(state.seen*.7+i)+i*2;
      item.querySelector('b').textContent=`${change>=0?'▲':'▼'}${Math.abs(change).toFixed(1)}%`;
      item.querySelector('b').classList.toggle('down',change<0);
    }));
  }else if(stage===1){
    if(c.kind==='blocked'){
      state.blocked++;
      $('.agent.rug strong').textContent='blocked '+state.blocked;
      $$('.trace dd')[1].textContent='FAIL · '+c.reason;
      trace('BLOCKED',c.reason+' · no order');
      log(1,'BLOCK','rejected',c.reason+' · no order');
    }else{
      $('.agent.rug strong').textContent='blocked '+state.blocked;
      $$('.trace dd')[1].textContent='PASS · checks clear';
      trace('CHECKED','contract checks passed · sizing next');
      log(1,'PASS','verified','mint revoked · LP locked · holders checked');
    }
  }else if(stage===2){
    if(c.kind==='limit'){
      $('.agent.sizer strong').textContent='limit reached';
      $$('.trace dd')[2].textContent='LIMIT · no order';
      trace('NO ORDER','position limit reached · candidate skipped');
      log(2,'SKIP','no order','position limit reached');
    }else{
      state.size=Math.round(state.balance*(.28+c.index%4*.05)*100)/100;
      $('.agent.sizer strong').textContent=money(state.size);
      $$('.trace dd')[2].textContent=money(state.size)+' · equity sized';
      trace('SIZING','allocation calculated from current equity');
      log(2,'SIZE',money(state.size),'sized from equity · within position limit');
    }
  }else if(stage===3){
    $('.agent.executor strong').textContent='position open';
    $$('.trace dd')[3].textContent=c.index===81?'06:41 · hold 19m':'paper fill · hold '+c.hold+'m';
    trace('OPEN','illustrative fill · tracking the exit');
    log(3,'BUY',money(state.size),'$'+c.token+' · '+c.trigger);
  }else if(stage===4){
    trace('EXITING','hold '+c.hold+'m · '+c.exit);
    log(4,'TRACE','recorded','hold '+c.hold+'m · exit: '+c.exit);
  }else{
    const pnl=c.pnlCents/100;
    state.balanceCents+=c.pnlCents;state.balance=state.balanceCents/100;
    state.trades++;
    if(pnl>0)state.wins++;else state.losses++;
    if(pnl>state.best){state.best=pnl;state.bestToken=c.token}
    state.points.push({time:event.at,value:state.balance});
    $('.trade-empty span').textContent=signed(pnl);
    $('.trade-empty span').classList.toggle('negative',pnl<0);
    $$('.trace dd')[4].textContent=c.exit;
    $('.agent.executor strong').textContent='flat';
    trace('CLOSED','hold '+c.hold+' minutes · '+c.exit);
    log(5,'CLOSE',signed(pnl),'$'+c.token+' · hold '+c.hold+'m · '+c.exit);
    $('.balance>strong').classList.remove('balance-tick');
    void $('.balance>strong').offsetWidth;
    $('.balance>strong').classList.add('balance-tick');
    paintStats();
  }
  state.elapsed=Math.max(displayTime,event.at);
  paintClock();
}
function setPaused(value) {
  paused=value;desk.classList.toggle('paused',paused);
  $('.bot-icon').setAttribute('aria-pressed',String(paused));
  $('.bot-icon').setAttribute('aria-label',paused?'Resume replay':'Pause replay');
  $('#runningLabel').textContent=state.elapsed>=28800?'COMPLETE':paused?'PAUSED':'RUNNING';
  $('.pause-demo').textContent=state.elapsed>=28800?'REPLAY':paused?'RESUME':'PAUSE';
  previousTime=undefined;
}
function reset() {
  state={elapsed:0,stage:0,balance:60,balanceCents:6000,wins:0,losses:0,trades:0,best:0,bestToken:'',blocked:0,seen:0,lines:12,eventIndex:0,history:[],points:[{time:0,value:60}]};
  $('.log-entries').innerHTML=bootLog;
  agents.forEach((a,i)=>{a.querySelector('strong').textContent=stageCopy[i];a.classList.remove('active')});
  $('.trade-empty b').textContent='—';$('.trade-empty span').textContent='—';
  $('.trade-empty span').classList.remove('negative');
  $$('.trace dd').forEach(n=>n.textContent='…');
  $('.log .panel-heading>span').textContent='line #12';
  trace('WAITING','first close pending');setPaused(false);paintStats();paintClock();step();
}
function showResult() {
  while(state.eventIndex<replayEvents.length)step();
  state.elapsed=28800;paintClock();setPaused(true);
}
function togglePause(){if(state.elapsed>=28800)reset();else setPaused(!paused)}
$('.bot-icon').addEventListener('click',togglePause);
$('.pause-demo').addEventListener('click',togglePause);
$('.reset-demo').addEventListener('click',reset);
$('.show-result').addEventListener('click',showResult);
// The complete reconstructed log stays accessible while the seven-row tail rolls.
const audit=document.createElement('dialog');
audit.className='audit-dialog';
audit.innerHTML='<div class="audit-header"><div><h2>DECISIONS.LOG</h2><p>Reconstructed narrative · intermediate events are illustrative.</p></div><button type="button" class="close-audit" aria-label="Close decision log">✕</button></div><div class="audit-tools"><label>SHOW <select aria-label="Filter decision log"><option value="ALL">All decisions</option><option value="CLOSE">Closed trades</option><option value="BLOCK">Risk blocks</option><option value="SKIP">No order</option></select></label><span class="audit-count"></span></div><div class="audit-scroll"><table><thead><tr><th>TIME</th><th>AGENT</th><th>ACTION</th><th>RESULT</th><th>REASON</th></tr></thead><tbody></tbody></table></div>';
document.body.append(audit);
function renderAudit() {
  const kind=audit.querySelector('select').value;
  const entries=state.history.filter(e=>kind==='ALL'||e.kind===kind);
  const body=audit.querySelector('tbody');body.replaceChildren();
  for(const entry of [...entries].reverse()){
    const row=document.createElement('tr');row.dataset.kind=entry.kind;
    for(const key of ['time','agent','kind','result','reason']){const cell=document.createElement('td');cell.textContent=entry[key];row.append(cell)}
    body.append(row);
  }
  audit.querySelector('.audit-count').textContent=entries.length+' decisions';
}
function openAudit(){if(audit.open)return;auditWasPaused=paused;setPaused(true);renderAudit();audit.showModal()}
$('.full-log').addEventListener('click',openAudit);
audit.querySelector('.close-audit').addEventListener('click',()=>audit.close());
audit.querySelector('select').addEventListener('change',renderAudit);
audit.addEventListener('close',()=>{if(!auditWasPaused&&state.elapsed<28800)setPaused(false)});
window.addEventListener('message',event=>{
  if(event.source!==parent||event.data?.type!=='grok-night-action')return;
  if(location.origin!=='null'&&event.origin!==location.origin)return;
  if(event.data.action==='replay'){if(audit.open)audit.close();reset()}
  if(event.data.action==='result'){if(audit.open)audit.close();showResult()}
  if(event.data.action==='logs')openAudit();
});
document.addEventListener('visibilitychange',()=>{previousTime=undefined});
function animate(now) {
  if(previousTime===undefined)previousTime=now;
  const delta=Math.min((now-previousTime)/1000,.1);previousTime=now;
  if(!paused&&!document.hidden){
    state.elapsed=Math.min(28800,state.elapsed+delta*120);
    while(state.eventIndex<replayEvents.length&&replayEvents[state.eventIndex].at<=state.elapsed)step();
    paintClock();if(state.elapsed>=28800)setPaused(true);
  }
  requestAnimationFrame(animate);
}
reset();requestAnimationFrame(animate);

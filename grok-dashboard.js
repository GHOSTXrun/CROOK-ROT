const desk = document.querySelector('.desk');
const viewport = document.querySelector('.desk-viewport');
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
document.querySelector('.bot-icon').addEventListener('click', function () {
  const paused = desk.classList.toggle('paused');
  this.setAttribute('aria-pressed', String(paused));
  this.setAttribute('aria-label', paused ? 'Resume dashboard animation' : 'Pause dashboard animation');
  document.querySelector('#runningLabel').textContent = paused ? 'PAUSED' : 'RUNNING';
});

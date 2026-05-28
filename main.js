// ============================================================
//  PORTRAIT DETECTION
// ============================================================
function checkOrientation() {
  const lock     = document.getElementById('portrait-lock');
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  if (isMobile && window.innerHeight > window.innerWidth) {
    lock.classList.add('active');
  } else {
    lock.classList.remove('active');
  }
}
function tryRotate() {
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
}
window.addEventListener('resize',            checkOrientation);
window.addEventListener('orientationchange', checkOrientation);
checkOrientation();

// ============================================================
//  AUDIO AMBIENTE
//  - Se activa al abrir (primer intento con autoplay)
//  - Se apaga al primer click en el mural
// ============================================================
let audioStarted = false;
const ambAudio   = document.getElementById('audio-ambiente');
ambAudio.volume  = 0.35;

function startAmbience() {
  if (!audioStarted) {
    ambAudio.play().catch(() => {
      // Autoplay bloqueado: esperamos el primer click
      document.addEventListener('click', () => {
        if (!audioStarted) {
          ambAudio.play().catch(() => {});
          audioStarted = true;
        }
      }, { once: true });
    });
    audioStarted = true;
  }
}
function stopAmbience() {
  ambAudio.pause();
  ambAudio.currentTime = 0;
  audioStarted = false;
}

// ============================================================
//  LOADING
// ============================================================
const barTop   = document.getElementById('bar-top');
const barBot   = document.getElementById('bar-bot');
const loadText = document.getElementById('load-text');

function updateBars(pct) {
  barTop.style.width = pct + '%';
  barBot.style.width = pct + '%';
}

const allImgs = document.querySelectorAll('#scene img, #balon-loader-img');
const total   = allImgs.length || 1;
let   done    = 0;

function imgDone() {
  done++;
  const pct = Math.round((done / total) * 100);
  updateBars(pct);
  loadText.textContent = 'Cargando… ' + pct + '%';
  if (done >= total) finishLoad();
}

allImgs.forEach(img => {
  if (img.complete) { imgDone(); }
  else {
    img.addEventListener('load',  imgDone);
    img.addEventListener('error', imgDone);
  }
});

// Fallback 5 s
const loadTimeout = setTimeout(finishLoad, 5000);

function finishLoad() {
  clearTimeout(loadTimeout);
  updateBars(100);
  loadText.textContent = '¡Lista!';
  setTimeout(() => {
    const loader = document.getElementById('loader');
    loader.classList.add('fade-out');
    setTimeout(() => { loader.style.display = 'none'; }, 700);
    startAmbience();
  }, 500);
}

// ============================================================
//  BALÓN SPIN — giro suave 1 vuelta en 2 s
// ============================================================
let isBallSpinning = false;

function spinBall() {
  if (isBallSpinning) return;
  isBallSpinning = true;
  const ball = document.getElementById('el-balon-center');
  ball.classList.add('spinning');
  setTimeout(() => {
    ball.classList.remove('spinning');
    isBallSpinning = false;
  }, 2000);
}

// ============================================================
//  SCENE CLICK → apagar audio + ripple + spin balón
// ============================================================
document.getElementById('scene').addEventListener('click', function (e) {
  stopAmbience();
  createRipple(e.clientX, e.clientY);
  spinBall();
});

// ============================================================
//  RIPPLE
// ============================================================
function createRipple(x, y) {
  const r = document.createElement('div');
  r.className   = 'ripple';
  r.style.left  = x + 'px';
  r.style.top   = y + 'px';
  document.body.appendChild(r);
  setTimeout(() => r.remove(), 600);
}

// ============================================================
//  GLOW SPEEDS — elementos más alejados parpadean más rápido
// ============================================================
const fastEls = ['el-nina', 'el-prof', 'el-repartidora'];
fastEls.forEach(id => {
  const el = document.getElementById(id);
  if (el) el.style.setProperty('--dur', '2.2s');
});

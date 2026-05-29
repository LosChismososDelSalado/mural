// ============================================================
//  PORTRAIT LOCK
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
//  — arranca al abrir, se apaga al primer click
// ============================================================
const ambAudio      = new Audio('assets/audios/ambiente.mp3');
ambAudio.loop       = true;
ambAudio.volume     = 0.35;
let   audioIniciado = false;

function iniciarAudio() {
  if (audioIniciado) return;
  ambAudio.play().then(() => { audioIniciado = true; }).catch(() => {});
}
function pausarAudio()   { ambAudio.pause(); }
function reanudarAudio() { if (audioIniciado) ambAudio.play().catch(() => {}); }

window.addEventListener('load', () => {
  ambAudio.play().then(() => { audioIniciado = true; }).catch(() => {
    document.addEventListener('click',      iniciarAudio, { once: true });
    document.addEventListener('touchstart', iniciarAudio, { once: true });
  });
});

// ============================================================
//  LOADER INICIAL
// ============================================================
const barTop   = document.getElementById('bar-top');
const barBot   = document.getElementById('bar-bot');
const loadText = document.getElementById('load-text');

const allImgs = document.querySelectorAll('#mural-container img, #balon-loader-img');
const total   = allImgs.length || 1;
let   done    = 0;

function imgDone() {
  done++;
  const pct = Math.round((done / total) * 100);
  barTop.style.width = pct + '%';
  barBot.style.width = pct + '%';
  loadText.textContent = 'Cargando… ' + pct + '%';
  if (done >= total) finishLoader();
}
allImgs.forEach(img => {
  if (img.complete) imgDone();
  else { img.addEventListener('load', imgDone); img.addEventListener('error', imgDone); }
});
const loaderTimeout = setTimeout(finishLoader, 5000);

function finishLoader() {
  clearTimeout(loaderTimeout);
  barTop.style.width = barBot.style.width = '100%';
  loadText.textContent = '¡Lista!';
  setTimeout(() => {
    const loader = document.getElementById('loader');
    loader.classList.add('fade-out');
    setTimeout(() => { loader.style.display = 'none'; }, 700);
    iniciarAudio();
  }, 400);
}

// ============================================================
//  BALÓN + GRIETA VERDE
//  — mínimo 1.3 s en cada click; si algo tarda más, espera real
// ============================================================
const balon       = document.getElementById('balon-loader');
const grietaVerde = document.getElementById('grieta-verde');
const MIN_MS      = 1300;
let   cargaStart  = 0;
let   cargando    = false;

function iniciarCarga(durEstimada = 1.3) {
  if (cargando) return;
  cargando    = true;
  cargaStart  = Date.now();
  pausarAudio();

  balon.classList.add('girando');

  const dur = Math.max(durEstimada, MIN_MS / 1000);
  grietaVerde.style.setProperty('--duracion-carga', dur + 's');
  grietaVerde.classList.remove('ocultar', 'cargando');
  void grietaVerde.offsetWidth; // forzar reflow
  grietaVerde.classList.add('cargando');
}

function terminarCarga() {
  const restante = Math.max(0, MIN_MS - (Date.now() - cargaStart));
  setTimeout(() => {
    balon.classList.remove('girando');
    grietaVerde.classList.remove('cargando');
    grietaVerde.classList.add('ocultar');
    setTimeout(() => {
      grietaVerde.classList.remove('ocultar');
      grietaVerde.style.clipPath = 'inset(50% 0% 50% 0%)';
      grietaVerde.style.opacity  = '0';
      cargando = false;
      reanudarAudio();
    }, 400);
  }, restante);
}

// ============================================================
//  ZONAS CLICKEABLES — hover + click
// ============================================================
document.querySelectorAll('.zona').forEach(zona => {
  const targetId = zona.dataset.target;
  const targetEl = targetId ? document.getElementById(targetId) : null;

  // Hover / touch: encender apagar brillo
  function encender() {
    if (!targetEl) return;
    targetEl.style.animation = 'none';
    targetEl.classList.add('hover-on');
  }
  function apagar() {
    if (!targetEl) return;
    targetEl.classList.remove('hover-on');
    targetEl.style.animation = '';
  }
  zona.addEventListener('mouseenter',  encender);
  zona.addEventListener('mouseleave',  apagar);
  zona.addEventListener('touchstart',  encender, { passive: true });
  zona.addEventListener('touchend',    apagar);
  zona.addEventListener('touchcancel', apagar);

  // Click — siempre arranca balón 1.3 s
  function alClick(e) {
    createRipple(e.clientX ?? e.touches?.[0]?.clientX ?? 0,
                 e.clientY ?? e.touches?.[0]?.clientY ?? 0);
    iniciarCarga(1.3);
    // ── aquí irán las acciones de cada zona más adelante ──
    setTimeout(() => terminarCarga(), 0);
  }
  zona.addEventListener('click',      alClick);
  zona.addEventListener('touchstart', alClick, { passive: true });
});

// ============================================================
//  RIPPLE
// ============================================================
function createRipple(x, y) {
  const r = document.createElement('div');
  r.className  = 'ripple';
  r.style.left = x + 'px';
  r.style.top  = y + 'px';
  document.body.appendChild(r);
  setTimeout(() => r.remove(), 600);
}

// ============================================================
//  RESIZE — recalcular contenedor
// ============================================================
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const c  = document.getElementById('mural-container');
    if (!c) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    c.style.width  = Math.min(vw, vh * 9 / 4) + 'px';
    c.style.height = Math.min(vh, vw * 4 / 9) + 'px';
  }, 100);
});
window.dispatchEvent(new Event('resize'));
screen.orientation?.addEventListener('change', () =>
  setTimeout(() => window.dispatchEvent(new Event('resize')), 300)
);

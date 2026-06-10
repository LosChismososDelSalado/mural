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
//  — arranca al terminar el loader (intro + mural principal)
//  — se pausa al tocar cualquier zona clickeable
//  — se reanuda al cerrar cualquier modal y regresar al mural
// ============================================================
const ambAudio      = new Audio('assets/ambiente.mp3');
ambAudio.loop       = true;
ambAudio.volume     = 0.11;
ambAudio.muted      = false;
let   audioIniciado = false;

function iniciarAudio() {
  if (audioIniciado) return;
  ambAudio.play().then(() => { audioIniciado = true; }).catch(() => {});
}
function pausarAudio()   { ambAudio.pause(); ambAudio.volume = 0; }
function reanudarAudio() { ambAudio.volume = 0.11; if (audioIniciado) ambAudio.play().catch(() => {}); }

// Detener audio cuando el navegador va al fondo (móvil o escritorio)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    ambAudio.pause();
  } else if (audioIniciado) {
    ambAudio.volume = 0.11;
    ambAudio.play().catch(() => {});
  }
});
window.addEventListener('pagehide', () => { ambAudio.pause(); });

// ============================================================
//  LOADER INICIAL
// ============================================================
const barTop   = document.getElementById('bar-top');
const barBot   = document.getElementById('bar-bot');
const loadText = document.getElementById('load-text');

const allImgs   = document.querySelectorAll('#mural-container img, #balon-loader-img');
const total     = allImgs.length || 1;
let   done      = 0;
let   loaderDone = false;   // ← bandera: solo se ejecuta UNA vez

function imgDone() {
  if (loaderDone) return;   // ya terminó, ignorar llamadas extra
  done++;
  const pct = Math.min(Math.round((done / total) * 100), 99); // no llegar a 100 hasta finish
  barTop.style.width = pct + '%';
  barBot.style.width = pct + '%';
  loadText.textContent = 'Cargando… ' + pct + '%';
  if (done >= total) finishLoader();
}

allImgs.forEach(img => {
  if (img.complete) {
    // Imagen ya cacheada: esperar al siguiente tick para no bloquear el render
    setTimeout(imgDone, 0);
  } else {
    img.addEventListener('load',  imgDone);
    img.addEventListener('error', imgDone);
  }
});

// Fallback: si en 6s no terminó, forzar cierre
const loaderTimeout = setTimeout(finishLoader, 6000);

function finishLoader() {
  if (loaderDone) return;   // ← evita doble ejecución
  loaderDone = true;
  clearTimeout(loaderTimeout);

  // Llevar barra a 100% visualmente
  barTop.style.width = barBot.style.width = '100%';
  loadText.textContent = '¡Lista!';

  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (!loader) return;
    loader.classList.add('fade-out');
    setTimeout(() => {
      loader.style.display = 'none';
    }, 700);
  }, 0);
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
  cargando   = true;
  cargaStart = Date.now();

  balon.classList.add('girando');

  // Reset completo del estado de la grieta
  grietaVerde.style.transition  = 'none';
  grietaVerde.style.opacity     = '1';
  grietaVerde.style.clipPath    = 'inset(50% 0% 50% 0%)';
  grietaVerde.classList.remove('ocultar', 'cargando');
  void grietaVerde.offsetWidth;

  const dur = Math.max(durEstimada, MIN_MS / 1000);
  grietaVerde.style.setProperty('--duracion-carga', dur + 's');
  grietaVerde.classList.add('cargando');
}

function terminarCarga() {
  const restante = Math.max(0, MIN_MS - (Date.now() - cargaStart));
  setTimeout(() => {
    balon.classList.remove('girando');
    grietaVerde.style.transition = '';
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
//  REFERENCIA — mostrar/ocultar overlay de referencia
// ============================================================
function mostrarReferencia() {}
function ocultarReferencia() {}

// ============================================================
//  ZONAS CLICKEABLES — hover + click
// ============================================================
document.querySelectorAll('.zona').forEach(zona => {
  const targetId = zona.dataset.target;
  const targetEl = targetId ? document.getElementById(targetId) : null;

  // Click — arranca audio en el primero; pausa en los siguientes
  function alClick(e) {
    createRipple(e.clientX ?? e.touches?.[0]?.clientX ?? 0,
                 e.clientY ?? e.touches?.[0]?.clientY ?? 0);

    if (!audioIniciado) {
      iniciarAudio();
    } else {
      pausarAudio();
    }

    mostrarReferencia();
    iniciarCarga(1.5);

    if (zona.id === 'zona-creditos') {
      setTimeout(() => {
        terminarCarga();
        setTimeout(() => { ocultarReferencia(); }, 1000);
        abrirCreditos();
      }, 1500);
      return;
    }

    if (zona.id === 'zona-nina') {
      setTimeout(() => {
        terminarCarga();
        abrirNina();
      }, 1500);
      return;
    }

    if (zona.id === 'zona-historia') {
      setTimeout(() => {
        terminarCarga();
        // Marcar audioIniciado=false para que reanudarAudio() de terminarCarga no reactive el audio
        audioIniciado = false;
        abrirHistoriaMural();
      }, 1500);
      return;
    }

    if (zona.id === 'zona-nosotras') {
      setTimeout(() => {
        terminarCarga();
        activarGalaxia();
      }, 1500);
      return;
    }

    if (zona.id === 'zona-jugadoras') {
      setTimeout(() => {
        terminarCarga();
        abrirCarruselJugadoras();
      }, 1500);
      return;
    }

    const VIDEO_MAP = {
      'zona-futbolista' : 'assets/video-futbolista.webm',
      'zona-doctora'    : 'assets/video-doctora.webm',
      'zona-ingeniera'  : 'assets/video-ingeniera.webm',
      'zona-maestra'    : 'assets/video-maestra.webm',
      'zona-bombera'    : 'assets/video-bombera.webm',
      'zona-repartidora': 'assets/video-repartidora.webm',
      'zona-azteca'     : 'assets/reflejos.webm',
    };
    if (VIDEO_MAP[zona.id]) {
      setTimeout(() => {
        terminarCarga();
        abrirVideoModal(VIDEO_MAP[zona.id], zona.id.replace('zona-',''));
      }, 1500);
      return;
    }

    setTimeout(() => {
      terminarCarga();
      setTimeout(() => { ocultarReferencia(); }, 1000);
      // ── aquí irán las acciones de cada zona más adelante ──
    }, 1500);
  }
  zona.addEventListener('click',      alClick);
  zona.addEventListener('touchstart', alClick, { passive: true });
});

// ============================================================
//  GALAXIA DE CORAZONES (zona-nosotras)
// ============================================================
const frasesCorazones = [
  { t: "DEL OLVIDO A LA HISTORIA",                              s: "El rescate de la identidad de las pioneras de 1971",       c: "#00ffcc", f: "'Bebas Neue'",        mp3: "assets/del-olvido.mp3",    img: "assets/corazon.png"  },
  { t: "SI LLEGA UNA, LLEGAMOS TODAS",                          s: "La fuerza de la sororidad que nos une",                    c: "#ff6600", f: "'Permanent Marker'",  mp3: "assets/si-llega-una.mp3", img: "assets/corazon.png"  },
  { t: "TU FUERZA INSPIRA A LA NIÑA QUE HOY TE MIRA",          s: "Conexión entre la niña y las mujeres del mural",           c: "#ff3399", f: "'Caveat'",            mp3: "assets/tu-fuerza.mp3",     img: "assets/corazon.png"  },
  { t: "AYER REBELDES, HOY EJEMPLO",                            s: "Del estigma de 1971 al reconocimiento del 2026",           c: "#cc33ff", f: "'Playfair Display'",  mp3: "assets/ayer-rebeldes.mp3", img: "assets/corazon.png"  },
  { t: "HOY NUESTRA VOZ NO TIENE SILENCIO",                     s: "El fin del anonimato histórico",                           c: "#ffff00", f: "'Montserrat'",        mp3: "assets/hoy-nuestra.mp3",   img: "assets/corazon.png"  },
  { t: "EL CAMPO DE JUEGO HOY ES NUESTRO",                      s: "Reclamo de los espacios profesionales",                    c: "#00ff99", f: "'Bebas Neue'",        mp3: "assets/el-campo.mp3",      img: "assets/corazon.png"  },
  { t: "CAMINAMOS SOBRE LOS PASOS DE LAS QUE NO SE RINDIERON",  s: "Homenaje a las pioneras de 1971",                         c: "#ff9900", f: "'Permanent Marker'",  mp3: "assets/caminamos.mp3",     img: "assets/corazon.png"  },
  { t: "SOMOS EL GRITO DE LAS QUE NO PUDIERON ALZAR LA VOZ",    s: "Justicia histórica para las borradas",                    c: "#66ffff", f: "'Caveat'",            mp3: "assets/somos-el.mp3",      img: "assets/corazon.png"  },
  { t: "ROMPE EL TECHO DE CRISTAL CON LA FUERZA DE TUS SUEÑOS", s: "Superación de barreras laborales",                        c: "#ff66cc", f: "'Montserrat'",        mp3: "assets/rompe-el.mp3",      img: "assets/corazon.png"  },
  { t: "HEREDERAS DE UN SUEÑO QUE NUNCA DEJÓ DE LATIR",         s: "La continuidad que une ambas épocas",                     c: "#ffcc00", f: "'Playfair Display'",  mp3: "assets/herederas.mp3",     img: "assets/corazon.png" },
  { t: "MIS SUEÑOS SON VÁLIDOS, Y MEREZCO LUCHAR POR ELLOS",    s: "Empoderamiento frente a los prejuicios",                  c: "#ff3333", f: "'Bebas Neue'",        mp3: "assets/mis-suenos.mp3",    img: "assets/corazon.png" },
  { t: "NACISTE PARA HACER HISTORIA, NO PARA VERLA PASAR",      s: "Invitación a ser parte activa del cambio",                c: "#33ffcc", f: "'Permanent Marker'",  mp3: "assets/naciste.mp3",       img: "assets/corazon.png" },
  { t: "TU TRIUNFO ES EL DE TODAS",                             s: "El éxito de una como victoria compartida",                c: "#ff99cc", f: "'Caveat'",            mp3: "assets/tu-triunfo.mp3",    img: "assets/corazon.png" },
  { t: "TRANSFORMAMOS LA RESISTENCIA EN LIBERTAD",              s: "El resultado de décadas de lucha por la equidad",         c: "#99ff33", f: "'Montserrat'",        mp3: "assets/transformamos.mp3", img: "assets/corazon.png" },
  { t: "EL FUTURO TIENE NOMBRE DE MUJER Y FUERZA DE GUERRERA",  s: "Visión de esperanza y liderazgo",                         c: "#ffaa00", f: "'Playfair Display'",  mp3: "assets/el-futuro.mp3",     img: "assets/corazon.png" },
  { t: "MUJERES DE LA PAZ, EJEMPLO DE LUCHA Y GRANDEZA",        s: "Trabajadoras, valientes y dueñas de su propio destino",   c: "#ff6699", f: "'Permanent Marker'",  mp3: "assets/historia-1.mp3",    img: "assets/corazon-base.png", esBase: true },
];

let corazonesActivo     = false;
let corazonesRaf        = null;
let corazonesAbiertos   = 0;
let audioCorazonActual  = null;
let corazonFraseVisible = false;

function pausarAmbiente() { pausarAudio(); }

const _actx = window.AudioContext ? new AudioContext() : null;
function sonarColision() {
  if (!_actx) return;
  try {
    const o = _actx.createOscillator(), g = _actx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(1200, _actx.currentTime);
    o.frequency.exponentialRampToValueAtTime(600, _actx.currentTime + 0.18);
    g.gain.setValueAtTime(0.06, _actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, _actx.currentTime + 0.22);
    o.connect(g); g.connect(_actx.destination);
    o.start(); o.stop(_actx.currentTime + 0.22);
  } catch(e) {}
}

function brilloColision(x, y, cont) {
  const d = document.createElement('div');
  d.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:24px;height:24px;
    border-radius:50%;background:radial-gradient(circle,rgba(255,220,255,1),rgba(255,100,200,0));
    transform:translate(-50%,-50%) scale(0);pointer-events:none;z-index:125;
    transition:transform 0.18s ease-out,opacity 0.25s ease;`;
  cont.appendChild(d);
  requestAnimationFrame(() => { d.style.transform='translate(-50%,-50%) scale(1.8)'; });
  setTimeout(() => { d.style.opacity='0'; setTimeout(()=>d.remove(),250); }, 180);
}

function cerrarGalaxia() {
  if (!corazonesActivo) return;
  corazonesActivo = false;
  if (corazonesRaf) { cancelAnimationFrame(corazonesRaf); corazonesRaf = null; }
  if (audioCorazonActual) { audioCorazonActual.pause(); audioCorazonActual = null; }
  const contFr    = document.getElementById('frases-container');
  const overlay   = document.getElementById('galaxia-overlay');
  const btnCerrar = document.getElementById('cerrar-galaxia');
  // Marco se limpia con contFr.innerHTML = '' abajo
  contFr.innerHTML = '';
  overlay.style.opacity = '0';
  btnCerrar.style.display = 'none';
  setTimeout(() => { overlay.style.display = 'none'; }, 500);
  document.querySelectorAll('.zona').forEach(z => z.style.pointerEvents = '');
  // Restaurar personajes y eliminar capa oscura
  _galData.forEach(({ el, zOrig, posOrig }) => {
    if (el) { el.style.zIndex = zOrig || ''; el.style.position = posOrig || ''; }
  });
  _galData = [];
  const oscuraGalEl = document.getElementById('gal-oscura');
  if (oscuraGalEl) oscuraGalEl.remove();
  audioIniciado = true;
  ambAudio.currentTime = 0;
  ambAudio.play().catch(() => {});
}

// Personajes visibles en la galaxia
const _galPers = ['glow-jugadoras','glow-bombera','glow-repartidora','glow-ingeniera',
                  'glow-doctora','glow-maestra','glow-futbolista'];
const _galFrente = new Set(['glow-bombera','glow-maestra']);
let _galData = [];

function activarGalaxia() {
  if (corazonesActivo) return;
  corazonesActivo     = true;
  corazonesAbiertos   = 0;
  corazonFraseVisible = false;
  ambAudio.pause();
  ambAudio.currentTime = 0;
  audioIniciado = false;

  // Traer personajes al frente (encima del overlay z:119)
  _galData = _galPers.map(id => {
    const el = document.getElementById(id);
    return { el, zOrig: el?.style.zIndex, posOrig: el?.style.position };
  });
  _galData.forEach(({ el }, i) => {
    if (el) { el.style.zIndex = _galFrente.has(_galPers[i]) ? '121' : '120'; el.style.position = 'absolute'; }
  });

  // Capa oscura 60% encima de personajes, debajo de corazones
  const oscuraGal = document.createElement('div');
  oscuraGal.id = 'gal-oscura';
  oscuraGal.style.cssText = 'position:absolute;inset:0;z-index:122;background:rgba(0,0,0,0.6);pointer-events:none;';
  document.getElementById('mural-container').appendChild(oscuraGal);

  document.querySelectorAll('.zona').forEach(z => z.style.pointerEvents = 'none');

  const overlay   = document.getElementById('galaxia-overlay');
  const contFr    = document.getElementById('frases-container');
  const btnCerrar = document.getElementById('cerrar-galaxia');

  overlay.style.display = 'block';
  setTimeout(() => overlay.style.opacity = '1', 10);
  btnCerrar.style.display = 'flex';
  btnCerrar.onclick = cerrarGalaxia;

  // Tocar en cualquier parte cierra la frase activa
  overlay.addEventListener('click', () => { if (corazonFraseVisible) ocultarFrase(); });
  overlay.addEventListener('touchstart', (e) => {
    if (corazonFraseVisible) { e.preventDefault(); ocultarFrase(); }
  }, { passive: false });

  const cont = document.getElementById('mural-container');
  const W    = cont.offsetWidth;
  const H    = cont.offsetHeight;
  const SIZE = Math.round(W * 0.07);

  // ── Marco decorativo con efecto holográfico ───────────────────
  if (!document.getElementById('marco-holo-kf')) {
    const sk = document.createElement('style'); sk.id = 'marco-holo-kf';
    sk.textContent = `
      @keyframes marcoHoloShift {
        0%   { background-position: 0% 0%;    }
        25%  { background-position: 100% 0%;  }
        50%  { background-position: 100% 100%;}
        75%  { background-position: 0% 100%;  }
        100% { background-position: 0% 0%;    }
      }
      @keyframes marcoPrismSweep {
        0%   { transform: translateX(-130%) skewX(-18deg); opacity:0;   }
        10%  { opacity: 0.90; }
        45%  { opacity: 0.70; }
        55%  { opacity: 0;    }
        100% { transform: translateX(230%) skewX(-18deg); opacity:0;   }
      }
      .corazon-holo-wrap { position:relative; width:100%; height:100%; }
      .corazon-holo-wrap img { position:absolute;inset:0;width:100%;height:100%;object-fit:contain; }
      .corazon-shimmer {
        position:absolute;inset:0;pointer-events:none;
        background-size:300% 300%;
        animation:marcoHoloShift var(--hd,3.5s) ease-in-out infinite;
        mix-blend-mode:screen;opacity:0.80;
      }
      .corazon-prism-wrap {
        position:absolute;inset:0;pointer-events:none;overflow:hidden;
      }
      .corazon-prism-beam {
        position:absolute;top:0;left:0;height:100%;
        animation:marcoPrismSweep var(--pd,4s) ease-in-out infinite;
        mix-blend-mode:screen;
      }
    `;
    document.head.appendChild(sk);
  }

  // 15 gradientes holográficos únicos para los corazones flotantes
  const CORAZON_HOLOS = [
    { g:`linear-gradient(115deg,transparent 0%,rgba(255,0,128,.32) 15%,rgba(255,200,0,.28) 30%,rgba(0,255,128,.28) 50%,rgba(0,180,255,.32) 65%,rgba(180,0,255,.28) 80%,transparent 100%)`, hd:'3.2s', pg:`linear-gradient(90deg,transparent 0%,rgba(255,0,0,.20) 14%,rgba(255,255,0,.35) 35%,rgba(0,200,255,.35) 60%,rgba(150,0,255,.20) 86%,transparent 100%)`, pw:'42%', pd:'4.0s' },
    { g:`linear-gradient(90deg,transparent 0%,rgba(200,240,255,.18) 20%,rgba(255,255,255,.70) 45%,rgba(180,230,255,.65) 55%,rgba(200,220,255,.18) 80%,transparent 100%)`, hd:'2.2s', pg:`linear-gradient(90deg,transparent 0%,rgba(255,50,100,.92) 48%,rgba(255,200,210,.98) 50%,rgba(255,50,100,.92) 52%,transparent 100%)`, pw:'16%', pd:'1.8s' },
    { g:`linear-gradient(135deg,transparent 0%,rgba(255,255,255,.10) 28%,rgba(255,255,255,.85) 48%,rgba(240,248,255,.90) 50%,rgba(255,255,255,.85) 52%,transparent 100%)`, hd:'1.8s', pg:`linear-gradient(90deg,transparent 0%,rgba(0,255,255,.88) 44%,rgba(255,255,255,.98) 50%,rgba(0,255,255,.88) 56%,transparent 100%)`, pw:'20%', pd:'1.4s' },
    { g:`linear-gradient(160deg,transparent 0%,rgba(0,255,120,.26) 18%,rgba(0,200,255,.44) 34%,rgba(120,0,255,.38) 50%,rgba(0,200,180,.44) 68%,transparent 100%)`, hd:'4.0s', pg:`linear-gradient(90deg,transparent 0%,rgba(240,242,255,.80) 34%,rgba(255,255,255,.92) 50%,rgba(225,228,255,.80) 66%,transparent 100%)`, pw:'40%', pd:'3.2s' },
    { g:`radial-gradient(ellipse at 50% 50%,rgba(255,200,240,.48) 0%,rgba(200,255,240,.44) 28%,rgba(200,220,255,.44) 54%,transparent 100%)`, hd:'3.0s', pg:`linear-gradient(90deg,transparent 0%,rgba(235,238,255,.88) 50%,transparent 100%)`, pw:'34%', pd:'2.8s' },
    { g:`linear-gradient(90deg,transparent 0%,rgba(0,255,255,.10) 18%,rgba(255,0,255,.58) 32%,rgba(0,255,255,.68) 48%,rgba(255,0,255,.58) 64%,rgba(0,255,255,.10) 82%,transparent 100%)`, hd:'1.2s', pg:`linear-gradient(90deg,transparent 0%,rgba(0,255,120,.85) 44%,rgba(200,255,200,.95) 50%,rgba(0,255,100,.85) 56%,transparent 100%)`, pw:'18%', pd:'1.6s' },
    { g:`linear-gradient(80deg,transparent 0%,rgba(60,0,255,.22) 12%,rgba(0,100,255,.52) 30%,rgba(200,0,255,.58) 50%,rgba(0,80,255,.52) 70%,transparent 100%)`, hd:'2.0s', pg:`linear-gradient(90deg,transparent 0%,rgba(255,210,0,.64) 28%,rgba(255,255,200,.92) 50%,rgba(255,210,0,.64) 72%,transparent 100%)`, pw:'50%', pd:'2.0s' },
    { g:`linear-gradient(100deg,transparent 0%,rgba(200,80,0,.22) 12%,rgba(255,165,0,.58) 30%,rgba(255,225,100,.74) 50%,rgba(255,145,0,.58) 70%,transparent 100%)`, hd:'2.5s', pg:`linear-gradient(90deg,transparent 0%,rgba(210,130,255,.60) 36%,rgba(255,210,255,.74) 50%,rgba(200,130,255,.60) 64%,transparent 100%)`, pw:'38%', pd:'4.8s' },
    { g:`linear-gradient(120deg,rgba(255,0,0,.20) 0%,rgba(255,100,0,.22) 14%,rgba(255,255,0,.20) 28%,rgba(0,255,100,.20) 42%,rgba(0,100,255,.22) 56%,rgba(100,0,255,.22) 70%,rgba(255,0,200,.20) 84%,rgba(255,0,0,.20) 100%)`, hd:'5.0s', pg:`linear-gradient(90deg,transparent 0%,rgba(215,235,255,.62) 34%,rgba(255,255,255,.72) 50%,rgba(185,218,255,.62) 66%,transparent 100%)`, pw:'42%', pd:'5.5s' },
    { g:`radial-gradient(ellipse at 30% 40%,rgba(200,0,255,.52) 0%,rgba(0,50,255,.42) 35%,rgba(255,0,150,.38) 65%,transparent 90%)`, hd:'3.8s', pg:`linear-gradient(90deg,transparent 0%,rgba(255,155,50,.60) 26%,rgba(255,210,155,.74) 44%,rgba(255,100,200,.68) 62%,transparent 100%)`, pw:'44%', pd:'3.0s' },
    { g:`linear-gradient(105deg,transparent 0%,rgba(255,220,240,.18) 20%,rgba(255,255,255,.74) 38%,rgba(255,200,230,.82) 50%,rgba(255,255,255,.74) 62%,transparent 100%)`, hd:'2.4s', pg:`linear-gradient(90deg,transparent 0%,rgba(255,255,255,.96) 48%,rgba(255,255,255,1) 50%,rgba(255,255,255,.96) 52%,transparent 100%)`, pw:'12%', pd:'2.5s' },
    { g:`linear-gradient(145deg,transparent 0%,rgba(100,200,0,.20) 14%,rgba(200,220,0,.52) 30%,rgba(255,240,100,.68) 48%,rgba(180,210,0,.52) 64%,transparent 100%)`, hd:'3.1s', pg:`linear-gradient(90deg,transparent 0%,rgba(0,255,120,.22) 14%,rgba(0,255,200,.52) 35%,rgba(0,255,100,.22) 58%,transparent 100%)`, pw:'52%', pd:'4.2s' },
    { g:`radial-gradient(ellipse at 60% 30%,rgba(180,255,240,.42) 0%,rgba(255,180,255,.38) 32%,rgba(180,200,255,.38) 62%,transparent 88%)`, hd:'5.0s', pg:`linear-gradient(90deg,transparent 0%,rgba(180,230,255,.72) 42%,rgba(220,245,255,.86) 50%,rgba(170,225,255,.72) 58%,transparent 100%)`, pw:'36%', pd:'6.0s' },
    { g:`linear-gradient(70deg,transparent 0%,rgba(0,255,80,.14) 12%,rgba(100,255,150,.60) 30%,rgba(200,255,200,.72) 50%,rgba(80,255,120,.60) 70%,transparent 100%)`, hd:'1.9s', pg:`linear-gradient(90deg,transparent 0%,rgba(255,120,50,.62) 26%,rgba(255,220,200,.86) 50%,rgba(255,100,40,.62) 74%,transparent 100%)`, pw:'38%', pd:'2.2s' },
    { g:`linear-gradient(45deg,transparent 0%,rgba(255,100,200,.22) 12%,rgba(100,200,255,.48) 26%,rgba(255,255,100,.52) 42%,rgba(100,255,200,.48) 58%,rgba(200,100,255,.48) 72%,transparent 100%)`, hd:'3.3s', pg:`linear-gradient(90deg,transparent 0%,rgba(200,255,50,.62) 28%,rgba(255,255,100,.80) 50%,rgba(180,255,30,.62) 72%,transparent 100%)`, pw:'42%', pd:'2.8s' },
  ];

  // Wrapper del marco — 1 solo marco visible, efectos superpuestos
  const marcoWrap = document.createElement('div');
  marcoWrap.style.cssText = `position:absolute;left:${W*(0.00)}px;top:0;bottom:0;
    width:${W}px;height:100%;pointer-events:none;z-index:121;overflow:hidden;`;

  // Capa 1 — imagen del marco
  const marcoEl = document.createElement('img');
  marcoEl.src = 'assets/nosotras-marco.png';
  marcoEl.id  = 'nosotras-marco-el';
  marcoEl.style.cssText = `position:absolute;inset:0;width:100%;height:100%;
    object-fit:contain;object-position:center;
    animation:PulsacionNeon 3s linear infinite;animation-delay:-1.5s;`;
  marcoWrap.appendChild(marcoEl);

  // Capa 2 — shimmer holográfico arcoíris (sobre el marco)
  const marcoHolo = document.createElement('div');
  marcoHolo.style.cssText = `position:absolute;inset:0;pointer-events:none;
    background:linear-gradient(115deg,
      transparent 0%,rgba(255,0,128,.28) 12%,rgba(255,165,0,.22) 22%,
      rgba(255,255,0,.20) 32%,rgba(0,255,128,.22) 44%,rgba(0,200,255,.26) 54%,
      rgba(100,0,255,.22) 64%,rgba(255,0,200,.20) 74%,transparent 100%);
    background-size:300% 300%;
    animation:marcoHoloShift 3.5s ease-in-out infinite;
    mix-blend-mode:screen;opacity:0.60;
    mask-image:url('assets/nosotras-marco.png');mask-size:contain;mask-position:center;mask-repeat:no-repeat;
    -webkit-mask-image:url('assets/nosotras-marco.png');-webkit-mask-size:contain;-webkit-mask-position:center;-webkit-mask-repeat:no-repeat;`;
  marcoWrap.appendChild(marcoHolo);

  // Capa 3 — barrido de luz prismática (sobre el marco)
  const marcoPrismWrap = document.createElement('div');
  marcoPrismWrap.style.cssText = `position:absolute;inset:0;pointer-events:none;overflow:hidden;
    mask-image:url('assets/nosotras-marco.png');mask-size:contain;mask-position:center;mask-repeat:no-repeat;
    -webkit-mask-image:url('assets/nosotras-marco.png');-webkit-mask-size:contain;-webkit-mask-position:center;-webkit-mask-repeat:no-repeat;`;
  const marcoPrismBeam = document.createElement('div');
  marcoPrismBeam.style.cssText = `position:absolute;top:0;left:0;width:40%;height:100%;
    background:linear-gradient(90deg,
      transparent 0%,rgba(255,0,0,.18) 14%,rgba(255,255,0,.32) 28%,
      rgba(0,255,80,.32) 42%,rgba(0,200,255,.32) 56%,
      rgba(150,0,255,.32) 72%,rgba(255,0,200,.18) 88%,transparent 100%);
    animation:marcoPrismSweep 4.5s ease-in-out infinite;
    animation-delay:-1.2s;mix-blend-mode:screen;`;
  marcoPrismWrap.appendChild(marcoPrismBeam);
  marcoWrap.appendChild(marcoPrismWrap);

  contFr.appendChild(marcoWrap);

  const frasePanel = document.createElement('div');
  frasePanel.id = 'corazon-frase-panel';
  frasePanel.style.cssText = `position:absolute;left:50%;top:25%;transform:translateX(-50%);
    z-index:130;text-align:center;max-width:70%;pointer-events:none;
    opacity:0;transition:opacity 0.4s ease;`;
  contFr.appendChild(frasePanel);

  const baseData = frasesCorazones.find(f => f.esBase);
  const baseEl   = document.createElement('div');
  baseEl.id      = 'corazon-base-el';
  baseEl.style.cssText = `position:absolute;left:${W/2}px;top:${H/2}px;
    width:${SIZE*1.11}px;height:${SIZE*1.11}px;
    transform:translate(-50%,-50%);
    z-index:122;pointer-events:none;cursor:default;
    animation:corazonLatido 1.2s ease-in-out infinite, aurora 3s linear infinite;`;
  baseEl.innerHTML = `<img src="${baseData.img}" style="width:100%;height:100%;object-fit:contain;"
    onerror="this.style.fontSize='${SIZE*1.1}px';this.style.textAlign='center';this.style.display='block';this.textContent='💜';">`;
  contFr.appendChild(baseEl);

  const flotantes = frasesCorazones.filter(f => !f.esBase);
  const objs = [];

  // Límites de rebote — borde interno del marco
  const BX1=W*0.04, BX2=W*0.96, BY1=H*0.05, BY2=H*0.95;

  // Variaciones de tamaño para cada corazón (0.55× a 1.4× del SIZE base)
  const SIZE_VARS = [0.65, 1.0, 0.8, 1.3, 0.55, 1.15, 0.7, 0.95, 1.4, 0.6, 1.1, 0.75, 1.25, 0.85, 1.0];

  flotantes.forEach((data, index) => {
    const sizeM = SIZE * (SIZE_VARS[index % SIZE_VARS.length] || 1);
    const el = document.createElement('div');
    el.className = 'corazon-flotante';
    el.style.cssText = `position:absolute;
      width:${sizeM}px;height:${sizeM}px;
      transform:translate(-50%,-50%);
      z-index:121;cursor:pointer;pointer-events:auto;
      transition:opacity 0.35s ease, transform 0.35s ease;`;
    const ch = CORAZON_HOLOS[index % CORAZON_HOLOS.length];
    el.innerHTML = `
      <div class="corazon-holo-wrap">
        <img src="${data.img}"
          onerror="this.style.fontSize='${sizeM*.85}px';this.style.textAlign='center';this.style.lineHeight='1';this.style.display='block';this.textContent='❤️';">
        <div class="corazon-shimmer" style="
          background:${ch.g};
          --hd:${ch.hd};
          mask-image:url('${data.img}');mask-size:100% 100%;
          -webkit-mask-image:url('${data.img}');-webkit-mask-size:100% 100%;"></div>
        <div class="corazon-prism-wrap" style="
          mask-image:url('${data.img}');mask-size:100% 100%;
          -webkit-mask-image:url('${data.img}');-webkit-mask-size:100% 100%;">
          <div class="corazon-prism-beam" style="
            width:${ch.pw};
            background:${ch.pg};
            --pd:${ch.pd};
            animation-delay:-${(Math.random()*4).toFixed(2)}s;"></div>
        </div>
      </div>`;
    contFr.appendChild(el);

    let x, y, intentos = 0;
    do {
      const spawnW = Math.max(1, (BX2 - BX1) - sizeM*2);
      const spawnH = Math.max(1, (BY2 - BY1) - sizeM*2);
      x = BX1 + sizeM + Math.random() * spawnW;
      y = BY1 + sizeM + Math.random() * spawnH;
      intentos++;
    } while (Math.hypot(x - W/2, y - H/2) < sizeM*3 && intentos < 50);

    const speed = 0.28 + Math.random() * 0.32;
    const angle = Math.random() * Math.PI * 2;
    const delayAurora = -(index * (3 / flotantes.length)).toFixed(2);
    el.style.animationDelay = `0s, ${delayAurora}s`;

    const obj   = { el, data, x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, r: sizeM/2,
                    sizeBase: sizeM, sizePeriod: 3 + Math.random()*8, sizePhase: Math.random()*Math.PI*2,
                    abierto: false };
    objs.push(obj);
    el.style.left = x + 'px';
    el.style.top  = y + 'px';

    function abrirCorazon(e) {
      if (e) e.stopPropagation();
      if (obj.abierto || corazonFraseVisible) return;
      obj.abierto         = true;
      corazonFraseVisible = true;
      corazonesAbiertos++;

      // Explosión con fragmentos
      const rect     = el.getBoundingClientRect();
      const contRect = contFr.getBoundingClientRect();
      const cx = rect.left - contRect.left + rect.width/2;
      const cy = rect.top  - contRect.top  + rect.height/2;

      const colores = ['#ff3399','#ff6600','#ffff00','#00ffcc',
                       '#cc33ff','#00ff99','#66ffff','#ff3333',
                       '#ffcc00','#99ff33','#ff66cc','#ffaa00'];

      for (let i = 0; i < 18; i++) {
        const frag  = document.createElement('div');
        const color = colores[Math.floor(Math.random() * colores.length)];
        const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.5;
        const dist  = 60 + Math.random() * 120;
        const fx    = Math.cos(angle) * dist;
        const fy    = Math.sin(angle) * dist;
        const fr    = (Math.random() - 0.5) * 720;
        const size  = 8 + Math.random() * 16;
        frag.style.cssText = `
          position:absolute;
          left:${cx}px; top:${cy}px;
          width:${size}px; height:${size}px;
          background:${color};
          border-radius:${Math.random() > 0.5 ? '50%' : '3px'};
          pointer-events:none; z-index:126;
          --fx:${fx}px; --fy:${fy}px; --fr:${fr}deg;
          animation: fragmentoVolar 0.7s ease-out forwards;
          box-shadow: 0 0 6px ${color};
        `;
        contFr.appendChild(frag);
        setTimeout(() => frag.remove(), 750);
      }

      el.style.animation = 'none';
      el.style.transform = 'translate(-50%,-50%) scale(1.7)';
      el.style.opacity   = '0';
      setTimeout(() => { if(el.parentNode) el.remove(); }, 380);
      objs.splice(objs.indexOf(obj), 1);

      objs.forEach(o => {
        o.el.style.pointerEvents = 'none';
        o.el.style.opacity       = '0';
      });

      baseEl.style.filter    = `drop-shadow(0 0 22px ${data.c}) drop-shadow(0 0 44px ${data.c}88)`;
      baseEl.style.opacity   = '1';
      baseEl.style.animation = 'corazonLatidoActivo 0.65s ease-in-out infinite';

      frasePanel.innerHTML = `
        <p style="color:${data.c};font-family:${data.f};
          font-size:clamp(0.75rem,2.2vw,1.35rem);
          margin:0 0 6px;text-shadow:0 0 16px ${data.c};line-height:1.3;">${data.t}</p>
        <span style="color:rgba(255,255,255,0.82);font-family:sans-serif;
          font-size:clamp(0.5rem,1.1vw,0.72rem);letter-spacing:0.05em;
          background:rgba(0,0,0,0.58);padding:3px 10px;border-radius:6px;">${data.s}</span>`;
      frasePanel.style.opacity = '1';

      if (audioCorazonActual) { audioCorazonActual.pause(); audioCorazonActual = null; }
      let ocultarLlamado = false;
      function ocultarConDelay() {
        if (ocultarLlamado) return;
        ocultarLlamado = true;
        setTimeout(ocultarFrase, 1000);
      }
      if (data.mp3) {
        const audio = new Audio(data.mp3);
        audio.play().catch(() => {});
        audioCorazonActual = audio;
        audio.onended = ocultarConDelay;
        audio.onerror = () => setTimeout(ocultarFrase, 3000);
      } else {
        setTimeout(ocultarFrase, 4000);
      }

      if (corazonesAbiertos >= flotantes.length) desbloquearBase();
    }

    el.addEventListener('click', abrirCorazon);
    el.addEventListener('touchstart', e => { e.preventDefault(); abrirCorazon(e); }, {passive:false});
  });

  function ocultarFrase() {
    if (!corazonFraseVisible) return;
    corazonFraseVisible = false;
    frasePanel.style.opacity = '0';
    if (audioCorazonActual) { audioCorazonActual.pause(); audioCorazonActual = null; }

    baseEl.style.filter    = 'drop-shadow(0 0 8px rgba(255,100,180,0.6))';
    baseEl.style.opacity   = '0.7';
    baseEl.style.animation = 'corazonLatido 1.2s ease-in-out infinite';

    objs.forEach(o => {
      o.el.style.opacity       = '1';
      o.el.style.pointerEvents = 'auto';
    });
  }

  function desbloquearBase() {
    baseEl.style.pointerEvents = 'auto';
    baseEl.style.cursor        = 'pointer';
    baseEl.style.animation     = 'corazonLatidoActivo 0.8s ease-in-out infinite';
    baseEl.style.filter        = `drop-shadow(0 0 20px #ff6699) drop-shadow(0 0 40px #ff669988)`;
    baseEl.style.opacity       = '1';

    function abrirBase(e) {
      if (e) e.stopPropagation();
      if (corazonFraseVisible) return;
      corazonFraseVisible = true;
      baseEl.style.filter = `drop-shadow(0 0 30px ${baseData.c}) drop-shadow(0 0 60px ${baseData.c}88)`;

      // Modal de video
      const videoModal = document.createElement('div');
      videoModal.id = 'modal-pionera-video';
      videoModal.style.cssText = `position:fixed;inset:0;z-index:500;
        background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;`;

      const videoEl = document.createElement('video');
      videoEl.src = 'assets/laspionera.webm';
      videoEl.autoplay = true;
      videoEl.controls = false;
      videoEl.playsInline = true;
      videoEl.style.cssText = `max-width:92%;max-height:88vh;border-radius:10px;
        box-shadow:0 0 40px rgba(255,100,180,0.5);`;

      const btnCerrarVideo = document.createElement('button');
      btnCerrarVideo.textContent = '✕';
      btnCerrarVideo.style.cssText = `position:absolute;top:2%;right:2%;
        background:#ff0044;border:none;color:#fff;
        width:clamp(28px,4vw,44px);height:clamp(28px,4vw,44px);
        border-radius:50%;font-size:clamp(14px,2vw,22px);
        cursor:pointer;z-index:501;box-shadow:0 0 10px rgba(255,0,68,0.8);`;

      function cerrarVideoModal() {
        videoEl.pause();
        videoModal.remove();
        corazonFraseVisible = false;
        baseEl.style.filter    = `drop-shadow(0 0 20px #ff6699) drop-shadow(0 0 40px #ff669988)`;
        baseEl.style.animation = 'corazonLatidoActivo 0.8s ease-in-out infinite';
      }

      btnCerrarVideo.addEventListener('click', cerrarVideoModal);
      videoEl.addEventListener('ended', cerrarVideoModal);
      videoModal.addEventListener('click', e => { if (e.target === videoModal) cerrarVideoModal(); });

      videoModal.appendChild(videoEl);
      videoModal.appendChild(btnCerrarVideo);
      document.body.appendChild(videoModal);
    }
    baseEl.addEventListener('click', abrirBase);
    baseEl.addEventListener('touchstart', e => { e.preventDefault(); abrirBase(e); }, {passive:false});
  }

  let lastCol = 0;
  function fisicaLoop() {
    const now = performance.now();
    objs.forEach(o => {
      if (o.el.style.opacity === '0') return;
      o.x += o.vx; o.y += o.vy;
      if (o.x - o.r < BX1) { o.x = BX1+o.r; o.vx =  Math.abs(o.vx); }
      if (o.x + o.r > BX2) { o.x = BX2-o.r; o.vx = -Math.abs(o.vx); }
      if (o.y - o.r < BY1) { o.y = BY1+o.r; o.vy =  Math.abs(o.vy); }
      if (o.y + o.r > BY2) { o.y = BY2-o.r; o.vy = -Math.abs(o.vy); }
      // Tamaño ondulante independiente por corazón
      const t = Date.now() / 1000;
      const wave = Math.sin(t / o.sizePeriod + o.sizePhase);
      const newSize = o.sizeBase * (0.7 + 0.35 * ((wave + 1) / 2));
      if (Math.abs(newSize - o.r * 2) > 0.5) {
        o.r = newSize / 2;
        o.el.style.width  = newSize + 'px';
        o.el.style.height = newSize + 'px';
      }
      o.el.style.left = o.x + 'px';
      o.el.style.top  = o.y + 'px';
    });

    for (let i = 0; i < objs.length; i++) {
      for (let j = i + 1; j < objs.length; j++) {
        const a = objs[i], b = objs[j];
        if (a.el.style.opacity === '0' || b.el.style.opacity === '0') continue;
        const dx   = b.x - a.x;
        const dy   = b.y - a.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const minD = a.r + b.r;
        if (dist < minD && dist > 0.01) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = (minD - dist) / 2 + 0.5;
          a.x -= nx * overlap; a.y -= ny * overlap;
          b.x += nx * overlap; b.y += ny * overlap;
          const aDot = a.vx * nx + a.vy * ny;
          const bDot = b.vx * nx + b.vy * ny;
          if (aDot - bDot > 0) {
            a.vx += (bDot - aDot) * nx; a.vy += (bDot - aDot) * ny;
            b.vx += (aDot - bDot) * nx; b.vy += (aDot - bDot) * ny;
            const speedA = Math.sqrt(a.vx*a.vx + a.vy*a.vy) || 1;
            const speedB = Math.sqrt(b.vx*b.vx + b.vy*b.vy) || 1;
            const targetA = 0.28 + Math.random() * 0.32;
            const targetB = 0.28 + Math.random() * 0.32;
            a.vx = (a.vx / speedA) * targetA; a.vy = (a.vy / speedA) * targetA;
            b.vx = (b.vx / speedB) * targetB; b.vy = (b.vy / speedB) * targetB;
            if (now - lastCol > 100) {
              lastCol = now;
              sonarColision();
              brilloColision((a.x + b.x)/2, (a.y + b.y)/2, contFr);
            }
          }
        }
      }
    }
    corazonesRaf = requestAnimationFrame(fisicaLoop);
  }
  corazonesRaf = requestAnimationFrame(fisicaLoop);
}

// ============================================================
//  MODAL NIÑA
// ============================================================
const ninas = [
  'assets/nina-1.png','assets/nina-2.png','assets/nina-3.png',
  'assets/nina-4.png','assets/nina-5.png','assets/nina-6.png',
  'assets/nina-7.png','assets/nina-8.png'
];
let ninaActual = 0;

/* ============================================================
   EFECTO FUTBOLISTA — BLOQUEADO, NO MODIFICAR
   ============================================================ */
// ─── 1. FUTBOLISTA — colores vivos, onda expansiva, rebote elástico ─
function efectoFutbolista(vfx) {
    const elFutbolista   = document.getElementById('glow-futbolista');
    const elNina         = document.getElementById('glow-nina');
    const _parentFutbol  = elFutbolista?.parentNode;
    const _nextFutbol    = elFutbolista?.nextSibling;

    // Mover futbolista dentro de vfx para compartir contexto de apilamiento
    if(elFutbolista){
        elFutbolista.style.zIndex   = '152';
        elFutbolista.style.position = 'absolute';
        vfx.appendChild(elFutbolista);
    }
    if(elNina){elNina.style.zIndex='159'; elNina.style.position='absolute';}

    if(!document.getElementById('ft-keyframes')){
        const st=document.createElement('style');st.id='ft-keyframes';
        st.textContent=`
        @keyframes ftLights{from{transform:translateX(-40px) translateY(-10px);}to{transform:translateX(40px) translateY(10px);}}
        @keyframes ftField{from{background-position:0 0;}to{background-position:160px 0;}}
        @keyframes ftGlow{from{box-shadow:0 0 10px rgba(255,255,255,.15);}to{box-shadow:0 0 25px rgba(0,255,255,.35);}}
        `;
        document.head.appendChild(st);
    }

    // ── Cancha con perspectiva frontal en la parte inferior ─────────────
    const canchaWrap = document.createElement('div');
    canchaWrap.style.cssText = `position:absolute;left:0;bottom:0;width:100%;height:22%;
        pointer-events:none;z-index:57;perspective:400px;overflow:hidden;`;
    vfx.appendChild(canchaWrap);

    const cancha = document.createElement('canvas');
    cancha.style.cssText = `width:100%;height:100%;display:block;
        transform:rotateX(38deg);transform-origin:bottom center;`;
    canchaWrap.appendChild(cancha);

    function dibujarCancha() {
        const cw = cancha.width  = canchaWrap.offsetWidth  || vfx.offsetWidth;
        const ch = cancha.height = canchaWrap.offsetHeight * 2 || vfx.offsetHeight * 0.44;
        const c  = cancha.getContext('2d');

        // Franjas verdes
        const franjas = 8;
        const fw = cw / franjas;
        for (let i = 0; i < franjas; i++) {
            c.fillStyle = i % 2 === 0 ? 'rgba(20,85,38,0.92)' : 'rgba(26,108,48,0.92)';
            c.fillRect(i * fw, 0, fw, ch);
        }

        c.strokeStyle = 'rgba(255,255,255,0.9)';
        c.lineWidth   = Math.max(1.5, cw * 0.0025);

        // Borde exterior
        const pad = cw * 0.03;
        c.beginPath(); c.rect(pad, pad, cw - pad*2, ch - pad*2); c.stroke();

        // Línea central horizontal
        c.beginPath(); c.moveTo(pad, ch / 2); c.lineTo(cw - pad, ch / 2); c.stroke();

        // Línea central vertical
        c.beginPath(); c.moveTo(cw / 2, pad); c.lineTo(cw / 2, ch - pad); c.stroke();

        // Círculo central
        c.beginPath();
        c.arc(cw / 2, ch / 2, cw * 0.1, 0, Math.PI * 2);
        c.stroke();

        // Punto central
        c.beginPath();
        c.arc(cw / 2, ch / 2, Math.max(3, cw * 0.005), 0, Math.PI * 2);
        c.fillStyle = 'rgba(255,255,255,0.9)'; c.fill();

        // Área grande izquierda
        const agW = cw * 0.18, agH = ch * 0.45, agY = ch/2 - agH/2;
        c.beginPath(); c.rect(pad, agY, agW, agH); c.stroke();

        // Área chica izquierda
        const acW = cw * 0.09, acH = ch * 0.26, acY = ch/2 - acH/2;
        c.beginPath(); c.rect(pad, acY, acW, acH); c.stroke();

        // Área grande derecha
        c.beginPath(); c.rect(cw - pad - agW, agY, agW, agH); c.stroke();

        // Área chica derecha
        c.beginPath(); c.rect(cw - pad - acW, acY, acW, acH); c.stroke();

        // Arcos de esquina
        const cr = cw * 0.025;
        [[pad, pad, 0, Math.PI/2], [cw-pad, pad, Math.PI/2, Math.PI],
         [pad, ch-pad, -Math.PI/2, 0], [cw-pad, ch-pad, Math.PI, 3*Math.PI/2]]
        .forEach(([x,y,a1,a2]) => { c.beginPath(); c.arc(x,y,cr,a1,a2); c.stroke(); });
    }

    dibujarCancha();
    window.addEventListener('resize', dibujarCancha);

    const label=document.createElement('div');
    label.style.cssText=`position:absolute;top:clamp(4px,1.5%,12px);left:50%;transform:translateX(-50%);
        z-index:62;color:white;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.2);
        backdrop-filter:blur(8px);padding:clamp(2px,0.8%,7px) clamp(6px,2%,18px);border-radius:20px;
        font-size:clamp(7px,1.6vw,13px);letter-spacing:2px;white-space:nowrap;font-family:Arial,sans-serif;
        pointer-events:none;animation:ftGlow 2s infinite alternate;`;
    label.textContent='⚽ ¡Patea los balones! ⚽';
    vfx.appendChild(label);

    const canvas=document.createElement('canvas');
    canvas.style.cssText=`position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:auto;z-index:153;will-change:transform;`;
    vfx.appendChild(canvas);
    let W=canvas.width=vfx.offsetWidth, H=canvas.height=vfx.offsetHeight;
    const ctx=canvas.getContext('2d');
    let balls=[],parts=[],raf,lastCol=0;

    const _fac=window.AudioContext?new (window.AudioContext||window.webkitAudioContext)():null;
    function fbeep(freq,dur,type,vol,rampTo){
        if(!_fac)return;
        try{
            if(_fac.state==='suspended')_fac.resume();
            const o=_fac.createOscillator(),g=_fac.createGain();
            o.type=type||'sine';
            o.frequency.setValueAtTime(freq,_fac.currentTime);
            if(rampTo)o.frequency.exponentialRampToValueAtTime(rampTo,_fac.currentTime+dur);
            g.gain.setValueAtTime(vol||0.15,_fac.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001,_fac.currentTime+dur);
            o.connect(g);g.connect(_fac.destination);o.start();o.stop(_fac.currentTime+dur+0.05);
        }catch(e){}
    }
    function playWaveSound(){[280,420,560,700].forEach((f,i)=>setTimeout(()=>fbeep(f,0.22,'triangle',0.06,f*1.6),i*28));}
    function playKick(){fbeep(160,0.13,'sine',0.20,50);}
    function playBump(){fbeep(320,0.08,'triangle',0.05,200);}

    const VIVID_HUES=[0,15,30,45,60,80,100,130,160,180,200,220,240,260,280,300,315,330,345,50,170,210,270,350];
    let _hueIdx=Math.floor(Math.random()*VIVID_HUES.length);
    function nextVividColor(){
        const h=VIVID_HUES[_hueIdx];
        _hueIdx=(_hueIdx+Math.floor(VIVID_HUES.length/3)+1)%VIVID_HUES.length;
        const s=85+Math.floor(Math.random()*15), l=50+Math.floor(Math.random()*10);
        return{hue:h, main:`hsl(${h},${s}%,${l}%)`, glow:`hsl(${h},100%,70%)`, dark:`hsl(${h},80%,25%)`};
    }

    const balonImg=new Image(); balonImg.src='assets/centro-balon-loader.png';

    function bSizes(){
        const min=Math.min(W,H);
        const base= W<500 ? [.055,.07,.085] : [.045,.06,.075];
        return base.map(f=>Math.max(12,Math.round(min*f)));
    }
    function bCount(){ const a=W*H; return a<80000?9 : a<200000?14 : a<400000?18 : 22; }

    function spawn(){
        balls=[];parts=[];
        const sizes=bSizes(),n=bCount();
        for(let i=0;i<n;i++){
            const r=sizes[Math.floor(Math.random()*sizes.length)];
            let x,y,ok,t=0;
            do{
                x=r+Math.random()*(W-r*2); y=r+Math.random()*(H-r*2);
                ok=balls.every(b=>Math.hypot(b.x-x,b.y-y)>r+b.r+6); t++;
            }while(!ok&&t<120);
            const sp=1.0+Math.random()*1.6, ang=Math.random()*Math.PI*2;
            balls.push({x,y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,r,rot:0,rsp:(Math.random()-.5)*.06,color:nextVividColor(),alive:true});
        }
    }

    function explodeBall(b){
        playWaveSound();
        parts.push({type:'wave',x:b.x,y:b.y,r:b.r*0.3,maxRadius:Math.max(W,H)*0.20,color:b.color,life:3.0,dec:0.07});
        const _mp=window.innerWidth<768?8:14;
        for(let i=0;i<_mp;i++){
            const ang=Math.random()*Math.PI*2,sp=3+Math.random()*5.5;
            parts.push({type:'spark',x:b.x,y:b.y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp-1,size:Math.max(2,b.r*0.09+Math.random()*4),color:b.color,life:1.0,dec:0.016+Math.random()*0.025});
        }
        const compHue=(b.color.hue+180)%360;
        parts.push({type:'wave',x:b.x,y:b.y,r:b.r*0.1,maxRadius:Math.max(W,H)*0.3,color:{hue:compHue,main:`hsl(${compHue},100%,60%)`,glow:`hsl(${compHue},100%,75%)`},life:2.0,dec:0.10});
        b.alive=false;
        if(balls.every(x=>!x.alive)) setTimeout(spawn,1400);
    }

    function physics(){
        const alive=balls.filter(b=>b.alive);
        alive.forEach(b=>{
            b.x+=b.vx; b.y+=b.vy; b.rot+=b.rsp;
            b.vx*=0.986; b.vy*=0.986;
            const sp=Math.hypot(b.vx,b.vy);
            if(sp<0.5){const a=Math.random()*Math.PI*2; b.vx=Math.cos(a)*0.7; b.vy=Math.sin(a)*0.7;}
            if(b.x-b.r<0){b.x=b.r; b.vx=Math.abs(b.vx);}
            if(b.x+b.r>W){b.x=W-b.r; b.vx=-Math.abs(b.vx);}
            if(b.y-b.r<0){b.y=b.r; b.vy=Math.abs(b.vy);}
            if(b.y+b.r>H){b.y=H-b.r; b.vy=-Math.abs(b.vy);}
        });
        const now=performance.now();
        for(let i=0;i<alive.length;i++){
            for(let j=i+1;j<alive.length;j++){
                const a=alive[i],b=alive[j];
                const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),md=a.r+b.r;
                if(d<md&&d>0.01){
                    const nx=dx/d,ny=dy/d,ov=(md-d)/2+0.5;
                    a.x-=nx*ov; a.y-=ny*ov; b.x+=nx*ov; b.y+=ny*ov;
                    const ad=a.vx*nx+a.vy*ny,bd=b.vx*nx+b.vy*ny;
                    if(ad-bd>0){
                        a.vx+=(bd-ad)*nx; a.vy+=(bd-ad)*ny;
                        b.vx+=(ad-bd)*nx; b.vy+=(ad-bd)*ny;
                        if(now-lastCol>80){lastCol=now; playBump();}
                    }
                }
            }
        }
        for(let i=parts.length-1;i>=0;i--){
            const p=parts[i]; p.life-=p.dec;
            if(p.type==='wave'){
                p.r+=(p.maxRadius-p.r)*0.09;
                alive.forEach(b=>{
                    const dx=b.x-p.x,dy=b.y-p.y,dist=Math.hypot(dx,dy);
                    if(dist>p.r-20&&dist<p.r+b.r+5){
                        const angle=Math.atan2(dy,dx),force=(1.0-(p.r/p.maxRadius))*14;
                        if(force>0.4){
                            b.vx+=Math.cos(angle)*force; b.vy+=Math.sin(angle)*force;
                            const bsp=Math.hypot(b.vx,b.vy); if(bsp>9){b.vx=(b.vx/bsp)*9; b.vy=(b.vy/bsp)*9;}
                        }
                    }
                });
            } else if(p.type==='spark'){
                p.x+=p.vx; p.y+=p.vy; p.vy+=0.10;
            }
            if(p.life<=0) parts.splice(i,1);
        }
    }

    function getXY(e){
        const rect=canvas.getBoundingClientRect(),src=e.touches?e.touches[0]:e;
        return{x:(src.clientX-rect.left)*(W/rect.width),y:(src.clientY-rect.top)*(H/rect.height)};
    }
    function tap(e){
        e.preventDefault();
        const{x,y}=getXY(e); let hit=false;
        for(const b of balls){
            if(!b.alive)continue;
            if(Math.hypot(b.x-x,b.y-y)<b.r+12){explodeBall(b); hit=true; break;}
        }
        if(!hit){
            balls.forEach(b=>{
                if(!b.alive)return;
                const dx=b.x-x,dy=b.y-y,d=Math.hypot(dx,dy)||1;
                if(d<b.r*5){
                    const f=(b.r*5-d)/(b.r*5);
                    b.vx+=(dx/d)*f*12; b.vy+=(dy/d)*f*12;
                    const sp=Math.hypot(b.vx,b.vy); if(sp>8){b.vx=(b.vx/sp)*8; b.vy=(b.vy/sp)*8;}
                    playKick();
                }
            });
        }
    }
    canvas.addEventListener('mousedown',tap);
    canvas.addEventListener('touchstart',e=>{e.preventDefault();tap(e);},{passive:false});

    function loop(){
        ctx.clearRect(0,0,W,H);
        physics();
        balls.filter(b=>b.alive).forEach(b=>{
            ctx.save();
            ctx.translate(b.x,b.y); ctx.rotate(b.rot);
            ctx.shadowColor=b.color.glow; ctx.shadowBlur=b.r*0.55;
            if(balonImg.complete&&balonImg.naturalWidth){
                ctx.globalCompositeOperation='source-over';
                ctx.drawImage(balonImg,-b.r,-b.r,b.r*2,b.r*2);
            } else {
                ctx.beginPath(); ctx.arc(0,0,b.r,0,Math.PI*2);
                ctx.fillStyle=b.color.main; ctx.fill();
            }
            ctx.shadowBlur=0; ctx.restore();
        });
        ctx.save();
        ctx.globalCompositeOperation='screen';
        parts.forEach(p=>{
            ctx.save();
            if(p.type==='wave'){
                const grad=ctx.createRadialGradient(p.x,p.y,p.r*0.72,p.x,p.y,p.r);
                grad.addColorStop(0,`hsla(${p.color.hue},100%,50%,0.05)`);
                grad.addColorStop(0.65,`hsla(${p.color.hue},100%,60%,${(p.life*0.85).toFixed(2)})`);
                grad.addColorStop(0.88,`rgba(255,255,255,${Math.min(1,p.life).toFixed(2)})`);
                grad.addColorStop(1,`hsla(${p.color.hue},100%,55%,0)`);
                ctx.fillStyle=grad;
                ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
            } else if(p.type==='spark'){
                ctx.shadowBlur=12; ctx.shadowColor=p.color.glow;
                ctx.fillStyle=p.color.main;
                ctx.globalAlpha=Math.max(0,p.life);
                ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(0.5,p.size*p.life),0,Math.PI*2); ctx.fill();
            }
            ctx.restore();
        });
        ctx.restore();
        const _now=performance.now();
        if(_now-(loop._last||0)<33){raf=requestAnimationFrame(loop);return;}
        loop._last=_now;
        raf=requestAnimationFrame(loop);
    }

    let _resizeTimer;
    function onResize(){
        clearTimeout(_resizeTimer);
        _resizeTimer=setTimeout(()=>{
            const nW=vfx.offsetWidth,nH=vfx.offsetHeight;
            if(!nW||!nH)return;
            W=canvas.width=nW; H=canvas.height=nH; spawn();
        },120);
    }
    const _ro=new ResizeObserver(onResize); _ro.observe(vfx);
    spawn(); loop();

    return{cleanup:()=>{
        cancelAnimationFrame(raf); raf=null;
        _ro.disconnect();
        window.removeEventListener('resize', dibujarCancha);
        canvas.remove(); canchaWrap.remove(); label.remove();
        if(elFutbolista){
            elFutbolista.style.zIndex   = '';
            elFutbolista.style.position = '';
            // Restaurar al mural en su posición original
            if(_parentFutbol) _parentFutbol.insertBefore(elFutbolista, _nextFutbol);
        }
        if(elNina){elNina.style.zIndex=''; elNina.style.position='';}
    }};
}
/* FIN EFECTO FUTBOLISTA — BLOQUEADO */

// ==========================================
// ─── 2. ASTRONAUTA — SISTEMA SOLAR 3D CON CAMPO DE ESTRELLAS PROFUNDO ───
// ==========================================
function efectoAstronauta(vfx) {
    const elNina = document.getElementById('glow-nina');
    if(elNina) { elNina.style.zIndex = '63'; elNina.style.position = 'absolute'; }
    var GOLD = 97000;
    var P = [
        {n:"Sol",      isSun:true,  img:"assets/sol.jpg",       fb:"https://s3-us-west-2.amazonaws.com/s.cdpn.io/332937/sun.jpg",      g:27.9, s:"40s", tilt:"0°",     day:"~600 h",  year:"—",           d:"La estrella de nuestro sistema. Un plasma ardiente de hidrógeno y helio que ilumina todo a su alrededor."},
        {n:"Mercurio",              img:"assets/mercurio.jpg",   fb:"https://s3-us-west-2.amazonaws.com/s.cdpn.io/332937/mercury2.jpg", g:.38,  s:"18s", tilt:"0.034°", day:"1,407 h", year:"88 días",     d:"El más cercano al Sol, cubierto de cráteres. Sin atmósfera real, temperaturas entre -180 y 430 °C."},
        {n:"Venus",                 img:"assets/venus.jpg",      fb:"https://s3-us-west-2.amazonaws.com/s.cdpn.io/332937/venus2.jpg",   g:.91,  s:"28s", tilt:"177.3°", day:"5,832 h", year:"224.7 días",  d:"Un infierno de nubes tóxicas de ácido sulfúrico. El planeta más caliente, con 465 °C en promedio."},
        {n:"Tierra",                img:"assets/tierra.jpg",     fb:"https://s3-us-west-2.amazonaws.com/s.cdpn.io/332937/earth.jpg",    g:1,    s:"12s", tilt:"23.26°", day:"23.9 h",  year:"365.2 días",  d:"El oasis azul flotando en el vacío cósmico. Único planeta con vida conocida, agua líquida y luna estabilizadora."},
        {n:"Marte",                 img:"assets/marte.jpg",      fb:"https://s3-us-west-2.amazonaws.com/s.cdpn.io/332937/mars.jpg",     g:.38,  s:"15s", tilt:"25.2°",  day:"24.6 h",  year:"687 días",    d:"Desiertos rojos, tormentas globales y el Olimpo: volcán de 22 km de altura, el más alto del sistema solar."},
        {n:"Júpiter",               img:"assets/jupiter.jpg",    fb:"https://s3-us-west-2.amazonaws.com/s.cdpn.io/332937/jupiter.jpg",  g:2.34, s:"8s",  tilt:"3.1°",   day:"9.9 h",   year:"4,331 días",  d:"El monstruo gaseoso. Su Gran Mancha Roja es una tormenta activa desde hace siglos, más grande que la Tierra."},
        {n:"Saturno",  ring:1,      img:"assets/saturno.jpg",    fb:"https://s3-us-west-2.amazonaws.com/s.cdpn.io/332937/saturn.jpg",   g:1.06, s:"10s", tilt:"26.7°",  day:"10.7 h",  year:"10,747 días", d:"Sus anillos de hielo y roca se extienden 282,000 km. Si lo pusiéramos en agua, flotaría."},
        {n:"Urano",                 img:"assets/urano.jpg",      fb:"https://s3-us-west-2.amazonaws.com/s.cdpn.io/332937/uranus2.jpg",  g:.92,  s:"20s", tilt:"97.8°",  day:"17.2 h",  year:"30,589 días", d:"El gigante helado que rota de lado, inclinación de 98°. Sus vientos alcanzan 900 km/h."},
        {n:"Neptuno",               img:"assets/neptuno.jpg",    fb:"https://s3-us-west-2.amazonaws.com/s.cdpn.io/332937/neptune.jpg",  g:1.19, s:"16s", tilt:"28.3°",  day:"16.1 h",  year:"59,800 días", d:"El más lejano y ventoso. Tormentas de 2,100 km/h. Un azul profundo de metano helado."},
        {n:"Plutón",                img:"assets/pluton.jpg",     fb:"https://s3-us-west-2.amazonaws.com/s.cdpn.io/332937/pluto.jpg",    g:.063, s:"35s", tilt:"122.5°", day:"153.3 h", year:"90,560 días", d:"El planeta enano al borde del sistema solar. En 2006 perdió su título de planeta oficial."},
        {n:"Balón", isFootball:true, img:"assets/balon-tierra.webp", fb:"", g:null, s:null, tilt:"—", day:"—", year:"—", d:"El planeta más popular de la Tierra. Redondo, blanco y negro, viaja a 120 km/h al patear. Once contra once."}
    ];
    var cur=0, isSpeaking=false;

    var _profOcultas = ['glow-doctora','glow-ingeniera','glow-maestra','glow-bombera','glow-repartidora','glow-futbolista'];
    _profOcultas.forEach(function(id){
        var el=document.getElementById(id);
        if(el){el.style.transition='opacity 0.4s ease';el.style.opacity='0';}
    });

    vfx.innerHTML='';
    vfx.style.pointerEvents='auto';
    vfx.style.background='#000010';

    if(!document.getElementById('as2-kf')){
        var sk=document.createElement('style');sk.id='as2-kf';
        sk.textContent=`
        @keyframes as2FadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes as2Spin{from{background-position:0% center}to{background-position:-200% center}}
        @keyframes as2SunGlow{0%,100%{box-shadow:inset -25px -12px 45px rgba(255,140,0,.3),0 0 55px 15px rgba(255,160,0,.45)}50%{box-shadow:inset -25px -12px 45px rgba(255,160,0,.4),0 0 75px 25px rgba(255,200,0,.6)}}
        @keyframes as2Ring{to{transform:rotateZ(360deg)}}
        @keyframes as2Float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        `;
        document.head.appendChild(sk);
    }

    var wrap=document.createElement('div');
    wrap.style.cssText='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(2px,0.8vh,7px);overflow:hidden;';

    wrap.innerHTML=`
    <canvas id="as2-stars" style="position:absolute;inset:0;pointer-events:none;z-index:0;"></canvas>
    <button id="as2-tts" title="Leer descripción" style="position:absolute;top:clamp(6px,2%,12px);left:clamp(6px,2%,12px);z-index:20;
        width:clamp(26px,5.5vw,38px);height:clamp(26px,5.5vw,38px);border-radius:50%;
        border:1.5px solid rgba(255,255,255,.35);background:rgba(0,0,0,.65);
        backdrop-filter:blur(6px);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;
        transition:background .2s;touch-action:manipulation;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            style="width:clamp(11px,2.8vw,16px);height:clamp(11px,2.8vw,16px);">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
    </button>
    <div id="as2-dots" style="display:flex;gap:clamp(3px,1vw,6px);flex-wrap:wrap;justify-content:center;
        max-width:min(320px,88vw);z-index:3;position:relative;padding:0 6px;"></div>
    <div style="display:flex;align-items:center;justify-content:center;gap:clamp(8px,2.5vw,20px);position:relative;z-index:3;">
        <button id="as2-prev" style="width:clamp(30px,7.5vw,44px);height:clamp(30px,7.5vw,44px);border-radius:50%;
            border:1.5px solid rgba(255,255,255,.4);background:rgba(0,0,0,.55);color:#fff;cursor:pointer;
            display:flex;align-items:center;justify-content:center;touch-action:manipulation;transition:background .2s;backdrop-filter:blur(4px);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:15px;height:15px;"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div id="as2-pw" style="position:relative;flex-shrink:0;width:clamp(90px,22vw,155px);height:clamp(90px,22vw,155px);">
            <div id="as2-orbit" style="position:absolute;top:50%;left:50%;width:180%;height:40%;border-radius:50%;
                border:1px solid rgba(255,255,255,.12);transform:translate(-50%,-50%) rotateX(75deg);pointer-events:none;z-index:0;"></div>
            <div id="as2-pl" style="border-radius:50%;background-size:200% 100%;background-repeat:repeat-x;
                width:100%;height:100%;animation:as2Spin 12s linear infinite;
                box-shadow:inset -25px -12px 45px rgba(0,0,0,.85),inset 8px 6px 18px rgba(255,255,255,.08);
                position:relative;z-index:1;"></div>
            <div id="as2-fw" style="width:100%;height:100%;border-radius:50%;display:none;
                position:absolute;inset:0;z-index:1;background-size:200% 100%;background-repeat:repeat-x;
                animation:as2Spin 2.2s linear infinite;
                box-shadow:inset -25px -12px 45px rgba(0,0,0,.75),inset 8px 6px 18px rgba(255,255,255,.15),0 0 22px 4px rgba(255,255,255,.12);"></div>
            <div id="as2-rw" style="position:absolute;top:50%;left:50%;width:170%;height:38%;
                transform:translate(-50%,-50%) rotateX(74deg);opacity:0;transition:.35s;pointer-events:none;z-index:2;">
                <div style="width:100%;height:100%;border-radius:50%;
                    border:clamp(4px,1.2vw,10px) solid rgba(214,192,145,.55);
                    box-shadow:0 0 12px rgba(214,192,145,.25);animation:as2Ring 22s linear infinite;"></div>
            </div>
        </div>
        <button id="as2-next" style="width:clamp(30px,7.5vw,44px);height:clamp(30px,7.5vw,44px);border-radius:50%;
            border:1.5px solid rgba(255,255,255,.4);background:rgba(0,0,0,.55);color:#fff;cursor:pointer;
            display:flex;align-items:center;justify-content:center;touch-action:manipulation;transition:background .2s;backdrop-filter:blur(4px);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:15px;height:15px;"><path d="M9 18l6-6-6-6"/></svg>
        </button>
    </div>
    <div id="as2-info" style="text-align:center;z-index:3;position:relative;
        padding:clamp(6px,1.2vh,10px) clamp(10px,3vw,18px);max-width:min(400px,88vw);
        background:rgba(0,0,10,.72);border:1px solid rgba(255,255,255,.14);border-radius:12px;
        backdrop-filter:blur(8px);box-shadow:0 0 20px rgba(0,0,0,.6);">
        <h2 id="as2-pn" style="font-size:clamp(.85rem,3.2vw,1.2rem);font-weight:700;margin:0 0 3px;
            font-family:Georgia,serif;letter-spacing:.04em;color:#fff;text-shadow:0 0 12px rgba(150,200,255,.6);"></h2>
        <p id="as2-pd" style="font-size:clamp(.55rem,1.9vw,.72rem);opacity:.92;line-height:1.55;
            font-family:Georgia,serif;margin:0 0 4px;color:#dde8ff;"></p>
        <div id="as2-stats" style="display:flex;gap:clamp(6px,2.5vw,14px);justify-content:center;
            font-size:clamp(.48rem,1.5vw,.62rem);opacity:.8;font-family:Arial,sans-serif;
            color:#b0c8ff;flex-wrap:wrap;"></div>
    </div>
    <div style="width:100%;max-width:min(440px,97vw);z-index:3;position:relative;font-family:Arial,sans-serif;
        background:rgba(0,0,20,.88);border:1px solid rgba(255,255,255,.12);border-radius:20px;
        padding:clamp(4px,.8vh,8px) clamp(8px,2vw,14px);backdrop-filter:blur(8px);
        box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:clamp(3px,.6vh,6px);
        user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;">
      <!-- Fila horizontal -->
      <div style="display:flex;align-items:center;gap:clamp(5px,1.5vw,10px);flex-wrap:wrap;justify-content:center;width:100%;user-select:none;-webkit-user-select:none;">
        <!-- Etiqueta + input -->
        <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">
          <div style="font-size:clamp(.38rem,.85vw,.52rem);
            background:linear-gradient(135deg,#ce93d8,#8800ff);
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;
            background-clip:text;
            font-family:'Georgia',serif;font-style:italic;font-weight:600;
            line-height:1.2;max-width:clamp(48px,9vw,68px);text-align:right;letter-spacing:.2px;">
            TU PESO
          </div>
          <span style="font-size:clamp(.6rem,1.3vw,.75rem);color:#ce93d8;">→</span>
          <input type="number" id="as2-kg" value="70" placeholder="kg"
            style="width:clamp(52px,12vw,70px);padding:clamp(2px,.5vh,4px);
            border:1.5px solid #ce93d8;border-radius:14px;background:rgba(20,0,40,.85);
            color:#fff;text-align:center;font-size:clamp(.65rem,1.6vw,.8rem);font-weight:bold;outline:none;">
        </div>
        <!-- Emoji + nombre + kg -->
        <div id="as2-planeta-emoji" style="font-size:clamp(.9rem,2vw,1.1rem);flex-shrink:0;">🪐</div>
        <div style="display:flex;flex-direction:column;gap:1px;flex-shrink:0;">
          <div id="as2-planeta-nom" style="color:#ce93d8;font-size:clamp(.45rem,1.1vw,.58rem);line-height:1;">—</div>
          <div id="as2-planeta-g"   style="color:rgba(255,255,255,.4);font-size:clamp(.4rem,.9vw,.52rem);line-height:1;">—</div>
        </div>
        <div id="as2-planeta-kg" style="font-size:clamp(.8rem,2.2vw,1rem);font-weight:900;color:#fff;flex-shrink:0;">— kg</div>
        <!-- Barra -->
        <div style="flex:1;min-width:40px;background:rgba(255,255,255,.1);border-radius:4px;height:5px;overflow:hidden;">
          <div id="as2-barra-planeta" style="height:100%;width:50%;background:linear-gradient(90deg,#ce93d8,#8800ff);border-radius:4px;transition:.4s;"></div>
        </div>
      </div>
      <!-- Mensaje centrado abajo -->
      <div id="as2-msg" style="text-align:center;font-size:clamp(.48rem,1.2vw,.65rem);
          color:#ffd700;font-style:italic;line-height:1.3;width:100%;min-height:14px;"></div>
      <div id="as2-tierra-kg" style="display:none;"></div>
      <div id="as2-barra-tierra" style="display:none;"></div>
      <div id="as2-wbl" style="display:none;"></div>
      <div id="as2-res" style="display:none;"></div>
    </div>`;

    vfx.appendChild(wrap);

    var cv = document.getElementById('as2-stars');
    var sctx = cv.getContext('2d');
    var stars = [];
    var raf2;

    function rsz() {
        cv.width  = wrap.clientWidth  || wrap.offsetWidth  || 800;
        cv.height = wrap.clientHeight || wrap.offsetHeight || 300;
        initStars();
    }
    function initStars() {
        var W2 = cv.width, H2 = cv.height;
        var num = W2 < 600 ? 140 : 220;
        stars = [];
        for (var i = 0; i < num; i++) {
            stars.push({ x:(Math.random()-0.5)*W2*2, y:(Math.random()-0.5)*H2*2, z:Math.random()*W2, sz:Math.random()*2.4+0.4 });
        }
    }
    function animateStars() {
        var W2=cv.width, H2=cv.height, cx=W2/2, cy=H2/2;
        sctx.fillStyle='rgba(0,0,10,0.22)'; sctx.fillRect(0,0,W2,H2);
        for (var i=0;i<stars.length;i++) {
            var s=stars[i]; s.z-=1.8;
            if(s.z<=0){s.z=W2;s.x=(Math.random()-0.5)*W2*2;s.y=(Math.random()-0.5)*H2*2;continue;}
            var px=(s.x/s.z)*cx+cx, py=(s.y/s.z)*cy+cy;
            if(px<0||px>W2||py<0||py>H2){s.z=W2;s.x=(Math.random()-0.5)*W2*2;s.y=(Math.random()-0.5)*H2*2;continue;}
            var prog=1-s.z/W2, r=Math.max(0.1,prog*s.sz*2.2), al=prog*0.9;
            sctx.beginPath(); sctx.fillStyle='rgba(255,255,255,'+al.toFixed(2)+')';
            sctx.arc(px,py,r,0,Math.PI*2); sctx.fill();
        }
        const _t2=performance.now();
        if(_t2-(animateStars._last||0)<42){raf2=requestAnimationFrame(animateStars);return;}
        animateStars._last=_t2; raf2=requestAnimationFrame(animateStars);
    }
    rsz(); window.addEventListener('resize',rsz); animateStars();

    var dotsEl=document.getElementById('as2-dots');
    P.forEach(function(_,i){
        var d=document.createElement('div');
        d.style.cssText='width:clamp(5px,1.3vw,8px);height:clamp(5px,1.3vw,8px);border-radius:50%;background:rgba(255,255,255,.28);cursor:pointer;transition:.2s;flex-shrink:0;';
        d.addEventListener('click',function(){go(i);});
        dotsEl.appendChild(d);
    });

    function speak(text){
        if(!('speechSynthesis' in window))return;
        window.speechSynthesis.cancel();
        var u=new SpeechSynthesisUtterance(text);u.lang='es-MX';u.rate=0.95;u.pitch=1;
        var voices=window.speechSynthesis.getVoices();
        var v=voices.find(function(x){return x.lang.startsWith('es');});if(v)u.voice=v;
        var btn=document.getElementById('as2-tts');
        u.onstart=function(){isSpeaking=true;if(btn)btn.style.background='rgba(100,160,255,.35)';};
        u.onend=function(){isSpeaking=false;if(btn)btn.style.background='';};
        u.onerror=function(){isSpeaking=false;if(btn)btn.style.background='';};
        window.speechSynthesis.speak(u);
    }
    var ttsBtn=document.getElementById('as2-tts');
    if(ttsBtn)ttsBtn.addEventListener('click',function(){
        if(isSpeaking){window.speechSynthesis.cancel();isSpeaking=false;this.style.background='';}
        else{speak(P[cur].n+'. '+P[cur].d);}
    });

    var EMOJIS = {Sol:'☀️',Mercurio:'☿️',Venus:'♀️',Tierra:'🌍',Marte:'🔴',Júpiter:'🪐',Saturno:'💫',Urano:'🔵',Neptuno:'🌊',Plutón:'❄️',Balón:'⚽'};
    // 5 rangos de ratio con 6 mensajes cada uno
    // Mensajes por ratio × rango de peso (6 rangos de peso × 5 de gravedad)
    var MSGS = {
      muyAlto: { // ratio > 3 (Sol)
        w40:['¡Con ese peso flotas incluso en el Sol! 🌞💨','¡El Sol te haría pesar toneladas igual! 😅'],
        w51:['¡Aquí pesarías como un auto compacto! 🚗😱','¡Tu dieta no te salva del Sol! ☀️'],
        w61:['¡Ni el traje espacial aguanta aquí! 💥','¡El Sol no hace descuentos por talla! 🔥'],
        w71:['¡Tus huesos llamaron a su abogado! 🦴📞','¡Bienvenido al gimnasio más cruel del universo! 💪'],
        w81:['¡Aquí hasta respirar quema calorías! 🫁🔥','¡Ni con grúa espacial te levantas! 🏗️'],
        w91:['¡Eres un agujero negro personal en el Sol! 🌑💀','¡La gravedad solar te quiere demasiado! 😭☀️']
      },
      alto: { // ratio 1.5–3 (Júpiter)
        w40:['¡Aquí pasas de pluma a algo serio! 🪶➡️🏋️','¡Incluso tú sentirías a Júpiter! 😬'],
        w51:['¡Bajaste de peso comiendo bien, pero Júpiter no sabe eso! 😅🪐','¡Aquí tus brazos piden ayuda! 💪😤'],
        w61:['¡Tus rodillas notan la diferencia! 🦵','¡Aquí sí se nota el exceso de tacos! 🌮😅'],
        w71:['¡El elevador sería tu mejor amigo aquí! 🛗😂','¡Bajar escaleras sería deporte olímpico! 🥇'],
        w81:['¡Tus zapatos duran la mitad! 👟💀','¡Júpiter te haría sentir cada kilo! 😰🪐'],
        w91:['¡Aquí necesitas un carrito de golf personal! 🏌️😂','¡Con ese peso Júpiter te abraza muy fuerte! 🪐💀']
      },
      igual: { // ratio 0.85–1.15 (Tierra, Urano, Saturno, Neptuno)
        w40:['¡Misma figura, otro planeta, qué decepción! 😤','¡El universo tampoco te da descuento! 🌀'],
        w51:['¡Aquí tampoco cambias, qué injusto! 😒🌍','¡Empate cósmico total! ⚖️✨'],
        w61:['¡Ni ganaste ni perdiste, empate! ⚖️🌌','¡La báscula marcaría casi igual! 😴'],
        w71:['¡Igualito que en casa, qué aburrido! 🏠😴','¡El universo tampoco puede con tu peso! 😂'],
        w81:['¡Aquí tampoco puedes culpar a la gravedad! 😂','¡Mismos kilos, diferente cielo! 🌠'],
        w91:['¡El universo dice: ese peso es tuyo donde vayas! 🌍😅','¡Ni cambiando de planeta! 🚀😤']
      },
      bajo: { // ratio 0.2–0.85 (Marte, Mercurio)
        w40:['¡Eres casi una pluma cósmica aquí! 🪶✨','¡Tus saltos serían dignos de video viral! 📱🚀'],
        w51:['¡Aquí presumirías figura sin dieta! 😏🌟','¡Las bolsas del super: pan comido! 🛍️😎'],
        w61:['¡Más ligero, las rodillas agradecen! 🦵✨','¡Los atletas te envidiarían aquí! 🥇'],
        w71:['¡Tus saltos serían de campeonato! 🤸‍♀️','¡Aquí hasta correr sería un placer! 🏃💨'],
        w81:['¡Por fin un planeta generoso contigo! 😂🌟','¡Aquí te sentirías 20 años más joven! 💃'],
        w91:['¡El peso que tienes aquí sería envidia de todos! 😏✨','¡Marte te haría sentir como modelo! 🌹']
      },
      muyBajo: { // ratio < 0.2 (Plutón)
        w40:['¡Eres literalmente una pluma en Plutón! 🪶💨','¡Un soplo y flotas al sistema solar! 💨🌌'],
        w51:['¡Podrías flotar al trabajo sin pasaje! 🚀✨','¡En Plutón hasta las hormiguitas te levantan! 🐜'],
        w61:['¡Un estornudo y sales disparado! 🤧🌌','¡La dieta aquí es innecesaria! 🎈'],
        w71:['¡Eres más ligero que una idea a las 3am! 💭🪶','¡Plutón te convierte en ser etéreo! 👻'],
        w81:['¡Con ese peso en Plutón eres una pluma! 🪶😂','¡Aquí sí que el peso no importa! 🎉'],
        w91:['¡Incluso tu peso máximo flota en Plutón! 😂🎈','¡Un soplo y desapareces del sistema solar! 💨']
      }
    };

    function getWeightKey(v){
      if(v<=50) return 'w40';
      if(v<=60) return 'w51';
      if(v<=70) return 'w61';
      if(v<=80) return 'w71';
      if(v<=90) return 'w81';
      return 'w91';
    }

    function wt(){
        var v=parseFloat(document.getElementById('as2-kg').value)||0;
        var p=P[cur];
        var tierraEl=document.getElementById('as2-tierra-kg');
        var planetaEl=document.getElementById('as2-planeta-kg');
        var nomEl=document.getElementById('as2-planeta-nom');
        var gEl=document.getElementById('as2-planeta-g');
        var emoEl=document.getElementById('as2-planeta-emoji');
        var msgEl=document.getElementById('as2-msg');
        var bT=document.getElementById('as2-barra-tierra');
        var bP=document.getElementById('as2-barra-planeta');
        if(!tierraEl)return;

        if(tierraEl) tierraEl.textContent=v.toFixed(1)+' kg';

        if(p.isFootball){
            if(emoEl)emoEl.textContent='⚽';
            if(nomEl)nomEl.textContent='Balón';
            if(planetaEl)planetaEl.textContent='$'+(v*GOLD).toLocaleString('es-MX');
            if(gEl)gEl.textContent='precio en oro';
            if(bP)bP.style.width='80%';
            if(msgEl)msgEl.textContent='¡Vales más que Messi! 🤑';
            return;
        }
        if(!p.g){ if(planetaEl)planetaEl.textContent='—'; return; }

        var pesoP=(v*p.g).toFixed(1);
        var ratio=p.g;
        var emoji=EMOJIS[p.n]||'🌑';
        if(emoEl)emoEl.textContent=emoji;
        if(nomEl)nomEl.textContent=p.n;
        if(planetaEl)planetaEl.textContent=pesoP+' kg';
        if(gEl)gEl.textContent='gravedad '+ratio+'×';

        // Barras comparativas
        var maxG=Math.max(1,ratio);
        var pctT=Math.min(100,(1/Math.max(1,ratio))*80+10);
        var pctP=Math.min(100,ratio>1?(Math.min(ratio,5)/5)*90:ratio*50+10);
        if(bT)bT.style.width=pctT+'%';
        if(bP)bP.style.width=pctP+'%';

        // Mensaje gracioso — ratio × peso
        var ratioKey = ratio>3 ? 'muyAlto' : ratio>=1.5 ? 'alto' : ratio>=0.85 ? 'igual' : ratio>=0.2 ? 'bajo' : 'muyBajo';
        var wKey = getWeightKey(v);
        var pool = (MSGS[ratioKey] && MSGS[ratioKey][wKey]) || ['¡El universo te observa! 🌌'];
        var msg  = pool[cur % pool.length];
        if(msgEl)msgEl.textContent=msg;
    }
    var kgEl=document.getElementById('as2-kg');if(kgEl)kgEl.oninput=wt;

    function resolveImg(p,callback){
        var img1=new Image();
        img1.onload=function(){callback(p.img);};
        img1.onerror=function(){if(p.fb){callback(p.fb);}else{callback('');}};
        img1.src=p.img;
    }

    function renderPlanet(i,texUrl){
        var p=P[i],pl=document.getElementById('as2-pl'),fw=document.getElementById('as2-fw'),rw=document.getElementById('as2-rw');
        if(!pl)return;
        if(p.isFootball){
            pl.style.display='none';fw.style.display='block';
            fw.style.backgroundImage='url(assets/balon-tierra.webp)';fw.style.backgroundSize='200% 100%';
            fw.style.backgroundRepeat='repeat-x';fw.style.animationName='as2Spin';fw.style.animationDuration='16s';
            fw.style.animationTimingFunction='linear';fw.style.animationIterationCount='infinite';
            fw.style.boxShadow='inset -35px -15px 60px rgba(0,0,0,.9),inset 12px 10px 30px rgba(255,255,255,.25),0 0 30px 6px rgba(255,255,255,.08)';
            fw.style.overflow='hidden';
        }else{
            pl.style.display='';fw.style.display='none';
            pl.style.backgroundImage='url('+texUrl+')';pl.style.backgroundSize='200% 100%';pl.style.backgroundRepeat='repeat-x';
            pl.style.animationName='as2Spin';pl.style.animationDuration=p.s;
            if(p.isSun){
                pl.style.boxShadow='inset -25px -12px 45px rgba(255,140,0,.3),0 0 60px 18px rgba(255,170,0,.5)';
                pl.style.animationName='as2Spin, as2SunGlow';pl.style.animationDuration=p.s+', 3s';
                pl.style.animationTimingFunction='linear, ease-in-out';pl.style.animationIterationCount='infinite, infinite';
            }else{
                pl.style.boxShadow='inset -25px -12px 45px rgba(0,0,0,.85),inset 8px 6px 18px rgba(255,255,255,.08)';
            }
        }
        rw.style.opacity=p.ring?'1':'0';
        var info=document.getElementById('as2-info');
        info.style.animation='none';void info.offsetWidth;info.style.animation='as2FadeUp .4s ease';
        document.getElementById('as2-pn').textContent=p.n;
        document.getElementById('as2-pd').textContent=p.d;
        var st=document.getElementById('as2-stats');
        if(!p.isFootball){
            st.innerHTML='<span>Inclinación<br><b>'+p.tilt+'</b></span><span>Día<br><b>'+p.day+'</b></span><span>Año<br><b>'+p.year+'</b></span>';
        }else{st.innerHTML='';}
        dotsEl.querySelectorAll('div').forEach(function(d,j){
            d.style.background=j===i?'#fff':'rgba(255,255,255,.28)';
            d.style.boxShadow=j===i?'0 0 7px #fff':'';
        });
        wt();
        setTimeout(function(){speak(p.n+'. '+p.d);},300);
    }

    function go(i){cur=(i+P.length)%P.length;resolveImg(P[cur],function(url){renderPlanet(cur,url);});}

    var prevBtn=document.getElementById('as2-prev');
    var nextBtn=document.getElementById('as2-next');
    if(prevBtn)prevBtn.addEventListener('click',function(){go(cur-1);});
    if(nextBtn)nextBtn.addEventListener('click',function(){go(cur+1);});

    var tx2=0;
    wrap.addEventListener('touchstart',function(e){tx2=e.touches[0].clientX;},{passive:true});
    wrap.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-tx2;if(Math.abs(dx)>40)go(cur+(dx<0?1:-1));},{passive:true});

    resolveImg(P[0],function(url){renderPlanet(0,url);});

    return { cleanup: function() {
        cancelAnimationFrame(raf2); raf2=null;
        window.removeEventListener('resize',rsz);
        if(window.speechSynthesis)window.speechSynthesis.cancel();
        _profOcultas.forEach(function(id){var el=document.getElementById(id);if(el){el.style.opacity='';}});
        vfx.style.background='';
        vfx.innerHTML='';
        if(elNina){elNina.style.zIndex='';elNina.style.position='';}
    }};
}

function efectoNieve(vfx) {
    if(!document.getElementById('snow-keyframes')){
        const st = document.createElement('style'); st.id = 'snow-keyframes';
        st.textContent = `
        @keyframes snowFall {
            0%   { transform: translateY(-10px) translateX(0px); opacity:0; }
            10%  { opacity: 1; }
            90%  { opacity: 0.7; }
            100% { transform: translateY(calc(100vh + 10px)) translateX(var(--sw)); opacity:0; }
        }`;
        document.head.appendChild(st);
    }

    const cont = document.createElement('div');
    cont.style.cssText = `position:absolute; inset:0; z-index:1;
        pointer-events:none; overflow:hidden;`;
    vfx.appendChild(cont);

    const flakes = [];
    const COUNT = 60;

    for(let i = 0; i < COUNT; i++) {
        const f = document.createElement('div');
        const size = 2 + Math.random() * 4;
        const left = Math.random() * 100;
        const duration = 4 + Math.random() * 6;
        const delay = Math.random() * -10;
        const swing = (Math.random() - 0.5) * 60;

        f.style.cssText = `
            position:absolute;
            left:${left}%;
            top:-10px;
            width:${size}px;
            height:${size}px;
            border-radius:50%;
            background:rgba(255,255,255,0.85);
            --sw:${swing}px;
            animation: snowFall ${duration}s linear ${delay}s infinite;
            box-shadow: 0 0 ${size}px rgba(255,255,255,0.6);
        `;
        cont.appendChild(f);
        flakes.push(f);
    }

    return { cleanup: () => { cont.remove(); }};
}

// ─── APLICA GLOW MORADO SIN MOVER EL ELEMENTO ────────────────────────
function aplicarGlowMorado(id) {
    if(!document.getElementById('glow-morado-keyframes')){
        const st = document.createElement('style'); st.id = 'glow-morado-keyframes';
        st.textContent = `@keyframes glowMoradoFijo {
            0%,100% { filter: drop-shadow(0 0 6px rgba(180,0,255,0.7)) drop-shadow(0 0 18px rgba(140,0,200,0.5)); }
            50%     { filter: drop-shadow(0 0 12px rgba(180,0,255,1))   drop-shadow(0 0 30px rgba(140,0,200,0.8)); }
        }`;
        document.head.appendChild(st);
    }
    const el = document.getElementById(id);
    if(el) el.style.animation = 'glowMoradoFijo 2s ease-in-out infinite';
    return { cleanup: () => { if(el){ el.style.animation = ''; el.style.filter = ''; } }};
}

// ─── EFECTO PERSONAJE AL FRENTE + GLOW MORADO ANIMADO ────────────────
function efectoPersonajeGlowMorado(vfx, idPersonaje) {
    const el      = document.getElementById(idPersonaje);
    const _parent = el?.parentNode;
    const _next   = el?.nextSibling;
    if(el){
        el.style.animation = 'none'; // detener glowSimple/glowDouble antes
        void el.offsetWidth;         // forzar reflow
    }
    const g = aplicarGlowMorado(idPersonaje); // inyecta keyframe y aplica glow morado
    if(el){
        el.style.zIndex   = '158';
        el.style.position = 'absolute';
        vfx.appendChild(el);
    }
    return { cleanup: () => {
        g.cleanup();
        if(el){
            el.style.zIndex    = '';
            el.style.position  = '';
            el.style.animation = ''; // restaurar animación CSS original
            if(_parent) _parent.insertBefore(el, _next);
        }
    }};
}

// ─── EFECTO PERSONAJE AL FRENTE (genérico) ───────────────────────────
function efectoPersonajeAlFrente(vfx, idPersonaje) {
    const el       = document.getElementById(idPersonaje);
    const _parent  = el?.parentNode;
    const _next    = el?.nextSibling;
    if(el){
        el.style.zIndex   = '152';
        el.style.position = 'absolute';
        vfx.appendChild(el);
    }
    return { cleanup: () => {
        if(el){
            el.style.zIndex   = '';
            el.style.position = '';
            if(_parent) _parent.insertBefore(el, _next);
        }
    }};
}

// ─── EFECTO JUGADORAS (nina-4): todas oscilan 80%→50% ────────────────
function efectoJugadoras(vfx) {
    const ids = [
        'glow-jugadoras','glow-futbolista','glow-doctora',
        'glow-ingeniera','glow-maestra','glow-bombera','glow-repartidora'
    ];

    if(!document.getElementById('jugadoras-keyframes')){
        const st = document.createElement('style'); st.id = 'jugadoras-keyframes';
        st.textContent = `@keyframes jugadorasOscila {
            0%,100% { opacity: 0.8; }
            50%     { opacity: 0.5; }
        }`;
        document.head.appendChild(st);
    }

    const guardadas = ids.map(id => {
        const el = document.getElementById(id);
        if(!el) return null;
        const _parent = el.parentNode;
        const _next   = el.nextSibling;
        el.style.zIndex     = '152';
        el.style.position   = 'absolute';
        el.style.animation  = 'none';
        el.style.filter     = 'brightness(0.6) drop-shadow(0 0 6px rgba(180,0,255,0.6)) drop-shadow(0 0 14px rgba(140,0,200,0.4))';
        vfx.appendChild(el);
        return { el, _parent, _next };
    }).filter(Boolean);

    return { cleanup: () => {
        guardadas.forEach(({ el, _parent, _next }) => {
            el.style.zIndex    = '';
            el.style.position  = '';
            el.style.animation = '';
            el.style.filter    = '';
            if(_parent) _parent.insertBefore(el, _next);
        });
    }};
}

// ==========================================
// FUNCION  3 — LLAMAS LÍQUIDAS CÓSMICAS
// ==========================================
function efectoBombera(vfx) {
    const modal = document.getElementById('modal-nina');

    // ── Mismo patrón que nina-1: mover glow al frente ──────────────
    const elBombera      = document.getElementById('glow-bombera');
    const elNina         = document.getElementById('glow-nina');
    const _parentBombera = elBombera?.parentNode;
    const _nextBombera   = elBombera?.nextSibling;
    if (elBombera) { elBombera.style.zIndex = '159'; elBombera.style.position = 'absolute'; vfx.appendChild(elBombera); }
    if (elNina)    { elNina.style.zIndex = '159'; elNina.style.position = 'absolute'; }

    // ── CONTENEDOR RAÍZ (cubre todo el modal) ──────────────────────
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;z-index:165;overflow:hidden;pointer-events:none;';

    function ajustarWrap() { /* no-op, wrap cubre inset:0 */ }

    // SVG filtro — debe estar en el DOM antes que capVisual lo use
    const svgFiltro = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgFiltro.style.cssText = 'display:none;position:absolute;';
    svgFiltro.innerHTML = `<defs><filter id="ln3-goo">
        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/>
        <feColorMatrix in="blur" mode="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 40 -16" result="goo"/>
        <feBlend in="SourceGraphic" in2="goo"/>
    </filter></defs>`;
    wrap.appendChild(svgFiltro);

    // Capa visual: llamas con efecto gooey, sin capturar eventos
    const capVisual = document.createElement('div');
    capVisual.style.cssText = 'position:absolute;inset:0;pointer-events:none;filter:url(#ln3-goo);';
    wrap.appendChild(capVisual);

    // Capa hit: llamas invisibles encima, solo capturan eventos
    const capHit = document.createElement('div');
    capHit.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    wrap.appendChild(capHit);

    modal.appendChild(wrap);
    ajustarWrap();
    window.addEventListener('resize', ajustarWrap);

    // ── ESTILOS ────────────────────────────────────────────────────
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        /* Llama visual (decorativa) */
        .ln3v {
            position:absolute;
            width:34px; height:34px;
            border-radius:50%;
            mix-blend-mode:screen;
            pointer-events:none;
        }
        .ln3v.azul  { background:radial-gradient(circle,#fff 0%,#00d2ff 30%,#0022ff 65%,#7a00ff 100%); box-shadow:0 0 20px rgba(122,0,255,.85); }
        .ln3v.morada{ background:radial-gradient(circle,#fff 0%,#dd88ff 25%,#9900ff 60%,#5500cc 100%); box-shadow:0 0 22px rgba(180,0,255,.9); }
        .ln3v.frag  { width:18px;height:18px; }

        /* Llama hit (invisible, recibe eventos) */
        .ln3h {
            position:absolute;
            width:44px; height:44px;     /* un poco más grande para fácil tap */
            border-radius:50%;
            pointer-events:auto;
            cursor:pointer;
            background:transparent;
            transform:translate(-5px,-5px); /* centra sobre la visual de 34px */
        }

        @keyframes ln3-flotar-1 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(110px,75px) scale(1.08)} 100%{transform:translate(-55px,-130px) scale(.9)} }
        @keyframes ln3-flotar-2 { 0%{transform:translate(0,0) scale(.92)} 50%{transform:translate(-90px,-140px) scale(1.1)} 100%{transform:translate(75px,45px) scale(1)} }
        @keyframes ln3-flotar-3 { 0%{transform:translate(0,0) scale(1.08)} 50%{transform:translate(55px,-165px) scale(.9)} 100%{transform:translate(-110px,55px) scale(1)} }
        @keyframes ln3-flotar-4 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(-130px,110px) scale(.82)} 100%{transform:translate(95px,-95px) scale(1.18)} }
        @keyframes ln3-flotar-5 { 0%{transform:translate(0,0) scale(.9)} 50%{transform:translate(140px,-85px) scale(1.1)} 100%{transform:translate(-85px,105px) scale(1)} }
        @keyframes ln3-deformar {
            0%  { border-radius:42% 58% 70% 30%/45% 45% 55% 55% }
            50% { border-radius:70% 30% 52% 48%/60% 40% 60% 40% }
            100%{ border-radius:30% 70% 38% 62%/40% 60% 30% 70% }
        }
        @keyframes ln3-boom { 0%{transform:scale(1);opacity:1} 60%{transform:scale(2.6);opacity:.5} 100%{transform:scale(0);opacity:0} }
        @keyframes ln3-volar { 0%{opacity:1;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(var(--fx),var(--fy)) scale(.25)} }

        /* Tarjeta frase */
        .ln3-card {
            position:absolute; left:50%; top:50%;
            transform:translate(-50%,-50%) scale(.85);
            z-index:10; width:clamp(200px,72%,300px);
            background:rgba(5,0,20,.95);
            border:2px solid rgba(180,0,255,.9);
            border-radius:14px; padding:14px 16px 12px;
            box-sizing:border-box;
            box-shadow:0 0 22px rgba(180,0,255,.8),0 4px 20px rgba(0,0,0,.7);
            font-family:'Segoe UI',sans-serif; text-align:center;
            opacity:0; transition:opacity .3s,transform .3s;
            pointer-events:auto; cursor:pointer;
        }
        .ln3-card.on { opacity:1; transform:translate(-50%,-50%) scale(1); }
    `;
    document.head.appendChild(styleEl);

    // ── DATOS ──────────────────────────────────────────────────────
    const FLOTARS = ['ln3-flotar-1','ln3-flotar-2','ln3-flotar-3','ln3-flotar-4','ln3-flotar-5'];

    const POS_AZUL = [
        [12,14],[38,22],[65,12],[15,48],[32,36],
        [22,10],[72,32],[50,10],[60,32],[80,12]
    ];
    const POS_MORADA = [
        [25,68],[52,58],[78,65],[80,38],[65,42],
        [42,72],[62,72],[15,42],[35,14],[75,52],
        [12,72],[46,60],[66,68],[50,46],[14,58]
    ];
    // 15 llamas moradas × 3 consejos CDMX + EdoMex — se elige 1 al azar al explotar
    const FRASES = [
        /* 0 — ALERTA SÍSMICA */ [
            { icono:'📡', titulo:'ALERTA SÍSMICA · Actúa ya',        texto:'Cuando suene la alerta sísmica tienes entre 40 y 120 segundos antes de que lleguen las ondas destructivas. No esperes a sentir el temblor: sal del edificio ya.' },
            { icono:'📡', titulo:'ALERTA SÍSMICA · Suelo blando',    texto:'El suelo blando amplifica los sismos hasta 5 veces. Si vives en zona lacustre o sobre relleno, el movimiento será mucho mayor que en zonas de roca firme.' },
            { icono:'📡', titulo:'ALERTA SÍSMICA · Sin margen',      texto:'La alerta sísmica no llega siempre antes que el temblor: en zonas cercanas al epicentro puede sonar al mismo tiempo. Actívate desde el primer beep sin esperar más señales.' },
        ],
        /* 1 — SISMO */ [
            { icono:'🏠', titulo:'SISMO · Cúbrete',                  texto:'Al temblar, aléjate de ventanas y libreros. Colócate bajo una mesa sólida, protege tu cabeza con los brazos y espera a que cese el movimiento antes de salir.' },
            { icono:'🏠', titulo:'SISMO · Conoce tu salida',         texto:'En edificios con construcción irregular o antigua, conoce las rutas de salida de antemano. El pánico en escaleras ha sido una de las principales causas de víctimas en sismos.' },
            { icono:'🏠', titulo:'SISMO · Después del temblor',      texto:'Después del sismo revisa fugas de gas antes de encender luces o aparatos. El incendio llega después del temblor cuando no se cierran las llaves a tiempo.' },
        ],
        /* 2 — SIMULACRO */ [
            { icono:'🔔', titulo:'SIMULACRO · Entrena tu cuerpo',    texto:'Participar en simulacros entrena al cuerpo para actuar sin pensar cuando llega la emergencia real. La memoria muscular puede salvar tu vida cuando el miedo paraliza la mente.' },
            { icono:'🔔', titulo:'SIMULACRO · Sin caos',             texto:'En el simulacro camina en orden hacia la salida más cercana. El caos en las escaleras fue una de las principales causas de víctimas en los grandes sismos.' },
            { icono:'🔔', titulo:'SIMULACRO · Punto de reunión',     texto:'Conoce el punto de reunión de tu edificio o colonia. Si no sabes cuál es, pregúntalo hoy a tu coordinador o vecino, antes de que haya una emergencia real.' },
        ],
        /* 3 — INUNDACIONES */ [
            { icono:'🌊', titulo:'INUNDACIONES · Zonas de riesgo',   texto:'Las zonas sobre suelo lacustre y zonas bajas son las más vulnerables en temporada de lluvias. Si hay alerta, sube tus objetos valiosos antes de que llegue el agua.' },
            { icono:'🌊', titulo:'INUNDACIONES · No cruces',         texto:'El drenaje puede saturarse en menos de 30 minutos de lluvia intensa. Nunca cruces un vado inundado aunque parezca poco profundo: la corriente arrastra vehículos y personas.' },
            { icono:'🌊', titulo:'INUNDACIONES · Infórmate antes',   texto:'Consulta el Atlas de Riesgos de tu localidad para conocer los puntos de inundación recurrentes. Estar informado con anticipación te da tiempo para proteger lo que más importa.' },
        ],
        /* 4 — PLAN FAMILIAR */ [
            { icono:'👨‍👩‍👧‍👦', titulo:'PLAN FAMILIAR · Punto de reunión', texto:'Define un punto de reunión fuera de casa conocido por todos, incluyendo niños y adultos mayores. Practícalo para que cada quien sepa a dónde ir sin necesidad de comunicarse.' },
            { icono:'👨‍👩‍👧‍👦', titulo:'PLAN FAMILIAR · Los niños',  texto:'Establece quién recoge a los niños en la escuela si ocurre una emergencia mientras están en clases. No lo dejes al azar: defínelo y comunícalo a la escuela con anticipación.' },
            { icono:'👨‍👩‍👧‍👦', titulo:'PLAN FAMILIAR · Sin celular', texto:'Guarda los números de emergencia en papel, no solo en el celular. El 911 funciona las 24 horas en todo el país y es la línea más importante que debes memorizar.' },
        ],
        /* 5 — VOLCÁN POPOCATÉPETL */ [
            { icono:'🌋', titulo:'VOLCÁN · Semáforo de alerta',      texto:'El Popocatépetl es uno de los volcanes más activos del mundo. Ante semáforo amarillo fase 3 o rojo, ten lista tu mochila de emergencia y sigue los comunicados del CENAPRED.' },
            { icono:'🌋', titulo:'VOLCÁN · Caída de ceniza',         texto:'Si cae ceniza volcánica, cubre nariz y boca con mascarilla N95 o tela húmeda. No uses lentes de contacto: la ceniza irrita y puede raspar la córnea.' },
            { icono:'🌋', titulo:'VOLCÁN · Sella tu hogar',          texto:'Durante una caída de ceniza, mantén puertas y ventanas selladas. Cubre tinacos y aljibes porque la ceniza contamina el agua y puede dañar los motores de vehículos.' },
        ],
        /* 6 — GAS LP */ [
            { icono:'🔥', titulo:'GAS LP · Hueles gas, sal',         texto:'Si hueles gas, NO enciendas nada: ni luz, ni estufa, ni celular. Abre ventanas, cierra la llave del tanque y sal del lugar. Llama a emergencias desde afuera.' },
            { icono:'🔥', titulo:'GAS LP · Revisa la manguera',      texto:'Revisa las mangueras de tu tanque cada seis meses y exige que el distribuidor use material certificado. Una fuga pequeña ignorada puede causar una explosión grande.' },
            { icono:'🔥', titulo:'GAS LP · Sin ventilación, no',     texto:'Nunca instales el tanque dentro de espacios cerrados o sin ventilación. El monóxido de carbono no tiene olor ni color, y puede causar la muerte mientras se duerme.' },
        ],
        /* 7 — INCENDIO EN CASA */ [
            { icono:'🧯', titulo:'INCENDIO · El humo mata primero',  texto:'Si hay incendio, sal de inmediato sin regresar por objetos. El humo mata antes que las llamas: agáchate donde el aire es más limpio y cubre nariz y boca con una tela.' },
            { icono:'🧯', titulo:'INCENDIO · Toca antes de abrir',   texto:'Antes de abrir una puerta en un incendio, toca la manija con el dorso de la mano. Si está caliente, no la abras: el fuego está del otro lado. Busca otra salida o sella la puerta.' },
            { icono:'🧯', titulo:'INCENDIO · Usa el extintor',       texto:'Ten un extintor en casa y aprende a usarlo: retira el seguro, apunta a la base del fuego, aprieta la palanca y barre de lado a lado. Un extintor bien usado puede detener un incendio pequeño.' },
        ],
        /* 8 — RESCATE URBANO */ [
            { icono:'🚑', titulo:'RESCATE · Golpea con ritmo',       texto:'Si quedas atrapado bajo escombros, golpea con ritmo regular una tubería o pared. Los equipos de rescate usan micrófonos sensibles que detectan señales a metros de distancia.' },
            { icono:'🚑', titulo:'RESCATE · Conserva energía',       texto:'Conserva energía si estás atrapado. Grita solo cuando escuches voces cerca. El agotamiento y la deshidratación son los mayores peligros después del colapso de un edificio.' },
            { icono:'🚑', titulo:'RESCATE · No muevas escombros',    texto:'No retires escombros sin personal capacitado. Un movimiento en falso puede colapsar lo que sostiene a los sobrevivientes. Espera a los equipos de búsqueda y rescate.' },
        ],
        /* 9 — MOCHILA DE EMERGENCIA */ [
            { icono:'🎒', titulo:'MOCHILA · Lo básico: 72 horas',    texto:'Ten lista una mochila con agua, comida no perecedera, linterna, radio de pilas, botiquín y documentos para sobrevivir al menos 72 horas sin servicios públicos.' },
            { icono:'🎒', titulo:'MOCHILA · No olvides el silbato',  texto:'Incluye medicamentos de uso continuo, copias de documentos, dinero en efectivo, ropa de cambio y un silbato. El silbato se escucha donde la voz ya no llega.' },
            { icono:'🎒', titulo:'MOCHILA · Revísala dos veces',     texto:'Revisa tu mochila dos veces al año, por ejemplo en los días de simulacro. Cambia el agua embotellada, verifica las pilas y actualiza los medicamentos vencidos.' },
        ],
        /* 10 — BARRANCAS Y DESLIZAMIENTOS */ [
            { icono:'🏔️', titulo:'DESLIZAMIENTO · Aléjate del borde', texto:'Las zonas con barrancas y laderas pronunciadas son de alto riesgo durante lluvias intensas. Aléjate de los bordes: el suelo saturado puede ceder sin dar ningún aviso previo.' },
            { icono:'🏔️', titulo:'DESLIZAMIENTO · Señales previas',  texto:'Señales de deslizamiento inminente: grietas nuevas en paredes o suelo, puertas que ya no cierran bien y ruidos subterráneos. Si las detectas, evacúa y avisa a Protección Civil.' },
            { icono:'🏔️', titulo:'DESLIZAMIENTO · Lluvia extrema',   texto:'Los asentamientos sobre laderas sin cimentación adecuada son los más vulnerables. Con lluvia mayor a 30 mm por hora, busca refugio en zona plana de inmediato.' },
        ],
        /* 11 — TRANSPORTE PÚBLICO */ [
            { icono:'🚇', titulo:'TRÁNSITO · Sismo en el metro',     texto:'Si hay sismo mientras estás en el transporte público, mantén la calma. El sistema frena automáticamente. Espera instrucciones del personal antes de bajar.' },
            { icono:'🚇', titulo:'TRÁNSITO · Incendio en estación',  texto:'En caso de incendio en una estación o unidad, cubre nariz y boca, activa la alarma más cercana y sigue las señales de salida de emergencia hacia el exterior.' },
            { icono:'🚇', titulo:'TRÁNSITO · Si el servicio para',   texto:'En emergencias mayores el transporte público puede suspenderse. Ten siempre dinero en efectivo y el número de un familiar para poder comunicarte si quedas varado.' },
        ],
        /* 12 — APAGÓN */ [
            { icono:'⚡', titulo:'APAGÓN · Desconecta aparatos',     texto:'Ante un apagón prolongado, desconecta los aparatos electrónicos para protegerlos del pico de voltaje cuando regrese la corriente. Deja solo una lámpara encendida como indicador.' },
            { icono:'⚡', titulo:'APAGÓN · Luz sin riesgo',          texto:'Ten siempre linternas con pilas cargadas y velas con encendedores accesibles. Las velas deben colocarse en superficies estables, lejos de telas o materiales inflamables.' },
            { icono:'⚡', titulo:'APAGÓN · Cuida tus alimentos',     texto:'En apagones de más de cuatro horas, los alimentos refrigerados empiezan a descomponerse. Abre el refrigerador lo menos posible y consume primero lo más perecedero.' },
        ],
        /* 13 — PRIMEROS AUXILIOS */ [
            { icono:'🩺', titulo:'AUXILIOS · Hemorragia',            texto:'Ante hemorragia, presiona directo con lo más limpio disponible durante diez minutos sin soltar. Si la herida es profunda, no retires el objeto incrustado: estabilízalo y llama al 911.' },
            { icono:'🩺', titulo:'AUXILIOS · Paro cardíaco',         texto:'Si alguien tiene un paro cardíaco, llama al 911 e inicia RCP: 30 compresiones rápidas en el centro del pecho, luego dos respiraciones. No pares hasta que llegue la ambulancia.' },
            { icono:'🩺', titulo:'AUXILIOS · Intoxicación',          texto:'Para intoxicaciones, llama de inmediato a los servicios de emergencia. No induzcas el vómito a menos que el médico lo indique: algunos tóxicos causan más daño al vomitarse.' },
        ],
        /* 14 — PROTECCIÓN CIVIL */ [
            { icono:'🛡️', titulo:'PROTEC. CIVIL · Conócela',        texto:'Protección Civil coordina brigadas, refugios temporales y apoyos tras un desastre. Conoce la oficina más cercana a tu comunidad antes de que ocurra una emergencia.' },
            { icono:'🛡️', titulo:'PROTEC. CIVIL · Sin fake news',   texto:'Mantente informado a través de canales oficiales durante emergencias. La desinformación en redes sociales puede causar pánico innecesario y entorpecer las labores de rescate.' },
            { icono:'🛡️', titulo:'PROTEC. CIVIL · Organízate',      texto:'Organízate con tus vecinos y solicita un taller de brigadistas comunitarios. Las comunidades con brigadas entrenadas reducen significativamente las víctimas ante cualquier desastre.' },
        ],
    ];

    // ── CREAR LLAMA ────────────────────────────────────────────────
    // Devuelve { visual, hit } para poder sincronizarlos o eliminarlos juntos
    function crearLlama(l, t, tipo, idx) {
        const flotar = FLOTARS[idx % FLOTARS.length];
        const dur    = 17 + (idx % 9);
        const ddef   = 3  + (idx % 5) * 0.28;
        const delay  = -(idx * 1.3 + (idx % 3) * 0.7);
        const anim   = `${flotar} ${dur}s ${delay}s infinite alternate ease-in-out, ln3-deformar ${ddef}s ${delay * 0.4}s infinite alternate ease-in-out`;

        // Visual
        const vis = document.createElement('div');
        vis.className = `ln3v ${tipo}`;
        vis.style.cssText = `left:${l}%;top:${t}%;animation:${anim};`;
        capVisual.appendChild(vis);

        // Hit (invisible, misma animación para que coincida con la visual)
        const hit = document.createElement('div');
        hit.className = 'ln3h';
        hit.style.cssText = `left:${l}%;top:${t}%;animation:${anim};`;
        capHit.appendChild(hit);

        if (tipo === 'azul') {
            hit.addEventListener('click',     () => dividir(vis, hit, l, t, idx));
            hit.addEventListener('touchstart', e => { e.preventDefault(); dividir(vis, hit, l, t, idx); }, { passive:false });
        } else {
            hit.addEventListener('click',     () => explotar(vis, hit, CONSEJO_POR_LLAMA[idx]));
            hit.addEventListener('touchstart', e => { e.preventDefault(); explotar(vis, hit, CONSEJO_POR_LLAMA[idx]); }, { passive:false });
        }
        return { vis, hit };
    }

    // Mezclar los 45 consejos y asignar 1 único por llama morada
    const _todosConsejos = FRASES.flat();
    for (let i = _todosConsejos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [_todosConsejos[i], _todosConsejos[j]] = [_todosConsejos[j], _todosConsejos[i]];
    }
    // Cada llama morada recibe su consejo único (15 llamas, 45 consejos → sobran 30, no importa)
    const CONSEJO_POR_LLAMA = _todosConsejos.slice(0, POS_MORADA.length);

    POS_AZUL.forEach(([l,t], i)   => crearLlama(l, t, 'azul',   i));
    POS_MORADA.forEach(([l,t], i) => crearLlama(l, t, 'morada', i));

    // ── 20 colores únicos mezclados para los 20 fragmentos ──────────
    const _COLORES_BASE = [
        { bg:'radial-gradient(circle,#fff 0%,#ffff00 30%,#ff8800 70%,#ff2200 100%)', sombra:'rgba(255,130,0,.85)'  },
        { bg:'radial-gradient(circle,#fff 0%,#ff4400 30%,#cc0000 70%,#660000 100%)', sombra:'rgba(220,50,0,.85)'   },
        { bg:'radial-gradient(circle,#fff 0%,#aaff00 30%,#33cc00 70%,#005500 100%)', sombra:'rgba(80,210,0,.85)'   },
        { bg:'radial-gradient(circle,#fff 0%,#00ffee 30%,#00aaff 70%,#0022cc 100%)', sombra:'rgba(0,190,255,.85)'  },
        { bg:'radial-gradient(circle,#fff 0%,#ffaaff 30%,#ff44cc 70%,#aa0077 100%)', sombra:'rgba(255,50,190,.85)' },
        { bg:'radial-gradient(circle,#fff 0%,#ffffaa 30%,#ffdd00 70%,#cc7700 100%)', sombra:'rgba(255,210,0,.85)'  },
        { bg:'radial-gradient(circle,#fff 0%,#aaffcc 30%,#00ddaa 70%,#006644 100%)', sombra:'rgba(0,220,160,.85)'  },
        { bg:'radial-gradient(circle,#fff 0%,#ffccaa 30%,#ff7722 70%,#993300 100%)', sombra:'rgba(255,110,30,.85)' },
        { bg:'radial-gradient(circle,#fff 0%,#ccaaff 30%,#8833ff 70%,#440099 100%)', sombra:'rgba(140,50,255,.85)' },
        { bg:'radial-gradient(circle,#fff 0%,#ffaaaa 30%,#ff2255 70%,#880022 100%)', sombra:'rgba(255,30,80,.85)'  },
        { bg:'radial-gradient(circle,#fff 0%,#aaffff 30%,#00ccff 70%,#004488 100%)', sombra:'rgba(0,200,255,.85)'  },
        { bg:'radial-gradient(circle,#fff 0%,#ccff88 30%,#88ee00 70%,#336600 100%)', sombra:'rgba(140,230,0,.85)'  },
        { bg:'radial-gradient(circle,#fff 0%,#ffcc00 30%,#ff6600 70%,#cc2200 100%)', sombra:'rgba(255,100,0,.85)'  },
        { bg:'radial-gradient(circle,#fff 0%,#88ffee 30%,#00ccbb 70%,#005555 100%)', sombra:'rgba(0,210,180,.85)'  },
        { bg:'radial-gradient(circle,#fff 0%,#ff88cc 30%,#ee0066 70%,#770033 100%)', sombra:'rgba(240,0,100,.85)'  },
        { bg:'radial-gradient(circle,#fff 0%,#aaddff 30%,#3399ff 70%,#003399 100%)', sombra:'rgba(50,150,255,.85)' },
        { bg:'radial-gradient(circle,#fff 0%,#ffff88 30%,#ccee00 70%,#667700 100%)', sombra:'rgba(200,230,0,.85)'  },
        { bg:'radial-gradient(circle,#fff 0%,#ffbbff 30%,#dd22ff 70%,#660088 100%)', sombra:'rgba(200,20,255,.85)' },
        { bg:'radial-gradient(circle,#fff 0%,#ffddaa 30%,#ffaa00 70%,#885500 100%)', sombra:'rgba(255,170,0,.85)'  },
        { bg:'radial-gradient(circle,#fff 0%,#aaffaa 30%,#22ee44 70%,#004422 100%)', sombra:'rgba(30,220,60,.85)'  },
    ];
    // Mezclar Fisher-Yates una sola vez
    const COLORES_FRAG = [..._COLORES_BASE];
    for (let i = COLORES_FRAG.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [COLORES_FRAG[i], COLORES_FRAG[j]] = [COLORES_FRAG[j], COLORES_FRAG[i]];
    }

    // ── DIVIDIR AZUL → 2 fragmentos permanentes ─────────────────────
    function dividir(vis, hit, l, t, idx) {
        hit.style.pointerEvents = 'none';
        vis.style.animation = 'ln3-boom .4s ease-out forwards';
        hit.style.animation = 'ln3-boom .4s ease-out forwards';
        setTimeout(() => { vis.remove(); hit.remove(); }, 420);

        // Cada azul usa su par fijo del array mezclado: azul 0→[0,1], azul 1→[2,3]…
        [[-16,-10],[16,10]].forEach(([ox,oy], fi) => {
            const c       = COLORES_FRAG[(idx * 2 + fi) % COLORES_FRAG.length];
            const flotar  = FLOTARS[(idx * 2 + fi) % FLOTARS.length];
            const dur     = 14 + ((idx * 2 + fi) % 7);
            const delay   = -((idx * 1.7 + fi * 2.3) % 8);
            const ddef    = 1.0 + fi * 0.3;
            const f = document.createElement('div');
            f.className = 'ln3v frag';
            f.style.cssText = `
                left:calc(${l}% + ${ox}px); top:calc(${t}% + ${oy}px);
                background:${c.bg};
                animation:${flotar} ${dur}s ${delay}s infinite alternate ease-in-out,
                           ln3-deformar ${ddef}s infinite alternate ease-in-out;
                box-shadow:0 0 14px ${c.sombra};
                pointer-events:none;
            `;
            capVisual.appendChild(f);
        });
    }

    // ── EXPLOTAR MORADA → TARJETA ──────────────────────────────────
    let cardActiva = false;
    function explotar(vis, hit, consejo) {
        hit.style.pointerEvents = 'none';
        vis.style.animation = 'ln3-boom .35s ease-out forwards';
        hit.style.animation = 'ln3-boom .35s ease-out forwards';
        setTimeout(() => { vis.remove(); hit.remove(); }, 380);

        if (cardActiva) return;
        cardActiva = true;
        const f = consejo;

        const card = document.createElement('div');
        card.className = 'ln3-card';
        card.innerHTML = `
            <div style="font-size:1.7rem;margin-bottom:4px">${f.icono}</div>
            <div style="font-size:.6rem;font-weight:900;letter-spacing:2px;color:#cc88ff;margin-bottom:6px;text-transform:uppercase">${f.titulo}</div>
            <div style="font-size:.66rem;color:rgba(255,255,255,.9);line-height:1.55">${f.texto}</div>
            <div style="margin-top:10px;font-size:.55rem;color:rgba(180,100,255,.6)">✕ toca para cerrar</div>
        `;
        wrap.appendChild(card);
        requestAnimationFrame(() => card.classList.add('on'));

        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(`${f.titulo}. ${f.texto}`);
            u.lang = 'es-MX';
            u.rate = 0.9;
            u.pitch = 1.0;
            // Busca voz mexicana; si no, cualquier español
            const voces = speechSynthesis.getVoices();
            const mx = voces.find(v => v.lang === 'es-MX')
                    || voces.find(v => v.lang.startsWith('es'));
            if (mx) u.voice = mx;
            speechSynthesis.speak(u);
        }

        const cerrar = () => {
            speechSynthesis.cancel();
            card.classList.remove('on');
            setTimeout(() => { card.remove(); cardActiva = false; }, 320);
        };
        card.addEventListener('click',     cerrar);
        card.addEventListener('touchstart', e => { e.preventDefault(); cerrar(); }, { passive:false });
    }

    return {
        cleanup() {
            speechSynthesis.cancel();
            window.removeEventListener('resize', ajustarWrap);
            wrap.remove();
            styleEl.remove();
            if (elBombera) { elBombera.style.zIndex = ''; elBombera.style.position = ''; if (_parentBombera) _parentBombera.insertBefore(elBombera, _nextBombera); }
            if (elNina)    { elNina.style.zIndex = ''; elNina.style.position = ''; }
        }
    };
}

// ==========================================
// FUNCION  4 ARQUITECTA
// ==========================================
function efectoArquitecta(vfx) {
    // ── Mismo patrón que nina-1: mover glow al frente ──────────────
    const elIngeniera      = document.getElementById('glow-ingeniera');
    const elNinaArq        = document.getElementById('glow-nina');
    const _parentIngeniera = elIngeniera?.parentNode;
    const _nextIngeniera   = elIngeniera?.nextSibling;
    if (elIngeniera) { elIngeniera.style.zIndex = '152'; elIngeniera.style.position = 'absolute'; vfx.appendChild(elIngeniera); }
    if (elNinaArq)   { elNinaArq.style.zIndex = '159'; elNinaArq.style.position = 'absolute'; }

    // -- JUEGO: Ahorcado Ingenieria --
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:absolute;inset:0;font-family:Segoe UI,Roboto,sans-serif;color:#fff;z-index:200;';
    vfx.appendChild(wrapper);

    const triviaPool = [
        { q: '¿Qué deben recibir igual hombres y mujeres en el trabajo?',           a: 'MISMO SALARIO' },
        { q: '¿Qué inventó Hedy Lamarr que hoy usamos todos los días?',             a: 'WIFI Y BLUETOOTH' },
        { q: '¿Qué escribió Margaret Hamilton para llegar a la Luna?',              a: 'CODIGO DE LA NASA' },
        { q: '¿Qué barrera invisible frena a las mujeres en ciencia?',              a: 'TECHO DE CRISTAL' },
        { q: '¿Cómo llamamos a la primera foto de un agujero negro?',               a: 'IMAGEN DEL HORIZONTE' },
        { q: '¿Qué necesitan las niñas para elegir ingeniería?',                    a: 'REFERENTES FEMENINOS' },
        { q: '¿Qué cualidad define a una gran ingeniera?',                          a: 'CREATIVIDAD Y LIDERAZGO' },
        { q: '¿Qué aportan las mujeres a la ciencia y tecnología?',                 a: 'PERSPECTIVA DIVERSA' },
        { q: '¿Qué movimiento lucha por la igualdad en ciencias?',                  a: 'MUJERES EN STEM' },
        { q: '¿Qué fue Ada Lovelace en la historia de la computación?',             a: 'PRIMERA PROGRAMADORA' },
        { q: '¿Cómo se llama la ingeniera que dirige SpaceX?',                      a: 'GWYNNE SHOTWELL' },
        { q: '¿Qué construyó Citlali García para el telescopio James Webb?',        a: 'INSTRUMENTOS DE MEDICION' },
        { q: '¿Qué país organizó el Mundial Femenino de 1971?',                     a: 'MEXICO' },
        { q: '¿Qué selección ganó el Mundial Femenino del Azteca en 1971?',         a: 'DINAMARCA' },
        { q: '¿En qué estadio se jugó el Mundial Femenino de 1971?',                a: 'ESTADIO AZTECA' },
        { q: '¿Qué valor es clave para romper barreras en ingeniería?',             a: 'PERSEVERANCIA' },
        { q: '¿Qué tipo de energía investigan muchas ingenieras hoy?',              a: 'ENERGIA RENOVABLE' },
        { q: '¿Qué rama de ingeniería diseña puentes y edificios?',                 a: 'INGENIERIA CIVIL' },
        { q: '¿Cómo se llama el telescopio espacial lanzado en 2021?',              a: 'JAMES WEBB' },
        { q: '¿Qué hace una ingeniera de software?',                                a: 'CREA PROGRAMAS' },
        { q: '¿Qué siglas representan ciencias, tecnología, ingeniería y matemáticas?', a: 'STEM' },
        { q: '¿Qué herramienta usan las ingenieras para diseñar en computadora?',   a: 'SOFTWARE CAD' },
        { q: '¿Qué aporta la ingeniería biomédica a la salud?',                     a: 'PROTESIS Y DISPOSITIVOS' },
        { q: '¿Qué proyecto espacial llevó humanos a la Luna?',                     a: 'APOLO ONCE' },
    ];
    const factPool = [
        'Ada Lovelace fue la primera programadora de la historia en 1843.',
        'Gwynne Shotwell es la ingeniera que lidera SpaceX hoy en día.',
        'Hedy Lamarr inventó la base del WiFi y Bluetooth actuales.',
        'Katie Bouman creó el algoritmo de la primera foto de un agujero negro.',
        'Margaret Hamilton escribió el código del Apolo 11 para la NASA.',
        'En México, solo el 30% de los estudiantes de ingeniería son mujeres.',
        'Citlali García fue la primera mexicana en trabajar en el telescopio James Webb.',
        'Las ingenieras mexicanas en aeroespacial han crecido un 40% en una década.',
    ];

    const MAX_ERRORS = 6; // 6 partes: cabeza, cuerpo, brazo izq, brazo der, pierna izq, pierna der
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÑ';
    function shuffle(arr) { return [...arr].sort(()=>Math.random()-.5); }
    let pool=shuffle(triviaPool), pPos=0;
    let fPool=shuffle(factPool),  fPos=0;
    function nextTrivia() { if(pPos>=pool.length){pool=shuffle(triviaPool);pPos=0;} return pool[pPos++]; }
    function nextFact()   { if(fPos>=fPool.length){fPool=shuffle(factPool);fPos=0;} return fPool[fPos++]; }
    function normA(t) { return t.toUpperCase().replace(/[ÁÀÂÄ]/g,'A').replace(/[ÉÈÊË]/g,'E').replace(/[ÍÌÎÏ]/g,'I').replace(/[ÓÒÔÖ]/g,'O').replace(/[ÚÙÛÜ]/g,'U').replace(/[^A-ZÑ ]/g,''); }

    let lvl=0, activeAnswer='', guessed=new Set(), errors=0, canShoot=false, busy=false;

    wrapper.innerHTML = `
    <style>
        .ing-root  { display:flex; flex-direction:column; height:100%; background:transparent; gap:3px; padding:3px 0; box-sizing:border-box; }
        .ing-fact  { font-size:.6rem; color:#00f2ff; background:rgba(0,0,0,.38); border:1px solid rgba(0,242,255,.28); padding:4px 8px; margin:0 5px; border-radius:5px; line-height:1.3; flex-shrink:0; }
        .ing-q     { font-size:.8rem; font-weight:bold; text-align:center; background:rgba(0,0,0,.42); border:2px solid #00f2ff; border-radius:8px; padding:6px 8px; margin:0 5px; display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0; min-height:38px; }
        .ing-field { flex:0 0 auto; height:clamp(55px,13vh,95px); background:rgba(27,94,32,.82); border:3px solid rgba(255,255,255,.55); position:relative; overflow:hidden; margin:0 5px; border-radius:4px; }
        .ing-goal  { position:absolute; right:0; top:50%; transform:translateY(-50%); width:26px; height:60%; border:4px solid #fff; border-right:none; }
        .ing-ball  { position:absolute; font-size:26px; left:28px; top:50%; transform:translateY(-50%); transition:all .6s cubic-bezier(.175,.885,.32,1.275); z-index:10; cursor:pointer; }
        .ing-ball.glow { animation:ingGlow .9s ease-in-out infinite alternate; }
        @keyframes ingGlow { from{filter:drop-shadow(0 0 4px #fff) drop-shadow(0 0 8px #ffd700);transform:translateY(-50%) scale(1);} to{filter:drop-shadow(0 0 14px #fff) drop-shadow(0 0 24px #ffd700);transform:translateY(-50%) scale(1.12);} }
        .ing-barrier { position:absolute; width:9px; height:70%; background:repeating-linear-gradient(45deg,#f1c40f,#f1c40f 5px,rgba(0,0,0,.55) 5px,rgba(0,0,0,.55) 10px); top:50%; transform:translateY(-50%); transition:.5s; z-index:5; }
        .ing-barrier.broken { transform:translateY(400px); opacity:0; }
        .ing-alert { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) scale(0); transition:.22s; z-index:20; text-align:center; pointer-events:none; }
        .ing-alert.on { transform:translate(-50%,-50%) scale(1.5); }
        .ing-diploma { position:absolute; inset:0; background:rgba(10,14,20,.88); display:none; flex-direction:column; align-items:center; justify-content:center; text-align:center; border:6px double #d4af37; z-index:30; padding:10px; box-sizing:border-box; }
        .ing-diploma h2 { font-family:serif; margin:4px 0; font-size:1rem; color:#ffd700; }
        .ing-diploma p  { font-size:.72rem; margin:3px 0; color:#fff; }
        .ing-mid   { display:flex; flex-direction:row; gap:4px; margin:0 4px; flex:1; min-height:0; }
        .ing-left  { display:flex; flex-direction:column; align-items:center; justify-content:center; flex-shrink:0; }
        .ing-hangman svg .hpart { transition:opacity .3s; }
        .ing-right { display:flex; flex-direction:column; gap:3px; flex:1; min-width:0; }
        .ing-blanks { display:flex; flex-wrap:wrap; justify-content:center; gap:3px 5px; padding:4px; background:rgba(0,0,0,.35); border-radius:6px; min-height:28px; align-items:flex-end; }
        .ing-letter { display:inline-flex; flex-direction:column; align-items:center; gap:1px; }
        .ing-letter span { font-size:clamp(.7rem,2vw,1rem); font-weight:bold; color:#fff; min-width:13px; text-align:center; min-height:1em; letter-spacing:.5px; }
        .ing-letter hr  { width:100%; border:none; border-top:2px solid rgba(255,255,255,.55); margin:0; }
        .ing-letter.found span { color:#00f2ff; }
        .ing-letter.space { width:8px; }
        .ing-kbd { display:flex; flex-direction:column; align-items:center; gap:4px; padding:6px; background:rgba(0,0,0,.30); border-radius:6px; }
        .ing-kbd-row { display:flex; justify-content:center; gap:4px; }
        .ing-key { width:clamp(24px,6.2vw,34px); height:clamp(28px,5.5vh,38px); border:1px solid; font-size:clamp(.6rem,1.5vw,.78rem); font-weight:bold; border-radius:5px; cursor:pointer; touch-action:manipulation; display:flex; align-items:center; justify-content:center; transition:background .1s,border-color .1s; }
        .ing-key:hover  { filter:brightness(1.3); }
        .ing-key.used   { background:#cc2200 !important; border-color:#ff4b2b !important; color:#fff !important; pointer-events:none; }
        .ing-key.found  { background:#007fa8 !important; border-color:#00f2ff !important; color:#fff !important; pointer-events:none; }
        .ing-hud { display:flex; justify-content:space-between; padding:2px 8px; font-size:.58rem; background:rgba(0,0,0,.28); color:#fff; flex-shrink:0; }
    </style>
    <div class="ing-root">
      <div class="ing-fact"><b>💡</b> <span id="ig-fact"></span></div>
      <div class="ing-q" id="ig-q">Cargando…</div>
      <div class="ing-field">
        <div class="ing-diploma" id="ig-diploma">
          <div style="font-size:2rem">🎓🏆</div>
          <h2>¡TE GRADUASTE DE INGENIERA!</h2>
          <p>Resolviste todos los retos.</p>
          <button id="ig-restart" style="margin-top:8px;padding:6px 16px;border-radius:4px;border:none;background:#1b5e20;color:#fff;font-weight:bold;cursor:pointer;">REINICIAR</button>
        </div>
        <div class="ing-goal"></div>
        <div id="ig-barriers"></div>
        <div class="ing-ball" id="ig-ball">⚽</div>
        <div class="ing-alert" id="ig-alert"><div style="font-size:1.8rem">❌</div><div style="background:#ff4b2b;padding:1px 7px;font-size:.6rem;font-weight:bold;border-radius:3px;">FALLO</div></div>
      </div>
      <div class="ing-mid">
        <!-- Izquierda: muñeco -->
        <div class="ing-left">
          <svg id="ig-hangman" width="144" height="189" viewBox="0 0 150 185" style="transform:translateX(15vw);flex-shrink:0;">
            <line x1="20" y1="175" x2="100" y2="175" stroke="rgba(255,255,255,.7)" stroke-width="4"/>
            <line x1="40" y1="175" x2="40"  y2="15"  stroke="rgba(255,255,255,.7)" stroke-width="4"/>
            <line x1="40" y1="15"  x2="100" y2="15"  stroke="rgba(255,255,255,.7)" stroke-width="4"/>
            <line x1="100" y1="15" x2="100" y2="45"  stroke="rgba(255,255,255,.7)" stroke-width="2"/>
            <circle id="ihp1" class="hpart" cx="100" cy="60" r="15" stroke="#ff4b2b" stroke-width="3" fill="none" opacity="0"/>
            <line   id="ihp2" class="hpart" x1="100" y1="75"  x2="100" y2="125" stroke="#ff4b2b" stroke-width="3" opacity="0"/>
            <line   id="ihp3" class="hpart" x1="100" y1="90"  x2="75"  y2="108" stroke="#ff4b2b" stroke-width="3" opacity="0"/>
            <line   id="ihp4" class="hpart" x1="100" y1="90"  x2="125" y2="108" stroke="#ff4b2b" stroke-width="3" opacity="0"/>
            <line   id="ihp5" class="hpart" x1="100" y1="125" x2="80"  y2="160" stroke="#ff4b2b" stroke-width="3" opacity="0"/>
            <line   id="ihp6" class="hpart" x1="100" y1="125" x2="120" y2="160" stroke="#ff4b2b" stroke-width="3" opacity="0"/>
          </svg>
        </div>
        <!-- Derecha: blanks + status + teclado -->
        <div class="ing-right">
          <div class="ing-blanks" id="ig-blanks"></div>
          <div id="ig-status" style="text-align:center;font-size:.68rem;font-weight:bold;color:#fff;letter-spacing:.04em;padding:2px 4px;background:rgba(0,0,0,.28);border-radius:4px;">ADIVINA LA PALABRA</div>
          <div class="ing-kbd" id="ig-kbd">
            <div class="ing-kbd-row" id="ig-kbd-r0"></div>
            <div class="ing-kbd-row" id="ig-kbd-r1"></div>
            <div class="ing-kbd-row" id="ig-kbd-r2"></div>
          </div>
        </div>
      </div>
      <div class="ing-hud"><span>NIVEL <b id="ig-lvl">1/5</b></span></div>
    </div>`;

    const barBox = wrapper.querySelector('#ig-barriers');
    for(let i=0;i<5;i++){
        const b=document.createElement('div'); b.className='ing-barrier'; b.id='ig-b'+i;
        b.style.left=(18+(i*14))+'%'; barBox.appendChild(b);
    }

    const ROWS = ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'];
    // Color por fila: cian, verde, naranja
    const ROW_COLORS = ['#ffff00', '#cc00ff', '#00ff66'];
    ROWS.forEach((rowLetters, ri) => {
        const row = wrapper.querySelector('#ig-kbd-r' + ri);
        const col = ROW_COLORS[ri];
        // Convertir hex a rgb para el fondo semitransparente
        const r = parseInt(col.slice(1,3),16), g = parseInt(col.slice(3,5),16), b = parseInt(col.slice(5,7),16);
        for(const ch of rowLetters){
            const btn = document.createElement('button');
            btn.className = 'ing-key';
            btn.textContent = ch;
            btn.dataset.l = ch;
            btn.style.color       = col;
            btn.style.background  = `rgba(${r},${g},${b},0.18)`;
            btn.style.borderColor = `rgba(${r},${g},${b},0.55)`;
            btn.addEventListener('click', ()=>guessLetter(ch));
            row.appendChild(btn);
        }
    });

    function onKey(e){
        const l=e.key.toUpperCase();
        if(l.length===1 && LETTERS.includes(l)) guessLetter(l);
        else if(l==='Ñ' || l===';') guessLetter('Ñ');
    }
    document.addEventListener('keydown', onKey);

    // ── Sonidos ──────────────────────────────────────────────────────
    const AC = new (window.AudioContext || window.webkitAudioContext)();
    function playTone(type, freq, freq2, dur, vol, shape) {
        try {
            const o = AC.createOscillator();
            const g = AC.createGain();
            o.connect(g); g.connect(AC.destination);
            o.type = shape || 'sine';
            o.frequency.setValueAtTime(freq, AC.currentTime);
            if(freq2) o.frequency.exponentialRampToValueAtTime(freq2, AC.currentTime + dur * 0.8);
            g.gain.setValueAtTime(vol, AC.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
            o.start(AC.currentTime);
            o.stop(AC.currentTime + dur);
        } catch(e){}
    }
    function sfxAcierto() {
        playTone('sine', 520, 780, 0.18, 0.28, 'sine');
        setTimeout(()=>playTone('sine', 780, 1040, 0.14, 0.18, 'sine'), 80);
    }
    function sfxError() {
        playTone('sawtooth', 180, 80, 0.22, 0.30, 'sawtooth');
    }
    function sfxPatada() {
        playTone('sine', 120, 55, 0.18, 0.55, 'sine');
        setTimeout(()=>playTone('triangle', 80, 40, 0.15, 0.30, 'triangle'), 60);
    }

    function renderBlanks(){
        const blanks=wrapper.querySelector('#ig-blanks'); blanks.innerHTML='';
        const normAns=normA(activeAnswer);
        for(const ch of normAns){
            const cell=document.createElement('div');
            if(ch===' '){ cell.className='ing-letter space'; blanks.appendChild(cell); continue; }
            cell.className='ing-letter'+(guessed.has(ch)?' found':'');
            const sp=document.createElement('span'); sp.textContent=guessed.has(ch)?ch:'';
            const hr=document.createElement('hr');
            cell.appendChild(sp); cell.appendChild(hr);
            blanks.appendChild(cell);
        }
    }
    function renderHangman(){
        for(let i=1;i<=MAX_ERRORS;i++){
            const p=wrapper.querySelector('#ihp'+i);
            if(p) p.setAttribute('opacity', i<=errors ? '1' : '0');
        }
    }
    function isComplete(){
        return [...normA(activeAnswer)].filter(c=>c!==' ').every(c=>guessed.has(c));
    }
    function updateBallPos(){
        wrapper.querySelector('#ig-ball').style.left=(14+(lvl*14))+'%';
    }

    function loadQ(){
        if(lvl>=5) return showDiploma();
        const data=nextTrivia();
        activeAnswer=data.a;
        guessed=new Set(); errors=0; canShoot=false;
        wrapper.querySelector('#ig-q').textContent=data.q;
        wrapper.querySelector('#ig-q').style.borderColor='#00f2ff';
        wrapper.querySelector('#ig-lvl').textContent=(lvl+1)+'/5';
        wrapper.querySelector('#ig-status').textContent='ADIVINA LA PALABRA';
        wrapper.querySelector('#ig-ball').classList.remove('glow');
        wrapper.querySelectorAll('.ing-key').forEach(b=>b.className='ing-key');
        renderBlanks(); renderHangman(); updateBallPos();
    }
    function loadFact(){ wrapper.querySelector('#ig-fact').textContent=nextFact(); }

    function guessLetter(ch){
        if(canShoot||busy) return;
        if(guessed.has(ch)) return;
        const normAns=normA(activeAnswer);
        const keyBtn=wrapper.querySelector('.ing-key[data-l="'+ch+'"]');
        if(normAns.includes(ch)){
            sfxAcierto();
            guessed.add(ch);
            if(keyBtn) keyBtn.className='ing-key found';
            renderBlanks();
            if(isComplete()){
                canShoot=true;
                wrapper.querySelector('#ig-ball').classList.add('glow');
                wrapper.querySelector('#ig-q').style.borderColor='#ffd700';
                wrapper.querySelector('#ig-status').textContent='¡CORRECTO! Toca el balón ⚽';
            }
        } else {
            sfxError();
            errors++;
            guessed.add(ch);
            if(keyBtn) keyBtn.className='ing-key used';
            renderHangman();
            const al=wrapper.querySelector('#ig-alert'); al.classList.add('on');
            busy=true;
            setTimeout(()=>{ al.classList.remove('on'); busy=false; },700);
            if(errors>=MAX_ERRORS){
                busy=true;
                wrapper.querySelector('#ig-q').style.borderColor='#ff4b2b';
                wrapper.querySelector('#ig-status').textContent='Era: '+activeAnswer;
                normA(activeAnswer).split('').filter(c=>c!==' ').forEach(c=>guessed.add(c));
                renderBlanks();
                setTimeout(()=>{
                    busy=false; errors=0;
                    if(lvl>0){ lvl--; const bar=wrapper.querySelector('#ig-b'+lvl); if(bar) bar.classList.remove('broken'); }
                    updateBallPos(); loadFact(); loadQ();
                },2000);
            }
        }
    }

    function kick(){
        if(!canShoot||busy) return;
        sfxPatada();
        canShoot=false; busy=true;
        const ball=wrapper.querySelector('#ig-ball');
        ball.classList.remove('glow');
        ball.style.left=(18+(lvl*14))+'%';
        setTimeout(()=>{
            const bar=wrapper.querySelector('#ig-b'+lvl); if(bar) bar.classList.add('broken');
            lvl++; loadFact();
            setTimeout(()=>{ busy=false; loadQ(); },700);
        },500);
    }
    function showDiploma(){
        wrapper.querySelector('#ig-diploma').style.display='flex';
        wrapper.querySelector('#ig-ball').style.display='none';
    }

    wrapper.querySelector('#ig-ball').addEventListener('click', kick);
    wrapper.querySelector('#ig-ball').addEventListener('touchstart', e=>{ e.stopPropagation(); kick(); },{passive:true});
    wrapper.querySelector('#ig-restart')?.addEventListener('click', ()=>{ wrapper.remove(); document.removeEventListener('keydown',onKey); efectoArquitecta(vfx); });

    vfx.style.pointerEvents = 'auto';
    loadFact(); loadQ();
    return { cleanup: ()=>{
        wrapper.remove();
        document.removeEventListener('keydown', onKey);
        vfx.style.pointerEvents = 'none';
        if (elIngeniera) { elIngeniera.style.zIndex = ''; elIngeniera.style.position = ''; if (_parentIngeniera) _parentIngeniera.insertBefore(elIngeniera, _nextIngeniera); }
        if (elNinaArq)   { elNinaArq.style.zIndex = ''; elNinaArq.style.position = ''; }
    }};
}



// ==========================================
// FUNCION  5 POLICIA
// ==========================================
function efectoPolicia(vfx) {
    // ── Jugadoras + profesionistas al frente (mismo patrón nina-1) ──
    const _polPers = [
        'glow-jugadoras',
        'glow-bombera','glow-repartidora','glow-ingeniera',
        'glow-doctora','glow-maestra','glow-futbolista'
    ];
    const elNinaPol  = document.getElementById('glow-nina');
    const _polData   = _polPers.map(id => {
        const el = document.getElementById(id);
        return { el, parent: el?.parentNode, next: el?.nextSibling };
    });
    const _polFrente = new Set(['glow-bombera','glow-maestra']);
    _polData.forEach(({ el }, i) => {
        if (el) { el.style.zIndex = _polFrente.has(_polPers[i]) ? '159' : '152'; el.style.position = 'absolute'; vfx.appendChild(el); }
    });
    if (elNinaPol) { elNinaPol.style.zIndex = '159'; elNinaPol.style.position = 'absolute'; }

    // Capa oscura encima de los personajes, debajo del juego
    const oscura = document.createElement('div');
    oscura.style.cssText = 'position:absolute;inset:0;z-index:162;background:rgba(0,0,0,0.6);pointer-events:none;';
    vfx.appendChild(oscura);

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:absolute;inset:0;z-index:165;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(6px,1.5vh,14px);padding:clamp(6px,2vw,16px);box-sizing:border-box;';
    vfx.appendChild(wrapper);

    wrapper.innerHTML = `<style>
/* ── Luces barra ── */
.np-bar{display:flex;gap:clamp(3px,1vw,6px);padding:clamp(5px,1.2vw,10px);
  background:rgba(0,0,0,.45);border-radius:10px;border:1px solid rgba(255,255,255,.08);
  backdrop-filter:blur(6px);justify-content:center;width:100%;box-sizing:border-box;}
.np-l{flex:1;max-width:clamp(28px,7vw,52px);height:clamp(38px,8vh,80px);
  border-radius:6px;background:#1a1a1a;position:relative;overflow:hidden;transition:background .15s;}
.np-l .np-i{position:absolute;inset:3px;border-radius:4px;background:rgba(255,255,255,.04);}

.np-l.blue  {animation:npB1 .5s step-end infinite;}
.np-l.blue2 {animation:npB1 .5s step-end infinite;animation-delay:.25s;}
.np-l.blue3 {animation:npB1 .5s step-end infinite;animation-delay:.12s;}
.np-l.red   {animation:npR1 .5s step-end infinite;}
.np-l.red2  {animation:npR1 .5s step-end infinite;animation-delay:.25s;}
.np-l.red3  {animation:npR1 .5s step-end infinite;animation-delay:.12s;}
.np-l.spot  {background:#ffffcc!important;box-shadow:0 0 28px #ffff88,0 0 60px rgba(255,255,180,.4);animation:none;}
.np-l.off   {background:#1a1a1a!important;box-shadow:none!important;animation:none!important;}
.np-l.spot-y1{animation:npSY 1.0s step-end infinite;}
.np-l.spot-y2{animation:npSY 1.0s step-end infinite;animation-delay:.37s;}
.np-l.spot-w {animation:npSW 0.5s step-end infinite;}
.np-l.spot-w2{animation:npSW 0.5s step-end infinite;animation-delay:.25s;}
@keyframes npSY{0%,49%{background:#ffd700;box-shadow:0 0 28px #ffd700,0 0 55px rgba(255,215,0,.5);}50%,100%{background:#1a1500;box-shadow:none;}}
@keyframes npSW{0%,49%{background:#ffffff;box-shadow:0 0 28px #fff,0 0 55px rgba(255,255,255,.55);}50%,100%{background:#1a1a1a;box-shadow:none;}}
.np-l.caution  {animation:npC1 .55s step-end infinite;}
.np-l.caution2 {animation:npC1 .55s step-end infinite;animation-delay:.27s;}
.np-l.caution3 {animation:npC1 .55s step-end infinite;animation-delay:.14s;}
.np-l.sos   {animation:npSOS .18s step-end infinite;}

@keyframes npB1{0%,49%{background:#0044ff;box-shadow:0 0 18px #0044ff,0 0 35px rgba(0,68,255,.5);}50%,100%{background:#0a0a22;box-shadow:none;}}
@keyframes npR1{0%,49%{background:#ff1100;box-shadow:0 0 18px #ff1100,0 0 35px rgba(255,17,0,.5);}50%,100%{background:#220a0a;box-shadow:none;}}
@keyframes npC1{0%,49%{background:#ffaa00;box-shadow:0 0 18px #ffaa00,0 0 30px rgba(255,170,0,.4);}50%,100%{background:#1a1200;box-shadow:none;}}
@keyframes npSOS{0%,49%{background:#fff;box-shadow:0 0 28px #fff,0 0 60px rgba(255,255,255,.6);}50%,100%{background:#111;box-shadow:none;}}

/* ── Paneles fondo ── */
.np-bg{position:absolute;inset:0;display:grid;
  grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);
  gap:clamp(3px,0.8vw,8px);padding:clamp(3px,0.8vw,8px);
  pointer-events:none;z-index:0;}
.np-bp{border-radius:8px;background:transparent;transition:background .15s;}
.np-bp.blue   {animation:bpB .5s step-end infinite;}
.np-bp.blue2  {animation:bpB .5s step-end infinite;animation-delay:.25s;}
.np-bp.blue3  {animation:bpB .5s step-end infinite;animation-delay:.12s;}
.np-bp.red    {animation:bpR .5s step-end infinite;}
.np-bp.red2   {animation:bpR .5s step-end infinite;animation-delay:.25s;}
.np-bp.red3   {animation:bpR .5s step-end infinite;animation-delay:.12s;}
.np-bp.spot   {animation:bpS .2s step-end infinite;}
.np-bp.spot-w {animation:bpSW 0.5s step-end infinite;}
@keyframes bpSW{0%,49%{background:rgba(255,255,255,.45);}50%,100%{background:transparent;}}
.np-bp.caution  {animation:bpCA .55s step-end infinite;}
.np-bp.caution2 {animation:bpCA .55s step-end infinite;animation-delay:.27s;}
.np-bp.caution3 {animation:bpCA .55s step-end infinite;animation-delay:.14s;}
.np-bp.sos    {animation:bpSOS .18s step-end infinite;}
.np-bp.off    {background:transparent!important;animation:none!important;}

@keyframes bpB  {0%,49%{background:#0044ff;}  50%,100%{background:transparent;}}
@keyframes bpR  {0%,49%{background:#ff1100;}   50%,100%{background:transparent;}}
@keyframes bpS  {0%,49%{background:#ffffc0;}   50%,100%{background:transparent;}}
@keyframes bpCA {0%,49%{background:#ffaa00;}   50%,100%{background:transparent;}}
@keyframes bpSOS{0%,49%{background:#ffffff;}   50%,100%{background:transparent;}}
@keyframes bpSW {0%,49%{background:#ffffff;}   50%,100%{background:transparent;}}

/* ── Controles ── */
.np-ctrl{position:relative;z-index:2;background:rgba(0,0,0,.55);
  border:1px solid rgba(255,255,255,.1);border-radius:12px;
  padding:clamp(7px,1.5vw,12px);backdrop-filter:blur(8px);
  width:100%;max-width:clamp(260px,90vw,500px);box-sizing:border-box;}
.np-btns{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(4px,1vw,8px);}
.np-btn{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);
  color:#fff;padding:clamp(6px,1.2vh,11px) 2px;border-radius:7px;cursor:pointer;
  font-size:clamp(.58rem,1.4vw,.75rem);font-weight:600;letter-spacing:.3px;
  transition:background .15s,border-color .15s;touch-action:manipulation;white-space:nowrap;}
.np-btn:hover{background:rgba(255,255,255,.16);}
.np-btn.active{border-color:#00f2ff;color:#00f2ff;background:rgba(0,242,255,.08);}
.np-btn.sos-on{border-color:#ff3366;color:#ff3366;background:rgba(255,51,102,.12);}
.np-slider-row{display:flex;align-items:center;gap:7px;margin-top:clamp(4px,0.8vh,9px);}
.np-slider-row label{color:rgba(255,255,255,.6);font-size:clamp(.52rem,1.2vw,.68rem);white-space:nowrap;}
.np-slider-row input[type=range]{flex:1;accent-color:#00f2ff;cursor:pointer;}

</style>

<div class="np-bg">
  <div class="np-bp off" id="nbp1"></div><div class="np-bp off" id="nbp2"></div><div class="np-bp off" id="nbp3"></div>
  <div class="np-bp off" id="nbp4"></div><div class="np-bp off" id="nbp5"></div><div class="np-bp off" id="nbp6"></div>
</div>

<div class="np-bar" style="position:relative;z-index:2;max-width:clamp(260px,90vw,500px);">
  <div class="np-l blue"  id="nl1"><div class="np-i"></div></div>
  <div class="np-l blue2" id="nl2"><div class="np-i"></div></div>
  <div class="np-l blue3" id="nl3"><div class="np-i"></div></div>
  <div class="np-l red"   id="nl4"><div class="np-i"></div></div>
  <div class="np-l red2"  id="nl5"><div class="np-i"></div></div>
  <div class="np-l red3"  id="nl6"><div class="np-i"></div></div>
</div>

<div class="np-ctrl">
  <div class="np-btns">
    <button class="np-btn active" id="np1">Secuencia 1</button>
    <button class="np-btn"        id="np2">Secuencia 2</button>
    <button class="np-btn"        id="np3">Spotlight</button>
    <button class="np-btn"        id="np4">Precaución</button>
    <button class="np-btn"        id="np5">Apagar</button>
    <button class="np-btn"        id="np6">🆘 SOS</button>
  </div>
  <div class="np-slider-row">
    <label>Intensidad</label>
    <input type="range" id="np-slider" min="0.1" max="1" step="0.05" value="0.5">
  </div>
</div>`;

    // ── HELPERS ────────────────────────────────────────────────────
    const $ = id => wrapper.querySelector('#' + id);

    function luces(map) {
        Object.entries(map).forEach(([id, cls]) => { const el=$(id); if(el) el.className='np-l '+cls; });
    }
    function fondo(map) {
        Object.entries(map).forEach(([id, cls]) => { const el=$(id); if(el) el.className='np-bp '+cls; });
    }
    function allLuces(cls) { ['nl1','nl2','nl3','nl4','nl5','nl6'].forEach(id=>{ const el=$(id); if(el) el.className='np-l '+cls; }); }
    function allFondo(cls) { ['nbp1','nbp2','nbp3','nbp4','nbp5','nbp6'].forEach(id=>{ const el=$(id); if(el) el.className='np-bp '+cls; }); }
    function act(btn) { wrapper.querySelectorAll('.np-btn').forEach(b=>b.classList.remove('active','sos-on')); btn.classList.add('active'); }
    function apagarTodo() { allLuces('off'); allFondo('off'); sosActivo=false; }

    // ── SOS ────────────────────────────────────────────────────────
    let sosActivo = false;
    async function flashSOS(onMs, offMs) {
        if (!sosActivo) return;
        allLuces('sos'); allFondo('sos');
        await new Promise(r=>setTimeout(r,onMs));
        if (!sosActivo) return;
        allLuces('off'); allFondo('off');
        await new Promise(r=>setTimeout(r,offMs));
    }
    async function cicloSOS() {
        while (sosActivo) {
            await flashSOS(160,100); await flashSOS(160,100); await flashSOS(160,220);
            await flashSOS(580,160); await flashSOS(580,160); await flashSOS(580,220);
            await flashSOS(160,100); await flashSOS(160,100); await flashSOS(160,700);
        }
    }

    // ── SLIDER INTENSIDAD ──────────────────────────────────────────
    const slider = $('np-slider');
    function applySlider(v) {
        ['nl1','nl2','nl3','nl4','nl5','nl6',
         'nbp1','nbp2','nbp3','nbp4','nbp5','nbp6'].forEach(id => {
            const el = $(id); if(el) el.style.opacity = v;
        });
    }
    if (slider) {
        slider.addEventListener('input', function() { applySlider(parseFloat(this.value)); });
        applySlider(0.5);
    }

    // ── AUDIO ──────────────────────────────────────────────────────
    let npAudio = null;
    function playNpAudio(src) {
        if (npAudio) { npAudio.pause(); npAudio.currentTime = 0; }
        npAudio = new Audio(src);
        npAudio.loop = true;
        npAudio.play().catch(() => {});
    }
    function stopNpAudio() {
        if (npAudio) { npAudio.pause(); npAudio.currentTime = 0; npAudio = null; }
    }

    // ── BOTONES ────────────────────────────────────────────────────
    const b1=$('np1'); if(b1) b1.onclick=function(){ sosActivo=false; act(this);
        luces({nl1:'blue',nl2:'blue2',nl3:'blue3',nl4:'red',nl5:'red2',nl6:'red3'});
        fondo({nbp1:'blue',nbp2:'blue2',nbp3:'blue3',nbp4:'red',nbp5:'red2',nbp6:'red3'});
        playNpAudio('assets/secuencia-1.mp3'); };

    const b2=$('np2'); if(b2) b2.onclick=function(){ sosActivo=false; act(this);
        luces({nl1:'blue',nl2:'red2',nl3:'blue3',nl4:'red',nl5:'blue2',nl6:'red3'});
        fondo({nbp1:'blue',nbp2:'red2',nbp3:'blue3',nbp4:'red',nbp5:'blue2',nbp6:'red3'});
        playNpAudio('assets/secuencia-2.mp3'); };

    const b3=$('np3'); if(b3) b3.onclick=function(){ sosActivo=false; act(this);
        luces({nl1:'spot-w',nl2:'off',nl3:'spot-y1',nl4:'spot-y2',nl5:'off',nl6:'spot-w2'});
        fondo({nbp1:'spot-w',nbp2:'off',nbp3:'spot',nbp4:'spot',nbp5:'off',nbp6:'spot-w'});
        playNpAudio('assets/spotlight.mp3'); };

    const b4=$('np4'); if(b4) b4.onclick=function(){ sosActivo=false; act(this);
        luces({nl1:'caution',nl2:'caution3',nl3:'caution2',nl4:'caution2',nl5:'caution',nl6:'caution3'});
        fondo({nbp1:'caution',nbp2:'caution3',nbp3:'caution2',nbp4:'caution2',nbp5:'caution',nbp6:'caution3'});
        playNpAudio('assets/precaucion.mp3'); };

    const b5=$('np5'); if(b5) b5.onclick=function(){ act(this); apagarTodo(); stopNpAudio(); };

    const b6=$('np6'); if(b6) b6.onclick=function(){
        sosActivo=!sosActivo;
        if (sosActivo) {
            wrapper.querySelectorAll('.np-btn').forEach(b=>b.classList.remove('active','sos-on'));
            this.classList.add('sos-on'); cicloSOS();
            playNpAudio('assets/sos.mp3');
        } else { act(this); apagarTodo(); this.classList.remove('sos-on'); stopNpAudio(); }
    };

    if (b5) b5.click();
    vfx.style.pointerEvents = 'auto';
    return {
        cleanup: function() {
            sosActivo = false;
            stopNpAudio();
            vfx.innerHTML = '';
            vfx.style.pointerEvents = 'none';
            _polData.forEach(({ el, parent, next }) => {
                if (el) { el.style.zIndex = ''; el.style.position = ''; if (parent) parent.insertBefore(el, next); }
            });
            if (elNinaPol) { elNinaPol.style.zIndex = ''; elNinaPol.style.position = ''; }
        }
    };
}

// ==========================================
// FUNCION  6 MAESTRA — TABLA PERIÓDICA
// ==========================================
function efectoMaestra(vfx) {
    // col, row, símbolo, nombre, número, color-categoria
    // Colores neón por categoría
    const C = {
        nm:'#00ffea',   // no-metales → cian neón
        ng:'#bf00ff',   // gases nobles → violeta neón
        al:'#ff3c5f',   // alcalinos → rojo neón
        ae:'#ff8c00',   // alcalinotérreos → naranja neón
        tm:'#ffe600',   // metales transición → amarillo neón
        ptm:'#00bfff',  // post-transición → azul neón
        me:'#39ff14',   // metaloides → verde neón
        ln:'#ff69b4',   // lantánidos → rosa neón
        ac:'#ffaa00',   // actínidos → ámbar neón
        uk:'#aaaaaa',   // desconocidos → gris
    };
    const EL = [
        [1,1,'H','Hidrógeno',1,C.nm],
        [18,1,'He','Helio',2,C.ng],
        [1,2,'Li','Litio',3,C.al],[2,2,'Be','Berilio',4,C.ae],
        [13,2,'B','Boro',5,C.me],[14,2,'C','Carbono',6,C.nm],[15,2,'N','Nitrógeno',7,C.nm],[16,2,'O','Oxígeno',8,C.nm],[17,2,'F','Flúor',9,C.nm],[18,2,'Ne','Neón',10,C.ng],
        [1,3,'Na','Sodio',11,C.al],[2,3,'Mg','Magnesio',12,C.ae],
        [13,3,'Al','Aluminio',13,C.ptm],[14,3,'Si','Silicio',14,C.me],[15,3,'P','Fósforo',15,C.nm],[16,3,'S','Azufre',16,C.nm],[17,3,'Cl','Cloro',17,C.nm],[18,3,'Ar','Argón',18,C.ng],
        [1,4,'K','Potasio',19,C.al],[2,4,'Ca','Calcio',20,C.ae],
        [3,4,'Sc','Escandio',21,C.tm],[4,4,'Ti','Titanio',22,C.tm],[5,4,'V','Vanadio',23,C.tm],[6,4,'Cr','Cromo',24,C.tm],[7,4,'Mn','Manganeso',25,C.tm],[8,4,'Fe','Hierro',26,C.tm],[9,4,'Co','Cobalto',27,C.tm],[10,4,'Ni','Níquel',28,C.tm],[11,4,'Cu','Cobre',29,C.tm],[12,4,'Zn','Zinc',30,C.tm],
        [13,4,'Ga','Galio',31,C.ptm],[14,4,'Ge','Germanio',32,C.me],[15,4,'As','Arsénico',33,C.me],[16,4,'Se','Selenio',34,C.nm],[17,4,'Br','Bromo',35,C.nm],[18,4,'Kr','Kriptón',36,C.ng],
        [1,5,'Rb','Rubidio',37,C.al],[2,5,'Sr','Estroncio',38,C.ae],
        [3,5,'Y','Itrio',39,C.tm],[4,5,'Zr','Zirconio',40,C.tm],[5,5,'Nb','Niobio',41,C.tm],[6,5,'Mo','Molibdeno',42,C.tm],[7,5,'Tc','Tecnecio',43,C.tm],[8,5,'Ru','Rutenio',44,C.tm],[9,5,'Rh','Rodio',45,C.tm],[10,5,'Pd','Paladio',46,C.tm],[11,5,'Ag','Plata',47,C.tm],[12,5,'Cd','Cadmio',48,C.tm],
        [13,5,'In','Indio',49,C.ptm],[14,5,'Sn','Estaño',50,C.ptm],[15,5,'Sb','Antimonio',51,C.me],[16,5,'Te','Telurio',52,C.me],[17,5,'I','Yodo',53,C.nm],[18,5,'Xe','Xenón',54,C.ng],
        [1,6,'Cs','Cesio',55,C.al],[2,6,'Ba','Bario',56,C.ae],
        [3,6,'*','Lantánidos',null,C.ln],
        [4,6,'Hf','Hafnio',72,C.tm],[5,6,'Ta','Tantalio',73,C.tm],[6,6,'W','Wolframio',74,C.tm],[7,6,'Re','Renio',75,C.tm],[8,6,'Os','Osmio',76,C.tm],[9,6,'Ir','Iridio',77,C.tm],[10,6,'Pt','Platino',78,C.tm],[11,6,'Au','Oro',79,C.tm],[12,6,'Hg','Mercurio',80,C.tm],
        [13,6,'Tl','Talio',81,C.ptm],[14,6,'Pb','Plomo',82,C.ptm],[15,6,'Bi','Bismuto',83,C.ptm],[16,6,'Po','Polonio',84,C.me],[17,6,'At','Astato',85,C.me],[18,6,'Rn','Radón',86,C.ng],
        [1,7,'Fr','Francio',87,C.al],[2,7,'Ra','Radio',88,C.ae],
        [3,7,'**','Actínidos',null,C.ac],
        [4,7,'Rf','Rutherfordio',104,C.uk],[5,7,'Db','Dubnio',105,C.uk],[6,7,'Sg','Seaborgio',106,C.uk],[7,7,'Bh','Bohrio',107,C.uk],[8,7,'Hs','Hassio',108,C.uk],[9,7,'Mt','Meitnerio',109,C.uk],[10,7,'Ds','Darmstadtio',110,C.uk],[11,7,'Rg','Roentgenio',111,C.uk],[12,7,'Cn','Copernicio',112,C.uk],
        [13,7,'Nh','Nihonio',113,C.uk],[14,7,'Fl','Flerovio',114,C.uk],[15,7,'Mc','Moscovio',115,C.uk],[16,7,'Lv','Livermorio',116,C.uk],[17,7,'Ts','Teneso',117,C.uk],[18,7,'Og','Oganesón',118,C.uk],
        [3,9,'La','Lantano',57,C.ln],[4,9,'Ce','Cerio',58,C.ln],[5,9,'Pr','Praseodimio',59,C.ln],[6,9,'Nd','Neodimio',60,C.ln],[7,9,'Pm','Prometio',61,C.ln],[8,9,'Sm','Samario',62,C.ln],[9,9,'Eu','Europio',63,C.ln],[10,9,'Gd','Gadolinio',64,C.ln],[11,9,'Tb','Terbio',65,C.ln],[12,9,'Dy','Disprosio',66,C.ln],[13,9,'Ho','Holmio',67,C.ln],[14,9,'Er','Erbio',68,C.ln],[15,9,'Tm','Tulio',69,C.ln],[16,9,'Yb','Iterbio',70,C.ln],[17,9,'Lu','Lutecio',71,C.ln],
        [3,10,'Ac','Actinio',89,C.ac],[4,10,'Th','Torio',90,C.ac],[5,10,'Pa','Protactinio',91,C.ac],[6,10,'U','Uranio',92,C.ac],[7,10,'Np','Neptunio',93,C.ac],[8,10,'Pu','Plutonio',94,C.ac],[9,10,'Am','Americio',95,C.ac],[10,10,'Cm','Curio',96,C.ac],[11,10,'Bk','Berkelio',97,C.ac],[12,10,'Cf','Californio',98,C.ac],[13,10,'Es','Einsteinio',99,C.ac],[14,10,'Fm','Fermio',100,C.ac],[15,10,'Md','Mendelevio',101,C.ac],[16,10,'No','Nobelio',102,C.ac],[17,10,'Lr','Laurencio',103,C.ac],
    ];

    // Traer maestra al frente con glow morado leve
    const elMaestra  = document.getElementById('glow-maestra');
    const _parentMae = elMaestra?.parentNode;
    const _nextMae   = elMaestra?.nextSibling;
    const gMae = aplicarGlowMorado('glow-maestra');
    if (elMaestra) {
        elMaestra.style.zIndex    = '210';
        elMaestra.style.position  = 'absolute';
        elMaestra.style.transform = 'scale(1.15)';
        elMaestra.style.transformOrigin = 'bottom center';
        elMaestra.style.opacity   = '0.5';
        vfx.appendChild(elMaestra);
    }

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:absolute;inset:0;z-index:200;background:transparent;overflow:auto;font-family:Arial,sans-serif;';

    const style = document.createElement('style');
    style.textContent = `
    .tp-grid{display:grid;grid-template-columns:repeat(18,1fr);grid-template-rows:repeat(10,1fr);gap:2px;padding:6px;min-width:560px;height:100%;box-sizing:border-box;user-select:none;-webkit-user-select:none;background:transparent;}
    .tp-cell{border-radius:3px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:transform .15s,box-shadow .15s;position:relative;border:1px solid rgba(255,255,255,.15);min-height:0;touch-action:manipulation;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none;}
    .tp-cell:hover,.tp-cell:active{transform:scale(1.18);z-index:10;}
    .tp-num{font-size:clamp(5px,.7vw,9px);opacity:.8;line-height:1;pointer-events:none;}
    .tp-sym{font-size:clamp(8px,1.3vw,16px);font-weight:bold;line-height:1.1;pointer-events:none;}
    .tp-name{font-size:clamp(4px,.55vw,7px);opacity:.8;text-align:center;line-height:1;overflow:hidden;white-space:nowrap;width:100%;pointer-events:none;}
    .tp-gap{opacity:0;pointer-events:none;}
    .tp-info{display:none;position:fixed;z-index:999;background:#0d1117;border:2px solid currentColor;border-radius:10px;padding:10px 14px;color:#fff;font-size:13px;pointer-events:none;max-width:160px;box-shadow:0 0 18px currentColor;text-align:center;}
    .tp-info.on{display:block;}
    `;
    wrapper.appendChild(style);

    const grid = document.createElement('div');
    grid.className = 'tp-grid';

    // Mapa col,row → elemento
    const map = {};
    EL.forEach(e => { map[`${e[0]},${e[1]}`] = e; });

    for (let r = 1; r <= 10; r++) {
        for (let c = 1; c <= 18; c++) {
            const el = map[`${c},${r}`];
            const cell = document.createElement('div');
            if (r === 8) { cell.className = 'tp-cell tp-gap'; cell.style.cssText='grid-column:'+c+';grid-row:'+r+';'; grid.appendChild(cell); continue; }
            if (el) {
                const color = el[5];
                const dark = color + '33';
                cell.className = 'tp-cell';
                cell.style.cssText = `grid-column:${c};grid-row:${r};background:${dark};color:${color};`;
                cell.innerHTML = `
                    <div class="tp-num">${el[4]||''}</div>
                    <div class="tp-sym">${el[2]}</div>
                    <div class="tp-name">${el[3]}</div>`;
            } else {
                cell.className = 'tp-cell tp-gap';
                cell.style.cssText = `grid-column:${c};grid-row:${r};`;
            }
            grid.appendChild(cell);
        }
    }

    // Panel info táctil
    const info = document.createElement('div');
    info.className = 'tp-info';
    wrapper.appendChild(info);

    // ── Usos cotidianos por número atómico ─────────────────────────────
    const USOS = {
        1:'El hidrógeno es el combustible del futuro. Se usa en cohetes espaciales y celdas de combustible para autos limpios.',
        2:'El helio llena globos de fiesta y permite que los globos floten. También se usa en tomografías médicas.',
        3:'El litio está en la batería de tu celular y en las baterías de autos eléctricos.',
        4:'El berilio se usa en rayos X y en satélites espaciales por ser muy ligero y resistente.',
        5:'El boro está en el vidrio de cocina resistente al calor, como los moldes Pyrex.',
        6:'El carbono es la base de toda la vida. También forma el grafito de los lápices y los diamantes.',
        7:'El nitrógeno forma el 78% del aire que respiramos. Se usa para conservar alimentos congelados.',
        8:'El oxígeno es esencial para respirar. En hospitales se usa en tanques para pacientes.',
        9:'El flúor está en la pasta de dientes para proteger tus dientes de las caries.',
        10:'El neón ilumina los letreros luminosos de colores en tiendas y restaurantes.',
        11:'El sodio, combinado con cloro, forma la sal de mesa que usas todos los días.',
        12:'El magnesio está en los huesos y músculos. Se usa en llantas de autos deportivos.',
        13:'El aluminio forma las latas de refresco, el papel aluminio de cocina y los aviones.',
        14:'El silicio es el material de los chips y procesadores de tu celular y computadora.',
        15:'El fósforo está en los cerillos y en los fertilizantes que hacen crecer las plantas.',
        16:'El azufre se usa para fabricar hule, pólvora y algunos medicamentos.',
        17:'El cloro purifica el agua de las albercas y del agua potable que bebes.',
        18:'El argón se usa en los focos para que el filamento no se queme rápido.',
        19:'El potasio es vital para el corazón. Los plátanos son ricos en potasio.',
        20:'El calcio forma tus huesos y dientes. Está en la leche, el queso y el yogurt.',
        21:'El escandio se usa en palos de béisbol y marcos de bicicleta de alta gama.',
        22:'El titanio se usa en implantes dentales y prótesis médicas por ser biocompatible.',
        23:'El vanadio se añade al acero para hacer herramientas más duras y resistentes.',
        24:'El cromo da el brillo plateado a las llaves de baño y piezas de autos.',
        25:'El manganeso se usa en el acero inoxidable de cubiertos y ollas.',
        26:'El hierro es el metal más usado. Forma el acero de edificios, puentes y coches.',
        27:'El cobalto colorea el vidrio de azul y se usa en baterías de litio recargables.',
        28:'El níquel está en las monedas y en el acero inoxidable de electrodomésticos.',
        29:'El cobre está en los cables eléctricos de tu casa y en las monedas de cobre.',
        30:'El zinc recubre el acero para evitar la herrumbre y está en las pilas de 1.5 voltios.',
        31:'El galio se usa en LEDs que iluminan pantallas de celulares y televisiones.',
        32:'El germanio se usa en fibras ópticas de internet y en algunos lentes de cámara.',
        33:'El arsénico se usa en pequeñas cantidades en semiconductores de alta velocidad.',
        34:'El selenio se usa en las células solares y en el vidrio de color rojo y naranja.',
        35:'El bromo se usa para purificar el agua de albercas y como retardante de llamas.',
        36:'El kriptón se usa en los flashes de fotografía profesional y en algunos focos.',
        37:'El rubidio se usa en relojes atómicos ultrapreci­sos que dan la hora exacta al mundo.',
        38:'El estroncio da el color rojo brillante a los fuegos artificiales.',
        39:'El itrio se usa en los LEDs blancos y en las pantallas de televisión.',
        40:'El zirconio se usa en joyería como diamante sintético y en reactores nucleares.',
        41:'El niobio se añade al acero de los oleoductos y la carrocería de algunos autos.',
        42:'El molibdeno endurece el acero para fabricar motores y turbinas de avión.',
        43:'El tecnecio se usa en medicina nuclear para detectar tumores y enfermedades.',
        44:'El rutenio se usa en discos duros de computadora para aumentar su capacidad.',
        45:'El rodio cataliza los gases del escape de los autos en el catalizador.',
        46:'El paladio también está en el catalizador de autos para reducir la contaminación.',
        47:'La plata conduce la electricidad mejor que ningún otro metal. Está en contactos eléctricos y joyería.',
        48:'El cadmio se usa en pilas recargables de níquel-cadmio y en pinturas amarillas.',
        49:'El indio recubre las pantallas táctiles de celulares y tabletas.',
        50:'El estaño se usa para soldar circuitos electrónicos y recubrir latas de conservas.',
        51:'El antimonio se usa en retardantes de llama de plásticos y en semiconductores.',
        52:'El telurio se usa en discos DVD regrabables y en paneles solares de película delgada.',
        53:'El yodo desinfecta heridas y es esencial para la tiroides. Está en la sal yodada.',
        54:'El xenón se usa en los faros de xenón de autos lujosos y en láseres médicos.',
        55:'El cesio se usa en relojes atómicos, los más precisos del mundo.',
        56:'El bario se usa en estudios de rayos X del aparato digestivo.',
        57:'El lantano se usa en lentes de cámara de alta calidad y en baterías de híbridos.',
        58:'El cerio pulimenta las pantallas de cristal y está en los encendedores de piedra.',
        59:'El praseodimio se usa en gafas de soldador para proteger los ojos.',
        60:'El neodimio forma los imanes más potentes del mundo, usados en audífonos y motores eléctricos.',
        61:'El prometio se usó en relojes luminosos y marcapasos de energía nuclear.',
        62:'El samario se usa en imanes permanentes de alta temperatura para motores.',
        63:'El europio da el color rojo en las pantallas de televisión y billetes de seguridad.',
        64:'El gadolinio se usa como contraste en resonancias magnéticas para ver órganos internos.',
        65:'El terbio se usa en pantallas de TV de alta definición y en discos de almacenamiento.',
        66:'El disprosio se usa en los imanes de los motores de autos eléctricos.',
        67:'El holmio se usa en imanes superconductores de hospitales para resonancias magnéticas.',
        68:'El erbio amplifica la señal en cables de fibra óptica de internet.',
        69:'El tulio se usa en fuentes portátiles de rayos X para diagnóstico médico en campo.',
        70:'El iterbio se usa en relojes atómicos de última generación y láseres médicos.',
        71:'El lutecio se usa en tratamientos de radioterapia para combatir el cáncer.',
        72:'El hafnio se usa en los chips de computadora más modernos para miniaturizarlos.',
        73:'El tantalio se usa en los condensadores de celulares y tablets.',
        74:'El wolframio forma el filamento de los focos incandescentes por aguantar 3000 grados.',
        75:'El renio se usa en motores de avión para soportar temperaturas extremas.',
        76:'El osmio se usa en la punta de las plumas estilográficas por ser muy duro.',
        77:'El iridio se usa en bujías de alto rendimiento y en plumas de calidad.',
        78:'El platino está en los catalizadores de autos y en joyería de lujo.',
        79:'El oro conduce electricidad sin oxidarse. Está en conectores de computadoras y joyería.',
        80:'El mercurio se usó en termómetros y está en algunos tipos de lámparas fluorescentes.',
        81:'El talio se usa en detectores de infrarrojos y en equipos de diagnóstico médico.',
        82:'El plomo protege de la radiación en hospitales y se usó en tuberías antiguas.',
        83:'El bismuto está en medicamentos para el estómago como el Pepto-Bismol.',
        84:'El polonio se usó en eliminadores de electricidad estática en equipos fotográficos.',
        85:'El astato es un elemento muy raro que se estudia para tratar el cáncer de tiroides.',
        86:'El radón se monitorea en casas porque puede acumularse y causar daño pulmonar.',
        87:'El francio es uno de los elementos más raros y se estudia en física atómica.',
        88:'El radio se usó en pinturas luminosas para relojes y en radioterapia antigua.',
        89:'El actinio se usa en investigación para tratamientos experimentales de cáncer.',
        90:'El torio se investiga como combustible nuclear alternativo más seguro que el uranio.',
        91:'El protactinio se usa en investigación científica para datar rocas muy antiguas.',
        92:'El uranio es el combustible de las plantas de energía nuclear que generan electricidad.',
        93:'El neptunio se produce en reactores nucleares y se estudia para nuevos combustibles.',
        94:'El plutonio se usó en armas nucleares y es combustible en algunos satélites espaciales.',
        95:'El americio está en los detectores de humo de tu hogar.',
        96:'El curio se usa en fuentes de energía de sondas espaciales como la Voyager.',
        97:'El berkelio se usa en investigación para crear nuevos elementos superpesados.',
        98:'El californio se usa para iniciar reactores nucleares y detectar petróleo en pozos.',
        99:'El einsteinio se creó en la primera prueba de bomba de hidrógeno en 1952.',
        100:'El fermio solo se produce en cantidades mínimas en explosiones nucleares.',
        101:'El mendelevio fue creado en 1955 en honor a Dmitri Mendeléyev, creador de la tabla periódica.',
        102:'El nobelio fue creado en honor a Alfred Nobel, inventor de la dinamita y creador del Premio Nobel.',
        103:'El laurencio fue creado en honor a Ernest Lawrence, inventor del ciclotrón.',
        104:'El rutherfordio es un elemento sintético muy inestable estudiado en laboratorios.',
        105:'El dubnio es sintético y se desintegra en menos de un minuto.',
        106:'El seaborgio fue nombrado en honor al químico Glenn Seaborg en vida.',
        107:'El bohrio fue nombrado en honor a Niels Bohr, pionero de la física cuántica.',
        108:'El hassio fue nombrado por el estado alemán de Hesse donde fue descubierto.',
        109:'El meitnerio honra a Lise Meitner, la física que explicó la fisión nuclear.',
        110:'El darmstadtio fue creado en el Centro de Investigación de Iones Pesados en Alemania.',
        111:'El roentgenio honra a Wilhelm Röntgen, descubridor de los rayos X.',
        112:'El copernicio fue nombrado en honor a Nicolás Copérnico, quien propuso que la Tierra gira alrededor del Sol.',
        113:'El nihonio fue el primer elemento descubierto en Asia, en Japón.',
        114:'El flerovio fue nombrado en honor al Laboratorio Flerov de Reacciones Nucleares en Rusia.',
        115:'El moscovio fue nombrado en honor a la región de Moscú en Rusia.',
        116:'El livermorio fue nombrado en honor al Laboratorio Nacional Lawrence Livermore.',
        117:'El teneso fue nombrado en honor al estado de Tennessee en Estados Unidos.',
        118:'El oganesón es el elemento más pesado conocido y solo existen unos pocos átomos.',
    };

    // ── Voz del navegador ───────────────────────────────────────────────
    function hablar(texto) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = 'es-MX';
        u.rate = 0.95;
        u.pitch = 1.05;
        // Preferir voz en español si existe
        const voces = window.speechSynthesis.getVoices();
        const voz = voces.find(v => v.lang.startsWith('es')) || null;
        if (voz) u.voice = voz;
        window.speechSynthesis.speak(u);
    }

    let infoTimer = null;
    function showInfo(cell, el, color) {
        info.style.color = color;
        info.style.borderColor = color;
        info.style.boxShadow = '0 0 18px ' + color;
        const uso = el[4] ? (USOS[el[4]] || el[3]) : el[3];
        info.innerHTML = `<b style="font-size:1.4em">${el[2]}</b><br>${el[3]}${el[4]?'<br><small>Nº '+el[4]+'</small>':''}`;
        const r = cell.getBoundingClientRect();
        const wr = wrapper.getBoundingClientRect();
        let left = r.left - wr.left + r.width/2 - 80;
        let top  = r.top  - wr.top  - 70;
        if (top < 4) top = r.bottom - wr.top + 4;
        left = Math.max(4, Math.min(left, wr.width - 170));
        info.style.left = left + 'px';
        info.style.top  = top  + 'px';
        info.classList.add('on');
        clearTimeout(infoTimer);
        infoTimer = setTimeout(() => info.classList.remove('on'), 3500);
        // Hablar
        hablar(uso);
    }

    grid.querySelectorAll('.tp-cell:not(.tp-gap)').forEach(cell => {
        const col = parseInt(cell.style.gridColumn);
        const row = parseInt(cell.style.gridRow);
        const el  = map[`${col},${row}`];
        if (!el) return;
        const color = el[5];
        cell.addEventListener('touchstart', e => {
            e.preventDefault();
            showInfo(cell, el, color);
        }, { passive: false });
        cell.addEventListener('click', () => showInfo(cell, el, color));
    });

    wrapper.appendChild(grid);
    vfx.appendChild(wrapper);
    vfx.style.pointerEvents = 'auto';

    return {
        cleanup: function() {
            clearTimeout(infoTimer);
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            wrapper.remove();
            gMae.cleanup();
            if (elMaestra) {
                elMaestra.style.zIndex         = '';
                elMaestra.style.position       = '';
                elMaestra.style.animation      = '';
                elMaestra.style.transform      = '';
                elMaestra.style.transformOrigin= '';
                elMaestra.style.opacity        = '';
                if (_parentMae) _parentMae.insertBefore(elMaestra, _nextMae);
            }
            vfx.style.pointerEvents = 'none';
        }
    };
}

// ==========================================
// FUNCION 3 DOCTORA  FILA----1065
// ==========================================

function efectoDoctora(vfx) {
    // ── DOCTORA al frente igual que futbolista en nina-1 ─────────
    const elDoctora       = document.getElementById('glow-doctora');
    const _parentDoctora  = elDoctora?.parentNode;
    const _nextDoctora    = elDoctora?.nextSibling;
    if (elDoctora) {
        elDoctora.style.zIndex   = '156';
        elDoctora.style.position = 'absolute';
        elDoctora.style.opacity  = '1';
        elDoctora.style.filter   = 'brightness(0.65) drop-shadow(0 0 8px rgba(180,0,255,0.8)) drop-shadow(0 0 20px rgba(160,0,230,0.5)) drop-shadow(0 0 40px rgba(120,0,200,0.25))';
        elDoctora.style.animation= 'glowHistoriaOrig 8s ease-in-out infinite';
        vfx.appendChild(elDoctora);   // misma técnica que futbolista
    }
    // Atenuar las otras para que doctora destaque
    const elBombera = document.getElementById('glow-bombera');
    const elMaestra = document.getElementById('glow-maestra');
    if (elBombera) elBombera.style.opacity = '0.25';
    if (elMaestra) elMaestra.style.opacity = '0.25';

    // ── OpenMoji por CDN ──────────────────────────────────────────
    const OMOJI_URLS = [
        'https://openmoji.org/data/color/svg/2764-200D-1FA79.svg',      // ❤️‍🩹 corazón curado
        'https://openmoji.org/data/color/svg/1F48A.svg',                // 💊 pastilla
        'https://openmoji.org/data/color/svg/1FA78.svg',                // 🩸 sangre
        'https://openmoji.org/data/color/svg/1F9A0.svg',                // 🦠 virus
        'https://openmoji.org/data/color/svg/1FAC0.svg',                // 🫀 corazón anatómico
        'https://openmoji.org/data/color/svg/1F489.svg',                // 💉 jeringa
        'https://openmoji.org/data/color/svg/1F469-200D-2695-FE0F.svg', // 👩‍⚕️ doctora
        'https://openmoji.org/data/color/svg/1F691.svg',                // 🚑 ambulancia
        'https://openmoji.org/data/color/svg/1FA7A.svg',                // 🩺 estetoscopio
    ];
    function makeSVG(type, uid) {
        const id = type + (uid || '');
        const svgs = {
            covid: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <defs>
    <radialGradient id="cvB${id}" cx="42%" cy="38%" r="58%">
      <stop offset="0%" stop-color="#ff7ed4"/><stop offset="55%" stop-color="#cc0066"/><stop offset="100%" stop-color="#7a0040"/>
    </radialGradient>
    <radialGradient id="cvS${id}" cx="32%" cy="28%" r="38%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.6)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    <filter id="cvG${id}"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g filter="url(#cvG${id})">
    <ellipse cx="50" cy="10" rx="3.5" ry="6" fill="#ff55bb"/><circle cx="50" cy="5" r="3" fill="#ffbbee"/>
    <ellipse cx="78" cy="21" rx="3.5" ry="6" fill="#ff55bb" transform="rotate(45,78,21)"/><circle cx="82" cy="16" r="3" fill="#ffbbee"/>
    <ellipse cx="90" cy="50" rx="3.5" ry="6" fill="#ff55bb" transform="rotate(90,90,50)"/><circle cx="95" cy="50" r="3" fill="#ffbbee"/>
    <ellipse cx="78" cy="79" rx="3.5" ry="6" fill="#ff55bb" transform="rotate(135,78,79)"/><circle cx="82" cy="84" r="3" fill="#ffbbee"/>
    <ellipse cx="50" cy="90" rx="3.5" ry="6" fill="#ff55bb" transform="rotate(180,50,90)"/><circle cx="50" cy="95" r="3" fill="#ffbbee"/>
    <ellipse cx="22" cy="79" rx="3.5" ry="6" fill="#ff55bb" transform="rotate(225,22,79)"/><circle cx="18" cy="84" r="3" fill="#ffbbee"/>
    <ellipse cx="10" cy="50" rx="3.5" ry="6" fill="#ff55bb" transform="rotate(270,10,50)"/><circle cx="4" cy="50" r="3" fill="#ffbbee"/>
    <ellipse cx="22" cy="21" rx="3.5" ry="6" fill="#ff55bb" transform="rotate(315,22,21)"/><circle cx="18" cy="16" r="3" fill="#ffbbee"/>
  </g>
  <circle cx="50" cy="50" r="33" fill="url(#cvB${id})" filter="url(#cvG${id})"/>
  <circle cx="50" cy="50" r="33" fill="url(#cvS${id})"/>
  <ellipse cx="39" cy="44" rx="5" ry="5.5" fill="#1a0010"/>
  <ellipse cx="61" cy="44" rx="5" ry="5.5" fill="#1a0010"/>
  <circle cx="41" cy="42" r="1.6" fill="rgba(255,255,255,.7)"/>
  <circle cx="63" cy="42" r="1.6" fill="rgba(255,255,255,.7)"/>
  <line x1="33" y1="36" x2="46" y2="39" stroke="#5a0020" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="54" y1="39" x2="67" y2="36" stroke="#5a0020" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M36,60 Q50,54 64,60" stroke="#7a0030" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`,
            pill: `<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <defs>
    <linearGradient id="pTop${id}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#c8e8ff"/>
    </linearGradient>
    <linearGradient id="pBot${id}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <clipPath id="pCL${id}"><rect x="0" y="0" width="100" height="25"/></clipPath>
    <clipPath id="pCB${id}"><rect x="0" y="25" width="100" height="25"/></clipPath>
    <filter id="pG${id}"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect x="5" y="5" width="90" height="40" rx="20" fill="url(#pBot${id})" filter="url(#pG${id})"/>
  <rect x="5" y="5" width="90" height="40" rx="20" fill="url(#pTop${id})" clip-path="url(#pCL${id})"/>
  <line x1="5" y1="25" x2="95" y2="25" stroke="rgba(100,180,255,.5)" stroke-width="1.5"/>
  <ellipse cx="30" cy="15" rx="14" ry="6" fill="rgba(255,255,255,.45)" transform="rotate(-10,30,15)"/>
  <ellipse cx="30" cy="35" rx="14" ry="5" fill="rgba(255,255,255,.15)" transform="rotate(-10,30,35)"/>
</svg>`,
            heart: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <defs>
    <radialGradient id="hG${id}" cx="38%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#ff90b0"/><stop offset="50%" stop-color="#ff1a5e"/><stop offset="100%" stop-color="#99002e"/>
    </radialGradient>
    <filter id="hF${id}"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <!-- Corazón -->
  <path d="M50,82 C50,82 8,56 8,30 C8,16 18,8 31,12 C38,14 44,20 50,27 C56,20 62,14 69,12 C82,8 92,16 92,30 C92,56 50,82 50,82Z"
    fill="url(#hG${id})" filter="url(#hF${id})"/>
  <ellipse cx="34" cy="24" rx="12" ry="6" fill="rgba(255,255,255,.35)" transform="rotate(-30,34,24)"/>
  <!-- Venda diagonal -->
  <rect x="28" y="42" width="44" height="13" rx="4" fill="#f5deb3" transform="rotate(-20,50,48)"/>
  <rect x="28" y="42" width="44" height="13" rx="4" fill="none" stroke="#d4a96a" stroke-width="1" transform="rotate(-20,50,48)"/>
  <!-- Líneas de la venda -->
  <line x1="38" y1="37" x2="34" y2="53" stroke="#d4a96a" stroke-width="1.5" opacity=".7" transform="rotate(-20,50,48)"/>
  <line x1="46" y1="37" x2="42" y2="53" stroke="#d4a96a" stroke-width="1.5" opacity=".7" transform="rotate(-20,50,48)"/>
  <line x1="54" y1="37" x2="50" y2="53" stroke="#d4a96a" stroke-width="1.5" opacity=".7" transform="rotate(-20,50,48)"/>
  <line x1="62" y1="37" x2="58" y2="53" stroke="#d4a96a" stroke-width="1.5" opacity=".7" transform="rotate(-20,50,48)"/>
  <!-- Centro blanco de la venda -->
  <rect x="40" y="44" width="20" height="9" rx="2" fill="rgba(255,255,255,.85)" transform="rotate(-20,50,48)"/>
</svg>`,
            syringe: `<svg viewBox="0 0 120 44" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <defs>
    <linearGradient id="sG${id}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#e0f0ff"/><stop offset="40%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <linearGradient id="sL${id}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fca5a5"/><stop offset="100%" stop-color="#dc2626"/>
    </linearGradient>
    <filter id="sF${id}"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <line x1="2" y1="22" x2="20" y2="22" stroke="#e2e8f0" stroke-width="3.5" stroke-linecap="round"/>
  <rect x="20" y="11" width="72" height="22" rx="6" fill="url(#sG${id})" filter="url(#sF${id})"/>
  <rect x="24" y="15" width="38" height="14" rx="4" fill="rgba(255,255,255,.3)"/>
  <rect x="28" y="16" width="5" height="12" rx="2" fill="url(#sL${id})" opacity=".9"/>
  <rect x="40" y="16" width="5" height="12" rx="2" fill="url(#sL${id})" opacity=".7"/>
  <rect x="52" y="16" width="5" height="12" rx="2" fill="url(#sL${id})" opacity=".5"/>
  <polygon points="92,10 118,22 92,34" fill="#bae6fd" stroke="#38bdf8" stroke-width="1.5"/>
  <rect x="88" y="9" width="6" height="26" rx="3" fill="#0ea5e9"/>
  <ellipse cx="30" cy="17" rx="8" ry="3" fill="rgba(255,255,255,.3)"/>
</svg>`,
            stethoscope: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <defs>
    <radialGradient id="stC${id}" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#86efac"/><stop offset="100%" stop-color="#16a34a"/>
    </radialGradient>
    <filter id="stF${id}"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <circle cx="65" cy="68" r="19" fill="url(#stC${id})" filter="url(#stF${id})"/>
  <circle cx="65" cy="68" r="13" fill="#dcfce7" opacity=".6"/>
  <circle cx="65" cy="68" r="7" fill="#4ade80"/>
  <circle cx="65" cy="68" r="3.5" fill="#166534"/>
  <path d="M46,68 Q28,68 20,48 Q12,26 26,14" fill="none" stroke="#4ade80" stroke-width="5.5" stroke-linecap="round" filter="url(#stF${id})"/>
  <circle cx="24" cy="11" r="7" fill="#86efac" stroke="#16a34a" stroke-width="2"/>
  <circle cx="36" cy="5" r="7" fill="#86efac" stroke="#16a34a" stroke-width="2"/>
  <line x1="29" y1="16" x2="33" y2="10" stroke="#16a34a" stroke-width="3.5" stroke-linecap="round"/>
  <ellipse cx="58" cy="58" rx="8" ry="4" fill="rgba(255,255,255,.3)" transform="rotate(-30,58,58)"/>
</svg>`
        };
        return svgs[type] || svgs.covid;
    }

    // ── CONTENEDOR ────────────────────────────────────────────────
    const cont = document.createElement('div');
    cont.style.cssText = 'position:absolute;inset:0;overflow:hidden;'
        + 'background-image:linear-gradient(rgba(255,0,0,.07) 1px,transparent 1px),'
        + 'linear-gradient(90deg,rgba(255,0,0,.07) 1px,transparent 1px);background-size:50px 50px;';
    vfx.appendChild(cont);

    // ── EKG SVG ────────────────────────────────────────────────────
    const ekgSvg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    ekgSvg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;overflow:visible;';
    ekgSvg.innerHTML = `<defs><filter id="drGlow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <path fill="none" stroke="#ff0000" stroke-width="4" stroke-linecap="round" filter="url(#drGlow)"
    stroke-dasharray="800" stroke-dashoffset="800"
    d="M0,150 c0,0,180,0,197,0 s19,-37,30,-37 c14,0,9,48,27,48 c16,0,18,-155,20,-171 s8,-6,8,0 c0,6,3,188,4,210 c1,15,8,11,9,1 c1,-10,4,-74,17,-74 s4,22,25,22 c10,0,260,0,260,0">
    <animate attributeName="stroke-dashoffset" from="800" to="0" dur="2s" repeatCount="indefinite"/></path>`;
    cont.appendChild(ekgSvg);

    // ── CAPA DE OBJETOS ────────────────────────────────────────────
    const vd = document.createElement('div');
    vd.style.cssText = 'position:absolute;inset:0;pointer-events:auto;z-index:5;';
    cont.appendChild(vd);

    // ── CLASE OBJETO 3D ───────────────────────────────────────────
    const viruses = [];
    let raf;

    class Obj3D {
        constructor(x, y, size, small = false, idx = null) {
            this.x = x; this.y = y; this.size = size; this.small = small;
            const sp = small ? 2.8 : 1.2;
            this.dx = (Math.random() - .5) * sp * 2;
            this.dy = (Math.random() - .5) * sp * 2;
            this.rot = Math.random() * 360;
            this.drot = (Math.random() - .5) * 1.5;
            const url = OMOJI_URLS[idx !== null ? idx % OMOJI_URLS.length : Math.floor(Math.random() * OMOJI_URLS.length)];
            this.el = document.createElement('div');
            const glows = [
                'drop-shadow(0 0 8px rgba(255,80,120,0.95))  drop-shadow(0 0 18px rgba(255,0,80,0.6))',   // ❤️‍🩹 rosa
                'drop-shadow(0 0 8px rgba(120,220,80,0.95))  drop-shadow(0 0 18px rgba(80,200,0,0.6))',   // 💊 verde lima
                'drop-shadow(0 0 8px rgba(220,30,30,0.95))   drop-shadow(0 0 18px rgba(180,0,0,0.6))',    // 🩸 rojo sangre
                'drop-shadow(0 0 8px rgba(180,80,255,0.95))  drop-shadow(0 0 18px rgba(140,0,255,0.6))',  // 🦠 morado
                'drop-shadow(0 0 8px rgba(255,80,80,0.95))   drop-shadow(0 0 18px rgba(220,0,0,0.6))',    // 🫀 rojo vivo
                'drop-shadow(0 0 8px rgba(80,180,255,0.95))  drop-shadow(0 0 18px rgba(0,120,255,0.6))',  // 💉 azul
                'drop-shadow(0 0 8px rgba(255,200,60,0.95))  drop-shadow(0 0 18px rgba(220,140,0,0.6))',  // 👩‍⚕️ dorado
                'drop-shadow(0 0 8px rgba(255,100,30,0.95))  drop-shadow(0 0 18px rgba(200,50,0,0.6))',   // 🚑 naranja
                'drop-shadow(0 0 8px rgba(0,220,200,0.95))   drop-shadow(0 0 18px rgba(0,180,160,0.6))',  // 🩺 turquesa
            ];
            const gi = idx !== null ? idx % glows.length : Math.floor(Math.random() * glows.length);
            this.type = gi;
            const filterVal = small ? 'none' : glows[gi];
            const opacityVal = small ? '0.45' : '1';
            this.el.style.cssText = `position:absolute;width:${size}px;height:${size}px;cursor:pointer;`
                + `filter:${filterVal};opacity:${opacityVal};transition:transform .08s;`;
            const fallbacks = ['❤️‍🩹','💊','🩸','🦠','🫀','💉','👩‍⚕️','🚑','🩺'];
            const fi = idx !== null ? idx % fallbacks.length : Math.floor(Math.random() * fallbacks.length);
            this.el.innerHTML = `<img src="${url}" width="${size}" height="${size}"
                style="display:block;pointer-events:none;" draggable="false"
                onerror="this.style.display='none';this.parentNode.style.fontSize='${Math.round(size*.7)}px';this.parentNode.style.lineHeight='${size}px';this.parentNode.textContent='${fallbacks[fi]}'"/>`;
            vd.appendChild(this.el);
            if (!small) {
                this.el.addEventListener('click', () => this.explotar());
                this.el.addEventListener('touchstart', e => { e.preventDefault(); this.explotar(); }, { passive: false });
            }
        }
        explotar() {
            mostrarTip(this.type);
            for (let i = 0; i < 4; i++) viruses.push(new Obj3D(this.x, this.y, this.size * .45, true));
            this.el.remove();
            viruses.splice(viruses.indexOf(this), 1);
        }
        update(w, h) {
            this.x += this.dx; this.y += this.dy; this.rot += this.drot;
            if (this.x < 0 || this.x > w - this.size) this.dx *= -1;
            if (this.y < 0 || this.y > h - this.size) this.dy *= -1;
            this.el.style.left = this.x + 'px';
            this.el.style.top  = this.y + 'px';
            this.el.style.transform = `rotate(${this.rot}deg)`;
        }
    }

    const w = vfx.offsetWidth, h = vfx.offsetHeight;
    // Uno de cada emoji garantizado, luego aleatorios para completar
    // ── BASE DE TIPS (título, dato, acción) — 10 por emoji ──────────
    const TIPS = [
        { // 0 ❤️‍🩹 corazón curado
            emoji:'❤️‍🩹', titulo:'HERIDAS Y CURACIONES', color:'rgba(255,80,120,0.9)',
            datos:[
                { dato:'El corazón late unas 100,000 veces al día bombeando 7,500 litros de sangre.', accion:'✅ Si alguien se desmaya: acuéstalo, eleva las piernas 30 cm y llama al 911.' },
                { dato:'Una herida sangrante puede perder 1 litro de sangre en menos de 3 minutos.', accion:'✅ Aplica presión directa y firme durante al menos 10 minutos sin levantar el apósito.' },
                { dato:'El 80% de los paros cardíacos ocurren fuera del hospital.', accion:'✅ Aprende RCP: 30 compresiones fuertes en el centro del pecho, luego 2 respiraciones.' },
                { dato:'Las heridas sucias deben lavarse con abundante agua limpia antes de cubrirlas.', accion:'✅ Nunca uses algodón directo sobre una herida abierta — deja fibras y aumenta el riesgo de infección.' },
                { dato:'Un torniquete improvisado puede salvar una vida si la hemorragia es en extremidades.', accion:'✅ Aplícalo 5 cm por encima de la herida, anota la hora y NO lo retires hasta llegar al hospital.' },
                { dato:'Las quemaduras de primer grado solo afectan la capa superficial de la piel.', accion:'✅ Enfría con agua corriente fría 10–20 minutos. Nunca uses hielo, mantequilla ni pasta dental.' },
                { dato:'Una quemadura del tamaño de la palma de la mano se considera grave en niños.', accion:'✅ Cubre con gasa húmeda estéril y acude a urgencias de inmediato.' },
                { dato:'Los moretones profundos pueden indicar fractura interna aunque no haya deformidad visible.', accion:'✅ Si el dolor es intenso o la zona se hincha mucho, acude a una radiografía.' },
                { dato:'El vendaje compresivo reduce el sangrado y la inflamación en lesiones de tejidos blandos.', accion:'✅ Envuelve de abajo hacia arriba, sin cortar la circulación — los dedos no deben ponerse azules.' },
                { dato:'Lavar las manos antes de curar una herida reduce en un 90% el riesgo de infección.', accion:'✅ Usa guantes desechables si los tienes. Si no, lava bien tus manos con agua y jabón 20 segundos.' },
            ]
        },
        { // 1 💊 pastilla
            emoji:'💊', titulo:'MEDICAMENTOS', color:'rgba(120,220,80,0.9)',
            datos:[
                { dato:'El abuso de antibióticos genera bacterias resistentes, uno de los mayores problemas de salud mundial.', accion:'✅ Nunca uses antibióticos sin receta médica. Completa siempre el tratamiento completo.' },
                { dato:'Los antiinflamatorios como el ibuprofeno pueden dañar el estómago si se toman sin alimento.', accion:'✅ Toma medicamentos con agua y comida. Lee siempre el prospecto antes de ingerirlos.' },
                { dato:'Mezclar medicamentos con alcohol puede potenciar efectos tóxicos o ser mortal.', accion:'✅ Informa siempre a tu médico de todos los medicamentos, suplementos y remedios que tomas.' },
                { dato:'Los medicamentos vencidos pueden perder efectividad o volverse tóxicos.', accion:'✅ Revisa fechas de caducidad y entrega los medicamentos vencidos en farmacias con contenedor FEMSA.' },
                { dato:'En México, los medicamentos genéricos tienen la misma fórmula que los de marca pero cuestan hasta 80% menos.', accion:'✅ Pregunta siempre a tu médico o farmacéutico si hay opción genérica disponible.' },
                { dato:'La automedicación es la causa de hasta el 40% de las intoxicaciones reportadas en México.', accion:'✅ Ante cualquier síntoma raro después de tomar un medicamento, llama al CIATOX: 800 290 0024.' },
                { dato:'Algunos medicamentos para la presión, la diabetes o el corazón NO deben suspenderse de golpe.', accion:'✅ Nunca dejes un tratamiento crónico sin consultarlo antes con tu médico.' },
                { dato:'El paracetamol en dosis altas es la principal causa de falla hepática en el mundo.', accion:'✅ No excedas los 4 gramos al día en adultos y nunca lo combines con alcohol.' },
                { dato:'Los anticonceptivos hormonales pueden interactuar con antibióticos y reducir su eficacia.', accion:'✅ Consulta con tu médico o farmacéutico antes de combinar cualquier medicamento.' },
                { dato:'Guardar medicamentos en lugares húmedos o con calor los deteriora más rápido.', accion:'✅ Almacena en lugar fresco, seco y fuera del alcance de niños. No guardes en el baño.' },
            ]
        },
        { // 2 🩸 sangre
            emoji:'🩸', titulo:'HEMORRAGIAS', color:'rgba(220,30,30,0.9)',
            datos:[
                { dato:'Una hemorragia interna puede ser tan peligrosa como una externa sin que se note sangre.', accion:'✅ Si hay dolor abdominal intenso tras un golpe, acude a urgencias de inmediato.' },
                { dato:'La sangre tipo O negativo es universal: pueden recibirla todas las personas.', accion:'✅ Dona sangre regularmente. Una donación puede salvar hasta 3 vidas.' },
                { dato:'En hemorragias nasales NO inclines la cabeza hacia atrás: la sangre puede ir a los pulmones.', accion:'✅ Inclina la cabeza ligeramente hacia adelante y presiona el tabique con los dedos 10 minutos.' },
                { dato:'La pérdida del 30% del volumen sanguíneo causa choque hipovolémico, que puede ser fatal.', accion:'✅ Ante sangrado abundante que no cede en 10 minutos, llama al 911 de inmediato.' },
                { dato:'El cuerpo humano adulto contiene entre 4.5 y 5.5 litros de sangre en promedio.', accion:'✅ Mantén tu nivel de hierro con una dieta variada: legumbres, carnes, espinacas y cítricos.' },
                { dato:'Las personas con hemofilia pueden sangrar internamente sin golpe aparente.', accion:'✅ Si alguien con hemofilia se lesiona, NO apliques torniquete. Busca atención médica urgente.' },
                { dato:'El sangrado menstrual abundante (más de 80 ml por ciclo) puede causar anemia severa.', accion:'✅ Si empapas más de una toalla por hora durante varias horas, consulta a tu médico.' },
                { dato:'Un 40% de los mexicanos tiene deficiencia de hierro, la anemia más común del mundo.', accion:'✅ Consume vitamina C junto con alimentos ricos en hierro para mejorar su absorción.' },
                { dato:'La presión directa es el método más efectivo para detener el 90% de las hemorragias externas.', accion:'✅ Usa el material más limpio disponible: gasa, trapo limpio o incluso tu mano.' },
                { dato:'El choque hemorrágico tiene 4 clases según la cantidad de sangre perdida.', accion:'✅ Señales de alerta: piel pálida y fría, pulso rápido y débil, confusión. Llama al 911.' },
            ]
        },
        { // 3 🦠 virus
            emoji:'🦠', titulo:'VIRUS Y GÉRMENES', color:'rgba(180,80,255,0.9)',
            datos:[
                { dato:'Lavarse las manos 20 segundos con agua y jabón elimina el 99% de los gérmenes patógenos.', accion:'✅ Lava tus manos antes de comer, después del baño y al toser, estornudar o tocar superficies.' },
                { dato:'Los virus mutan constantemente; por eso la vacuna de la influenza cambia cada año.', accion:'✅ Vacúnate anualmente y mantén tu esquema de vacunación al día.' },
                { dato:'Una sola bacteria puede multiplicarse hasta 8 millones en tan solo 24 horas.', accion:'✅ Cubre tu boca al estornudar con el codo, no con la mano.' },
                { dato:'Los virus NO responden a los antibióticos. Usarlos para gripas es inútil y peligroso.', accion:'✅ Ante resfriado o gripa: reposo, hidratación y analgésicos si son necesarios. Consulta a tu médico.' },
                { dato:'El sarampión es tan contagioso que basta con estar en un cuarto donde estuvo un infectado dos horas antes.', accion:'✅ La vacuna triple viral (SRP) protege contra sarampión, rubéola y parotiditis. ¡Ponla a tiempo!' },
                { dato:'Los teléfonos celulares tienen 10 veces más bacterias que un asiento de inodoro.', accion:'✅ Limpia tu teléfono con toallitas desinfectantes regularmente, especialmente antes de comer.' },
                { dato:'Los gérmenes pueden vivir en superficies duras hasta 72 horas.', accion:'✅ Desinfecta regularmente manijas, interruptores y mesas con alcohol al 70% o cloro diluido.' },
                { dato:'El norovirus, causante de la gastroenteritis viral, sobrevive en superficies hasta 2 semanas.', accion:'✅ Ante diarrea y vómito: hidratación constante con suero oral y consulta médica si dura más de 2 días.' },
                { dato:'Más del 60% de las enfermedades infecciosas emergentes provienen de animales.', accion:'✅ Lava bien frutas, verduras y carnes. Evita contacto con animales silvestres o enfermos.' },
                { dato:'La resistencia bacteriana a antibióticos podría causar más muertes que el cáncer para 2050.', accion:'✅ Solo usa antibióticos bajo prescripción médica y termina siempre el tratamiento completo.' },
            ]
        },
        { // 4 🫀 paro cardíaco
            emoji:'🫀', titulo:'PARO CARDÍACO', color:'rgba(255,80,80,0.9)',
            datos:[
                { dato:'Cada minuto sin RCP reduce un 10% las posibilidades de sobrevivir a un paro cardíaco.', accion:'✅ Llama al 911, inicia RCP de inmediato y busca un desfibrilador (DEA) cercano.' },
                { dato:'El DEA o desfibrilador externo automático guía a cualquier persona paso a paso con instrucciones de voz.', accion:'✅ Localiza hoy el DEA más cercano a tu trabajo, escuela o lugar de entrenamiento.' },
                { dato:'Las mujeres presentan síntomas distintos de infarto: náusea, fatiga extrema y dolor en la mandíbula.', accion:'✅ Ante cualquier síntoma inusual en el pecho o brazo izquierdo, llama al 911 sin esperar.' },
                { dato:'La RCP de alta calidad debe comprimir el pecho al menos 5 cm de profundidad a 100–120 veces por minuto.', accion:'✅ Usa el ritmo de la canción "Stayin Alive" de los Bee Gees para marcar el ritmo correcto.' },
                { dato:'El 70% de los paros cardíacos ocurren en el hogar, frente a alguien conocido.', accion:'✅ Aprende RCP básica: un curso dura solo 4 horas y puede salvar a un familiar.' },
                { dato:'La angina de pecho estable puede convertirse en infarto agudo si no se trata a tiempo.', accion:'✅ Si el dolor de pecho dura más de 20 minutos y no cede con reposo, llama al 911.' },
                { dato:'Los factores de riesgo modificables del infarto incluyen tabaquismo, sedentarismo y mala alimentación.', accion:'✅ Camina 30 minutos al día, deja de fumar y reduce la sal y el azúcar en tu dieta.' },
                { dato:'En México, las enfermedades cardiovasculares son la primera causa de muerte, con más de 200,000 casos al año.', accion:'✅ Hazte un chequeo cardiológico si tienes más de 40 años, aunque no tengas síntomas.' },
                { dato:'El estrés crónico eleva el cortisol, lo que daña las arterias y aumenta el riesgo de infarto.', accion:'✅ Practica técnicas de relajación: respiración profunda, meditación o yoga 15 minutos al día.' },
                { dato:'El colesterol LDL alto es silencioso: no da síntomas hasta que ocurre el daño vascular.', accion:'✅ Hazte un perfil lipídico en ayuno cada 2 años si eres adulto sano, o cada año si tienes riesgo.' },
            ]
        },
        { // 5 💉 jeringa / vacunas
            emoji:'💉', titulo:'VACUNAS', color:'rgba(80,180,255,0.9)',
            datos:[
                { dato:'Las vacunas han salvado más de 150 millones de vidas en los últimos 50 años.', accion:'✅ Revisa tu cartilla de vacunación y la de toda tu familia. ¡Mantenla al día!' },
                { dato:'La viruela fue erradicada en 1980 gracias a una campaña masiva de vacunación global.', accion:'✅ Vacunar al 95% de la población crea inmunidad de rebaño y protege a quienes no pueden vacunarse.' },
                { dato:'Las vacunas no causan autismo. Ese estudio fue retirado y su autor perdió su licencia médica.', accion:'✅ Consulta siempre fuentes oficiales como la OMS, IMSS o tu médico de cabecera.' },
                { dato:'La vacuna del VPH previene el 90% de los casos de cáncer cervicouterino.', accion:'✅ Se aplica idealmente entre los 9 y 14 años, antes del inicio de la vida sexual.' },
                { dato:'México aplica 14 vacunas de forma gratuita en el Centro de Salud, desde el nacimiento.', accion:'✅ Lleva a tus hijos al Centro de Salud más cercano para completar su esquema básico.' },
                { dato:'Los adultos mayores de 60 años deben vacunarse contra influenza, neumococo y herpes zóster.', accion:'✅ Pregunta en tu centro de salud por las vacunas disponibles para adultos mayores.' },
                { dato:'Las personas con diabetes o inmunosupresión necesitan vacunas adicionales a las del esquema básico.', accion:'✅ Si tienes una enfermedad crónica, consulta con tu médico qué vacunas extra necesitas.' },
                { dato:'La vacuna contra la rabia debe aplicarse ANTES de que aparezcan síntomas, o no funcionará.', accion:'✅ Ante mordedura de animal con posible rabia, acude a urgencias en las primeras horas.' },
                { dato:'Las vacunas vivas atenuadas, como la BCG, no deben aplicarse a personas inmunocomprometidas.', accion:'✅ Informa a tu médico si estás en quimioterapia o tomas inmunosupresores antes de vacunarte.' },
                { dato:'La cobertura de vacunación en México bajó durante la pandemia, aumentando el riesgo de brotes.', accion:'✅ Si tienes hijos con vacunas atrasadas, acude al IMSS, ISSSTE o Centro de Salud a ponerlas al corriente.' },
            ]
        },
        { // 6 👩‍⚕️ primeros auxilios
            emoji:'👩‍⚕️', titulo:'PRIMEROS AUXILIOS', color:'rgba(255,200,60,0.9)',
            datos:[
                { dato:'En una fractura nunca intentes enderezar el hueso: puedes dañar vasos sanguíneos y nervios.', accion:'✅ Inmoviliza la extremidad tal como está, aplica frío envuelto en tela y llama al 911.' },
                { dato:'Ante un atragantamiento severo aplica la maniobra de Heimlich: 5 golpes en espalda y 5 compresiones abdominales.', accion:'✅ Si la persona puede toser con fuerza, anímala a seguir tosiendo por su cuenta.' },
                { dato:'El golpe de calor puede matar en minutos cuando la temperatura corporal supera los 40°C.', accion:'✅ Lleva a la víctima a la sombra, aplica agua fría en cuello y axilas y llama al 911.' },
                { dato:'La posición lateral de seguridad evita que una persona inconsciente se ahogue con su propio vómito.', accion:'✅ Si alguien está inconsciente pero respira, colócalo de lado con la boca hacia abajo.' },
                { dato:'El 25% de las personas que mueren por ahogamiento podrían salvarse con RCP inmediata.', accion:'✅ Inicia la RCP solo si estás seguro. Llama al 911 antes de entrar al agua.' },
                { dato:'Una convulsión suele durar entre 1 y 3 minutos. No hay que detenerla a la fuerza.', accion:'✅ Aleja objetos peligrosos, pon algo suave bajo la cabeza y espera a que termine. Llama al 911.' },
                { dato:'La picadura de alacrán en niños menores de 4 años puede ser mortal en pocas horas.', accion:'✅ Ante cualquier picadura de alacrán en un niño, acude a urgencias de inmediato sin esperar síntomas.' },
                { dato:'Un botiquín básico debe incluir gasas, cinta adhesiva, agua oxigenada, tijeras, guantes y suero oral.', accion:'✅ Revisa y renueva tu botiquín cada 6 meses y verifica que las fechas de caducidad sean vigentes.' },
                { dato:'La hipotermia ocurre cuando la temperatura corporal cae por debajo de 35°C.', accion:'✅ Retira la ropa mojada, abriga con mantas secas y da bebidas tibias si la persona está consciente.' },
                { dato:'Los ataques de pánico se sienten como un infarto, pero no son mortales.', accion:'✅ Respira lento y profundo: 4 segundos inhalar, 4 aguantar, 6 exhalar. Repite 5 veces.' },
            ]
        },
        { // 7 🚑 ambulancia / emergencias
            emoji:'🚑', titulo:'LLAMA AL 911', color:'rgba(255,100,30,0.9)',
            datos:[
                { dato:'El 911 es gratuito en México y está disponible las 24 horas, los 365 días del año.', accion:'✅ Al llamar: indica tu ubicación exacta, qué pasó y cuántas personas están afectadas.' },
                { dato:'Mover a una víctima de accidente sin saber si tiene lesión de columna puede causarle parálisis permanente.', accion:'✅ Estabiliza a la víctima, enciende las luces de emergencia del vehículo y espera al 911.' },
                { dato:'El tiempo promedio de respuesta de una ambulancia en México es de 8 minutos en zonas urbanas.', accion:'✅ Mientras esperas: mantén a la víctima tranquila, abrigada y consciente.' },
                { dato:'En caso de incendio, el humo mata más rápido que el fuego. El dióxido de carbono aturde en minutos.', accion:'✅ Si hay humo, agáchate y desplázate gateando. Toca puertas antes de abrirlas.' },
                { dato:'El número de Emergencias 911 también recibe llamadas de violencia familiar, robo y emergencias médicas.', accion:'✅ Guarda el 911 en tus contactos y enséñaselo también a tus hijos desde pequeños.' },
                { dato:'Los accidentes de tráfico son la primera causa de muerte en jóvenes de 5 a 29 años en México.', accion:'✅ Usa siempre el cinturón, no uses el celular al manejar y respeta los límites de velocidad.' },
                { dato:'El envenenamiento por monóxido de carbono no tiene olor ni color: es el "asesino silencioso del hogar".', accion:'✅ Nunca enciendas calentadores, estufas o autos en espacios cerrados. Ventila siempre.' },
                { dato:'Ante una crisis de violencia, el número de la Línea de la Mujer es 800 911 2511, disponible las 24 horas.', accion:'✅ Guarda estos números y compártelos: 911 emergencias, 800 911 2511 violencia, 800 290 0024 intoxicaciones.' },
                { dato:'En sismos, el 70% de las lesiones ocurren al intentar salir corriendo del edificio.', accion:'✅ Al temblar: protégete bajo una mesa sólida, aléjate de ventanas y espera a que cese el movimiento.' },
                { dato:'Las personas con discapacidad o adultos mayores tienen mayor riesgo en emergencias.', accion:'✅ Identifica a vecinos vulnerables y ten un plan de evacuación familiar que los incluya.' },
            ]
        },
        { // 8 🩺 estetoscopio / signos vitales
            emoji:'🩺', titulo:'SIGNOS VITALES', color:'rgba(0,220,200,0.9)',
            datos:[
                { dato:'Los signos vitales normales en adultos: pulso 60–100 lpm, presión 120/80, temperatura 36–37°C.', accion:'✅ Aprende a tomar el pulso: presiona 2 dedos en la muñeca y cuenta los latidos en 15 segundos, multiplica por 4.' },
                { dato:'Una frecuencia respiratoria mayor de 25 respiraciones por minuto en reposo es señal de emergencia.', accion:'✅ Cuenta las respiraciones durante 1 minuto completo observando el movimiento del pecho.' },
                { dato:'La presión arterial alta raramente da síntomas: por eso se llama "el asesino silencioso".', accion:'✅ Mide tu presión regularmente, especialmente si tienes más de 40 años o antecedentes familiares.' },
                { dato:'La fiebre es una respuesta defensiva del cuerpo: no siempre hay que bajarla si es menor de 38.5°C.', accion:'✅ Ante fiebre mayor de 39°C o que no baja con medicamento, acude al médico ese mismo día.' },
                { dato:'La saturación de oxígeno normal es de 95–100%. Por debajo de 90% es una emergencia.', accion:'✅ Un oxímetro de pulso cuesta menos de 200 pesos y puede ser vital en personas con enfermedades respiratorias.' },
                { dato:'La glucosa en sangre normal en ayuno es 70–100 mg/dL. Por encima de 126 indica diabetes.', accion:'✅ Si tienes antecedentes familiares de diabetes, hazte un análisis de glucosa en ayuno cada año.' },
                { dato:'La deshidratación leve ya reduce la concentración y el rendimiento físico en un 10%.', accion:'✅ Bebe al menos 2 litros de agua al día. Si tu orina es oscura, necesitas más líquidos.' },
                { dato:'Un pulso irregular puede ser señal de fibrilación auricular, la arritmia más común en adultos mayores.', accion:'✅ Si sientes que tu corazón "se salta latidos" o late irregularmente, consulta a un cardiólogo.' },
                { dato:'La temperatura axilar es 0.5°C menor que la temperatura interna real del cuerpo.', accion:'✅ Mide la temperatura bucal o de oído para mayor precisión. Desinfecta el termómetro antes de usarlo.' },
                { dato:'El dolor es considerado el quinto signo vital porque su evaluación es clave en el diagnóstico médico.', accion:'✅ Describe el dolor al médico con precisión: dónde, cuándo inició, qué lo alivia o empeora y qué tan intenso es.' },
            ]
        },
    ];

    // ── MOSTRAR TIP CENTRAL CON VOZ ───────────────────────────────
    let tipActivo = false;
    function mostrarTip(idx) {
        if (tipActivo) return;
        tipActivo = true;
        const t = TIPS[idx % TIPS.length];
        const d = t.datos[Math.floor(Math.random() * t.datos.length)];

        const card = document.createElement('div');
        card.style.cssText = `
            position:absolute;top:50%;left:35%;transform:translate(-50%,-50%) scale(0.8);
            z-index:50;width:clamp(220px,70%,320px);
            background:rgba(5,10,20,0.95);
            border:2px solid ${t.color};border-radius:16px;
            padding:14px 16px 12px;box-sizing:border-box;
            box-shadow:0 0 24px ${t.color}, 0 4px 24px rgba(0,0,0,0.7);
            font-family:'Segoe UI',sans-serif;text-align:center;
            opacity:0;transition:opacity .35s ease, transform .35s ease;
            pointer-events:auto;
        `;

        const cerrarTip = () => {
            window.speechSynthesis.cancel();
            card.style.opacity = '0';
            card.style.transform = 'translate(-50%,-50%) scale(0.85)';
            setTimeout(() => { card.remove(); tipActivo = false; }, 350);
        };

        card.innerHTML = `
            <button style="position:absolute;top:6px;right:8px;background:none;border:none;
                color:rgba(255,255,255,.6);font-size:.9rem;cursor:pointer;line-height:1;
                padding:2px 4px;" id="tip-close-btn">✕</button>
            <div style="font-size:1.8rem;margin-bottom:4px">${t.emoji}</div>
            <div style="font-size:.62rem;font-weight:900;letter-spacing:2px;color:${t.color};margin-bottom:6px;text-transform:uppercase">${t.titulo}</div>
            <div style="font-size:.68rem;color:rgba(255,255,255,.88);line-height:1.5;margin-bottom:8px">
                <span style="color:${t.color};font-weight:700">¿Sabías que...?</span><br>${d.dato}
            </div>
            <div style="font-size:.65rem;color:rgba(255,255,255,.7);background:rgba(255,255,255,.06);border-radius:8px;padding:6px 8px;line-height:1.45">${d.accion}</div>
        `;
        vd.appendChild(card);

        card.querySelector('#tip-close-btn').addEventListener('click', cerrarTip);
        card.querySelector('#tip-close-btn').addEventListener('touchstart', e => { e.preventDefault(); cerrarTip(); }, { passive:false });
        card.addEventListener('click', cerrarTip);
        card.addEventListener('touchstart', e => { e.preventDefault(); cerrarTip(); }, { passive:false });

        // Fade in
        requestAnimationFrame(() => {
            card.style.opacity = '1';
            card.style.transform = 'translate(-50%,-50%) scale(1)';
        });

        // Voz
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const texto = `${t.titulo}. ¿Sabías que? ${d.dato} ${d.accion.replace('✅','').trim()}`;
            const utt = new SpeechSynthesisUtterance(texto);
            utt.lang = 'es-MX';
            utt.rate = 0.92;
            utt.pitch = 1.05;
            window.speechSynthesis.speak(utt);
        }
    }

    const BIG = new Set([3, 5, 8]); // 🦠 virus, 💉 jeringa, 🩺 estetoscopio
    for (let i = 0; i < OMOJI_URLS.length; i++) {
        const size = BIG.has(i) ? 68 + Math.random() * 18 : 36 + Math.random() * 18;
        viruses.push(new Obj3D(
            Math.random() * (w - size),
            Math.random() * (h - size),
            size, false, i
        ));
    }

    function loop() { viruses.forEach(v => v.update(w, h)); raf = requestAnimationFrame(loop); }
    loop();

    vfx.style.pointerEvents = 'auto';

    return {
        cleanup: () => {
            cancelAnimationFrame(raf);
            cont.remove();
            vfx.style.pointerEvents = 'none';
            const elD = document.getElementById('glow-doctora');
            if (elD) {
                elD.style.zIndex = ''; elD.style.position = ''; elD.style.opacity = '';
                elD.style.filter = ''; elD.style.animation = '';
                // Devolver al DOM original
                if (_parentDoctora) {
                    if (_nextDoctora) _parentDoctora.insertBefore(elD, _nextDoctora);
                    else _parentDoctora.appendChild(elD);
                }
            }
            const elB = document.getElementById('glow-bombera');
            const elM = document.getElementById('glow-maestra');
            if (elB) elB.style.opacity = '';
            if (elM) elM.style.opacity = '';
        }
    };
}

// ==========================================
// FUNCION  8 PAQUETERIA
// ==========================================
function efectoPaqueteria(vfx) {
    // ── Todos los personajes f2026 al frente (mismo patrón nina-1) ──
    const _pers = ['glow-jugadoras','glow-bombera','glow-repartidora','glow-ingeniera',
                   'glow-doctora','glow-maestra','glow-futbolista'];
    const elNinaPaq = document.getElementById('glow-nina');
    const _persData = _pers.map(id => {
        const el = document.getElementById(id);
        return { el, parent: el?.parentNode, next: el?.nextSibling };
    });
    vfx.innerHTML = '';
    vfx.style.pointerEvents = 'auto';

    const _paqFrente = new Set(['glow-bombera','glow-maestra']);
    _persData.forEach(({ el }, i) => {
        if (el) { el.style.zIndex = _paqFrente.has(_pers[i]) ? '159' : '152'; el.style.position = 'absolute'; vfx.appendChild(el); }
    });
    if (elNinaPaq) { elNinaPaq.style.zIndex = '159'; elNinaPaq.style.position = 'absolute'; }

    // Capa oscura encima de los personajes, debajo del juego
    const oscuraPaq = document.createElement('div');
    oscuraPaq.style.cssText = 'position:absolute;inset:0;z-index:162;background:rgba(0,0,0,0.6);pointer-events:none;';
    vfx.appendChild(oscuraPaq);

    // ── CATÁLOGO COMPLETO (20 pares) ───────────────────────────────
    const ITEMS = [
        { id:1,  emoji:'⚽', name:'Balón', trap:false, facts:[
            '"Oceaunz", el balón del Mundial Femenil 2023, fue diseñado con IA para mayor precisión de trayectoria.',
            'El primer balón oficial de un Mundial Femenil fue el "Questra" en la edición de 1995 en Suecia.',
            'La Liga MX Femenil usa balones de menor presión que el fútbol masculino para adaptarse mejor al juego técnico.',
        ]},
        { id:2,  emoji:'👟', name:'Guayos', trap:false, facts:[
            'En 2023 Adidas lanzó los primeros tacos diseñados específicamente para la anatomía del pie femenino.',
            'Hasta 2020 la mayoría de jugadoras profesionales usaban guayos de horma masculina por falta de opciones.',
            'Nike lanzó en 2024 una línea completa de guayos femeninos con diseños de jugadoras de la Liga MX.',
        ]},
        { id:3,  emoji:'🦺', name:'Uniforme', trap:false, facts:[
            'La Selección Mexicana Femenil usó en 2021 un uniforme inspirado en arte huichol, honrando la identidad nacional.',
            'En 2023 varias selecciones exigieron uniformes con shorts del mismo color para mayor comodidad en el juego.',
            'El uniforme de la Selección Femenil Mexicana se vende igual que el masculino desde 2019 en tiendas oficiales.',
        ]},
        { id:4,  emoji:'💧', name:'Botella', trap:false, facts:[
            'Las jugadoras de élite consumen hasta 3 litros de agua durante un partido de 90 minutos.',
            'La hidratación en el fútbol femenil es clave: la deshidratación reduce el rendimiento hasta un 20%.',
            'FIFA obliga a pausas de hidratación en partidos con temperatura mayor a 32°C desde el Mundial 2015.',
        ]},
        { id:5,  emoji:'🩹', name:'Vendas', trap:false, facts:[
            'El 70% de lesiones en fútbol femenil ocurren en rodilla y tobillo. ¡Las vendas son esenciales!',
            'Las lesiones de ligamento cruzado son 4 veces más frecuentes en futbolistas femeninas que masculinas.',
            'La Liga MX Femenil implementó en 2022 protocolos específicos de prevención de lesiones para jugadoras.',
        ]},
        { id:6,  emoji:'🧤', name:'Guantes', trap:false, facts:[
            'Stephanie Labbé (Canadá) ganó el Guante de Oro Olímpico en Tokio 2020 con actuaciones históricas.',
            'Mónica Ocampo, portera mexicana, fue la primera en atajar un penal en un Mundial Femenil en 2011.',
            'La portera española Cata Coll fue elegida la mejor del mundo en 2023 tras ganar el Mundial Femenil.',
        ]},
        { id:7,  emoji:'🧦', name:'Medias', trap:false, facts:[
            'La Liga MX Femenil fue fundada en 2017 y hoy es referente del fútbol femenil en toda CONCACAF.',
            'Las medias de compresión reducen la fatiga muscular hasta un 15% en partidos de alta intensidad.',
            'Tigres Femenil fue el primer equipo mexicano en llegar a una final del Mundial de Clubes Femenino en 2021.',
        ]},
        { id:8,  emoji:'🏆', name:'Trofeo', trap:false, facts:[
            'Tigres Femenil es el equipo más ganador de la historia de la Liga MX Femenil con múltiples títulos.',
            'El primer campeón de la Liga MX Femenil fue Chivas Femenil en el torneo Apertura 2017.',
            'América Femenil ganó su primer título de Liga MX en 2023, consolidándose como potencia del fútbol nacional.',
        ]},
        { id:9,  emoji:'📋', name:'Táctica', trap:false, facts:[
            'España conquistó su primer Mundial Femenil en 2023 usando un sistema de presión alta muy efectivo.',
            'La táctica 4-3-3 es la más usada en el fútbol femenil de élite a nivel mundial según análisis de FIFA.',
            'La Selección Mexicana Femenil adoptó el estilo de juego posicional desde 2019 bajo nuevas directrices técnicas.',
        ]},
        { id:10, emoji:'🎽', name:'Playera', trap:false, facts:[
            'México debutó en Mundiales Femeniles en 1999 y ha clasificado tres veces: 1999, 2011 y 2015.',
            'La playera de la Selección Femenil Mexicana usó el número 10 histórico de Norma Palafox en un homenaje especial.',
            'En 2026 la Selección Femenil Mexicana cumple 55 años de historia desde su primer partido oficial en 1971.',
        ]},
        { id:11, emoji:'🥅', name:'Portería',  trap:false, facts:[
            'La portería mide 7.32 m de ancho y 2.44 m de alto, medidas iguales en fútbol femenil y masculino.',
            'Mónica Ocampo fue la primera mexicana en atajar un penalti en un Mundial Femenil, en Alemania 2011.',
            'Cata Coll (España) atajó 4 penaltis en el Mundial 2023, siendo la portera más destacada del torneo.',
        ]},
        { id:12, emoji:'🏟️', name:'Estadio',  trap:false, facts:[
            'El Estadio Azteca fue sede de partidos de fútbol femenil en los Juegos Olímpicos de México 1968.',
            'El Rose Bowl (EE.UU.) albergó la final del Mundial Femenil 1999 con 90,185 espectadores, récord histórico.',
            'El Estadio Australia de Sídney fue sede de la final del Mundial Femenil 2023 con 75,784 asistentes.',
        ]},
        { id:13, emoji:'🚩', name:'Córner',    trap:false, facts:[
            'El tiro de esquina fue añadido al reglamento del fútbol en 1872 y aplica igual en el juego femenil.',
            'En el Mundial Femenil 2023 se ejecutaron más de 600 tiros de esquina a lo largo de todo el torneo.',
            'México marcó uno de sus goles históricos en un Mundial Femenil directamente de tiro de esquina en 2011.',
        ]},
        { id:14, emoji:'🎯', name:'Penalti',   trap:false, facts:[
            'El punto de penalti está a 11 metros de la portería, igual en fútbol femenil y masculino.',
            'EE.UU. vs. China en la final del Mundial 1999 es la tanda de penaltis más vista de la historia femenil.',
            'España ganó la semifinal del Mundial 2023 en penaltis contra Suecia con Cata Coll como heroína.',
        ]},
        { id:15, emoji:'💪', name:'Capitana',  trap:false, facts:[
            'La capitana lleva el brazalete y representa al equipo en el sorteo y comunicación con el árbitro.',
            'Marta fue capitana de Brasil en 5 Mundiales Femeniles consecutivos, récord histórico en la competencia.',
            'Veronica Pérez fue una de las capitanas más emblemáticas de la Selección Mexicana Femenil en los 2000s.',
        ]},
        { id:16, emoji:'📣', name:'Afición',   trap:false, facts:[
            'La final del Mundial Femenil 2023 fue vista por más de 2,000 millones de personas en el mundo.',
            'En México, la Liga MX Femenil multiplicó por 10 su asistencia en estadios entre 2017 y 2024.',
            'El partido Argentina vs. España en el Mundial 2023 batió récords de audiencia en Latinoamérica.',
        ]},
        { id:17, emoji:'🥇', name:'Medalla',   trap:false, facts:[
            'México ganó el oro en fútbol femenil en los Juegos Panamericanos de Guadalajara 2011.',
            'Canadá ganó la medalla de oro olímpica femenil en Tokio 2020, eliminando a EE.UU. en semis.',
            'Estados Unidos ha ganado 4 medallas de oro olímpicas en fútbol femenil: 1996, 2004, 2008 y 2012.',
        ]},
        { id:18, emoji:'🚦', name:'Offside',   trap:false, facts:[
            'La regla del fuera de lugar en fútbol femenil es idéntica a la del masculino desde los primeros torneos.',
            'El VAR se usó por primera vez en un Mundial Femenil en Francia 2019 para revisar posiciones de offside.',
            'El gol más polémico anulado por offside en un Mundial Femenil fue el de Alemania vs. Suecia en 2019.',
        ]},
        { id:19, emoji:'🏅', name:'Copa Oro W', trap:false, facts:[
            'La Copa Oro W de CONCACAF se creó en 2022 para dar más torneos oficiales al fútbol femenil regional.',
            'México ganó la primera Copa Oro W en 2022, derrotando a Jamaica en la final en California.',
            'La Copa Oro W reúne a las mejores selecciones de Norte, Centroamérica y el Caribe cada dos años.',
        ]},
        { id:20, emoji:'⚡', name:'VAR',        trap:false, facts:[
            'El VAR se implementó en el fútbol femenil de élite a partir del Mundial de Francia 2019.',
            'En la Liga MX Femenil el videoarbitraje se empezó a usar de forma oficial en la temporada 2021-2022.',
            'El primer gol anulado por VAR en un Mundial Femenil ocurrió en el partido Francia vs. Corea del Sur en 2019.',
        ]},
    ];

    const TARGET_COUNT = 4;
    const TIME_LIMIT   = 60;

    // ── AUDIO ──────────────────────────────────────────────────────
    let pkAudioCtx = null;
    function pkTone(freq, dur, vol, type='sine') {
        try {
            if (!pkAudioCtx) pkAudioCtx = new (window.AudioContext||window.webkitAudioContext)();
            if (pkAudioCtx.state==='suspended') pkAudioCtx.resume();
            const ctx=pkAudioCtx, now=ctx.currentTime;
            const o=ctx.createOscillator(), g=ctx.createGain();
            o.type=type; o.frequency.setValueAtTime(freq,now);
            o.frequency.exponentialRampToValueAtTime(freq*0.7,now+dur);
            g.gain.setValueAtTime(vol,now);
            g.gain.exponentialRampToValueAtTime(0.001,now+dur+0.05);
            o.connect(g).connect(ctx.destination);
            o.start(now); o.stop(now+dur+0.06);
        } catch(e){}
    }
    function sfxMatch()  { pkTone(523,.1,.18); setTimeout(()=>pkTone(659,.12,.18),100); setTimeout(()=>pkTone(784,.2,.18),210); }
    function sfxWrong()  { pkTone(200,.22,.15,'sawtooth'); }
    function sfxFlip()   { pkTone(440,.06,.08); }
    function sfxWin()    { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>pkTone(f,.18,.18),i*120)); }

    // ── CONTENEDOR RAÍZ ────────────────────────────────────────────
    const root = document.createElement('div');
    root.style.cssText = 'position:absolute;inset:0;overflow:hidden;font-family:sans-serif;';
    vfx.appendChild(root);

    root.innerHTML = `
<style>
.pk-wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
  background:transparent;overflow:hidden;z-index:165;}

/* PANTALLAS */
.pk-screen{position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  background:rgba(0,0,0,.15);backdrop-filter:blur(1px);
  z-index:165;padding:10px 14px;text-align:center;overflow-y:auto;}
.pk-hidden{display:none!important;}
.pk-title{font-size:clamp(1rem,4vw,1.7rem);font-weight:900;color:#fff;
  text-transform:uppercase;letter-spacing:2px;margin-bottom:5px;line-height:1.1;}
.pk-sub{font-size:clamp(.62rem,1.9vw,.82rem);color:rgba(255,255,255,.75);
  max-width:310px;line-height:1.5;margin-bottom:10px;}
.pk-btn{background:#e8a020;color:#000;border:none;padding:9px 24px;
  font-weight:900;font-size:.88rem;letter-spacing:1px;border-radius:30px;
  cursor:pointer;text-transform:uppercase;transition:transform .1s;margin-top:4px;}
.pk-btn:active{transform:scale(.93);}
.pk-btn.green{background:#2ecc71;color:#fff;}
.pk-btn.red{background:#e74c3c;color:#fff;}

/* HUD */
.pk-hud{width:98%;display:flex;align-items:center;justify-content:flex-start;
  gap:12px;padding:3px 8px;flex-shrink:0;margin-top:4px;}
.pk-found{font-size:.72rem;font-weight:700;color:#3ae0a0;letter-spacing:.5px;white-space:nowrap;}
.pk-timer-box{display:flex;align-items:center;gap:5px;}
.pk-timer-num{font-size:1rem;font-weight:900;color:#fff;min-width:26px;text-align:right;}
.pk-timer-bg{width:130px;height:7px;background:rgba(255,255,255,.15);border-radius:4px;overflow:hidden;}
.pk-timer-fill{height:100%;width:100%;border-radius:4px;
  background:linear-gradient(90deg,#2ecc71,#f1c40f);transition:width 1s linear,background .4s;}

/* LISTA OBJETIVOS */
.pk-targets{width:98%;flex-shrink:0;display:flex;flex-wrap:wrap;
  gap:4px;justify-content:center;padding:3px 0;}
.pk-chip{display:flex;align-items:center;gap:4px;
  background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.25);
  border-radius:20px;padding:3px 9px;
  font-size:clamp(.6rem,1.6vw,.72rem);color:#fff;font-weight:600;
  transition:background .3s,border-color .3s,opacity .3s;}
.pk-chip.done{background:rgba(46,204,113,.25);border-color:#2ecc71;
  color:#2ecc71;text-decoration:line-through;opacity:.7;}
.pk-chip.trap.done{background:rgba(231,76,60,.2);border-color:#e74c3c;
  color:#e74c3c;}

/* GRID 2×8 */
.pk-grid{width:96%;display:grid;
  grid-template-columns:repeat(8,1fr);
  grid-template-rows:repeat(2,1fr);
  gap:clamp(5px,1.2vw,12px);padding:3px 0;
  height:clamp(110px,22vh,190px);flex-shrink:0;}

/* CARTA — cuadrada, 100% opaca */
.pk-card{position:relative;cursor:pointer;perspective:500px;border-radius:5px;
  aspect-ratio:1;}
.pk-inner{position:absolute;inset:0;transform-style:preserve-3d;
  transition:transform .32s ease;border-radius:5px;}
.pk-card.flipped .pk-inner,.pk-card.matched .pk-inner,.pk-card.revealed .pk-inner{transform:rotateY(180deg);}
.pk-front,.pk-back{position:absolute;inset:0;backface-visibility:hidden;
  border-radius:5px;display:flex;flex-direction:column;
  align-items:center;justify-content:center;overflow:hidden;}
.pk-back{background:#0f2341;
  border:1.5px solid rgba(255,255,255,.3);
  display:flex;flex-direction:row;align-items:center;justify-content:center;gap:2px;}
.pk-back-year{font-size:clamp(.28rem,.8vw,.45rem);font-weight:900;
  color:rgba(255,255,255,.7);letter-spacing:.5px;white-space:nowrap;}
.pk-back-ball{font-size:clamp(.7rem,1.8vw,1rem);line-height:1;}
.pk-front{transform:rotateY(180deg);
  background:#0a3723;
  border:1.5px solid rgba(255,255,255,.3);}
.pk-card.matched .pk-front{background:#146e37;
  border-color:#2ecc71;box-shadow:0 0 7px rgba(46,204,113,.7);}
.pk-card.matched.trap .pk-front{background:#6e1414;
  border-color:#e74c3c;box-shadow:0 0 7px rgba(231,76,60,.6);}
.pk-card.revealed .pk-front{background:#2a2a3e;
  border-color:rgba(255,200,50,.6);}
.pk-emoji{font-size:clamp(.75rem,2.2vw,1.25rem);line-height:1;}
.pk-name{font-size:clamp(.28rem,.9vw,.48rem);color:rgba(255,255,255,.8);
  font-weight:700;margin-top:1px;text-align:center;line-height:1.1;padding:0 1px;}

/* ZONA DATOS — fija al fondo, no tapa cartas */
.pk-fact{position:absolute;bottom:0;left:2%;width:96%;
  background:rgba(0,0,0,.95);border-top:2px solid #e8a020;
  border-radius:0;
  padding:4px 10px;font-size:clamp(.52rem,1.4vw,.65rem);color:#fff;
  line-height:1.45;z-index:20;text-align:left;
  max-height:clamp(40px,10vh,70px);overflow-y:auto;
  display:flex;flex-direction:column;gap:3px;}
.pk-fact-line{padding:2px 0;border-bottom:1px solid rgba(255,200,50,.18);}
.pk-fact-line:last-child{border-bottom:none;}

/* POPUP DATO GRANDE */
.pk-popup{position:absolute;top:0;left:0;right:0;z-index:60;
  background:linear-gradient(160deg,#0a1929,#050f1e);
  border-bottom:3px solid #e8a020;border-radius:0 0 14px 14px;
  padding:14px 16px 12px;animation:pkPopIn .22s ease;}
@keyframes pkPopIn{from{transform:translateY(-100%);opacity:0;}to{transform:translateY(0);opacity:1;}}
.pk-popup-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.pk-popup-body{font-size:clamp(.75rem,2.4vw,1rem);color:#fff;
  line-height:1.55;font-weight:500;margin-top:2px;flex:1;}
.pk-popup-body b{color:#f1c40f;font-size:1.1em;}
.pk-popup-close{background:#e74c3c;color:#fff;border:none;border-radius:50%;
  width:28px;height:28px;font-size:1rem;font-weight:900;cursor:pointer;
  flex-shrink:0;display:flex;align-items:center;justify-content:center;
  box-shadow:0 2px 8px rgba(231,76,60,.6);transition:transform .1s;}
.pk-popup-close:active{transform:scale(.88);}
.pk-popup-tag{display:inline-block;font-size:.6rem;font-weight:900;
  letter-spacing:1px;text-transform:uppercase;padding:2px 8px;
  border-radius:10px;margin-bottom:6px;}
.pk-popup-tag.correct{background:rgba(46,204,113,.25);color:#2ecc71;border:1px solid #2ecc71;}
.pk-popup-tag.wrong{background:rgba(255,200,50,.15);color:#f1c40f;border:1px solid #f1c40f;}

/* STATS WIN/LOSE */
.pk-stats{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:8px 0;}
.pk-stat{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);
  border-radius:9px;padding:5px 13px;text-align:center;}
.pk-stat-n{font-size:1.3rem;font-weight:900;color:#f1c40f;}
.pk-stat-l{font-size:.56rem;color:rgba(255,255,255,.55);font-weight:700;letter-spacing:.5px;}
</style>

<div class="pk-wrap" id="pk-wrap">

  <!-- INICIO -->
  <div class="pk-screen" id="pk-start">
    <div style="font-size:2.4rem">🎒</div>
    <div class="pk-title">¡El Partido<br>Está por Comenzar!</div>
    <p class="pk-sub">Te damos una lista de <b>4 objetos</b> que debes meter al maletín.<br>Encuéntralos entre las 24 cartas en <b>60 segundos</b>.<br>¡Cuidado con los objetos trampa!</p>
    <div style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap;justify-content:center;font-size:.68rem;color:rgba(255,255,255,.55);">
      <span>✅ Par de tu lista → ¡punto!</span>
      <span>❌ Par fuera de lista → se voltean</span>
    </div>
    <button class="pk-btn" id="pk-btn-start">¡ARMAR MALETÍN!</button>
  </div>

  <!-- GAME OVER -->
  <div class="pk-screen pk-hidden" id="pk-gameover">
    <div style="font-size:2rem">⏰</div>
    <div class="pk-title" style="color:#e74c3c">¡Se Fue el Tiempo!</div>
    <p class="pk-sub">Perdieron el partido, sus accesorios no llegaron a tiempo.</p>
    <div class="pk-stats">
      <div class="pk-stat"><div class="pk-stat-n" id="pk-go-found">0</div><div class="pk-stat-l">ENCONTRADOS</div></div>
      <div class="pk-stat"><div class="pk-stat-n" id="pk-go-pend">0</div><div class="pk-stat-l">PENDIENTES</div></div>
    </div>
    <button class="pk-btn red" id="pk-btn-retry">REINTENTAR</button>
  </div>

  <!-- WIN -->
  <div class="pk-screen pk-hidden" id="pk-win">
    <div style="font-size:2.4rem">🏆</div>
    <div class="pk-title" style="color:#f1c40f">¡Maletín Listo!</div>
    <p class="pk-sub">Encontraste todos los objetos a tiempo. ¡Al campo — el partido te espera!</p>
    <div class="pk-stats">
      <div class="pk-stat"><div class="pk-stat-n" id="pk-win-time">0s</div><div class="pk-stat-l">TIEMPO RESTANTE</div></div>
      <div class="pk-stat"><div class="pk-stat-n" id="pk-win-badge">🥅</div><div class="pk-stat-l">BADGE</div></div>
    </div>
    <button class="pk-btn green" id="pk-btn-replay">JUGAR DE NUEVO</button>
  </div>

  <!-- ÁREA DE JUEGO -->
  <div class="pk-hidden" id="pk-game"
       style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;padding-bottom:clamp(44px,11vh,75px);">
    <div class="pk-hud">
      <div class="pk-found">🎒 <span id="pk-found-count">0</span>/4</div>
      <div class="pk-timer-box">
        <div class="pk-timer-bg"><div class="pk-timer-fill" id="pk-timer-fill"></div></div>
        <div class="pk-timer-num" id="pk-timer-num">60</div>
      </div>
    </div>
    <!-- lista objetivos -->
    <div style="font-size:clamp(.55rem,1.5vw,.68rem);font-weight:700;letter-spacing:1.5px;
      color:rgba(255,255,255,.55);text-transform:uppercase;margin-top:3px;flex-shrink:0;">
      Encuentra estas palabras
    </div>
    <div class="pk-targets" id="pk-targets"></div>
    <!-- grid cartas -->
    <div class="pk-grid" id="pk-grid"></div>
    <!-- dato curioso -->
    <div class="pk-fact" id="pk-fact"></div>
  </div>

</div>`;

    // ── LÓGICA ─────────────────────────────────────────────────────
    (function(){
        const $  = id => root.querySelector('#'+id);
        const $$ = sel => root.querySelectorAll(sel);

        let targets=[], deck=[], flipped=[], foundCount=0;
        let timerInterval, timeLeft, canFlip=true;

        // ── BARAJAR y elegir targets ───────────────────────────────
        function shuffle(arr){ for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];} return arr; }

        function buildGame(){
            // asignar fact aleatorio a cada item
            const itemsWithFact = ITEMS.map(item => ({
                ...item,
                fact: item.facts[Math.floor(Math.random() * item.facts.length)]
            }));

            // 6 targets aleatorios
            const pool = shuffle(itemsWithFact);
            targets = pool.slice(0, TARGET_COUNT);

            // 4 distractores
            const distractors = pool.slice(TARGET_COUNT, TARGET_COUNT + 4);

            // deck: 8 pares = 16 cartas
            const boardItems = [...targets, ...distractors];
            deck = shuffle(boardItems.flatMap(item=>[
                {...item, uid: item.id*2-1},
                {...item, uid: item.id*2}
            ]));
        }

        // ── INICIAR ────────────────────────────────────────────────
        function startGame(){
            buildGame();
            foundCount=0; flipped=[]; canFlip=true; timeLeft=TIME_LIMIT;
            const factEl=$('pk-fact'); if(factEl) factEl.innerHTML='';
            const oldPopup=root.querySelector('.pk-popup'); if(oldPopup) oldPopup.remove();
            renderTargets();
            renderGrid();
            showScreen('pk-game');
            startTimer();
        }

        // ── PANTALLAS ──────────────────────────────────────────────
        function showScreen(id){
            ['pk-start','pk-gameover','pk-win'].forEach(s=>{
                const el=$(s); if(el) el.classList.add('pk-hidden');
            });
            const game=$('pk-game');
            if(id==='pk-game'){ if(game){ game.classList.remove('pk-hidden'); game.style.display='flex'; } }
            else{ if(game) game.classList.add('pk-hidden'); const el=$(id); if(el) el.classList.remove('pk-hidden'); }
        }

        // ── CHIPS DE OBJETIVOS ─────────────────────────────────────
        function renderTargets(){
            const wrap=$('pk-targets'); if(!wrap) return;
            wrap.innerHTML = targets.map(t=>
                `<div class="pk-chip" id="chip-${t.id}">
                   ${t.emoji} ${t.name}
                 </div>`
            ).join('');
        }

        function checkChip(id){
            const chip=root.querySelector('#chip-'+id);
            if(chip) chip.classList.add('done');
        }

        // ── GRID ───────────────────────────────────────────────────
        function renderGrid(){
            const grid=$('pk-grid'); if(!grid) return;
            grid.innerHTML='';
            deck.forEach((card, i)=>{
                const el=document.createElement('div');
                el.className='pk-card'+(card.trap?' trap':'');
                el.dataset.id=card.id;
                el.dataset.uid=card.uid;
                el.innerHTML=`<div class="pk-inner">
                  <div class="pk-back"><span class="pk-back-year">1971</span><span class="pk-back-ball">⚽</span><span class="pk-back-year">2026</span></div>
                  <div class="pk-front">
                    <div class="pk-emoji">${card.emoji}</div>
                    <div class="pk-name">${card.name}</div>
                  </div>
                </div>`;
                el.addEventListener('click',()=>onCardClick(el,card));
                grid.appendChild(el);
            });
        }

        // ── LÓGICA DE CARTAS ───────────────────────────────────────
        function onCardClick(el, card){
            if(!canFlip) return;
            if(el.classList.contains('flipped')||el.classList.contains('matched')) return;
            if(flipped.length>=2) return;

            sfxFlip();
            el.classList.add('flipped');
            flipped.push({el, card});

            if(flipped.length===2){
                canFlip=false;
                const [a,b]=flipped;

                if(a.card.id===b.card.id){
                    // Par encontrado — siempre queda visible
                    const isTarget = targets.some(t=>t.id===a.card.id);
                    setTimeout(()=>{
                        a.el.classList.remove('flipped');
                        b.el.classList.remove('flipped');
                        if(isTarget){
                            a.el.classList.add('matched');
                            b.el.classList.add('matched');
                            checkChip(a.card.id);
                            foundCount++;
                            updateHud();
                            sfxMatch();
                        } else {
                            // No es objetivo → queda visible pero estilo neutro
                            a.el.classList.add('revealed');
                            b.el.classList.add('revealed');
                        }
                        flipped=[];
                        if(foundCount===TARGET_COUNT){
                            stopTimer();
                            showFact(a.card, isTarget, winGame);
                        } else {
                            showFact(a.card, isTarget);
                        }
                    }, 350);
                } else {
                    // No coinciden → voltear de regreso
                    sfxWrong();
                    setTimeout(()=>{
                        a.el.classList.remove('flipped');
                        b.el.classList.remove('flipped');
                        flipped=[]; canFlip=true;
                    }, 800);
                }
            }
        }

        // ── POPUP DATO + acumular abajo ────────────────────────────
        function showFact(card, isTarget, afterClose){
            pauseTimer();
            canFlip = false;

            const old = root.querySelector('.pk-popup');
            if(old) old.remove();

            const tag = isTarget
                ? `<span class="pk-popup-tag correct">✅ ¡En tu lista!</span>`
                : `<span class="pk-popup-tag wrong">📦 Dato encontrado</span>`;

            const popup = document.createElement('div');
            popup.className = 'pk-popup';
            popup.innerHTML = `
              ${tag}
              <div class="pk-popup-body"><b>${card.emoji} ${card.name}:</b> ${card.fact}</div>
              <div style="display:flex;justify-content:center;margin-top:8px;">
                <button class="pk-popup-close">✕</button>
              </div>`;

            const gameArea = $('pk-game');
            if(gameArea) gameArea.appendChild(popup);

            popup.querySelector('.pk-popup-close').addEventListener('click', ()=>{
                popup.remove();
                const factEl = $('pk-fact');
                if(factEl){
                    const line = document.createElement('div');
                    line.className = 'pk-fact-line';
                    line.innerHTML = `<b>${card.emoji} ${card.name}:</b> ${card.fact}`;
                    factEl.appendChild(line);
                    factEl.scrollTop = factEl.scrollHeight;
                }
                canFlip = true;
                if(afterClose) afterClose();
                else resumeTimer();
            });
        }

        // ── HUD ────────────────────────────────────────────────────
        function updateHud(){
            const fc=$('pk-found-count'); if(fc) fc.textContent=foundCount;
        }

        // ── TIMER ──────────────────────────────────────────────────
        function tickTimer(){
            const fill=$('pk-timer-fill'), num=$('pk-timer-num');
            timeLeft--;
            if(num) num.textContent=timeLeft;
            if(fill){
                const pct=timeLeft/TIME_LIMIT*100;
                fill.style.width=pct+'%';
                fill.style.background = pct>50
                    ? 'linear-gradient(90deg,#2ecc71,#f1c40f)'
                    : pct>25
                        ? 'linear-gradient(90deg,#f1c40f,#e67e22)'
                        : 'linear-gradient(90deg,#e74c3c,#c0392b)';
            }
            if(timeLeft<=0){ clearInterval(timerInterval); gameOver(); }
        }

        function startTimer(){
            const fill=$('pk-timer-fill'), num=$('pk-timer-num');
            clearInterval(timerInterval);
            if(num) num.textContent=timeLeft;
            if(fill) fill.style.width='100%';
            timerInterval=setInterval(tickTimer, 1000);
        }

        function pauseTimer(){ clearInterval(timerInterval); timerInterval=null; }
        function resumeTimer(){ if(!timerInterval) timerInterval=setInterval(tickTimer,1000); }
        function stopTimer(){ clearInterval(timerInterval); timerInterval=null; }

        // ── FIN DE JUEGO ───────────────────────────────────────────
        function gameOver(){
            showScreen('pk-gameover');
            const gf=$('pk-go-found'); if(gf) gf.textContent=foundCount;
            const gp=$('pk-go-pend'); if(gp) gp.textContent=TARGET_COUNT-foundCount;
        }

        function winGame(){
            sfxWin();
            showScreen('pk-win');
            const wt=$('pk-win-time'); if(wt) wt.textContent=timeLeft+'s';
            const wb=$('pk-win-badge');
            if(wb) wb.textContent = timeLeft>=40 ? '⚡ Élite' : timeLeft>=20 ? '🥅 Pro' : '🎒 Rookie';
        }

        // ── EVENTOS ────────────────────────────────────────────────
        const bs=$('pk-btn-start');  if(bs)  bs.addEventListener('click', startGame);
        const br=$('pk-btn-retry');  if(br)  br.addEventListener('click', startGame);
        const bw=$('pk-btn-replay'); if(bw)  bw.addEventListener('click', startGame);

        showScreen('pk-start');
    })();

    return {
        cleanup: function(){
            clearInterval(undefined);
            if (pkAudioCtx){ try{ pkAudioCtx.close(); }catch(e){} pkAudioCtx=null; }
            vfx.innerHTML='';
            vfx.style.pointerEvents='none';
            _persData.forEach(({ el, parent, next }) => {
                if (el) { el.style.zIndex = ''; el.style.position = ''; if (parent) parent.insertBefore(el, next); }
            });
            if (elNinaPaq) { elNinaPaq.style.zIndex = ''; elNinaPaq.style.position = ''; }
        }
    };
}

// ============================================================
//  HISTORIA DEL MURAL — 3 SECCIONES CON AUDIO INDEPENDIENTE
// ============================================================
function abrirHistoriaMural() {
  if (document.getElementById('modal-historia')) return;
  pausarAudio();

  // Mural visible pero no interactivo
  const muralCont = document.getElementById('mural-container');
  muralCont.style.pointerEvents = 'none';
  document.querySelectorAll('.zona').forEach(z => z.style.pointerEvents = 'none');

  // ── Config secciones ────────────────────────────────────────
  const SECS = [
    { key:'pasado',   label:'PASADO',   sub:'1971 · Las Pioneras',        fill:'rgba(80,20,120,0.78)',  border:'#ce93d8', audio:'assets/pasado.mp3',   flex:1.26 },
    { key:'conexion', label:'CONEXIÓN', sub:'El hilo que nos une',         fill:'rgba(20,60,120,0.78)', border:'#90caf9', audio:'assets/conexion.mp3', flex:0.62 },
    { key:'presente', label:'PRESENTE', sub:'2026 · Herederas del sueño',  fill:'rgba(20,100,60,0.78)', border:'#a5d6a7', audio:'assets/presente.mp3', flex:1.23 },
    { key:'nina',     label:'FUTURO',   sub:'La mirada al futuro',         fill:'rgba(251,201,255,0.78)', border:'#fbc9ff', audio:'assets/nina.mp3',     flex:0.39 },
  ];

  // Obtener posición exacta del mural
  const muralEl  = document.getElementById('mural-container');
  const muralRect = muralEl.getBoundingClientRect();

  const modal = document.createElement('div');
  modal.id = 'modal-historia';
  modal.style.cssText = `position:fixed;inset:0;z-index:600;pointer-events:none;`;

  // Inyectar keyframe parpadeo si no existe
  if (!document.getElementById('hm-kf')) {
    const st = document.createElement('style'); st.id='hm-kf';
    st.textContent = `
      @keyframes hmPulse {
        0%,100%{ opacity:1; box-shadow:0 0 18px var(--hm-c),0 0 36px var(--hm-c); }
        50%    { opacity:.55; box-shadow:0 0 6px var(--hm-c); }
      }
      @keyframes hmBtnPulse {
        0%,100%{ transform:scale(1);   box-shadow:0 0 14px var(--hm-c),0 0 28px var(--hm-c); }
        50%    { transform:scale(1.08); box-shadow:0 0 6px var(--hm-c); }
      }
    `;
    document.head.appendChild(st);
  }

  // Botón cerrar (siempre visible arriba)
  const btnClose = document.createElement('button');
  btnClose.innerHTML = '✕';
  btnClose.style.cssText = `position:absolute;top:clamp(6px,1.5%,12px);right:clamp(6px,1.5%,12px);
    z-index:10;width:clamp(28px,4vw,38px);height:clamp(28px,4vw,38px);border-radius:50%;
    border:none;background:#e94560;color:#fff;font-size:.9rem;font-weight:bold;
    cursor:pointer;pointer-events:auto;box-shadow:0 0 10px rgba(233,69,96,.6);`;
  modal.appendChild(btnClose);

  // ── Botón X2 velocidad ──────────────────────────────────────
  const btnX2 = document.createElement('button');
  const x2Size = `clamp(22px,3.2vw,30px)`; // 20% más pequeño que créditos
  btnX2.style.cssText = `
    position:fixed;
    left:${muralRect.left + muralRect.width * 0.005}px;
    bottom:${window.innerHeight - muralRect.bottom + muralRect.height * 0.08 + muralRect.width * 0.055 * 0.11}px;
    width:${muralRect.width * 0.055}px;height:${muralRect.width * 0.055}px;
    border-radius:50%;border:2px solid rgba(255,255,255,.6);
    background:#ce93d8;color:#fff;
    font-size:clamp(6px,0.9vw,10px);font-weight:bold;font-family:'Courier New',monospace;
    cursor:pointer;pointer-events:auto;z-index:10;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:1px;line-height:1;touch-action:manipulation;
    transition:background .15s, transform .1s;user-select:none;`;
  btnX2.innerHTML = `<span>AUDIO</span><span style="font-size:1.3em">×2</span>`;

  let x2Color = '#ce93d8';
  function x2On()  { if(audioActual){ audioActual.playbackRate=1.8; btnX2.style.transform='scale(0.93)'; btnX2.style.filter='brightness(1.3)'; } }
  function x2Off() { if(audioActual){ audioActual.playbackRate=1; btnX2.style.transform='scale(1)';    btnX2.style.filter=''; } }

  btnX2.addEventListener('mousedown',   x2On);
  btnX2.addEventListener('touchstart',  x2On,  { passive:true });
  btnX2.addEventListener('mouseup',     x2Off);
  btnX2.addEventListener('mouseleave',  x2Off);
  btnX2.addEventListener('touchend',    x2Off);
  btnX2.addEventListener('touchcancel', x2Off);
  modal.appendChild(btnX2);

  // Función para actualizar color del botón X2 según sección activa
  function actualizarColorX2(color) {
    x2Color = color;
    btnX2.style.background  = color;
    btnX2.style.borderColor = 'rgba(255,255,255,.6)';
    btnX2.style.color       = '#fff';
  }

  // ── Capas + botones ─────────────────────────────────────────
  const capasWrap = document.createElement('div');
  capasWrap.style.cssText = `
    position:fixed;
    left:${muralRect.left}px;
    top:${muralRect.top}px;
    width:${muralRect.width}px;
    height:${muralRect.height}px;
    display:flex;overflow:hidden;`;

  let audioActual = null;
  let estadoSecs  = { pasado:false, conexion:false, presente:false };

  SECS.forEach((sec, idx) => {
    const total = SECS.reduce((a,s) => a+s.flex, 0);
    const pct   = (sec.flex / total * 100).toFixed(2);

    const capa = document.createElement('div');
    capa.id = 'hm-'+sec.key;
    capa.style.cssText = `width:${pct}%;height:100%;position:relative;overflow:hidden;
      --hm-c:${sec.border};
      background:${sec.fill};
      border:2px solid transparent;
      display:flex;align-items:center;justify-content:center;
      transition:background 0.6s ease, border-color 0.6s ease;
      pointer-events:none;`;

    // Botón central
    const btn = document.createElement('button');
    btn.id = 'hm-btn-'+sec.key;
    btn.style.cssText = `
      position:relative;z-index:2;
      --hm-c:${sec.border};
      background:transparent;border:2px solid ${sec.border};color:${sec.border};
      border-radius:10px;padding:clamp(8px,1.8vh,14px) clamp(8px,2vw,16px);
      cursor:pointer;pointer-events:auto;
      display:flex;flex-direction:column;align-items:center;gap:4px;
      touch-action:manipulation;opacity:0;pointer-events:none;transition:opacity .3s;`;
    btn.innerHTML = `
      <span style="font-size:clamp(.7rem,2vw,1rem);font-weight:900;letter-spacing:2px;">${sec.label}</span>
      <span style="font-size:clamp(.45rem,1.1vw,.65rem);opacity:.7;">${sec.sub}</span>`;
    capa.appendChild(btn);

    // Reproductor inferior
    const player = document.createElement('div');
    player.id = 'hm-player-'+sec.key;
    player.style.cssText = `position:absolute;bottom:0;left:0;right:0;
      background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);
      padding:4px 8px 5px;display:none;flex-direction:column;gap:2px;pointer-events:auto;`;

    const progTrack = document.createElement('div');
    progTrack.style.cssText = `height:4px;background:rgba(255,255,255,.2);border-radius:4px;
      overflow:hidden;cursor:pointer;`;
    const progFill = document.createElement('div');
    progFill.style.cssText = `height:100%;width:0%;background:${sec.border};
      border-radius:4px;transition:width .25s linear;`;
    progTrack.appendChild(progFill);

    const timeRow = document.createElement('div');
    timeRow.style.cssText = `display:flex;justify-content:space-between;
      font-size:clamp(.45rem,1vw,.6rem);color:rgba(255,255,255,.7);font-family:monospace;`;
    timeRow.innerHTML = `<span id="hm-cur-${sec.key}">0:00</span><span id="hm-dur-${sec.key}">0:00</span>`;

    player.appendChild(progTrack);
    player.appendChild(timeRow);
    capa.appendChild(player);
    capasWrap.appendChild(capa);

    function fmt(s){ return Math.floor(s/60)+':'+(Math.floor(s%60)+'').padStart(2,'0'); }

    // Click en botón
    btn.addEventListener('click', () => {
      if (estadoSecs[sec.key]) return;
      estadoSecs[sec.key] = true;

      // Parar audio anterior
      if (audioActual) { audioActual.pause(); audioActual.src=''; }

      // Quitar relleno — solo contorno
      capa.style.background   = 'transparent';
      capa.style.borderColor  = sec.border;
      btn.style.animation     = 'none';
      btn.style.opacity       = '0';
      btn.style.pointerEvents = 'none';
      capa.style.animation    = 'none';

      // Mostrar reproductor
      player.style.display = 'flex';

      // Actualizar color botón X2
      actualizarColorX2(sec.border);

      // Reproducir audio
      audioActual = new Audio(sec.audio);

      audioActual.addEventListener('loadedmetadata', () => {
        document.getElementById('hm-dur-'+sec.key).textContent = fmt(audioActual.duration);
      });
      audioActual.addEventListener('timeupdate', () => {
        const dur = audioActual.duration||0, cur = audioActual.currentTime;
        progFill.style.width = (dur ? cur/dur*100 : 0)+'%';
        document.getElementById('hm-cur-'+sec.key).textContent = fmt(cur);
      });
      progTrack.addEventListener('click', e => {
        if (!audioActual.duration) return;
        const r = progTrack.getBoundingClientRect();
        audioActual.currentTime = ((e.clientX-r.left)/r.width)*audioActual.duration;
      });

      // Si es CONEXIÓN → rayo verde sincronizado + balón girando
      if (sec.key === 'conexion') {
        balon.classList.add('girando');
        grietaVerde.style.transition = 'none';
        grietaVerde.style.opacity    = '1';
        grietaVerde.style.clipPath   = 'inset(50% 0% 50% 0%)';
        grietaVerde.classList.remove('ocultar','cargando');
        void grietaVerde.offsetWidth;

        // Sincronizar clipPath con progreso del audio
        audioActual.addEventListener('timeupdate', () => {
          const dur = audioActual.duration || 1;
          const t   = audioActual.currentTime / dur; // 0→1
          const half = ((1 - t) * 50).toFixed(2);
          grietaVerde.style.clipPath = `inset(${half}% 0% ${half}% 0%)`;
        });

        audioActual.addEventListener('ended', () => {
          balon.classList.remove('girando');
          grietaVerde.style.transition = '';
          grietaVerde.classList.add('ocultar');
          setTimeout(() => {
            grietaVerde.classList.remove('ocultar');
            grietaVerde.style.clipPath = 'inset(50% 0% 50% 0%)';
            grietaVerde.style.opacity  = '0';
          }, 400);
        }, { once: true });
      }

      audioActual.play().catch(()=>{});
      if (idx + 1 < SECS.length) {
        audioActual.addEventListener('ended', () => activarBtn(idx + 1), { once: true });
      } else {
        // Última sección (FUTURO) terminó → restablecer todo
        audioActual.addEventListener('ended', () => {
          estadoSecs = { pasado:false, conexion:false, presente:false, nina:false };
          SECS.forEach(s => {
            const c = document.getElementById('hm-'+s.key);
            const b = document.getElementById('hm-btn-'+s.key);
            const p = document.getElementById('hm-player-'+s.key);
            if (c) { c.style.background = s.fill; c.style.borderColor = 'transparent'; c.style.animation = ''; }
            if (b) { b.style.opacity = '0'; b.style.pointerEvents = 'none'; b.style.animation = 'none'; }
            if (p) { p.style.display = 'none'; }
          });
          actualizarColorX2(SECS[0].border);
          setTimeout(() => activarBtn(0), 600);
        }, { once: true });
      }
    });
  });

  modal.appendChild(capasWrap);
  document.body.appendChild(modal);

  // ── Activar botón de sección ─────────────────────────────────
  function activarBtn(idx) {
    const sec = SECS[idx];
    const capa = document.getElementById('hm-'+sec.key);
    const btn  = document.getElementById('hm-btn-'+sec.key);
    if (!btn || estadoSecs[sec.key]) return;
    capa.style.pointerEvents = 'auto';
    btn.style.opacity        = '1';
    btn.style.pointerEvents  = 'auto';
    btn.style.animation      = 'hmBtnPulse 1.1s ease-in-out infinite';
    // Parpadeo del relleno
    capa.style.animation     = 'hmPulse 1.1s ease-in-out infinite';
  }

  // Al inicio solo PASADO está activo
  activarBtn(0);

  // Al abrir: glow verde+blanco en el botón historia
  const glowHist = document.getElementById('glow-historia');
  // (el CSS ya tiene glowHistoria verde — no hay que cambiar nada al abrir)

  // Cerrar
  function cerrar() {
    if (audioActual) { audioActual.pause(); audioActual.src=''; }
    modal.remove();
    muralCont.style.pointerEvents = '';
    document.querySelectorAll('.zona').forEach(z => z.style.pointerEvents = '');
    // Revertir glow historia a morado+blanco
    if (glowHist) {
        glowHist.style.setProperty('animation', 'glowHistoriaOrig 8s ease-in-out infinite', 'important');
    }
    audioIniciado = true;
    ambAudio.currentTime = 0;
    ambAudio.play().catch(() => {});
  }
  btnClose.addEventListener('click', cerrar);
}

// ============================================================
//  MODAL DE VIDEO POR PERSONAJE
// ============================================================
function abrirVideoModal(src, nombre) {
  if (document.getElementById('modal-video')) return;

  pausarAudio();
  audioIniciado = false;

  const muralEl = document.getElementById('mural-container');
  const rect    = muralEl ? muralEl.getBoundingClientRect() : { left:0, top:0, width:window.innerWidth, height:window.innerHeight };

  // Contenedor anclado al mural
  const modal = document.createElement('div');
  modal.id = 'modal-video';
  modal.style.cssText = `
    position:fixed;
    left:${rect.left}px;top:${rect.top}px;
    width:${rect.width}px;height:${rect.height}px;
    z-index:600;display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    background:rgba(0,0,0,0.82);`;

  // Botón cerrar
  const btnClose = document.createElement('button');
  btnClose.textContent = '✕';
  btnClose.style.cssText = `position:absolute;top:10px;right:10px;
    z-index:10;width:36px;height:36px;border-radius:50%;border:none;
    background:#e94560;color:#fff;font-size:1.1rem;font-weight:bold;cursor:pointer;
    box-shadow:0 0 12px rgba(233,69,96,.6);touch-action:manipulation;`;
  btnClose.onclick = cerrarVideoModal;
  modal.appendChild(btnClose);

  // Caja de video — ocupa el ancho del contenedor con margen
  const videoWrap = document.createElement('div');
  const vw = Math.round(rect.width * 0.92);
  const vh = Math.round(rect.height * 0.88);
  // mantener proporción 16:9 sin salirse del contenedor
  const wByH = Math.round(vh * 16 / 9);
  const finalW = Math.min(vw, wByH);
  videoWrap.style.cssText = `position:relative;width:${finalW}px;
    border-radius:10px;overflow:hidden;
    box-shadow:0 0 32px rgba(160,0,255,.4),0 6px 24px rgba(0,0,0,.7);`;

  const video = document.createElement('video');
  video.src = src;
  video.style.cssText = `width:100%;height:auto;display:block;border-radius:10px;`;
  video.autoplay   = true;
  video.controls   = true;
  video.playsInline = true;
  video.loop       = false;
  // Al terminar NO se cierra — el usuario presiona ✕

  videoWrap.appendChild(video);
  modal.appendChild(videoWrap);

  // Nombre del personaje
  const label = document.createElement('div');
  label.style.cssText = `color:rgba(255,255,255,.55);font-size:clamp(.6rem,1.5vw,.82rem);
    margin-top:8px;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;`;
  label.textContent = nombre;
  modal.appendChild(label);

  document.body.appendChild(modal);
  modal._video = video;

  // Reposicionar si la ventana cambia de tamaño
  function onResize() {
    const r = muralEl ? muralEl.getBoundingClientRect() : { left:0, top:0, width:window.innerWidth, height:window.innerHeight };
    modal.style.left   = r.left + 'px';
    modal.style.top    = r.top  + 'px';
    modal.style.width  = r.width  + 'px';
    modal.style.height = r.height + 'px';
    const vw2 = Math.round(r.width * 0.92);
    const vh2 = Math.round(r.height * 0.88);
    videoWrap.style.width = Math.min(vw2, Math.round(vh2 * 16 / 9)) + 'px';
  }
  window.addEventListener('resize', onResize);
  modal._onResize = onResize;
}

function cerrarVideoModal() {
  const modal = document.getElementById('modal-video');
  if (!modal) return;
  const v = modal._video;
  if (v) { v.pause(); v.src = ''; }
  if (modal._onResize) window.removeEventListener('resize', modal._onResize);
  modal.remove();
  audioIniciado = true;
  ambAudio.currentTime = 0;
  ambAudio.play().catch(() => {});
}

// ============================================================
//  CARRUSEL 3D JUGADORAS 1971 — ESTILO PANINI
// ============================================================
const _audioJugadoras = new Audio('assets/jugadoras.mp3');
_audioJugadoras.loop = false;
_audioJugadoras.volume = 0.359;

function abrirCarruselJugadoras() {
  if (document.getElementById('modal-jugadoras')) return;
  ambAudio.pause();
  audioIniciado = false;
  _audioJugadoras.currentTime = 0;
  _audioJugadoras.play().catch(() => {});

  // Assets compartidos para todas las cartas
  const TOTAL_CARDS = 16;
  const CARDS = Array.from({length: TOTAL_CARDS}, (_, i) => ({
    base:   'assets/jugadora-1-base.png',
    main:   'assets/jugadora-1.png',
    frente: 'assets/jugadora-1-frente.png',
    top:    `assets/jugadora-${i+1}-top.png`,
  }));

  // Color por carta en la capa base (hue-rotate + tinte de color)
  const BASE_COLORS = [
    { hue: 0,   tint: 'rgba(255,180,0,0.18)'   },  // 0  dorado
    { hue: 200, tint: 'rgba(0,180,255,0.18)'   },  // 1  azul
    { hue: 290, tint: 'rgba(180,0,255,0.18)'   },  // 2  morado
    { hue: 120, tint: 'rgba(0,220,80,0.18)'    },  // 3  verde
    { hue: 330, tint: 'rgba(255,0,120,0.18)'   },  // 4  rosa
    { hue: 20,  tint: 'rgba(255,100,0,0.18)'   },  // 5  naranja
    { hue: 170, tint: 'rgba(0,220,200,0.18)'   },  // 6  teal
    { hue: 60,  tint: 'rgba(220,220,0,0.18)'   },  // 7  amarillo
    { hue: 250, tint: 'rgba(80,80,255,0.18)'   },  // 8  índigo
    { hue: 350, tint: 'rgba(255,60,60,0.18)'   },  // 9  rojo
    { hue: 145, tint: 'rgba(0,200,120,0.18)'   },  // 10 esmeralda
    { hue: 310, tint: 'rgba(220,0,180,0.18)'   },  // 11 fucsia
    { hue: 35,  tint: 'rgba(255,140,0,0.18)'   },  // 12 ámbar
    { hue: 185, tint: 'rgba(0,200,220,0.18)'   },  // 13 celeste
    { hue: 265, tint: 'rgba(120,0,255,0.18)'   },  // 14 violeta
    { hue: 5,   tint: 'rgba(255,80,40,0.18)'   },  // 15 carmesí
  ];

  // ── Efectos holográficos únicos por carta (capa main) ──────────
  const HOLO_STYLES = [
    // 0  prism-flow — flujo prismático arcoíris fluido
    { grad:`linear-gradient(115deg,transparent 0%,rgba(255,0,128,.30) 12%,rgba(255,165,0,.26) 24%,rgba(255,255,0,.24) 34%,rgba(0,255,128,.26) 46%,rgba(0,200,255,.30) 56%,rgba(100,0,255,.26) 66%,rgba(255,0,200,.24) 76%,transparent 100%)`, dur:'3.5s', blend:'screen', size:'300% 300%' },
    // 1  crystal-cast — destello de cristal azul-blanco
    { grad:`linear-gradient(90deg,transparent 0%,rgba(200,240,255,.15) 20%,rgba(255,255,255,.65) 40%,rgba(180,230,255,.60) 50%,rgba(255,255,255,.60) 60%,rgba(180,220,255,.15) 80%,transparent 100%)`, dur:'2.2s', blend:'overlay', size:'200% 100%' },
    // 2  diamond-gleam — destello de diamante blanco puro
    { grad:`linear-gradient(135deg,transparent 0%,rgba(255,255,255,.08) 25%,rgba(255,255,255,.82) 45%,rgba(240,248,255,.88) 50%,rgba(255,255,255,.82) 55%,rgba(255,255,255,.08) 75%,transparent 100%)`, dur:'1.8s', blend:'overlay', size:'200% 200%' },
    // 3  aurora-glaze — glaseado de aurora boreal
    { grad:`linear-gradient(160deg,transparent 0%,rgba(0,255,120,.22) 15%,rgba(0,200,255,.40) 30%,rgba(100,0,255,.35) 50%,rgba(0,180,200,.40) 70%,rgba(0,255,100,.22) 85%,transparent 100%)`, dur:'4.0s', blend:'screen', size:'300% 300%' },
    // 4  opal-glow — resplandor de ópalo suave
    { grad:`radial-gradient(ellipse at 50% 50%,rgba(255,200,240,.45) 0%,rgba(200,255,240,.40) 25%,rgba(200,220,255,.40) 50%,rgba(255,240,200,.40) 75%,transparent 100%)`, dur:'3.0s', blend:'screen', size:'200% 200%' },
    // 5  cyber-glitch — fallo cibernético cian/magenta
    { grad:`linear-gradient(90deg,transparent 0%,rgba(0,255,255,.08) 15%,rgba(255,0,255,.55) 30%,rgba(0,255,255,.65) 45%,rgba(255,0,255,.55) 60%,rgba(0,255,255,.08) 85%,transparent 100%)`, dur:'1.2s', blend:'screen', size:'400% 100%' },
    // 6  plasma-wave — onda de plasma azul/morado
    { grad:`linear-gradient(80deg,transparent 0%,rgba(60,0,255,.20) 10%,rgba(0,100,255,.50) 28%,rgba(180,0,255,.55) 50%,rgba(0,80,255,.50) 72%,rgba(40,0,200,.20) 90%,transparent 100%)`, dur:'2.0s', blend:'screen', size:'300% 300%' },
    // 7  foil-burn — quemado de lámina dorada/cobre
    { grad:`linear-gradient(100deg,transparent 0%,rgba(180,80,0,.20) 10%,rgba(255,160,0,.55) 28%,rgba(255,220,100,.72) 50%,rgba(255,140,0,.55) 72%,rgba(160,60,0,.20) 90%,transparent 100%)`, dur:'2.5s', blend:'overlay', size:'200% 100%' },
    // 8  oil-slick-gradient — gradiente de mancha de aceite iridiscente
    { grad:`linear-gradient(120deg,rgba(255,0,0,.18) 0%,rgba(255,100,0,.20) 14%,rgba(255,255,0,.18) 28%,rgba(0,255,100,.18) 42%,rgba(0,100,255,.20) 56%,rgba(100,0,255,.20) 70%,rgba(255,0,200,.18) 84%,rgba(255,0,0,.18) 100%)`, dur:'5.0s', blend:'color-dodge', size:'400% 400%' },
    // 9  nebula-shimmer — brillo de nebulosa profunda
    { grad:`radial-gradient(ellipse at 30% 40%,rgba(200,0,255,.50) 0%,rgba(0,50,255,.40) 35%,rgba(255,0,150,.35) 65%,transparent 90%)`, dur:'3.8s', blend:'screen', size:'200% 200%' },
    // 10 quartz-shimmer — parpadeo de cuarzo blanco-rosa
    { grad:`linear-gradient(105deg,transparent 0%,rgba(255,220,240,.15) 18%,rgba(255,255,255,.72) 36%,rgba(255,200,230,.80) 50%,rgba(255,255,255,.72) 64%,rgba(240,200,220,.15) 82%,transparent 100%)`, dur:'2.4s', blend:'overlay', size:'200% 200%' },
    // 11 iridescent-pulse — pulso iridiscente cíclico
    { grad:`conic-gradient(from 0deg at 50% 50%,rgba(255,0,128,.28),rgba(255,200,0,.28),rgba(0,255,128,.28),rgba(0,100,255,.28),rgba(200,0,255,.28),rgba(255,0,128,.28))`, dur:'4.5s', blend:'screen', size:'150% 150%' },
    // 12 mineral-shine — brillo mineral verde-dorado
    { grad:`linear-gradient(145deg,transparent 0%,rgba(100,200,0,.18) 12%,rgba(200,220,0,.50) 28%,rgba(255,240,100,.65) 45%,rgba(180,210,0,.50) 62%,rgba(80,160,0,.18) 78%,transparent 100%)`, dur:'3.1s', blend:'color-dodge', size:'300% 300%' },
    // 13 spectral-mist — niebla espectral suave
    { grad:`radial-gradient(ellipse at 60% 30%,rgba(180,255,240,.40) 0%,rgba(255,180,255,.35) 30%,rgba(180,200,255,.35) 60%,transparent 85%)`, dur:'5.0s', blend:'screen', size:'200% 200%' },
    // 14 synth-sheen — brillo sintético neón verde
    { grad:`linear-gradient(70deg,transparent 0%,rgba(0,255,80,.12) 10%,rgba(100,255,150,.58) 28%,rgba(200,255,200,.70) 50%,rgba(80,255,120,.58) 72%,rgba(0,200,60,.12) 90%,transparent 100%)`, dur:'1.9s', blend:'screen', size:'300% 100%' },
    // 15 glass-spectra — espectro de cristal multiángulo
    { grad:`linear-gradient(45deg,transparent 0%,rgba(255,100,200,.20) 10%,rgba(100,200,255,.45) 25%,rgba(255,255,100,.50) 40%,rgba(100,255,200,.45) 55%,rgba(200,100,255,.45) 70%,rgba(255,180,100,.20) 85%,transparent 100%)`, dur:'3.3s', blend:'screen', size:'300% 300%' },
  ];

  // ── Efectos prismáticos únicos por carta (capa top / beam) ──────
  const PRISM_CONFIGS = [
    // 0  rainbow-refract — refracción arcoíris completa
    { beam:`linear-gradient(90deg,transparent 0%,rgba(255,0,0,.20) 14%,rgba(255,255,0,.35) 28%,rgba(0,255,80,.35) 42%,rgba(0,200,255,.35) 56%,rgba(150,0,255,.35) 72%,rgba(255,0,200,.20) 88%,transparent 100%)`, dur:'4.0s', width:'48%' },
    // 1  laser-trace — trazo láser rojo/rosa fino
    { beam:`linear-gradient(90deg,transparent 0%,rgba(255,0,80,.08) 25%,rgba(255,50,100,.92) 48%,rgba(255,200,210,.98) 50%,rgba(255,50,100,.92) 52%,rgba(255,0,80,.08) 75%,transparent 100%)`, dur:'1.8s', width:'18%' },
    // 2  neon-flicker — parpadeo neón cian
    { beam:`linear-gradient(90deg,transparent 0%,rgba(0,255,255,.12) 20%,rgba(0,255,255,.88) 44%,rgba(255,255,255,.98) 50%,rgba(0,255,255,.88) 56%,rgba(0,255,255,.12) 80%,transparent 100%)`, dur:'1.4s', width:'22%' },
    // 3  chrome-shift — cambio cromático plateado
    { beam:`linear-gradient(90deg,transparent 0%,rgba(180,185,200,.15) 14%,rgba(240,242,255,.78) 34%,rgba(255,255,255,.92) 50%,rgba(225,228,255,.78) 66%,rgba(160,165,185,.15) 86%,transparent 100%)`, dur:'3.2s', width:'42%' },
    // 4  liquid-mercury — mercurio líquido plateado fluido
    { beam:`linear-gradient(90deg,transparent 0%,rgba(140,148,165,.18) 10%,rgba(200,208,228,.68) 30%,rgba(235,238,255,.88) 50%,rgba(200,208,228,.68) 70%,rgba(130,138,158,.18) 90%,transparent 100%)`, dur:'2.8s', width:'36%' },
    // 5  cosmic-dust — polvo cósmico morado/azul
    { beam:`linear-gradient(170deg,transparent 0%,rgba(80,30,200,.15) 18%,rgba(180,120,255,.52) 38%,rgba(255,255,255,.58) 50%,rgba(120,180,255,.52) 62%,transparent 82%)`, dur:'3.6s', width:'32%' },
    // 6  solar-flare — llamarada solar amarillo/naranja
    { beam:`linear-gradient(90deg,transparent 0%,rgba(255,120,0,.15) 10%,rgba(255,210,0,.62) 28%,rgba(255,255,200,.92) 50%,rgba(255,210,0,.62) 72%,rgba(255,100,0,.15) 90%,transparent 100%)`, dur:'2.0s', width:'52%' },
    // 7  ether-glow — resplandor del éter lila suave
    { beam:`linear-gradient(90deg,transparent 0%,rgba(180,80,220,.14) 18%,rgba(210,130,255,.58) 36%,rgba(255,210,255,.72) 50%,rgba(200,130,255,.58) 64%,rgba(160,70,210,.14) 82%,transparent 100%)`, dur:'4.8s', width:'40%' },
    // 8  phantom-prism — prisma fantasma azul hielo
    { beam:`linear-gradient(90deg,transparent 0%,rgba(190,215,255,.07) 14%,rgba(215,235,255,.62) 34%,rgba(255,255,255,.72) 50%,rgba(185,218,255,.62) 66%,rgba(155,198,255,.07) 86%,transparent 100%)`, dur:'5.5s', width:'44%' },
    // 9  twilight-spark — chispa de crepúsculo naranja/rosa
    { beam:`linear-gradient(90deg,transparent 0%,rgba(255,80,0,.16) 10%,rgba(255,155,50,.58) 26%,rgba(255,210,155,.72) 44%,rgba(255,100,200,.68) 62%,rgba(190,45,190,.42) 80%,transparent 100%)`, dur:'3.0s', width:'46%' },
    // 10 beam-radiance — radiancia de rayo blanco puro
    { beam:`linear-gradient(90deg,transparent 0%,rgba(255,255,255,.05) 10%,rgba(255,255,255,.95) 48%,rgba(255,255,255,1) 50%,rgba(255,255,255,.95) 52%,rgba(255,255,255,.05) 90%,transparent 100%)`, dur:'2.5s', width:'14%' },
    // 11 vector-projection — proyección vectorial verde neón
    { beam:`linear-gradient(90deg,transparent 0%,rgba(0,255,80,.10) 18%,rgba(0,255,100,.82) 44%,rgba(200,255,200,.95) 50%,rgba(0,255,100,.82) 56%,rgba(0,200,60,.10) 82%,transparent 100%)`, dur:'1.6s', width:'20%' },
    // 12 aurora-glaze beam — aurora multicolor ondulante
    { beam:`linear-gradient(90deg,transparent 0%,rgba(0,255,120,.22) 14%,rgba(0,200,255,.50) 28%,rgba(150,0,255,.50) 42%,rgba(0,255,180,.50) 56%,rgba(255,200,0,.40) 72%,rgba(255,0,100,.22) 86%,transparent 100%)`, dur:'4.2s', width:'55%' },
    // 13 digital-ghost — fantasma digital azul hielo parpadeante
    { beam:`linear-gradient(90deg,transparent 0%,rgba(100,200,255,.08) 20%,rgba(180,230,255,.70) 42%,rgba(220,245,255,.85) 50%,rgba(170,225,255,.70) 58%,rgba(90,190,255,.08) 80%,transparent 100%)`, dur:'6.0s', width:'38%' },
    // 14 magma-chrome — cromo de magma rojo/plateado
    { beam:`linear-gradient(90deg,transparent 0%,rgba(200,50,0,.18) 10%,rgba(255,120,50,.60) 26%,rgba(255,220,200,.85) 50%,rgba(255,100,40,.60) 74%,rgba(180,40,0,.18) 90%,transparent 100%)`, dur:'2.2s', width:'40%' },
    // 15 acid-wash-holo — lavado ácido holográfico verde/amarillo
    { beam:`linear-gradient(90deg,transparent 0%,rgba(150,255,0,.15) 12%,rgba(200,255,50,.60) 28%,rgba(255,255,100,.78) 50%,rgba(180,255,30,.60) 72%,rgba(120,220,0,.15) 88%,transparent 100%)`, dur:'2.8s', width:'44%' },
  ];

  // ── Paletas de glitter por carta (capa frente) ─────────────────
  const GLITTER_COLORS = [
    ['#ffffff','#ffd700','#fffacd'],  // 0  blanco/dorado
    ['#00ffff','#87ceeb','#e0f8ff'],  // 1  azul/cian
    ['#ffffff','#f0f0ff','#dcdcdc'],  // 2  blanco/plata
    ['#00ff80','#00ffcc','#afffd6'],  // 3  verde/teal
    ['#ff80bf','#ff69b4','#ffd0e8'],  // 4  rosa/magenta
    ['#ff9900','#ffcc00','#fff0a0'],  // 5  naranja/amarillo
    ['#00e5cc','#00ffff','#80fff0'],  // 6  teal/aqua
    ['#c0c0c0','#e8e8f0','#ffffff'],  // 7  plata/gris
    ['#bf80ff','#9b59b6','#e0c0ff'],  // 8  morado/violeta
    ['#ff4040','#ff8060','#ffb0a0'],  // 9  rojo/coral
    ['#00ff80','#80ffcc','#ffffff'],  // 10 esmeralda/blanco
    ['#ff00cc','#ff80ee','#ffccf5'],  // 11 fucsia/lila
    ['#ffaa00','#ffdd80','#fff5cc'],  // 12 ámbar/crema
    ['#00ccff','#80eeff','#ccf8ff'],  // 13 celeste/hielo
    ['#9900ff','#cc80ff','#eeccff'],  // 14 violeta/lavanda
    ['#ff3300','#ff9966','#ffddcc'],  // 15 carmesí/salmón
  ];
  const TOTAL = CARDS.length;

  const ANGLE_STEP = 360 / TOTAL;
  const CARD_W = Math.min(window.innerWidth * 0.13, 148);
  const CARD_H = CARD_W * 1.45;
  const RADIUS = 600;

  // Inyectar efectos por capa — una sola vez
  if (!document.getElementById('panini-holo-kf')) {
    const st = document.createElement('style');
    st.id = 'panini-holo-kf';
    st.textContent = `
      /* ── Capa 1: base — vignette dorada pulsante ── */
      @keyframes baseVignette {
        0%,100% { box-shadow: inset 0 0 22px 8px rgba(180,120,0,0.45); }
        50%     { box-shadow: inset 0 0 32px 14px rgba(220,160,0,0.60); }
      }
      .fx-base {
        position:absolute; inset:0; border-radius:inherit; pointer-events:none; z-index:1;
        box-shadow: inset 0 0 22px 8px rgba(180,120,0,0.45);
        animation: baseVignette 3s ease-in-out infinite;
      }

      /* ── Capa 2: imagen principal — shimmer holográfico arcoíris ── */
      @keyframes holoShift {
        0%   { background-position: 0% 0%;   }
        25%  { background-position: 100% 0%; }
        50%  { background-position: 100% 100%;}
        75%  { background-position: 0% 100%; }
        100% { background-position: 0% 0%;   }
      }
      .fx-holo {
        position:absolute; inset:0; border-radius:inherit; pointer-events:none; z-index:1;
        background: linear-gradient(115deg,
          transparent 0%,
          rgba(255,0,128,0.30) 12%, rgba(255,165,0,0.24) 22%,
          rgba(255,255,0,0.22) 32%, rgba(0,255,128,0.24) 44%,
          rgba(0,200,255,0.28) 54%, rgba(100,0,255,0.24) 64%,
          rgba(255,0,200,0.22) 74%, transparent 100%
        );
        background-size: 300% 300%;
        animation: holoShift 3.5s ease-in-out infinite;
        mix-blend-mode: screen;
        opacity: 0.6;
        transition: opacity 0.3s;
      }
      .fx-holo-cursor {
        position:absolute; inset:0; border-radius:inherit; pointer-events:none; z-index:2;
        background: radial-gradient(ellipse at var(--hx,50%) var(--hy,50%),
          rgba(255,255,255,0.60) 0%, rgba(255,255,255,0.06) 40%, transparent 65%);
        mix-blend-mode: overlay;
        opacity: 0;
        transition: opacity 0.2s;
      }
      .card-panini.is-front .fx-holo         { opacity: 0.85; animation-duration: 2.4s; }
      .card-panini.is-front .fx-holo-cursor  { opacity: 1; }

      /* ── Capa 3: frente — glitter / destellos aleatorios ── */
      @keyframes glitterA {
        0%,100% { opacity:0; transform:scale(0.5); }
        50%     { opacity:1; transform:scale(1.2); }
      }
      @keyframes glitterB {
        0%,100% { opacity:0.6; transform:scale(1); }
        50%     { opacity:0;   transform:scale(0.4); }
      }
      .fx-glitter {
        position:absolute; inset:0; border-radius:inherit; pointer-events:none; z-index:1;
        overflow:hidden;
      }
      .glitter-dot {
        position:absolute; border-radius:50%;
        background:radial-gradient(circle, #fff 0%, rgba(255,220,255,0.6) 50%, transparent 100%);
        animation: glitterA var(--dur,1.8s) ease-in-out infinite;
        animation-delay: var(--del,0s);
      }

      /* ── Capa 4: top — barrido de luz prismática ── */
      @keyframes prismSweep {
        0%   { transform: translateX(-120%) skewX(-18deg); opacity:0;   }
        10%  { opacity: 0.85; }
        45%  { opacity: 0.70; }
        55%  { opacity: 0;   }
        100% { transform: translateX(220%) skewX(-18deg); opacity:0;   }
      }
      .fx-prism {
        position:absolute; inset:0; border-radius:inherit; pointer-events:none; z-index:1;
        overflow:hidden;
      }
      .prism-beam {
        position:absolute; top:0; left:0; width:38%; height:100%;
        background: linear-gradient(90deg,
          transparent 0%,
          rgba(255,255,255,0.11) 20%,
          rgba(200,255,255,0.50) 40%,
          rgba(255,200,255,0.55) 50%,
          rgba(255,255,200,0.50) 60%,
          rgba(255,255,255,0.11) 80%,
          transparent 100%
        );
        animation: prismSweep 4s ease-in-out infinite;
        mix-blend-mode: screen;
      }
      .card-panini.is-front .prism-beam { animation-duration: 2.8s; }

      .card-panini { transform-style: preserve-3d; }
    `;
    document.head.appendChild(st);
  }

  const modal = document.createElement('div');
  modal.id = 'modal-jugadoras';
  modal.style.cssText = `position:fixed;inset:0;z-index:500;display:flex;flex-direction:column;
    align-items:center;justify-content:space-between;background:#000;
    padding:clamp(6px,1.5vh,14px) 0 clamp(6px,1.5vh,14px);`;

  const btnClose = document.createElement('button');
  btnClose.textContent = '✕';
  btnClose.style.cssText = `position:absolute;top:clamp(8px,2%,16px);right:clamp(8px,2%,16px);
    z-index:10;width:36px;height:36px;border-radius:50%;border:none;
    background:#e94560;color:#fff;font-size:1.1rem;font-weight:bold;cursor:pointer;`;
  btnClose.onclick = cerrarCarruselJugadoras;
  modal.appendChild(btnClose);

  const titulo = document.createElement('div');
  titulo.style.cssText = `color:#fff;font-size:clamp(.55rem,1.3vw,.75rem);font-weight:700;
    letter-spacing:2px;text-shadow:0 0 8px rgba(180,0,255,.7);text-align:center;z-index:3;`;
  titulo.textContent = '⚽ JUGADORAS 1971 · TORNEO FEMENIL AZTECA ⚽';
  modal.appendChild(titulo);

  // Hint de texto — TOCA / MANTEN / DESLIZA
  const hintText = document.createElement('div');
  hintText.style.cssText = `position:absolute;pointer-events:none;
    left:calc(50% - 24%);top:50%;
    transform:translate(-50%,-50%) translateZ(-26px);
    z-index:1;text-align:center;line-height:1.6;
    font-family:'Bebas Neue',sans-serif;
    font-size:clamp(0.7rem,1.8vw,1.1rem);
    letter-spacing:0.15em;
    color:rgba(255,255,255,0.90);
    filter:drop-shadow(0 0 6px rgba(255,255,255,1)) drop-shadow(0 0 14px rgba(180,220,255,1)) drop-shadow(0 0 28px rgba(140,180,255,0.85));`;
  hintText.innerHTML = `<div>TOCA</div><div>MANTÉN</div><div>DESLIZA</div>`;
  modal.appendChild(hintText);

  const scene = document.createElement('div');
  scene.style.cssText = `width:${CARD_W}px;height:${CARD_H}px;
    perspective:1200px;cursor:grab;position:relative;user-select:none;z-index:2;`;

  const cylinder = document.createElement('div');
  cylinder.style.cssText = `width:100%;height:100%;position:absolute;
    transform-style:preserve-3d;transition:transform .4s ease-out;`;

  for (let i = 0; i < TOTAL; i++) {
    const angle = i * ANGLE_STEP;
    const card = document.createElement('div');
    card.className = 'card-panini';
    card.dataset.idx = i;
    card.style.cssText = `position:absolute;width:${CARD_W}px;height:${CARD_H}px;
      left:0;top:0;border-radius:10px;
      transform:rotateY(${angle}deg) translateZ(${RADIUS}px);
      backface-visibility:visible;pointer-events:none;
      box-shadow:0 8px 24px rgba(0,0,0,.7);`;

    // ── Capa 1: base — color único por carta + vignette ──────────
    const bc = BASE_COLORS[i % BASE_COLORS.length];
    const wBase = document.createElement('div');
    wBase.style.cssText = `position:absolute;inset:0;z-index:0;border-radius:inherit;overflow:hidden;
      transform:translateZ(0px);`;
    const imgBase = document.createElement('img');
    imgBase.src = CARDS[i].base;
    imgBase.style.cssText = `width:100%;height:100%;object-fit:cover;display:block;
      filter:hue-rotate(${bc.hue}deg) saturate(1.3);`;
    imgBase.draggable = false;
    wBase.appendChild(imgBase);
    // Tinte de color encima
    const tintBase = document.createElement('div');
    tintBase.style.cssText = `position:absolute;inset:0;background:${bc.tint};pointer-events:none;`;
    wBase.appendChild(tintBase);
    const fxBase = document.createElement('div');
    fxBase.className = 'fx-base';
    fxBase.style.cssText += `mask-image:url('${CARDS[i].base}');mask-size:100% 100%;-webkit-mask-image:url('${CARDS[i].base}');-webkit-mask-size:100% 100%;`;
    wBase.appendChild(fxBase);
    card.appendChild(wBase);

    // ── Capa 2: imagen principal — shimmer holográfico arcoíris ──
    const wMain = document.createElement('div');
    wMain.style.cssText = `position:absolute;inset:0;z-index:1;border-radius:inherit;overflow:hidden;
      transform:translateZ(6px);`;
    const imgMain = document.createElement('img');
    imgMain.src = CARDS[i].main;
    imgMain.style.cssText = `width:100%;height:100%;object-fit:cover;display:block;`;
    imgMain.draggable = false;
    wMain.appendChild(imgMain);
    const hs = HOLO_STYLES[i % HOLO_STYLES.length];
    const fxHolo = document.createElement('div');
    fxHolo.className = 'fx-holo';
    fxHolo.style.cssText = `position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:1;
      background:${hs.grad};background-size:${hs.size};
      animation:holoShift ${hs.dur} ease-in-out infinite;
      mix-blend-mode:${hs.blend};opacity:0.65;transition:opacity 0.3s;
      mask-image:url('${CARDS[i].main}');mask-size:100% 100%;
      -webkit-mask-image:url('${CARDS[i].main}');-webkit-mask-size:100% 100%;`;
    wMain.appendChild(fxHolo);
    const fxCursor = document.createElement('div');
    fxCursor.className = 'fx-holo-cursor';
    fxCursor.style.cssText += `mask-image:url('${CARDS[i].main}');mask-size:100% 100%;-webkit-mask-image:url('${CARDS[i].main}');-webkit-mask-size:100% 100%;`;
    wMain.appendChild(fxCursor);
    card.appendChild(wMain);

    // ── Capa 3: frente — glitter / destellos aleatorios ──────────
    const wFrente = document.createElement('div');
    wFrente.style.cssText = `position:absolute;inset:0;z-index:2;border-radius:inherit;overflow:hidden;pointer-events:none;
      transform:translateZ(26px);`;
    const imgFrente = document.createElement('img');
    imgFrente.src = CARDS[i].frente;
    imgFrente.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block;`;
    imgFrente.draggable = false;
    wFrente.appendChild(imgFrente);
    const fxGlitter = document.createElement('div');
    fxGlitter.className = 'fx-glitter';
    fxGlitter.style.cssText += `mask-image:url('${CARDS[i].frente}');mask-size:100% 100%;-webkit-mask-image:url('${CARDS[i].frente}');-webkit-mask-size:100% 100%;`;
    const gc = GLITTER_COLORS[i % GLITTER_COLORS.length];
    const GLITTER_COUNT = 14;
    for (let g = 0; g < GLITTER_COUNT; g++) {
      const dot = document.createElement('div');
      dot.className = 'glitter-dot';
      const sz = 2 + Math.random() * 4;
      const col = gc[Math.floor(Math.random() * gc.length)];
      dot.style.cssText = `width:${sz}px;height:${sz}px;
        left:${(Math.random()*90+5).toFixed(1)}%;top:${(Math.random()*90+5).toFixed(1)}%;
        --dur:${(1.2+Math.random()*1.8).toFixed(2)}s;
        --del:-${(Math.random()*2).toFixed(2)}s;
        background:radial-gradient(circle,${col} 0%,transparent 100%);
        box-shadow:0 0 4px 1px ${col};`;
      fxGlitter.appendChild(dot);
    }
    wFrente.appendChild(fxGlitter);
    card.appendChild(wFrente);

    // ── Capa 4: top — barrido de luz prismática ───────────────────
    const wTop = document.createElement('div');
    wTop.style.cssText = `position:absolute;inset:0;z-index:3;border-radius:inherit;overflow:hidden;pointer-events:none;
      transform:translateZ(90px);`;
    const imgTop = document.createElement('img');
    imgTop.src = CARDS[i].top;
    imgTop.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block;`;
    imgTop.draggable = false;
    wTop.appendChild(imgTop);
    const pc = PRISM_CONFIGS[i % PRISM_CONFIGS.length];
    const fxPrism = document.createElement('div');
    fxPrism.className = 'fx-prism';
    fxPrism.style.cssText = `position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:1;overflow:hidden;
      mask-image:url('${CARDS[i].top}');mask-size:100% 100%;
      -webkit-mask-image:url('${CARDS[i].top}');-webkit-mask-size:100% 100%;`;
    const beam = document.createElement('div');
    beam.className = 'prism-beam';
    beam.style.cssText = `position:absolute;top:0;left:0;width:${pc.width};height:100%;
      background:${pc.beam};
      animation:prismSweep ${pc.dur} ease-in-out infinite;
      animation-delay:-${(Math.random()*4).toFixed(2)}s;
      mix-blend-mode:screen;`;
    fxPrism.appendChild(beam);
    wTop.appendChild(fxPrism);
    card.appendChild(wTop);

    cylinder.appendChild(card);
  }

  scene.appendChild(cylinder);
  modal.appendChild(scene);

  // Spacer inferior para mantener el space-between del flex (reemplaza el hint eliminado)
  const spacer = document.createElement('div');
  spacer.style.cssText = `height:clamp(6px,1.5vh,14px);`;
  modal.appendChild(spacer);

  document.body.appendChild(modal);

  const cardEls = Array.from(cylinder.children);

  // Contenedor interno de tilt por cada card (para no tocar el transform del cilindro)
  cardEls.forEach(c => {
    const inner = document.createElement('div');
    inner.className = 'card-tilt-inner';
    inner.style.cssText = `width:100%;height:100%;transform-style:preserve-3d;
      transition:transform 0.15s ease-out;`;
    while (c.firstChild) inner.appendChild(c.firstChild);
    c.appendChild(inner);
  });

  let isDrag = false;
  const MAX_TILT = 18;

  function updateFrontCard(clientX, clientY) {
    cardEls.forEach(c => {
      if (!c.classList.contains('is-front')) return;
      const inner = c.querySelector('.card-tilt-inner');
      if (!inner) return;
      const rect = c.getBoundingClientRect();
      if (!rect.width) return;
      const nx = ((clientX - rect.left) / rect.width  - 0.5) * 2;
      const ny = ((clientY - rect.top)  / rect.height - 0.5) * 2;
      const rx =  ny * MAX_TILT;
      const ry = -nx * MAX_TILT;
      inner.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      const cursorEl = c.querySelector('.fx-holo-cursor');
      if (cursorEl) {
        cursorEl.style.setProperty('--hx', ((nx+1)/2*100).toFixed(1)+'%');
        cursorEl.style.setProperty('--hy', ((ny+1)/2*100).toFixed(1)+'%');
      }
    });
  }

  function resetFrontTilt() {
    cardEls.forEach(c => {
      const inner = c.querySelector('.card-tilt-inner');
      if (inner) inner.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
  }

  modal.addEventListener('mousemove',  e => { if (!isDrag) updateFrontCard(e.clientX, e.clientY); });
  modal.addEventListener('mouseleave', resetFrontTilt);
  modal.addEventListener('touchmove',  e => {
    if (e.touches[0] && !isDrag) updateFrontCard(e.touches[0].clientX, e.touches[0].clientY);
  }, {passive:true});
  modal.addEventListener('touchend', resetFrontTilt);

  function updateBlur(angle) {
    cardEls.forEach((c, i) => {
      const cardAngle = (i * ANGLE_STEP + angle) % 360;
      const norm    = ((cardAngle + 180) % 360) - 180;
      const cosVal  = Math.cos(norm * Math.PI / 180);
      const t       = (1 - cosVal) / 2;
      const isFront = cosVal > 0.98;
      const angleDeg = Math.abs(norm);
      const blur    = isFront ? 0 : Math.min(angleDeg / 12, 6);
      const bright  = isFront ? 1.15 : 1 - t * 0.5;
      c.classList.toggle('is-front', isFront);
      c.style.filter    = `blur(${blur.toFixed(1)}px) brightness(${bright.toFixed(2)})`;
      c.style.opacity   = isFront ? '1' : '0.5';
      c.style.boxShadow = isFront
        ? 'inset 0 0 22px 6px rgba(255,255,255,0.55), 0 0 16px 4px rgba(160,0,255,0.9), 0 0 32px 8px rgba(120,0,200,0.5)'
        : 'none';
    });
  }

  updateBlur(0);

  let startX=0, startAngle=0, curAngle=0;
  function onStart(e){ isDrag=true; cylinder.style.transition='none';
    startX=e.touches?e.touches[0].clientX:e.clientX; startAngle=curAngle; }
  function onMove(e){ if(!isDrag)return;
    const x=e.touches?e.touches[0].clientX:e.clientX;
    curAngle=startAngle+(x-startX)*0.35;
    cylinder.style.transform=`rotateY(${curAngle}deg)`;
    updateBlur(curAngle); }
  function onEnd(){ if(!isDrag)return; isDrag=false;
    cylinder.style.transition='transform .4s ease-out';
    const snap=Math.round(curAngle/ANGLE_STEP)*ANGLE_STEP;
    curAngle=snap; cylinder.style.transform=`rotateY(${snap}deg)`;
    updateBlur(snap); }

  scene.addEventListener('mousedown', onStart);
  scene.addEventListener('touchstart', onStart, {passive:true});
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, {passive:true});
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);

  modal._cleanDrag=()=>{
    window.removeEventListener('mousemove',onMove);
    window.removeEventListener('touchmove',onMove);
    window.removeEventListener('mouseup',onEnd);
    window.removeEventListener('touchend',onEnd);
  };
  modal._elJug=null; modal._pJug=null; modal._nJug=null;

  reanudarAudio();
}

function cerrarCarruselJugadoras() {
  const modal = document.getElementById('modal-jugadoras');
  if (!modal) return;
  modal._cleanDrag?.();
  const elJug = modal._elJug;
  if (elJug) {
    elJug.style.cssText = '';
    if (modal._pJug) modal._pJug.insertBefore(elJug, modal._nJug);
  }
  modal.remove();
  _audioJugadoras.pause();
  _audioJugadoras.currentTime = 0;
  audioIniciado = true;
  ambAudio.currentTime = 0;
  ambAudio.play().catch(() => {});
}

function abrirNina() {
  ninaActual = 0;
  ambAudio.pause();
  ambAudio.currentTime = 0;
  audioIniciado = false;
  document.getElementById('modal-nina').style.display = 'block';
  actualizarNina();
}

function cerrarNina() {
  if (efectoActivoNina) {
    efectoActivoNina.cleanup();
    efectoActivoNina = null;
  }
  document.getElementById('modal-nina').style.display = 'none';
  ambAudio.currentTime = 0;
  ambAudio.play().catch(() => {});
  audioIniciado = true;
}

let efectoActivoNina = null;

function actualizarNina() {
  // Limpiar efecto anterior
  if (efectoActivoNina) {
    efectoActivoNina.cleanup();
    efectoActivoNina = null;
  }

  // Limpiar vfx
  const vfx = document.getElementById('nina-vfx');
  if (vfx) vfx.innerHTML = '';

  // Cambiar imagen
  document.getElementById('nina-img').src = ninas[ninaActual];
  document.getElementById('nina-contador').textContent =
    (ninaActual + 1) + ' / ' + ninas.length;

  // Activar efecto según página
  const vfxEl = document.getElementById('nina-vfx');
  if (!vfxEl) return;

  if (ninaActual === 0) {
    // Nina-1: futbolista + balones + nieve + glow morado
    vfxEl.style.pointerEvents = 'auto';
    const ft = efectoFutbolista(vfxEl);
    const nv = efectoNieve(vfxEl);
    const gf = aplicarGlowMorado('glow-futbolista');
    efectoActivoNina = { cleanup: () => {
      ft.cleanup(); nv.cleanup(); gf.cleanup();
    }};
  }
  else if (ninaActual === 1) {
    // Nina-2: astronauta — sistema solar 3D con campo de estrellas
    vfxEl.style.pointerEvents = 'auto';
    const ast = efectoAstronauta(vfxEl);
    efectoActivoNina = { cleanup: () => { if(ast && ast.cleanup) ast.cleanup(); }};
  }
  else if (ninaActual === 2) {
    // Nina-3: BOMBERA
    const bom = efectoBombera(vfxEl);
    efectoActivoNina = { cleanup: () => { bom.cleanup(); }};
  }
  else if (ninaActual === 3) {
    // Nina-4: ARQUITECTA
    const arq = efectoArquitecta(vfxEl);
    efectoActivoNina = { cleanup: () => { arq.cleanup(); }};
  }
  else if (ninaActual === 4) {
    // Nina-5: POLICIA
    const pol = efectoPolicia(vfxEl);
    efectoActivoNina = { cleanup: () => { pol.cleanup(); }};
  }
  else if (ninaActual === 5) {
    // Nina-6: MAESTRA
    const mae = efectoMaestra(vfxEl);
    efectoActivoNina = { cleanup: () => { mae.cleanup(); }};
  }
  else if (ninaActual === 6) {
    // Nina-7: DOCTORA — objetos 3D rebotando
    const doc = efectoDoctora(vfxEl);
    efectoActivoNina = { cleanup: () => { doc.cleanup(); }};
  }
  else if (ninaActual === 6999) { // bloque desactivado
    vfxEl.style.pointerEvents = 'none';
    vfxEl.innerHTML = `
<style>
@keyframes cv-float{0%,100%{transform:translateY(0) rotate(-5deg) scale(1);}50%{transform:translateY(-14px) rotate(5deg) scale(1.06);}}
@keyframes cv-eye{0%,88%,100%{transform:scaleY(1);}94%{transform:scaleY(0.08);}}
@keyframes cv-spike{0%,100%{transform:scaleY(1);}50%{transform:scaleY(1.22);}}
.cv-wrap{position:absolute;right:5%;top:50%;transform:translateY(-50%);
  width:clamp(90px,16vw,150px);height:clamp(90px,16vw,150px);
  animation:cv-float 3.4s ease-in-out infinite;pointer-events:none;}
.cv-svg{width:100%;height:100%;}
</style>
<div class="cv-wrap">
<svg class="cv-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="cvB" cx="42%" cy="38%" r="58%">
      <stop offset="0%" stop-color="#ff7ed4"/>
      <stop offset="55%" stop-color="#cc0066"/>
      <stop offset="100%" stop-color="#7a0040"/>
    </radialGradient>
    <radialGradient id="cvS" cx="32%" cy="28%" r="38%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.6)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    <filter id="cvG"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <!-- Púas -->
  <g filter="url(#cvG)">
    <g style="transform-origin:50px 50px;animation:cv-spike 1.8s ease-in-out infinite"><ellipse cx="50" cy="10" rx="4" ry="7" fill="#ff55bb"/><circle cx="50" cy="4.5" r="3.5" fill="#ffbbee"/></g>
    <g style="transform-origin:50px 50px;animation:cv-spike 2.1s ease-in-out infinite .25s"><ellipse cx="78" cy="21" rx="4" ry="7" fill="#ff55bb" transform="rotate(45,78,21)"/><circle cx="82" cy="16" r="3.5" fill="#ffbbee"/></g>
    <g style="transform-origin:50px 50px;animation:cv-spike 1.95s ease-in-out infinite .5s"><ellipse cx="90" cy="50" rx="4" ry="7" fill="#ff55bb" transform="rotate(90,90,50)"/><circle cx="96" cy="50" r="3.5" fill="#ffbbee"/></g>
    <g style="transform-origin:50px 50px;animation:cv-spike 2.3s ease-in-out infinite .15s"><ellipse cx="78" cy="79" rx="4" ry="7" fill="#ff55bb" transform="rotate(135,78,79)"/><circle cx="82" cy="84" r="3.5" fill="#ffbbee"/></g>
    <g style="transform-origin:50px 50px;animation:cv-spike 2.0s ease-in-out infinite .7s"><ellipse cx="50" cy="90" rx="4" ry="7" fill="#ff55bb" transform="rotate(180,50,90)"/><circle cx="50" cy="95.5" r="3.5" fill="#ffbbee"/></g>
    <g style="transform-origin:50px 50px;animation:cv-spike 1.75s ease-in-out infinite .4s"><ellipse cx="22" cy="79" rx="4" ry="7" fill="#ff55bb" transform="rotate(225,22,79)"/><circle cx="18" cy="84" r="3.5" fill="#ffbbee"/></g>
    <g style="transform-origin:50px 50px;animation:cv-spike 2.2s ease-in-out infinite .6s"><ellipse cx="10" cy="50" rx="4" ry="7" fill="#ff55bb" transform="rotate(270,10,50)"/><circle cx="4" cy="50" r="3.5" fill="#ffbbee"/></g>
    <g style="transform-origin:50px 50px;animation:cv-spike 1.85s ease-in-out infinite .1s"><ellipse cx="22" cy="21" rx="4" ry="7" fill="#ff55bb" transform="rotate(315,22,21)"/><circle cx="18" cy="16" r="3.5" fill="#ffbbee"/></g>
  </g>
  <!-- Cuerpo -->
  <circle cx="50" cy="50" r="34" fill="url(#cvB)" filter="url(#cvG)"/>
  <circle cx="50" cy="50" r="34" fill="url(#cvS)"/>
  <!-- Ojos -->
  <g style="animation:cv-eye 3.8s ease-in-out infinite">
    <ellipse cx="39" cy="44" rx="5.5" ry="6" fill="#1a0010"/>
    <ellipse cx="61" cy="44" rx="5.5" ry="6" fill="#1a0010"/>
    <circle cx="41" cy="42" r="1.8" fill="rgba(255,255,255,.7)"/>
    <circle cx="63" cy="42" r="1.8" fill="rgba(255,255,255,.7)"/>
  </g>
  <!-- Cejas -->
  <line x1="33" y1="36" x2="46" y2="39" stroke="#5a0020" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="54" y1="39" x2="67" y2="36" stroke="#5a0020" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Boca malvada -->
  <path d="M36,60 Q50,54 64,60" stroke="#7a0030" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>
</div>`;
    efectoActivoNina = { cleanup: () => { vfxEl.innerHTML = ''; } };
  }
  else if (ninaActual === 7) {
    // Nina-8: PAQUETERIA
    const paq = efectoPaqueteria(vfxEl);
    efectoActivoNina = { cleanup: () => { paq.cleanup(); }};
  }
}

document.getElementById('btn-cerrar-nina')
  ?.addEventListener('click', cerrarNina);

document.getElementById('nina-prev')
  ?.addEventListener('click', () => {
    ninaActual = ninaActual === 0 ? ninas.length - 1 : ninaActual - 1;
    actualizarNina();
  });

document.getElementById('nina-next')
  ?.addEventListener('click', () => {
    ninaActual = ninaActual === ninas.length - 1 ? 0 : ninaActual + 1;
    actualizarNina();
  });

// ============================================================
//  MODAL CRÉDITOS
// ============================================================
const audioCreditos = new Audio('assets/creditos.mp3');
audioCreditos.volume = 0.8;

function abrirCreditos() {
  ambAudio.pause();
  audioIniciado = false;
  ambAudio.pause();
  ambAudio.currentTime = 0;
  const modal = document.getElementById('modal-creditos');
  modal.style.display = 'flex';
  audioCreditos.currentTime = 0;
  audioCreditos.play().catch(() => {});
}

function cerrarCreditos() {
  audioCreditos.pause();
  audioCreditos.currentTime = 0;
  const modal = document.getElementById('modal-creditos');
  modal.style.display = 'none';
  setTimeout(() => {
    audioIniciado = true;
    ambAudio.currentTime = 0;
    ambAudio.play().catch(() => {});
  }, 500);
}

document.getElementById('btn-cerrar-creditos')
  ?.addEventListener('click', cerrarCreditos);

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
//  RESIZE / ORIENTACIÓN
//  El contenedor ya usa CSS puro (100vw / calc), solo
//  actualizamos --vh para cubrir la barra del navegador móvil
// ============================================================
//  TAMAÑO FIJO — basado en screen.width / screen.height
// ============================================================
(function fijarTamano() {
  const c = document.getElementById('mural-container');
  if (!c) return;

  function ajustar() {
    const c = document.getElementById('mural-container');
    if (!c) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Calcular dimensiones manteniendo ratio 9:4 exacto
    let w, h;

    if (vw / vh > 9 / 4) {
      // Pantalla más ancha que el mural — limitar por altura
      h = vh;
      w = vh * 9 / 4;
    } else {
      // Pantalla más alta que el mural — limitar por ancho
      w = vw;
      h = vw * 4 / 9;
    }

    c.style.width     = w + 'px';
    c.style.height    = h + 'px';
    c.style.left      = ((vw - w) / 2) + 'px';
    c.style.top       = ((vh - h) / 2) + 'px';
    c.style.transform = 'none';
    c.style.position  = 'fixed';
  }

  ajustar();
  window.addEventListener('resize', ajustar);
  screen.orientation?.addEventListener('change', () => {
    // Esperar que el navegador termine de rotar completamente
    setTimeout(ajustar, 100);
    setTimeout(ajustar, 300);
    setTimeout(ajustar, 600);
    setTimeout(ajustar, 1000);
  });
})();

// ============================================================
//  INTRO
// ============================================================
let introActivo = true;

function activarMural() {
  if (!introActivo) return;
  introActivo = false;

  const overlay    = document.getElementById('intro-overlay');
  const contenedor = document.getElementById('mural-container');
  const balonEl    = document.getElementById('balon-loader');
  const zonaBalon  = document.getElementById('zona-balon-intro');

  // Ocultar overlay y mostrar mural con balón girando
  overlay.classList.add('oculto');
  contenedor.classList.remove('intro-activo');
  balonEl.classList.remove('intro-brillo');
  balonEl.style.opacity = '1';
  if (zonaBalon) zonaBalon.style.display = 'none';
  setTimeout(() => { overlay.style.display = 'none'; }, 600);

  // Arrancar rayo verde — el audio arranca al terminar (reanudarAudio en terminarCarga)
  audioIniciado = true; // marcar para que reanudarAudio funcione
  iniciarCarga(1.2);
  setTimeout(() => { terminarCarga(); }, 1200);
}

// Ajusta la zona del balón intro sobre el balón real
function ajustarZonaBaon() {
  const balon = document.getElementById('balon-loader');
  const zona  = document.getElementById('zona-balon-intro');
  if (!balon || !zona) return;
  const r = balon.getBoundingClientRect();
  zona.style.left   = r.left + 'px';
  zona.style.top    = r.top  + 'px';
  zona.style.width  = r.width  + 'px';
  zona.style.height = r.height + 'px';
}

// Al cargar la página activar modo intro
window.addEventListener('load', () => {
  const contenedor = document.getElementById('mural-container');
  const balon      = document.getElementById('balon-loader');
  contenedor.classList.add('intro-activo');
  balon.classList.add('intro-brillo');
  ajustarZonaBaon();
});

window.addEventListener('resize', ajustarZonaBaon);

// Conectar zona intro del balón a activarMural
document.getElementById('zona-balon-intro')
  ?.addEventListener('click', activarMural);
document.getElementById('zona-balon-intro')
  ?.addEventListener('touchstart', activarMural, { passive: true });

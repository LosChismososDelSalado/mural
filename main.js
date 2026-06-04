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
//  AUDIO AMBIENTE
//  — NO arranca al abrir; arranca en el primer click
//  — Se pausa en cada click (durante el rayo verde)
//  — Se reanuda al terminar la animación
// ============================================================
const ambAudio      = new Audio('assets/ambiente.mp3');
ambAudio.loop       = true;
ambAudio.volume     = 0.35;
let   audioIniciado = false;

function iniciarAudio() {
  if (audioIniciado) return;
  ambAudio.play().then(() => { audioIniciado = true; }).catch(() => {});
}
function pausarAudio()   { ambAudio.pause(); }
function reanudarAudio() { if (audioIniciado) ambAudio.play().catch(() => {}); }

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
    iniciarAudio();
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

    if (zona.id === 'zona-nosotras') {
      setTimeout(() => {
        terminarCarga();
        activarGalaxia();
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
//  MODAL NIÑA
// ============================================================
const ninas = [
  'assets/nina-1.png','assets/nina-2.png','assets/nina-3.png',
  'assets/nina-4.png','assets/nina-5.png','assets/nina-6.png',
  'assets/nina-7.png','assets/nina-8.png'
];
let ninaActual = 0;


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

function abrirNina() {
  ninaActual = 0;
  ambAudio.pause();
  ambAudio.currentTime = 0;
  audioIniciado = false;
  document.getElementById('modal-nina').style.display = 'block';
  actualizarNina(); // activa efecto de nina-1 (incluye audio ambiente)
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
    // Nina-1: futbolista + balones + nieve + glow morado + audio ambiente
    vfxEl.style.pointerEvents = 'auto';
    const ft = efectoFutbolista(vfxEl);
    const nv = efectoNieve(vfxEl);
    const gf = aplicarGlowMorado('glow-futbolista');
    ambAudio.currentTime = 0;
    ambAudio.play().catch(() => {});
    audioIniciado = true;
    efectoActivoNina = { cleanup: () => {
      ft.cleanup(); nv.cleanup(); gf.cleanup();
      ambAudio.pause(); ambAudio.currentTime = 0; audioIniciado = false;
    }};
  }
  else if (ninaActual === 1) {
    // Nina-2: ingeniera al frente + glow morado (sin nieve)
    vfxEl.style.pointerEvents = 'none';
    const ing = efectoPersonajeGlowMorado(vfxEl, 'glow-ingeniera');
    efectoActivoNina = { cleanup: () => { ing.cleanup(); }};
  }
  else if (ninaActual === 2) {
    // Nina-3: bombera al frente + glow morado (sin nieve)
    vfxEl.style.pointerEvents = 'none';
    const bom = efectoPersonajeGlowMorado(vfxEl, 'glow-bombera');
    efectoActivoNina = { cleanup: () => { bom.cleanup(); }};
  }
  else if (ninaActual === 3) {
    // Nina-4: glow morado fijo en todas
    vfxEl.style.pointerEvents = 'none';
    const jug = efectoJugadoras(vfxEl);
    efectoActivoNina = { cleanup: () => { jug.cleanup(); }};
  }
  else if (ninaActual === 4) {
    // Nina-5: mismo efecto glow morado
    vfxEl.style.pointerEvents = 'none';
    const jug = efectoJugadoras(vfxEl);
    efectoActivoNina = { cleanup: () => { jug.cleanup(); }};
  }
  else if (ninaActual === 5) {
    // Nina-6: maestra al frente con glow morado animado
    vfxEl.style.pointerEvents = 'none';
    const mae = efectoPersonajeGlowMorado(vfxEl, 'glow-maestra');
    efectoActivoNina = { cleanup: () => { mae.cleanup(); }};
  }
  else if (ninaActual === 6) {
    // Nina-7: doctora al frente con glow morado animado
    vfxEl.style.pointerEvents = 'none';
    const doc = efectoPersonajeGlowMorado(vfxEl, 'glow-doctora');
    efectoActivoNina = { cleanup: () => { doc.cleanup(); }};
  }
  else if (ninaActual === 7) {
    // Nina-8: mismo efecto glow morado en todas
    vfxEl.style.pointerEvents = 'none';
    const jug = efectoJugadoras(vfxEl);
    efectoActivoNina = { cleanup: () => { jug.cleanup(); }};
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
  setTimeout(() => { reanudarAudio(); }, 500);
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

  iniciarAudio();
  iniciarCarga(0.8);

  setTimeout(() => {
    terminarCarga();
    const overlay    = document.getElementById('intro-overlay');
    const contenedor = document.getElementById('mural-container');
    const balon      = document.getElementById('balon-loader');

    overlay.classList.add('oculto');
    contenedor.classList.remove('intro-activo');
    balon.classList.remove('intro-brillo');

    setTimeout(() => { overlay.style.display = 'none'; }, 600);
  }, 800);
}

// Al cargar la página activar modo intro
window.addEventListener('load', () => {
  const contenedor = document.getElementById('mural-container');
  const balon      = document.getElementById('balon-loader');
  contenedor.classList.add('intro-activo');
  balon.classList.add('intro-brillo');
});

// Conectar zona intro del balón a activarMural
document.getElementById('zona-balon-intro')
  ?.addEventListener('click', activarMural);
document.getElementById('zona-balon-intro')
  ?.addEventListener('touchstart', activarMural, { passive: true });

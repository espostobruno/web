/* ============================================================
   Bruno Esposto — comportamiento
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine   = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- marquee de marcas ---------- */

  /* Las medidas son las del archivo. Van como atributos width/height para
     que la caja tenga tamaño desde el arranque, antes de que la imagen
     baje: un <img> sin cargar y con width:auto mide cero de ancho. */
  var MARCAS = [
    ['uala',          'Ualá',          304, 160],
    ['swiss-medical', 'Swiss Medical', 529, 160],
    ['osde',          'Osde',          213, 160],
    ['coto',          'Coto',          532, 160],
    ['bplay',         'Bplay',         533, 160],
    ['axe',           'Axe',           285, 160],
    ['mostaza',       'Mostaza',       160, 160],
    ['buscapina',     'Buscapina',     301, 160],
    ['chery',         'Chery',         284, 160],
    ['cat',           'CAT',           267, 160]
  ];

  document.querySelectorAll('.marquee__row').forEach(function (row) {
    var hidden = row.getAttribute('aria-hidden') === 'true';
    MARCAS.forEach(function (m) {
      var li  = document.createElement('li');
      var img = document.createElement('img');
      img.src = 'assets/img/logos/' + m[0] + '.png';
      img.dataset.logo = m[0];
      img.alt = hidden ? '' : m[1];
      img.width  = m[2];
      img.height = m[3];
      /* Nada de loading="lazy" acá. El navegador sólo baja una imagen
         diferida cuando su caja entra en pantalla, y una caja de ancho
         cero no entra nunca: la imagen quedaba esperando para siempre y
         la tira de marcas se veía vacía. Son diez PNG chicos. */
      img.decoding = 'async';
      if (hidden) li.setAttribute('aria-hidden', 'true');
      li.appendChild(img);
      row.appendChild(li);
    });
  });

  /* /?oscuro muestra la variante en negro. Sin el parámetro, la de papel. */
  if (location.search.indexOf('oscuro') !== -1) document.body.classList.add('oscuro');

  /* ---------- el nombre reacciona al cursor ----------
     Bodoni Moda es variable en el eje óptico (6–96). A menor valor, la
     fuente está dibujada para texto chico y los trazos finos vienen más
     gruesos; a mayor valor, afinan hasta el pelo. Mapeamos la distancia
     del cursor a ese eje: la letra más cercana engorda, las vecinas la
     siguen en degradé. No se mueve la palabra, respira la tipografía.
  ---------------------------------------------------------- */

  (function nombreVivo () {
    var h1 = document.querySelector('.hero__name');
    if (!h1 || reduce || !fine) return;

    var OPSZ_LEJOS = 40, OPSZ_CERCA = 11;
    var PESO_LEJOS = 400, PESO_CERCA = 580;
    var RADIO = 190;

    // Partimos cada palabra en letras sin tocar el HTML original.
    var letras = [];
    [].forEach.call(h1.children, function (palabra) {
      var texto = palabra.textContent;
      palabra.textContent = '';
      for (var i = 0; i < texto.length; i++) {
        var s = document.createElement('span');
        s.className = texto[i] === ' ' ? 'ltr ltr--sp' : 'ltr';
        s.textContent = texto[i] === ' ' ? ' ' : texto[i];
        palabra.appendChild(s);
        if (texto[i] !== ' ') letras.push(s);
      }
    });
    if (!letras.length) return;

    var centros = [];
    function medir () {
      centros = letras.map(function (l) {
        var r = l.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    }
    medir();
    addEventListener('resize', medir, { passive: true });
    addEventListener('scroll', medir, { passive: true });

    var cx = -9999, cy = -9999, pedido = false;

    function pintar () {
      pedido = false;
      for (var i = 0; i < letras.length; i++) {
        var c = centros[i];
        if (!c) continue;
        var dx = c.x - cx, dy = c.y - cy;
        var d = Math.sqrt(dx * dx + dy * dy);
        var k = Math.max(0, 1 - d / RADIO);
        k = k * k * (3 - 2 * k); // suaviza los bordes del degradé
        var opsz = OPSZ_LEJOS + (OPSZ_CERCA - OPSZ_LEJOS) * k;
        var peso = PESO_LEJOS + (PESO_CERCA - PESO_LEJOS) * k;
        letras[i].style.fontVariationSettings = "'opsz' " + opsz.toFixed(1);
        letras[i].style.fontWeight = Math.round(peso);
        letras[i].style.transform = k > 0.01 ? 'translateY(' + (-4 * k).toFixed(2) + 'px)' : '';
      }
    }

    function mover (e) {
      cx = e.clientX; cy = e.clientY;
      if (!pedido) { pedido = true; requestAnimationFrame(pintar); }
    }

    // Escuchamos en toda la ventana: el degradé tiene que empezar a
    // notarse antes de que el cursor toque las letras.
    addEventListener('pointermove', mover, { passive: true });
    addEventListener('pointerleave', function () {
      cx = cy = -9999;
      requestAnimationFrame(pintar);
    }, { passive: true });
  })();

  /* ---------- reveal on scroll ---------- */

  var revealables = document.querySelectorAll('.reveal');

  if (reduce || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // Escalona los hermanos dentro de una misma grilla.
        var sibs = Array.prototype.slice.call(el.parentNode.children);
        var i = sibs.indexOf(el);
        el.style.transitionDelay = Math.min(i, 6) * 55 + 'ms';
        el.classList.add('is-in');
        revealObs.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    revealables.forEach(function (el) { revealObs.observe(el); });

    /* Red de seguridad: si por cualquier motivo el observer no dispara
       (scroll dentro de un contenedor raro, preview escalado, etc.),
       mostramos todo igual en vez de dejar la sección en blanco. */
    setTimeout(function () {
      revealables.forEach(function (el) {
        if (!el.classList.contains('is-in')) el.classList.add('is-in');
      });
    }, 2500);
  }

  /* ---------- borde del nav al scrollear ---------- */

  var nav = document.getElementById('nav');
  var dock = document.querySelector('.dock');
  var contacto = document.getElementById('contacto');

  function onScroll() {
    var y = window.scrollY;
    nav.classList.toggle('is-stuck', y > 24);

    if (dock) {
      // El dock aparece pasado el hero y se esconde sobre el bloque de contacto.
      var past = y > window.innerHeight * 0.7;
      var atEnd = contacto
        ? contacto.getBoundingClientRect().top < window.innerHeight * 0.9
        : false;
      dock.classList.toggle('is-on', past && !atEnd);
    }
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { onScroll(); ticking = false; });
  }, { passive: true });
  onScroll();

  /* ---------- reels ----------
     Desktop: se reproduce al pasar el mouse, con sonido.
     Touch:   se reproducen solos todos los que están a la vista, en
              silencio, y un toque le da sonido a uno.
  ---------------------------------------------------------- */

  var reels = document.querySelectorAll('.reel video');

  /* Cada reel tiene su portada como archivo (atributo poster), así que el
     video siempre arranca desde el segundo cero: cortar el principio se
     comía la primera frase. */

  /* ---------- sonido ----------
     Los navegadores no dejan sonar un video hasta que hubo un gesto real
     del usuario. Pasar el mouse no cuenta; un click sí. Hasta que eso pase
     reproducimos en silencio, y el botón invita a activarlo.
  ---------------------------------------------------------- */

  var soundBtn   = document.getElementById('sound');
  var soundOn    = true;   // lo que el usuario quiere
  var activated  = false;  // lo que el navegador permite
  var current    = null;   // sólo un video con sonido a la vez

  function paintSound() {
    if (!soundBtn) return;
    var txt = soundBtn.querySelector('.sound__txt');
    soundBtn.dataset.state = soundOn ? 'on' : 'off';
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    if (!soundOn)        txt.textContent = 'Sonido silenciado';
    else if (!activated) txt.textContent = 'Activar sonido';
    else                 txt.textContent = 'Sonido activado';
  }

  function activate() {
    if (activated) return;
    activated = true;
    paintSound();
  }
  document.addEventListener('pointerdown', activate, { capture: true });
  document.addEventListener('keydown', activate, { capture: true });

  if (soundBtn) {
    soundBtn.addEventListener('click', function () {
      soundOn = !soundOn;
      if (!soundOn && current) current.muted = true;
      else if (soundOn && current) unmute(current);
      paintSound();
    });
    paintSound();
  }

  var VOLUMEN = 0.85;

  function unmute(v) {
    // Volumen directo, sin rampa: si el navegador estrangula los frames
    // (pestaña de fondo), una rampa deja el volumen clavado en 0 y el
    // video suena mudo aunque esté desmuteado.
    v.muted = false;
    try { v.volume = VOLUMEN; } catch (e) { /* ignorar */ }
    var p = v.play();
    if (p && p.catch) {
      p.catch(function () {
        // El navegador lo rechazó: seguimos en silencio.
        v.muted = true;
        v.play().catch(function () {});
      });
    }
  }

  function play(v) {
    if (current && current !== v) stop(current);
    current = v;
    // Sólo con mouse. En touch los reels arrancan solos al entrar en
    // pantalla: que suenen sin que nadie los toque sería intolerable.
    if (fine && soundOn && activated) {
      unmute(v);
    } else {
      v.muted = true;
      var p = v.play();
      if (p && p.catch) p.catch(function () { /* autoplay bloqueado */ });
    }
  }

  function stop(v) {
    v.muted = true;
    v.pause();
    /* load() devuelve el elemento a su estado inicial, o sea que vuelve a
       mostrarse el poster y el próximo hover arranca desde cero. Poner
       currentTime = 0 dejaría a la vista el frame 0 del video, que suele
       ser negro o una transición. */
    try { v.load(); } catch (e) { /* ignorar */ }
    if (current === v) current = null;
  }

  if (fine) {
    reels.forEach(function (v) {
      var fig = v.parentNode;
      fig.addEventListener('mouseenter', function () { play(v); });
      fig.addEventListener('mouseleave', function () { stop(v); });
      // Que el teclado llegue a lo mismo que el mouse.
      fig.tabIndex = 0;
      fig.addEventListener('focus', function () { play(v); });
      fig.addEventListener('blur',  function () { stop(v); });
    });
  } else {
    /* En celular cada reel se maneja solo. play() y stop() existen para que
       suene uno a la vez, y eso acá no aplica —en touch van todos en
       silencio—: pasarlos por ahí hacía que en la grilla de dos columnas
       cada reel que entraba matara al de al lado con load(), que además le
       aborta la descarga. De ahí el orden raro. */
    function verse(v) {
      v.muted = true;
      var p = v.play();
      if (p && p.catch) p.catch(function () { /* autoplay bloqueado */ });
    }

    if ('IntersectionObserver' in window) {
      var reelObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          /* Dos umbrales en vez de uno: arranca al pasar 0.6 y recién frena
             al bajar de 0.45. Comparar contra el mismo número con el que se
             dispara el observer no servía —entra informando justo 0.65, y
             0.65 > 0.65 es falso, así que al entrar no arrancaba ninguno—,
             y además el hueco entre los dos evita que uno que queda
             justo en el borde prenda y apague mientras se scrollea. */
          if (entry.intersectionRatio >= 0.6) verse(entry.target);
          /* pause() a secas, sin load(): conserva lo que ya bajó, así al
             volver sigue en vez de empezar a descargar de nuevo. */
          else if (entry.intersectionRatio <= 0.45) entry.target.pause();
        });
      }, { threshold: [0.45, 0.6], rootMargin: '-8% 0px -8% 0px' });

      reels.forEach(function (v) { reelObs.observe(v); });
    } else {
      reels.forEach(verse);
    }

    /* Un toque le da sonido al reel, y otro se lo saca. El toque es un gesto
       real del usuario, así que el navegador sí lo deja sonar; el autoplay
       del scroll no. Suena uno solo a la vez. */
    reels.forEach(function (v) {
      var fig = v.parentNode;

      function tocar() {
        if (!v.muted) { v.muted = true; return; }
        reels.forEach(function (otro) { if (otro !== v) otro.muted = true; });
        v.muted = false;
        try { v.volume = VOLUMEN; } catch (e) { /* ignorar */ }
        var p = v.play();
        if (p && p.catch) p.catch(function () { v.muted = true; verse(v); });
      }

      fig.tabIndex = 0;
      fig.addEventListener('click', tocar);
      fig.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tocar(); }
      });
    });
  }
})();

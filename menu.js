/* ══════════════ MENU ══════════════
   Abre e fecha o painel #site-menu pelo botão #nav-menu-toggle e prepara
   os dois efeitos do menu.css: a cascata de entrada (--i em cada item) e o
   desfoque por letra no hover (cada letra vira um span com --ci). */
(function () {
  var toggle = document.getElementById('nav-menu-toggle');
  var menu = document.getElementById('site-menu');
  if (!toggle || !menu) return;

  /* Letras em span. O aria-label vai no link (num span genérico ele é
     ignorado) para o leitor de tela não soletrar o texto letra por letra. */
  menu.querySelectorAll('[data-chars]').forEach(function (el) {
    var texto = el.textContent;
    var link = el.closest('a');
    link.setAttribute('aria-label', texto);
    el.textContent = '';
    Array.prototype.forEach.call(texto, function (letra, i) {
      var s = document.createElement('span');
      s.className = 'char-blur';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--ci', i);
      s.textContent = letra;
      el.appendChild(s);
    });
    /* Duração da onda: 35 ms de atraso por letra + 200 ms do pulso (menu.css).
       A classe sai por tempo, e não por animationend, porque esse evento não
       chega quando a aba está em segundo plano e o hover travaria. */
    var duracao = texto.length * 35 + 260;
    link.addEventListener('mouseenter', function () {
      if (link.classList.contains('is-char-hovering')) return;
      link.classList.add('is-char-hovering');
      setTimeout(function () { link.classList.remove('is-char-hovering'); }, duracao);
    });
  });

  menu.querySelectorAll('.sm-in').forEach(function (el, i) {
    el.style.setProperty('--i', i);
  });

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.setAttribute('aria-hidden', String(!open));
    menu.inert = !open;
    menu.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
  }
  function isOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }

  /* O painel fica logo abaixo da nav, qualquer que seja a altura dela. */
  function posicionar() {
    var nav = toggle.closest('nav');
    if (nav) menu.style.setProperty('--menu-top', (nav.getBoundingClientRect().bottom + 10) + 'px');
  }

  toggle.addEventListener('click', function () {
    posicionar();
    setOpen(!isOpen());
  });
  menu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { setOpen(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) { setOpen(false); toggle.focus(); }
  });
  /* Clique fora do painel e fora da nav fecha. */
  document.addEventListener('click', function (e) {
    if (!isOpen()) return;
    if (menu.contains(e.target) || toggle.contains(e.target)) return;
    setOpen(false);
  });
  window.addEventListener('resize', function () { if (isOpen()) posicionar(); });
})();

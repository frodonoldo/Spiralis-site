/* Revelação ao rolar das páginas de serviço. A classe sp-anim só entra
   quando o IntersectionObserver existe: sem ele, o conteúdo fica parado e
   visível, nunca escondido esperando um script que não roda. */
(function () {
  if (!('IntersectionObserver' in window)) return;
  var alvos = document.querySelectorAll('.rv');
  document.documentElement.classList.add('sp-anim');
  var io = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  alvos.forEach(function (el) { io.observe(el); });
})();

/* Abas das frentes: setas do teclado trocam de aba, e os links dos sinais de
   alerta (data-abre-aba) abrem a frente certa antes de rolar até ela. */
(function () {
  var abas = Array.prototype.slice.call(document.querySelectorAll('.sp-aba'));
  if (!abas.length) return;
  function ativa(aba, foco) {
    abas.forEach(function (a) {
      var on = a === aba;
      a.setAttribute('aria-selected', on ? 'true' : 'false');
      a.tabIndex = on ? 0 : -1;
      document.getElementById(a.getAttribute('aria-controls')).hidden = !on;
    });
    if (foco) aba.focus();
  }
  abas.forEach(function (a, i) {
    a.addEventListener('click', function () { ativa(a); });
    a.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      ativa(abas[(i + d + abas.length) % abas.length], true);
    });
  });
  document.querySelectorAll('[data-abre-aba]').forEach(function (l) {
    l.addEventListener('click', function () {
      var alvo = document.getElementById('aba-' + l.getAttribute('data-abre-aba'));
      if (alvo) ativa(alvo);
    });
  });
})();

/* Sub-navegação marca a seção visível; a linha do processo acende conforme
   a rolagem. Sem IntersectionObserver, os dois ficam no estado parado. */
(function () {
  var links = document.querySelectorAll('.sp-subnav a.sn');
  if (links.length && 'IntersectionObserver' in window) {
    var mapa = {};
    links.forEach(function (l) { mapa[l.getAttribute('href').slice(1)] = l; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove('on'); });
        var l = mapa[e.target.id];
        if (l) {
          l.classList.add('on');
          var ul = l.closest('ul');
          ul.scrollLeft = l.offsetLeft - (ul.clientWidth - l.offsetWidth) / 2;
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(mapa).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) io.observe(s);
    });
  }

  var linha = document.querySelector('.sp-linha');
  if (!linha) return;
  var itens = linha.querySelectorAll('li');
  var pendente = false;
  function mede() {
    pendente = false;
    var r = linha.getBoundingClientRect();
    var meio = window.innerHeight * 0.6;
    var p = Math.max(0, Math.min(1, (meio - r.top) / r.height));
    linha.style.setProperty('--p', p.toFixed(3));
    itens.forEach(function (li) {
      li.classList.toggle('lit', li.getBoundingClientRect().top < meio);
    });
  }
  window.addEventListener('scroll', function () {
    if (!pendente) { pendente = true; requestAnimationFrame(mede); }
  }, { passive: true });
  mede();
})();

